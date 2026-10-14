const sanitizeHtml = require("sanitize-html");

// Allowlist for admin-authored rich text (About/Privacy/Legal/Marketing content).
// No script/style/event handlers, no inline on* attributes, no javascript: URLs.
const options = {
  allowedTags: [
    "p", "br", "b", "strong", "i", "em", "u", "s", "a", "ul", "ol", "li",
    "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "span", "div",
    "table", "thead", "tbody", "tr", "th", "td", "img", "hr",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "width", "height"],
    span: ["style"],
    div: ["style"],
    "*": ["class"],
  },
  allowedStyles: {
    "*": {
      color: [/^#[0-9a-fA-F]{3,6}$/, /^rgb\(/],
      "text-align": [/^left$|^right$|^center$|^justify$/],
      "font-weight": [/^\d+$/, /^bold$|^normal$/],
    },
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
  },
};

module.exports = function cleanHtml(dirty) {
  return sanitizeHtml(String(dirty || ""), options);
};
