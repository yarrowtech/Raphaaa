const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Checkout = require("../models/Checkout");
const ReturnRequest = require("../models/ReturnRequest");
const { protect, adminOrMerchantise } = require("../middleware/authMiddleware");

const router = express.Router();

const parseDate = (v, fallback) => {
  const d = v ? new Date(v) : null;
  if (d && !isNaN(d.getTime())) return d;
  return fallback;
};

const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

// @route GET /api/admin/analytics/overview?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/overview", protect, adminOrMerchantise, async (req, res) => {
  const to = parseDate(req.query.to, new Date());
  const from = parseDate(req.query.from, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

  try {
    const match = { createdAt: { $gte: from, $lte: to } };
    const paidMatch = { ...match, isPaid: true };

    const [ordersAgg] = await Order.aggregate([
      { $match: paidMatch },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          revenue: { $sum: "$totalPrice" },
          walletApplied: { $sum: { $ifNull: ["$walletApplied", 0] } },
        },
      },
    ]);

    const cancelled = await Order.countDocuments({
      ...match,
      "cancellation.isCancelledByUser": true,
    });

    const returns = await ReturnRequest.countDocuments({
      createdAt: { $gte: from, $lte: to },
    });

    const orders = Number(ordersAgg?.orders || 0);
    const revenue = Number(ordersAgg?.revenue || 0);
    const aov = orders ? Math.round((revenue / orders) * 100) / 100 : 0;

    res.json({
      success: true,
      from,
      to,
      orders,
      revenue: Math.round(revenue * 100) / 100,
      aov,
      walletApplied: Math.round(Number(ordersAgg?.walletApplied || 0) * 100) / 100,
      cancelled,
      returns,
    });
  } catch (e) {
    console.error("analytics overview error:", e);
    res.status(500).json({ success: false, message: "Failed to load overview" });
  }
});

// @route GET /api/admin/analytics/funnel?from&to
router.get("/funnel", protect, adminOrMerchantise, async (req, res) => {
  const to = parseDate(req.query.to, new Date());
  const from = parseDate(req.query.from, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  try {
    const checkoutMatch = { createdAt: { $gte: from, $lte: to } };
    const orderMatch = { createdAt: { $gte: from, $lte: to } };

    const checkoutsCreated = await Checkout.countDocuments(checkoutMatch);
    const checkoutsPaid = await Checkout.countDocuments({ ...checkoutMatch, isPaid: true });
    const checkoutsFinalized = await Checkout.countDocuments({ ...checkoutMatch, isFinalized: true });
    const ordersPaid = await Order.countDocuments({ ...orderMatch, isPaid: true });

    res.json({
      success: true,
      from,
      to,
      steps: [
        { key: "checkouts_created", count: checkoutsCreated },
        { key: "checkouts_paid", count: checkoutsPaid },
        { key: "checkouts_finalized", count: checkoutsFinalized },
        { key: "orders_paid", count: ordersPaid },
      ],
    });
  } catch (e) {
    console.error("analytics funnel error:", e);
    res.status(500).json({ success: false, message: "Failed to load funnel" });
  }
});

// @route GET /api/admin/analytics/cancellation-reasons?from&to
router.get("/cancellation-reasons", protect, adminOrMerchantise, async (req, res) => {
  const to = parseDate(req.query.to, new Date());
  const from = parseDate(req.query.from, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
  try {
    const rows = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: from, $lte: to },
          "cancellation.isCancelledByUser": true,
        },
      },
      {
        $group: {
          _id: { $ifNull: ["$cancellation.reason", "unknown"] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 100 },
    ]);
    res.json({ success: true, from, to, rows });
  } catch (e) {
    console.error("analytics cancellation error:", e);
    res.status(500).json({ success: false, message: "Failed to load cancellation reasons" });
  }
});

// @route GET /api/admin/analytics/return-reasons?from&to
router.get("/return-reasons", protect, adminOrMerchantise, async (req, res) => {
  const to = parseDate(req.query.to, new Date());
  const from = parseDate(req.query.from, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
  try {
    // ReturnRequest model can differ; group by common fields if present.
    const rows = await ReturnRequest.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: {
            $ifNull: ["$reason", { $ifNull: ["$returnReason", "unknown"] }],
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 100 },
    ]);
    res.json({ success: true, from, to, rows });
  } catch (e) {
    console.error("analytics return reasons error:", e);
    res.status(500).json({ success: false, message: "Failed to load return reasons" });
  }
});

