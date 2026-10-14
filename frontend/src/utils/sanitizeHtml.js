import DOMPurify from "dompurify";

export default function cleanHtml(dirty) {
  return DOMPurify.sanitize(String(dirty || ""), { ALLOWED_TAGS: ["p", "br", "b", "strong", "i", "em", "u", "s", "a", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "span", "div", "table", "thead", "tbody", "tr", "th", "td", "img", "hr"], ALLOWED_ATTR: ["href", "rel", "src", "alt", "width", "height", "class"], ALLOW_DATA_ATTR: false });
}
