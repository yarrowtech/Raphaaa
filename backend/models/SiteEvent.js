const mongoose = require("mongoose");

// Storefront tracking events (page views, clicks, logins, campaign landings, heartbeats).
const siteEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["pageview", "click", "login", "campaign", "ping"],
      required: true,
    },
    visitorId: { type: String, required: true },
    sessionId: { type: String },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    path: { type: String, default: "/" },
    label: { type: String, default: "" },
    referrerHost: { type: String, default: "" },
    campaign: { type: String, default: "" },
    device: { type: String, enum: ["desktop", "mobile", "tablet"], default: "desktop" },
    isNewVisitor: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

siteEventSchema.index({ createdAt: 1, type: 1 });
// Keep raw events for 180 days
siteEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

module.exports = mongoose.model("SiteEvent", siteEventSchema);
