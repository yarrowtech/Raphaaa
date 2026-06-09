import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { toast } from "sonner";
import { FaHeart, FaTrash, FaCartPlus, FaChevronRight } from "react-icons/fa";
import { addToCart } from "../redux/slices/cartSlice";

const Wishlist = ({ embedded = false, onBack = null }) => {
  void embedded;
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);
  const [addingId, setAddingId] = useState(null);

  const getProductUrl = (item) => {
    const slug = item?.name
      ? item.name.toLowerCase().trim().replace(/\s+/g, "-")
      : String(item?._id || "");
    const sku = item?.skuCode || item?.sku || item?._id;
    return `/product/${slug}/p/${encodeURIComponent(String(sku || ""))}`;
  };

  const getDefaultCartSelection = (item) => {
    const colorVariant = item?.colorVariants?.[0];
    const sizeVariant = colorVariant?.sizes?.[0];
    return {
      color: colorVariant?.color || colorVariant?.colorName || "",
      size: sizeVariant?.size || "",
      sku: sizeVariant?.sku || item?.skuCode || item?.sku || item?._id,
    };
  };

  useEffect(() => {
    if (!user) return;
    const fetchWishlist = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/wishlist`,
          { headers: { Authorization: `Bearer ${localStorage.getItem("userToken")}` } }
        );
        setWishlistItems(Array.isArray(data) ? data : []);
      } catch {
        toast.error("Failed to load wishlist");
      } finally {
        setLoading(false);
      }
    };
    fetchWishlist();
  }, [user]);

  const removeWishlist = async (id) => {
    try {
      setRemovingId(id);
      await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/wishlist/remove/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("userToken")}` },
      });
      setWishlistItems((prev) => prev.filter((item) => item._id !== id));
      toast.success("Removed from wishlist");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove");
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddToCart = async (item) => {
    try {
      setAddingId(item._id);
      const guestId = localStorage.getItem("guestId");
      const { color, size, sku } = getDefaultCartSelection(item);
      await dispatch(
        addToCart({ productId: item._id, quantity: 1, color, size, sku, userId: user?._id, guestId })
      ).unwrap();
      toast.success("Added to cart");
    } catch (err) {
      toast.error(err?.message || "Failed to add to cart");
    } finally {
      setAddingId(null);
    }
  };

  const hasDiscount = (item) => item.discountPrice && item.discountPrice < item.price;
  const showBackBar = Boolean(onBack) || Boolean(location.state?.fromProfile);
  const handleBack = () => {
    if (typeof onBack === "function") {
      onBack();
      return;
    }
    navigate("/profile");
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 rounded-full border-4 border-sky-200 border-t-sky-500 animate-spin" />
        <p className="text-sm text-gray-400 font-medium">Loading wishlist…</p>
      </div>
    );
  }

  /* ── Empty ── */
  if (wishlistItems.length === 0) {
    return (
      <div className="min-h-screen bg-white md:bg-linear-to-b md:from-sky-50 md:via-white md:to-sky-50/30 flex flex-col">
        {showBackBar && (
          <div className="px-4 pt-4 md:pt-0 md:px-4 mb-4 md:mb-6">
            <div className="flex items-center gap-3 rounded-2xl bg-white border border-gray-100 shadow-sm px-4 py-3">
              <button
                type="button"
                onClick={handleBack}
                className="w-9 h-9 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center shrink-0"
                aria-label="Back to profile"
              >
                <FaChevronRight className="rotate-180 text-sm" />
              </button>
              <div className="min-w-0">
                <h1 className="text-sm md:text-base font-bold text-gray-900 leading-none">My Wishlist</h1>
                <p className="text-[11px] text-gray-400 mt-0.5">Back to profile</p>
              </div>
            </div>
          </div>
        )}
        <div className={`px-4 pt-8 pb-4 md:hidden ${showBackBar ? "hidden" : ""}`}>
          <h1 className="text-2xl font-black text-gray-900">Wishlist</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 pb-24">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <FaHeart className="text-3xl text-red-300" />
          </div>
          <h2 className="text-xl font-bold text-gray-700">Your wishlist is empty</h2>
          <p className="text-sm text-gray-400 mt-1 max-w-xs">Save items you like and come back to them anytime.</p>
          <Link
            to="/collections/all"
            className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-full bg-linear-to-r from-sky-500 to-blue-600 text-white text-sm font-semibold shadow-sm"
          >
            Explore Products <FaChevronRight className="text-xs" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen md:bg-linear-to-b md:from-sky-50 md:via-white md:to-sky-50/30 pb-24 md:pb-10">
      <div className="md:max-w-6xl md:mx-auto md:px-4 md:sm:px-6 md:py-8">
        {showBackBar && (
          <div className="px-4 pt-4 md:pt-0 md:px-0 mb-4 md:mb-6">
            {/* <div className="flex items-center gap-3 rounded-2xl bg-white border border-gray-100 shadow-sm px-4 py-3">
              <button
                type="button"
                onClick={handleBack}
                className="w-9 h-9 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center shrink-0"
                aria-label="Back to profile"
              >
                <FaChevronRight className="rotate-180 text-sm" />
              </button>
              <div className="min-w-0">
                <h1 className="text-sm md:text-base font-bold text-gray-900 leading-none">My Wishlist</h1>
                <p className="text-[11px] text-gray-400 mt-0.5">Back to profile</p>
              </div>
            </div> */}
          </div>
        )}

        {/* ════ MOBILE header ════ */}
        <div className={`md:hidden px-4 pt-8 pb-4 ${showBackBar ? "hidden" : ""}`}>
          <h1 className="text-2xl font-black text-gray-900">Wishlist</h1>
        </div>

        {/* ════ DESKTOP header ════ */}
        <div className={`hidden md:flex mb-6 items-center justify-between gap-4 ${showBackBar ? "hidden" : ""}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
              <FaHeart className="text-red-400 text-sm" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 leading-none">My Wishlist</h1>
              <p className="text-xs text-gray-400 mt-0.5">Saved products you can revisit anytime</p>
            </div>
          </div>
          <Link
            to="/collections/all"
            className="inline-flex items-center gap-2 text-xs font-semibold text-sky-500 hover:text-sky-600"
          >
            Continue shopping <FaChevronRight className="text-[10px]" />
          </Link>
        </div>

        {/* ════ Recently viewed — mobile only ════ */}
        <div className="md:hidden px-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[15px] font-bold text-gray-900">Recently viewed</p>
            <Link
              to="/recently-viewed"
              state={{ from: "/wishlist" }}
              className="w-8 h-8 rounded-full bg-linear-to-r from-sky-500 to-blue-600 flex items-center justify-center shadow-sm"
            >
              <FaChevronRight className="text-white text-xs" />
            </Link>
          </div>
          <div className="flex gap-2.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {wishlistItems.map((item) => {
              const img = item.colorVariants?.[0]?.images?.[0]?.url || item.images?.[0]?.url || "/placeholder.png";
              return (
                <Link key={item._id} to={getProductUrl(item)} className="shrink-0">
                  <div className="w-12 h-12 rounded-full border-2 border-gray-100 overflow-hidden bg-gray-50">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ════ Desktop item count ════ */}
        <div className="hidden md:flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-gray-500">
            {wishlistItems.length} item{wishlistItems.length !== 1 ? "s" : ""} saved
          </p>
        </div>

        {/* ════ Product list ════ */}
        <div className="space-y-3 md:space-y-4 px-4 md:px-0">
          {wishlistItems.map((item) => {
            const img        = item.colorVariants?.[0]?.images?.[0]?.url || item.images?.[0]?.url || "/placeholder.png";
            const outOfStock = item.countInStock === 0;
            const lowStock   = item.countInStock > 0 && item.countInStock < 5;
            const color      = item.colorVariants?.[0]?.color;
            const size       = item.colorVariants?.[0]?.sizes?.[0]?.size;

            return (
              <div
                key={item._id}
                onClick={() => navigate(getProductUrl(item))}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(getProductUrl(item)); }
                }}
                className="group cursor-pointer bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-50 md:border-gray-100 md:p-3 md:hover:border-sky-200 md:hover:shadow-md transition-all duration-200"
              >
                <div className="flex min-h-32.5 md:min-h-0 md:gap-4">

                  {/* ── Image ── */}
                  <div className="relative shrink-0 w-27.5 md:w-28 md:h-28 rounded-2xl md:rounded-xl overflow-hidden bg-gray-100 md:bg-gray-50 self-stretch md:self-auto">
                    <Link to={getProductUrl(item)} className="block w-full h-full" onClick={(e) => e.stopPropagation()}>
                      <img
                        src={img}
                        alt={item.name}
                        className="w-full h-full object-cover md:group-hover:scale-105 md:transition-transform md:duration-300"
                      />
                    </Link>

                    {/* Discount badge */}
                    {hasDiscount(item) && (
                      <span className="absolute top-1.5 left-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">
                        {item.offerPercentage || Math.round(100 - (item.discountPrice / item.price) * 100)}% OFF
                      </span>
                    )}

                    {/* Mobile: delete button — bottom-left of image */}
                    <button
                      onClick={(e) => { e.stopPropagation(); removeWishlist(item._id); }}
                      disabled={removingId === item._id}
                      className="md:hidden absolute bottom-2 left-2 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center disabled:opacity-50"
                    >
                      <FaTrash className="text-red-500 text-[10px]" />
                    </button>
                  </div>

                  {/* ── Content ── */}
                  <div className="flex-1 min-w-0 p-3 md:p-0 flex flex-col justify-between">

                    {/* Name / Brand */}
                    <div>
                      {/* Mobile: small gray description style */}
                      <div className="md:hidden">
                        {item.brand && (
                          <p className="text-[10px] font-bold uppercase tracking-widest text-sky-600 mb-0.5">{item.brand}</p>
                        )}
                        <p className="text-[15px] font-semibold text-gray-900 leading-snug line-clamp-2">{item.name}</p>
                      </div>
                      {/* Desktop: larger bold */}
                      <div className="hidden md:block">
                        {item.brand && <p className="text-[12px] font-bold text-sky-600 uppercase tracking-[0.18em] mb-1">{item.brand}</p>}
                        <h2 className="text-[22px] font-bold text-gray-900 leading-snug line-clamp-2 hover:text-sky-700 transition">
                          {item.name}
                        </h2>
                        {(item.category || item.gender) && (
                          <p className="text-[11px] text-gray-400 mt-0.5 capitalize">{[item.gender, item.category].filter(Boolean).join(" · ")}</p>
                        )}
                      </div>
                    </div>

                    {/* Price + actions */}
                    <div>
                      {/* Price row */}
                      <div className="flex items-baseline gap-2 mt-1 mb-2">
                        {hasDiscount(item) ? (
                          <>
                            <span className="text-xs text-gray-400 line-through">₹{item.price?.toLocaleString()}</span>
                            <span className="text-[15px] font-extrabold text-gray-900">₹{item.discountPrice?.toLocaleString()}</span>
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                              {item.offerPercentage || Math.round(100 - (item.discountPrice / item.price) * 100)}% OFF
                            </span>
                          </>
                        ) : (
                          <span className="text-[15px] font-extrabold text-gray-900">₹{item.price?.toLocaleString()}</span>
                        )}
                      </div>

                      {/* Mobile: pills + cart button */}
                      <div className="md:hidden flex items-center justify-between">
                        <div className="flex gap-1.5 flex-wrap">
                          {color && (
                            <span className="px-2.5 py-0.5 rounded-full border border-gray-200 text-[11px] font-medium text-gray-600 bg-gray-100">
                              {color}
                            </span>
                          )}
                          {size && (
                            <span className="px-2.5 py-0.5 rounded-full border border-gray-200 text-[11px] font-medium text-gray-600 bg-gray-100">
                              {size}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleAddToCart(item); }}
                          disabled={addingId === item._id}
                          className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center disabled:opacity-50 shrink-0"
                          title="Add to cart"
                        >
                          <FaCartPlus className="text-sky-600 text-base" />
                        </button>
                      </div>

                      {/* Desktop: stock badge + action buttons */}
                      <div className="hidden md:block">
                        <div className="mt-1">
                          {outOfStock ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /> Out of Stock
                            </span>
                          ) : lowStock ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" /> Only {item.countInStock} left
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> In Stock
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <Link
                            to={getProductUrl(item)}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 text-center text-xs font-bold py-2 rounded-xl bg-linear-to-r from-sky-500 to-blue-600 text-white shadow-sm"
                          >
                            View Product
                          </Link>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeWishlist(item._id); }}
                            disabled={removingId === item._id}
                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-50"
                          >
                            <FaTrash className="text-[11px]" />
                            <span>{removingId === item._id ? "Removing…" : "Remove"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleAddToCart(item); }}
                            disabled={addingId === item._id}
                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-sky-200 text-sky-600 hover:bg-sky-50 transition disabled:opacity-50"
                          >
                            <FaCartPlus className="text-[11px]" />
                            <span>{addingId === item._id ? "Adding…" : "Add to cart"}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default Wishlist;
