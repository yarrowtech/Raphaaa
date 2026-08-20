const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/User");
const Product = require("../models/Product");
const { protect } = require("../middleware/authMiddleware");

const MAX_HISTORY = 12;

// @route POST /api/search-history
// @desc Record a search — either a typed term, or a product clicked from suggestions
// @access Private
router.post("/", protect, async (req, res) => {
  try {
    const { type, term, productId } = req.body;

    if (type !== "term" && type !== "product") {
      return res.status(400).json({ message: "type must be 'term' or 'product'" });
    }
    if (type === "term" && !String(term || "").trim()) {
      return res.status(400).json({ message: "term is required" });
    }
    if (type === "product") {
      if (!mongoose.isValidObjectId(productId)) {
        return res.status(400).json({ message: "Invalid productId" });
      }
      const exists = await Product.exists({ _id: productId });
      if (!exists) return res.status(404).json({ message: "Product not found" });
    }

    const user = await User.findById(req.user._id).select("searchHistory");
    if (!user) return res.status(404).json({ message: "User not found" });

    const cleanTerm = String(term || "").trim();

    // De-dupe: drop any existing entry for the same term/product before re-adding at the front
    user.searchHistory = (user.searchHistory || []).filter((h) => {
      if (type === "term") return !(h.type === "term" && h.term.toLowerCase() === cleanTerm.toLowerCase());
      return !(h.type === "product" && String(h.product) === String(productId));
    });

    user.searchHistory.unshift(
      type === "term"
        ? { type: "term", term: cleanTerm, searchedAt: new Date() }
        : { type: "product", product: productId, searchedAt: new Date() }
    );
    user.searchHistory = user.searchHistory.slice(0, MAX_HISTORY);

    await user.save();
    res.status(201).json({ success: true });
  } catch (err) {
    console.error("search-history write error:", err);
    res.status(500).json({ message: "Failed to record search history" });
  }
});

// @route GET /api/search-history
// @desc Get the current user's search history, newest first
// @access Private
router.get("/", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("searchHistory")
      .populate("searchHistory.product", "name images price");

    const items = (user?.searchHistory || [])
      .filter((h) => h.type === "term" || h.product) // drop entries whose product was deleted
      .map((h) => ({
        _id: h._id,
        type: h.type,
        term: h.term,
        product: h.type === "product" ? h.product : undefined,
        searchedAt: h.searchedAt,
      }));

    res.json(items);
  } catch (err) {
    console.error("search-history read error:", err);
    res.status(500).json({ message: "Failed to fetch search history" });
  }
});

// @route DELETE /api/search-history/:entryId
// @desc Remove a single search history entry
// @access Private
router.delete("/:entryId", protect, async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.user._id },
      { $pull: { searchHistory: { _id: req.params.entryId } } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to remove search history entry" });
  }
});

// @route DELETE /api/search-history
// @desc Clear all search history
// @access Private
router.delete("/", protect, async (req, res) => {
  try {
    await User.updateOne({ _id: req.user._id }, { $set: { searchHistory: [] } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to clear search history" });
  }
});

module.exports = router;
