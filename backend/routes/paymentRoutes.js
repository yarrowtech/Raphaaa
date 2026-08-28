// const express = require("express");
// const router = express.Router();
// const crypto = require("crypto");
// const razorpayInstance = require("../config/razorpay");
// const Payment = require("../models/payment");
// const Order = require("../models/Order");
// const Cart = require("../models/Cart");
// const Product = require("../models/Product");
// const { protect } = require("../middleware/authMiddleware");

// // ===================================
// // 🔹 1. Create Razorpay Order
// // ===================================
// router.post("/create-order", protect, async (req, res) => {
//   console.log("online payment initiated")
//   try {
//     const {
//       amount,
//       currency = "INR",
//       receipt,
//       orderItems,
//       shippingAddress,
//     } = req.body;

//     // Create order in DB first
//     // const order = new Order({
//     //   user: req.user._id,
//     //   orderItems: orderItems,
//     //   shippingAddress: shippingAddress,
//     //   paymentMethod: "Razorpay",
//     //   totalPrice: amount / 100,
//     //   isPaid: false,
//     //   isDelivered: false,
//     // });

//     const order = new Order({
//       user: req.user._id,
//       orderItems: orderItems.map((item) => ({
//         productId: item.productId,
//         name: item.name,
//         image: item.image,
//         price: item.price,
//         quantity: item.quantity,
//         size: item.size,
//         color: item.color,
//         sku: item.sku,
//       })),
//       shippingAddress: {
//         address: `${shippingAddress.firstName} ${shippingAddress.lastName}, ${shippingAddress.address}`,
//         city: shippingAddress.city,
//         postalCode: shippingAddress.postalCode,
//         country: shippingAddress.country,
//         phone: shippingAddress.phone,
//       },
//       paymentMethod: "Razor Pay",
//       totalPrice,
//       isPaid: false,
//       paymentStatus: "pending",
//       status: "Processing",
//     });

//     const createdOrder = await order.save();
//     console.log(orderItems)
//     for (const item of orderItems) {
//         console.log("item is: ", item)
//         const product = await Product.findById(item.productId);
//         console.log("product is: ", product)
//         if (product) {
//           product.countInStock -= item.quantity;
//           if (product.countInStock < 0) product.countInStock = 0;
//           await product.save();
//         }
//       }

//     // ❌ REMOVED: Don't decrease stock here - only decrease after successful payment
//     // Stock will be decreased in verify-payment route

//     // Create Razorpay order
//     const options = {
//       amount,
//       currency,
//       receipt: receipt || `order_${createdOrder._id}`,
//       notes: {
//         order_id: createdOrder._id.toString(),
//         user_id: req.user._id.toString(),
//       },
//     };

//     const razorpayOrder = await razorpayInstance.orders.create(options);

//     // Save payment info
//     await new Payment({
//       orderId: createdOrder._id,
//       userId: req.user._id,
//       razorpayOrderId: razorpayOrder.id,
//       amount,
//       currency,
//       status: "created",
//     }).save();

//     res.status(201).json({
//       success: true,
//       orderId: createdOrder._id,
//       razorpayOrderId: razorpayOrder.id,
//       amount: razorpayOrder.amount,
//       currency: razorpayOrder.currency,
//       key: process.env.RAZORPAY_KEY_ID,
//     });
//   } catch (error) {
//     console.error("💥 Error creating Razorpay order:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error creating order",
//       error: error.message,
//     });
//   }
// });

// // ===================================
// // 🔹 2. Verify Payment After Checkout
// // ===================================
// router.post("/verify-payment", protect, async (req, res) => {
//   try {
//     const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

//     // Validate Razorpay signature
//     const sign = razorpay_order_id + "|" + razorpay_payment_id;
//     const expectedSignature = crypto
//       .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//       .update(sign)
//       .digest("hex");

//     if (razorpay_signature !== expectedSignature) {
//       return res.status(400).json({ success: false, message: "Invalid Razorpay signature" });
//     }

//     const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
//     if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });

//     const order = await Order.findById(payment.orderId).populate({
//       path: "orderItems.productId", // ✅ proper nested populate
//       model: "Product",
//     });

//     if (!order) return res.status(404).json({ success: false, message: "Order not found" });

//     // Update payment & order
//     payment.razorpayPaymentId = razorpay_payment_id;
//     payment.razorpaySignature = razorpay_signature;
//     payment.status = "captured";
//     await payment.save();

//     order.isPaid = true;
//     order.paidAt = new Date();
//     order.paymentStatus = "paid";
//     order.paymentResult = {
//       id: razorpay_payment_id,
//       status: "captured",
//       update_time: new Date(),
//       email_address: req.user.email,
//     };
//     await order.save();

