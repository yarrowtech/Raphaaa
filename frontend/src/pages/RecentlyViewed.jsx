import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaChevronLeft, FaChevronRight, FaCheck, FaChevronDown } from "react-icons/fa";
import axios from "axios";

/* ─── helpers ─── */
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const sameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();

const fmt = (d) =>
  d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

const fmtChip = (d) => {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getMonth()]}, ${d.getDate()}`;
};

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

const getProductUrl = (item) => {
  const slug = item?.name
    ? item.name.toLowerCase().trim().replace(/\s+/g, "-")
    : String(item?._id || "");
  const sku = item?.skuCode || item?.sku || item?._id;
  return `/product/${slug}/p/${encodeURIComponent(String(sku || ""))}`;
};

/* ─── mini Calendar component ─── */
const Calendar = ({ value, onChange, onClose }) => {
  const today = new Date();
  const [viewYear, setViewYear] = useState(value ? value.getFullYear() : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(value ? value.getMonth() : today.getMonth());

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-gray-50 rounded-2xl shadow-xl border border-gray-100 p-4 w-72">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100">
          <FaChevronLeft className="text-xs text-gray-500" />
        </button>
        <p className="text-sm font-bold text-sky-600">{MONTHS[viewMonth]} {viewYear}</p>
        <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100">
          <FaChevronRight className="text-xs text-gray-500" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const cellDate = new Date(viewYear, viewMonth, day);
          const isSelected = value && sameDay(cellDate, value);
          const isToday = sameDay(cellDate, today);
          const isFuture = cellDate > today;
          return (
            <button
              key={day}
              disabled={isFuture}
              onClick={() => { onChange(cellDate); onClose(); }}
              className={`w-8 h-8 mx-auto flex items-center justify-center rounded-full text-xs font-semibold transition
                ${isFuture ? "text-gray-200 cursor-not-allowed" : "hover:bg-sky-50"}
                ${isSelected ? "bg-sky-500 text-white hover:bg-sky-600" : ""}
                ${isToday && !isSelected ? "ring-1 ring-sky-400 text-sky-600" : ""}
                ${!isSelected && !isToday && !isFuture ? "text-gray-700" : ""}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Collapse arrow */}
      <div className="flex justify-center mt-3">
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100">
          <FaChevronDown className="text-xs text-gray-400" />
        </button>
      </div>
    </div>
  );
};

