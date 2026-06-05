import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import demoImg from "../../assets/login.jpg";
import { AiOutlineHeart, AiFillHeart } from "react-icons/ai";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi2";
import axios from "axios";
import { toast } from "sonner";
import { formatCountdown, isSaleLive, isSaleUpcoming } from "../../utils/offerCountdown";

/* ── Skeleton ── */
const Skeleton = () => (
  <div className="animate-pulse">
    <div className="bg-gray-100 rounded-none w-full aspect-3/4 mb-3" />
    <div className="h-2.5 bg-gray-100 rounded w-1/4 mb-2" />
    <div className="h-3.5 bg-gray-100 rounded w-3/4 mb-1.5" />
    <div className="h-3 bg-gray-100 rounded w-1/2" />
  </div>
);

const ProductGrid = ({ products = [], loading, error }) => {
  const [page,          setPage]          = useState(1);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [publicOffers, setPublicOffers] = useState([]);
  const [now, setNow] = useState(Date.now());
  const navigate   = useNavigate();
  const { search } = useLocation();
  const sortBy     = useMemo(() => new URLSearchParams(search).get("sortBy"), [search]);

  const PER_PAGE = 12;

  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const safe     = Array.isArray(products) ? products : [];
  const doShuffle = !sortBy || sortBy === "default" || sortBy === "none";
  const source    = useMemo(() => (doShuffle ? shuffle(safe) : safe), [safe, doShuffle]);
  const totalPages = Math.ceil(source.length / PER_PAGE);
  const list       = source.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  useEffect(() => { setPage(1); }, [search, safe.length]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/offers/public`)
      .then((res) => setPublicOffers(Array.isArray(res.data) ? res.data : []))
      .catch(() => setPublicOffers([]));
  }, []);

  /* ── wishlist ── */
  useEffect(() => {
    const token = localStorage.getItem("userToken");
    if (!token) return;
    axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/wishlist`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => setWishlistItems(r.data)).catch(() => {});
  }, []);

  const inWishlist = (id) => wishlistItems.some((i) => i._id === id);

  const toggleWish = async (e, product) => {
    e.preventDefault(); e.stopPropagation();
    const token = localStorage.getItem("userToken");
    if (!token) { toast.warning("Please login"); navigate("/login"); return; }
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
  };

  const pUrl = (p) =>
    `/product/${p.name.toLowerCase().replace(/\s+/g, "-")}/p/${p._id}`;

  const getColorVariantCount = (product) => {
    if (Array.isArray(product?.colorVariants) && product.colorVariants.length > 0) {
      return new Set(product.colorVariants.map((variant) => String(variant?.color || "").trim()).filter(Boolean)).size;
    }

    if (Array.isArray(product?.variants) && product.variants.length > 0) {
      return new Set(product.variants.map((variant) => String(variant?.color || "").trim()).filter(Boolean)).size;
    }

    return 0;
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
      <img
        src="https://i.gifer.com/7VE.gif"
        alt="No products"
        className="w-60 h-60 object-contain"
      />
      <p className="text-base font-semibold text-gray-600">No products found</p>
      <p className="text-sm text-gray-400">Try adjusting your filters</p>
    </div>
  );

  return (
    <div>
      {/* ── Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
        {list.map((product) => {
          const img        = product.colorVariants?.[0]?.images?.[0]?.url || product.images?.[0]?.url || demoImg;
          const isNew      = Date.now() - new Date(product.createdAt).getTime() < 2 * 24 * 60 * 60 * 1000;
          const colorVariantCount = getColorVariantCount(product);
          const timedOffer = resolveOfferForProduct(product);
          const saleLive   = isSaleLive(timedOffer);
          const saleSoon   = isSaleUpcoming(timedOffer);
          const salePrice   = saleLive ? Number(timedOffer?.discountPrice || product.price) : Number(product.discountPrice || product.price);
          const hasDis     = saleLive
            ? Number(timedOffer?.discountPrice || 0) < Number(product.price || 0)
            : !timedOffer && product.discountPrice && product.discountPrice < product.price;
          const wished     = inWishlist(product._id);
          const outOfStock = product.countInStock === 0;
          const lowStock   = !outOfStock && product.countInStock < 5;
          const badgeText = saleLive
            ? "Sale is live now"
            : saleSoon
            ? `💥 Sale starts in ${formatCountdown(timedOffer?.startsAt, now)}`
            : hasDis
            ? `${product.offerPercentage}% off`
            : "";

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

                  {/* Badges top-left */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                    {isNew && (
                      <span className="bg-black text-white text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-sm">
                        New
                      </span>
                    )}
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
                    {!timedOffer && hasDis && (
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

                  {colorVariantCount > 0 && (
                    <div className="absolute bottom-3 right-3 z-10 rounded-full bg-black/75 backdrop-blur-sm px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-white border border-white/10 shadow-lg">
                      {colorVariantCount === 2
                        ? "2 variants"
                        : colorVariantCount > 2
                        ? "2+ variants available"
                        : "1 variant"}
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
                        {product.rating.toFixed(1)} ★
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
        })}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-12 pt-8 border-t border-gray-100">
          <button
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
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-gray-900 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <HiChevronRight className="text-sm" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductGrid;
