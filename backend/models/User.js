const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/.\@.+\..+/, "Please enter a valid email address"],
    },
    password: {
      type: String,
      required: true,
      minLength: 6,
    },
    role: {
      type: String,
      enum: ["customer", "admin", "merchantise", "delivery_boy", "marketing"],
      default: "customer",
    },
    photo: {
      type: String,
      default: "",
    },
    addresses: [
      {
        firstName:  { type: String, trim: true, default: "" },
        lastName:   { type: String, trim: true, default: "" },
        address:    { type: String, required: true, trim: true },
        landmark:   { type: String, trim: true, default: "" },
        city:       { type: String, required: true, trim: true },
        state:      { type: String, required: true, trim: true },
        postalCode: { type: String, required: true, trim: true },
        country:    { type: String, required: true, trim: true, default: "India" },
        phone:      { type: String, required: true, trim: true },
        addressType:{ type: String, enum: ["Home", "Work", "Other"], default: "Home" },
        isDefault:  { type: Boolean, default: false },
      },
    ],
    coupon: {
      code: { type: String },
      discount: { type: Number }, // e.g., 10 for 10%
      expiresAt: { type: Date },
    },
    // Primary login identifier when set (10-digit, normalised). Email is the
    // fallback for users without a mobile number.
    mobile: { type: String, trim: true, index: true },
    mobileVerified: { type: Boolean, default: false },
    pushSubscription: {
      endpoint: { type: String, default: "" },
      keys: {
        auth: { type: String, default: "" },
        p256dh: { type: String, default: "" },
      },
    },
    referralCode:  { type: String, unique: true, sparse: true },
    referredBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    referralCount: { type: Number, default: 0 },
    otpCode: { type: String },
    otpExpires: { type: Date },
    resetToken: String,
resetTokenExpire: Date,

    // Personalization (Phase 3): store per-user recently viewed products.
    recentlyViewed: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        viewedAt: { type: Date, default: Date.now },
      },
    ],

    // Search bar history — either a typed search term, or a product the user
    // clicked straight from the search suggestions.
    searchHistory: [
      {
        type: { type: String, enum: ["term", "product"], required: true },
        term: { type: String, trim: true, default: "" },
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          default: null,
        },
        searchedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Password Hash middleware
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Match entered password to hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
