const normalize = (value = "") => String(value || "").trim();

const toDateOrNull = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const buildAttribution = (trackingInfo = {}, fallback = {}) => ({
  source: normalize(trackingInfo.source || fallback.source) || "direct",
  referrer: normalize(trackingInfo.referrer || fallback.referrer),
  landingPage: normalize(trackingInfo.landingPage || fallback.landingPage),
  campaignId: normalize(trackingInfo.campaignId || fallback.campaignId),
  campaignClickId: normalize(trackingInfo.campaignClickId || fallback.campaignClickId),
  utmSource: normalize(trackingInfo.utmSource || trackingInfo.utm_source || fallback.utmSource),
  utmMedium: normalize(trackingInfo.utmMedium || trackingInfo.utm_medium || fallback.utmMedium),
  utmCampaign: normalize(trackingInfo.utmCampaign || trackingInfo.utm_campaign || fallback.utmCampaign),
  utmContent: normalize(trackingInfo.utmContent || trackingInfo.utm_content || fallback.utmContent),
  utmTerm: normalize(trackingInfo.utmTerm || trackingInfo.utm_term || fallback.utmTerm),
  capturedAt: toDateOrNull(trackingInfo.capturedAt || fallback.capturedAt),
  customerName: normalize(trackingInfo.customerName || fallback.customerName),
  customerEmail: normalize(trackingInfo.customerEmail || fallback.customerEmail),
  customerPhone: normalize(trackingInfo.customerPhone || fallback.customerPhone),
});

module.exports = { buildAttribution };
