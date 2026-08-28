const express = require("express");
const router = express.Router();
const Offer = require("../models/offer");
const Product = require("../models/Product");
const ContactSetting = require("../models/ContactSetting");
const { protect, admin, optionalAuth } = require("../middleware/authMiddleware");
const { sendMail } = require("../utils/sendMail"); // Assuming you already have this utility
const Subscriber = require("../models/Subscriber");
const Order = require("../models/Order");
const User = require("../models/User");
const { enqueueJob } = require("../services/jobQueue");
const { syncTimedOfferPricing } = require("../utils/timedOfferSync");
const { getJson, setJson, deleteJson } = require("../utils/redisCache");

// Razorpay client (guarded – payment offers are optional and must never crash the route)
let razorpay = null;
try {
  const Razorpay = require("razorpay");
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
} catch (err) {
  console.error("Razorpay not initialised for offer routes:", err.message);
}

// Create offer
router.post("/", protect, admin, async (req, res) => {
  const offer = await Offer.create(req.body);

const sendInitialOfferEmails = async (offer) => {
  const subscribers = await Subscriber.find({ isSubscribed: true });
  const uniqueBuyerIds = await Order.distinct("user", {
    "orderItems.productId": { $in: offer.productIds },
  });
  const buyers = await User.find({ _id: { $in: uniqueBuyerIds } });

  const recipients = [...subscribers.map(s => s.email), ...buyers.map(b => b.email)];
  const uniqueEmails = [...new Set(recipients)];

  const formattedStart = new Date(offer.startDate).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric"
  });
  const formattedEnd = new Date(offer.endDate).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric"
  });

  const subject = `Upcoming Offer: ${offer.title}`;
  const message = `
    <h2>Get Ready for Our New Offer!</h2>
    <p><strong>${offer.title}</strong> is launching soon with up to <strong>${offer.offerPercentage}% OFF</strong>.</p>
    <p>Valid from <strong>${formattedStart}</strong> to <strong>${formattedEnd}</strong>.</p>
    <p>Stay tuned and don't miss out!</p>
  `;

  for (const email of uniqueEmails) {
    await enqueueJob("send_email", { to: email, subject, message }, { maxAttempts: 6 });
  }
};
await sendInitialOfferEmails(offer);
  await syncTimedOfferPricing({ productIds: offer.productIds });
  await deleteJson("offers", "public");


  res.status(201).json(offer);
});

// Public: Get all active offers for users
router.get("/public", async (req, res) => {
  try {
    const cacheKey = "public";
    const cached = await getJson("offers", cacheKey);
    if (cached) {
      res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
      return res.json(cached);
    }

    // Coupons (offers with a couponCode) must NOT appear as storefront sales /
    // banners / popups. They surface only on the product page's "Apply" list
    // (GET /api/offers/for-product/:id) and in the checkout price quote.
    const offers = await Offer.find({
      $or: [{ couponCode: { $exists: false } }, { couponCode: "" }, { couponCode: null }],
    })
      .populate("productIds", "name price images price discountPrice offerPercentage")
      .sort({ createdAt: -1 });

    const now = new Date();
    const activeOffers = offers.filter(
      (offer) => offer.isActive !== false && new Date(offer.endDate) >= now && !offer.couponCode
    );

    await setJson("offers", cacheKey, activeOffers, 60);
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.json(activeOffers);
  } catch (err) {
    console.error("Public offer fetch failed:", err.message);
    res.status(500).json({ message: "Failed to load offers" });
  }
});

