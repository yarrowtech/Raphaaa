const express = require("express");
const ShippingConfig = require("../models/ShippingConfig");
const { protect, admin } = require("../middleware/authMiddleware");
const { invalidateShippingConfigCache } = require("../services/pricingService");

const router = express.Router();

// Helper — always returns the singleton, creating it if missing
async function getConfig() {
  let cfg = await ShippingConfig.findOne({ singleton: "global" });
  if (!cfg) cfg = await ShippingConfig.create({ singleton: "global" });
  return cfg;
}

// GET /api/shipping-config  — public (used by pricing service & frontend)
router.get("/", async (req, res) => {
  try {
    res.json(await getConfig());
  } catch (err) {
    res.status(500).json({ message: "Failed to load shipping config" });
  }
});

// PUT /api/shipping-config  — admin only
router.put("/", protect, admin, async (req, res) => {
  try {
    const {
      baseShippingFee,
      freeShippingThreshold,
      firstOrderFreeShipping,
      codExtraCharge,
      zoneRates,
    } = req.body;

    const cfg = await getConfig();

    if (baseShippingFee       !== undefined) cfg.baseShippingFee       = Number(baseShippingFee);
    if (freeShippingThreshold !== undefined) cfg.freeShippingThreshold = Number(freeShippingThreshold);
    if (firstOrderFreeShipping !== undefined) cfg.firstOrderFreeShipping = Boolean(firstOrderFreeShipping);
    if (codExtraCharge        !== undefined) cfg.codExtraCharge        = Number(codExtraCharge);
    if (Array.isArray(zoneRates))            cfg.zoneRates             = zoneRates;

    await cfg.save();
    invalidateShippingConfigCache();
    res.json({ success: true, config: cfg });
  } catch (err) {
    console.error("shipping config update error:", err);
    res.status(500).json({ message: "Failed to update shipping config" });
  }
});

module.exports = router;
