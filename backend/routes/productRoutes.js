const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Offer = require("../models/offer");
const {
  protect,
  admin,
  adminOrMerchantise,
} = require("../middleware/authMiddleware");
const Review = require("../models/Review");
const Order = require("../models/Order");
const User = require("../models/User");
const { checkDeliveryServiceability } = require("../utils/shiprocket");
const { triggerBackInStockForProduct, triggerPriceDropForProduct } = require("../services/alertService");
const { getJson, setJson } = require("../utils/redisCache");
const { decorateProductWithTimedOffer } = require("../utils/timedOfferPricing");
const { getCanonicalAudience } = require("../utils/sizeChartAudience");

const router = express.Router();

const getTimedOffersForDisplay = async () =>
  Offer.find()
    .select("_id title startDate endDate isActive offerPercentage benefit priority productIds createdAt")
    .lean();

const decorateProductsWithTimedOffers = (products, offers) =>
  (Array.isArray(products) ? products : []).map((product) =>
    decorateProductWithTimedOffer(product, offers)
  );

const cleanStr = (v) => {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
};

const normalizeGender = (v) => {
  const g = cleanStr(v);
  if (!g) return undefined;
  const m = g.toLowerCase();
  if (m === "male" || m === "men" || m === "man") return "Men";
  if (m === "female" || m === "women" || m === "woman") return "Women";
  if (m === "kids" || m === "kid" || m === "children" || m === "child") return "Kids";
  return g;
};

// @route GET /api/products/delivery/check?pincode=700001&cod=0&weight=0.5
// @desc Check delivery serviceability and ETA by pincode via Shiprocket
// @access Public
router.get("/delivery/check", async (req, res) => {
  const pincode = String(req.query.pincode || "").trim();
  const cod = Number(req.query.cod || 0);
  const weight = req.query.weight ? Number(req.query.weight) : null;

  if (!/^\d{6}$/.test(pincode)) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid 6-digit pincode",
    });
  }

  try {
    const sr = await checkDeliveryServiceability({
      deliveryPostcode: pincode,
      cod,
      weight,
    });

    let location = null;
    try {
      const pinRes = await axios.get(
        `https://api.postalpincode.in/pincode/${pincode}`,
        { timeout: 10000 }
      );
      const postOffice = pinRes?.data?.[0]?.PostOffice?.[0];
      if (postOffice) {
        location = `${postOffice.District}, ${postOffice.State}`;
      }
    } catch (_) {
      // Non-blocking fallback: location is optional
    }

    return res.json({
      success: true,
      isDeliverable: sr.serviceable,
      message: sr.serviceable
        ? "Delivery available"
        : "Delivery not available for this pincode",
      deliveryDate: sr.estimatedDate,
      deliveryDays: sr.estimatedDays,
      location,
      courierName: sr.courierName,
      courierCount: sr.courierCount,
      codAvailable: sr.codAvailable,
      availableCouriers: sr.availableCouriers,
      pickupPostcode: sr.pickupPostcode,
      deliveryPostcode: sr.deliveryPostcode,
    });
  } catch (error) {
    console.error("Delivery check error:", error?.response?.data || error.message);
    const msg = String(error?.message || "");
    if (msg.includes("Missing SHIPROCKET_PICKUP_POSTCODE")) {
      return res.status(400).json({
        success: false,
        isDeliverable: false,
        message:
          "Delivery check is not configured. Set SHIPROCKET_PICKUP_POSTCODE in backend .env and restart server.",
      });
    }
    return res.status(500).json({
      success: false,
      isDeliverable: false,
      message:
        "Unable to check delivery now. Please try again in a moment.",
    });
  }
});

const normalizeVariants = (variants = []) => {
  if (!Array.isArray(variants)) return [];
  return variants
    .map((v) => ({
      designName: String(v?.designName || "Default").trim() || "Default",
      color: String(v?.color || "").trim(),
      size: String(v?.size || "").trim().toUpperCase(),
      sku: String(v?.sku || "").trim(),
      countInStock: Number(v?.countInStock || 0),
    }))
    .filter((v) => v.color && v.size && v.sku);
};

