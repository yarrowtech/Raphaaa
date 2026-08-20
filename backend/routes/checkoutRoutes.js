const express = require("express");
const Checkout = require("../models/Checkout");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { protect, optionalAuth } = require("../middleware/authMiddleware");
const { priceQuote } = require("../services/pricingService");
const { getAvailableCredits, redeem } = require("../services/walletService");
const { buildAttribution } = require("../utils/attribution");
const { registerCampaignConversion } = require("../utils/campaignTracking");

const router = express.Router();

// @route POST /api/checkout/quote
// @desc Server-side pricing quote (promos/shipping). Client should use this before creating checkout.
// @access Private
router.post("/quote", protect, async (req, res) => {
  try {
    const { checkoutItems, paymentMethod, couponCodes, walletRedeem } = req.body;
    if (!Array.isArray(checkoutItems) || checkoutItems.length === 0) {
      return res.status(400).json({ message: "no items in checkout" });
    }

    const quote = await priceQuote({
      items: checkoutItems,
      userId: req.user._id,
      paymentMethod,
      couponCodes,
    });

    const walletBalance = await getAvailableCredits(req.user._id);
    const requested = Math.max(0, Number(walletRedeem || 0));
    const walletApplied = Math.min(walletBalance, requested, quote.total);
    const totalAfterWallet = Math.max(0, Number(quote.total) - walletApplied);

    res.json({
      success: true,
      quote: {
        ...quote,
        wallet: {
          balance: walletBalance,
          requested,
          applied: walletApplied,
        },
        totalAfterWallet,
      },
    });
  } catch (error) {
    console.error("checkout quote error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// @route POST /api/checkout
// @desc Create a new checkout session
// @access Private
router.post("/", protect, async (req, res) => {
    const { checkoutItems, shippingAddress, paymentMethod, couponCodes, walletRedeem, trackingInfo } =
        req.body;

        if(!checkoutItems || checkoutItems.length === 0){
            return res.status(400).json({ message: "no items in checkout" });
        }

        try {
            const quote = await priceQuote({
                items: checkoutItems,
                userId: req.user._id,
                paymentMethod,
                couponCodes,
                shippingAddress,
            });

            const walletBalance = await getAvailableCredits(req.user._id);
            const requested = Math.max(0, Number(walletRedeem || 0));
            const walletApplied = Math.min(walletBalance, requested, quote.total);
            const totalAfterWallet = Math.max(0, Number(quote.total) - walletApplied);

            // Create a new checkout session
            const newCheckout = await Checkout.create({
                user: req.user._id,
                checkoutItems: checkoutItems,
                shippingAddress,
                paymentMethod,
                totalPrice: totalAfterWallet,
                attribution: buildAttribution(trackingInfo, {
                  customerName: req.user?.name || "",
                  customerEmail: req.user?.email || "",
                }),
                pricing: {
                  ...quote,
                  wallet: { balance: walletBalance, requested, applied: walletApplied },
                  totalAfterWallet,
                },
                paymentStatus: "Pending",
                isPaid: false,
            });
            console.log(`Checkout created for user: ${req.user._id}`);
            res.status(201).json(newCheckout);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
});

// @route PUT /api/checkout/:id/pay
// @desc Update checkout to mark as paid as paid after successfull payment
// @access Private
router.put("/:id/pay", protect, async (req, res) => {
    const { paymentStatus, paymentDetails } = req.body;

    try {
        const checkout = await Checkout.findById(req.params.id);

        if(!checkout) {
            return res.status(404).json({ message: "Checkout not found" });
        }

        if(paymentStatus === "paid"){
            checkout.isPaid = true;
            checkout.paymentStatus = paymentStatus;
            checkout.paymentDetails = paymentDetails;
            checkout.paidAt = Date.now();
            await checkout.save();

            res.status(200).json(checkout);
        } else {
            res.status(400).json({ message: "Invalid Payent Status" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// @route POST /api/checkout/:id/finalize
// @desc Finalize checkout and convert to an order after payment confirmation
// @access Private
router.post("/:id/finalize", protect, async(req, res) => {
    try {
        const checkout = await Checkout.findById(req.params.id);
        if (!checkout) {
            return res.status(404).json({ message: "Checkout session not found" });
        }
        if(checkout.isPaid && !checkout.isFinalized) {
            // create final order based on the checkout details
            const finalOrder = await Order.create({
                user: checkout.user,
                orderItems: checkout.checkoutItems,
                shippingAddress: checkout.shippingAddress,
                paymentMethod: checkout.paymentMethod,
                totalPrice: checkout.totalPrice,
                attribution: checkout.attribution || undefined,
                isPaid: true,
                paidAt: checkout.paidAt,
                isDelivered: false,
                paymentStatus: "paid",
                paymentDetails: checkout.paymentDetails,
            });
            if (finalOrder?.attribution?.campaignClickId) {
              await registerCampaignConversion({
                campaignClickId: finalOrder.attribution.campaignClickId,
                orderId: finalOrder._id,
              });
            }

            // Wallet redemption is applied at finalize to prevent double-spend on abandoned checkouts.
            const walletApplied = Number(checkout?.pricing?.wallet?.applied || 0);
            if (walletApplied > 0) {
              await redeem({
                userId: checkout.user,
                amount: walletApplied,
                refType: "checkout",
                refId: String(checkout._id),
                note: `Redeemed for order ${finalOrder.orderId}`,
              });
            }

            // mark the checkout as finalized
            checkout.isFinalized = true;
            checkout.finalizedAt = Date.now();
            await checkout.save();

            // Delete the cart associated with the user
            await Cart.findOneAndDelete({ user: checkout.user });
            res.status(201).json(finalOrder);
        } else if (checkout.isFinalized) {
            return res.status(400).json({ message: "Checkout session already finalized" });
        } else {
            res.status(400).json({ message: "Checkout session is not paid yet" });
        }
    } catch (error) {
        console.error("Error finalizing checkout session:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// @route POST /api/checkout/guest-quote
// @desc Price quote for guest users (no auth, no wallet/user offers)
// @access Public
router.post("/guest-quote", async (req, res) => {
  try {
    const { checkoutItems, paymentMethod } = req.body;
    if (!Array.isArray(checkoutItems) || checkoutItems.length === 0) {
      return res.status(400).json({ message: "no items in checkout" });
    }
    const quote = await priceQuote({ items: checkoutItems, paymentMethod });
    res.json({ success: true, quote: { ...quote, totalAfterWallet: quote.total } });
  } catch (error) {
    console.error("guest quote error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// @route POST /api/checkout/guest-order
// @desc Create a COD or Razorpay order for a guest (no login required)
// @access Public
router.post("/guest-order", async (req, res) => {
  try {
    const { orderItems, shippingAddress, paymentMethod, totalPrice, guestEmail, guestName, trackingInfo } = req.body;

    if (!Array.isArray(orderItems) || orderItems.length === 0)
      return res.status(400).json({ message: "no items in order" });
    if (!guestEmail || !/\S+@\S+\.\S+/.test(guestEmail))
      return res.status(400).json({ message: "valid email is required for guest checkout" });
    if (!shippingAddress?.address)
      return res.status(400).json({ message: "shipping address is required" });

    const order = await Order.create({
      user: null,
      guestEmail,
      guestName: guestName || guestEmail,
      attribution: buildAttribution(trackingInfo, {
        customerName: guestName || guestEmail || "",
        customerEmail: guestEmail || "",
        customerPhone: shippingAddress?.phone || "",
      }),
      orderItems,
      shippingAddress,
      paymentMethod,
      totalPrice,
      isPaid: paymentMethod === "cash_on_delivery" ? false : false,
      paymentStatus: "Pending",
    });
    if (order?.attribution?.campaignClickId) {
      await registerCampaignConversion({
        campaignClickId: order.attribution.campaignClickId,
        orderId: order._id,
      });
    }

    res.status(201).json({ success: true, order });
  } catch (error) {
    console.error("guest order error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
