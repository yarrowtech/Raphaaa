import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import axios from "axios";

import heroImg   from "../../assets/heroimg.webp";
import heroImg2  from "../../assets/hero_img.webp";
import heroImg3  from "../../assets/hero3.webp";
import mensImg   from "../../assets/mens-collection.jpg";
import womensImg from "../../assets/womens-collection.jpg";
import classicImg from "../../assets/classic.webp";
import men from "/men.webp";
import women from "/women.webp";
import classic from "/classic.webp";

const DEFAULT_SLIDES = [
  {
    image: heroImg,
    badge: "New Season",
    title: "Summer\nCollection",
    subtitle: "Fresh Arrivals · 2025",
    desc: "Premium fabric. Every occasion. Limited stocks.",
    cta: "Shop Now",        ctaLink: "/collections/all",
    ctaSub: "Shop Women",   ctaSubLink: "/collections/all?gender=Women",
    align: "left",
    position: "bottom",
    overlay: "bg-linear-to-r from-sky-950/80 via-sky-900/40 to-transparent",
  },
  {
    image: heroImg2,
    badge: "Men's Edit",
    title: "Elevate\nYour Style",
    subtitle: "Men's Collection · Bold Fits",
    desc: "Classic fits and bold colours for modern life.",
    cta: "Shop Men",        ctaLink: "/collections/all?gender=Men",
    ctaSub: "View All",     ctaSubLink: "/collections/all",
    align: "right",
    position: "center",
    overlay: "bg-linear-to-l from-sky-950/80 via-sky-900/40 to-transparent",
  },
  {
    image: heroImg3,
    badge: "Limited Drop",
    title: "Exclusive\nDrops",
    subtitle: "While Stocks Last",
    desc: "Hand-picked pieces dropping every week.",
    cta: "Explore Drops",   ctaLink: "/collections/all",
    ctaSub: "New Arrivals",  ctaSubLink: "/collections/all?sort=newest",
    align: "left",
    position: "top",
    overlay: "bg-linear-to-b from-sky-950/80 via-sky-900/40 to-transparent",
  },
];

const OVERLAY_CLASS_BY_DIRECTION = {
  left: "bg-linear-to-r from-sky-950/80 via-sky-900/40 to-transparent",
  right: "bg-linear-to-l from-sky-950/80 via-sky-900/40 to-transparent",
  top: "bg-linear-to-b from-sky-950/80 via-sky-900/40 to-transparent",
  bottom: "bg-linear-to-t from-sky-950/80 via-sky-900/40 to-transparent",
};

const normalizeOverlayDirection = (slide) => {
  if (slide?.overlayDirection && OVERLAY_CLASS_BY_DIRECTION[slide.overlayDirection]) {
    return slide.overlayDirection;
  }
  const overlayColor = String(slide?.overlayColor || "");
  if (overlayColor.includes("bg-linear-to-l")) return "right";
  if (overlayColor.includes("bg-linear-to-b")) return "top";
  if (overlayColor.includes("bg-linear-to-t")) return "bottom";
  return "left";
};

const getOverlayClass = (slide) => {
  const direction = normalizeOverlayDirection(slide);
  const overlayColor = String(slide?.overlayColor || "");
  if (overlayColor.includes("bg-linear-to-")) return overlayColor;
  return OVERLAY_CLASS_BY_DIRECTION[direction];
};

const CATEGORIES = [
  { label: "Men",          icon: "👔", link: "/collections/all?gender=Men" },
  { label: "Women",        icon: "👗", link: "/collections/all?gender=Women" },
  { label: "New Arrivals", icon: "✨", link: "/collections/all?sort=newest" },
  { label: "Top Wear",     icon: "👕", link: "/collections/all?category=Top+Wear" },
  { label: "Bottom Wear",  icon: "👖", link: "/collections/all?category=Bottom+Wear" },
  { label: "Best Sellers", icon: "🔥", link: "/collections/all?sort=bestseller" },
  { label: "Sale",         icon: "🏷️", link: "/collections/all?sale=true" },
];

