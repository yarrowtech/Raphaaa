const express = require("express");
const router = express.Router();
const MetaOption = require("../models/MetaOption");
const { protect, adminOrMerchantise } = require("../middleware/authMiddleware");

// Public — returns only type + value, no auth needed (used by storefront filters)
router.get("/public", async (req, res) => {
  try {
    const options = await MetaOption.find({}, "type value").sort({ type: 1, value: 1 });
    res.json(options);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch options" });
  }
});

// Get all (admin)
router.get("/", protect, adminOrMerchantise, async (req, res) => {
  const options = await MetaOption.find()
    .populate("createdBy", "name email role")
    .sort({ createdAt: -1 });
  res.json(options);
});

// Add one
router.post("/", protect, adminOrMerchantise, async (req, res) => {
  const { type, value } = req.body;
  if (!type || !value) return res.status(400).json({ message: "Type and value are required" });

  const exists = await MetaOption.findOne({ type, value });
  if (exists) return res.status(409).json({ message: "Option already exists" });

  const newOption = new MetaOption({ type, value, createdBy: req.user?._id || null });
  await newOption.save();
  const populated = await MetaOption.findById(newOption._id).populate("createdBy", "name email role");
  res.status(201).json(populated);
});

// Edit meta option
router.put("/:id", protect, adminOrMerchantise, async (req, res) => {
  const { value } = req.body;
  try {
    const updated = await MetaOption.findByIdAndUpdate(
      req.params.id,
      { value },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update option" });
  }
});

// Delete meta option
router.delete("/:id", protect, adminOrMerchantise, async (req, res) => {
  try {
    await MetaOption.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete option" });
  }
});


module.exports = router;
