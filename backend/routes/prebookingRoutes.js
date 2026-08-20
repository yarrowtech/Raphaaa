const express = require("express");
const router = express.Router();
const Prebooking = require("../models/Prebooking");
const Product = require("../models/Product");
const { protect, adminOrMerchantise } = require("../middleware/authMiddleware");
const { sendMail } = require("../utils/sendMail");
const { applyPrebookingConfigUpdate } = require("../utils/prebooking");
const { deleteByPrefix } = require("../utils/redisCache");

// ─────────────────────────────────────────────────────────────────
// Customer routes
// ─────────────────────────────────────────────────────────────────

// GET /api/prebookings/mine/:productId — the current user's prebooking status for a product (or null)
router.get("/mine/:productId", protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId).select("prebooking");
    const currentRound = product?.prebooking?.round || 1;
    const booking = await Prebooking.findOne({
      product: req.params.productId,
      user: req.user._id,
      round: currentRound,
    });
    res.json(booking || null);
  } catch (err) {
    res.status(500).json({ message: "Failed to load prebooking status" });
  }
});

// GET /api/prebookings/my — all of the current user's prebookings
router.get("/my", protect, async (req, res) => {
  try {
    const bookings = await Prebooking.find({ user: req.user._id })
      .populate("product", "name images price prebooking")
      .populate("order", "orderId status")
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Failed to load your prebookings" });
  }
});

// POST /api/prebookings/:productId — reserve a prebooking slot
router.post("/:productId", protect, async (req, res) => {
  try {
    const { size, color } = req.body;
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const pb = product.prebooking || {};
    if (!pb.enabled) {
      return res.status(400).json({ message: "Prebooking is not available for this product" });
    }
    if (pb.status !== "open") {
      return res.status(400).json({ message: "Prebooking is no longer open for this product" });
    }
    if (Number(pb.limit) > 0 && Number(pb.bookedCount) >= Number(pb.limit)) {
      return res.status(400).json({ message: "All prebooking slots for this product are full" });
    }

    const hasColorVariants = Array.isArray(product.colorVariants) && product.colorVariants.length > 0;
    if (hasColorVariants) {
      if (!color || !size) {
        return res.status(400).json({ message: "Please select a size and color" });
      }
      const cv = product.colorVariants.find(
        (v) => String(v.color || "").toLowerCase() === String(color).toLowerCase()
      );
      if (!cv) {
        return res.status(400).json({ message: "Selected color is not available for this product" });
      }
      const sz = (cv.sizes || []).find(
        (s) => String(s.size || "").toLowerCase() === String(size).toLowerCase()
      );
      if (!sz) {
        return res.status(400).json({ message: "Selected size is not available for this color" });
      }
    }

    const currentRound = product.prebooking.round || 1;
    const existing = await Prebooking.findOne({ product: product._id, user: req.user._id, round: currentRound });
    if (existing && existing.status !== "cancelled") {
      return res.status(400).json({ message: "You already have a prebooking for this product" });
    }

    let booking;
    if (existing) {
      // Re-activate the previously cancelled slot in this same round rather than
      // inserting a new document — the unique (product, user, round) index would
      // reject a duplicate anyway.
      existing.status = "booked";
      existing.size = hasColorVariants ? size : "";
      existing.color = hasColorVariants ? color : "";
      existing.notifiedAt = null;
      existing.order = null;
      booking = await existing.save();
    } else {
      booking = await Prebooking.create({
        product: product._id,
        user: req.user._id,
        size: hasColorVariants ? size : "",
        color: hasColorVariants ? color : "",
        round: currentRound,
      });
    }
    product.prebooking.bookedCount = Number(product.prebooking.bookedCount || 0) + 1;
    await product.save();

    res.status(201).json(booking);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(400).json({ message: "You already have a prebooking for this product" });
    }
    console.error("create prebooking error:", err);
    res.status(500).json({ message: "Failed to create prebooking" });
  }
});

// DELETE /api/prebookings/:id — cancel your own prebooking (only while still "booked")
router.delete("/:id", protect, async (req, res) => {
  try {
    const booking = await Prebooking.findOne({ _id: req.params.id, user: req.user._id });
    if (!booking) return res.status(404).json({ message: "Prebooking not found" });
    if (booking.status !== "booked") {
      return res.status(400).json({ message: "Only pending prebookings can be cancelled" });
    }

    booking.status = "cancelled";
    await booking.save();

    // Only decrement the live counter if this booking belongs to the product's
    // CURRENT round — a leftover "booked" record from an old, already-closed round
    // must not touch the current round's slot count.
    const product = await Product.findById(booking.product).select("prebooking");
    if (product && (product.prebooking?.round || 1) === booking.round) {
      await Product.findByIdAndUpdate(booking.product, {
        $inc: { "prebooking.bookedCount": -1 },
      });
    }

    res.json({ message: "Prebooking cancelled" });
  } catch (err) {
    res.status(500).json({ message: "Failed to cancel prebooking" });
  }
});

