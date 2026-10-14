// Resolve guest order identity and inventory exclusively from stored products.
function validateOrderItems(items, products) {
  const fail = (message) => { throw Object.assign(new Error(message), { status: 400 }); };
  if (!Array.isArray(items) || !items.length) fail('No items in order');
  if (items.reduce((sum, item) => sum + Number(item.quantity), 0) > 10) fail('You can buy up to 10 items');
  const reserved = new Map();
  return items.map((item) => {
    const quantity = Number(item.quantity);
    if (!Number.isSafeInteger(quantity) || quantity < 1) fail('Invalid quantity');
    const product = products.find((p) => String(p._id) === String(item.productId));
    if (!product || product.isPublished === false) fail('Product unavailable');
    let variant;
    let color = item.color;
    let image = product.images?.[0]?.url;
    if (product.colorVariants?.length) {
      const group = product.colorVariants.find((v) => v.color === color || v.colorName === color);
      variant = group?.sizes.find((v) => v.size === item.size && (!item.sku || v.sku === item.sku));
      if (!variant) fail('Invalid product variant');
      color = group.color;
      image = group.images?.[0]?.url || image;
    } else if (product.variants?.length) {
      variant = product.variants.find((v) => v.color === color && v.size === item.size && (!item.sku || v.sku === item.sku));
      if (!variant) fail('Invalid product variant');
    } else {
      if (product.sizes?.length && !product.sizes.includes(item.size)) fail('Invalid size');
      if (product.colors?.length && !product.colors.includes(color)) fail('Invalid color');
      if (item.sku && item.sku !== product.sku) fail('Invalid SKU');
      variant = product;
    }
    const key = `${product._id}:${variant.sku}`;
    const used = (reserved.get(key) || 0) + quantity;
    if (used > Number(variant.countInStock || 0)) fail(`Insufficient stock for ${product.name}`);
    reserved.set(key, used);
    return { productId: product._id, quantity, sku: variant.sku, size: item.size, color, image, name: product.name };
  });
}
module.exports = { validateOrderItems };
