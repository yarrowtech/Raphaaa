import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { FiArrowRight } from "react-icons/fi";
import { BsLightningCharge, BsHeart } from "react-icons/bs";
import { FaFire, FaTimes } from "react-icons/fa";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { cachedGet } from "../../utils/httpCache";
import SearchBar from "../Common/SearchBar";
import Tshirt  from "../../assets/t-shirt.webp";
import womenImg from "../../assets/women.webp";
import casualImg from "../../assets/casual.webp";
// import classicImg from "../../assets/classic.webp";
import classicImg from "/classic.webp";
// import mensImg from "../../assets/mens-collection.jpg";
import mensImg from "/men.webp";
// import womensImg from "../../assets/womens-collection.jpg";
import womensImg from "/women.webp";
import logo from "../../assets/logo1.png";
import { MdOutlineTimer } from "react-icons/md";

const CATEGORIES = [
  { name: "T-Shirts", image: Tshirt,     slug: "search=t-shirt",                    accentFrom: "#38bdf8", accentTo: "#1d4ed8" },
  { name: "Women",    image: womenImg,    slug: "category=Top+Wear&gender=Women",    accentFrom: "#ec4899", accentTo: "#e11d48" },
  { name: "Casual",   image: casualImg,   slug: "search=casual",                     accentFrom: "#f59e0b", accentTo: "#ea580c" },
  { name: "Classic",  image: classicImg,  slug: "search=classic",                    accentFrom: "#475569", accentTo: "#1e293b" },
  { name: "Men",      image: mensImg,     slug: "gender=Men",                        accentFrom: "#0ea5e9", accentTo: "#0369a1" },
  { name: "Women",    image: womensImg,   slug: "gender=Women",                      accentFrom: "#a855f7", accentTo: "#7c3aed" },
];

function getProductImg(p) {
  return p?.colorVariants?.[0]?.images?.[0]?.url
    || p?.images?.[0]?.url
    || (typeof p?.image === "string" ? p.image : null)
    || null;
}

const MOBILE_BANNER_OVERLAY_BY_DIRECTION = {
  left: "bg-linear-to-r from-black/70 via-black/25 to-transparent",
  right: "bg-linear-to-l from-black/70 via-black/25 to-transparent",
  top: "bg-linear-to-b from-black/70 via-black/25 to-transparent",
  bottom: "bg-linear-to-t from-black/70 via-black/25 to-transparent",
};

const getMobileBannerOverlayClass = (slide) => {
  const direction = slide?.overlayDirection || slide?.overlay || "left";
  return MOBILE_BANNER_OVERLAY_BY_DIRECTION[direction] || MOBILE_BANNER_OVERLAY_BY_DIRECTION.left;
};

const getMobileBannerPositionClass = (position) => {
  if (position === "top") return "items-center pt-4";
  if (position === "center") return "items-center";
  return "items-end pb-4";
};

const getMobileBannerAlignClass = (align) => {
  if (align === "right") return "justify-center text-right";
  if (align === "center") return "justify-center text-center";
  return "justify-center text-left";
};

const normalizeHeroSlide = (slide) => ({
  image: slide.image,
  title: slide.title,
  badge: slide.badge,
  ctaText: slide.ctaText || "Shop Now",
  ctaLink: slide.ctaLink || "/collections/all",
  ctaSecondaryText: slide.ctaSecondaryText || "",
  ctaSecondaryLink: slide.ctaSecondaryLink || "",
  textAlign: slide.textAlign || slide.align || "left",
  contentPosition: slide.contentPosition || slide.position || "bottom",
  overlayDirection: slide.overlayDirection || slide.overlay || "left",
});

function slideKey(slide) {
  return [
    slide?.image || "",
    slide?.title || "",
    slide?.badge || "",
    slide?.textAlign || "",
    slide?.contentPosition || "",
  ].join("|");
}

function mergeUniqueSlides(existing, incoming) {
  const map = new Map();
  [...existing, ...incoming].forEach((slide) => {
    if (!slide) return;
    map.set(slideKey(slide), slide);
  });
  return Array.from(map.values());
}

function productKey(product) {
  return String(product?._id || product?.productId || product?.sku || product?.name || "");
}

function mergeUniqueProducts(existing, incoming) {
  const map = new Map();
  [...existing, ...incoming].forEach((product) => {
    const key = productKey(product);
    if (!key) return;
    map.set(key, product);
  });
  return Array.from(map.values());
}

function normalizeOfferProduct(product) {
  if (!product || typeof product !== "object") return null;
  return product._id ? product : null;
}

function isSaleProduct(product) {
  const price = Number(product?.price || 0);
  const discountPrice = Number(product?.discountPrice || 0);
  const offerPercentage = Number(product?.offerPercentage || 0);
  return (
    product?.timedOffer?.status === "live" ||
    product?.timedOffer?.status === "upcoming" ||
    (discountPrice > 0 && discountPrice < price) ||
    offerPercentage > 0
  );
}