const deriveFromVariants = (variants = []) => {
  const sizes = [...new Set(variants.map((v) => v.size))];
  const colors = [...new Set(variants.map((v) => v.color))];
  const countInStock = variants.reduce(
    (sum, v) => sum + Math.max(0, Number(v.countInStock || 0)),
    0
  );
  return { sizes, colors, countInStock };
};

// Normalize the new colorVariants structure
const normalizeColorVariants = (colorVariants = []) => {
  if (!Array.isArray(colorVariants)) return [];
  return colorVariants
    .map((cv) => ({
      color: String(cv?.color || "").trim(),
      colorName: String(cv?.colorName || cv?.color || "").trim(),
      images: Array.isArray(cv?.images)
        ? cv.images.filter((img) => img?.url?.trim()).map((img) => ({ url: img.url.trim(), altText: img.altText || "" }))
        : [],
      sizes: Array.isArray(cv?.sizes)
        ? cv.sizes
            .map((s) => ({
              size: String(s?.size || "").trim().toUpperCase(),
              sku: String(s?.sku || "").trim(),
              countInStock: Number(s?.countInStock || 0),
            }))
            .filter((s) => s.size && s.sku)
        : [],
    }))
    .filter((cv) => cv.color && cv.sizes.length > 0);
};

const deriveFromColorVariants = (colorVariants = []) => {
  const sizes = [...new Set(colorVariants.flatMap((cv) => cv.sizes.map((s) => s.size)))];
  const colors = [...new Set(colorVariants.map((cv) => cv.color))];
  const countInStock = colorVariants.reduce(
    (sum, cv) => sum + cv.sizes.reduce((s2, sz) => s2 + Math.max(0, Number(sz.countInStock || 0)), 0),
    0
  );
  const firstSku = colorVariants[0]?.sizes[0]?.sku || "";
  return { sizes, colors, countInStock, firstSku };
};