// Public: Bank / payment offers shown on the product page (display-only).
// Combines live Razorpay offers with admin-managed manual bank-offer lines.
// @route GET /api/offers/payment
router.get("/payment", async (req, res) => {
  const cacheKey = "payment";
  try {
    const cached = await getJson("offers", cacheKey);
    if (cached) {
      res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
      return res.json(cached);
    }

    let razorpayOffers = [];
    if (razorpay) {
      try {
        const offers = await razorpay.offers.all();
        const now = Date.now() / 1000;
        razorpayOffers = (offers.items || [])
          .filter((o) => o.active && (!o.ends_at || o.ends_at > now))
          .map((o) => ({
            id: o.id,
            source: "razorpay",
            name: o.name,
            type: o.type,
            displayText: o.display_text,
            tncUrl: o.tnc_url || "",
          }));
      } catch (err) {
        console.error("Error fetching Razorpay offers:", err.message);
      }
    }

    let manualOffers = [];
    try {
      const setting = await ContactSetting.findOne().select("bankOffers").lean();
      manualOffers = (setting?.bankOffers || [])
        .filter((b) => b && b.enabled !== false && String(b.text || "").trim())
        .map((b, idx) => ({
          id: `manual-${idx}`,
          source: "manual",
          name: "Bank Offer",
          type: "bank",
          displayText: String(b.text).trim(),
          tncUrl: String(b.tncUrl || "").trim(),
          logo: String(b.logo || "").trim(),
        }));
    } catch (err) {
      console.error("Error reading manual bank offers:", err.message);
    }

    const payload = [...manualOffers, ...razorpayOffers];
    await setJson("offers", cacheKey, payload, 300); // 5 min
    res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    res.json(payload);
  } catch (err) {
    console.error("Payment offers fetch failed:", err.message);
    res.status(200).json([]); // never break the product page
  }
});

// Public: Store offers/coupons applicable to a single product (shown on the PDP
// with an "Apply" action). Only returns offers that are live right now.
// @route GET /api/offers/for-product/:productId
router.get("/for-product/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    if (!productId || !productId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const product = await Product.findById(productId)
      .select("category brand collections")
      .lean();
    if (!product) return res.status(404).json({ message: "Product not found" });

    const now = new Date();
    const category = String(product.category || "").toLowerCase();
    const brand = String(product.brand || "").toLowerCase();

    const offers = await Offer.find({
      isActive: { $ne: false },
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).lean();

    const matches = offers.filter((offer) => {
      const c = offer.conditions || {};
      const pid = String(productId);

      if (Array.isArray(c.excludeProductIds) && c.excludeProductIds.some((x) => String(x) === pid)) {
        return false;
      }

      const hasLegacyProducts = Array.isArray(offer.productIds) && offer.productIds.length > 0;
      const hasIncludeProducts = Array.isArray(c.includeProductIds) && c.includeProductIds.length > 0;
      const hasIncludeCategories = Array.isArray(c.includeCategories) && c.includeCategories.length > 0;
      const hasIncludeBrands = Array.isArray(c.includeBrands) && c.includeBrands.length > 0;

      // No targeting at all -> a store-wide offer, applies to every product.
      if (!hasLegacyProducts && !hasIncludeProducts && !hasIncludeCategories && !hasIncludeBrands) {
        return true;
      }

      if (hasLegacyProducts && offer.productIds.some((x) => String(x) === pid)) return true;
      if (hasIncludeProducts && c.includeProductIds.some((x) => String(x) === pid)) return true;
      if (hasIncludeCategories && c.includeCategories.some((x) => String(x).toLowerCase() === category)) return true;
      if (hasIncludeBrands && c.includeBrands.some((x) => String(x).toLowerCase() === brand)) return true;

      return false;
    });

    const shaped = matches
      .map((offer) => {
        const benefit = offer.benefit || {};
        const percent = Number(benefit.percent || offer.offerPercentage || 0);
        const amount = Number(benefit.amount || 0);
        return {
          _id: offer._id,
          title: offer.title,
          description: offer.description || "",
          couponCode: String(offer.couponCode || "").trim().toUpperCase(),
          autoApplied: !offer.couponCode,
          scope: benefit.scope || "product",
          benefitType: benefit.type || (percent ? "percent" : "flat"),
          percent,
          amount,
          maxDiscount: benefit.maxDiscount != null ? Number(benefit.maxDiscount) : null,
          paymentMethods: Array.isArray(offer.conditions?.paymentMethods)
            ? offer.conditions.paymentMethods.filter(Boolean)
            : [],
          minCartSubtotal: offer.conditions?.minCartSubtotal != null
            ? Number(offer.conditions.minCartSubtotal)
            : null,
          endDate: offer.endDate,
          priority: offer.priority ?? 100,
        };
      })
      .sort((a, b) => a.priority - b.priority);

    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.json(shaped);
  } catch (err) {
    console.error("for-product offers fetch failed:", err.message);
    res.status(200).json([]);
  }
});