function getProductUrl(p) {
  const slug = String(p?.name || "").toLowerCase().replace(/\s+/g, "-");
  return `/product/${slug}/p/${encodeURIComponent(p?._id || "")}`;
}

function fmt2(n) { return String(Math.max(0, n)).padStart(2, "0"); }

function SectionHeader({ title, link, icon }) {
  return (
    <div className="flex items-center justify-between mb-3 px-4">
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-base">{icon}</span>}
        <h2 className="text-[15px] font-bold text-gray-900">{title}</h2>
      </div>
      {link && (
        <Link
          to={link}
          className="flex items-center gap-0.5 text-[11px] font-bold text-white bg-sky-500 hover:bg-sky-600 rounded-full px-2.5 py-1 transition"
        >
          See All <FiArrowRight className="text-[10px]" />
        </Link>
      )}
    </div>
  );
}

/* ── Compact product card for horizontal rows ── */
function MiniProductCard({ product, showDiscountBadge }) {
  const img = getProductImg(product);
  const url = getProductUrl(product);
  const price = product?.discountPrice || product?.price;
  const originalPrice = product?.price;
  const hasDiscount = product?.discountPrice && product.discountPrice < originalPrice;
  const discountPct = hasDiscount
    ? Math.round(((originalPrice - product.discountPrice) / originalPrice) * 100)
    : 0;

  return (
    <Link to={url} className="shrink-0 w-36 block">
      <div className="relative rounded-2xl overflow-hidden bg-gray-100 aspect-3/4 mb-2">
        {img ? (
          <img src={img} alt={product?.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-400 text-xs">No img</span>
          </div>
        )}
        {showDiscountBadge && hasDiscount && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
            -{discountPct}%
          </span>
        )}
        {product?.isNew && !showDiscountBadge && (
          <span className="absolute top-2 left-2 bg-sky-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">New</span>
        )}
      </div>
      <p className="text-[11px] text-gray-500 leading-tight line-clamp-2 mb-0.5 px-0.5">{product?.name}</p>
      <p className="text-[13px] font-bold text-gray-900 px-0.5">₹{Math.floor(price || 0)}</p>
    </Link>
  );
}

