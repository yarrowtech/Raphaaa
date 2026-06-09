const express = require("express");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Order = require("../models/Order");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const asObjectId = (v) => {
  try {
    return new mongoose.Types.ObjectId(String(v));
  } catch (_) {
    return null;
  }
};

// @route POST /api/recommendations/recently-viewed/:productId
// @desc Add product to user's recently viewed list
// @access Private
router.post("/recently-viewed/:productId", protect, async (req, res) => {
  const productId = asObjectId(req.params.productId);
  if (!productId) return res.status(400).json({ message: "Invalid productId" });

  try {
    // Ensure product exists and is published
    const productExists = await Product.exists({ _id: productId, isPublished: true });
    if (!productExists) return res.status(404).json({ message: "Product not found" });

    const user = await User.findById(req.user._id).select("recentlyViewed");
    if (!user) return res.status(404).json({ message: "User not found" });

    const now = new Date();
    const existingIndex = (user.recentlyViewed || []).findIndex(
      (rv) => String(rv.product) === String(productId)
    );

    if (existingIndex !== -1) {
      user.recentlyViewed.splice(existingIndex, 1);
    }
    user.recentlyViewed.unshift({ product: productId, viewedAt: now });
    user.recentlyViewed = user.recentlyViewed.slice(0, 30);

    await user.save();
    res.json({ success: true });
  } catch (err) {
    console.error("recently-viewed write error:", err);
    res.status(500).json({ message: "Failed to record recently viewed" });
  }
});

// @route GET /api/recommendations/recently-viewed
// @desc Get user's recently viewed products
// @access Private
router.get("/recently-viewed", protect, async (req, res) => {
  const limit = Math.max(1, Math.min(50, Number(req.query.limit || 12)));
  try {
    const user = await User.findById(req.user._id)
      .select("recentlyViewed")
      .populate("recentlyViewed.product");

    const items = (user?.recentlyViewed || [])
      .filter((rv) => rv?.product && rv.product.isPublished)
      .slice(0, limit)
      .map((rv) => ({
        ...rv.product.toObject(),
        viewedAt: rv.viewedAt,
      }));

    res.json(items);
  } catch (err) {
    console.error("recently-viewed read error:", err);
    res.status(500).json({ message: "Failed to fetch recently viewed" });
  }
});

// @route GET /api/recommendations/fbt/:productId
// @desc Frequently bought together with a product (co-occurrence from orders)
// @access Public
router.get("/fbt/:productId", async (req, res) => {
  const productId = asObjectId(req.params.productId);
  if (!productId) return res.status(400).json({ message: "Invalid productId" });

  const limit = Math.max(1, Math.min(20, Number(req.query.limit || 8)));

  try {
    const rows = await Order.aggregate([
      { $match: { isPaid: true, orderItems: { $elemMatch: { productId } } } },
      { $unwind: "$orderItems" },
      { $match: { "orderItems.productId": { $ne: productId } } },
      { $group: { _id: "$orderItems.productId", count: { $sum: "$orderItems.quantity" } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      { $match: { "product.isPublished": true } },
      { $replaceRoot: { newRoot: "$product" } },
    ]);

    res.json(rows || []);
  } catch (err) {
    console.error("FBT error:", err);
    res.status(500).json({ message: "Failed to fetch frequently bought together" });
  }
});

// @route GET /api/recommendations/complete-the-look/:productId
// @desc Suggest complementary items to "complete the look" based on category pairing rules
// @access Public
router.get("/complete-the-look/:productId", async (req, res) => {
  const productId = asObjectId(req.params.productId);
  if (!productId) return res.status(400).json({ message: "Invalid productId" });

  const limit = Math.max(1, Math.min(12, Number(req.query.limit || 6)));

  // Category pairing map — key category shows suggestions from value categories
  const PAIRINGS = {
    "t-shirts":   ["jeans", "trousers", "shorts", "sneakers", "shoes", "accessories"],
    "shirts":     ["jeans", "trousers", "chinos", "shoes", "belts", "accessories"],
    "jeans":      ["t-shirts", "shirts", "sneakers", "shoes", "belts", "tops"],
    "trousers":   ["shirts", "t-shirts", "shoes", "belts", "tops"],
    "shorts":     ["t-shirts", "sneakers", "sandals", "tops"],
    "dresses":    ["heels", "sandals", "bags", "accessories", "shoes"],
    "tops":       ["jeans", "trousers", "skirts", "shorts", "shoes", "bags"],
    "skirts":     ["tops", "blouses", "shoes", "heels", "bags", "accessories"],
    "shoes":      ["socks", "jeans", "trousers", "dresses", "shorts"],
    "sneakers":   ["socks", "jeans", "shorts", "t-shirts", "hoodies"],
    "heels":      ["dresses", "skirts", "trousers", "bags", "accessories"],
    "sandals":    ["dresses", "shorts", "tops", "bags", "accessories"],
    "jackets":    ["t-shirts", "jeans", "trousers", "sneakers", "shoes"],
    "hoodies":    ["jeans", "shorts", "sneakers", "t-shirts"],
    "bags":       ["dresses", "tops", "shoes", "accessories"],
    "accessories":["shirts", "t-shirts", "dresses", "tops", "jeans"],
  };

  try {
    const product = await Product.findById(productId).select("category subCategory gender");
    if (!product) return res.status(404).json({ message: "Product not found" });

    const cat = (product.category || "").toLowerCase().replace(/\s+/g, "-");
    const pairCategories = PAIRINGS[cat] || [];

    if (pairCategories.length === 0) return res.json([]);

    // Build a case-insensitive regex for each paired category
    const regexList = pairCategories.map((c) => new RegExp(c, "i"));

    const suggestions = await Product.find({
      _id: { $ne: productId },
      isPublished: true,
      $or: [
        { category: { $in: regexList } },
        { subCategory: { $in: regexList } },
      ],
      ...(product.gender && product.gender !== "Unisex" ? { gender: { $in: [product.gender, "Unisex"] } } : {}),
    })
      .select("name category price discountPrice offerPercentage colorVariants images skuCode")
      .limit(limit * 3);

    // Shuffle and cap to the limit for variety
    const shuffled = suggestions.sort(() => 0.5 - Math.random()).slice(0, limit);
    res.json(shuffled);
  } catch (err) {
    console.error("complete-the-look error:", err);
    res.status(500).json({ message: "Failed to fetch complete the look" });
  }
});

module.exports = router;