/* ─── Main page ─── */
const RecentlyViewed = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("today"); // "today" | "yesterday" | "custom"
  const [customDate, setCustomDate] = useState(null);
  const [showCal, setShowCal] = useState(false);
  const calRef = useRef(null);
  const showBackBar = Boolean(location.state?.from);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("userToken");
        if (!token) {
          setAllItems([]);
          return;
        }

        const { data } = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/recommendations/recently-viewed?limit=50`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setAllItems(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load recently viewed:", err);
        setAllItems([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // Close calendar on outside click
  useEffect(() => {
    const handler = (e) => {
      if (calRef.current && !calRef.current.contains(e.target)) setShowCal(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const today = useMemo(() => startOfDay(new Date()), []);
  const yesterday = useMemo(() => { const d = new Date(today); d.setDate(d.getDate() - 1); return d; }, [today]);

  const filteredItems = useMemo(() => {
    const targetDay =
      filter === "today" ? today :
      filter === "yesterday" ? yesterday :
      customDate ? startOfDay(customDate) : null;

    if (!targetDay) return allItems;
    return allItems.filter((item) => sameDay(new Date(item.viewedAt), targetDay));
  }, [allItems, filter, customDate, today, yesterday]);

  const getImg = (item) =>
    item.colorVariants?.[0]?.images?.[0]?.url || item.images?.[0]?.url || "/placeholder.png";

  const hasDiscount = (item) => item.discountPrice && item.discountPrice < item.price;
  const handleBack = () => {
    if (location.state?.from) {
      navigate(location.state.from);
      return;
    }
    navigate(-1);
  };

  return (
    <div className="min-h-screen pb-24">
      {showBackBar ? (
        <div className="px-4 pt-4 pb-4">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              type="button"
              onClick={handleBack}
              className="w-9 h-9 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center shrink-0"
              aria-label="Go back"
            >
              <FaChevronLeft className="text-sm" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm md:text-base font-bold text-gray-900 leading-none">Recently viewed</h1>
              <p className="text-[11px] text-gray-400 mt-0.5">Back to previous page</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 pt-8 pb-4">
          <h1 className="text-2xl font-black text-gray-900">Recently viewed</h1>
        </div>
      )}

      {/* ── Filter row ── */}
      <div className="px-4 mb-5 flex items-center gap-2 flex-wrap">

        {/* Today chip */}
        <button
          onClick={() => { setFilter("today"); setShowCal(false); }}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition border
            ${filter === "today"
              ? "bg-sky-100 border-sky-300 text-sky-700"
              : "bg-white border-gray-200 text-gray-500"}`}
        >
          Today
          {filter === "today" && (
            <span className="w-4 h-4 rounded-full bg-sky-500 flex items-center justify-center">
              <FaCheck className="text-white text-[8px]" />
            </span>
          )}
        </button>

        {/* Yesterday chip */}
        <button
          onClick={() => { setFilter("yesterday"); setShowCal(false); }}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition border
            ${filter === "yesterday"
              ? "bg-sky-100 border-sky-300 text-sky-700"
              : "bg-white border-gray-200 text-gray-500"}`}
        >
          Yesterday
          {filter === "yesterday" && (
            <span className="w-4 h-4 rounded-full bg-sky-500 flex items-center justify-center">
              <FaCheck className="text-white text-[8px]" />
            </span>
          )}
        </button>

        {/* Custom date chip */}
        <div className="relative ml-auto" ref={calRef}>
          <button
            onClick={() => setShowCal((v) => !v)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition border
              ${filter === "custom"
                ? "bg-sky-100 border-sky-300 text-sky-700"
                : "bg-white border-gray-200 text-gray-500"}`}
          >
            {filter === "custom" && customDate ? fmtChip(customDate) : "Pick date"}
            {filter === "custom" ? (
              <span className="w-4 h-4 rounded-full bg-sky-500 flex items-center justify-center">
                <FaCheck className="text-white text-[8px]" />
              </span>
            ) : (
              <FaChevronDown className="text-[10px]" />
            )}
          </button>

          {/* Calendar dropdown */}
          {showCal && (
            <div className="absolute right-0 top-10 z-50">
              <Calendar
                value={customDate}
                onChange={(d) => { setCustomDate(d); setFilter("custom"); }}
                onClose={() => setShowCal(false)}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Active date label ── */}
      <div className="px-4 mb-3">
        <p className="text-[13px] text-gray-400 font-medium">
          {filter === "today" && fmt(new Date())}
          {filter === "yesterday" && fmt(new Date(today.getTime() - 86400000))}
          {filter === "custom" && customDate && fmt(customDate)}
        </p>
      </div>

      {loading && (
        <div className="px-4 py-10 text-center text-sm text-gray-500">Loading…</div>
      )}

      {/* ── Empty state ── */}
      {!loading && filteredItems.length === 0 && (
        <div className="flex flex-col items-center justify-center pt-16 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <FaChevronLeft className="text-gray-300 text-xl" />
          </div>
          <p className="text-base font-bold text-gray-600">Nothing viewed yet</p>
          <p className="text-sm text-gray-400 mt-1 max-w-xs">
            Products you visit will appear here so you can find them again easily.
          </p>
          <Link
            to="/collections/all"
            className="mt-5 px-6 py-2.5 rounded-full bg-linear-to-r from-sky-500 to-blue-600 text-white text-sm font-semibold"
          >
            Browse products
          </Link>
        </div>
      )}

      {/* ── 2-col product grid ── */}
      {!loading && filteredItems.length > 0 && (
        <div className="px-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 md:gap-4 md:px-6">
          {filteredItems.map((item) => {
            const img = getImg(item);
            return (
              <Link
                key={`${item._id}_${item.viewedAt}`}
                to={getProductUrl(item)}
                className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 active:scale-95 transition-transform"
              >
                {/* Image */}
                <div className="relative w-full aspect-square bg-gray-100 overflow-hidden">
                  <img
                    src={img}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {hasDiscount(item) && (
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                      {item.offerPercentage
                        ? `${item.offerPercentage}%`
                        : `${Math.round(100 - (item.discountPrice / item.price) * 100)}%`} OFF
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-2.5">
                  <p className="text-sm font-semibold text-gray-700 leading-snug line-clamp-2">
                    {item.name}
                  </p>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    {hasDiscount(item) ? (
                      <>
                        <span className="text-[13px] font-extrabold text-gray-900">
                          ₹{item.discountPrice?.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-gray-400 line-through">
                          ₹{item.price?.toLocaleString()}
                        </span>
                      </>
                    ) : (
                      <span className="text-[13px] font-extrabold text-gray-900">
                        ₹{item.price?.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

    </div>
  );
};

export default RecentlyViewed;
