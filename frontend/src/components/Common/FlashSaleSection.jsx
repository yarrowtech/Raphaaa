import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const BACKEND = import.meta.env.VITE_BACKEND_URL;

const pad = (n) => String(Math.max(0, n)).padStart(2, "0");

const Digit = ({ value, label }) => (
  <div className="flex flex-col items-center">
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-2 min-w-14 text-center">
      <span className="text-3xl font-extrabold text-white font-mono tabular-nums">{value}</span>
    </div>
    <span className="text-[10px] font-bold text-red-200 uppercase tracking-widest mt-1">{label}</span>
  </div>
);

const Colon = () => (
  <span className="text-2xl font-extrabold text-white/60 pb-4 select-none">:</span>
);

const getTimeLeft = (endDate) => {
  const diff = Math.max(0, new Date(endDate) - new Date());
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    expired: diff === 0,
  };
};

const FlashSaleSection = () => {
  const [offer, setOffer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${BACKEND}/api/offers/public`)
      .then((data) => {
        const payload = data?.data ?? data;
        const now = new Date();
        // Pick the soonest-ending active offer
        const active = (Array.isArray(payload) ? payload : [])
          .filter((o) => o.isActive !== false && !o.couponCode && new Date(o.endDate) > now)
          .sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
        setOffer(active[0] || null);
      })
      .catch(() => setOffer(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!offer) return;
    setTimeLeft(getTimeLeft(offer.endDate));
    const id = setInterval(() => {
      const t = getTimeLeft(offer.endDate);
      setTimeLeft(t);
      if (t.expired) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [offer]);

  if (loading || !offer || !timeLeft) return null;
  if (timeLeft.expired) return null;

  const discountText =
    offer.reward?.type === "percent"
      ? `${offer.reward.percent}% OFF`
      : offer.reward?.type === "flat"
      ? `₹${offer.reward.amount} OFF`
      : offer.reward?.type === "free_shipping"
      ? "FREE SHIPPING"
      : "Special Offer";

  const isLastHour =
    timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes < 60;

  return (
    <section
      className={`relative overflow-hidden py-10 px-4 ${
        isLastHour
          ? "bg-linear-to-r from-rose-600 to-orange-500"
          : "bg-linear-to-r from-red-600 to-rose-500"
      }`}
    >
      {/* Decorative blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -right-8 w-64 h-64 rounded-full bg-white/5" />
      </div>

      <div className="relative max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left — offer info */}
        <div className="text-center md:text-left">
          <div className="inline-flex items-center gap-2 bg-white/15 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-3">
            ⚡ Flash Sale
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight mb-1">
            {offer.title}
          </h2>
          <p className="text-red-100 text-sm mb-4">
            {isLastHour ? "⚠️ Last chance — sale ends very soon!" : "Limited time only. Don't miss out!"}
          </p>
          <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start">
            <span className="text-2xl font-extrabold text-yellow-300">{discountText}</span>
            {offer.conditions?.minCartSubtotal > 0 && (
              <span className="text-xs text-white/70">
                on orders above ₹{offer.conditions.minCartSubtotal.toLocaleString("en-IN")}
              </span>
            )}
          </div>
          {offer.couponCode && (
            <div className="mt-3 inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5">
              <span className="text-xs text-white/70">Code:</span>
              <span className="text-sm font-extrabold text-yellow-300 tracking-widest">{offer.couponCode}</span>
            </div>
          )}
          <Link
            to="/collections/all"
            className="mt-5 inline-block bg-white text-red-600 font-extrabold text-sm px-6 py-2.5 rounded-full hover:bg-yellow-50 transition shadow-md"
          >
            Shop Now →
          </Link>
        </div>

        {/* Right — countdown */}
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs font-bold text-red-200 uppercase tracking-widest">Ends in</p>
          <div className="flex items-end gap-2">
            {timeLeft.days > 0 && (
              <>
                <Digit value={pad(timeLeft.days)} label="Days" />
                <Colon />
              </>
            )}
            <Digit value={pad(timeLeft.hours)} label="Hours" />
            <Colon />
            <Digit value={pad(timeLeft.minutes)} label="Mins" />
            <Colon />
            <Digit value={pad(timeLeft.seconds)} label="Secs" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default FlashSaleSection;
