import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { removeFromCart, updateCartItemQuantity, addToCart } from "../../redux/slices/cartSlice";
import { HiTrash } from "react-icons/hi2";
import { MdBookmarkBorder, MdBookmark } from "react-icons/md";
import axios from "axios";

const SFL_KEY = "saveForLater";

const loadSaved = () => {
  try { return JSON.parse(localStorage.getItem(SFL_KEY) || "[]"); } catch { return []; }
};
const persistSaved = (items) => localStorage.setItem(SFL_KEY, JSON.stringify(items));
const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
const formatColor = (value) => {
  const c = String(value || "").trim();
  if (!c) return "";
  return HEX_COLOR_RE.test(c) ? "Selected Color" : c;
};
const itemKey = (p) =>
  `${String(p?.productId || "")}__${String(p?.size || "")}__${String(p?.color || "")}__${String(p?.sku || "")}`;

const resolveAvailableStock = (product, cartItem) => {
  const size = String(cartItem?.size || "").trim();
  const color = String(cartItem?.color || "").trim();
  const sku = String(cartItem?.sku || "").trim();

  if (Array.isArray(product?.colorVariants) && color && size) {
    const cv = product.colorVariants.find((v) => String(v?.color || "").trim() === color);
    const sizeEntry = cv?.sizes?.find((s) => String(s?.size || "").trim() === size);
    if (sizeEntry) return Number(sizeEntry?.countInStock || 0);
  }

  if (Array.isArray(product?.variants) && sku) {
    const bySku = product.variants.find((v) => String(v?.sku || "").trim() === sku);
    if (bySku) return Number(bySku?.countInStock || 0);
  }

  return Number(product?.countInStock || 0);
};

