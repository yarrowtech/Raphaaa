import React, { useEffect, useState } from "react";
import Hero from "../components/Layout/Hero";
import GenderCollectionSection from "../components/Products/GenderCollectionSection";
import NewArrivals from "../components/Products/NewArrivals";
import ProductDetails from "../components/Products/ProductDetails";
import ProductGrid from "../components/Products/ProductGrid";
import FeaturedCollection from "../components/Products/FeaturedCollection";
import FeaturesSection from "../components/Products/FeaturesSection";
import { useDispatch, useSelector } from "react-redux";
import { fetchProductsByFilters } from "../redux/slices/productsSlice";
import axios from "axios";
import BestSellersSection from "../components/Products/BestSeller";
import CategorySection from "../components/Products/CategorySection";
import Collab from "../components/Products/Collab";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import FAQ from "../components/Common/FAQ";
import PreviouslyViewed from "./PreviouslyViewed";
import { BsLightningCharge } from "react-icons/bs";
import { FiArrowRight, FiClock } from "react-icons/fi";
import { cachedGet } from "../utils/httpCache";
import MobileHome from "../components/Layout/MobileHome";

const Home = () => {
  const dispatch = useDispatch();
  const { products: _products, loading: _loading, error: _error } = useSelector((state) => state.products);
  const [bestSellerProduct, setBestSellerProduct] = useState(null);
  const [_bestSellerLoading, setBestSellerLoading] = useState(true);
  const [_bestSellerError, setBestSellerError] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [activeOffer, setActiveOffer] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    // fetch products for a specific collections
    dispatch(
      fetchProductsByFilters({
        gender: "Women",
        category: "Botton Wear",
        limit: 8,
      })
    );

    // fetch best seller product
    const fetchBestSeller = async () => {
      try {
        setBestSellerLoading(true);
        setBestSellerError(null);

        const data = await cachedGet(
          "products:best-seller",
          () => axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/products/best-seller`),
          5 * 60 * 1000
        );

        // Validate the response data
        if (data && data._id) {
          setBestSellerProduct(data);
        } else {
          setBestSellerError("Invalid best seller product data");
        }
      } catch (error) {
        console.error("Error fetching best seller:", error);
        setBestSellerError(
          error.response?.data?.message || "Failed to fetch best seller"
        );
      } finally {
        setBestSellerLoading(false);
      }
    };

    fetchBestSeller();
  }, [dispatch]);

  // Debug logging
  useEffect(() => {
    if (bestSellerProduct) {
      console.log("Best seller product:", bestSellerProduct);
      console.log("Best seller product ID:", bestSellerProduct._id);
    }
  }, [bestSellerProduct]);

  // useEffect(() => {
  //   const lastSeen = localStorage.getItem("seenOfferAlertDate");
  //   const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

  //   if (lastSeen !== today) {
  //     setShowAlert(true);
  //     localStorage.setItem("seenOfferAlertDate", today);
  //   }
  // }, []);

  useEffect(() => {
    setShowAlert(true); // show every time
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const data = await cachedGet(
          "offers:public",
          () => axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/offers/public`),
          60 * 1000
        );
        if (data.length > 0) {
          setActiveOffer(data[0]); // always show the first offer
        }
      } catch (err) {
        console.error("Failed to load active offer", err);
      }
    };
    fetchOffers();
  }, []);

  useEffect(() => {
    let timerInterval;
    if (activeOffer && new Date() < new Date(activeOffer.startDate)) {
      const start = new Date(activeOffer.startDate).getTime();

      timerInterval = setInterval(() => {
        const now = new Date().getTime();
        const distance = start - now;

        if (distance <= 0) {
          document.getElementById("offer-timer").innerText = "Now Live!";
          clearInterval(timerInterval);
          return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
          (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );
        const minutes = Math.floor(
          (distance % (1000 * 60 * 60)) / (1000 * 60)
        );
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        document.getElementById("offer-timer").innerText =
          `${days}d ${hours}h ${minutes}m ${seconds}s`;
      }, 1000);
    }

    return () => clearInterval(timerInterval);
  }, [activeOffer]);
  useEffect(() => {
    const lastSeen = localStorage.getItem("seenOfferBanner");
    const today = new Date().toISOString().slice(0, 10);
    if (lastSeen !== today) {
      setShowAlert(true);
      localStorage.setItem("seenOfferBanner", today);
    }
  }, []);

  const popupStyle = `
  @keyframes scaleIn {
    0% { transform: scale(0.6); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }

  .animate-popup {
    animation: scaleIn 0.4s ease-out;
  }
`;
  useEffect(() => {
    const styleTag = document.createElement("style");
    styleTag.innerHTML = popupStyle;
    document.head.appendChild(styleTag);

    return () => {
      document.head.removeChild(styleTag);
    };
  }, []);
  // useEffect(() => {
  //   // Delay alert appearance by 6 seconds
  //   const delay = setTimeout(() => {
  //     setShowAlert(true);
  //   }, 6000);
  //   return () => clearTimeout(delay);
  // }, []);

  useEffect(() => {
    let timer;
    if (activeOffer && new Date() < new Date(activeOffer.startDate)) {
      const start = new Date(activeOffer.startDate).getTime();
      timer = setInterval(() => {
        const now = new Date().getTime();
        const distance = start - now;

        if (distance <= 0) {
          const el = document.getElementById("alert-offer-timer");
          if (el) el.innerText = "Now Live!";
          clearInterval(timer);
          return;
        }

        const d = Math.floor(distance / (1000 * 60 * 60 * 24));
        const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);

        const el = document.getElementById("alert-offer-timer");
        if (el) el.innerText = `${d}d ${h}h ${m}m ${s}s`;
      }, 1000);
    }

    return () => clearInterval(timer);
  }, [activeOffer]);

  const offerStartTime = activeOffer ? new Date(activeOffer.startDate).getTime() : null;
  const offerEndTime = activeOffer ? new Date(activeOffer.endDate).getTime() : null;
  const isOfferLive = Boolean(
    activeOffer &&
    Number.isFinite(offerStartTime) &&
    Number.isFinite(offerEndTime) &&
    currentTime >= offerStartTime &&
    currentTime <= offerEndTime
  );
  const isOfferUpcoming = Boolean(
    activeOffer &&
    Number.isFinite(offerStartTime) &&
    currentTime < offerStartTime
  );

  const [collabActive, setCollabActive] = useState(null);

  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_BACKEND_URL}/api/collabs/active`)
      .then((res) => setCollabActive(res.data.isActive))
      .catch(() => setCollabActive(false));
  }, []);

  // Unified countdown for both phases: before start and when live
  useEffect(() => {
    if (!activeOffer) return;

    const start = new Date(activeOffer.startDate).getTime();
    const end = new Date(activeOffer.endDate).getTime();
    const fmt = (n) => String(n).padStart(2, "0");

    const tick = () => {
      const labelEl = document.getElementById("offer-phase-label");
      const dEl = document.getElementById("offer-days");
      const hEl = document.getElementById("offer-hours");
      const mEl = document.getElementById("offer-minutes");
      const sEl = document.getElementById("offer-seconds");
      if (!dEl) return;

      const now = Date.now();
      let remaining = 0;

      if (now < start) {
        if (labelEl) labelEl.textContent = "Sale starts in";
        remaining = start - now;
      } else if (now >= start && now <= end) {
        if (labelEl) labelEl.textContent = "SALE IS LIVE — ending in";
        remaining = end - now;
      } else {
        if (labelEl) labelEl.textContent = "Sale ended";
        [dEl, hEl, mEl, sEl].forEach((el) => { if (el) el.textContent = "00"; });
        return;
      }

      const totalSec = Math.max(0, Math.floor(remaining / 1000));
      if (dEl) dEl.textContent = fmt(Math.floor(totalSec / 86400));
      if (hEl) hEl.textContent = fmt(Math.floor((totalSec % 86400) / 3600));
      if (mEl) mEl.textContent = fmt(Math.floor((totalSec % 3600) / 60));
      if (sEl) sEl.textContent = fmt(totalSec % 60);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeOffer]);


  // *** If collab is active, show only FeaturedCollection ***
  // if (collabActive) {
  //   return (
  //     <div>
  //       <FeaturedCollection />
  //     </div>
  //   );
  // }

  // Wait until we know the collab status (prevents initial full-page flash)
  if (collabActive === null) return null; // or a tiny loader if you prefer

  // If collab is active, show only the FeaturedCollection drop
  if (collabActive) {
    return (
      <div>
        <FeaturedCollection />
      </div>
    );
  }

  return (
    <>
      {/* ── Mobile layout (< 1024px) ── */}
      <MobileHome activeOffer={activeOffer} isOfferLive={isOfferLive} />

      <Helmet>
        <title>Raphaaa | Premium Streetwear & Lifestyle</title>
        <meta
          name="description"
          content="Shop premium streetwear, sneakers, and exclusive collections from Raphaaa."
        />
      </Helmet>

      {/* ── Desktop / tablet layout (≥ 1024px) ── */}
      <div className="hidden lg:block">
      <div>
        {/* Hero section */}
        {/* <Collab/> */}
        {/* {showAlert && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full relative">
            <h2 className="text-xl font-bold text-blue-700 mb-2">
              🎉 Big Offer is Coming!
            </h2>
            <p className="text-gray-600 mb-4">
              Stay tuned for exciting deals during our upcoming seasonal sale!
            </p>
            <button
              onClick={() => setShowAlert(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-xl"
            >
              ×
            </button>
            <button
              onClick={() => setShowAlert(false)}
              className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-semibold transition"
            >
              Got it!
            </button>
          </div>
        </div>
      )} */}

        {activeOffer && (
          <div className="relative w-full mb-0 overflow-hidden">
            {/* Banner image */}
            {activeOffer.bannerImage ? (
              <div className="relative h-55 md:h-105 overflow-hidden">
                <img
                  src={activeOffer.bannerImage}
                  alt={activeOffer.title}
                  className="w-full h-full object-cover"
                />
                {/* Sky-blue gradient overlay */}
                <div className="absolute inset-0 bg-linear-to-r from-sky-900/75 via-sky-800/45 to-transparent" />

                {/* Content on overlay */}
                <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-14 lg:px-20">
                  <span className="inline-flex items-center gap-1.5 bg-sky-500/90 backdrop-blur-sm text-white text-[10px] md:text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-3 w-fit border border-sky-400/50">
                    <BsLightningCharge /> Exclusive Offer
                  </span>
                  <h2 className="text-2xl md:text-4xl lg:text-5xl font-extrabold text-white mb-2 drop-shadow-lg max-w-2xl leading-tight">
                    {activeOffer.title}
                  </h2>
                  <p className="text-sky-100 text-sm md:text-base mb-4">
                    Up to{" "}
                    <span className="font-extrabold text-white text-lg md:text-2xl">
                      {activeOffer.offerPercentage}% OFF
                    </span>{" "}
                    ·{" "}
                    <span className="text-sky-200 text-xs md:text-sm">
                      {new Date(activeOffer.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      {" — "}
                      {new Date(activeOffer.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </p>

                  <div className="flex items-center gap-3 flex-wrap">
                    {isOfferUpcoming && (
                      <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/25 rounded-xl px-4 py-2 text-white text-xs font-semibold">
                        <FiClock className="text-sky-300 text-sm" />
                        Starts in: <span id="offer-timer" className="ml-1 font-mono font-bold text-sky-200" />
                      </div>
                    )}
                    {isOfferLive && (
                      <Link
                        to="/offers"
                        className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-sky-900/30 transition active:scale-95"
                      >
                        Shop Now <FiArrowRight />
                      </Link>
                    )}
                  </div>
                </div>

                {/* % badge (top right) */}
                <div className="absolute top-4 right-4 md:top-8 md:right-10 flex flex-col items-center justify-center w-14 h-14 md:w-20 md:h-20 bg-sky-500 rounded-full border-4 border-white shadow-xl">
                  <span className="text-white font-extrabold text-base md:text-2xl leading-none">
                    {activeOffer.offerPercentage}%
                  </span>
                  <span className="text-sky-100 text-[8px] md:text-[10px] font-bold uppercase tracking-wide">
                    OFF
  </span>
                </div>
              </div>
            ) : (
              /* Fallback when no banner image */
              <div className="relative overflow-hidden bg-linear-to-r from-sky-600 to-blue-700 py-12 px-6 md:px-14">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
                <div className="relative z-10 max-w-2xl">
                  <span className="inline-flex items-center gap-1.5 bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-3 border border-white/30">
                    <BsLightningCharge /> Exclusive Offer
                  </span>
                  <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-2">{activeOffer.title}</h2>
                  <p className="text-sky-100 text-sm mb-4">
                    Up to <strong className="text-white text-lg">{activeOffer.offerPercentage}% OFF</strong>
                  </p>
                  {isOfferLive && (
                    <Link to="/offers" className="inline-flex items-center gap-2 bg-white text-sky-700 hover:bg-sky-50 px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg transition">
                      Shop Now <FiArrowRight />
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        {/* Countdown Section */}
        {activeOffer && (
          <div className="mt-0">
            <div className="relative overflow-hidden shadow-xl shadow-sky-300/40">
              {/* Sky-to-blue gradient background */}
              <div className="absolute inset-0 bg-linear-to-r from-sky-500 via-sky-600 to-blue-700" />
              {/* Subtle dot texture */}
              <div
                className="absolute inset-0 opacity-[0.06]"
                style={{ backgroundImage: "radial-gradient(circle, white 1.5px, transparent 1.5px)", backgroundSize: "22px 22px" }}
              />
              {/* Center glow */}
              <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/2 h-full opacity-15 blur-2xl rounded-full bg-white" />

              {/* ── 3-column layout ── */}
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 items-center gap-4 px-5 py-5 md:px-8 md:py-6">

                {/* Col 1 — Offer info */}
                <div className="text-center md:text-left space-y-1">
                  <span className="inline-flex items-center gap-1 bg-white/20 border border-white/30 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-widest">
                    <BsLightningCharge /> {activeOffer.title}
                  </span>
                  <p className="text-white font-extrabold text-xl md:text-2xl leading-tight">
                    Up to{" "}
                    <span className="text-sky-100">{activeOffer.offerPercentage}% OFF</span>
                  </p>
                  <p className="text-[10px] text-sky-200/80 font-medium">
                    {new Date(activeOffer.startDate).toLocaleString("en-GB", {
                      day: "2-digit", month: "short",
                      hour: "2-digit", minute: "2-digit",
                      hour12: false, timeZone: "Asia/Kolkata",
                    })}{" "}—{" "}
                    {new Date(activeOffer.endDate).toLocaleString("en-GB", {
                      day: "2-digit", month: "short",
                      hour: "2-digit", minute: "2-digit",
                      hour12: false, timeZone: "Asia/Kolkata",
                    })}{" IST"}
                  </p>
                </div>

                {/* Col 2 — Countdown (centered) */}
                <div className="flex flex-col items-center gap-2">
                  <p
                    id="offer-phase-label"
                    className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/70"
                  />
                  <div className="flex items-end gap-1">
                    {[
                      { id: "offer-days",    label: "Days" },
                      { id: "offer-hours",   label: "Hrs"  },
                      { id: "offer-minutes", label: "Min"  },
                      { id: "offer-seconds", label: "Sec"  },
                    ].map(({ id, label }, i) => (
                      <React.Fragment key={id}>
                        <div className="flex flex-col items-center">
                          {/* Glass tile */}
                          <div className="w-14 h-14 md:w-16 md:h-16 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30 shadow-md shadow-sky-900/20">
                            <span
                              id={id}
                              className="font-mono text-2xl md:text-3xl font-extrabold text-white tabular-nums leading-none"
                            >
                              00
                            </span>
                          </div>
                          <span className="text-[9px] text-sky-100/70 mt-1 font-bold uppercase tracking-wider">
                            {label}
                          </span>
                        </div>
                        {i < 3 && (
                          <span className="text-white/40 text-2xl font-thin mb-7 select-none leading-none">
                            :
                          </span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Col 3 — CTA (right-aligned) */}
                <div className="flex flex-col items-center md:items-end gap-3">
                  {/* Pill badge */}
                  <div className="flex items-center gap-2 bg-white/10 border border-white/25 rounded-2xl px-4 py-2.5 backdrop-blur-sm">
                    <div className="flex flex-col items-center justify-center w-10 h-10 bg-white/20 rounded-full border border-white/30">
                      <span className="text-white font-extrabold text-sm leading-none">{activeOffer.offerPercentage}%</span>
                      <span className="text-sky-100 text-[8px] font-bold uppercase">OFF</span>
                    </div>
                    <div className="text-left">
                      <p className="text-white/60 text-[9px] uppercase tracking-wider font-semibold">Save up to</p>
                      <p className="text-white font-extrabold text-base leading-none">
                        {activeOffer.offerPercentage}% Discount
                      </p>
                    </div>
                  </div>
                  {isOfferLive && (
                    <Link
                      to="/offers"
                      className="inline-flex items-center gap-2 bg-white text-sky-700 hover:bg-sky-50 px-7 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-sky-900/25 transition active:scale-95 w-full md:w-auto justify-center"
                    >
                      Shop Now <FiArrowRight />
                    </Link>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}


        <Hero />
        <CategorySection />

        {/* Gender collection section */}
        <GenderCollectionSection />

        {/* New arrivals section */}
        <NewArrivals />

        {/* Features section */}
        <FeaturesSection />

        {/* Best Sellers */}
        {/* <div className="text-center mb-8 pt-8">
        <h2 className="text-3xl font-bold inline-block relative">
          Best Seller
          <div className="mt-2 h-1 w-24 mx-auto bg-gradient-to-r from-blue-500 to-blue-200 rounded-full" />
        </h2>
      </div> */}

        {/* {bestSellerLoading ? (
        <p className="text-center">Loading Best seller product...</p>
      ) : bestSellerError ? (
        <p className="text-center text-red-500">Error: {bestSellerError}</p>
      ) : bestSellerProduct && bestSellerProduct._id ? (
        <ProductDetails productId={bestSellerProduct._id} />
      ) : (
        <p className="text-center">No best seller product found</p>
      )} */}
        <BestSellersSection />
        <FAQ />

        {/* Top wears for women */}
        {/* <div className="container mx-auto">
        <div className="text-center mb-8 pt-8">
          <h2 className="text-3xl font-bold inline-block relative">
            Top Wears for Women
            <div className="mt-2 h-1 w-28 mx-auto bg-gradient-to-r from-blue-500 to-sky-200 rounded-full" />
          </h2>
        </div> */}

        {/* Products */}
        {/* <ProductGrid products={products} loading={loading} error={error} />
      </div> */}

        {/* Feature collections */}
        <FeaturedCollection />
        <PreviouslyViewed />

        {activeOffer && showAlert && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-sky-950/50 backdrop-blur-sm px-4"
            onClick={() => setShowAlert(false)}
          >
            <div
              className="relative bg-white rounded-3xl overflow-hidden shadow-2xl shadow-sky-900/30 max-w-xs md:max-w-sm w-full animate-popup border border-sky-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header gradient */}
              <div className="bg-linear-to-r from-sky-500 to-blue-600 px-5 py-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-white text-xs font-bold uppercase tracking-widest">
                  <BsLightningCharge /> Exclusive Offer
                </span>
                <button
                  onClick={() => setShowAlert(false)}
                  className="text-white/70 hover:text-white text-lg font-bold leading-none transition"
                  title="Close"
                >
                  ✕
                </button>
              </div>

              {/* Offer image */}
              {activeOffer.alertImage && (
                <img
                  src={activeOffer.alertImage}
                  alt={activeOffer.title}
                  className="w-full max-h-64 object-contain bg-sky-50"
                />
              )}

              {/* Info + CTA */}
              <div className="px-5 py-4 text-center space-y-3">
                <div>
                  <h3 className="text-base font-extrabold text-gray-900">{activeOffer.title}</h3>
                  <p className="text-sky-600 font-bold text-2xl mt-0.5">
                    {activeOffer.offerPercentage}% OFF
                  </p>
                </div>

                {new Date() < new Date(activeOffer.startDate) ? (
                  <div className="flex items-center justify-center gap-2 bg-sky-50 border border-sky-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-sky-700">
                    <FiClock />
                    Starts in:&nbsp;
                    <span id="alert-offer-timer" className="font-mono font-bold text-sky-600" />
                  </div>
                ) : (
                  <Link
                    to="/offers"
                    onClick={() => setShowAlert(false)}
                    className="flex items-center justify-center gap-2 bg-linear-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-sky-200 transition active:scale-95"
                  >
                    Shop Now <FiArrowRight />
                  </Link>
                )}

                <button
                  onClick={() => setShowAlert(false)}
                  className="text-xs text-gray-400 hover:text-gray-600 transition"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>{/* end hidden lg:block */}
    </>
  );
};

export default Home;
