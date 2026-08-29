const Offer          = require("../models/offer");
const Order          = require("../models/Order");
const Product        = require("../models/Product");
const ShippingConfig = require("../models/ShippingConfig");
const User           = require("../models/User");

const clampMoney = (n) => Math.max(0, Math.round((Number(n) || 0) * 100) / 100);

const normalizePaymentMethod = (v) => String(v || "").trim();

const isOfferInWindow = (offer, now) => {
  const s = new Date(offer.startDate);
  const e = new Date(offer.endDate);
  return now >= s && now <= e && offer.isActive !== false;
};

const itemMatchesOffer = (offer, item, state = {}) => {
  const c = offer.conditions || {};
  const pid = String(item.productId || item._id || "");
  const category = String(item.category || "");
  const brand = String(item.brand || "");
  const isSaleProtected = state.saleProtectedProductIds instanceof Set
    && state.saleProtectedProductIds.has(pid);

  // ── Legacy productIds field (used by the admin UI) ────────────────────────
  // If the offer lists specific products, it must ONLY apply to those products.
  if (Array.isArray(offer.productIds) && offer.productIds.length > 0) {
    if (!offer.productIds.some((x) => String(x) === pid)) return false;
  }

  // ── Rule-engine conditions ─────────────────────────────────────────────────
  if (Array.isArray(c.excludeProductIds) && c.excludeProductIds.some((x) => String(x) === pid)) return false;
  if (Array.isArray(c.includeProductIds) && c.includeProductIds.length > 0) {
    if (!c.includeProductIds.some((x) => String(x) === pid)) return false;
  }
  if (Array.isArray(c.includeCategories) && c.includeCategories.length > 0) {
    if (!c.includeCategories.some((x) => String(x).toLowerCase() === category.toLowerCase())) return false;
  }
  if (Array.isArray(c.includeBrands) && c.includeBrands.length > 0) {
    if (!c.includeBrands.some((x) => String(x).toLowerCase() === brand.toLowerCase())) return false;
  }
  if (isSaleProtected && (offer.benefit?.scope || "product") === "product") return false;

  return true;
};

// Singleton cache — refreshed every 5 minutes so config changes apply without restart
let _shippingConfigCache = null;
let _shippingConfigCachedAt = 0;

async function getShippingConfig() {
  const now = Date.now();
  if (_shippingConfigCache && now - _shippingConfigCachedAt < 5 * 60 * 1000) {
    return _shippingConfigCache;
  }
  let cfg = await ShippingConfig.findOne({ singleton: "global" }).lean();
  if (!cfg) {
    // Auto-create with defaults on first boot
    cfg = await ShippingConfig.create({ singleton: "global" });
    cfg = cfg.toObject();
  }
  _shippingConfigCache = cfg;
  _shippingConfigCachedAt = now;
  return cfg;
}

// Called by the admin shipping-config update route so checkout quotes reflect
// the new price immediately instead of waiting out the 5-minute cache window.
function invalidateShippingConfigCache() {
  _shippingConfigCache = null;
  _shippingConfigCachedAt = 0;
}

function computeZoneCharge(cfg, pincode) {
  if (!pincode || !/^\d{6}$/.test(String(pincode))) return 0;
  const prefix = String(pincode).slice(0, 2);
  const zones = cfg.zoneRates || [];
  for (const z of zones) {
    if ((z.pinPrefixes || []).includes(prefix)) return Number(z.extraCharge || 0);
  }
  // Default to National zone charge if no match
  const national = zones.find((z) => z.zone === "C");
  return national ? Number(national.extraCharge || 0) : 0;
}

function getZoneName(cfg, pincode) {
  if (!pincode || !/^\d{6}$/.test(String(pincode))) return null;
  const prefix = String(pincode).slice(0, 2);
  const zones = cfg.zoneRates || [];
  for (const z of zones) {
    if ((z.pinPrefixes || []).includes(prefix)) return z.label;
  }
  const national = zones.find((z) => z.zone === "C");
  return national?.label || null;
}

async function userIsNew(userId) {
  if (!userId) return false;
  const count = await Order.countDocuments({ user: userId, isPaid: true }).limit(1);
  return count === 0;
}

