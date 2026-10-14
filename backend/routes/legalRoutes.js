const express = require("express");
const mongoose = require("mongoose");
const { protect, admin } = require("../middleware/authMiddleware");
const cleanHtml = require("../utils/sanitizeHtml");

const router = express.Router();

// Reuse a generic LegalPage model (singleton per type)
const legalPageSchema = new mongoose.Schema(
  { type: { type: String, unique: true, required: true }, content: { type: String, default: "" } },
  { timestamps: true }
);
const LegalPage = mongoose.models.LegalPage || mongoose.model("LegalPage", legalPageSchema);

const VALID_TYPES = ["terms", "shipping-policy", "return-policy", "cancellation-policy"];

// GET /api/legal/:type
router.get("/:type", async (req, res) => {
  if (!VALID_TYPES.includes(req.params.type))
    return res.status(400).json({ message: "Invalid page type" });
  try {
    const page = await LegalPage.findOne({ type: req.params.type });
    res.json(page ? { ...page.toObject(), content: cleanHtml(page.content) } : { type: req.params.type, content: "" });
  } catch (_) {
    res.status(500).json({ message: "Failed to fetch page" });
  }
});

// PUT /api/legal/:type  (admin only)
router.put("/:type", protect, admin, async (req, res) => {
  if (!VALID_TYPES.includes(req.params.type))
    return res.status(400).json({ message: "Invalid page type" });
  try {
    const page = await LegalPage.findOneAndUpdate(
      { type: req.params.type },
      { content: cleanHtml(req.body.content) },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, page });
  } catch (_) {
    res.status(500).json({ message: "Failed to save page" });
  }
});

module.exports = router;