//     // ✅ Now stock will update correctly
//     for (const item of order.orderItems) {
//       const product = item.productId;
//       if (product) {
//         product.countInStock -= item.quantity;
//         if (product.countInStock < 0) product.countInStock = 0;
//         await product.save();
//         console.log(`✅ Updated stock for: ${product.name}`);
//       } else {
//         console.log(`❌ Product not found for item:`, item);
//       }
//     }

//     // ✅ Clear cart
//     await Cart.findOneAndUpdate({ user: req.user._id }, { products: [], totalPrice: 0 });

//     res.json({
//       success: true,
//       message: "Payment verified and stock updated",
//       orderId: order._id,
//       paymentId: razorpay_payment_id,
//     });
//   } catch (err) {
//     console.error("💥 Error verifying payment:", err);
//     res.status(500).json({ success: false, message: "Server error", error: err.message });
//   }
// });





// // ===================================
// // 🔹 3. Handle Manual Payment Failure
// // ===================================
// router.post("/payment-failed", protect, async (req, res) => {
//   try {
//     const { razorpay_order_id, error } = req.body;

//     const payment = await Payment.findOne({
//       razorpayOrderId: razorpay_order_id,
//     });
//     if (payment) {
//       payment.status = "failed";
//       payment.failureReason = error?.description || "Payment failed";
//       await payment.save();
//     }

//     res.json({ success: true, message: "Payment failure recorded" });
//   } catch (error) {
//     console.error("💥 Error recording payment failure:", error);
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// });

// // ===================================
// // 🔹 4. Razorpay Webhook Handler
// // ===================================
// // router.post(
// //   "/webhook",
// //   express.raw({ type: "application/json" }),
// //   async (req, res) => {
// //     const signature = req.headers["x-razorpay-signature"];
// //     const body = req.body;

// //     const expectedSignature = crypto
// //       .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
// //       .update(JSON.stringify(body))
// //       .digest("hex");

// //     if (signature !== expectedSignature) {
// //       return res.status(400).json({ error: "Invalid webhook signature" });
// //     }

// //     const event = body.event;
// //     const paymentEntity = body.payload.payment?.entity;

// //     try {
// //       switch (event) {
// //         case "payment.captured":
// //           await handlePaymentCaptured(paymentEntity);
// //           break;
// //         case "payment.failed":
// //           await handlePaymentFailed(paymentEntity);
// //           break;
// //         default:
// //           console.log(`Unhandled webhook event: ${event}`);
// //       }

// //       res.json({ received: true });
// //     } catch (error) {
// //       console.error("💥 Webhook error:", error);
// //       res.status(500).json({ error: "Webhook processing failed" });
// //     }
// //   }
// // );

// // ========== 🔸Webhook Handlers ==========
// async function handlePaymentCaptured(payment) {
//   try {
//     const paymentDoc = await Payment.findOne({
//       razorpayOrderId: payment.order_id,
//     });
//     if (paymentDoc) {
//       paymentDoc.status = "captured";
//       paymentDoc.razorpayPaymentId = payment.id;
//       await paymentDoc.save();

//       // ✅ Also handle stock decrease in webhook as backup
//       const order = await Order.findById(paymentDoc.orderId);
//       if (order && !order.isPaid) {
//         order.isPaid = true;
//         order.paidAt = new Date();
//         order.paymentStatus = "paid";
//         await order.save();

//         // ✅ Decrease stock via webhook as well
//         for (const item of order.orderItems) {
//           const product = await Product.findById(item.productId);
//           if (product) {
//             product.countInStock -= item.quantity;
//             if (product.countInStock < 0) product.countInStock = 0;
//             await product.save();
//           }
//         }

//         // ✅ Clear cart
//         await Cart.findOneAndDelete({ user: order.user });
//       }
//     }
//   } catch (error) {
//     console.error("Error in handlePaymentCaptured:", error);
//   }
// }

// async function handlePaymentFailed(payment) {
//   try {
//     const paymentDoc = await Payment.findOne({
//       razorpayOrderId: payment.order_id,
//     });
//     if (paymentDoc) {
//       paymentDoc.status = "failed";
//       paymentDoc.failureReason = payment.error_description || "Unknown error";
//       await paymentDoc.save();
//     }
//   } catch (error) {
//     console.error("Error in handlePaymentFailed:", error);
//   }
// }

// module.exports = router;


const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const razorpayInstance = require("../config/razorpay");
const Payment = require("../models/payment");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { protect } = require("../middleware/authMiddleware");
const mongoose = require("mongoose");
const { sendMail } = require("../utils/sendMail");
const { buildInvoicePDF } = require("../utils/invoice");
const sendWhatsApp = require("../utils/sendWhatsApp");
const { sendPushToUser } = require("../utils/push");
const { creditReferrerOnFirstOrder } = require("./referralRoutes");
const { deleteJson } = require("../utils/redisCache");
const { fulfillPrebookingsForOrder } = require("../utils/prebooking");
const { buildAttribution } = require("../utils/attribution");
const { registerCampaignConversion } = require("../utils/campaignTracking");