// Authoritative unit price for a line — resolved from the DB, never from the
// client. Uses the lowest legitimate price (base / standing discount / live
// timed-sale price). Falls back to the client value only if the product is
// missing (that line will fail validation elsewhere).
function resolveServerUnitPrice(doc, clientPrice) {
  const fallback = Number(clientPrice) || 0;
  if (!doc) return fallback;
  const candidates = [doc.price, doc.discountPrice, doc.activeSalePrice]
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v) && v > 0);
  return candidates.length ? Math.min(...candidates) : fallback;
}

function buildLineTotals(items, priceDocMap = {}) {
  const normalized = (items || []).map((it) => {
    const pid = String(it.productId || it._id || "");
    const doc = priceDocMap[pid];
    const quantity = Number(it.quantity || 0);
    const unitPrice = resolveServerUnitPrice(doc, it.price);
    const lineSubtotal = clampMoney(unitPrice * quantity);
    return {
      productId: it.productId || it._id,
      sku: it.sku,
      name: it.name,
      // Prefer DB category/brand so offer targeting can't be gamed client-side.
      category: doc?.category ?? it.category,
      brand: doc?.brand ?? it.brand,
      quantity,
      unitPrice: clampMoney(unitPrice),
      lineSubtotal,
    };
  });

  const subtotal = clampMoney(normalized.reduce((s, it) => s + it.lineSubtotal, 0));
  return { items: normalized, subtotal };
}

function applyOfferToContext({ offer, context, state }) {
  const benefit = offer.benefit || {};
  const scope = benefit.scope || "product";
  const type = benefit.type || "percent";

  if (scope === "shipping") {
    if (type === "free_shipping") {
      const amount = state.shipping; // discount up to full shipping
      return { shippingDiscount: amount };
    }
    if (type === "flat") {
      return { shippingDiscount: Math.min(state.shipping, Number(benefit.amount || 0)) };
    }
    if (type === "percent") {
      const pct = Number(benefit.percent || offer.offerPercentage || 0);
      return { shippingDiscount: clampMoney((state.shipping * pct) / 100) };
    }
    return {};
  }

  if (scope === "cart") {
    // If the offer targets specific products (legacy productIds), restrict
    // the discount base to only those matching lines, not the whole cart.
    const hasProductRestriction =
      (Array.isArray(offer.productIds) && offer.productIds.length > 0) ||
      (Array.isArray((offer.conditions || {}).includeProductIds) &&
        (offer.conditions.includeProductIds || []).length > 0);

    let base;
    if (hasProductRestriction) {
      base = state.items.reduce((sum, it, idx) => {
        if (!itemMatchesOffer(offer, it, state)) return sum;
        return sum + clampMoney(it.lineSubtotal - (state.itemDiscounts[idx] || 0));
      }, 0);
    } else {
      base = state.subtotal - state.itemDiscountTotal;
    }

    if (base <= 0) return {};
    if (type === "flat") {
      return { cartDiscount: Math.min(base, Number(benefit.amount || 0)) };
    }
    const pct = Number(benefit.percent || offer.offerPercentage || 0);
    const raw = clampMoney((base * pct) / 100);
    const cap = benefit.maxDiscount !== undefined && benefit.maxDiscount !== null ? Number(benefit.maxDiscount) : null;
    return { cartDiscount: cap ? Math.min(raw, cap) : raw };
  }

  // product scope
  const eligibleIdx = state.items
    .map((it, idx) => ({ it, idx }))
    .filter(({ it }) => itemMatchesOffer(offer, it, state));

  if (eligibleIdx.length === 0) return {};

  const perItemDiscounts = new Map();
  for (const { it, idx } of eligibleIdx) {
    const base = it.lineSubtotal - (state.itemDiscounts[idx] || 0);
    if (base <= 0) continue;

    let d = 0;
    if (type === "flat") {
      // Flat amount spread across eligible quantity: apply per line up to base
      d = Math.min(base, Number(benefit.amount || 0));
    } else {
      const pct = Number(benefit.percent || offer.offerPercentage || 0);
      d = clampMoney((base * pct) / 100);
      if (benefit.maxDiscount !== undefined && benefit.maxDiscount !== null) {
        d = Math.min(d, Number(benefit.maxDiscount));
      }
    }

    perItemDiscounts.set(idx, d);
  }

  return { perItemDiscounts };
}

