const Prebooking = require("../models/Prebooking");

// Called after a real order is successfully placed. If the user had a "ready"
// prebooking for any of the ordered products, mark it fulfilled and link the order.
// Wrapped so a failure here never breaks the order/payment flow that calls it.
const fulfillPrebookingsForOrder = async ({ userId, orderItems, orderId }) => {
  try {
    if (!userId || !orderId) return;
    const productIds = [
      ...new Set((orderItems || []).map((it) => String(it.productId || "")).filter(Boolean)),
    ];
    if (!productIds.length) return;

    await Prebooking.updateMany(
      { user: userId, product: { $in: productIds }, status: "ready" },
      { $set: { status: "fulfilled", order: orderId } }
    );
  } catch (err) {
    console.error("fulfillPrebookingsForOrder error:", err.message);
  }
};

// Applies an admin's enabled/limit change to a product's prebooking config.
// Centralized here so the product create/edit form and the dedicated Prebookings
// admin page can't drift apart and reproduce the "shows ready after re-enabling" bug:
// re-enabling after a disable always starts a fresh round (open, 0 booked, no ready date),
// and disabling always freezes the round as "closed" instead of leaving it open/ready.
const applyPrebookingConfigUpdate = (product, { enabled, limit } = {}) => {
  if (!product.prebooking) product.prebooking = {};
  const wasEnabled = Boolean(product.prebooking.enabled);

  if (limit !== undefined) {
    product.prebooking.limit = Math.max(0, Number(limit) || 0);
  }

  if (enabled !== undefined) {
    const nextEnabled = Boolean(enabled);

    if (nextEnabled && !wasEnabled) {
      const isReactivation = ["closed", "ready"].includes(product.prebooking.status);
      if (isReactivation) {
        product.prebooking.round = Number(product.prebooking.round || 1) + 1;
      } else if (!product.prebooking.round) {
        product.prebooking.round = 1;
      }
      product.prebooking.status = "open";
      product.prebooking.bookedCount = 0;
      product.prebooking.readyAt = null;
    } else if (!nextEnabled && wasEnabled) {
      product.prebooking.status = "closed";
    }

    product.prebooking.enabled = nextEnabled;
  }
};

module.exports = { fulfillPrebookingsForOrder, applyPrebookingConfigUpdate };
