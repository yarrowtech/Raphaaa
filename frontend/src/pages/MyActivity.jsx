import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { PieChart, Pie, Cell } from "recharts";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

/* ── Status buckets ── */
const ORDERED    = ["Processing", "Packed"];
const TO_RECEIVE = ["Transfer", "Pickup Scheduled", "Picked Up", "Shipped", "In Transit", "Out For Delivery"];
const RECEIVED   = ["Delivered"];
const CANCELLED  = ["RTO Initiated", "RTO Delivered", "Refunded", "Cancelled"];

const BUCKETS = [
  { key: "ordered",   label: "Ordered",    color: "#2563eb", statuses: ORDERED },
  { key: "received",  label: "Received",   color: "#4ade80", statuses: RECEIVED },
  { key: "toReceive", label: "To Receive", color: "#fb923c", statuses: TO_RECEIVE },
  { key: "cancelled", label: "Cancelled",  color: "#ec4899", statuses: CANCELLED },
];

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const MyActivity = () => {
  const navigate = useNavigate();
  const now = new Date();
  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [orders,    setOrders]    = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("userToken");
        const { data } = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/orders/my-orders`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setOrders(Array.isArray(data) ? data : []);
      } catch {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    const today = new Date();
    if (viewYear === today.getFullYear() && viewMonth === today.getMonth()) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const monthOrders = useMemo(() => {
    return orders.filter((o) => {
      const d = new Date(o.createdAt);
      return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
    });
  }, [orders, viewYear, viewMonth]);

  const counts = useMemo(() => {
    const c = { ordered: 0, received: 0, toReceive: 0, cancelled: 0 };
    monthOrders.forEach((o) => {
      const s = o.status;
      if (ORDERED.includes(s))    c.ordered++;
      else if (RECEIVED.includes(s))   c.received++;
      else if (TO_RECEIVE.includes(s)) c.toReceive++;
      else if (CANCELLED.includes(s))  c.cancelled++;
    });
    return c;
  }, [monthOrders]);

  const total = monthOrders.length;

  const chartData = useMemo(() => {
    const data = BUCKETS.map((b) => ({ ...b, value: counts[b.key] })).filter((d) => d.value > 0);
    return data.length > 0 ? data : [{ key: "empty", label: "No orders", color: "#e5e7eb", value: 1 }];
  }, [counts]);

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  return (
    <div className="min-h-screen pb-24">

      {/* ── Back bar ── */}
      <div className="px-4 pt-5 pb-2">
        <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center shrink-0"
          >
            <FaChevronLeft className="text-sm" />
          </button>
          <p className="font-bold text-gray-900 text-sm">My Activity</p>
        </div>
      </div>

      {/* ── Main card ── */}
      <div className="mx-4 mt-3 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">

        {/* Month nav */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <button
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
          >
            <FaChevronLeft className="text-xs" />
          </button>
          <p className="text-base font-bold text-sky-600 tracking-wide">
            {MONTHS[viewMonth]} {viewYear !== now.getFullYear() ? viewYear : ""}
          </p>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className={`w-8 h-8 flex items-center justify-center rounded-full text-gray-500
              ${isCurrentMonth ? "opacity-30 cursor-not-allowed" : "hover:bg-gray-100"}`}
          >
            <FaChevronRight className="text-xs" />
          </button>
        </div>

        {/* ── Donut chart ── */}
        <div className="flex justify-center py-4">
          {loading ? (
            <div className="w-52 h-52 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full border-4 border-sky-200 border-t-sky-500 animate-spin" />
            </div>
          ) : (
            <div className="relative w-60 h-60">
              <PieChart width={240} height={240}>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={72}
                  outerRadius={108}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  paddingAngle={chartData.length > 1 ? 3 : 0}
                  cornerRadius={5}
                  stroke="none"
                >
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[12px] font-semibold text-gray-400 leading-none">Total</span>
                <span className="text-4xl font-black text-gray-900 leading-none mt-1">{total}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Status pills ── */}
        <div className="flex flex-wrap justify-center gap-2 px-5 pb-5">
          {BUCKETS.map((b) => (
            <span
              key={b.key}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-xs font-semibold"
              style={{ backgroundColor: b.color }}
            >
              {b.label} {counts[b.key]}
            </span>
          ))}
        </div>

        {/* ── Stat circles ── */}
        <div className="flex justify-center gap-5 px-6 pb-6 pt-1">
          {[
            { label: "Ordered",    value: counts.ordered,   color: "#2563eb" },
            { label: "Received",   value: counts.received,  color: "#4ade80" },
            { label: "To Receive", value: counts.toReceive, color: "#fb923c" },
            { label: "Cancelled",  value: counts.cancelled, color: "#ec4899" },
          ].filter((s) => s.value > 0 || !loading).map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-1">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-extrabold text-white shadow-sm"
                style={{ backgroundColor: stat.color }}
              >
                {loading ? "–" : stat.value}
              </div>
              <p className="text-[11px] font-semibold text-gray-500 text-center leading-tight">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── Order History button ── */}
        <div className="px-5 pb-6">
          <Link
            to="/my-orders"
            className="block w-full text-center py-3.5 rounded-2xl bg-linear-to-r from-sky-500 to-blue-600 text-white text-sm font-bold tracking-wide shadow-sm"
          >
            Order History
          </Link>
        </div>

      </div>

      {/* ── Empty month note ── */}
      {!loading && total === 0 && (
        <p className="text-center text-sm text-gray-400 mt-5 px-6">
          No orders found for {MONTHS[viewMonth]}{viewYear !== now.getFullYear() ? ` ${viewYear}` : ""}.
        </p>
      )}

    </div>
  );
};

export default MyActivity;
