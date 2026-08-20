const crypto = require("crypto");
const Campaign = require("../models/campaignModel");
const CampaignClick = require("../models/CampaignClick");

const normalize = (value = "") => String(value || "").trim();

const inferSource = ({ utmSource = "", referrer = "", platform = "" } = {}) => {
  const source = normalize(utmSource).toLowerCase();
  if (source) return source;
  const ref = normalize(referrer).toLowerCase();
  if (ref.includes("instagram.com")) return "instagram";
  if (ref.includes("facebook.com") || ref.includes("fb.me") || ref.includes("l.facebook.com")) return "facebook";
  if (platform) return normalize(platform).toLowerCase().toLowerCase();
  return "direct";
};

const buildTrackedTargetUrl = (targetUrl, payload = {}) => {
  const url = new URL(targetUrl);
  if (payload.campaignId) url.searchParams.set("campaign_id", String(payload.campaignId));
  if (payload.clickId) url.searchParams.set("campaign_click_id", String(payload.clickId));
  if (payload.utm_source) url.searchParams.set("utm_source", String(payload.utm_source));
  if (payload.utm_medium) url.searchParams.set("utm_medium", String(payload.utm_medium));
  if (payload.utm_campaign) url.searchParams.set("utm_campaign", String(payload.utm_campaign));
  if (payload.utm_content) url.searchParams.set("utm_content", String(payload.utm_content));
  return url.toString();
};

const getFrontendBaseUrl = () => {
  const raw = normalize(process.env.FRONTEND_URL || "http://localhost:3000");
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
};

const buildCampaignLandingUrl = ({ productUrl = "", platform = "", name = "" } = {}) => {
  const base = normalize(productUrl);
  if (!base) return "";

  const resolvedUrl = /^https?:\/\//i.test(base)
    ? new URL(base)
    : new URL(base.startsWith("/") ? base : `/${base}`, getFrontendBaseUrl());

  const source = normalize(platform).toLowerCase() || "campaign";
  const campaign = normalize(name).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "campaign";

  resolvedUrl.searchParams.set("utm_source", source);
  resolvedUrl.searchParams.set("utm_medium", source === "google" ? "cpc" : "social");
  resolvedUrl.searchParams.set("utm_campaign", campaign);
  resolvedUrl.searchParams.set("utm_content", "product");

  return resolvedUrl.toString();
};

async function registerCampaignClick(req, campaign) {
  const clickId = crypto.randomBytes(12).toString("hex");
  const source = inferSource({
    utmSource: req.query?.utm_source,
    referrer: req.get("referer") || req.get("referrer") || "",
    platform: campaign?.platform,
  });
  const landingUrl = campaign?.utmLink || "";

  await Campaign.findByIdAndUpdate(campaign._id, { $inc: { clicks: 1 } });

  await CampaignClick.create({
    campaign: campaign._id,
    clickId,
    source,
    referrer: req.get("referer") || req.get("referrer") || "",
    landingUrl,
    userAgent: req.get("user-agent") || "",
    ipAddress: req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "",
  });

  return {
    clickId,
    source,
    targetUrl: buildTrackedTargetUrl(landingUrl, {
      campaignId: campaign._id,
      clickId,
      utm_source: source,
      utm_medium: "campaign",
      utm_campaign: normalize(campaign.name).toLowerCase().replace(/\s+/g, "_") || "campaign",
      utm_content: "product",
    }),
  };
}

async function registerCampaignConversion({ campaignClickId, orderId }) {
  if (!campaignClickId) return null;

  const click = await CampaignClick.findOne({ clickId: campaignClickId });
  if (!click) return null;

  if (click.converted) {
    return click;
  }

  click.converted = true;
  click.convertedAt = new Date();
  click.orderId = orderId || null;
  await click.save();

  await Campaign.findByIdAndUpdate(click.campaign, { $inc: { conversions: 1 } });
  return click;
}

module.exports = {
  registerCampaignClick,
  registerCampaignConversion,
  buildCampaignLandingUrl,
};
