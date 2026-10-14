const express = require("express");
const router = express.Router();
const About = require("../models/About");
const { protect, admin } = require("../middleware/authMiddleware");
const cleanHtml = require("../utils/sanitizeHtml");

// @route GET /api/settings/about
// @desc Get About Us content
// @access Public
router.get("/", async (req, res) => {
  try {
    const about = await About.findOne().sort({ updatedAt: -1 });
    res.json(about ? { ...about.toObject(), content: cleanHtml(about.content) } : { content: "" });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch About Us content" });
  }
});

// @route PUT /api/settings/about
// @desc Update About Us content
// @access Private (admin only)
router.put("/", protect, admin, async (req, res) => {
  try {
    const content = cleanHtml(req.body.content);

    let about = await About.findOne();
    if (about) {
      about.content = content;
    } else {
      about = new About({ content });
    }

    await about.save();
    res.status(200).json({ message: "About Us updated successfully", content: about.content });
  } catch (error) {
    res.status(500).json({ message: "Failed to update About Us content" });
  }
});

module.exports = router;
