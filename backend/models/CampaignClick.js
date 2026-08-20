const mongoose = require("mongoose");

const campaignClickSchema = new mongoose.Schema(
  {
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true,
    },
    clickId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    source: { type: String, default: "direct" },
    referrer: { type: String, default: "" },
    landingUrl: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    ipAddress: { type: String, default: "" },
    converted: { type: Boolean, default: false },
    convertedAt: { type: Date, default: null },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.models.CampaignClick || mongoose.model("CampaignClick", campaignClickSchema);