// @route GET /api/admin/analytics/retention-cohorts?months=12
router.get("/retention-cohorts", protect, adminOrMerchantise, async (req, res) => {
  const months = Math.max(3, Math.min(24, Number(req.query.months || 12)));
  try {
    const since = new Date();
    since.setMonth(since.getMonth() - months);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const paidOrders = await Order.aggregate([
      { $match: { isPaid: true, createdAt: { $gte: since } } },
      {
        $project: {
          user: 1,
          ym: {
            $dateToString: { format: "%Y-%m", date: "$createdAt" },
          },
        },
      },
      {
        $group: {
          _id: { user: "$user", ym: "$ym" },
        },
      },
      {
        $group: {
          _id: "$_id.user",
          months: { $addToSet: "$_id.ym" },
        },
      },
    ]);

    // Determine cohort month (first purchase month) and build retention counts per offset.
    const cohortMap = new Map(); // cohortYm -> array[offset] count

    const ymToIndex = (ym) => {
      const [y, m] = ym.split("-").map((x) => Number(x));
      return y * 12 + (m - 1);
    };

    for (const row of paidOrders) {
      const monthsArr = (row.months || []).sort();
      if (monthsArr.length === 0) continue;
      const cohortYm = monthsArr[0];
      const cohortIdx = ymToIndex(cohortYm);

      const offsets = new Set(monthsArr.map((ym) => ymToIndex(ym) - cohortIdx).filter((o) => o >= 0 && o < months));
      if (!cohortMap.has(cohortYm)) cohortMap.set(cohortYm, Array(months).fill(0));
      const vec = cohortMap.get(cohortYm);
      for (const o of offsets) vec[o] += 1;
    }

    const cohorts = [...cohortMap.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([cohortYm, counts]) => ({
        cohort: cohortYm,
        counts,
        size: counts[0] || 0,
      }));

    res.json({ success: true, months, cohorts });
  } catch (e) {
    console.error("analytics retention error:", e);
    res.status(500).json({ success: false, message: "Failed to load retention cohorts" });
  }
});