const applyVariantStockDeduction = (product, item) => {
  const qty = Number(item?.quantity || 0);
  if (!product || qty <= 0) return { ok: true };

  const itemSku   = String(item?.sku   || "").trim().toLowerCase();
  const itemColor = String(item?.color || "").trim().toLowerCase();
  const itemSize  = String(item?.size  || "").trim().toLowerCase();

  // --- Try new colorVariants structure first ---
  if (Array.isArray(product.colorVariants) && product.colorVariants.length > 0) {
    let matchedSize = null;

    if (itemSku) {
      for (const cv of product.colorVariants) {
        const found = (cv.sizes || []).find(
          (s) => String(s?.sku || "").trim().toLowerCase() === itemSku
        );
        if (found) { matchedSize = found; break; }
      }
    }
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
      matched.countInStock = available - qty;
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
  product.countInStock = overall - qty;
  return { ok: true };
};

// Environment variables validation
const requiredEnvVars = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET'];
requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    console.error(`${varName} is not set`);
    process.exit(1);
  }
});

// 🔹 1. Create Razorpay Order
router.post("/create-order", protect, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const { amount, currency = "INR", receipt, orderItems, shippingAddress, idempotencyKey, couponCodes, walletRedeem, trackingInfo } = req.body;

      console.log("Creating order for user:", req.user._id);
      console.log("Order amount:", amount);
      console.log("Received idempotencyKey:", idempotencyKey);

      // Input validation
      if (!orderItems || orderItems.length === 0) {
        throw new Error("No order items provided");
      }

      if (!amount || amount <= 0) {
        throw new Error("Invalid amount");
      }

      if (!shippingAddress) {
        throw new Error("Shipping address is required");
      }

      // Validate order items structure
      for (const item of orderItems) {
        if (!item.productId || !item.name || !item.price || !item.quantity) {
          throw new Error("Invalid order item structure");
        }
      }

      // Server-side pricing (promos + wallet). Unit prices are resolved from the
      // DB inside priceQuote — the client-sent item.price is ignored.
      const { priceQuote } = require("../services/pricingService");
      const { getAvailableCredits } = require("../services/walletService");
      const quote = await priceQuote({
        items: orderItems,
        userId: req.user._id,
        paymentMethod: "Razorpay",
        couponCodes,
        shippingAddress,
      });
      const walletBalance = await getAvailableCredits(req.user._id);
      const requested = Math.max(0, Number(walletRedeem || 0));
      const walletApplied = Math.min(walletBalance, requested, quote.total);
      const calculatedTotal = Math.max(0, Number(quote.total) - walletApplied);

      // The customer is always charged the server-computed total, never the
      // client-sent `amount` (which is only used for a sanity log).
      if (amount && Math.abs(Number(amount) - calculatedTotal) > 0.01) {
        console.warn("Amount mismatch - Frontend:", amount, "Server:", calculatedTotal);
      }

      // Authoritative unit price per product, from the quote.
      const unitPriceByProduct = Object.fromEntries(
        (quote.items || []).map((it) => [String(it.productId), Number(it.unitPrice) || 0])
      );

      // Check for existing pending order with idempotencyKey
      if (idempotencyKey) {
        const existingPayment = await Payment.findOne({ idempotencyKey }).session(session);
        if (existingPayment) {
          const order = await Order.findById(existingPayment.orderId).session(session);
          if (order && order.paymentStatus === "pending") {
            console.log("Returning order for idempotency key:", idempotencyKey);
            return res.status(200).json({
              success: true,
              orderId: order._id,
              razorpayOrderId: existingPayment.razorpayOrderId,
              amount: order.totalPrice,
              currency: existingPayment.currency,
              key: process.env.RAZORPAY_KEY_ID,
            });
          }
        }

        const existingOrder = await Order.findOne({
          user: req.user._id,
          idempotencyKey,
        }).session(session);
        if (existingOrder) {
          const existingPaymentByOrder = await Payment.findOne({ orderId: existingOrder._id }).session(session);
          if (existingPaymentByOrder && existingOrder.paymentStatus === "pending") {
            return res.status(200).json({
              success: true,
              orderId: existingOrder._id,
              razorpayOrderId: existingPaymentByOrder.razorpayOrderId,
              amount: existingOrder.totalPrice,
              currency: existingPaymentByOrder.currency,
              key: process.env.RAZORPAY_KEY_ID,
            });
          }
        }
      }

      // Backfill SKU if frontend didn't send it
      const idsNeedingSku = [
        ...new Set(
          (orderItems || [])
            .filter((it) => !it.sku && it.productId)
            .map((it) => String(it.productId))
        ),
      ];
      let productById = {};
      if (idsNeedingSku.length) {
        const prods = await Product.find({ _id: { $in: idsNeedingSku } })
          .select("_id sku variants")
          .session(session);
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

      // Create MongoDB Order
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
          price: unitPriceByProduct[String(item.productId)] ?? (Number(item.price) || 0),
          quantity: item.quantity,
          size: item.size || null,
          color: item.color || null,
          sku: resolveOrderItemSku(item),
        })),
        shippingAddress: {
          address: String(shippingAddress.address || "").trim(),
          city: shippingAddress.city,
          postalCode: shippingAddress.postalCode,
          country: shippingAddress.country,
          phone: shippingAddress.phone,
        },
        paymentMethod: "RazorPay",
        totalPrice: calculatedTotal,
        walletApplied,
        couponSnapshot: {
          codes: Array.isArray(couponCodes) ? couponCodes : [],
          appliedOffers: Array.isArray(quote?.appliedOffers)
            ? quote.appliedOffers.map((o) => o.title).filter(Boolean)
            : [],
          personalCouponApplied: Boolean(quote?.personalCouponApplied),
          personalCouponCode: String(quote?.personalCouponCode || ""),
          totalDiscount: Number(quote?.totalDiscount || 0),
        },
        isPaid: false,
        paymentStatus: "pending",
        status: "Processing",
        idempotencyKey: idempotencyKey || undefined,
      });

      const createdOrder = await order.save({ session });
      console.log("Created Order:", createdOrder._id);

      // Create Razorpay Order — charge the server-computed total, in paise.
      const razorpayAmount = Math.round(calculatedTotal * 100);
      const options = {
        amount: razorpayAmount,
        currency,
        receipt: receipt || `order_${createdOrder._id}`,
        notes: {
          order_id: createdOrder._id.toString(),
          user_id: req.user._id.toString(),
        },
      };

      const razorpayOrder = await razorpayInstance.orders.create(options);
      
      if (!razorpayOrder || !razorpayOrder.id) {
        throw new Error("Razorpay order creation failed");
      }

      console.log("Razorpay Order Created:", razorpayOrder.id);

      // Create Payment document
      const payment = new Payment({
        orderId: createdOrder._id,
        userId: req.user._id,
        razorpayOrderId: razorpayOrder.id,
        amount: calculatedTotal,
        currency,
        status: "created",
        idempotencyKey: idempotencyKey || undefined,
      });

      await payment.save({ session });
      console.log("Payment Document Created:", payment._id);

      // Do NOT clear cart here.
      // Cart should only be cleared after successful payment verification.

      res.status(201).json({
        success: true,
        orderId: createdOrder._id,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount / 100,
        currency: razorpayOrder.currency,
        key: process.env.RAZORPAY_KEY_ID,
      });
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error.message);
    console.error("Stack trace:", error.stack);

    if (error?.code === 11000 && req.body?.idempotencyKey) {
      try {
        const existingPayment = await Payment.findOne({ idempotencyKey: req.body.idempotencyKey });
        if (existingPayment) {
          const order = await Order.findById(existingPayment.orderId);
          if (order) {
            return res.status(200).json({
              success: true,
              orderId: order._id,
              razorpayOrderId: existingPayment.razorpayOrderId,
              amount: order.totalPrice,
              currency: existingPayment.currency,
              key: process.env.RAZORPAY_KEY_ID,
            });
          }
        }
      } catch (lookupErr) {
        console.error("Duplicate key lookup failed:", lookupErr.message);
      }
    }
    
    if (error.code === 'BAD_REQUEST_ERROR') {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid request to Razorpay", 
        error: error.description 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: "Error creating order", 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    session.endSession();
  }
});

