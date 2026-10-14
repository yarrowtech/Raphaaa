const NAMED_COLORS = [
  "AliceBlue",
  "AntiqueWhite",
  "Aqua",
  "Aquamarine",
  "Azure",
  "Beige",
  "Bisque",
  "Black",
  "BlanchedAlmond",
  "Blue",
  "BlueViolet",
  "Brown",
  "BurlyWood",
  "CadetBlue",
  "Chartreuse",
  "Chocolate",
  "Coral",
  "CornflowerBlue",
  "Cornsilk",
  "Crimson",
  "Cyan",
  "DarkBlue",
  "DarkCyan",
  "DarkGoldenRod",
  "DarkGray",
  "DarkGrey",
  "DarkGreen",
  "DarkKhaki",
  "DarkMagenta",
  "DarkOliveGreen",
  "DarkOrange",
  "DarkOrchid",
  "DarkRed",
  "DarkSalmon",
  "DarkSeaGreen",
  "DarkSlateBlue",
  "DarkSlateGray",
  "DarkSlateGrey",
  "DarkTurquoise",
  "DarkViolet",
  "DeepPink",
  "DeepSkyBlue",
  "DimGray",
  "DimGrey",
  "DodgerBlue",
  "FireBrick",
  "FloralWhite",
  "ForestGreen",
  "Fuchsia",
  "Gainsboro",
  "GhostWhite",
  "Gold",
  "GoldenRod",
  "Gray",
  "Grey",
  "Green",
  "GreenYellow",
  "HoneyDew",
  "HotPink",
  "IndianRed",
  "Indigo",
  "Ivory",
  "Khaki",
  "Lavender",
  "LavenderBlush",
  "LawnGreen",
  "LemonChiffon",
  "LightBlue",
  "LightCoral",
  "LightCyan",
  "LightGoldenRodYellow",
  "LightGray",
  "LightGrey",
  "LightGreen",
  "LightPink",
  "LightSalmon",
  "LightSeaGreen",
  "LightSkyBlue",
  "LightSlateGray",
  "LightSlateGrey",
  "LightSteelBlue",
  "LightYellow",
  "Lime",
  "LimeGreen",
  "Linen",
  "Magenta",
  "Maroon",
  "MediumAquaMarine",
  "MediumBlue",
  "MediumOrchid",
  "MediumPurple",
  "MediumSeaGreen",
  "MediumSlateBlue",
  "MediumSpringGreen",
  "MediumTurquoise",
  "MediumVioletRed",
  "MidnightBlue",
  "MintCream",
  "MistyRose",
  "Moccasin",
  "NavajoWhite",
  "Navy",
  "OldLace",
  "Olive",
  "OliveDrab",
  "Orange",
  "OrangeRed",
  "Orchid",
  "PaleGoldenRod",
  "PaleGreen",
  "PaleTurquoise",
  "PaleVioletRed",
  "PapayaWhip",
  "PeachPuff",
  "Peru",
  "Pink",
  "Plum",
  "PowderBlue",
  "Purple",
  "RebeccaPurple",
  "Red",
  "RosyBrown",
  "RoyalBlue",
  "SaddleBrown",
  "Salmon",
  "SandyBrown",
  "SeaGreen",
  "SeaShell",
  "Sienna",
  "Silver",
  "SkyBlue",
  "SlateBlue",
  "SlateGray",
  "SlateGrey",
  "Snow",
  "SpringGreen",
  "SteelBlue",
  "Tan",
  "Teal",
  "Thistle",
  "Tomato",
  "Turquoise",
  "Violet",
  "Wheat",
  "White",
  "WhiteSmoke",
  "Yellow",
  "YellowGreen",
];

const hexToRgb = (hex) => {
  let value = hex.replace("#", "");
  if (value.length === 3 || value.length === 4) {
    value = value
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const int = parseInt(value.slice(0, 6), 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
};

let namedColorRgbCache = null;

const getNamedColorRgbMap = () => {
  if (namedColorRgbCache) return namedColorRgbCache;
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  namedColorRgbCache = NAMED_COLORS.map((name) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = name;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return { name, rgb: [r, g, b] };
  });
  return namedColorRgbCache;
};

export const nearestColorName = (hex) => {
  const map = getNamedColorRgbMap();
  if (!map) return null;
  if (!/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(hex)) return null;
  const [r, g, b] = hexToRgb(hex);
  let closest = null;
  let closestDistance = Infinity;
  for (const entry of map) {
    const [er, eg, eb] = entry.rgb;
    const distance = (r - er) ** 2 + (g - eg) ** 2 + (b - eb) ** 2;
    if (distance < closestDistance) {
      closestDistance = distance;
      closest = entry.name;
    }
  }
  return closest;
};

export const prettyColorLabel = (value) => {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.startsWith("#")) {
    const nearest = nearestColorName(text);
    return nearest ? prettyColorLabel(nearest) : text.toUpperCase();
  }
  return text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export const createColorOption = (value) => {
  const normalized = String(value || "").trim();
  return {
    value: normalized,
    label: prettyColorLabel(normalized),
  };
};

export const COLOR_OPTIONS = NAMED_COLORS.map(createColorOption);

export const findColorOption = (value, options = COLOR_OPTIONS) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return null;
  return options.find((option) => option.value.trim().toLowerCase() === normalized) || null;
};

export const colorFilterOption = (candidate, input) => {
  const search = String(input || "").trim().toLowerCase();
  if (!search) return true;
  return (
    String(candidate.label || "").toLowerCase().includes(search) ||
    String(candidate.value || "").toLowerCase().includes(search)
  );
};

export const isValidCssColor = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized) return false;
  if (normalized.startsWith("#")) {
    return /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(normalized);
  }
  if (typeof document === "undefined") return true;
  const element = document.createElement("span");
  element.style.color = "";
  element.style.color = normalized;
  return Boolean(element.style.color);
};