// @route GET /api/admin/analytics/source-report?from&to
router.get("/source-report", protect, async (req, res) => {
  const role = req.user?.role;
  if (role !== "admin" && role !== "marketing") {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  const to = parseDate(req.query.to, new Date());
  const from = parseDate(req.query.from, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  try {
    const match = { createdAt: { $gte: from, $lte: to } };
    const rows = await Order.aggregate([
      { $match: match },
      {
        $addFields: {
          source: { $ifNull: ["$attribution.source", "direct"] },
        },
      },
      {
        $group: {
          _id: "$source",
          orders: { $sum: 1 },
          revenue: { $sum: { $ifNull: ["$totalPrice", 0] } },
          lastOrderAt: { $max: "$createdAt" },
        },
      },
      { $sort: { orders: -1, revenue: -1 } },
    ]);

    const recentOrders = await Order.find(match)
      .sort({ createdAt: -1 })
      .limit(20)
      .select("orderId totalPrice createdAt attribution user guestName guestEmail paymentStatus status")
      .populate("user", "name email")
      .lean();

    res.json({
      success: true,
      from,
      to,
      rows: rows.map((row) => ({
        source: row._id || "direct",
        orders: row.orders || 0,
        revenue: Math.round(Number(row.revenue || 0) * 100) / 100,
        lastOrderAt: row.lastOrderAt || null,
      })),
      recentOrders: recentOrders.map((order) => ({
        _id: order._id,
        orderId: order.orderId,
        totalPrice: order.totalPrice,
        createdAt: order.createdAt,
        source: order.attribution?.source || "direct",
        customerName: order.attribution?.customerName || order.user?.name || order.guestName || "N/A",
        customerEmail: order.attribution?.customerEmail || order.user?.email || order.guestEmail || "N/A",
        landingPage: order.attribution?.landingPage || "",
      })),
    });
  } catch (e) {
    console.error("analytics source report error:", e);
    res.status(500).json({ success: false, message: "Failed to load source report" });
  }
});

// @route GET /api/admin/analytics/site?days=7&tz=-330
// Storefront traffic: visitors, page views, clicks, logins, campaign links, etc.
router.get("/site", protect, async (req, res) => {
  const role = req.user?.role;
  if (role !== "admin" && role !== "marketing") {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 7;
  // tz = Date#getTimezoneOffset() of the viewer, so days/hours match their local time
  const tz = Math.max(-840, Math.min(840, Number(req.query.tz) || 0));
  const DAY = 24 * 60 * 60 * 1000;
  const toLocal = (d) => new Date(new Date(d).getTime() - tz * 60000);

  const now = new Date();
  const localToday = toLocal(now);
  localToday.setUTCHours(0, 0, 0, 0);
  const from = new Date(localToday.getTime() - (days - 1) * DAY + tz * 60000);
  const prevFrom = new Date(from.getTime() - days * DAY);
  const localDayKey = (d) => toLocal(d).toISOString().slice(0, 10);
  const dayKeys = Array.from({ length: days }, (_, i) =>
    new Date(localToday.getTime() - (days - 1 - i) * DAY).toISOString().slice(0, 10)
  );

  try {
    const SiteEvent = require("../models/SiteEvent");
    const User = require("../models/User");
    const Subscriber = require("../models/Subscriber");

    const [events, prevEvents, signups, prevSignups, checkouts, prevCheckouts, subs, online] =
      await Promise.all([
        SiteEvent.find({ createdAt: { $gte: from }, type: { $ne: "ping" } })
          .select("type visitorId sessionId user path label referrerHost campaign device isNewVisitor createdAt")
          .lean(),
        SiteEvent.find({ createdAt: { $gte: prevFrom, $lt: from }, type: { $ne: "ping" } })
          .select("type visitorId path")
          .lean(),
        User.find({ createdAt: { $gte: from } }).select("createdAt").lean(),
        User.countDocuments({ createdAt: { $gte: prevFrom, $lt: from } }),
        Checkout.find({ createdAt: { $gte: from } }).select("createdAt isPaid").lean(),
        Checkout.countDocuments({ createdAt: { $gte: prevFrom, $lt: from } }),
        Subscriber.find({ subscribedAt: { $gte: from } }).select("subscribedAt").lean(),
        SiteEvent.distinct("visitorId", { createdAt: { $gte: new Date(Date.now() - 5 * 60000) } }),
      ]);

    const isProduct = (p) => /^\/product\//i.test(p || "");

    const summarize = (list) => {
      const visitors = new Set();
      const s = { pageViews: 0, linkVisits: 0, clicks: 0, logins: 0, productViews: 0 };
      for (const e of list) {
        if (e.type === "pageview") {
          visitors.add(e.visitorId);
          s.pageViews += 1;
          if (isProduct(e.path)) s.productViews += 1;
        } else if (e.type === "campaign") s.linkVisits += 1;
        else if (e.type === "click") s.clicks += 1;
        else if (e.type === "login") s.logins += 1;
      }
      return { uniqueVisitors: visitors.size, ...s };
    };

    const cur = {
      ...summarize(events),
      signups: signups.length,
      checkoutAttempts: checkouts.length,
    };
    const prev = {
      ...summarize(prevEvents),
      signups: prevSignups,
      checkoutAttempts: prevCheckouts,
    };

    // Daily series
    const blank = () => ({
      uniqueVisitors: new Set(), pageViews: 0, linkVisits: 0, clicks: 0,
      logins: 0, signups: 0, productViews: 0, checkoutAttempts: 0, newsletter: 0,
    });
    const byDay = Object.fromEntries(dayKeys.map((k) => [k, blank()]));
    for (const e of events) {
      const b = byDay[localDayKey(e.createdAt)];
      if (!b) continue;
      if (e.type === "pageview") {
        b.uniqueVisitors.add(e.visitorId);
        b.pageViews += 1;
        if (isProduct(e.path)) b.productViews += 1;
      } else if (e.type === "campaign") b.linkVisits += 1;
      else if (e.type === "click") b.clicks += 1;
      else if (e.type === "login") b.logins += 1;
    }
    for (const u of signups) byDay[localDayKey(u.createdAt)] && (byDay[localDayKey(u.createdAt)].signups += 1);
    for (const c of checkouts) byDay[localDayKey(c.createdAt)] && (byDay[localDayKey(c.createdAt)].checkoutAttempts += 1);
    for (const s of subs) byDay[localDayKey(s.subscribedAt)] && (byDay[localDayKey(s.subscribedAt)].newsletter += 1);
    const series = dayKeys.map((date) => ({
      date,
      ...byDay[date],
      uniqueVisitors: byDay[date].uniqueVisitors.size,
    }));

    // Funnel + audience
    const pageviews = events.filter((e) => e.type === "pageview");
    const productVisitors = new Set(pageviews.filter((e) => isProduct(e.path)).map((e) => e.visitorId));
    const authVisitors = new Set(
      events.filter((e) => e.type === "login" || e.user).map((e) => e.visitorId)
    );
    const deviceByVisitor = new Map();
    const newVisitors = new Set();
    const sessions = new Set();
    const signedIn = new Set();
    for (const e of events) {
      deviceByVisitor.set(e.visitorId, e.device);
      if (e.isNewVisitor) newVisitors.add(e.visitorId);
      if (e.sessionId) sessions.add(e.sessionId);
      if (e.user) signedIn.add(String(e.user));
    }
    const deviceCounts = { desktop: 0, mobile: 0, tablet: 0 };
    for (const d of deviceByVisitor.values()) deviceCounts[d] = (deviceCounts[d] || 0) + 1;
    const totalVisitors = deviceByVisitor.size;

    const topN = (map, n = 8) =>
      [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([label, count]) => ({ label, count }));
    const countBy = (list, keyFn) => {
      const m = new Map();
      for (const e of list) {
        const k = keyFn(e);
        if (k) m.set(k, (m.get(k) || 0) + 1);
      }
      return m;
    };

    // Traffic source = referrer of the first page view in each session
    const seenSessions = new Set();
    const sessionStarts = [];
    for (const e of [...pageviews].sort((a, b) => a.createdAt - b.createdAt)) {
      const key = e.sessionId || e.visitorId;
      if (seenSessions.has(key)) continue;
      seenSessions.add(key);
      sessionStarts.push(e);
    }

    // Peak hours: [weekday Mon=0..Sun=6][hour]
    const heat = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const e of pageviews) {
      const d = toLocal(e.createdAt);
      heat[(d.getUTCDay() + 6) % 7][d.getUTCHours()] += 1;
    }

    const paidCheckouts = checkouts.filter((c) => c.isPaid).length;
    const [ordersPlaced, delivered] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: from }, isPaid: true }),
      Order.countDocuments({ createdAt: { $gte: from }, status: "Delivered" }),
    ]);

    res.json({
      success: true,
      days,
      onlineNow: online.length,
      totals: cur,
      previous: prev,
      series,
      funnel: [
        { key: "visited", label: "Visited the site", count: cur.uniqueVisitors },
        { key: "product", label: "Viewed a product", count: productVisitors.size },
        { key: "auth", label: "Logged in or signed up", count: Math.max(authVisitors.size, 0) },
        { key: "checkout", label: "Started a checkout", count: cur.checkoutAttempts },
      ],
      audience: {
        visitors: totalVisitors,
        devices: deviceCounts,
        newVisitors: newVisitors.size,
        returning: Math.max(totalVisitors - newVisitors.size, 0),
        signedIn: signedIn.size,
        sessions: sessions.size,
      },
      topPages: topN(countBy(pageviews, (e) => (e.path === "/" ? "Home" : e.path))),
      sources: topN(countBy(sessionStarts, (e) => e.referrerHost || "Direct")),
      campaigns: topN(countBy(events.filter((e) => e.type === "campaign"), (e) => e.campaign)),
      topClicks: topN(countBy(events.filter((e) => e.type === "click"), (e) => e.label)),
      heatmap: heat,
      newsletter: { total: subs.length },
      orderFunnel: [
        { label: "Checkouts started", count: checkouts.length },
        { label: "Payment completed", count: paidCheckouts },
        { label: "Orders placed", count: ordersPlaced },
        { label: "Delivered", count: delivered },
      ],
    });
  } catch (e) {
    console.error("analytics site error:", e);
    res.status(500).json({ success: false, message: "Failed to load site analytics" });
  }
});

module.exports = router;
