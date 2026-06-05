const Product = require("../models/Product");
const Offer = require("../models/offer");
const { formatTimedOffer } = require("./timedOfferPricing");

const offerSelect = "_id title startDate endDate isActive offerPercentage benefit priority productIds createdAt";

const loadOffers = async () => Offer.find().select(offerSelect).lean();

const hasValue = (value) => value !== undefined && value !== null;

const toNumberOrNull = (value) => {
  if (!hasValue(value)) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getProductIdsFromOffers = (offers = []) => {
  const ids = new Set();
  offers.forEach((offer) => {
    if (!Array.isArray(offer?.productIds)) return;
    offer.productIds.forEach((id) => {
      const value = String(id || "").trim();
      if (value) ids.add(value);
    });
  });
  return [...ids];
};

const syncTimedOfferPricing = async ({ offers = null, productIds = null, now = new Date() } = {}) => {
  const activeOffers = offers || await loadOffers();
  const targetProductIds = Array.isArray(productIds) && productIds.length > 0
    ? [...new Set(productIds.map((id) => String(id || "").trim()).filter(Boolean))]
    : getProductIdsFromOffers(activeOffers);

  if (targetProductIds.length === 0) {
    return { matched: 0, updated: 0 };
  }

  const products = await Product.find({ _id: { $in: targetProductIds } }).select(
    "_id price discountPrice offerPercentage baseDiscountPrice baseOfferPercentage activeSaleOfferId activeSalePrice activeSaleOfferPercentage"
  );

  const operations = [];

  for (const product of products) {
    const pricing = formatTimedOffer(product, activeOffers, now);
    const liveTimedOffer = pricing?.timedOffer?.status === "live" ? pricing.timedOffer : null;

    if (liveTimedOffer) {
      const isAlreadyLive = String(product.activeSaleOfferId || "") === String(liveTimedOffer.offerId || "");
      const baseDiscountPrice = hasValue(product.baseDiscountPrice)
        ? product.baseDiscountPrice
        : hasValue(product.discountPrice)
        ? product.discountPrice
        : null;
      const baseOfferPercentage = hasValue(product.baseOfferPercentage)
        ? product.baseOfferPercentage
        : Number(product.offerPercentage || 0);
      const livePrice = toNumberOrNull(pricing.displayPrice) ?? toNumberOrNull(pricing.discountPrice) ?? toNumberOrNull(product.price);

      operations.push({
        updateOne: {
          filter: { _id: product._id },
          update: {
            $set: {
              ...(isAlreadyLive ? {} : {
                baseDiscountPrice,
                baseOfferPercentage,
              }),
              discountPrice: livePrice,
              offerPercentage: Number(liveTimedOffer.offerPercentage || 0),
              activeSaleOfferId: liveTimedOffer.offerId || null,
              activeSalePrice: livePrice,
              activeSaleOfferPercentage: Number(liveTimedOffer.offerPercentage || 0),
              activeSaleSyncedAt: now,
            },
          },
        },
      });
      continue;
    }

    if (hasValue(product.activeSaleOfferId)) {
      operations.push({
        updateOne: {
          filter: { _id: product._id },
          update: {
            $set: {
              discountPrice: hasValue(product.baseDiscountPrice) ? product.baseDiscountPrice : null,
              offerPercentage: Number(product.baseOfferPercentage || 0),
              activeSaleOfferId: null,
              activeSalePrice: null,
              activeSaleOfferPercentage: 0,
              activeSaleSyncedAt: now,
            },
            $unset: {
              baseDiscountPrice: "",
              baseOfferPercentage: "",
            },
          },
        },
      });
    }
  }

  if (operations.length > 0) {
    await Product.bulkWrite(operations, { ordered: false });
  }

  return {
    matched: products.length,
    updated: operations.length,
  };
};

module.exports = {
  syncTimedOfferPricing,
  loadOffers,
};