// Public: check whether a coupon code exists and is live right now.
// Used by the cart/checkout "Apply" box so a bad code shows "No coupon found".
// @route POST /api/offers/validate  { code }
router.post("/validate", optionalAuth, async (req, res) => {
  try {
    const code = String(req.body?.code || "").trim().toUpperCase();
    if (!code) return res.status(400).json({ valid: false, message: "Enter a coupon code" });

    const now = new Date();

    const offer = await Offer.findOne({
      couponCode: { $regex: `^${code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
      isActive: { $ne: false },
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).lean();

    if (offer) {
      return res.json({
        valid: true,
        code,
        title: offer.title || "",
        description: offer.description || "",
        paymentMethods: Array.isArray(offer.conditions?.paymentMethods)
          ? offer.conditions.paymentMethods.filter(Boolean)
          : [],
        minCartSubtotal: offer.conditions?.minCartSubtotal != null
          ? Number(offer.conditions.minCartSubtotal)
          : null,
      });
    }

    // Personal / welcome coupon on the logged-in user
    if (req.user?._id) {
      const user = await User.findById(req.user._id).select("coupon").lean();
      const personalCode = String(user?.coupon?.code || "").trim().toUpperCase();
      const notExpired = user?.coupon?.expiresAt
        ? new Date(user.coupon.expiresAt) > now
        : true;
      if (personalCode && personalCode === code && notExpired) {
        return res.json({ valid: true, code, title: "Personal coupon", personal: true });
      }
    }

    return res.status(404).json({ valid: false, code, message: "No coupon found for this code" });
  } catch (err) {
    console.error("coupon validate error:", err.message);
    res.status(500).json({ valid: false, message: "Could not validate coupon right now" });
  }
});

// Get all offers
// Get all offers
router.get("/", protect, admin, async (req, res) => {
  const now = new Date();

  // Auto update isActive flag
  await Offer.updateMany(
    { startDate: { $lte: now }, endDate: { $gte: now } },
    { $set: { isActive: true } }
  );
  await Offer.updateMany(
    { $or: [{ startDate: { $gt: now } }, { endDate: { $lt: now } }] },
    { $set: { isActive: false } }
  );

  const offers = await Offer.find().populate("productIds", "name price discountPrice offerPercentage");
  res.json(offers);
});



// Get single offer
router.get("/:id", protect, admin, async (req, res) => {
  const offer = await Offer.findById(req.params.id).populate("productIds");
  res.json(offer);
});

// Update offer
router.put("/:id", protect, admin, async (req, res) => {
  const previousOffer = await Offer.findById(req.params.id).select("productIds");
  const updatedOffer = await Offer.findByIdAndUpdate(req.params.id, req.body, { new: true });
  const affectedProductIds = [
    ...(previousOffer?.productIds || []),
    ...(updatedOffer?.productIds || []),
  ];
  await syncTimedOfferPricing({ productIds: affectedProductIds });
  await deleteJson("offers", "public");

  res.json(updatedOffer);
});

// Delete offer
router.delete("/:id", protect, admin, async (req, res) => {
  const offer = await Offer.findByIdAndDelete(req.params.id);
  if (!offer) {
    return res.status(404).json({ message: "Offer not found" });
  }

  await syncTimedOfferPricing({ productIds: offer.productIds });
  await deleteJson("offers", "public");
  res.json({ message: "Offer deleted" });
});




module.exports = router;
