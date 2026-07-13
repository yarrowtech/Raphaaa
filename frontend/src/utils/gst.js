// India apparel/textile GST slab: 5% if a unit's sale price is ₹1000 or less,
// 12% if it's above ₹1000 (Notification No. 18/2021-Central Tax (Rate)).
// Product prices in this store are GST-inclusive, so GST is back-calculated
// from the price already being charged rather than added on top of it.
export const GST_THRESHOLD = 1000;

export const getGstRate = (unitPrice) => (Number(unitPrice) > GST_THRESHOLD ? 0.12 : 0.05);

export const getItemGstBreakup = (unitPrice, quantity = 1) => {
  const rate = getGstRate(unitPrice);
  const grossAmount = Number(unitPrice) * Number(quantity);
  const taxableValue = grossAmount / (1 + rate);
  const gstAmount = grossAmount - taxableValue;
  return { rate, taxableValue, gstAmount, grossAmount };
};

// shippingAmount: freight/shipping charged alongside the goods is a composite
// supply under GST law and is taxed at the same (blended) rate as the goods —
// it isn't GST-free just because it's a separate line item.
export const getOrderGstSummary = (
  items = [],
  getUnitPrice = (item) => Number(item?.price) || 0,
  shippingAmount = 0
) => {
  const goods = items.reduce(
    (acc, item) => {
      const unitPrice = getUnitPrice(item);
      const qty = Number(item?.quantity) || 0;
      const { taxableValue, gstAmount, grossAmount } = getItemGstBreakup(unitPrice, qty);
      acc.taxableValue += taxableValue;
      acc.gstAmount += gstAmount;
      acc.grossAmount += grossAmount;
      return acc;
    },
    { taxableValue: 0, gstAmount: 0, grossAmount: 0 }
  );

  const shipping = Number(shippingAmount) || 0;
  if (shipping <= 0 || goods.taxableValue <= 0) {
    return { ...goods, grossAmount: goods.grossAmount + shipping };
  }

  const blendedRate = goods.gstAmount / goods.taxableValue;
  const shippingTaxableValue = shipping / (1 + blendedRate);
  const shippingGstAmount = shipping - shippingTaxableValue;

  return {
    taxableValue: goods.taxableValue + shippingTaxableValue,
    gstAmount: goods.gstAmount + shippingGstAmount,
    grossAmount: goods.grossAmount + shipping,
  };
};
