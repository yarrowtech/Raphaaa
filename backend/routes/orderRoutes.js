// const express = require("express");
// const Order = require("../models/Order");
// const { protect } = require("../middleware/authMiddleware");

// const router = express.Router();

// // @route GET /api/orders/my-orders
// // @desc Get logged-in user's orders
// // @access Private
// router.get("/my-orders", protect, async (req, res) => {
//     try {
//         // Find orders for the authenticate user
//         const orders = await Order.find({ user: req.user._id }).sort({
//             createdAt: -1,
//         }); // sort by most recent orders
//         res.json(orders);
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: "Internal server error" });
//     }
// });

// // @route GET /api/orders/:id
// // @desc Get order details by ID
// // @access Private
// router.get("/:id", protect, async (req, res) => {
//     try {
//         const order = await Order.findById(req.params.id).populate(
//             "user",
//             "name email"
//         );

//         if(!order) {
//             return res.status(404).json({ message: "Order not found" });
//         }

//         // Return the full order details
//         res.json(order);
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: "Internal server error" });
//     }
// });

// module.exports = router;

// routes/orders.js - Add this route to your existing orders routes

const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Payment = require("../models/payment");
const { protect, adminOrMerchantise } = require("../middleware/authMiddleware");
const {
  getWeeklyRevenue,
  getMonthlyRevenue,
  getYearlyRevenue,
  getTodayRevenue,
  getRevenueByPeriod,
} = require("../controller/revenueController");
const { sendMail } = require("../utils/sendMail");
const sendWhatsApp = require("../utils/sendWhatsApp");
const { sendPushToUser } = require("../utils/push");
const Collab = require("../models/Collab");
const { buildInvoicePDF } = require("../utils/invoice");
const { buildAttribution } = require("../utils/attribution");
const { registerCampaignConversion } = require("../utils/campaignTracking");
const { getJson, setJson, deleteJson } = require("../utils/redisCache");
const { priceQuote } = require("../services/pricingService");
const { getAvailableCredits, redeem } = require("../services/walletService");
const { creditReferrerOnFirstOrder } = require("./referralRoutes");
const { fulfillPrebookingsForOrder } = require("../utils/prebooking");

const USER_CANCELLABLE_STATUSES = new Set(["Processing", "Packed", "Transfer"]);
const USER_CANCEL_WINDOW_HOURS = Number(process.env.USER_CANCEL_WINDOW_HOURS || 24);

const applyStockDeduction = (product, item) => {
  const qty = Number(item?.quantity || 0);
  if (!product || qty <= 0) return { ok: true };

  const itemSku   = String(item?.sku   || "").trim().toLowerCase();
  const itemColor = String(item?.color || "").trim().toLowerCase();
  const itemSize  = String(item?.size  || "").trim().toLowerCase();

  // --- Try new colorVariants structure first ---
  if (Array.isArray(product.colorVariants) && product.colorVariants.length > 0) {
    let matchedSize = null;

    // Match by SKU across all color variants
    if (itemSku) {
      for (const cv of product.colorVariants) {
        const found = (cv.sizes || []).find(
          (s) => String(s?.sku || "").trim().toLowerCase() === itemSku
        );
        if (found) { matchedSize = found; break; }
      }
    }
    // Fallback: match by color + size
    if (!matchedSize && itemColor && itemSize) {
      const cv = product.colorVariants.find(
        (c) =>
          String(c?.color || "").toLowerCase() === itemColor ||
          String(c?.colorName || "").toLowerCase() === itemColor
      );
      if (cv) {
        matchedSize = (cv.sizes || []).find(
          (s) => String(s?.size || "").toLowerCase() === itemSize
        );
      }
    }

    if (matchedSize) {
      const available = Number(matchedSize.countInStock || 0);
      if (available < qty) {
        return { ok: false, message: `Insufficient stock for ${product.name} (${matchedSize.sku})` };
      }
      matchedSize.countInStock = available - qty;
      product.countInStock = product.colorVariants.reduce(
        (sum, cv) => sum + (cv.sizes || []).reduce((s2, sz) => s2 + Number(sz?.countInStock || 0), 0),
        0
      );
      return { ok: true };
    }

    return {
      ok: false,
      message: `Variant not found for ${product.name}. Please re-add this item to cart and try again.`,
    };
  }

  // --- Legacy flat variants ---
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    let matched = null;
    if (itemSku) {
      matched = product.variants.find(
        (v) => String(v?.sku || "").trim().toLowerCase() === itemSku
      );
    }
    if (!matched && itemColor && itemSize) {
      matched = product.variants.find(
        (v) =>
          String(v?.color || "").trim().toLowerCase() === itemColor &&
          String(v?.size  || "").trim().toLowerCase() === itemSize
      );
    }

    if (matched) {
      const available = Number(matched.countInStock || 0);
      if (available < qty) {
        return { ok: false, message: `Insufficient stock for ${product.name} (${matched.sku || "variant"})` };
      }
      matched.countInStock = Math.max(0, available - qty);
      product.countInStock = product.variants.reduce(
        (sum, v) => sum + Number(v?.countInStock || 0), 0
      );
      return { ok: true };
    }

    return {
      ok: false,
      message: `Variant not found for ${product.name}. Please re-add this item to cart and try again.`,
    };
  }

  // --- Overall stock fallback ---
  const overall = Number(product.countInStock || 0);
  if (overall < qty) {
    return { ok: false, message: `Insufficient stock for ${product.name}` };
  }
  product.countInStock = Math.max(0, overall - qty);
  return { ok: true };
};

