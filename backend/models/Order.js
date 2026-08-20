const mongoose = require("mongoose");
const crypto = require("crypto");

const orderItemSchema = new mongoose.Schema(
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
    size: String,
    color: String,
    quantity: {
      type: Number,
      required: true,
    },
    sku: {
      type: String, // ✅ Added SKU field
      // required: true,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    guestEmail: { type: String, default: null },
    guestName: { type: String, default: null },
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
    orderNote: { type: String, default: "" },
    orderItems: [orderItemSchema],
    shippingAddress: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
      phone: { type: Number, required: true },
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    walletApplied: {
      type: Number,
      default: 0,
      min: 0,
    },
    couponSnapshot: {
      codes: [{ type: String, trim: true }],
      appliedOffers: [{ type: String, trim: true }],
      personalCouponApplied: { type: Boolean, default: false },
      personalCouponCode: { type: String, trim: true, default: "" },
      totalDiscount: { type: Number, default: 0, min: 0 },
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    paidAt: {
      type: Date,
    },
    isDelivered: {
      type: Boolean,
      default: false,
    },
    deliveredAt: {
      type: Date,
    },
    paymentStatus: {
      type: String,
      default: "pending",
    },
    paymentResult: {
      id: { type: String },
      status: { type: String },
      update_time: { type: Date },
      email_address: { type: String },
    },
    status: {
      type: String,
      enum: [
        "Processing",
        "Packed",
        "Transfer",
        "Pickup Scheduled",
        "Picked Up",
        "Shipped",
        "In Transit",
        "Out For Delivery",
        "Delivered",
        "RTO Initiated",
        "RTO Delivered",
        "Refunded",
        "Cancelled",
      ],
      default: "Processing",
    },
    shiprocket: {
      shipmentId: { type: Number },
      shiprocketOrderId: { type: Number },
      awbCode: { type: String },
      courierName: { type: String },
      trackingStatus: { type: String },
      trackingStatusCode: { type: Number },
      trackingUpdatedAt: { type: Date },
      channel: { type: String, default: "shiprocket" },
      lastSyncAt: { type: Date },
      rawTracking: { type: mongoose.Schema.Types.Mixed },
    },
    cancellation: {
      isCancelledByUser: { type: Boolean, default: false },
      reason: { type: String, default: "" },
      cancelledAt: { type: Date },
    },
    refundTimeline: {
      status: {
        type: String,
        enum: ["none", "initiated", "processed", "completed"],
        default: "none",
      },
      initiatedAt: { type: Date },
      processedAt: { type: Date },
      completedAt: { type: Date },
      expectedDate: { type: Date },
      note: { type: String, default: "" },
    },
    idempotencyKey: {
      type: String,
      index: true,
      sparse: true,
    },
  },
  { timestamps: true }
);
orderSchema.pre("validate", async function (next) {
  if (!this.orderId) {
    let uniqueId = "";
    let exists = true;

    while (exists) {
      // Generate random 6-character alphanumeric ID
      uniqueId = crypto.randomBytes(3).toString("hex").toUpperCase(); // 6 characters

      // Check if it already exists
      const existingOrder = await mongoose.models.Order.findOne({ orderId: uniqueId });
      if (!existingOrder) exists = false;
    }

    this.orderId = uniqueId;
  }

  next();
});
module.exports = mongoose.model("Order", orderSchema);


