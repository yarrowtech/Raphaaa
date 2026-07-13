const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const { getJson, setJson } = require("../utils/redisCache");

let razorpay;
try {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
} catch (error) {
  console.error("Razorpay not initialized:", error.message);
  razorpay = null;
}

// @desc    Fetch payment offers from Razorpay
// @route   GET /api/offers/payment
// @access  Public
router.get("/payment", async (req, res) => {
  if (!razorpay) {
    return res.status(503).json({ message: "Payment gateway not configured." });
  }

  const cacheKey = "razorpay-payment-offers";
  try {
    const cached = await getJson("offers", cacheKey);
    if (cached) return res.json(cached);

    const offers = await razorpay.offers.all();

    const now = Date.now() / 1000;
    const activeOffers = (offers.items || []).filter(
      (offer) => offer.active && (!offer.ends_at || offer.ends_at > now)
    );

    const formatted = activeOffers.map((o) => ({
      id: o.id,
      name: o.name,
      type: o.type,
      displayText: o.display_text,
      tncUrl: o.tnc_url,
    }));

    await setJson("offers", cacheKey, formatted, 3600); // Cache for 1 hour

    res.json(formatted);
  } catch (error) {
    console.error("Error fetching Razorpay offers:", error);
    res.status(200).json([]); // Return empty array on error to prevent frontend crash
  }
});

module.exports = router;