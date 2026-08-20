const mongoose = require("mongoose");

const sentEmailSchema = new mongoose.Schema(
  {
    to: { type: String, required: true }, // comma-separated recipient list
    subject: { type: String, required: true },
    message: { type: String, required: true }, // HTML body
    recipientCount: { type: Number, default: 1 },
    audience: { type: String, default: "" }, // "buyers" | "subscribers" | "custom" | "reply"
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    relatedContact: { type: mongoose.Schema.Types.ObjectId, ref: "Contact", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SentEmail", sentEmailSchema);
