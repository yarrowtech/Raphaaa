const mongoose = require("mongoose");

const contactSettingSchema = new mongoose.Schema({
  showFacebook: { type: Boolean, default: false },
  facebookUrl: { type: String, default: "" },
  showInstagram: { type: Boolean, default: false },
  instagramUrl: { type: String, default: "" },
  showTwitter: { type: Boolean, default: false },
  twitterUrl: { type: String, default: "" },
  showGmail: { type: Boolean, default: false },
  gmail: { type: String, default: "" },
  showPhone: { type: Boolean, default: false },
  phone: { type: String, default: "" },
  showTopText: { type: Boolean, default: false },
  topText:     { type: String,  default: "" },
  socialLinks: [{
    platform: { type: String, default: "" },
    label:    { type: String, default: "" },
    url:      { type: String, default: "" },
    enabled:  { type: Boolean, default: true },
  }],
  // Legal & business info (editable from admin panel)
  gstin:                  { type: String, default: "" },
  cin:                    { type: String, default: "" },
  businessName:           { type: String, default: "Raphaaa by Citimart" },
  registeredAddress:      { type: String, default: "" },
  grievanceOfficerName:   { type: String, default: "" },
  grievanceOfficerEmail:  { type: String, default: "" },
  grievanceResponseTime:  { type: String, default: "48 hours" },
  whatsappNumber:         { type: String, default: "" },
  // Exit-intent coupon
  exitIntentCoupon:       { type: String, default: "WELCOME10" },
  exitIntentDiscount:     { type: String, default: "10%" },
  exitIntentEnabled:      { type: Boolean, default: true },
  // Manual bank / payment offers shown on the product page (display-only)
  bankOffers: [{
    text:    { type: String, default: "" },
    tncUrl:  { type: String, default: "" },
    logo:    { type: String, default: "" }, // bank/card logo image URL
    enabled: { type: Boolean, default: true },
  }],
}, { timestamps: true });

module.exports = mongoose.model("ContactSetting", contactSettingSchema);
