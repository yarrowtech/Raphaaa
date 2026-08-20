const crypto = require("crypto");
const Campaign = require("../models/campaignModel");
const CampaignClick = require("../models/CampaignClick");
const Product = require("../models/Product");

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

const escapeHtml = (value = "") =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

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

const isPreviewBot = (userAgent = "") => {
  const ua = String(userAgent || "").toLowerCase();
  return [
    "facebookexternalhit",
    "whatsapp",
    "telegrambot",
    "twitterbot",
    "discordbot",
    "linkedinbot",
    "slackbot",
    "pinterest",
    "crawler",
    "spider",
    "bot",
  ].some((needle) => ua.includes(needle));
};

const resolveProductFromCampaignUrl = async (campaignUrl = "") => {
  if (!campaignUrl) return null;
  let parsed;
  try {
    parsed = /^https?:\/\//i.test(campaignUrl)
      ? new URL(campaignUrl)
      : new URL(campaignUrl, getFrontendBaseUrl());
  } catch {
    return null;
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  const productIndex = segments.indexOf("product");
  if (productIndex === -1) return null;

  const slug = decodeURIComponent(segments[productIndex + 1] || "").trim();
  const sku = decodeURIComponent(
    segments[productIndex + 3] || segments[productIndex + 2] || ""
  ).trim();

  if (sku) {
    const bySku = await Product.findOne({
      $or: [{ sku }, { skuCode: sku }],
    })
      .select("name description images colorVariants sku skuCode")
      .lean();
    if (bySku) return bySku;
  }

  if (slug) {
    const products = await Product.find({})
      .select("name description images colorVariants sku skuCode")
      .lean();
    const normalizedSlug = slug.toLowerCase();
    const bySlug = products.find((product) =>
      String(product?.name || "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-") === normalizedSlug
    );
    if (bySlug) return bySlug;
  }

  return null;
};

const pickPreviewImage = (product) => {
  const variantImage =
    product?.colorVariants?.find((cv) => Array.isArray(cv?.images) && cv.images.length > 0)?.images?.[0]?.url ||
    "";
  return (
    variantImage ||
    product?.images?.[0]?.url ||
    "https://www.raphaaa.com/favicon-512x512.png"
  );
};

const buildCampaignPreviewHtml = ({
  title,
  description,
  imageUrl,
  redirectUrl,
  pixelUrl = "",
  redirectDelayMs = 0,
}) => {
  const safeTitle = escapeHtml(title || "Raphaaa");
  const safeDescription = escapeHtml(description || "Raphaaa product preview");
  const safeImage = escapeHtml(imageUrl || "https://www.raphaaa.com/favicon-512x512.png");
  const safeRedirect = escapeHtml(redirectUrl || "https://www.raphaaa.com");
  const safePixel = escapeHtml(pixelUrl || "");
  const delayMs = Number.isFinite(Number(redirectDelayMs)) ? Math.max(0, Number(redirectDelayMs)) : 0;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDescription}" />
  <meta property="og:image" content="${safeImage}" />
  <meta property="og:type" content="product" />
  <meta property="og:url" content="${safeRedirect}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDescription}" />
  <meta name="twitter:image" content="${safeImage}" />
  ${delayMs > 0 ? `<meta http-equiv="refresh" content="${Math.ceil(delayMs / 1000)}; url=${safeRedirect}" />` : ""}
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
</head>
<body>
  <p>Redirecting to product...</p>
  ${safePixel ? `<img src="${safePixel}" alt="" width="1" height="1" style="position:absolute;left:-9999px;top:-9999px;opacity:0;pointer-events:none" />` : ""}
  <script>
    const target = ${JSON.stringify(redirectUrl || "https://www.raphaaa.com")};
    const delay = ${JSON.stringify(delayMs)};
    if (delay > 0) {
      setTimeout(() => window.location.replace(target), delay);
    } else {
      window.location.replace(target);
    }
  </script>
</body>
</html>`;
};

const buildProductSharePreviewResponse = async (productUrl = "") => {
  const product = await resolveProductFromCampaignUrl(productUrl);
  const title = product?.name || "Raphaaa";
  const description = product?.description || `Shop ${title} on Raphaaa`;
  const imageUrl = pickPreviewImage(product);
  const redirectUrl = buildCampaignLandingUrl({
    productUrl,
    platform: "social",
    name: title,
  }) || productUrl;

  return {
    html: buildCampaignPreviewHtml({
      title,
      description,
      imageUrl,
      redirectUrl,
    }),
    product,
    redirectUrl,
  };
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

async function buildCampaignPreviewResponse(req, campaign) {
  const product = await resolveProductFromCampaignUrl(campaign?.utmLink || campaign?.productUrl || "");
  const redirectUrl = buildTrackedTargetUrl(campaign?.utmLink || "", {
    campaignId: campaign?._id,
    clickId: "",
    utm_source: normalize(campaign?.platform).toLowerCase() || "campaign",
    utm_medium: normalize(campaign?.platform).toLowerCase() === "google" ? "cpc" : "social",
    utm_campaign: normalize(campaign?.name).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "campaign",
    utm_content: "product",
  });
  const title = product?.name || campaign?.name || "Raphaaa";
  const description = product?.description || `Shop ${title} on Raphaaa`;
  const imageUrl = pickPreviewImage(product);

  return {
    isBot: isPreviewBot(req.get("user-agent") || ""),
    html: buildCampaignPreviewHtml({ title, description, imageUrl, redirectUrl }),
    redirectUrl,
    product,
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
  buildCampaignPreviewResponse,
  buildProductSharePreviewResponse,
  isPreviewBot,
  buildCampaignPreviewHtml,
};
