import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import demoImg from "../../assets/login.jpg";
import { addToCart } from "../../redux/slices/cartSlice";

/* Exact heart path from the reference mockup — used so the unfilled/filled
   states match pixel-for-pixel (stroke-width 1.8, linejoin round). */
const HeartIcon = ({ wished }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={wished ? "#E11B22" : "none"} stroke={wished ? "#E11B22" : "#111111"} strokeWidth="1.8" strokeLinejoin="round">
    <path d="M12 20.5s-7.5-4.6-9.4-9.1C1.2 7.9 3.4 4.5 6.9 4.5c2 0 3.5 1.1 5.1 3 1.6-1.9 3.1-3 5.1-3 3.5 0 5.7 3.4 4.3 6.9-1.9 4.5-9.4 9.1-9.4 9.1z" />
  </svg>
);

/**
 * LandingProductCard — desktop landing-page product card matching the
 * reference design (white bg, 1px border, 400px image, size grid, add-to-bag).
 * Reuses the same price/discount + wishlist conventions as ProductGrid.jsx.
 */
const LandingProductCard = ({ product, wishlistItems = [], onToggleWish }) => {
  const dispatch = useDispatch();
  const { user, guestId } = useSelector((state) => state.auth);
  const [selectedSize, setSelectedSize] = useState(null);
  const [adding, setAdding] = useState(false);

  if (!product) return null;

  const img =
    product.colorVariants?.[0]?.images?.[0]?.url ||
    product.images?.[0]?.url ||
    demoImg;

  const isNew = product.createdAt
    ? Date.now() - new Date(product.createdAt).getTime() < 2 * 24 * 60 * 60 * 1000
    : false;

  const hasDis =
    Boolean(product.discountPrice && Number(product.discountPrice) < Number(product.price));
  const salePrice = hasDis ? Number(product.discountPrice) : Number(product.price);
  const discountPct =
    hasDis && product.price
      ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
      : product.offerPercentage;

  const wished = wishlistItems.some((i) => i._id === product._id);

  // sizes: prefer first color variant's sizes, else legacy variants, else flat sizes[]
  const sizes = (() => {
    if (Array.isArray(product.colorVariants) && product.colorVariants.length > 0) {
      const cv = product.colorVariants[0];
      if (Array.isArray(cv.sizes) && cv.sizes.length > 0) {
        return cv.sizes.map((s) => s.size).filter(Boolean);
      }
    }
    if (Array.isArray(product.sizes) && product.sizes.length > 0) return product.sizes;
    if (Array.isArray(product.variants) && product.variants.length > 0) {
      return [...new Set(product.variants.map((v) => v.size).filter(Boolean))];
    }
    return [];
  })();

  const defaultColor =
    product.colorVariants?.[0]?.color || product.variants?.[0]?.color || product.colors?.[0] || "";

  const selectedVariant = product.colorVariants?.[0]?.sizes?.find(s => s.size === selectedSize) || product.variants?.find(v => v.size === selectedSize && v.color === defaultColor);
  const isPrebooking = product.prebooking?.enabled && product.prebooking.status === "open";
  const soldOut = !isPrebooking && Number(product.countInStock) === 0;
  const unavailable = soldOut || (selectedVariant && Number(selectedVariant.countInStock) === 0);

  const defaultSku = (() => {
    if (Array.isArray(product.colorVariants) && product.colorVariants[0]?.sizes?.length) {
      const match = product.colorVariants[0].sizes.find((s) => s.size === selectedSize);
      return match?.sku;
    }
    return selectedVariant?.sku;
  })();

  const pUrl = `/product/${(product.name || "").toLowerCase().replace(/\s+/g, "-")}/p/${product._id}`;

  const handleAddToBag = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (adding || unavailable) return;
    if (sizes.length > 0 && !selectedSize) {
      toast.error("Please select a size");
      return;
    }

    setAdding(true);
    try {
      const res = await dispatch(
        addToCart({
          productId: product._id,
          quantity: 1,
          size: selectedSize || undefined,
          color: defaultColor || undefined,
          sku: defaultSku,
          userId: user?._id,
          guestId: guestId || localStorage.getItem("guestId"),
        })
      );

      if (res.meta.requestStatus === "fulfilled") {
        toast.success("Added to bag");
      } else {
        toast.error(res.payload?.message || "Failed to add to bag");
      }
    } catch {
      toast.error("Failed to add to bag");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div
      className="landing-product-card bg-white flex flex-col overflow-hidden"
      style={{ border: "1px solid #EEEEEE", borderRadius: "4px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="block relative">
        <Link to={pUrl} aria-label={product.name} className="absolute inset-0 z-10" />
        <div className="landing-card-image relative w-full overflow-hidden" style={{ height: "400px", background: "#efedef" }}>
          <img
            src={img}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          />

          {(isNew || hasDis) && (
            <span
              className="absolute font-bold uppercase"
              style={{
                top: "12px",
                left: "12px",
                padding: "4px 8px",
                borderRadius: "2px",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                background: "#111111",
                color: "#ffffff",
              }}
            >
              {isNew ? "New" : "Sale"}
            </span>
          )}

          <button
            onClick={(e) => onToggleWish(e, product)}
            aria-pressed={wished}
            aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
            className="absolute z-20 flex items-center justify-center transition-colors"
            style={{ top: "10px", right: "10px", width: "44px", height: "44px", borderRadius: "9999px", background: "rgba(255,255,255,.92)", border: "1px solid #EAEAEC" }}
          >
            <HeartIcon wished={wished} />
          </button>

          {product.rating > 0 && product.numReviews > 0 && (
            <div
              className="absolute flex items-center"
              style={{
                left: "12px",
                bottom: "12px",
                height: "24px",
                padding: "0 8px",
                borderRadius: "4px",
                background: "rgba(255,255,255,.9)",
                border: "1px solid #EAEAEC",
                gap: "4px",
                fontSize: "12px",
                fontWeight: 700,
                color: "#111111",
              }}
            >
              {Number(product.rating).toFixed(1)} ★
              <span style={{ color: "#D4D5D9", fontWeight: 400 }}>|</span>
              <span style={{ fontWeight: 500, color: "#707072" }}>{product.numReviews}</span>
            </div>
          )}
        </div>
      </div>

      <div className="landing-card-details flex flex-col" style={{ padding: "14px 16px 16px", gap: "10px" }}>
        <div className="flex flex-col" style={{ gap: "2px" }}>
          {product.brand && (
            <div className="truncate" style={{ fontSize: "14px", fontWeight: 700, letterSpacing: "0.04em", color: "#111111" }}>
              {product.brand}
            </div>
          )}
          <Link to={pUrl}>
            <div className="truncate" style={{ fontSize: "13px", color: "#444748" }}>{product.name}</div>
          </Link>
        </div>

        <div className="landing-prices flex items-baseline" style={{ gap: "8px" }}>
          <span style={{ fontSize: "16px", fontWeight: 800, color: "#111111" }}>
            ₹{Math.floor(salePrice).toLocaleString("en-IN")}
          </span>
          {hasDis && (
            <>
              <span style={{ fontSize: "12px", color: "#707072", textDecoration: "line-through" }}>
                ₹{Math.floor(product.price).toLocaleString("en-IN")}
              </span>
              {discountPct > 0 && (
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#bb0013" }}>({discountPct}% OFF)</span>
              )}
            </>
          )}
        </div>

        {sizes.length > 0 && (
          <div className="landing-sizes grid" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: "6px" }}>
            {sizes.map((sz) => (
              <button
                key={sz}
                type="button"
                aria-pressed={selectedSize === sz}
                disabled={!isPrebooking && Number((product.colorVariants?.[0]?.sizes?.find(s => s.size === sz) || product.variants?.find(v => v.size === sz && v.color === defaultColor))?.countInStock) === 0}
                onClick={() => setSelectedSize(sz)}
                className="transition-colors disabled:opacity-30 disabled:line-through"
                style={{
                  height: "44px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  fontWeight: 700,
                  border: selectedSize === sz ? "1px solid #111111" : "1px solid #D4D5D9",
                  background: selectedSize === sz ? "#111111" : "#ffffff",
                  color: selectedSize === sz ? "#ffffff" : "#111111",
                }}
              >
                {sz}
              </button>
            ))}
          </div>
        )}

        {isPrebooking ? <Link to={pUrl} className="flex items-center justify-center h-[46px] rounded bg-[#111111] text-white text-sm font-bold">Prebook · View details</Link> : <button
          type="button"
          onClick={handleAddToBag}
          disabled={adding || unavailable}
          className="w-full text-white transition-colors disabled:opacity-60"
          style={{ height: "46px", borderRadius: "4px", border: 0, fontSize: "14px", fontWeight: 700, background: "#111111" }}
        >
          {adding ? "Adding..." : soldOut ? "Sold out" : unavailable ? "Size unavailable" : "Add to Bag"}
        </button>}
      </div>
    </div>
  );
};

export default LandingProductCard;