async function priceQuote({
  items,
  userId,
  paymentMethod,
  couponCodes = [],
  shippingAddress,
}) {
  const now = new Date();
  const pm = normalizePaymentMethod(paymentMethod);

  // Resolve authoritative prices/attributes from the DB up front — the client
  // is never trusted for unit price, category or brand.
  const requestedIds = [
    ...new Set((items || []).map((it) => String(it.productId || it._id || "")).filter(Boolean)),
  ];
  const productDocs = requestedIds.length
    ? await Product.find({ _id: { $in: requestedIds } })
        .select("price mrp discountPrice offerPercentage activeSaleOfferId activeSalePrice freeShipping extraShippingCharge category brand")
        .lean()
    : [];
  const productMap = Object.fromEntries(productDocs.map((p) => [String(p._id), p]));

  const { items: normItems, subtotal } = buildLineTotals(items, productMap);

  // Load admin-controlled shipping config from DB
  const cfg = await getShippingConfig();
  const newUser = await userIsNew(userId);

  // --- Base shipping from admin config ---
  let baseShipping = 0;
  if (subtotal >= cfg.freeShippingThreshold) {
    baseShipping = 0;
  } else if (newUser && cfg.firstOrderFreeShipping) {
    baseShipping = 0;
  } else {
    baseShipping = cfg.baseShippingFee;
  }

  // --- Product-level overrides (reuses productDocs/productMap resolved above) ---
  // A product is "sale protected" (blocks further coupons/offers) ONLY while a
  // live timed-sale offer is running on it. A standing everyday discount
  // (discountPrice, or price below mrp) does NOT block coupons.
  const saleProtectedProductIds = new Set(
    productDocs
      .filter((p) => p?.activeSaleOfferId != null || Number(p?.activeSalePrice || 0) > 0)
      .map((p) => String(p._id))
  );

  const productExtraShipping = normItems.reduce((sum, it) => {
    const p = productMap[String(it.productId)];
    return sum + (p?.extraShippingCharge || 0);
  }, 0);

  const allProductsFreeShipping = normItems.length > 0 && normItems.every((it) => {
    const p = productMap[String(it.productId)];
    return p?.freeShipping === true;
  });

  if (allProductsFreeShipping) baseShipping = 0;

  // --- Zone charge from admin config ---
  const pincode = shippingAddress?.postalCode || shippingAddress?.pincode;
  const qualifiesForZone = pincode && baseShipping > 0;
  const zoneCharge = qualifiesForZone ? computeZoneCharge(cfg, pincode) : 0;
  const zoneName   = qualifiesForZone ? getZoneName(cfg, pincode) : null;

  // --- COD surcharge ---
  const codCharge = (pm === "cash_on_delivery" && cfg.codExtraCharge > 0) ? cfg.codExtraCharge : 0;

  const shipping = clampMoney(baseShipping + productExtraShipping + zoneCharge + codCharge);

  const activeOffers = await Offer.find({ isActive: true }).lean();
  const filteredByWindow = activeOffers.filter((o) => isOfferInWindow(o, now));

  const couponSet = new Set((couponCodes || []).map((c) => String(c || "").trim().toUpperCase()).filter(Boolean));

  // Sort by priority (lower number = higher priority)
  const offers = filteredByWindow.sort((a, b) => (a.priority || 100) - (b.priority || 100));

  const state = {
    items: normItems,
    subtotal,
    shipping,
    itemDiscounts: Array(normItems.length).fill(0),
    itemDiscountTotal: 0,
    cartDiscount: 0,
    shippingDiscount: 0,
    appliedOffers: [],
    usedExclusiveGroups: new Set(),
    blocked: false,
    saleProtectedProductIds,
  };

  const context = { userId, newUser, paymentMethod: pm, couponSet };
  const blockPromosForSaleCart = saleProtectedProductIds.size > 0;

  for (const offer of offers) {
    if (blockPromosForSaleCart) break;
    if (state.blocked) break;

    const c = offer.conditions || {};

    if (offer.exclusiveGroup) {
      if (state.usedExclusiveGroups.has(String(offer.exclusiveGroup))) continue;
    }

    if (offer.couponCode) {
      if (!couponSet.has(String(offer.couponCode).trim().toUpperCase())) continue;
    }

    if (c.newUserOnly && !newUser) continue;

    if (Array.isArray(c.paymentMethods) && c.paymentMethods.length > 0) {
      if (!c.paymentMethods.some((x) => String(x).trim() === pm)) continue;
    }

    const currentAfterItemDiscounts = clampMoney(state.subtotal - state.itemDiscountTotal);
    if (c.minCartSubtotal !== undefined && c.minCartSubtotal !== null) {
      if (currentAfterItemDiscounts < Number(c.minCartSubtotal || 0)) continue;
    }

    const applied = applyOfferToContext({ offer, context, state });
    const perItemDiscounts = applied.perItemDiscounts;
    const cartDiscount = clampMoney(applied.cartDiscount || 0);
    const shippingDiscount = clampMoney(applied.shippingDiscount || 0);

    let changed = false;
    if (perItemDiscounts && perItemDiscounts.size > 0) {
      for (const [idx, d] of perItemDiscounts.entries()) {
        if (d <= 0) continue;
        state.itemDiscounts[idx] = clampMoney((state.itemDiscounts[idx] || 0) + d);
        changed = true;
      }
      state.itemDiscountTotal = clampMoney(state.itemDiscounts.reduce((s, x) => s + x, 0));
    }

    if (cartDiscount > 0) {
      state.cartDiscount = clampMoney(state.cartDiscount + cartDiscount);
      changed = true;
    }

    if (shippingDiscount > 0) {
      state.shippingDiscount = clampMoney(Math.min(state.shipping, state.shippingDiscount + shippingDiscount));
      changed = true;
    }

    if (!changed) continue;

    state.appliedOffers.push({
      offerId: offer._id,
      title: offer.title,
      scope: offer.benefit?.scope || "product",
      type: offer.benefit?.type || (offer.offerPercentage ? "percent" : "flat"),
    });

    if (offer.exclusiveGroup) state.usedExclusiveGroups.add(String(offer.exclusiveGroup));
    if (offer.stackable === false) state.blocked = true;
  }

  // Ensure cart discount doesn't exceed remaining amount (after item discounts)
  const afterItems = clampMoney(state.subtotal - state.itemDiscountTotal);
  state.cartDiscount = clampMoney(Math.min(afterItems, state.cartDiscount));

  const afterCart = clampMoney(afterItems - state.cartDiscount);
  const shippingAfter = clampMoney(state.shipping - state.shippingDiscount);
  let personalCouponApplied = false;
  let personalCouponCode = "";

  // Personal first-order coupon support (user-specific 10% style coupon from register flow)
  if (!blockPromosForSaleCart && userId && couponSet.size > 0) {
    const user = await User.findById(userId).select("coupon").lean();
    const userCouponCode = String(user?.coupon?.code || "").trim().toUpperCase();
    const userCouponDiscount = Number(user?.coupon?.discount || 0);
    const couponExpiry = user?.coupon?.expiresAt ? new Date(user.coupon.expiresAt) : null;
    const hasAnyOrder = (await Order.countDocuments({ user: userId }).limit(1)) > 0;
    const validPersonalCoupon =
      userCouponCode &&
      couponSet.has(userCouponCode) &&
      userCouponDiscount > 0 &&
      couponExpiry &&
      couponExpiry > now &&
      !hasAnyOrder;

    if (validPersonalCoupon) {
      const personalDiscount = clampMoney((afterCart * userCouponDiscount) / 100);
      if (personalDiscount > 0) {
        state.cartDiscount = clampMoney(state.cartDiscount + personalDiscount);
        personalCouponApplied = true;
        personalCouponCode = userCouponCode;
      }
    }
  }

  const afterPersonalCoupon = clampMoney(afterItems - state.cartDiscount);
  const total = clampMoney(afterPersonalCoupon + shippingAfter);

  return {
    currency: "INR",
    isNewUser: newUser,
    freeShippingThreshold: cfg.freeShippingThreshold,
    subtotal: state.subtotal,
    productExtraShipping: clampMoney(productExtraShipping),
    zoneCharge: clampMoney(zoneCharge),
    zoneName,
    codCharge: clampMoney(codCharge),
    itemDiscountTotal: state.itemDiscountTotal,
    cartDiscount: state.cartDiscount,
    shipping: state.shipping,
    shippingDiscount: state.shippingDiscount,
    totalDiscount: clampMoney(state.itemDiscountTotal + state.cartDiscount + state.shippingDiscount),
    total,
    items: state.items.map((it, idx) => ({
      ...it,
      lineDiscount: clampMoney(state.itemDiscounts[idx] || 0),
      lineTotal: clampMoney(it.lineSubtotal - (state.itemDiscounts[idx] || 0)),
    })),
    appliedOffers: state.appliedOffers,
    personalCouponApplied,
    personalCouponCode,
  };
}

module.exports = {
  priceQuote,
  invalidateShippingConfigCache,
};
