const mongoose = require("mongoose");

const heroSlideSchema = new mongoose.Schema(
  {
    image:           { type: String, required: true },
    badge:           { type: String, default: "" },
    title:           { type: String, required: true },
    subtitle:        { type: String, default: "" },
    description:     { type: String, default: "" },
    ctaText:         { type: String, default: "" },
    ctaLink:         { type: String, default: "" },
    ctaSecondaryText:{ type: String, default: "" },
    ctaSecondaryLink:{ type: String, default: "" },
    textAlign:       { type: String, enum: ["left", "right", "center"], default: "left" },
    contentPosition: { type: String, enum: ["top", "center", "bottom"], default: "bottom" },
    overlayDirection:{ type: String, enum: ["left", "right", "top", "bottom"], default: "left" },
    overlayColor:    { type: String, default: "bg-linear-to-r from-sky-950/80 via-sky-900/40 to-transparent" },
    isVisible:       { type: Boolean, default: true },
    order:           { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("HeroSlide", heroSlideSchema);
