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

module.exports = router;