// @route POST /api/products
// @desc Create a new Product
// @access Private/Admin
router.post("/", protect, admin, adminOrMerchantise, async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      discountPrice,
      countInStock,
      category,
      brand,
      sizes,
      colors,
      collections,
      material,
      gender,
      images,
      isFeatured,
      isPublished,
      tags,
      dimensions,
      weight,
      sku,
      offerPercentage,
      variants,
      colorVariants,
      sizeChart,
      returnPolicy,
    } = req.body;

    const normalizeSizeChart = (value) => {
      if (!value || typeof value !== "object") return value;
      return {
        ...value,
        audience: getCanonicalAudience(value.audience, "Unisex"),
      };
    };

    // Prefer new colorVariants structure, fall back to legacy variants
    const normalizedColorVariants = normalizeColorVariants(colorVariants);
    const normalizedVariants = normalizeVariants(variants);

    let finalSizes, finalColors, finalStock, finalSku;

    if (normalizedColorVariants.length > 0) {
      const derived = deriveFromColorVariants(normalizedColorVariants);
      finalSizes = derived.sizes;
      finalColors = derived.colors;
      finalStock = derived.countInStock;
      finalSku = sku || derived.firstSku;
    } else {
      const variantDerived = deriveFromVariants(normalizedVariants);
      finalSizes = normalizedVariants.length ? variantDerived.sizes : sizes;
      finalColors = normalizedVariants.length ? variantDerived.colors : colors;
      finalStock = normalizedVariants.length ? variantDerived.countInStock : Number(countInStock || 0);
      finalSku = sku || normalizedVariants[0]?.sku;
    }

    const product = new Product({
      name: cleanStr(name),
      description: cleanStr(description),
      price: Number(price),
      discountPrice: discountPrice !== undefined && discountPrice !== null && discountPrice !== "" ? Number(discountPrice) : undefined,
      countInStock: finalStock,
      category: cleanStr(category),
      brand: cleanStr(brand),
      sizes: finalSizes,
      colors: finalColors,
      colorVariants: normalizedColorVariants,
      variants: normalizedColorVariants.length > 0 ? [] : normalizedVariants,
      collections: cleanStr(collections),
      material: cleanStr(material),
      gender: normalizeGender(gender),
      images: normalizedColorVariants.length > 0 ? (images || []) : (images || []),
      isFeatured,
      isPublished,
      tags: Array.isArray(tags) ? tags.filter(Boolean) : [],
      dimensions,
      weight,
      sku: finalSku,
      offerPercentage: Number(offerPercentage || 0),
      sizeChart: normalizeSizeChart(sizeChart),
      returnPolicy: {
        eligible: returnPolicy?.eligible !== false,
        days: Number.isFinite(Number(returnPolicy?.days)) ? Math.max(0, Number(returnPolicy.days)) : 7,
        text: String(returnPolicy?.text || "").trim(),
      },
      user: req.user._id,
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);

    // Send notifications after responding. Do not fail product creation if email fails.
    try {
      const Subscriber = require("../models/Subscriber");
      const { sendMail } = require("../utils/sendMail");
      const subscribers = await Subscriber.find({ isSubscribed: true });

      if (subscribers.length > 0) {
        const productUrl = `https://raphaaa.onrender.com/product/${createdProduct._id}`;
        const subject = `New Arrival: ${createdProduct.name} just dropped!`;

        for (const subscriber of subscribers) {
          const message = `
        <h2>New Product Alert!</h2>
        <p>We just added <strong>${createdProduct.name}</strong> to our collection.</p>
        <p><a href="${productUrl}">Click here</a> to view it now!</p>
        <p>Thanks for being a part of Raphaaa.</p>
        <p style="margin-top:20px; font-size:12px;">
          Not interested? <a href="https://raphaaa-backend.onrender.com/api/unsubscribe/${encodeURIComponent(
            subscriber.email
          )}">Unsubscribe</a>
        </p>
      `;

          await sendMail({
            to: subscriber.email,
            subject,
            message,
          });
        }
      }
    } catch (notifyErr) {
      console.error("Product created, but failed to send subscriber notifications:", notifyErr);
    }
  } catch (error) {
    console.error(error);
    if (error?.name === "ValidationError") {
      return res.status(400).json({
        message: "Invalid product data",
        details: Object.values(error.errors || {}).map((e) => e.message),
      });
    }
    if (error?.code === 11000) {
      return res.status(400).json({
        message: "Duplicate product data. Please check the entered values.",
      });
    }
    res.status(500).send("Internal Server Error");
  }
});