// 🔹 2. Verify Payment After Checkout
router.post("/verify-payment", protect, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const { razorpayPaymentId, razorpayOrderId, razorpaySignature, orderId } = req.body;

      console.log("Verify payment request body:", req.body);
      console.log("User ID:", req.user._id);

      // Validate required fields
      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !orderId) {
        throw new Error("Missing payment details");
      }

      console.log("Verifying payment for order:", razorpayOrderId);

      // Verify signature
      const sign = razorpayOrderId + "|" + razorpayPaymentId;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(sign)
        .digest("hex");

      if (razorpaySignature !== expectedSignature) {
        console.error("Signature verification failed");
        console.error("Expected:", expectedSignature);
        console.error("Received:", razorpaySignature);
        throw new Error("Invalid Razorpay signature");
      }

      console.log("Signature verified successfully");

      // Find payment record
      const payment = await Payment.findOne({ razorpayOrderId }).session(session);
      if (!payment) {
        console.error("Payment record not found for order:", razorpayOrderId);
        throw new Error("Payment record not found");
      }

      // Validate orderId matches payment.orderId
      if (payment.orderId.toString() !== orderId) {
        console.error("Order ID mismatch. Expected:", payment.orderId, "Received:", orderId);
        throw new Error("Order ID does not match payment record");
      }

      // Check if payment already processed
      if (payment.status === "captured") {
        console.log("Payment already processed for order:", payment.orderId);
        return res.status(200).json({
          success: true,
          message: "Payment already processed",
          orderId: payment.orderId,
          paymentId: razorpayPaymentId,
        });
      }

      // Find order
      const order = await Order.findById(payment.orderId).session(session);
      if (!order) {
        console.error("Order not found:", payment.orderId);
        throw new Error("Order not found");
      }

      // Check if order already paid
      if (order.isPaid) {
        console.log("Order already paid:", order._id);
        return res.status(200).json({
          success: true,
          message: "Order already paid",
          orderId: order._id,
          paymentId: razorpayPaymentId,
        });
      }

      // Verify the user owns this order
      if (order.user.toString() !== req.user._id.toString()) {
        console.error("Unauthorized access attempt for order:", order._id);
        throw new Error("Unauthorized access");
      }

      // Update payment record
      // payment.razorpayPaymentId = razorpayPaymentId;
      // payment.razorpaySignature = razorpaySignature;
      // payment.status = "captured";
      // payment.capturedAt = new Date();
      payment.razorpayOrderId   = payment.razorpayOrderId || razorpayOrderId; // ensure stored
     payment.razorpayPaymentId = razorpayPaymentId;
     payment.razorpaySignature = razorpaySignature;
     payment.status            = "captured";
     payment.capturedAt        = new Date();
     // keep amount/currency in sync (optional but handy)
     if (!payment.amount)   payment.amount = order.totalPrice;
     if (!payment.currency) payment.currency = "INR";
      await payment.save({ session });

      // Update order
      order.isPaid = true;
      order.paidAt = new Date();
      order.paymentStatus = "paid";
      order.paymentResult = {
        id: razorpayPaymentId,
        status: "captured",
        update_time: new Date(),
        email_address: req.user.email,
      };
      await order.save({ session });
      if (order?.attribution?.campaignClickId) {
        await registerCampaignConversion({
          campaignClickId: order.attribution.campaignClickId,
          orderId: order._id,
        });
      }
      await Promise.all([
        deleteJson("users", `user:${req.user._id}:my-coupon`),
        deleteJson("users", `user:${req.user._id}:my-coupons`),
      ]);

      // Redeem wallet only after payment is captured
      try {
        const { redeem } = require("../services/walletService");
        const walletApplied = Number(order.walletApplied || 0);
        if (walletApplied > 0) {
          await redeem({
            userId: order.user,
            amount: walletApplied,
            refType: "order_razorpay",
            refId: String(order._id),
            note: `Redeemed for Razorpay order ${order.orderId}`,
          });
        }
      } catch (walletErr) {
        console.error("Wallet redeem after capture failed:", walletErr?.message || walletErr);
      }

      // Update product stock
      for (const item of order.orderItems) {
        const product = await Product.findById(item.productId).session(session);
        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }
        const deduction = applyVariantStockDeduction(product, item);
        if (!deduction.ok) {
          throw new Error(deduction.message || `Insufficient stock for ${product.name}`);
        }
        await product.save({ session });
        console.log(`Updated stock for product ${product.name}: ${product.countInStock}`);
      }

      // Clear cart
      const cartResult = await Cart.findOneAndUpdate(
        { user: req.user._id },
        { $set: { products: [], totalPrice: 0 } },
        { new: true, session }
      );

      if (cartResult) {
        console.log("Cart cleared for user:", req.user._id);
      } else {
        console.log("No cart found for user:", req.user._id);
      }

      console.log("Payment verification completed successfully for order:", order._id);

      await fulfillPrebookingsForOrder({
        userId: order.user,
        orderItems: order.orderItems,
        orderId: order._id,
      });

      // Prepare populated order once for post-payment side effects
      let populatedOrder = null;
      try {
        populatedOrder = await Order.findById(order._id)
          .populate("user", "name email")
          .populate("orderItems.productId", "sku")
          .lean();
      } catch (populateErr) {
        console.error("Failed to populate order after payment:", populateErr.message);
      }

      // === Email the invoice to the user (online payment) ===
      try {
        // load user fields to address the email properly
        if (!populatedOrder) {
          populatedOrder = await Order.findById(order._id)
         .populate("user", "name email")
         .populate("orderItems.productId", "sku")
         .lean();
        }
        if (populatedOrder?.user?.email) {
          populatedOrder.paymentResult = {
            ...(populatedOrder.paymentResult || {}),
            id:
              populatedOrder?.paymentResult?.id ||
              payment?.razorpayPaymentId ||
              razorpayPaymentId,
            status:
              populatedOrder?.paymentResult?.status ||
              payment?.status ||
              "captured",
            update_time:
              populatedOrder?.paymentResult?.update_time ||
              payment?.capturedAt ||
              new Date(),
            email_address:
              populatedOrder?.paymentResult?.email_address ||
              populatedOrder?.user?.email,
          };

          if (!populatedOrder.paymentResult?.id) {
            const paid = await Payment.findOne({ orderId: populatedOrder._id }).lean();
            if (paid?.razorpayPaymentId) {
              populatedOrder.paymentResult = {
                id: paid.razorpayPaymentId,
                status: paid.status,
                update_time: paid.capturedAt || paid.updatedAt,
                email_address: populatedOrder.user?.email,
              };
            }
          }
          // Build PDF buffer (same builder used elsewhere)
          const invoiceBuffer = await buildInvoicePDF(populatedOrder);
          const orderDate = new Date(populatedOrder.createdAt)
            .toLocaleDateString("en-GB");
          const lines = (populatedOrder.orderItems || [])
            .map((it) => `
              <p><strong>Product:</strong> ${it.name}</p>
              <p><strong>Color:</strong> ${it.color || "-"}</p>
              <p><strong>Size:</strong> ${it.size || "-"}</p>
              <p><strong>Quantity:</strong> ${it.quantity}</p>
              <hr/>`)
            .join("");
          await sendMail({
            to: populatedOrder.user.email,
            subject: "🧾 Payment Successful — Your Raphaaa Invoice",
            message: `
              <p>Hi ${populatedOrder.user.name || "Customer"},</p>
              <p>We received your online payment on <strong>${orderDate}</strong>. Thanks for shopping with Raphaaa!</p>
              ${lines}
              <p>We've attached your invoice as a PDF.</p>
              <p>Love,<br/>Team Raphaaa</p>
            `,
            attachments: [
              { filename: `Invoice_${populatedOrder._id}.pdf`, content: invoiceBuffer },
            ],
          });

          await sendPushToUser(
            { userId: populatedOrder.user._id, email: populatedOrder.user.email },
            {
              title: "Payment successful",
              body: `Your payment for order ${populatedOrder.orderId} was successful.`,
              url: `/order/${populatedOrder._id}`,
              data: {
                url: `/order/${populatedOrder._id}`,
                orderId: populatedOrder._id.toString(),
                paymentStatus: "paid",
              },
            }
          );
        } else {
          console.warn("No user email found on order; skipping invoice email.");
        }
      } catch (emailErr) {
        console.error("Failed to send online payment invoice email:", emailErr.message);
      }

      // Referrer reward on first purchase
      if (populatedOrder?.user?._id) {
        await creditReferrerOnFirstOrder(populatedOrder.user._id, populatedOrder.totalPrice);
      }

      // WhatsApp payment confirmation
      try {
        const phone = populatedOrder?.shippingAddress?.phone;
        if (phone) {
          const waMsg =
            `✅ *Payment Confirmed — Raphaaa*\n\n` +
            `Hi ${populatedOrder.user?.name?.split(" ")[0] || "there"}! We received your payment.\n\n` +
            `🆔 Order ID: *${populatedOrder.orderId}*\n` +
            `💰 Amount Paid: *₹${populatedOrder.totalPrice.toLocaleString("en-IN")}*\n` +
            `💳 Payment: Online\n\n` +
            `Your invoice has been sent to your email. We'll notify you when your order ships. Thank you! 🛍️`;
          await sendWhatsApp(`+91${String(phone).replace(/^\+91/, "")}`, waMsg);
        }
      } catch (_) {}

      res.json({
        success: true,
        message: "Payment verified and order processed successfully",
        orderId: order._id,
        paymentId: razorpayPaymentId,
        order: {
          id: order._id,
          status: order.status, // Fixed: Corrected syntax
          paymentStatus: order.paymentStatus,
          isPaid: order.isPaid,
          totalPrice: order.totalPrice,
          paidAt: order.paidAt,
        },
      });
    });
  } catch (err) {
    console.error("Error verifying payment:", err.message);
    console.error("Stack trace:", err.stack);
    
    res.status(err.message.includes("Order ID does not match") ? 400 : 500).json({
      success: false,
      message: "Server error during payment verification",
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  } finally {
    session.endSession();
  }
});

