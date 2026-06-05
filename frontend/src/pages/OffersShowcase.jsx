import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { BsLightningCharge } from "react-icons/bs";
import { FiClock, FiArrowRight } from "react-icons/fi";
import { HiOutlineFire } from "react-icons/hi";

// Per-offer live countdown component
const OfferCountdown = ({ startDate, endDate }) => {
  const [time, setTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [phase, setPhase] = useState("");

  useEffect(() => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    const tick = () => {
      const now = Date.now();
      let remaining = 0;
      if (now < start) {
        setPhase("Starts in");
        remaining = start - now;
      } else if (now <= end) {
        setPhase("Ends in");
        remaining = end - now;
      } else {
        setPhase("Offer ended");
        setTime({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      const t = Math.max(0, Math.floor(remaining / 1000));
      setTime({
        days:    Math.floor(t / 86400),
        hours:   Math.floor((t % 86400) / 3600),
        minutes: Math.floor((t % 3600) / 60),
        seconds: t % 60,
      });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startDate, endDate]);

  const fmt = (n) => String(n).padStart(2, "0");
  const units = [
    { val: time.days,    label: "Days" },
    { val: time.hours,   label: "Hrs"  },
    { val: time.minutes, label: "Min"  },
    { val: time.seconds, label: "Sec"  },
  ];

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="flex items-center gap-1 text-[11px] font-bold text-sky-600 uppercase tracking-wider">
        <FiClock className="text-xs shrink-0" />
        {phase}
      </span>
      <div className="flex items-end gap-1">
        {units.map(({ val, label }, i) => (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 bg-sky-600 rounded-lg flex items-center justify-center shadow-sm shadow-sky-300/50">
                <span className="font-mono text-sm font-extrabold text-white tabular-nums">
                  {fmt(val)}
                </span>
              </div>
              <span className="text-[9px] text-gray-400 mt-0.5 font-semibold uppercase">
                {label}
              </span>
            </div>
            {i < 3 && (
              <span className="text-sky-300 font-bold text-base mb-5 mx-0.5 select-none">:</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

const OffersShowcase = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const { data } = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/offers/public`
        );
        setOffers(data.filter((o) => new Date(o.endDate) >= new Date()));
      } catch {
        toast.error("Failed to load offers");
      } finally {
        setLoading(false);
      }
    };
    fetchOffers();
  }, []);

  return (
    <div className="min-h-screen bg-linear-to-b from-sky-50 via-white to-sky-50/30">

      {/* ── Page Header ───────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-linear-to-r from-sky-500 via-sky-600 to-blue-700">
        {/* Dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.9) 1.5px, transparent 1.5px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* Light aura */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-full opacity-20 blur-3xl bg-white" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-16 text-center">
          <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest mb-5 border border-white/30">
            <BsLightningCharge /> Limited Time Deals
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-3 drop-shadow-sm">
            Hot Deals & Offers
          </h1>
          <p className="text-sky-100 text-sm md:text-base max-w-xl mx-auto">
            Grab exclusive discounts before they're gone — new deals drop regularly.
          </p>
        </div>
      </div>

      {/* ── Offers List ───────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-12">

        {/* Empty / loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-28 gap-4">
            <div className="w-10 h-10 rounded-full border-4 border-sky-200 border-t-sky-500 animate-spin" />
            <p className="text-sm text-gray-400 font-medium">Loading offers…</p>
          </div>
        )}

        {!loading && offers.length === 0 && (
          <div className="text-center py-28">
            <HiOutlineFire className="text-6xl mx-auto mb-4 text-sky-200" />
            <p className="text-lg font-bold text-gray-500">No active offers right now</p>
            <p className="text-sm text-gray-400 mt-1">
              Check back soon — new deals drop regularly!
            </p>
          </div>
        )}

        {offers.map((offer) => {
          const isLive =
            new Date() >= new Date(offer.startDate) &&
            new Date() <= new Date(offer.endDate);
          const isUpcoming = new Date() < new Date(offer.startDate);
          const bannerSrc = offer.bannerImage || offer.images?.[0]?.url || "";

          return (
            <div
              key={offer._id}
              className="bg-white rounded-3xl overflow-hidden border border-sky-100/80 shadow-lg shadow-sky-100/50"
            >
              {/* ── Banner ─────────────────────────────── */}
              {bannerSrc ? (
                <div className="relative overflow-hidden" style={{ aspectRatio: "16 / 6" }}>
                  <img
                    src={bannerSrc}
                    alt={offer.title}
                    className="w-full h-full object-cover object-center"
                  />
                  {/* Sky-blue gradient overlay */}
                  <div className="absolute inset-0 bg-linear-to-r from-sky-900/70 via-sky-800/40 to-transparent" />

                  {/* Status pill */}
                  <div className="absolute top-4 left-4 md:top-5 md:left-6">
                    {isLive ? (
                      <span className="flex items-center gap-1.5 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide shadow-md">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        Live Now
                      </span>
                    ) : isUpcoming ? (
                      <span className="flex items-center gap-1.5 bg-sky-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide border border-sky-400/40">
                        <BsLightningCharge /> Upcoming
                      </span>
                    ) : null}
                  </div>

                  {/* Title on banner */}
                  <div className="absolute bottom-5 left-5 md:bottom-7 md:left-8 max-w-lg">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white drop-shadow-md leading-tight">
                      {offer.title}
                    </h2>
                    {offer.description && (
                      <p className="text-sky-100 text-xs md:text-sm mt-1 line-clamp-2 max-w-sm">
                        {offer.description}
                      </p>
                    )}
                  </div>

                  {/* % circle badge */}
                  <div className="absolute top-4 right-4 md:top-6 md:right-8 flex flex-col items-center justify-center w-14 h-14 md:w-20 md:h-20 bg-sky-500 rounded-full border-4 border-white shadow-xl">
                    <span className="text-white font-extrabold text-base md:text-2xl leading-none">
                      {offer.offerPercentage}%
                    </span>
                    <span className="text-sky-100 text-[8px] md:text-[10px] font-bold uppercase tracking-wide">
                      OFF
                    </span>
                  </div>
                </div>
              ) : (
                /* No-image fallback header */
                <div className="relative overflow-hidden bg-linear-to-r from-sky-500 via-sky-600 to-blue-700 px-6 py-8 md:px-10">
                  <div
                    className="absolute inset-0 opacity-[0.07]"
                    style={{ backgroundImage: "radial-gradient(circle, white 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" }}
                  />
                  <div className="relative z-10 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {isLive ? (
                        <span className="flex items-center gap-1.5 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide w-fit mb-3 shadow-md">
                          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                          Live Now
                        </span>
                      ) : isUpcoming ? (
                        <span className="flex items-center gap-1.5 bg-white/20 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide w-fit mb-3 border border-white/30">
                          <BsLightningCharge /> Upcoming
                        </span>
                      ) : null}
                      <h2 className="text-2xl md:text-3xl font-extrabold text-white">{offer.title}</h2>
                      {offer.description && (
                        <p className="text-sky-100 text-sm mt-1.5 max-w-md">{offer.description}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-white/20 border-2 border-white/40 rounded-full shrink-0">
                      <span className="text-white font-extrabold text-xl md:text-2xl leading-none">
                        {offer.offerPercentage}%
                      </span>
                      <span className="text-sky-100 text-[9px] font-bold uppercase">OFF</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Details bar: dates + countdown ─────── */}
              <div className="bg-linear-to-r from-sky-50 to-blue-50 border-b border-sky-100 px-5 md:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">
                    Offer Period
                  </p>
                  <p className="text-sm font-semibold text-gray-700">
                    {new Date(offer.startDate).toLocaleDateString("en-IN", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                    <span className="text-gray-400 mx-2">—</span>
                    {new Date(offer.endDate).toLocaleDateString("en-IN", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </p>
                </div>
                <OfferCountdown startDate={offer.startDate} endDate={offer.endDate} />
              </div>

              {/* ── Product Grid ────────────────────────── */}
              <div className="p-5 md:p-8">
                <div className="flex items-center justify-between mb-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    {offer.productIds?.length ?? 0} Products in this offer
                  </p>
                  <Link
                    to="/offers"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-800 transition"
                  >
                    View all <FiArrowRight className="text-xs" />
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                  {offer.productIds?.map((product) => {
                    const img =
                      product.colorVariants?.[0]?.images?.[0]?.url ||
                      (Array.isArray(product.images) && product.images.length > 0
                        ? product.images[0].url
                        : "/placeholder.jpg");
                    const finalPrice = product.discountPrice || product.price;
                    const pct = product.offerPercentage || 0;

                    return (
                      <Link
                        key={product._id}
                        to={`/product/${product.name
                          ?.toLowerCase()
                          .replace(/\s+/g, "-")}/p/${product._id}`}
                        className="group relative bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-sky-300 hover:shadow-lg hover:shadow-sky-100/70 transition-all duration-300"
                      >
                        {/* % badge */}
                        {pct > 0 && (
                          <span className="absolute top-2 left-2 z-10 bg-sky-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                            {pct}% OFF
                          </span>
                        )}

                        {/* Image */}
                        <div className="relative aspect-3/4 overflow-hidden bg-sky-50">
                          <img
                            src={img}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>

                        {/* Info */}
                        <div className="p-3 space-y-1">
                          <h4 className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug">
                            {product.name}
                          </h4>
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="text-sm font-bold text-sky-700">
                              ₹{Math.floor(finalPrice)}
                            </span>
                            {finalPrice < product.price && (
                              <span className="text-xs text-gray-400 line-through">
                                ₹{Math.floor(product.price)}
                              </span>
                            )}
                          </div>
                          {pct > 0 && (
                            <span className="text-[10px] font-semibold text-emerald-600">
                              {pct}% off
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Shop Now CTA */}
                {isLive && (
                  <div className="mt-7 text-center">
                    <Link
                      to="/collections/all"
                      className="inline-flex items-center gap-2 bg-linear-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-md shadow-sky-200 transition active:scale-95"
                    >
                      <BsLightningCharge />
                      Shop All Deals
                      <FiArrowRight />
                    </Link>
                  </div>
                )}

                {isUpcoming && (
                  <div className="mt-6 flex items-center justify-center gap-3 bg-sky-50 border border-sky-200 rounded-2xl px-5 py-4">
                    <BsLightningCharge className="text-sky-500 text-lg shrink-0" />
                    <div className="text-sm text-sky-700 font-semibold">
                      This offer hasn't started yet. Add to your wishlist and be ready!
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OffersShowcase;
