import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import demoImg from "../../assets/login.jpg";
import { AiOutlineHeart, AiFillHeart } from "react-icons/ai";

/* Exact heart path from the reference mockup — used on the editorial
   (collections-page) card so the wishlist button matches pixel-for-pixel. */
const HeartIcon = ({ wished }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={wished ? "#E11B22" : "none"} stroke={wished ? "#E11B22" : "#111111"} strokeWidth="1.8" strokeLinejoin="round">
    <path d="M12 20.5s-7.5-4.6-9.4-9.1C1.2 7.9 3.4 4.5 6.9 4.5c2 0 3.5 1.1 5.1 3 1.6-1.9 3.1-3 5.1-3 3.5 0 5.7 3.4 4.3 6.9-1.9 4.5-9.4 9.1-9.4 9.1z" />
  </svg>
);
import { HiChevronLeft, HiChevronRight, HiSparkles } from "react-icons/hi2";
import { BsHourglassSplit } from "react-icons/bs";
import { IoStar } from "react-icons/io5";
import axios from "axios";
import { toast } from "sonner";
import { formatCountdown, isSaleLive, isSaleUpcoming } from "../../utils/offerCountdown";
import { cachedGet } from "../../utils/httpCache";

/* ── Skeleton ── */
const Skeleton = () => (
  <div className="animate-pulse">
    <div className="bg-gray-100 rounded-none w-full aspect-3/4 mb-3" />
    <div className="h-2.5 bg-gray-100 rounded w-1/4 mb-2" />
    <div className="h-3.5 bg-gray-100 rounded w-3/4 mb-1.5" />
    <div className="h-3 bg-gray-100 rounded w-1/2" />
  </div>
);

const jakarta = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