// 🔹 3. Get Order Status
router.get("/order-status/:orderId", protect, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    console.log("Fetching order status for:", orderId);
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }
    
    // Check if user owns this order
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized"
      });
    }
    
    const payment = await Payment.findOne({ orderId: order._id });
    
    res.json({
      success: true,
      order: {
        id: order._id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        isPaid: order.isPaid,
        totalPrice: order.totalPrice,
        paidAt: order.paidAt,
        createdAt: order.createdAt,
        orderItems: order.orderItems,
        shippingAddress: order.shippingAddress,
      },
      payment: payment ? {
        status: payment.status,
        razorpayOrderId: payment.razorpayOrderId,
        razorpayPaymentId: payment.razorpayPaymentId,
        amount: payment.amount,
        currency: payment.currency,
        capturedAt: payment.capturedAt,
        failureReason: payment.failureReason,
      } : null,
    });
  } catch (error) {
    console.error("Error fetching order status:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// 🔹 4. Handle Payment Failure
router.post("/payment-failed", protect, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const { razorpayOrderId, error_code, error_description } = req.body;

      console.log("Processing payment failure for order:", razorpayOrderId);

      if (!razorpayOrderId) {
        throw new Error("Order ID is required");
      }

      // Find payment record
      const payment = await Payment.findOne({ razorpayOrderId }).session(session);
      if (!payment) {
        console.error("Payment record not found for failed payment:", razorpayOrderId);
        throw new Error("Payment record not found");
      }

      // Update payment status to failed
      payment.status = "failed";
      payment.failureReason = error_description || error_code || "Payment failed";
      payment.failedAt = new Date();
      await payment.save({ session });

      // Find and update order status
      const order = await Order.findById(payment.orderId).session(session);
      if (order) {
        // Verify user owns this order
        if (order.user.toString() !== req.user._id.toString()) {
          throw new Error("Unauthorized access");
        }

        order.paymentStatus = "failed";
        order.status = "Cancelled";
        await order.save({ session });
        
        console.log("Order status updated to failed:", order._id);
      } else {
        console.error("Order not found for failed payment:", payment.orderId);
      }

      console.log("Payment failure processed for order:", razorpayOrderId);

      res.json({
        success: true,
        message: "Payment failure recorded",
        orderId: order ? order._id : payment.orderId,
        paymentStatus: "failed",
      });
    });
  } catch (error) {
    console.error("Error handling payment failure:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error while processing payment failure",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    session.endSession();
  }
});

