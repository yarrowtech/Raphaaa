// // backend/controllers/campaignController.js
// const Campaign = require("../models/campaignModel");

// // Create new campaign
// const createCampaign = async (req, res) => {
//   try {
//     const newCampaign = await Campaign.create({ ...req.body, createdBy: req.user.id });
//     res.status(201).json({ success: true, data: newCampaign });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// // Get all campaigns for logged-in marketer
// const getCampaigns = async (req, res) => {
//   try {
//     const campaigns = await Campaign.find({ createdBy: req.user.id });
//     res.status(200).json({ success: true, data: campaigns });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// // Update campaign
// const updateCampaign = async (req, res) => {
//   try {
//     const updated = await Campaign.findByIdAndUpdate(req.params.id, req.body, { new: true });
//     res.status(200).json({ success: true, data: updated });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// // Delete campaign
// const deleteCampaign = async (req, res) => {
//   try {
//     await Campaign.findByIdAndDelete(req.params.id);
//     res.status(200).json({ success: true, message: "Campaign deleted" });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// module.exports = {
//   createCampaign,
//   getCampaigns,
//   updateCampaign,
//   deleteCampaign
// };

// backend/controller/campaignController.js
const Campaign = require("../models/campaignModel");
const {
  registerCampaignClick,
  registerCampaignConversion,
  buildCampaignLandingUrl,
} = require("../utils/campaignTracking");

// CRUD (you already reference these in routes)
exports.createCampaign = async (req, res) => {
  const productUrl = req.body?.productUrl || req.body?.utmLink || "";
  const utmLink = buildCampaignLandingUrl({
    productUrl,
    platform: req.body?.platform,
    name: req.body?.name,
  });
  const doc = await Campaign.create({
    ...req.body,
    productUrl,
    utmLink,
    createdBy: req.user._id,
  });
  res.status(201).json({ data: doc });
};
exports.getCampaigns = async (req, res) => {
  const docs = await Campaign.find().sort({ createdAt: -1 });
  res.json({ data: docs });
};
exports.updateCampaign = async (req, res) => {
  const existing = await Campaign.findById(req.params.id);
  const productUrl = req.body?.productUrl ?? existing?.productUrl ?? req.body?.utmLink ?? existing?.utmLink ?? "";
  const utmLink = buildCampaignLandingUrl({
    productUrl,
    platform: req.body?.platform ?? existing?.platform,
    name: req.body?.name ?? existing?.name,
  });
  const doc = await Campaign.findByIdAndUpdate(
    req.params.id,
    { ...req.body, productUrl, utmLink },
    { new: true }
  );
  res.json({ data: doc });
};
exports.deleteCampaign = async (req, res) => {
  await Campaign.findByIdAndDelete(req.params.id);
  res.json({ success: true });
};

// Tracking: redirect -> +1 click, then go to UTM link
exports.redirectAndTrack = async (req, res) => {
  const c = await Campaign.findById(req.params.id);
  if (!c || !c.utmLink) return res.status(404).send("Campaign not found");

  const tracked = await registerCampaignClick(req, c);
  res.cookie?.("raphaaa_campaign_click_id", tracked.clickId, {
    httpOnly: false,
    sameSite: "Lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 30,
  });
  return res.redirect(tracked.targetUrl);
};

// Tracking: impression pixel (use GET for <img/> beacons)
exports.pixel = async (req, res) => {
  await Campaign.findByIdAndUpdate(req.params.id, { $inc: { impressions: 1 } });
  // Return a 1x1 transparent GIF
  const gif = Buffer.from(
    "R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==",
    "base64"
  );
  res.set("Content-Type", "image/gif");
  res.set("Cache-Control", "no-store, must-revalidate");
  res.send(gif);
};

// Tracking: conversion (call from order success)
exports.trackConversion = async (req, res) => {
  const clickId = req.body?.campaignClickId || req.query?.campaignClickId || req.query?.campaign_click_id;
  if (clickId) {
    await registerCampaignConversion({ campaignClickId: clickId, orderId: req.body?.orderId });
  } else {
    await Campaign.findByIdAndUpdate(req.params.id, { $inc: { conversions: 1 } });
  }
  res.json({ success: true });
};
