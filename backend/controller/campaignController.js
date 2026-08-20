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
  buildCampaignPreviewResponse,
  buildCampaignPreviewHtml,
  buildProductSharePreviewResponse,
  isPreviewBot,
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

  const preview = await buildCampaignPreviewResponse(req, c);
  if (preview.isBot) {
    res.set("Content-Type", "text/html; charset=utf-8");
    return res.send(preview.html);
  }

  const tracked = await registerCampaignClick(req, c);
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const pixelUrl = `${baseUrl}/api/campaigns/${c._id}/pixel.gif`;
  const html = buildCampaignPreviewHtml({
    title: preview.product?.name || c.name || "Raphaaa",
    description: preview.product?.description || `Shop ${preview.product?.name || c.name || "Raphaaa"} on Raphaaa`,
    imageUrl: preview.product
      ? (preview.product?.colorVariants?.find((cv) => Array.isArray(cv?.images) && cv.images.length > 0)?.images?.[0]?.url ||
        preview.product?.images?.[0]?.url)
      : "https://www.raphaaa.com/favicon-512x512.png",
    redirectUrl: tracked.targetUrl,
    pixelUrl,
    redirectDelayMs: 500,
  });
  res.set("Content-Type", "text/html; charset=utf-8");
  return res.send(html);
};

exports.sharePreview = async (req, res) => {
  const productUrl = req.query?.url || "";
  const preview = await buildProductSharePreviewResponse(productUrl);
  res.set("Content-Type", "text/html; charset=utf-8");
  return res.send(preview.html);
};

exports.trackOpen = async (req, res) => {
  const c = await Campaign.findById(req.params.id);
  if (!c || !c.utmLink) return res.status(404).json({ success: false, message: "Campaign not found" });

  const tracked = await registerCampaignClick(
    {
      ...req,
      query: {
        ...req.query,
        utm_source: req.body?.utm_source || req.query?.utm_source,
      },
      get: (header) => {
        if (header === "referer" || header === "referrer") return req.body?.referrer || req.get("referer") || req.get("referrer") || "";
        if (header === "user-agent") return req.get("user-agent") || "";
        return req.get(header);
      },
      headers: req.headers,
      socket: req.socket,
    },
    c
  );

  res.json({
    success: true,
    clickId: tracked.clickId,
    targetUrl: tracked.targetUrl,
  });
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