// @route GET /api/products
// @desc Get all products with optional queries filters
// access Public
router.get("/", async (req, res) => {
  try {
    const {
      collection,
      size,
      color,
      gender,
      minPrice,
      maxPrice,
      sortBy,
      search,
      category,
      material,
      brand,
      limit,
      userId, // 👈 new
      includeUnpublished,
    } = req.query;

    const shouldCache = String(includeUnpublished) !== "true";
    const cacheKey = shouldCache ? `list:${req.originalUrl}` : null;
    if (shouldCache && cacheKey) {
      const cached = await getJson("products", cacheKey);
      if (cached) return res.json(cached);
    }

    let query = {};

    // Storefront should show only published products by default
    if (String(includeUnpublished) !== "true") {
      query.isPublished = true;
    }
    // git status
    // Filters
    if (collection && collection.toLowerCase() !== "all") {
      query.collections = collection;
    }

    if (category && category.toLowerCase() !== "all") {
      query.category = category;
    }

    if (material) {
      query.material = { $in: material.split(",") };
    }

    if (brand) {
      query.brand = { $in: brand.split(",") };
    }

    if (size) {
      query.sizes = { $in: size.split(",") };
    }

    if (color) {
      query.colors = { $in: [color] };
    }

    if (gender) {
      query.gender = gender;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const trimmedSearch = String(search || "").trim();
    if (trimmedSearch) {
      // Primary: weighted text index (better relevance).
      query.$text = { $search: trimmedSearch };
    }

    // Sorting
    let sort = {};
    if (sortBy) {
      switch (sortBy) {
        case "priceAsc":
          sort = { price: 1 };
          break;
        case "priceDesc":
          sort = { price: -1 };
          break;
        case "popularity":
          sort = { rating: -1 };
          break;
        default:
          break;
      }
    }

    // If we're searching and user didn't force a sort, sort by text relevance.
    const shouldSortByTextScore = !!trimmedSearch && (!sortBy || Object.keys(sort).length === 0);
    if (shouldSortByTextScore) {
      sort = { score: { $meta: "textScore" } };
    }

    // Fetch products
    const projection = shouldSortByTextScore ? { score: { $meta: "textScore" } } : undefined;
    const safeLimit = Math.max(0, Math.min(50, Number(limit) || 0));
    let products = await Product.find(query, projection).sort(sort).limit(safeLimit);

    // Fallback: basic typo tolerance via regex if text search returns nothing.
    // This is intentionally limited to name/brand/category to avoid very wide scans.
    if (trimmedSearch && products.length === 0) {
      const fallbackQuery = { ...query };
      delete fallbackQuery.$text;
      fallbackQuery.$or = [
        { name: { $regex: trimmedSearch, $options: "i" } },
        { brand: { $regex: trimmedSearch, $options: "i" } },
        { category: { $regex: trimmedSearch, $options: "i" } },
      ];
      products = await Product.find(fallbackQuery)
        .sort(sortBy ? sort : { createdAt: -1 })
        .limit(safeLimit);
    }

    const timedOffers = await getTimedOffersForDisplay();
    products = decorateProductsWithTimedOffers(products, timedOffers);

    // If user has a valid coupon, apply discount
    if (userId) {
      const user = await User.findById(userId);

      if (
        user?.coupon &&
        user.coupon.code &&
        user.coupon.discount &&
        new Date(user.coupon.expiresAt) > new Date()
      ) {
        const discount = user.coupon.discount;

        // Apply discountPrice on the fly
        products = products.map((p) => {
          const discountPrice = parseFloat(
            (p.price * (1 - discount / 100)).toFixed(2)
          );
          return { ...p, discountPrice };
        });
      }
    }

    if (shouldCache && cacheKey) {
      await setJson("products", cacheKey, products, 45);
    }
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// @route GET /api/products/facets
// @desc Facet counts for filters (brand/category/price/size/color) under current query
// @access Public
router.get("/facets", async (req, res) => {
  try {
    const {
      collection,
      size,
      color,
      gender,
      minPrice,
      maxPrice,
      search,
      category,
      material,
      brand,
      includeUnpublished,
    } = req.query;

    const match = {};
    if (String(includeUnpublished) !== "true") {
      match.isPublished = true;
    }

    if (collection && String(collection).toLowerCase() !== "all") {
      match.collections = collection;
    }
    if (category && String(category).toLowerCase() !== "all") {
      match.category = category;
    }
    if (material) {
      match.material = { $in: String(material).split(",") };
    }
    if (brand) {
      match.brand = { $in: String(brand).split(",") };
    }
    if (size) {
      match.sizes = { $in: String(size).split(",") };
    }
    if (color) {
      match.colors = { $in: [String(color)] };
    }
    if (gender) {
      match.gender = gender;
    }
    if (minPrice || maxPrice) {
      match.price = {};
      if (minPrice) match.price.$gte = Number(minPrice);
      if (maxPrice) match.price.$lte = Number(maxPrice);
    }

    const trimmedSearch = String(search || "").trim();
    if (trimmedSearch) {
      match.$text = { $search: trimmedSearch };
    }

    const shouldCache = String(includeUnpublished) !== "true";
    const cacheKey = shouldCache ? `facets:${req.originalUrl}` : null;
    if (shouldCache && cacheKey) {
      const cached = await getJson("products", cacheKey);
      if (cached) return res.json(cached);
    }

    const [result] = await Product.aggregate([
      { $match: match },
      {
        $facet: {
          total: [{ $count: "count" }],
          price: [
            {
              $group: {
                _id: null,
                min: { $min: "$price" },
                max: { $max: "$price" },
              },
            },
          ],
          brands: [
            { $match: { brand: { $exists: true, $ne: "" } } },
            { $sortByCount: "$brand" },
            { $limit: 100 },
          ],
          categories: [
            { $match: { category: { $exists: true, $ne: "" } } },
            { $sortByCount: "$category" },
            { $limit: 100 },
          ],
          sizes: [
            { $unwind: "$sizes" },
            { $match: { sizes: { $exists: true, $ne: "" } } },
            { $sortByCount: "$sizes" },
            { $limit: 100 },
          ],
          colors: [
            { $unwind: "$colors" },
            { $match: { colors: { $exists: true, $ne: "" } } },
            { $sortByCount: "$colors" },
            { $limit: 100 },
          ],
        },
      },
    ]);

    const total = result?.total?.[0]?.count || 0;
    const price = result?.price?.[0] || { min: null, max: null };

    const payload = {
      success: true,
      total,
      price: { min: price.min ?? null, max: price.max ?? null },
      brands: result?.brands || [],
      categories: result?.categories || [],
      sizes: result?.sizes || [],
      colors: result?.colors || [],
    };

    if (shouldCache && cacheKey) {
      await setJson("products", cacheKey, payload, 60);
    }
    res.json(payload);
  } catch (err) {
    console.error("Facet error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch facets" });
  }
});

// GET /api/products/inventory - Admin & Merchandise only
router.get("/inventory", protect, admin, async (req, res) => {
  try {
    const query =
      req.user?.role === "merchantise"
        ? { user: req.user._id }
        : {};

    const products = await Product.find(query).select(
      "name category price countInStock sku colorVariants variants"
    );
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch inventory" });
  }
});

// @route GET /api/products/by-ids?ids=comma,separated,ids
// @desc Fetch products by IDs (keeps input order). Useful for recently-viewed guest lists.
// @access Public
router.get("/by-ids", async (req, res) => {
  try {
    const ids = String(req.query.ids || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 30);

    if (ids.length === 0) return res.json([]);

    const objectIds = ids
      .map((id) => {
        try {
          return new mongoose.Types.ObjectId(id);
        } catch (_) {
          return null;
        }
      })
      .filter(Boolean);

    if (objectIds.length === 0) return res.json([]);

    const docs = await Product.find({ _id: { $in: objectIds }, isPublished: true });
    const byId = new Map(docs.map((d) => [String(d._id), d]));
    const ordered = ids.map((id) => byId.get(String(id))).filter(Boolean);
    const timedOffers = await getTimedOffersForDisplay();
    res.json(decorateProductsWithTimedOffers(ordered, timedOffers));
  } catch (err) {
    console.error("by-ids error:", err);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

// @route GET /api/products/best-seller
// @desc Retrieve the product with highest rating
// @access Public
// router.get("/best-seller", async(req, res) => {
//     try {
//         const bestSeller = await Product.findOne().sort({ rating: -1 });
//         if(bestSeller){
//             res.json(bestSeller);
//         } else {
//             res.status(404).json({ message: "No best seller found" });
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).send("Internal Server error");
//     }
// });

// routes/productRoutes.js or analyticsRoutes.js
router.get("/best-seller", async (req, res) => {
  try {
    const bestSellers = await Order.aggregate([
      { $unwind: "$orderItems" }, // Break down array of items

      {
        $group: {
          _id: "$orderItems.productId", // Group by product ID
          totalSold: { $sum: "$orderItems.quantity" }, // Sum quantity sold
        },
      },

      { $sort: { totalSold: -1 } }, // Sort by sold quantity, highest first
      { $limit: 10 }, // Top 10

      {
        $lookup: {
          from: "products", // ⬅️ must match your actual MongoDB collection name
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" }, // convert array to object

      {
        $project: {
          _id: 0,
          productId: "$product._id",
          name: "$product.name",
          price: "$product.price",
          discountPrice: "$product.discountPrice",
          category: "$product.category",
          gender: "$product.gender",
          image: {
            $ifNull: [
              // colorVariants[0].images[0].url — safely navigate two levels of arrays
              {
                $let: {
                  vars: { cv: { $arrayElemAt: ["$product.colorVariants", 0] } },
                  in: { $arrayElemAt: ["$$cv.images.url", 0] },
                },
              },
              // Legacy flat images array — images[0].url
              { $arrayElemAt: ["$product.images.url", 0] },
            ],
          },
          totalSold: 1,
        },
      },
    ]);

    res.status(200).json(bestSellers);
  } catch (error) {
    console.error("Error fetching best sellers:", error);
    res.status(500).json({ message: "Failed to fetch best sellers" });
  }
});

// @route GET /api/products/new-arrivals
// @desc Retrieve latest 8 products - Creation date
// @access Public
router.get("/new-arrivals", async (req, res) => {
  try {
    const newArrivals = await Product.find({ isPublished: true })
      .sort({ createdAt: -1 })
      .limit(8);
    const timedOffers = await getTimedOffersForDisplay();
    res.json(decorateProductsWithTimedOffers(newArrivals, timedOffers));
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});

// @route GET /api/products/similar/:id
// @desc Retrieve similar products based on the current product's gender and category
// @access Public
router.get("/similar/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const similarProducts = await Product.find({
      _id: { $ne: id }, // Exclude the current product ID
      gender: product.gender,
      category: product.category,
      isPublished: true,
    }).limit(50);

    const timedOffers = await getTimedOffersForDisplay();
    res.json(decorateProductsWithTimedOffers(similarProducts, timedOffers));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// @route PUT /api/products/:id
// @desc Update an existing product ID
// @access Private/Admin
router.put("/:id", protect, admin, async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      discountPrice,
      countInStock,
      category,
      brand,
      sizes,
      colors,
      collections,
      material,
      gender,
      images,
      isFeatured,
      isPublished,
      tags,
      dimensions,
      weight,
      sku,
      offerPercentage,
      variants,
      colorVariants,
      sizeChart,
      returnPolicy,
    } = req.body;

    const product = await Product.findById(req.params.id);

    const normalizeSizeChart = (value) => {
      if (!value || typeof value !== "object") return value;
      return {
        ...value,
        audience: getCanonicalAudience(value.audience, "Unisex"),
      };
    };

    if (product) {
      const prevPrice = Number(product.discountPrice || product.price || 0);
      const prevStock = Number(product.countInStock || 0);
      const normalizedColorVariants = normalizeColorVariants(colorVariants);
      const normalizedVariants = normalizeVariants(variants);

      let finalSizes, finalColors, finalStock, finalSku;

      if (normalizedColorVariants.length > 0) {
        const derived = deriveFromColorVariants(normalizedColorVariants);
        finalSizes = derived.sizes;
        finalColors = derived.colors;
        finalStock = derived.countInStock;
        finalSku = sku || derived.firstSku || product.sku;
        product.colorVariants = normalizedColorVariants;
        product.variants = [];
      } else if (normalizedVariants.length > 0) {
        const derived = deriveFromVariants(normalizedVariants);
        finalSizes = derived.sizes;
        finalColors = derived.colors;
        finalStock = derived.countInStock;
        finalSku = sku || normalizedVariants[0]?.sku || product.sku;
        product.variants = normalizedVariants;
      } else {
        finalSizes = sizes ?? product.sizes;
        finalColors = colors ?? product.colors;
        finalStock = countInStock ?? product.countInStock;
        finalSku = sku ?? product.sku;
      }

      product.name = name ?? product.name;
      product.description = description ?? product.description;
      product.price = price ?? product.price;
      product.discountPrice = discountPrice ?? product.discountPrice;
      product.countInStock = finalStock;
      product.category = category ?? product.category;
      product.brand = brand ?? product.brand;
      product.sizes = finalSizes;
      product.colors = finalColors;
      product.collections = collections ?? product.collections;
      product.material = material ?? product.material;
      product.gender = normalizeGender(gender ?? product.gender);
      product.images = images ?? product.images;
      product.isFeatured = isFeatured !== undefined ? isFeatured : product.isFeatured;
      product.isPublished = isPublished !== undefined ? isPublished : product.isPublished;
      product.tags = tags ?? product.tags;
      product.dimensions = dimensions ?? product.dimensions;
      product.weight = weight ?? product.weight;
      product.sku = finalSku;
      product.offerPercentage = offerPercentage ?? 0;
      product.sizeChart = sizeChart ? normalizeSizeChart(sizeChart) : product.sizeChart;
      if (returnPolicy !== undefined) {
        product.returnPolicy = {
          eligible: returnPolicy?.eligible !== false,
          days: Number.isFinite(Number(returnPolicy?.days)) ? Math.max(0, Number(returnPolicy.days)) : (product.returnPolicy?.days ?? 7),
          text: String(returnPolicy?.text || "").trim(),
        };
      }

      const updatedProduct = await product.save();
      res.json(updatedProduct);

      // Non-blocking triggers
      try {
        const nextPrice = Number(updatedProduct.discountPrice || updatedProduct.price || 0);
        const nextStock = Number(updatedProduct.countInStock || 0);

        if (nextStock > 0 && nextStock !== prevStock) {
          await triggerBackInStockForProduct(updatedProduct._id);
        }
        if (nextPrice > 0 && nextPrice < prevPrice) {
          await triggerPriceDropForProduct(updatedProduct._id);
        }
      } catch (triggerErr) {
        console.error("Product alert trigger error:", triggerErr?.message || triggerErr);
      }
    } else {
      res.status(404).json({ message: "Product not found" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// @route DELETE /api/products/:id
// @desc Delete a product by ID
// @access Private/Admin
router.delete("/:id", protect, admin, async (req, res) => {
  try {
    // Find the product by ID
    const product = await Product.findById(req.params.id);

    if (product) {
      // Remove the product from the database
      await product.deleteOne();
      res.json({ message: "Product Removed" });
    } else {
      res.status(404).json({ message: "Product not found" }); // Fixed typo: was "re.status" and "Peoduct"
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// @route GET /api/products/:id
// @desc Get a single product by ID
// @access Public
// IMPORTANT: This route MUST be last because it catches all remaining /api/products/[anything]
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      const timedOffers = await getTimedOffersForDisplay();
      res.json(decorateProductWithTimedOffer(product, timedOffers));
    } else {
      res.status(404).json({ message: "Product not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});

// @route POST /api/products/:productId/reviews
// @desc Submit a product review
// @access Private
router.post("/:productId/reviews", protect, async (req, res) => {
  try {
    const { rating, comment, image } = req.body;
    const { productId } = req.params;

    // Prevent duplicate reviews by the same user (optional)
    const existingReview = await Review.findOne({
      product: productId,
      user: req.user._id,
    });

    if (existingReview) {
      return res
        .status(400)
        .json({ message: "You already reviewed this product" });
    }

    const review = new Review({
      product: productId,
      user: req.user._id,
      rating,
      comment,
      image,
    });

    await review.save();

    // Recalculate product stats
    const allReviews = await Review.find({ product: productId });
    const avgRating =
      allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await Product.findByIdAndUpdate(productId, {
      numReviews: allReviews.length,
      rating: avgRating,
    });

    res.status(201).json({ message: "Review submitted", review });
  } catch (err) {
    console.error("Review submission error:", err);
    res
      .status(500)
      .json({ message: "Failed to submit review", error: err.message });
  }
});

module.exports = router;