// @desc    Create Cash on Delivery Order
// @route   POST /api/orders/cod
// @access  Private
router.post("/cod", protect, async (req, res) => {
  try {
    const {
      orderItems,
      shippingAddress,
      couponCodes,
      walletRedeem,
      idempotencyKey,
      orderNote,
      trackingInfo,
    } = req.body;

    if (idempotencyKey) {
      const existingOrder = await Order.findOne({
        user: req.user._id,
        idempotencyKey,
      });
      if (existingOrder) {
        return res.status(200).json(existingOrder);
      }
    }

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ message: "No order items provided" });
    }

    const requiredFields = [
      "firstName",
      "lastName",
      "address",
      "city",
      "postalCode",
      "country",
      "phone",
    ];
    for (const field of requiredFields) {
      if (!shippingAddress[field]) {
        return res
          .status(400)
          .json({ message: `${field} is required in shipping address` });
      }
    }

    // 1) Build a map of productId -> default sku and variants (for missing item sku)
    const idsNeedingSku = [
      ...new Set(
        (orderItems || [])
          .filter((it) => !it.sku && it.productId)
          .map((it) => String(it.productId))
      ),
    ];
    let productById = {};
    if (idsNeedingSku.length) {
      const prods = await Product.find({ _id: { $in: idsNeedingSku } }).select(
        "_id sku variants"
      );
      productById = Object.fromEntries(
        prods.map((p) => [String(p._id), p])
      );
    }

    const resolveOrderItemSku = (item) => {
      if (item?.sku) return item.sku;
      const p = productById[String(item?.productId)];
      if (!p) return "-";
      const variant = (p.variants || []).find(
        (v) =>
          String(v?.color || "").trim().toLowerCase() ===
            String(item?.color || "").trim().toLowerCase() &&
          String(v?.size || "").trim().toLowerCase() ===
            String(item?.size || "").trim().toLowerCase()
      );
      return variant?.sku || p.sku || "-";
    };

    const order = new Order({
      user: req.user._id,
      attribution: buildAttribution(trackingInfo, {
        customerName: req.user?.name || "",
        customerEmail: req.user?.email || "",
        customerPhone: shippingAddress?.phone || "",
      }),
      orderItems: orderItems.map((item) => ({
        productId: item.productId,
        name: item.name,
        image: item.image,
        price: item.price,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        // sku: item.sku,
        sku: resolveOrderItemSku(item),
      })),
      shippingAddress: {
        address: String(shippingAddress.address || "").trim(),
        city: shippingAddress.city,
        postalCode: shippingAddress.postalCode,
        country: shippingAddress.country,
        phone: shippingAddress.phone,
      },
      paymentMethod: "cash_on_delivery",
      totalPrice: 0,
      isPaid: false,
      paymentStatus: "pending",
      status: "Processing",
      idempotencyKey: idempotencyKey || undefined,
      orderNote: orderNote?.trim() || "",
    });

    // Server-side pricing (promos + wallet)
    const quote = await priceQuote({
      items: orderItems,
      userId: req.user._id,
      paymentMethod: "cash_on_delivery",
      couponCodes,
      shippingAddress,
    });
    const walletBalance = await getAvailableCredits(req.user._id);
    const requested = Math.max(0, Number(walletRedeem || 0));
    const walletApplied = Math.min(walletBalance, requested, quote.total);
    order.totalPrice = Math.max(0, Number(quote.total) - walletApplied);
    order.walletApplied = walletApplied;
    order.couponSnapshot = {
      codes: Array.isArray(couponCodes) ? couponCodes : [],
      appliedOffers: Array.isArray(quote?.appliedOffers)
        ? quote.appliedOffers.map((o) => o.title).filter(Boolean)
        : [],
      personalCouponApplied: Boolean(quote?.personalCouponApplied),
      personalCouponCode: String(quote?.personalCouponCode || ""),
      totalDiscount: Number(quote?.totalDiscount || 0),
    };

    const createdOrder = await order.save();
    if (createdOrder?.attribution?.campaignClickId) {
      await registerCampaignConversion({
        campaignClickId: createdOrder.attribution.campaignClickId,
        orderId: createdOrder._id,
      });
    }
    await Promise.all([
      deleteJson("users", `user:${req.user._id}:my-coupon`),
      deleteJson("users", `user:${req.user._id}:my-coupons`),
    ]);

    await fulfillPrebookingsForOrder({
      userId: req.user._id,
      orderItems: createdOrder.orderItems,
      orderId: createdOrder._id,
    });

    if (walletApplied > 0) {
      await redeem({
        userId: req.user._id,
        amount: walletApplied,
        refType: "order_cod",
        refId: String(createdOrder._id),
        note: `Redeemed for COD order ${createdOrder.orderId}`,
      });
    }

    // Referrer reward on first purchase
    await creditReferrerOnFirstOrder(req.user._id, createdOrder.totalPrice);

    // 🔹 Check if there's an active collab and if any product matches
    let gifHtml = "";
    const activeCollab = await Collab.findOne({ isPublished: true }).populate(
      "collaborators.products"
    );

    if (activeCollab) {
      let productMatch = false;
      for (const item of orderItems) {
        for (const collaborator of activeCollab.collaborators) {
          if (
            collaborator.products.some(
              (prod) => prod._id.toString() === item.productId.toString()
            )
          ) {
            productMatch = true;
            break;
          }
        }
        if (productMatch) break;
      }

      if (productMatch) {
        gifHtml = `<p><img src="https://i.gifer.com/Au8u.gif" alt="Footballer GIF" style="max-width:100%;"/></p>`;
      }
    }

    // Send confirmation email
    try {
      const userEmail = req.user.email;
      const orderDate = new Date(order.createdAt).toLocaleDateString("en-GB");
      // Build the PDF buffer — pass the quote so shipping/discounts show correctly
      const invoiceBuffer = await buildInvoicePDF(
        {
          ...createdOrder.toObject(),
          user: { name: req.user.name, email: req.user.email },
        },
        {
          shipping:         Number(quote.shipping         || 0),
          shippingDiscount: Number(quote.shippingDiscount || 0),
          totalDiscount:    Number(quote.totalDiscount    || 0),
          walletApplied:    walletApplied,
          appliedOffers:    (quote.appliedOffers || []).map((o) => o.title || o).filter(Boolean),
        }
      );

      const message = orderItems
        .map((item) => {
          return `
      <p><strong>Product:</strong> ${item.name}</p>
      <p><strong>Color:</strong> ${item.color}</p>
      <p><strong>Size:</strong> ${item.size}</p>
      <p><strong>Quantity:</strong> ${item.quantity}</p>
      <hr/>
    `;
        })
        .join("");

      await sendMail({
        to: userEmail,
        subject: "🛍️ Your Order Has Been Placed Successfully!",
        message: `
      <p>Hi ${req.user.name},</p>
      <p>Thank you for shopping with us. Your Cash on Delivery order has been placed successfully on <strong>${orderDate}</strong>.</p>
      ${message}
      ${gifHtml}
      <p>We'll notify you once your order is on the way!</p>
      <p>Love,<br/>Team Raphaaa</p>
    `,
        attachments: [
          {
            filename: `Invoice_${createdOrder._id}.pdf`,
            content: invoiceBuffer,
          },
        ],
      });

      await sendPushToUser(
        { userId: req.user._id, email: userEmail },
        {
          title: "Order placed",
          body: `Your order ${createdOrder.orderId} has been placed successfully.`,
          url: `/order/${createdOrder._id}`,
          data: { url: `/order/${createdOrder._id}`, orderId: createdOrder._id.toString() },
        }
      );
    } catch (emailError) {
      console.error(
        "Failed to send order confirmation email:",
        emailError.message
      );
    }

    // WhatsApp order confirmation
    try {
      const phone = createdOrder.shippingAddress?.phone;
      if (phone) {
        const waMsg =
          `✅ *Order Confirmed — Raphaaa*\n\n` +
          `Hi ${req.user.name?.split(" ")[0] || "there"}! Your order has been placed.\n\n` +
          `🆔 Order ID: *${createdOrder.orderId}*\n` +
          `💰 Total: *₹${createdOrder.totalPrice.toLocaleString("en-IN")}*\n` +
          `📦 Payment: Cash on Delivery\n\n` +
          `We'll notify you when your order ships. Thank you for shopping with Raphaaa! 🛍️`;
        await sendWhatsApp(`+91${String(phone).replace(/^\+91/, "")}`, waMsg);
      }
    } catch (_) {}

    // 🔻 Decrease stock for each ordered product
    for (const item of orderItems) {
      const product = await Product.findById(item.productId);
      if (product) {
        const deduction = applyStockDeduction(product, item);
        if (!deduction.ok) {
          return res.status(400).json({ message: deduction.message });
        }
        await product.save();
      }
    }

    // Clear cart after placing the order
    await Cart.findOneAndUpdate(
      { user: req.user._id },
      {
        products: [],
        totalPrice: 0,
      }
    );

    res.status(201).json(createdOrder);
  } catch (error) {
    console.error("COD Order creation error:", error);
    res.status(500).json({
      message: "Failed to create Cash on Delivery order",
      error: error.message,
    });
  }
});