// 🔹 5. Get Payment History for User
router.get("/payment-history", protect, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const payments = await Payment.find({ userId: req.user._id })
      .populate({
        path: 'orderId',
        select: 'orderItems totalPrice status createdAt shippingAddress',
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalPayments = await Payment.countDocuments({ userId: req.user._id });

    res.json({
      success: true,
      payments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalPayments / limit),
        totalPayments,
        hasNext: skip + payments.length < totalPayments,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching payment history:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// 🔹 6. Refund Payment
router.post("/refund/:paymentId", protect, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const { paymentId } = req.params;
      const { reason } = req.body;

      const payment = await Payment.findById(paymentId).session(session);
      if (!payment) {
        throw new Error("Payment not found");
      }

      // Check if user owns this payment
      if (payment.userId.toString() !== req.user._id.toString()) {
        throw new Error("Unauthorized access");
      }

      // Check if payment is eligible for refund
      if (payment.status !== "captured") {
        throw new Error("Payment not eligible for refund");
      }

      // Create refund request with Razorpay
      const refundOptions = {
        amount: payment.amount * 100, // Convert to paise
        notes: {
          reason: reason || "Customer requested refund",
          order_id: payment.orderId.toString(),
        },
      };

      const refund = await razorpayInstance.payments.refund(payment.razorpayPaymentId, refundOptions);

      // Update payment status
      payment.status = "refunded";
      payment.refundId = refund.id;
      payment.refundReason = reason;
      payment.refundedAt = new Date();
      await payment.save({ session });

      // Update order status
      const order = await Order.findById(payment.orderId).session(session);
      if (order) {
        order.paymentStatus = "refunded";
        order.status = "Refunded";
        const expectedDate = order.refundTimeline?.expectedDate || new Date();
        if (!order.refundTimeline?.expectedDate) expectedDate.setDate(expectedDate.getDate() + 7);
        const initiatedAt = order.refundTimeline?.initiatedAt || new Date();
        const processedAt = new Date();
        const completedAt = new Date();
        order.refundTimeline = {
          status: "completed",
          initiatedAt,
          processedAt,
          completedAt,
          expectedDate,
          note: reason || "Refund completed",
        };
        await order.save({ session });
      }

      console.log("Refund processed for payment:", paymentId);

      res.json({
        success: true,
        message: "Refund processed successfully",
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
      });
    });
  } catch (error) {
    console.error("Error processing refund:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error during refund processing",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    session.endSession();
  }
});

// 🔹 7. Webhook for Razorpay
router.post("/webhook", async (req, res) => {
  try {
    const webhookSignature = req.headers["x-razorpay-signature"];
    const webhookBody = JSON.stringify(req.body);
    
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(webhookBody)
      .digest("hex");

    if (webhookSignature !== expectedSignature) {
      console.error("Invalid webhook signature");
      return res.status(400).json({ message: "Invalid webhook signature" });
    }

    const event = req.body.event;
    const paymentEntity = req.body.payload.payment.entity;

    console.log("Webhook received:", event, "for payment:", paymentEntity.id);

    switch (event) {
      case "payment.captured":
        await handlePaymentCaptured(paymentEntity);
        break;
      case "payment.failed":
        await handlePaymentFailed(paymentEntity);
        break;
      case "refund.created":
        await handleRefundCreated(req.body.payload.refund.entity);
        break;
      default:
        console.log("Unhandled webhook event:", event);
    }

    res.json({ status: "ok" });
  } catch (error) {
    console.error("Webhook error:", error.message);
    res.status(500).json({ message: "Webhook error" });
  }
});

// 🔹 8. Cancel Pending Order
router.put("/cancel/:orderId", protect, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const { orderId } = req.params;

      const order = await Order.findById(orderId).session(session);
      if (!order) {
        throw new Error("Order not found");
      }

      if (order.user.toString() !== req.user._id.toString()) {
        throw new Error("Unauthorized access");
      }

      if (order.paymentStatus !== "pending") {
        throw new Error("Only pending orders can be cancelled");
      }

      order.paymentStatus = "cancelled";
      order.status = "Cancelled";
      await order.save({ session });

      const payment = await Payment.findOne({ orderId }).session(session);
      if (payment) {
        payment.status = "cancelled";
        await payment.save({ session });
      }

      console.log("Order cancelled:", orderId);

      res.json({
        success: true,
        message: "Order cancelled successfully",
        orderId,
      });
    });
  } catch (error) {
    console.error("Error cancelling order:", error.message);
    res.status(400).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  } finally {
    session.endSession();
  }
});

