const express = require("express");
const SiteEvent = require("../models/SiteEvent");
const { optionalAuth } = require("../middleware/authMiddleware");

const router = express.Router();

const TYPES = new Set(["pageview", "click", "login", "campaign", "ping"]);
const DEVICES = new Set(["desktop", "mobile", "tablet"]);
const clip = (v, n) => String(v || "").trim().slice(0, n);

// Admin / staff pages are never counted
const isExcludedPath = (path) => /^\/admin(\/|$)/i.test(path);

// @route POST /api/track  body: { events: [...] }
router.post("/", optionalAuth, async (req, res) => {
  try {
    const raw = Array.isArray(req.body?.events) ? req.body.events.slice(0, 50) : [];
    const staffRoles = ["admin", "merchantise", "marketing", "delivery_boy"];
    if (req.user && staffRoles.includes(req.user.role)) return res.status(204).end();

    const docs = raw
      .filter((e) => e && TYPES.has(e.type) && e.visitorId)
      .map((e) => ({
        type: e.type,
        visitorId: clip(e.visitorId, 64),
        sessionId: clip(e.sessionId, 64),
        user: req.user?._id || null,
        path: clip(e.path, 300) || "/",
        label: clip(e.label, 80),
        referrerHost: clip(e.referrerHost, 120).toLowerCase(),
        campaign: clip(e.campaign, 60),
        device: DEVICES.has(e.device) ? e.device : "desktop",
        isNewVisitor: Boolean(e.isNewVisitor),
      }))
      .filter((d) => !isExcludedPath(d.path));

    if (docs.length) await SiteEvent.insertMany(docs, { ordered: false });
    res.status(204).end();
  } catch (e) {
    console.error("track error:", e.message);
    res.status(204).end();
  }
});

module.exports = router;