// ─────────────────────────────────────────────────────────────────
// Admin / Merchandise routes
// ─────────────────────────────────────────────────────────────────

// GET /api/prebookings/admin/products — all prebooking-enabled products with counts
router.get("/admin/products", protect, adminOrMerchantise, async (req, res) => {
  try {
    const products = await Product.find({ "prebooking.enabled": true })
      .select("name images price prebooking")
      .sort({ updatedAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Failed to load prebooking products" });
  }
});

// GET /api/prebookings/admin/products/:productId/bookings — who booked a given product
router.get("/admin/products/:productId/bookings", protect, adminOrMerchantise, async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId).select("prebooking");
    const currentRound = product?.prebooking?.round || 1;
    const bookings = await Prebooking.find({ product: req.params.productId, round: currentRound })
      .populate("user", "name email phone")
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Failed to load bookers" });
  }
});

// GET /api/prebookings/admin/products/:productId/history — every past round, grouped, with a timeline
router.get("/admin/products/:productId/history", protect, adminOrMerchantise, async (req, res) => {
  try {
    const bookings = await Prebooking.find({ product: req.params.productId })
      .populate("user", "name email phone")
      .sort({ round: -1, createdAt: 1 });

    const roundsByNumber = new Map();
    for (const b of bookings) {
      const roundNumber = b.round || 1;
      if (!roundsByNumber.has(roundNumber)) {
        roundsByNumber.set(roundNumber, {
          round: roundNumber,
          firstBookedAt: null,
          readyAt: null,
          bookers: [],
        });
      }
      const entry = roundsByNumber.get(roundNumber);
      if (!entry.firstBookedAt || b.createdAt < entry.firstBookedAt) entry.firstBookedAt = b.createdAt;
      if (b.notifiedAt && (!entry.readyAt || b.notifiedAt < entry.readyAt)) entry.readyAt = b.notifiedAt;
      entry.bookers.push({
        _id: b._id,
        user: b.user,
        status: b.status,
        size: b.size,
        color: b.color,
        bookedAt: b.createdAt,
        notifiedAt: b.notifiedAt,
        order: b.order,
      });
    }

    const history = [...roundsByNumber.values()].sort((a, b) => b.round - a.round);
    res.json(history);
  } catch (err) {
    console.error("prebooking history error:", err);
    res.status(500).json({ message: "Failed to load prebooking history" });
  }
});

// PUT /api/prebookings/admin/config/:productId — enable/disable prebooking + set the slot limit
router.put("/admin/config/:productId", protect, adminOrMerchantise, async (req, res) => {
  try {
    const { enabled, limit } = req.body;
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    applyPrebookingConfigUpdate(product, { enabled, limit });

    await product.save();
    res.json({ success: true, product });
    deleteByPrefix("products").catch(() => {});
  } catch (err) {
    console.error("prebooking config error:", err);
    res.status(500).json({ message: "Failed to update prebooking settings" });
  }
});

// POST /api/prebookings/admin/mark-ready/:productId — product is in stock now; notify everyone who prebooked it
router.post("/admin/mark-ready/:productId", protect, adminOrMerchantise, async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ message: "Product not found" });
    if (!product.prebooking?.enabled) {
      return res.status(400).json({ message: "Prebooking is not enabled for this product" });
    }

    product.prebooking.status = "ready";
    product.prebooking.readyAt = new Date();
    await product.save();
    deleteByPrefix("products").catch(() => {});

    const bookings = await Prebooking.find({
      product: product._id,
      status: "booked",
      round: product.prebooking.round || 1,
    }).populate("user", "name email");

    let notified = 0;
    for (const booking of bookings) {
      booking.status = "ready";
      booking.notifiedAt = new Date();
      await booking.save();

      if (booking.user?.email) {
        try {
          await sendMail({
            to: booking.user.email,
            subject: `🎉 Your prebooked item "${product.name}" is ready!`,
            message: `
              <p>Hi ${booking.user.name || "there"},</p>
              <p>Good news — the product you prebooked, <strong>${product.name}</strong>, is now ready and in stock!</p>
              <p>Please proceed to checkout to complete your purchase before the item sells out.</p>
              <p>Love,<br/>Team Raphaaa</p>
            `,
          });
          notified += 1;
        } catch (mailErr) {
          console.error("prebooking ready email failed:", mailErr.message);
        }
      }
    }

    res.json({ success: true, notified, total: bookings.length });
  } catch (err) {
    console.error("mark-ready prebooking error:", err);
    res.status(500).json({ message: "Failed to mark product ready" });
  }
});

module.exports = router;
