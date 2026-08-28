import { FaFacebook, FaInstagram, FaLinkedinIn, FaPinterestP, FaTiktok, FaWhatsapp, FaXTwitter, FaYoutube } from "react-icons/fa6";
import { SiThreads } from "react-icons/si";
import { FaLink } from "react-icons/fa";

const LEGACY_SOCIAL_FIELDS = [
  { platform: "facebook", label: "Facebook", enabledKey: "showFacebook", urlKey: "facebookUrl" },
  { platform: "instagram", label: "Instagram", enabledKey: "showInstagram", urlKey: "instagramUrl" },
  { platform: "x", label: "X / Twitter", enabledKey: "showTwitter", urlKey: "twitterUrl" },
];

const ICONS = {
  facebook: FaFacebook,
  instagram: FaInstagram,
  x: FaXTwitter,
  twitter: FaXTwitter,
  youtube: FaYoutube,
  pinterest: FaPinterestP,
  linkedin: FaLinkedinIn,
  tiktok: FaTiktok,
  whatsapp: FaWhatsapp,
  threads: SiThreads,
};

export const SOCIAL_PLATFORM_OPTIONS = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "x", label: "X / Twitter" },
  { value: "youtube", label: "YouTube" },
  { value: "pinterest", label: "Pinterest" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "tiktok", label: "TikTok" },
  { value: "threads", label: "Threads" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "custom", label: "Custom" },
];

const normalizePlatform = (platform) =>
  String(platform || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");

export const getSocialIcon = (platform) => {
  const key = normalizePlatform(platform);
  return ICONS[key] || FaLink;
};

// Brand colors per platform. Full literal class strings so Tailwind's JIT keeps them.
const ICON_CLASS_NAMES = {
  facebook: "text-[#1877F2] hover:text-[#1877F2]",
  instagram: "text-[#E4405F] hover:text-[#E4405F]",
  x: "text-[#000000] hover:text-[#000000]",
  twitter: "text-[#1DA1F2] hover:text-[#1DA1F2]",
  youtube: "text-[#FF0000] hover:text-[#FF0000]",
  pinterest: "text-[#BD081C] hover:text-[#BD081C]",
  linkedin: "text-[#0A66C2] hover:text-[#0A66C2]",
  tiktok: "text-[#EE1D52] hover:text-[#EE1D52]",
  whatsapp: "text-[#25D366] hover:text-[#25D366]",
  threads: "text-[#000000] hover:text-[#000000]",
};

export const getSocialIconClassName = (platform, fallback = "") => {
  const key = normalizePlatform(platform);
  return ICON_CLASS_NAMES[key] || fallback;
};

export const mapContactToSocialLinks = (contactInfo = {}) => {
  const safeContactInfo = contactInfo || {};

  if (Array.isArray(safeContactInfo.socialLinks) && safeContactInfo.socialLinks.length > 0) {
    return safeContactInfo.socialLinks
      .map((link, index) => ({
        id: link._id || `${link.platform || link.label || "social"}-${index}`,
        platform: normalizePlatform(link.platform) || "custom",
        label: String(link.label || link.platform || "Social").trim(),
        url: String(link.url || "").trim(),
        enabled: link.enabled !== false,
      }))
      .filter((link) => link.url);
  }

  return LEGACY_SOCIAL_FIELDS.map(({ platform, label, enabledKey, urlKey }) => ({
    id: platform,
    platform,
    label,
    url: String(safeContactInfo[urlKey] || "").trim(),
    enabled: Boolean(safeContactInfo[enabledKey]),
  })).filter((link) => link.url);
};

export const getActiveSocialLinks = (contactInfo = {}) =>
  mapContactToSocialLinks(contactInfo).filter((link) => link.enabled && link.url);