// @desc    Update order status (Admin only)
// @route   PUT /api/orders/:id/status
// @access  Private (Admin)
router.put("/:id/status", protect, async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (status) {
      order.status = status;

      if (status === "Delivered") {
        order.isDelivered = true;
        order.deliveredAt = Date.now();

        if (order.paymentMethod === "cash_on_delivery") {
          order.isPaid = true;
          order.paidAt = Date.now();
          order.paymentStatus = "paid";
        }
      }
    }

    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
      if (paymentStatus === "paid") {
        order.isPaid = true;
        order.paidAt = Date.now();
      }
    }

    const updatedOrder = await order.save();
    if (status) {
      const pushText = {
        Processing: "Your order is being processed.",
        Packed: "Your order has been packed.",
        Shipped: "Your order has been shipped.",
        Transfer: "Your order has been transferred to the shipping partner.",
        Delivered: "Your order has been delivered.",
        Cancelled: "Your order has been cancelled.",
      }[status] || `Your order status changed to ${status}.`;

      await sendPushToUser(
        { userId: order.user },
        {
          title: `Order ${status}`,
          body: pushText,
          url: `/order/${updatedOrder._id}`,
          data: { url: `/order/${updatedOrder._id}`, orderId: updatedOrder._id.toString(), status },
        }
      );
    }
    res.json(updatedOrder);
  } catch (error) {
    console.error("Order status update error:", error);
    res.status(500).json({
      message: "Failed to update order status",
      error: error.message,
    });
  }
});