/* ── Popular product card with heart count ── */
function PopularCard({ product, badge }) {
  const img = getProductImg(product);
  const url = getProductUrl(product);
  const price = product?.discountPrice || product?.price;
  const totalSold = Number(product?.totalSold || 0);
  const buyerCount = totalSold > 0 ? totalSold : Number(product?.ratings?.count || product?.numReviews || 0);

  return (
    <Link to={url} className="shrink-0 w-36 block snap-start">
      <div className="relative rounded-2xl overflow-hidden bg-gray-100 aspect-[3/4] mb-2">
        {img ? (
          <img
            src={img}
            alt={product?.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gray-200" />
        )}
        {badge && (
          <span className={`absolute top-2 left-2 text-white text-[9px] font-bold px-2 py-0.5 rounded-full ${
            badge === "Sale" ? "bg-emerald-500"
            : badge === "Hot" ? "bg-orange-500"
            : badge === "New" ? "bg-sky-500"
            : "bg-gray-500"
          }`}>{badge}</span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 px-1 bg-white py-1 rounded-full -mt-1">
        <p className="text-[13px] font-bold text-gray-900">₹{Math.floor(price || 0)}</p>
        <span className="flex items-center gap-0.5 text-[10px] text-gray-400 whitespace-nowrap">
          <BsHeart className="text-[10px]" />
          {buyerCount} bought
        </span>
      </div>
    </Link>
  );
}

export default function MobileHome({ activeOffer, isOfferLive }) {
  const [newArrivals, setNewArrivals] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [countdown, setCountdown] = useState({ h: "00", m: "00", s: "00" });
  const [offerBannerSlides, setOfferBannerSlides] = useState([]);

  /* fetch products + hero slides */
  useEffect(() => {
    cachedGet(
      "products:new-arrivals",
      () => axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/products/new-arrivals`),
      3 * 60 * 1000
    ).then((data) => setNewArrivals(Array.isArray(data) ? data : [])).catch(() => {});

    cachedGet(
      "products:best-seller",
      () => axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/products/best-seller`),
      5 * 60 * 1000
    ).then((data) => setBestSellers(Array.isArray(data) ? data : data?._id ? [data] : [])).catch(() => {});

    axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/hero-slides`)
      .then(({ data }) => {
        const heroSlides = Array.isArray(data) ? data : [];
        setOfferBannerSlides((prev) => {
          return mergeUniqueSlides(prev, heroSlides.map(normalizeHeroSlide));
        });
      })
      .catch(() => {});
  }, []);

  /* merge offer banner when offer data arrives */
  useEffect(() => {
    if (!activeOffer) return;
    const offerSlide = {
      image: activeOffer.bannerImage,
      title: activeOffer.title,
      pct: activeOffer.offerPercentage,
      badge: "Big Sale",
      ctaLink: "/offers",
      textAlign: activeOffer.textAlign || "left",
      contentPosition: activeOffer.contentPosition || "center",
      overlayDirection: activeOffer.overlayDirection || "left",
    };
    setOfferBannerSlides((prev) => {
      return mergeUniqueSlides(prev, [offerSlide]);
    });
  }, [activeOffer]);

  /* offer countdown */
  useEffect(() => {
    if (!activeOffer) return;
    const end = new Date(activeOffer.endDate).getTime();
    const start = new Date(activeOffer.startDate).getTime();
    const tick = () => {
      const now = Date.now();
      const target = now < start ? start : end;
      const diff = Math.max(0, Math.floor((target - now) / 1000));
      setCountdown({
        h: fmt2(Math.floor((diff % 86400) / 3600)),
        m: fmt2(Math.floor((diff % 3600) / 60)),
        s: fmt2(diff % 60),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeOffer]);

  const offerProducts = Array.isArray(activeOffer?.productIds)
    ? activeOffer.productIds.map(normalizeOfferProduct).filter(Boolean)
    : [];
  const flashSaleProducts = isOfferLive
    ? mergeUniqueProducts(
        [...offerProducts, ...newArrivals, ...bestSellers],
        []
      ).filter(
        (product) =>
          offerProducts.some((offerProduct) => productKey(offerProduct) === productKey(product)) ||
          isSaleProduct(product)
      )
    : [];
  const popularProducts = bestSellers.length ? bestSellers : newArrivals.slice(0, 6);
  const popularBadges = ["Sale", "New", "", "Hot", "New", "Sale"];

  return (
    <div className="pb-24 lg:hidden">
      {/* ── Search header ── */}
      <div className="bg-white px-4 pt-3 pb-3 flex items-center gap-3 shadow-sm">
        <Link to="/" className="shrink-0 flex items-center" aria-label="Raphaaa Home">
          <img
            src={logo}
            alt="Raphaaa"
            className="h-9 w-auto object-contain"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <SearchBar
            inline
            className="w-full"
            inputClassName="rounded-full py-2.5 pl-4 pr-12 text-sm bg-gray-100"
            placeholder="Search products..."
          />
        </div>
        {/* <button
          type="button"
          onClick={() => navigate("/collections/all")}
          className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center shrink-0"
          aria-label="Scan / Browse"
        >
          <FiCamera className="text-gray-500 text-[15px]" />
        </button> */}
      </div>

      {/* ── Banner slider ── */}
      {offerBannerSlides.length > 0 && (
        <div className="px-4 pt-4 pb-2">
          <Swiper
            loop={offerBannerSlides.length > 1}
            autoplay={{ delay: 4000, disableOnInteraction: false }}
            pagination={{ clickable: true }}
            modules={[Autoplay, Pagination]}
            className="rounded-2xl overflow-hidden mobile-home-swiper"
          >
            {offerBannerSlides.map((slide, i) => (
              <SwiperSlide key={i}>
                {(() => {
                  const isOfferBanner =
                    Boolean(activeOffer) &&
                    slide.image === activeOffer.bannerImage &&
                    slide.title === activeOffer.title;
                  const slideLink = slide.ctaLink || (isOfferBanner ? "/offers" : "/collections/all");

                  return (
                <Link
                  to={slideLink}
                  className="relative block cursor-pointer"
                  style={{ aspectRatio: "16/7" }}
                  aria-label={slide.title || slide.badge || "Banner"}
                >
                  {slide.image ? (
                    <>
                      <img
                        src={slide.image}
                        alt={slide.title || "Banner"}
                        className="w-full h-full object-cover object-center"
                        loading={i === 0 ? "eager" : "lazy"}
                      />
                      <div className={`absolute inset-0 ${getMobileBannerOverlayClass(slide)}`} />
                      <div className={`absolute inset-0 flex flex-col px-4 ${getMobileBannerPositionClass(slide.contentPosition)} ${getMobileBannerAlignClass(slide.textAlign)}`}>
                        <div className={`max-w-[78%] flex flex-col gap-0.5 ${
                          slide.textAlign === "right"
                            ? "items-end self-end text-right"
                            : slide.textAlign === "center"
                              ? "items-center self-center text-center"
                              : "items-start self-start text-left"
                        }`}>
                          <p className="text-orange-100 text-[10px] font-bold uppercase tracking-widest mb-0.5">
                            {slide.badge || "Big Sale"}
                          </p>
                          <p className="text-white text-xl font-black leading-tight drop-shadow">
                            {slide.title || activeOffer?.title || "Exclusive Deal"}
                          </p>
                          {slide.pct && (
                            <p className="text-orange-100 text-sm font-semibold mt-0.5">
                              Up to {slide.pct}% OFF
                            </p>
                          )}
                          <span className="mt-2 w-fit bg-white text-black text-[11px] font-bold px-3 py-1 rounded-full">
                            {slide.ctaText || (isOfferBanner ? "Shop Now" : "View Now")}
                          </span>
                          {slide.ctaSecondaryText ? (
                            <span className="mt-1 text-[10px] font-semibold text-orange-100/90">
                              {slide.ctaSecondaryText}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full bg-linear-to-r from-orange-500 to-amber-400 flex items-center justify-center">
                      <p className="text-white text-xl font-black">{slide.title || "Big Sale"}</p>
                    </div>
                  )}
                </Link>
                  );
                })()}
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      )}

      {/* ── Categories ── */}
      <div className="mt-4 mb-1">
        <SectionHeader title="Categories" link="/collections/all" />
        <div className="grid grid-cols-2 gap-2.5 px-4">
          {CATEGORIES.map((cat, i) => (
            <Link
              key={i}
              to={`/collections/all?${cat.slug}`}
              className="relative rounded-2xl overflow-hidden group"
              style={{ aspectRatio: "1 / 0.75" }}
            >
              <img
                src={cat.image}
                alt={cat.name}
                className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              {/* gradient overlay */}
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(to bottom, transparent 42%, rgba(0,0,0,0.72) 100%)" }}
              />
              <div className="absolute bottom-0 left-0 right-0 pb-2 pl-2.5">
                <span className="text-white text-[12px] font-bold drop-shadow">{cat.name}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Top Products (circles) ── */}
      {newArrivals.length > 0 && (
        <div className="mt-5">
          <SectionHeader title="Top Products" />
          <div className="flex gap-3 px-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {newArrivals.slice(0, 8).map((p, i) => {
              const img = getProductImg(p);
              return (
                <Link key={productKey(p) || `top-${i}`} to={getProductUrl(p)} className="shrink-0">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-sky-100 bg-gray-100">
                    {img ? (
                      <img src={img} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-gray-200" />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── New Items ── */}
      {newArrivals.length > 0 && (
        <div className="mt-5">
          <SectionHeader title="New Items" link="/collections/all?sort=newest" />
          <div className="flex gap-3 px-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            {newArrivals.slice(0, 8).map((p, i) => (
              <MiniProductCard key={productKey(p) || `new-${i}`} product={p} />
            ))}
          </div>
        </div>
      )}

      {/* ── Flash Sale ── */}
      {flashSaleProducts.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between px-4 mb-3">
            <div className="flex items-center gap-1.5">
              <FaFire className="text-orange-500 text-base" />
              <h2 className="text-[15px] font-bold text-gray-900">Flash Sale</h2>
            </div>
            {/* countdown */}
            <div className="flex items-center gap-2">
              <MdOutlineTimer className="text-orange-400 text-lg" />
              <div className="flex items-center gap-0.5 text-[11px] font-bold">
                <span className="bg-white text-blue-500 px-1.5 py-0.5 rounded">{countdown.h}</span>
                <span className="text-gray-500">:</span>
                <span className="bg-white text-blue-500 px-1.5 py-0.5 rounded">{countdown.m}</span>
                <span className="text-gray-500">:</span>
                <span className="bg-white text-blue-500 px-1.5 py-0.5 rounded">{countdown.s}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3 px-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            {flashSaleProducts.slice(0, 6).map((p, i) => (
              <MiniProductCard key={productKey(p) || `flash-${i}`} product={p} showDiscountBadge />
            ))}
          </div>
        </div>
      )}

      {/* ── Most Popular ── */}
      {popularProducts.length > 0 && (
        <div className="mt-5">
          <SectionHeader title="Most Popular" link="/collections/all?sort=popular" />
          <div
            className="flex flex-row-reverse gap-3 px-4 overflow-x-auto pb-4 snap-x snap-mandatory touch-pan-x overscroll-x-contain"
            style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
          >
            {popularProducts.slice(0, 6).map((p, i) => (
              <PopularCard key={productKey(p) || `popular-${i}`} product={p} badge={popularBadges[i] || ""} />
            ))}
          </div>
        </div>
      )}

      {/* inline swiper dot style override for white dots on colored banner */}
      <style>{`
        .mobile-home-swiper .swiper-pagination-bullet {
          background: rgba(255,255,255,0.6);
          width: 6px; height: 6px;
          opacity: 1;
        }
        .mobile-home-swiper .swiper-pagination-bullet-active {
          background: white;
          width: 18px;
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
}