const ProductGrid = ({ products = [], loading, error, variant = "default", wide = false }) => {
  const [page,          setPage]          = useState(1);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [publicOffers, setPublicOffers] = useState([]);
  const [now, setNow] = useState(Date.now());
  const navigate   = useNavigate();
  const { search } = useLocation();
  const sortBy     = useMemo(() => new URLSearchParams(search).get("sortBy"), [search]);
  const editorial  = variant === "editorial";

  const PER_PAGE = 12;

  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const safe = useMemo(() => Array.isArray(products) ? products : [], [products]);
  const doShuffle = !editorial && (!sortBy || sortBy === "default" || sortBy === "none");
  const source    = useMemo(() => (doShuffle ? shuffle(safe) : safe), [safe, doShuffle]);
  const totalPages = Math.ceil(source.length / PER_PAGE);
  const list       = source.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  useEffect(() => { setPage(1); }, [search, safe.length]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    cachedGet(
      "offers:public",
      () => axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/offers/public`),
      60 * 1000
    )
      .then((data) => setPublicOffers(Array.isArray(data) ? data : []))
      .catch(() => setPublicOffers([]));
  }, []);

  /* ── wishlist ── */
  useEffect(() => {
    const token = localStorage.getItem("userToken");
    if (!token) return;
    axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/wishlist`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => setWishlistItems(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  const inWishlist = (id) => wishlistItems.some((i) => i._id === id);

  const toggleWish = async (e, product) => {
    e.preventDefault(); e.stopPropagation();
    const token = localStorage.getItem("userToken");
    if (!token) { toast.warning("Please login"); navigate("/login"); return; }
    try {
    if (inWishlist(product._id)) {
      await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/wishlist/remove/${product._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWishlistItems((p) => p.filter((x) => x._id !== product._id));
      toast.success("Removed from wishlist");
    } else {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/wishlist/add/${product._id}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWishlistItems((p) => [...p, product]);
      toast.success("Added to wishlist");
    }
    window.dispatchEvent(new Event("wishlist-updated"));
    } catch { toast.error("Could not update your wishlist. Please try again."); }
  };

  const pUrl = (p) =>
    `/product/${p.name.toLowerCase().replace(/\s+/g, "-")}/p/${p._id}`;

  // Named-color → hex map (matches FilterSidebar COLOR_MAP)
  const COLOR_HEX = {
    red: "#ef4444", blue: "#3b82f6", black: "#111827", green: "#22c55e",
    yellow: "#eab308", gray: "#9ca3af", grey: "#9ca3af", white: "#f9fafb",
    pink: "#ec4899", beige: "#e5d5b7", navy: "#1e3a5f", orange: "#f97316",
    purple: "#a855f7", brown: "#92400e", teal: "#14b8a6", olive: "#7c8c3b",
    maroon: "#7f1d1d", cream: "#fffdd0", khaki: "#c3b091", indigo: "#6366f1",
    coral: "#f97316", magenta: "#d946ef", cyan: "#06b6d4", silver: "#d1d5db",
    gold: "#f59e0b", lavender: "#a78bfa",
  };

  const resolveColor = (c) => {
    if (!c) return "#9ca3af";
    const s = String(c).trim();
    // already a hex / rgb value
    if (/^#|^rgb/.test(s)) return s;
    const key = s.toLowerCase().replace(/\s+/g, "");
    // try the map with some normalization ("whitetee" → "white", etc.)
    for (const [k, v] of Object.entries(COLOR_HEX)) {
      if (key === k || key.startsWith(k)) return v;
    }
    // fallback: use the raw string as a CSS color (handles "tomato", "steelblue", etc.)
    return s;
  };

  const isLight = (cssColor) => {
    // simple lightness check for white/beige/cream/silver/yellow shades
    const light = ["#f9fafb","#f3f4f6","#e5d5b7","#fffdd0","#c3b091","#d1d5db","#eab308","#f59e0b","#a78bfa"];
    return light.includes(cssColor.toLowerCase()) || cssColor.toLowerCase() === "white";
  };

  const getProductColors = (product) => {
    // colorVariants: [{color, colorName, images, sizes}]
    if (Array.isArray(product?.colorVariants) && product.colorVariants.length > 0) {
      return [
        ...new Map(
          product.colorVariants
            .filter((cv) => cv?.color)
            .map((cv) => [String(cv.color).toLowerCase(), { raw: cv.color, name: cv.colorName || cv.color }])
        ).values(),
      ];
    }
    // legacy variants: [{color, size, ...}]
    if (Array.isArray(product?.variants) && product.variants.length > 0) {
      return [
        ...new Map(
          product.variants
            .filter((v) => v?.color)
            .map((v) => [String(v.color).toLowerCase(), { raw: v.color, name: v.color }])
        ).values(),
      ];
    }
    // flat colors array: ["White", "Black", ...]
    if (Array.isArray(product?.colors) && product.colors.length > 0) {
      return product.colors.filter(Boolean).map((c) => ({ raw: c, name: c }));
    }
    return [];
  };

  const resolveOfferForProduct = (product) => {
    const offerList = [
      ...(product.timedOffer ? [product.timedOffer] : []),
      ...publicOffers.filter((offer) =>
        Array.isArray(offer.productIds) &&
        offer.productIds.some((item) => String(item?._id || item) === String(product._id))
      ).map((offer) => ({
        status: new Date() >= new Date(offer.startDate) && new Date() <= new Date(offer.endDate)
          ? "live"
          : new Date() < new Date(offer.startDate)
          ? "upcoming"
          : "expired",
        startsAt: offer.startDate,
        endsAt: offer.endDate,
        offerPercentage: offer.offerPercentage || offer.benefit?.percent || 0,
        title: offer.title,
        originalPrice: product.price,
        discountPrice: Number((Number(product.price || 0) - (Number(product.price || 0) * Number(offer.offerPercentage || offer.benefit?.percent || 0)) / 100).toFixed(2)),
      })),
    ];

    if (offerList.length === 0) return null;
    return offerList.sort((a, b) => {
      const rank = (o) => (o.status === "live" ? 0 : o.status === "upcoming" ? 1 : 2);
      return rank(a) - rank(b);
    })[0];
  };

  const deriveCard = (product) => {
    const img        = product.colorVariants?.[0]?.images?.[0]?.url || product.images?.[0]?.url || demoImg;
    const isNew      = Date.now() - new Date(product.createdAt).getTime() < 2 * 24 * 60 * 60 * 1000;
    const isPrebooking = product?.prebooking?.enabled && product.prebooking.status === "open";
    const productColors     = getProductColors(product);
    const timedOffer = resolveOfferForProduct(product);
    const saleLive   = isSaleLive(timedOffer);
    const saleSoon   = isSaleUpcoming(timedOffer);
    const salePrice   = saleLive ? Number(timedOffer?.discountPrice || product.price) : Number(product.discountPrice || product.price);
    const hasDis     = saleLive
      ? Number(timedOffer?.discountPrice || 0) < Number(product.price || 0)
      : Boolean(!timedOffer && product.discountPrice && product.discountPrice < product.price);
    const wished     = inWishlist(product._id);
    const outOfStock = product.countInStock === 0;
    const lowStock   = !outOfStock && product.countInStock < 5;
    const discountPct = hasDis && Number(product.price) > 0 ? Math.round((1 - salePrice / Number(product.price)) * 100) : 0;
    const badgeText = saleLive
      ? "Sale is live now"
      : saleSoon
      ? `💥 Sale starts in ${formatCountdown(timedOffer?.startsAt, now)}`
      : hasDis
      ? `${product.offerPercentage}% off`
      : "";

    return {
      img, isNew, isPrebooking, productColors, timedOffer, saleLive, saleSoon,
      salePrice, hasDis, wished, outOfStock, lowStock, badgeText, discountPct,
    };
  };

  /* ═══════════════ DEFAULT CARD (used on Home / DropDetail / related products) ═══════════════ */
  const renderDefaultCard = (product) => {
    const {
      img, isNew, isPrebooking, productColors, timedOffer, saleLive, saleSoon,
      salePrice, hasDis, wished, outOfStock, lowStock, badgeText,
    } = deriveCard(product);

    return (
      <div key={product._id} className="group relative bg-white rounded-md overflow-hidden shadow-sm flex flex-col items-center justify-between p-2">

        {/* ── Wishlist button (above link) ── */}
        <button
          onClick={(e) => toggleWish(e, product)}
          className={`absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full
            transition-all duration-200 backdrop-blur-sm border
            ${wished
              ? "bg-white border-red-200 text-red-500 shadow-sm"
              : "bg-white/70 border-white/50 text-gray-400 hover:bg-white hover:text-red-400 hover:border-red-200 shadow-sm"
            }`}
        >
          {wished ? <AiFillHeart className="text-sm" /> : <AiOutlineHeart className="text-sm" />}
        </button>

        <Link to={pUrl(product)} className="block">

          {/* ── Image ── */}
          <div className="relative overflow-hidden bg-gray-50 aspect-3/4 rounded-md mb-3">
            <img
              src={img}
              alt={product.name}
              className={`w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] ${outOfStock ? "opacity-60 grayscale-[30%]" : ""}`}
              loading="lazy"
            />

            {/* "New" ribbon badge */}
            {isNew && (
              <div className="absolute top-3 left-0 z-10 drop-shadow-md">
                <span
                  className="flex items-center gap-1 bg-sky-500 text-white text-[10px] font-bold pl-2.5 pr-4 py-1"
                  style={{ clipPath: "polygon(0 0, 100% 0, 86% 50%, 100% 100%, 0 100%)" }}
                >
                  <HiSparkles className="text-[10px] shrink-0" />
                  New
                </span>
                <span className="absolute -bottom-1.25 left-0 w-0 h-0 border-t-[5px] border-t-sky-800 border-r-[5px] border-r-transparent" />
              </div>
            )}

            {/* Badges top-left */}
            <div className={`absolute left-3 flex flex-col gap-1.5 ${isNew ? "top-11" : "top-3"}`}>
              {saleSoon && (
                <span className="bg-amber-500 text-white text-[9px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-sm">
                  {badgeText}
                </span>
              )}
              {saleLive && (
                <span className="bg-emerald-600 text-white text-[9px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-sm">
                  {badgeText}
                </span>
              )}
              {!product.timedOffer && !saleLive && !saleSoon && hasDis && (
                <span className="bg-red-600 text-white text-[9px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-sm">
                  {badgeText}
                </span>
              )}
              {outOfStock && (
                <span className="bg-gray-800 text-white text-[9px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-sm">
                  Sold out
                </span>
              )}
              {lowStock && (
                <span className="bg-amber-500 text-white text-[9px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-sm">
                  {product.countInStock} left
                </span>
              )}
            </div>

            {/* "Prebook" ribbon badge — bottom-left corner */}
            {isPrebooking && (
              <div className="absolute bottom-3 left-0 z-10 drop-shadow-md">
                <span
                  className="flex items-center gap-1 bg-violet-600 text-white text-[10px] font-bold pl-2.5 pr-4 py-1"
                  style={{ clipPath: "polygon(0 0, 100% 0, 86% 50%, 100% 100%, 0 100%)" }}
                >
                  <BsHourglassSplit className="text-[10px] shrink-0" />
                  Prebook
                </span>
                <span className="absolute -top-1.25 left-0 w-0 h-0 border-b-[5px] border-b-violet-800 border-r-[5px] border-r-transparent" />
              </div>
            )}

            {/* Color swatches — tight white pill in bottom-right corner */}
            {productColors.length > 0 && (
              <div className="absolute -bottom-2 -right-3 pb-3 pr-6 flex items-center gap-1 bg-white rounded-xl px-2 py-1 shadow-sm">
                {productColors.slice(0, 2).map(({ raw, name }, i) => {
                  const bg = resolveColor(raw);
                  return (
                    <span
                      key={i}
                      title={name}
                      className={`w-5 h-5 rounded-full shrink-0 transition-transform group-hover:scale-110 ${isLight(bg) ? "border border-gray-300" : "border border-gray-200"}`}
                      style={{ backgroundColor: bg }}
                    />
                  );
                })}
                {productColors.length > 2 && (
                  <span className="text-[8px] font-bold text-gray-600 leading-none">
                    +{productColors.length - 2}
                  </span>
                )}
              </div>
            )}

            {/* Hover overlay — subtle bottom gradient + CTA */}
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
              <span className="text-white text-[11px] font-semibold tracking-widest uppercase border border-white/60 px-4 py-1.5 rounded-full backdrop-blur-sm translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                Quick View
              </span>
            </div>
          </div>

          {/* ── Info ── */}
          <div className="space-y-0.5">
            {/* Brand */}
            {product.brand && (
              <p className="text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase">
                {product.brand}
              </p>
            )}

            {/* Name */}
            <h3 className="text-sm font-medium text-gray-900 line-clamp-1 leading-snug">
              {product.name}
            </h3>

            {/* Rating */}
            {product.rating > 0 && product.numReviews > 0 && (
              <div className="flex items-center gap-1.5 pt-0.5">
                <div className="flex items-center gap-0.5 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                  {Number(product.rating).toFixed(1)} ★
                </div>
                <span className="text-[10px] text-gray-400">({product.numReviews})</span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-sm font-bold text-gray-900">
                ₹{Math.floor(salePrice).toLocaleString("en-IN")}
              </span>
              {hasDis && (
                <>
                  <span className="text-xs text-gray-400 line-through font-normal">
                    ₹{Math.floor(product.price).toLocaleString("en-IN")}
                  </span>
                  <span className="text-xs text-emerald-600 font-semibold">
                    {saleLive ? `${timedOffer?.offerPercentage || product.offerPercentage}% off` : `${product.offerPercentage}% off`}
                  </span>
                </>
              )}
            </div>
          </div>
        </Link>
      </div>
    );
  };

  /* ═══════════════ EDITORIAL CARD (Collections page — Raphaaa Studio design) ═══════════════ */
  const renderEditorialCard = (product) => {
    const {
      img, isNew, isPrebooking, productColors, saleLive, saleSoon,
      salePrice, hasDis, wished, outOfStock, lowStock, discountPct,
    } = deriveCard(product);

    const topBadge = outOfStock
      ? { text: "Sold Out", cls: "bg-[#444748] text-white" }
      : saleLive
      ? { text: "Sale Live", cls: "bg-[#0D8275] text-white" }
      : saleSoon
      ? { text: "Sale Soon", cls: "bg-[#E11B22] text-white" }
      : isNew
      ? { text: "New", cls: "bg-[#111111] text-white" }
      : lowStock
      ? { text: `${product.countInStock} Left`, cls: "bg-[#E11B22] text-white" }
      : hasDis
      ? { text: "Sale", cls: "bg-[#F5F5F6] text-[#111111]" }
      : null;

    return (
      <div
        key={product._id}
        className="collection-card group bg-white flex flex-col overflow-hidden relative"
        style={jakarta}
      >
        <Link to={pUrl(product)} className="block">
          {/* Image */}
          <div className="relative w-full aspect-[3/4] bg-[#FAFAFA] overflow-hidden">
            <img
              src={img}
              alt={product.name}
              loading="lazy"
              className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${outOfStock ? "opacity-60 grayscale-[30%]" : ""}`}
            />

            {topBadge && (
              <div className="absolute top-2 left-2">
                <span className={`px-2 py-1 font-bold text-[10px] uppercase tracking-wider rounded ${topBadge.cls}`}>
                  {topBadge.text}
                </span>
              </div>
            )}

            {isPrebooking && (
              <div className="absolute top-2 left-2" style={{ marginTop: topBadge ? "26px" : 0 }}>
                <span className="px-2 py-1 bg-[#111111]/90 text-white font-bold text-[10px] uppercase tracking-wider rounded">
                  Prebook
                </span>
              </div>
            )}

            {/* Wishlist */}
            <button
              onClick={(e) => toggleWish(e, product)}
              aria-pressed={wished}
              aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
              className="collection-heart absolute top-[10px] right-[10px] w-11 h-11 rounded-full flex items-center justify-center transition-colors"
              style={{ background: "rgba(255,255,255,.92)", border: "1px solid #EAEAEC" }}
            >
              <HeartIcon wished={wished} />
            </button>

            {/* Rating pill */}
            {product.rating > 0 && product.numReviews > 0 && (
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-white/90 backdrop-blur-md rounded flex items-center gap-1 shadow-sm text-[11px] font-bold text-[#111111]">
                <span>{Number(product.rating).toFixed(1)}</span>
                <IoStar className="text-[12px] text-[#0D8275]" />
                <span className="text-[#94969F] font-normal">|</span>
                <span className="text-[#94969F] font-normal">{product.numReviews}</span>
              </div>
            )}


          </div>

          {/* Details */}
          <div className="p-3 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                {product.brand && (
                  <span className="text-[13px] font-bold uppercase tracking-widest text-[#111111] truncate">
                    {product.brand}
                  </span>
                )}
                {productColors.length > 0 && (
                  <div className="flex items-center gap-1 shrink-0">
                    {productColors.slice(0, 2).map(({ raw, name }, i) => (
                      <span
                        key={i}
                        title={name}
                        className="w-2.5 h-2.5 rounded-full ring-1 ring-[#EEEEEE]"
                        style={{ backgroundColor: resolveColor(raw) }}
                      />
                    ))}
                    {productColors.length > 2 && (
                      <span className="text-[9px] font-bold text-[#94969F]">+{productColors.length - 2}</span>
                    )}
                  </div>
                )}
              </div>
              <p className="text-[13px] text-[#707072] truncate mt-0.5">{product.name}</p>
            </div>

            <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
              <span className="text-[14px] font-bold text-[#111111]">
                ₹{Math.floor(salePrice).toLocaleString("en-IN")}
              </span>
              {hasDis && (
                <>
                  <span className="text-[12px] text-[#94969F] line-through">
                    ₹{Math.floor(product.price).toLocaleString("en-IN")}
                  </span>
                  <span className="text-[12px] font-bold text-[#E11B22]">
                    ({discountPct}% OFF)
                  </span>
                </>
              )}
            </div>
          </div>
        </Link>
      </div>
    );
  };

  /* ── states ── */
  if (loading) return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-8">
      {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} />)}
    </div>
  );

  if (error) return (
    <div className="py-20 text-center text-sm text-red-500">Failed to load products.</div>
  );

  if (!loading && safe.length === 0) return (
    <div className="flex flex-col items-center justify-center py-28 text-center gap-4">

      <p className="text-base font-semibold text-gray-600">No products found</p>
      <p className="text-sm text-gray-400">Try adjusting your filters</p>
    </div>
  );

  return (
    <div>
      {/* ── Grid ── */}
      <div className={editorial ? `collection-product-grid ${wide ? "is-wide" : ""}` : "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8"}>
        {list.map((product) => editorial ? renderEditorialCard(product) : renderDefaultCard(product))}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        editorial ? (
          <div className="mt-10 pt-6 flex flex-col items-center gap-3" style={jakarta}>
            <div className="w-full max-w-xs text-center space-y-1.5">
              <span className="text-[12px] text-[#707072]">
                Showing {list.length} of {source.length} item{source.length !== 1 ? "s" : ""}
              </span>
              <div className="w-full h-1 bg-[#EEEEEE] rounded-full overflow-hidden">
                <div
                  className="bg-[#111111] h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, (page * PER_PAGE / source.length) * 100)}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                aria-label="Previous page"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-9 h-9 rounded bg-white text-[#94969F] hover:text-[#111111] flex items-center justify-center shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <HiChevronLeft className="text-sm" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => {
                const p = i + 1;
                const show = p === 1 || p === totalPages || Math.abs(p - page) <= 1;
                const ellipsis = (p === page - 2 && p > 1) || (p === page + 2 && p < totalPages);
                if (ellipsis) return <span key={i} className="text-[#94969F] text-sm px-1">···</span>;
                if (!show) return null;
                return (
                  <button
                    key={i}
                    aria-label={`Page ${p}`}
                    aria-current={page === p ? "page" : undefined}
                    onClick={() => setPage(p)}
                    className={`w-9 h-9 rounded text-[13px] font-bold flex items-center justify-center shadow-sm transition-all ${
                      page === p
                        ? "bg-[#111111] text-white"
                        : "bg-white text-[#444748] hover:bg-[#F5F5F6]"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                aria-label="Next page"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-9 h-9 rounded bg-white text-[#94969F] hover:text-[#111111] flex items-center justify-center shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <HiChevronRight className="text-sm" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1.5 mt-12 pt-8 border-t border-gray-100">
            <button
              aria-label="Previous page"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-gray-900 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <HiChevronLeft className="text-sm" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => {
              const p = i + 1;
              const show = p === 1 || p === totalPages || Math.abs(p - page) <= 1;
              const ellipsis = (p === page - 2 && p > 1) || (p === page + 2 && p < totalPages);
              if (ellipsis) return <span key={i} className="text-gray-300 text-sm px-1">···</span>;
              if (!show) return null;
              return (
                <button
                  key={i}
                  aria-label={`Page ${p}`}
                    aria-current={page === p ? "page" : undefined}
                    onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-full text-xs font-semibold transition-all
                    ${page === p
                      ? "bg-gray-900 text-white"
                      : "border border-gray-200 text-gray-600 hover:border-gray-900 hover:text-gray-900"
                    }`}
                >
                  {p}
                </button>
              );
            })}

            <button
              aria-label="Next page"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-gray-900 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <HiChevronRight className="text-sm" />
            </button>
          </div>
        )
      )}
    </div>
  );
};

export default ProductGrid;