// @desc    Get user's orders
// @route   GET /api/orders/my-orders
// @access  Private
router.get("/my-orders", protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate("orderItems.productId", "name image")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error("Fetch orders error:", error);
    res.status(500).json({
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
});

// @desc    Get all orders (admin/marketing)
// @route   GET /api/orders
// @access  Private (admin or marketing)
router.get("/", protect, async (req, res) => {
  try {
    const role = req.user?.role;
    if (role !== "admin" && role !== "marketing") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const orders = await Order.find({})
      .populate("user", "name email") // <-- ensures o.user.email exists
      .populate("orderItems.productId", "name image")
      .sort({ createdAt: -1 })
      .lean();

    res.json(orders);
  } catch (error) {
    console.error("Fetch all orders error:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch orders", error: error.message });
  }
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
router.get("/:id", protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email")
      .populate("orderItems.productId", "name image sku");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (
      order.user._id.toString() !== req.user._id.toString() &&
      !req.user.isAdmin
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this order" });
    }

    const responseOrder = order.toObject();
    const createdAtMs = new Date(order.createdAt).getTime();
    const withinCancelWindow =
      Date.now() - createdAtMs <= USER_CANCEL_WINDOW_HOURS * 60 * 60 * 1000;
    const canCancelByUser =
      !order.cancellation?.isCancelledByUser &&
      USER_CANCELLABLE_STATUSES.has(order.status) &&
      withinCancelWindow;
    responseOrder.cancellationEligibility = {
      canCancel: canCancelByUser,
      windowHours: USER_CANCEL_WINDOW_HOURS,
      reason: canCancelByUser
        ? ""
        : "Cancellation window closed or order already shipped/cancelled",
    };

    if (!responseOrder.paymentResult?.id) {
      const payment = await Payment.findOne({ orderId: order._id }).lean();
      if (payment?.razorpayPaymentId) {
        responseOrder.paymentResult = {
          id: payment.razorpayPaymentId,
          status: payment.status,
          update_time: payment.capturedAt || payment.updatedAt,
          email_address: responseOrder.user?.email,
        };
      }
    }

    res.json(responseOrder);
  } catch (error) {
    console.error("Fetch order details error:", error);
    res.status(500).json({
      message: "Failed to fetch order details",
      error: error.message,
    });
  }
});

