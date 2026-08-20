const mongoose = require("mongoose");

const checkoutItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    size: String,
    color: String,
    sku: {
      type: String,
      // required: true, // ✅ Make sure it's required to avoid errors during conversion to Order
    },
  },
  { _id: false }
);

const checkoutSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    checkoutItems: [checkoutItemSchema],
    shippingAddress: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    attribution: {
      source: { type: String, default: "direct" },
      referrer: { type: String, default: "" },
      landingPage: { type: String, default: "" },
      campaignId: { type: String, default: "" },
      campaignClickId: { type: String, default: "" },
      utmSource: { type: String, default: "" },
      utmMedium: { type: String, default: "" },
      utmCampaign: { type: String, default: "" },
      utmContent: { type: String, default: "" },
      utmTerm: { type: String, default: "" },
      capturedAt: { type: Date, default: null },
      customerName: { type: String, default: "" },
      customerEmail: { type: String, default: "" },
      customerPhone: { type: String, default: "" },
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    pricing: {
      type: mongoose.Schema.Types.Mixed, // quote breakdown: discounts/shipping/offers
      default: null,
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    paidAt: {
      type: Date,
    },
    paymentStatus: {
      type: String,
      default: "pending",
    },
    paymentDetails: {
      type: mongoose.Schema.Types.Mixed, // store payment-related details(transaction ID, paypal response)
    },
    isFinalized: {
      type: Boolean,
      default: false,
    },
    finalizedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Checkout", checkoutSchema);