const CartContents = ({ cart, userId, guestId, onContinueShopping }) => {
  const dispatch = useDispatch();
  const [savedItems, setSavedItems] = useState(loadSaved);
  const [stockByItem, setStockByItem] = useState({});
  const [productMetaByItem, setProductMetaByItem] = useState({});

  const products = cart?.products || [];

  const totalQty = products.reduce((acc, p) => acc + p.quantity, 0);

  const totalAmount = products.reduce(
    (acc, p) => acc + ((p.discountPrice ?? p.price) * p.quantity),
    0
  );

  const originalAmount = products.reduce(
    (acc, p) => acc + (p.price * p.quantity),
    0
  );

  const totalSavings = originalAmount - totalAmount;

  useEffect(() => {
    let cancelled = false;

    const loadStock = async () => {
      if (!products.length) {
        if (!cancelled) setStockByItem({});
        if (!cancelled) setProductMetaByItem({});
        return;
      }

      try {
        const rows = await Promise.all(
          products.map(async (p) => {
            const pid = String(p?.productId || "").trim();
            if (!pid) return [itemKey(p), Number(p?.quantity || 0)];
            const { data } = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/products/${pid}`);
            if (!cancelled) {
              setProductMetaByItem((prev) => ({
                ...prev,
                [itemKey(p)]: data,
              }));
            }
            return [itemKey(p), resolveAvailableStock(data, p)];
          })
        );
        if (!cancelled) setStockByItem(Object.fromEntries(rows));
      } catch {
        if (!cancelled) setStockByItem({});
      }
    };

    loadStock();
    return () => {
      cancelled = true;
    };
  }, [products]);

  const handleQty = (productId, delta, quantity, size, color) => {
    const next = quantity + delta;
    if (next >= 1) {
      dispatch(updateCartItemQuantity({ productId, quantity: next, guestId, userId, size, color }));
    }
  };

  const handleRemove = (productId, size, color) => {
    dispatch(removeFromCart({ productId, guestId, userId, size, color }));
  };

  const handleSaveForLater = (product) => {
    dispatch(removeFromCart({ productId: product.productId, guestId, userId, size: product.size, color: product.color }));
    const updated = [
      ...savedItems.filter((s) => !(s.productId === product.productId && s.size === product.size && s.color === product.color)),
      { ...product, savedAt: Date.now() },
    ];
    setSavedItems(updated);
    persistSaved(updated);
  };

  const handleMoveToCart = (item) => {
    dispatch(addToCart({ productId: item.productId, quantity: item.quantity || 1, size: item.size, color: item.color, sku: item.sku, userId, guestId }));
    const updated = savedItems.filter((s) => !(s.productId === item.productId && s.size === item.size && s.color === item.color));
    setSavedItems(updated);
    persistSaved(updated);
  };

  const handleRemoveSaved = (item) => {
    const updated = savedItems.filter((s) => !(s.productId === item.productId && s.size === item.size && s.color === item.color));
    setSavedItems(updated);
    persistSaved(updated);
  };

  // Cart is empty and nothing saved — show empty state
  if (products.length === 0 && savedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center text-gray-600 space-y-4">
        <img
          // src="https://cdn-icons-png.flaticon.com/512/2038/2038854.png"
          src="/trolley.gif"
          alt="Empty Cart"
          className="w-28 h-28 opacity-75"
        />
        <h3 className="text-base font-semibold text-gray-700">Your cart is empty</h3>
        <p className="text-sm text-gray-400">Looks like you haven't added anything yet.</p>
        {onContinueShopping && (
          <button
            onClick={onContinueShopping}
            className="px-5 py-2 bg-sky-600 text-white text-sm font-semibold rounded-lg hover:bg-sky-700 transition"
          >
            Continue Shopping
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* ── Product rows ── */}
      {products.map((product, index) => {
        const key = itemKey(product);
        const meta = productMetaByItem[key] || {};
        const originalPrice = Number(meta.price ?? product.price ?? 0);
        const displayPrice = Number(
          meta.displayPrice ??
          meta.discountPrice ??
          product.discountPrice ??
          product.price ??
          0
        );
        const hasDiscount = displayPrice > 0 && displayPrice < originalPrice;
        const lineTotal   = displayPrice * product.quantity;
        const maxStock = Number(stockByItem[key] ?? 0);
        const stockLimitReached = maxStock > 0 && product.quantity >= maxStock;

        return (
          <div
            key={index}
            className="flex items-start gap-4 bg-white border border-gray-100 rounded-2xl p-3.5 hover:border-sky-200 hover:shadow-sm transition-all group"
          >
            {/* Image */}
            <div className="w-20 h-24 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug">
                {product.name}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {product.size && (
                  <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    Size: {product.size}
                  </span>
                )}
                {product.color && (
                  <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {formatColor(product.color)}
                  </span>
                )}
              </div>

              {/* Price row */}
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-sm font-bold text-gray-900">
                  ₹{displayPrice.toLocaleString("en-IN")}
                </span>
                {hasDiscount && (
                  <span className="text-xs text-gray-400 line-through">
                    ₹{originalPrice.toLocaleString("en-IN")}
                  </span>
                )}
              </div>

              {/* Qty stepper */}
              <div className="flex items-center gap-2 mt-2.5">
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => handleQty(product.productId, -1, product.quantity, product.size, product.color)}
                    className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition text-base border-r border-gray-200 font-medium"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-xs font-bold text-gray-800">
                    {product.quantity}
                  </span>
                  <button
                    onClick={() => {
                      if (totalQty < 10 && !stockLimitReached)
                        handleQty(product.productId, 1, product.quantity, product.size, product.color);
                    }}
                    disabled={totalQty >= 10 || stockLimitReached}
                    className={`w-7 h-7 flex items-center justify-center transition text-base border-l border-gray-200 font-medium
                      ${totalQty >= 10 || stockLimitReached ? "text-gray-300 cursor-not-allowed" : "text-gray-600 hover:bg-gray-100"}`}
                  >
                    +
                  </button>
                </div>
                {totalQty >= 10 && (
                  <p className="text-[10px] text-red-500 font-medium">Max 10 items</p>
                )}
                {totalQty < 10 && maxStock > 0 && (
                  <p className="text-[10px] text-amber-600 font-medium">
                    Only {maxStock} left
                  </p>
                )}
              </div>
            </div>

            {/* Right: total + actions */}
            <div className="flex flex-col items-end justify-between h-24 shrink-0 gap-1">
              <p className="text-sm font-bold text-gray-900">
                ₹{lineTotal.toLocaleString("en-IN")}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleSaveForLater(product)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-sky-600 hover:border-sky-300 hover:bg-sky-50 transition"
                  title="Save for later"
                >
                  <MdBookmarkBorder className="text-sm" />
                </button>
                <button
                  onClick={() => handleRemove(product.productId, product.size, product.color)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition"
                  title="Remove from cart"
                >
                  <HiTrash className="text-sm" />
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* ── Coupon badge (if applied) ── */}
      {products.length > 0 && cart?.couponApplied && (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-emerald-600 text-lg">🎟️</span>
            <div>
              <p className="text-xs font-bold text-emerald-700">Coupon Applied!</p>
              <p className="text-[11px] text-emerald-600 font-mono">COUPON50</p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
            50% OFF
          </span>
        </div>
      )}

      {/* ── Cart Summary ── */}
      {products.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 bg-linear-to-r from-sky-50 to-blue-50">
            <p className="text-[11px] font-bold text-sky-700 uppercase tracking-widest">
              Order Summary
            </p>
          </div>

          <div className="px-4 py-4 space-y-2.5">
            {/* Items count */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Items ({totalQty})</span>
              <span className="font-semibold text-gray-800">
                ₹{originalAmount.toLocaleString("en-IN")}
              </span>
            </div>

            {/* Discount row */}
            {totalSavings > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Product Discount</span>
                <span className="font-semibold text-emerald-600">
                  − ₹{totalSavings.toLocaleString("en-IN")}
                </span>
              </div>
            )}

            {/* Shipping estimate */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-1.5">
                Delivery
                {totalAmount < 999 && (
                  <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full">
                    Free above ₹999
                  </span>
                )}
              </span>
              {totalAmount >= 999 ? (
                <span className="font-semibold text-emerald-600">Free</span>
              ) : (
                <span className="font-semibold text-gray-700">₹99</span>
              )}
            </div>

            {/* Total */}
            <div className="border-t border-dashed border-gray-200 pt-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-900">Total Amount</span>
                <span className="text-lg font-extrabold text-sky-700">
                  ₹{(totalAmount + (totalAmount >= 999 ? 0 : 99)).toLocaleString("en-IN")}
                </span>
              </div>
              {totalSavings > 0 && (
                <p className="text-[11px] text-emerald-600 font-semibold mt-1 text-right">
                  You save ₹{totalSavings.toLocaleString("en-IN")} 🎉
                </p>
              )}
              {totalAmount < 999 && (
                <p className="text-[11px] text-amber-600 mt-1 text-right">
                  Add ₹{(999 - totalAmount).toLocaleString("en-IN")} more for free shipping
                </p>
              )}
            </div>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-4 px-4 py-3 border-t border-gray-100 bg-gray-50">
            {[
              { icon: "🔒", text: "Secure Checkout" },
              { icon: "🚚", text: "Free Delivery" },
              { icon: "↩", text: "Easy Returns" },
            ].map(({ icon, text }) => (
              <span key={text} className="flex items-center gap-1 text-[10px] font-medium text-gray-400">
                {icon} {text}
              </span>
            ))}
          </div>
        </div>
      )}
      {/* ── Saved for Later ── */}
      {savedItems.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <MdBookmark className="text-sky-500" />
            <p className="text-sm font-bold text-gray-700">
              Saved for Later ({savedItems.length})
            </p>
          </div>
          <div className="space-y-2">
            {savedItems.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl p-3"
              >
                <div className="w-14 h-16 rounded-lg overflow-hidden bg-white border border-gray-100 shrink-0">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 line-clamp-1">{item.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {item.color && <span>{formatColor(item.color)} · </span>}
                    {item.size && <span>Size {item.size}</span>}
                  </p>
                  <p className="text-xs font-bold text-gray-900 mt-1">
                    ₹{Number(
                      productMetaByItem[itemKey(item)]?.displayPrice ??
                      productMetaByItem[itemKey(item)]?.discountPrice ??
                      item.discountPrice ??
                      item.price ??
                      0
                    ).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => handleMoveToCart(item)}
                    className="text-[10px] font-bold text-sky-700 border border-sky-300 bg-sky-50 hover:bg-sky-100 px-2 py-1 rounded-lg transition whitespace-nowrap"
                  >
                    Move to Cart
                  </button>
                  <button
                    onClick={() => handleRemoveSaved(item)}
                    className="text-[10px] font-medium text-gray-400 hover:text-red-500 transition text-center"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CartContents;
