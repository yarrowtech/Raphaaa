import { useState } from "react";
import { Link } from "react-router-dom";
import { IoFlash } from "react-icons/io5";
import { BsImageAlt, BsHourglassSplit } from "react-icons/bs";
import { HiSparkles } from "react-icons/hi2";

const ProductCard = ({ product, badge }) => {
  const [imgError, setImgError] = useState(false);

  // The best-seller aggregation returns `image` as a string, an array of
  // strings (nested $arrayElemAt on colorVariants), or undefined.
  const resolveImage = (img) => {
    if (!img) return null;
    if (typeof img === "string") return img;
    if (Array.isArray(img)) return img[0] ?? null;
    return null;
  };

  const imageUrl =
    product?.colorVariants?.[0]?.images?.[0]?.url ||
    product?.images?.[0]?.url ||
    resolveImage(product?.image) ||
    null;

  const imageAlt =
    product?.colorVariants?.[0]?.images?.[0]?.altText ||
    product?.images?.[0]?.altText ||
    product?.name ||
    "Product";

  const hasDiscount =
    product?.discountPrice &&
    product.discountPrice > 0 &&
    product.discountPrice < product.price;

  const displayPrice = hasDiscount ? product.discountPrice : product.price;

  const isNew =
    product?.createdAt &&
    new Date() - new Date(product.createdAt) < 2 * 24 * 60 * 60 * 1000;

  const isPrebooking =
    product?.prebooking?.enabled && product.prebooking.status === "open";

  return (
    <Link
      to={`/product/${String(product?.name || "")
        .toLowerCase()
        .replace(/\s+/g, "-")}/p/${encodeURIComponent(
        product?._id
      )}`}
      className="block group"
    >
      <div className="w-full bg-white rounded-2xl border border-sky-100 shadow-sm hover:shadow-md hover:border-sky-300 transition-all duration-300 overflow-hidden flex flex-col">

        {/* ── Image ── */}
        <div className="relative aspect-3/4 overflow-hidden bg-sky-50 rounded-t-2xl">
          {imageUrl && !imgError ? (
            <img
              src={imageUrl}
              alt={imageAlt}
              loading="lazy"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            /* Placeholder when image is missing or broken */
            <div className="w-full h-full flex flex-col items-center justify-center bg-sky-50 text-sky-200">
              <BsImageAlt className="text-4xl mb-1" />
              <span className="text-[10px] text-sky-300 font-medium">No image</span>
            </div>
          )}

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

          {/* "Prebooking" ribbon badge */}
          {isPrebooking && (
            <div className="absolute bottom-7 left-0 z-10 drop-shadow-md">
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

          {/* Discount % badge */}
          {hasDiscount && product.offerPercentage > 0 && (
            <div className="absolute top-2 right-2 z-10 flex flex-col items-center justify-center bg-white border-2 border-emerald-500 text-emerald-600 rounded-full w-10 h-10 shadow-md">
              <span className="text-[10px] font-extrabold leading-none">{product.offerPercentage}%</span>
              <span className="text-[6px] font-bold leading-none">OFF</span>
            </div>
          )}

          {/* Raphaaa Assured strip at bottom */}
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2.5 py-1.5 bg-linear-to-t from-sky-900/60 to-transparent">
            <span className="flex items-center gap-1 text-white text-[9px] font-bold tracking-wide">
              <IoFlash className="text-yellow-300 text-xs shrink-0" />
              Raphaaa Assured
            </span>
            {/* Stock status */}
            {product.countInStock === 0 ? (
              <span className="text-[9px] font-bold text-red-300">Out of Stock</span>
            ) : product.countInStock > 0 && product.countInStock < 10 ? (
              <span className="text-[9px] font-bold text-orange-200">Only {product.countInStock} left</span>
            ) : null}
          </div>
        </div>

        {/* ── Info ── */}
        <div className="p-3 flex flex-col gap-1 flex-1">
          <h3 className="text-sm font-semibold text-gray-800 group-hover:text-sky-600 transition-colors truncate leading-snug">
            {product.name}
          </h3>

          {/* Price row */}
          <div className="flex items-baseline gap-2 flex-wrap mt-0.5">
            <span className="text-sky-700 font-bold text-lg leading-none">
              ₹{Math.floor(displayPrice)}
            </span>
            {hasDiscount && (
              <span className="text-gray-400 line-through text-xs">
                ₹{Math.floor(product.price)}
              </span>
            )}
          </div>

          {/* Rating */}
          {product.rating > 0 && product.numReviews > 0 && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-flex items-center gap-0.5 bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                {product.rating.toFixed(1)} ★
              </span>
              <span className="text-[10px] text-gray-400">
                {product.numReviews} reviews
              </span>
            </div>
          )}

          {/* Sold count badge */}
          {badge && (
            <p className="text-[10px] mt-0.5 font-semibold text-orange-500 line-clamp-1">
              🔥 {product.totalSold ? `${product.totalSold} sold` : "Top Pick"}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