// @desc    Download invoice PDF
// @route   GET /api/orders/:id/invoice
// @access  Private
router.get("/:id/invoice", protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email")
      .populate("orderItems.productId", "name image sku");
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const isOwner = order.user?._id?.toString() === req.user._id.toString();
    const isAdmin = req.user?.isAdmin || req.user?.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to view this invoice" });
    }

    let orderForInvoice = order.toObject();
    if (!orderForInvoice.paymentResult?.id) {
      const payment = await Payment.findOne({ orderId: order._id }).lean();
      if (payment?.razorpayPaymentId) {
        orderForInvoice.paymentResult = {
          id: payment.razorpayPaymentId,
          status: payment.status,
          update_time: payment.capturedAt || payment.updatedAt,
          email_address: orderForInvoice.user?.email,
        };
      }
    }

    const pdfBuffer = await buildInvoicePDF(orderForInvoice);
    const invoiceRef = order.orderId || order._id.toString();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Invoice_${invoiceRef}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Invoice download error:", error);
    res.status(500).json({
      message: "Failed to generate invoice",
      error: error.message,
    });
  }
});

// Example API Endpoint in Express (orderRoutes.js)
router.get("/revenue/total", protect, adminOrMerchantise, async (req, res) => {
  try {
    const cacheKey = `role:${req.user.role}:uid:${req.user._id}:revenue_total`;
    const cached = await getJson("dashboard", cacheKey);
    if (cached) return res.json(cached);

    const orders = await Order.find({ isPaid: true }).lean();
    let totalRevenue = 0;

    if (req.user?.role === "merchantise") {
      const allProductIds = [
        ...new Set(
          orders
            .flatMap((o) => o.orderItems || [])
            .map((it) => (it.productId ? String(it.productId) : null))
            .filter(Boolean)
        ),
      ];
      const ownedProducts = await Product.find({
        _id: { $in: allProductIds },
        user: req.user._id,
      })
        .select("_id")
        .lean();
      const ownedSet = new Set(ownedProducts.map((p) => String(p._id)));

      totalRevenue = orders.reduce((sum, order) => {
        const ownItems = (order.orderItems || []).filter(
          (it) => it.productId && ownedSet.has(String(it.productId))
        );
        const orderOwnRevenue = ownItems.reduce(
          (s, it) => s + (Number(it.quantity) || 0) * (Number(it.price) || 0),
          0
        );
        return sum + orderOwnRevenue;
      }, 0);
    } else {
      totalRevenue = orders.reduce(
        (acc, order) => acc + (Number(order.totalPrice) || 0),
        0
      );
    }
    const payload = { totalRevenue };
    await setJson("dashboard", cacheKey, payload, 45);
    res.json(payload);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

// @desc Customer cancellation request
// @route POST /api/orders/:id/cancel
// @access Private
router.post("/:id/cancel", protect, async (req, res) => {
  try {
    const { reason = "" } = req.body || {};
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (String(order.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const createdAtMs = new Date(order.createdAt).getTime();
    const withinCancelWindow =
      Date.now() - createdAtMs <= USER_CANCEL_WINDOW_HOURS * 60 * 60 * 1000;
    const canCancel =
      !order.cancellation?.isCancelledByUser &&
      USER_CANCELLABLE_STATUSES.has(order.status) &&
      withinCancelWindow;

    if (!canCancel) {
      return res.status(400).json({
        message: "Order cannot be cancelled at this stage",
      });
    }

    order.status = "Cancelled";
    order.cancellation = {
      isCancelledByUser: true,
      reason: String(reason || "").trim(),
      cancelledAt: new Date(),
    };
    if (!order.isPaid) {
      order.paymentStatus = "cancelled";
    } else {
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 7);
      order.refundTimeline = {
        status: "initiated",
        initiatedAt: new Date(),
        expectedDate,
        note: "Refund initiated due to customer cancellation",
      };
    }
    const updated = await order.save();

    res.json(updated);
  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(500).json({ message: "Failed to cancel order" });
  }
});

router.get("/revenue/weekly", protect, getWeeklyRevenue);
router.get("/revenue/monthly", protect, getMonthlyRevenue);
router.get("/revenue/yearly", protect, getYearlyRevenue);
router.get("/revenue/today", protect, getTodayRevenue);

// @desc    Get all orders (admin/marketing)
// @route   GET /api/orders
// @access  Private (admin or marketing)
router.get("/", protect, async (req, res) => {
  try {
    // gate: only admin or marketing
    const role = req.user?.role;
    if (role !== "admin" && role !== "marketing") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const orders = await Order.find({})
      .populate("user", "name email") // <-- ensure email is present
      .populate("orderItems.productId", "name image")
      .sort({ createdAt: -1 })
      .lean();

    res.json(orders);
  } catch (error) {
    console.error("Fetch all orders error:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch orders", error: error.message });
  }
});

// router.get(
//   "/revenue/:period",
//   protect,
//   adminOrMerchantise,
//   async (req, res) => {
//     try {
//       const { period } = req.params;

//       const now = new Date();
//       let startDate;

//       if (period === "weekly") {
//         startDate = new Date(now.setDate(now.getDate() - 7));
//       } else if (period === "monthly") {
//         startDate = new Date(now.setMonth(now.getMonth() - 1));
//       } else if (period === "yearly") {
//         startDate = new Date(now.setFullYear(now.getFullYear() - 1));
//       } else if (period === "daily") {
//         startDate = new Date();
//         startDate.setHours(0, 0, 0, 0);
//       } else {
//         return res.status(400).json({ message: "Invalid period" });
//       }

//       const orders = await Order.find({
//         isPaid: true,
//         paidAt: { $gte: startDate },
//       });

//       const totalRevenue = orders.reduce(
//         (acc, order) => acc + order.totalPrice,
//         0
//       );

//       res.json({ totalRevenue, totalOrders: orders.length });
//     } catch (err) {
//       console.error(err);
//       res.status(500).json({ message: "Error fetching revenue" });
//     }
//   }
// );

router.get("/revenue/:period", protect, adminOrMerchantise, getRevenueByPeriod);

// ✅ Verify if order exists for the logged-in user
router.get('/verify/:orderId', protect, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.orderId,
      user: req.user._id,
    });

    if (order) {
      res.json({ exists: true });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    res.json({ exists: false });
  }
});

module.exports = router;