const PROMO = [
  { image: men,    label: "Men's Collection",  sub: "Top Wear & More",  link: "/collections/all?gender=Men",   badge: "New In" },
  { image: women,  label: "Women's Fashion",   sub: "Trending Styles",  link: "/collections/all?gender=Women", badge: "Hot" },
  { image: classic, label: "Classic Fits",      sub: "Timeless Pieces",  link: "/collections/all",              badge: "Editor's Pick" },
];

const Hero = () => {
  const [collabActive, setCollabActive] = useState(false);
  const [slides, setSlides] = useState(DEFAULT_SLIDES);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/collabs/active`)
      .then((r) => setCollabActive(r.data.isActive))
      .catch(() => {});

    // Fetch admin-managed slides from the new multi-slide API
    axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/hero-slides`)
          .then(({ data }) => {
        if (Array.isArray(data) && data.length > 0) {
          // Map DB fields → component shape
          setSlides(data.map((s) => ({
            image:       s.image,
            badge:       s.badge       || "Trending",
            title:       s.title,
            subtitle:    s.subtitle    || "",
            desc:        s.description || "",
            cta:         s.ctaText          || "Shop Now",
            ctaLink:     s.ctaLink          || "/collections/all",
            ctaSub:      s.ctaSecondaryText || "",
            ctaSubLink:  s.ctaSecondaryLink || "/collections/all",
            align:       s.textAlign   || "left",
            position:    s.contentPosition || "bottom",
            overlay:     getOverlayClass(s),
          })));
        }
      })
      .catch(() => {}); // silently fall back to DEFAULT_SLIDES
  }, []);

  if (collabActive) return null;

  return (
    <section className="w-full">

      {/* ── MAIN CAROUSEL ── */}
      <div className="relative w-full" style={{ height: "min(58vw, 640px)", minHeight: "320px" }}>
        <Swiper
          loop
          autoplay={{ delay: 4500, disableOnInteraction: false }}
          pagination={{ clickable: true }}
          navigation={{ nextEl: ".hero-next", prevEl: ".hero-prev" }}
          modules={[Autoplay, Pagination, Navigation]}
          className="w-full h-full hero-swiper"
        >
          {slides.map((slide, idx) => (
            <SwiperSlide key={idx} className="relative overflow-hidden">
              <img
                src={slide.image}
                alt={`Slide ${idx + 1}`}
                className="absolute inset-0 w-full h-full object-cover object-top"
                loading={idx === 0 ? "eager" : "lazy"}
              />

              {/* gradient */}
              <div className={`absolute inset-0 ${slide.overlay}`} />

              {/* text */}
              <div className={`absolute inset-0 flex px-4 sm:px-8 md:px-12 lg:px-24 ${
                slide.position === "top"
                  ? "items-start pt-8 sm:pt-10 md:pt-14 lg:pt-16"
                  : slide.position === "center"
                    ? "items-center py-8 sm:py-10"
                    : "items-end pb-8 sm:pb-12 md:pb-16 lg:pb-20"
              } ${
                slide.align === "right"
                  ? "justify-end text-right"
                  : slide.align === "center"
                    ? "justify-center text-center"
                    : "justify-start text-left"
              }`}>
                <div className="max-w-lg space-y-2 sm:space-y-3">
                  <span className="inline-block bg-sky-500/90 backdrop-blur-sm text-white text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                    {slide.badge}
                  </span>
                  <h1 className="text-white font-extrabold leading-[1.05] text-2xl sm:text-4xl md:text-5xl lg:text-6xl drop-shadow-lg whitespace-pre-line">
                    {slide.title}
                  </h1>
                  <p className="text-sky-200 text-xs sm:text-sm font-semibold tracking-wide">{slide.subtitle}</p>
                  <p className="text-white/75 text-xs sm:text-sm hidden sm:block leading-relaxed">{slide.desc}</p>
                  <div className={`flex flex-wrap items-center gap-2 sm:gap-3 pt-1 ${
                    slide.align === "right"
                      ? "justify-end"
                      : slide.align === "center"
                        ? "justify-center"
                        : "justify-start"
                  }`}>
                    <Link to={slide.ctaLink}
                      className="px-5 sm:px-7 py-2.5 bg-white text-sky-700 font-bold text-sm sm:text-[15px] rounded-full hover:bg-sky-50 active:scale-95 transition-all shadow-lg">
                      {slide.cta}
                    </Link>
                    <Link to={slide.ctaSubLink}
                      className="px-4 sm:px-6 py-2.5 border-2 border-white/60 text-white font-semibold text-sm sm:text-[15px] rounded-full hover:bg-white/10 active:scale-95 transition-all backdrop-blur-sm">
                      {slide.ctaSub}
                    </Link>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Arrow buttons */}
        <button className="hero-prev absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-10 w-9 h-9 sm:w-11 sm:h-11 bg-white/20 hover:bg-white/40 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center text-white transition-all">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button className="hero-next absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-10 w-9 h-9 sm:w-11 sm:h-11 bg-white/20 hover:bg-white/40 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center text-white transition-all">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <style>{`
          .hero-swiper .swiper-pagination { bottom: 12px; }
          .hero-swiper .swiper-pagination-bullet { width: 6px; height: 6px; background: rgba(255,255,255,.5); opacity: 1; transition: all .3s; }
          .hero-swiper .swiper-pagination-bullet-active { width: 22px; border-radius: 4px; background: #fff; }
          .hero-swiper .swiper-button-disabled { opacity: 0; pointer-events: none; }
        `}</style>
      </div>

      {/* ── CATEGORY PILLS ── */}
      <div className="">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5">
          <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-hide">
            {CATEGORIES.map(({ label, icon, link }) => (
              <Link key={label} to={link}
                className="flex items-center gap-1.5 shrink-0 px-4 py-2 bg-sky-50 hover:bg-sky-100 border border-sky-200 hover:border-sky-500 rounded-full text-sm font-semibold text-sky-800 transition-all group">
                <span className="text-base leading-none group-hover:scale-110 transition-transform">{icon}</span>
                {label}
              </Link>
            ))}
            <Link to="/collections/all"
              className="flex items-center gap-1 shrink-0 ml-1 px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-full text-sm font-bold transition-all">
              All
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* ── PROMO BANNER GRID ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-extrabold text-gray-800">Shop by Category</h2>
          <Link to="/collections/all" className="text-xs sm:text-sm font-semibold text-sky-600 hover:text-sky-800 flex items-center gap-1 transition-colors">
            View All
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {PROMO.map((b, idx) => (
            <Link key={idx} to={b.link}
              className="relative overflow-hidden rounded-2xl group block"
              style={{ aspectRatio: "4/3" }}>
              <img src={b.image} alt={b.label}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-linear-to-t from-sky-950/75 via-sky-900/20 to-transparent" />
              <span className="absolute top-3 left-3 bg-sky-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                {b.badge}
              </span>
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                <p className="text-white font-extrabold text-base sm:text-xl leading-tight">{b.label}</p>
                <p className="text-sky-200 text-xs sm:text-sm mt-0.5 mb-2.5">{b.sub}</p>
                <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white border border-white/50 px-3 py-1.5 rounded-full group-hover:bg-white group-hover:text-sky-700 transition-all duration-200">
                  Shop Now
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── TRUST / FEATURE STRIP ── */}
      <div className="bg-linear-to-r from-sky-600 via-sky-700 to-blue-800">
        <div className="max-w-7xl mx-auto px-4 py-3.5">
          <div className="flex items-center justify-between sm:justify-around gap-4 overflow-x-auto scrollbar-hide">
            {[
              { icon: "🚚", text: "Free Shipping ₹999+" },
              { icon: "↩️", text: "15-Day Returns" },
              { icon: "🔒", text: "Secure Payments" },
              { icon: "✅", text: "100% Authentic" },
              { icon: "🎁", text: "First Order Free" },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-2 shrink-0">
                <span className="text-base">{icon}</span>
                <span className="text-sky-100 text-xs sm:text-sm font-medium whitespace-nowrap">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </section>
  );
};

export default Hero;
