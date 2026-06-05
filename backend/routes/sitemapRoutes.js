const express = require("express");
const Product = require("../models/Product");
const MetaOption = require("../models/MetaOption");

const router = express.Router();

const SITE = process.env.FRONTEND_URL || "https://www.raphaaa.com";

const url = (path, { lastmod, priority = "0.5", changefreq = "weekly" } = {}) => `
  <url>
    <loc>${SITE}${path}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;

// GET /sitemap.xml
router.get("/", async (req, res) => {
  try {
    const [products, categories] = await Promise.all([
      Product.find({ isPublished: true })
        .select("name _id updatedAt category")
        .lean(),
      MetaOption.find({ type: "category" }).select("value").lean(),
    ]);

    // ── Static pages ──────────────────────────────────────────────────────────
    const staticPages = [
      url("/",                    { priority: "1.0", changefreq: "daily"   }),
      url("/collections/all",     { priority: "0.9", changefreq: "daily"   }),
      url("/offers",              { priority: "0.8", changefreq: "daily"   }),
      url("/exclusive-drop",      { priority: "0.7", changefreq: "weekly"  }),
      url("/about",               { priority: "0.6", changefreq: "monthly" }),
      url("/contact-us",          { priority: "0.5", changefreq: "monthly" }),
      url("/refer",               { priority: "0.5", changefreq: "monthly" }),
      url("/privacy-policy",      { priority: "0.3", changefreq: "yearly"  }),
      url("/terms",               { priority: "0.3", changefreq: "yearly"  }),
      url("/shipping-policy",     { priority: "0.3", changefreq: "yearly"  }),
      url("/return-policy",       { priority: "0.3", changefreq: "yearly"  }),
      url("/cancellation-policy", { priority: "0.3", changefreq: "yearly"  }),
    ];

    // ── Category collection pages ─────────────────────────────────────────────
    const categoryPages = categories.map((c) =>
      url(`/collections/${encodeURIComponent(c.value.toLowerCase())}`, {
        priority: "0.8",
        changefreq: "daily",
      })
    );

    // ── Product pages (use _id — globally unique, matches app routing) ─────────
    const productPages = products.map((p) => {
      const slug = String(p.name || "").toLowerCase().trim().replace(/\s+/g, "-");
      const lastmod = p.updatedAt
        ? new Date(p.updatedAt).toISOString().split("T")[0]
        : undefined;
      return url(`/product/${slug}/p/${p._id}`, {
        lastmod,
        priority: "0.8",
        changefreq: "weekly",
      });
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${[...staticPages, ...categoryPages, ...productPages].join("")}
</urlset>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch (err) {
    console.error("sitemap error:", err);
    res.status(500).send("Failed to generate sitemap");
  }
});

module.exports = router;
