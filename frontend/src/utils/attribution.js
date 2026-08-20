const STORAGE_KEY = "raphaaa_attribution";

const INTERNAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
]);

const normalize = (value = "") => String(value || "").trim();

const getQueryParams = () => {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: normalize(params.get("utm_source")),
    utm_medium: normalize(params.get("utm_medium")),
    utm_campaign: normalize(params.get("utm_campaign")),
    utm_content: normalize(params.get("utm_content")),
    utm_term: normalize(params.get("utm_term")),
  };
};

const inferChannel = ({ utmSource = "", referrer = "" } = {}) => {
  const source = normalize(utmSource).toLowerCase();
  if (source) return source;

  const ref = normalize(referrer).toLowerCase();
  if (!ref) return "direct";

  if (ref.includes("instagram.com")) return "instagram";
  if (ref.includes("facebook.com") || ref.includes("fb.me") || ref.includes("l.facebook.com")) {
    return "facebook";
  }
  if (ref.includes("google.")) return "google";
  return "referral";
};

const isInternalReferrer = (referrer = "") => {
  if (!referrer) return false;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    return INTERNAL_HOSTS.has(host);
  } catch {
    return false;
  }
};

export const captureAttribution = () => {
  if (typeof window === "undefined") return null;

  const existing = readAttribution();
  const params = getQueryParams();
  const referrer = document.referrer || "";
  const landingPage = window.location.href;
  const source = inferChannel({ utmSource: params.utm_source, referrer });
  const hasCampaignParams = Object.values(params).some(Boolean);
  const payload = {
    source,
    referrer,
    landingPage,
    ...params,
    capturedAt: new Date().toISOString(),
  };

  const shouldPersist =
    hasCampaignParams ||
    (!isInternalReferrer(referrer) && source !== "direct");

  if (shouldPersist) {
    const next = {
      ...(existing || {}),
      ...payload,
      source,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  if (existing) return existing;
  return payload;
};

export const readAttribution = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const buildOrderAttribution = ({ customerName = "", customerEmail = "", customerPhone = "" } = {}) => {
  const stored = readAttribution() || captureAttribution() || {};
  return {
    source: normalize(stored.source) || "direct",
    referrer: normalize(stored.referrer),
    landingPage: normalize(stored.landingPage),
    campaignId: normalize(stored.campaignId),
    campaignClickId: normalize(stored.campaignClickId),
    utmSource: normalize(stored.utm_source),
    utmMedium: normalize(stored.utm_medium),
    utmCampaign: normalize(stored.utm_campaign),
    utmContent: normalize(stored.utm_content),
    utmTerm: normalize(stored.utm_term),
    capturedAt: stored.capturedAt || new Date().toISOString(),
    customerName: normalize(customerName),
    customerEmail: normalize(customerEmail),
    customerPhone: normalize(customerPhone),
  };
};

export const buildTrackedProductUrl = (platform = "social") => {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  const params = url.searchParams;

  params.set("utm_source", platform);
  params.set("utm_medium", "social");
  params.set("utm_campaign", `product_share_${window.location.pathname.replace(/\//g, "_").replace(/^_/, "") || "product"}`);
  params.set("utm_content", "product_link");

  return url.toString();
};

export const buildProductSharePreviewUrl = (platform = "social") => {
  if (typeof window === "undefined") return "";
  const backendBase = (import.meta.env.VITE_BACKEND_URL || window.location.origin).replace(/\/$/, "");
  const productUrl = buildTrackedProductUrl(platform);
  return `${backendBase}/api/campaigns/share?url=${encodeURIComponent(productUrl)}`;
};

export const rememberCampaignClick = () => {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const campaignId = normalize(params.get("campaign_id"));
  const campaignClickId = normalize(params.get("campaign_click_id"));
  if (!campaignId && !campaignClickId) return null;

  const existing = readAttribution() || {};
  const next = {
    ...existing,
    campaignId: campaignId || existing.campaignId || "",
    campaignClickId: campaignClickId || existing.campaignClickId || "",
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
};

export const trackCampaignLanding = async () => {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const campaignId = normalize(params.get("campaign_id"));
  if (!campaignId) return null;

  const sessionKey = `raphaaa_campaign_tracked_${campaignId}`;
  if (sessionStorage.getItem(sessionKey)) {
    return readAttribution();
  }

  const backendBase = (import.meta.env.VITE_BACKEND_URL || window.location.origin).replace(/\/$/, "");
  const payload = {
    landingPage: window.location.href,
    referrer: document.referrer || "",
    utm_source: normalize(params.get("utm_source")),
    utm_medium: normalize(params.get("utm_medium")),
    utm_campaign: normalize(params.get("utm_campaign")),
    utm_content: normalize(params.get("utm_content")),
  };

  const response = await fetch(`${backendBase}/api/campaigns/${campaignId}/open`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) return null;

  const data = await response.json().catch(() => ({}));
  const existing = readAttribution() || {};
  const next = {
    ...existing,
    campaignId,
    campaignClickId: data?.clickId || existing.campaignClickId || "",
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  sessionStorage.setItem(sessionKey, "1");
  return next;
};

export const trackCampaignImpression = () => {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const campaignId = normalize(params.get("campaign_id"));
  if (!campaignId) return null;

  const sessionKey = `raphaaa_campaign_impression_${campaignId}`;
  if (sessionStorage.getItem(sessionKey)) return null;

  const backendBase = (import.meta.env.VITE_BACKEND_URL || window.location.origin).replace(/\/$/, "");
  const img = new Image();
  img.src = `${backendBase}/api/campaigns/${campaignId}/pixel.gif?t=${Date.now()}`;
  sessionStorage.setItem(sessionKey, "1");
  return img;
};