// 🔹 9. Cleanup Pending Orders
async function cleanupPendingOrders() {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const timeout = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes timeout
      const pendingOrders = await Order.find({
        paymentStatus: "pending",
        createdAt: { $lt: timeout },
      }).session(session);

      for (const order of pendingOrders) {
        await Payment.deleteOne({ orderId: order._id }).session(session);
        await order.deleteOne({ session });
        console.log(`Cleaned up pending order: ${order._id}`);
      }
    });
  } catch (error) {
    console.error("Error cleaning up pending orders:", error.message);
  } finally {
    session.endSession();
  }
}

// Schedule cleanup job
const cron = require("node-cron");
cron.schedule("*/15 * * * *", cleanupPendingOrders); // Run every 15 minutes

// 🔹 Helper functions for webhook events
async function handlePaymentCaptured(paymentEntity) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // const payment = await Payment.findOne({ razorpayPaymentId: paymentEntity.id }).session(session);
      // if (payment && payment.status !== "captured") {
      //   payment.status = "captured";
      //   payment.capturedAt = new Date();
      //   await payment.save({ session });
      //   console.log("Payment captured via webhook:", paymentEntity.id);
      // }
       // Prefer by paymentId, but fallback to orderId if needed
     let payment = await Payment.findOne({ razorpayPaymentId: paymentEntity.id }).session(session);
     if (!payment) {
       payment = await Payment.findOne({ razorpayOrderId: paymentEntity.order_id }).session(session);
     }
     if (!payment) return; // no local payment record; nothing to update

     // Upsert important fields
     payment.razorpayOrderId   = payment.razorpayOrderId || paymentEntity.order_id;
     payment.razorpayPaymentId = payment.razorpayPaymentId || paymentEntity.id;
     // (webhook has no signature)
     payment.amount   = payment.amount   || (typeof paymentEntity.amount === "number" ? paymentEntity.amount / 100 : undefined);
     payment.currency = payment.currency || paymentEntity.currency || "INR";
     payment.status   = "captured";
     payment.capturedAt = new Date();
     await payment.save({ session });
     console.log("Payment captured via webhook:", paymentEntity.id);
    });
  } catch (error) {
    console.error("Error handling payment captured webhook:", error);
  } finally {
    session.endSession();
  }
}

async function handlePaymentFailed(paymentEntity) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const payment = await Payment.findOne({ razorpayPaymentId: paymentEntity.id }).session(session);
      if (payment) {
        payment.status = "failed";
        payment.failureReason = paymentEntity.error_description || "Payment failed";
        payment.failedAt = new Date();
        await payment.save({ session });
        console.log("Payment failed via webhook:", paymentEntity.id);
      }
    });
  } catch (error) {
    console.error("Error handling payment failed webhook:", error);
  } finally {
    session.endSession();
  }
}

async function handleRefundCreated(refundEntity) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const payment = await Payment.findOne({ razorpayPaymentId: refundEntity.payment_id }).session(session);
      if (payment) {
        payment.status = "refunded";
        payment.refundId = refundEntity.id;
        payment.refundedAt = new Date();
        await payment.save({ session });
        console.log("Refund created via webhook:", refundEntity.id);
      }
    });
  } catch (error) {
    console.error("Error handling refund created webhook:", error);
  } finally {
    session.endSession();
  }
}

module.exports = router;
