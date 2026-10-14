import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  FaShoppingCart, FaBoxOpen, FaUsers, FaRupeeSign,
  FaArrowUp, FaArrowDown,
} from "react-icons/fa";
import { fetchAllOrders } from "../redux/slices/adminOrderSlice";
import { fetchUsers }     from "../redux/slices/adminSlice";
import { fetchAdminProducts } from "../redux/slices/adminProductSlice";
import {
  AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import axios from "axios";
import { GiLetterBomb }      from "react-icons/gi";
import { LuMessageSquareText } from "react-icons/lu";
import { HiArrowRight }      from "react-icons/hi";
import { MdVerified }        from "react-icons/md";

/* ─── colour tokens ─────────────────────────────────────────── */
const STATUS_COLORS = {
  Processing: "#facc15",
  Shipped:    "#38bdf8",
  Delivered:  "#4ade80",
  Cancelled:  "#f87171",
};
const PIE_COLORS = ["#facc15", "#38bdf8", "#4ade80", "#f87171"];

/* ─── count-up hook ─────────────────────────────────────────── */
function useCountUp(end, duration = 1200) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!end) return setCount(0);
    let start = 0;
    const step = end / (duration / 16);
    const id = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(id); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(id);
  }, [end, duration]);
  return count;
}

/* ─── status badge ──────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const cfg = {
    Delivered:        "bg-emerald-100 text-emerald-700 border-emerald-200",
    Processing:       "bg-amber-100  text-amber-700  border-amber-200",
    Cancelled:        "bg-red-100    text-red-700    border-red-200",
    Shipped:          "bg-sky-100    text-sky-700    border-sky-200",
    "In Transit":     "bg-sky-100    text-sky-700    border-sky-200",
    "Out For Delivery":"bg-blue-100   text-blue-700   border-blue-200",
  }[status] || "bg-gray-100 text-gray-600 border-gray-200";

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cfg}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />{status}
    </span>
  );
};

/* ─── custom tooltip ─────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-white/10 rounded-xl px-4 py-2.5 shadow-xl text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-bold" style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════ */
const AdminHomePage = () => {
  const dispatch   = useDispatch();
  const { orders } = useSelector((s) => s.adminOrders);
  const { users }  = useSelector((s) => s.admin);
  const { user }   = useSelector((s) => s.auth);
  const { products }= useSelector((s) => s.adminProducts);

  const [totalRevenue,      setTotalRevenue]      = useState(0);
  const [subscribersCount,  setSubscribersCount]  = useState(0);
  const [messagesCount,     setMessagesCount]     = useState(0);
  const [latestMessages,    setLatestMessages]    = useState([]);
  const [chartData,         setChartData]         = useState([]);

  /* ── fetch revenue ── */
  useEffect(() => {
    if (user?.role !== "admin" && user?.role !== "merchantise") return;
    axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/orders/revenue/total`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("userToken")}` },
    }).then(({ data }) => setTotalRevenue(data.totalRevenue)).catch(() => {});
  }, [user]);

  /* ── fetch subscribers + messages ── */
  useEffect(() => {
    const token = localStorage.getItem("userToken");
    Promise.all([
      axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/subscribers`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/contact`,     { headers: { Authorization: `Bearer ${token}` } }),
    ]).then(([s, m]) => {
      setSubscribersCount(s.data.length);
      setMessagesCount(m.data.length);
      setLatestMessages(m.data.slice(0, 5));
    }).catch(() => {});
  }, []);

  /* ── fetch core data ── */
  useEffect(() => {
    dispatch(fetchAllOrders());
    dispatch(fetchUsers());
    dispatch(fetchAdminProducts());
  }, [dispatch]);

  /* ── build chart data from orders ── */
  useEffect(() => {
    const map = {};
    orders.forEach((o) => {
      const d = new Date(o.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      if (!map[d]) map[d] = { date: d, orders: 0, revenue: 0 };
      map[d].orders  += 1;
      map[d].revenue += o.totalPrice || 0;
    });
    setChartData(Object.values(map).slice(-14)); // last 14 days
  }, [orders]);

  /* ── derived counts ── */
  const orderCount   = orders.length;
  const productCount = products.length;
  const userCount    = users.length;

  const cOrders      = useCountUp(orderCount);
  const cProducts    = useCountUp(productCount);
  const cUsers       = useCountUp(userCount);
  const cSubscribers = useCountUp(subscribersCount);
  const cMessages    = useCountUp(messagesCount);
  const cRevenue     = useCountUp(Math.round(totalRevenue));

  /* ── pie data ── */
  const pieData = useMemo(() => [
    { name: "Processing", value: orders.filter(o => o.status === "Processing").length },
    {
      name: "Shipped",
      value: orders.filter(o => ["Shipped","Pickup Scheduled","Picked Up","In Transit","Out For Delivery"].includes(o.status)).length,
    },
    { name: "Delivered", value: orders.filter(o => o.status === "Delivered").length },
    { name: "Cancelled", value: orders.filter(o => o.status === "Cancelled").length },
  ], [orders]);

  const deliveredPct = useMemo(() => {
    const total = pieData.reduce((s, p) => s + p.value, 0);
    if (!total) return 0;
    return Math.round(((pieData.find(p => p.name === "Delivered")?.value || 0) / total) * 100);
  }, [pieData]);

  const weekTrend = useMemo(() => {
    if (chartData.length < 2) return 0;
    const prev = chartData[chartData.length - 2]?.orders || 0;
    const curr = chartData[chartData.length - 1]?.orders || 0;
    if (!prev) return curr > 0 ? 100 : 0;
    return +((( curr - prev) / prev) * 100).toFixed(1);
  }, [chartData]);

  /* ── greeting ── */
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const isAdmin       = user?.role === "admin";
  const isMerch       = user?.role === "merchantise";
  const isMarketing   = user?.role === "marketing";

  /* ── stat card definition ── */
  const statCards = [
    {
      show: isAdmin || isMerch,
      icon: FaShoppingCart,
      label: "Total Orders",
      value: cOrders,
      raw: orderCount,
      prefix: "",
      color: "from-emerald-500 to-teal-600",
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      trend: weekTrend,
      link: "/admin/orders",
      linkLabel: "View Orders",
    },
    {
      show: isAdmin || isMerch,
      icon: FaBoxOpen,
      label: "Total Products",
      value: cProducts,
      raw: productCount,
      prefix: "",
      color: "from-violet-500 to-purple-600",
      bg: "bg-violet-50",
      text: "text-violet-700",
      link: "/admin/products",
      linkLabel: "Manage Products",
    },
    {
      show: isAdmin,
      icon: FaUsers,
      label: "Total Users",
      value: cUsers,
      raw: userCount,
      prefix: "",
      color: "from-amber-400 to-orange-500",
      bg: "bg-amber-50",
      text: "text-amber-700",
      link: "/admin/users",
      linkLabel: "Manage Users",
    },
    {
      show: isAdmin || isMerch,
      icon: FaRupeeSign,
      label: "Total Revenue",
      value: cRevenue,
      raw: totalRevenue,
      prefix: "₹",
      color: "from-sky-500 to-blue-600",
      bg: "bg-sky-50",
      text: "text-sky-700",
      link: "/admin/revenue",
      linkLabel: "Revenue Report",
    },
    {
      show: isAdmin || isMarketing,
      icon: GiLetterBomb,
      label: "Subscribers",
      value: cSubscribers,
      raw: subscribersCount,
      prefix: "",
      color: "from-pink-500 to-rose-600",
      bg: "bg-pink-50",
      text: "text-pink-700",
      link: "/admin/subscribed-users",
      linkLabel: "View Subscribers",
    },
    {
      show: isAdmin || isMarketing,
      icon: LuMessageSquareText,
      label: "Messages",
      value: cMessages,
      raw: messagesCount,
      prefix: "",
      color: "from-indigo-500 to-blue-700",
      bg: "bg-indigo-50",
      text: "text-indigo-700",
      link: "/admin/contact-messages",
      linkLabel: "View Messages",
    },
  ].filter(c => c.show);

  /* ─────────────────── RENDER ─────────────────── */
  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{today}</p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mt-0.5">
            {greet}, <span className="text-blue-600">{user?.name?.split(" ")[0]}</span> 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5 capitalize">{user?.role?.replace("_"," ")} Dashboard</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-2.5 shadow-sm self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-gray-600">All systems operational</span>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {statCards.map(({ icon: Icon, label, value, prefix, color, trend, link, linkLabel }) => (
          <Link
            key={label}
            to={link}
            className={`group relative overflow-hidden rounded-2xl bg-linear-to-br ${color} p-5 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between min-h-40`}
          >
            {/* ── Decorative background circles ── */}
            <span className="pointer-events-none absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10 group-hover:scale-110 transition-transform duration-500" />
            <span className="pointer-events-none absolute -bottom-8 -left-4 w-24 h-24 rounded-full bg-white/8 group-hover:scale-110 transition-transform duration-700" />
            <span className="pointer-events-none absolute top-1/2 right-4 w-10 h-10 rounded-full bg-white/5" />

            {/* ── Top row: icon + trend ── */}
            <div className="flex items-start justify-between relative z-10">
              {/* Glassmorphism icon */}
              <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm border border-white/25 flex items-center justify-center shadow-sm">
                <Icon className="text-white text-lg" />
              </div>

              {/* Trend badge */}
              {trend != null && (
                <span className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm ${
                  trend >= 0
                    ? "bg-white/20 text-white border border-white/20"
                    : "bg-black/15 text-white/90 border border-white/10"
                }`}>
                  {trend >= 0
                    ? <FaArrowUp className="text-[9px]" />
                    : <FaArrowDown className="text-[9px]" />
                  }
                  {Math.abs(trend)}%
                </span>
              )}
            </div>

            {/* ── Bottom: label + number + link ── */}
            <div className="relative z-10 mt-4">
              <p className="text-white/70 text-[11px] font-semibold uppercase tracking-widest mb-1">{label}</p>
              <p className="text-white text-3xl font-extrabold leading-none tracking-tight drop-shadow-sm">
                {prefix}{value?.toLocaleString()}
              </p>

              {/* Divider */}
              <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between">
                <span className="text-white/70 text-xs font-medium">{linkLabel}</span>
                <span className="w-6 h-6 rounded-full bg-white/20 border border-white/20 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                  <HiArrowRight className="text-white text-xs" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Charts row ── */}
      {(isAdmin || isMerch) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Area chart — spans 2 cols */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-gray-800">Order Trends</h3>
                <p className="text-xs text-gray-400 mt-0.5">Last 14 days</p>
              </div>
              <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border ${
                weekTrend >= 0
                  ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                  : "bg-red-50 text-red-600 border-red-100"
              }`}>
                {weekTrend >= 0 ? <FaArrowUp className="text-[10px]" /> : <FaArrowDown className="text-[10px]" />}
                {Math.abs(weekTrend)}% this week
              </span>
            </div>

            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                    fontSize: "12px",
                  }}
                  itemStyle={{ color: "#1e40af", fontWeight: 600 }}
                  labelStyle={{ color: "#64748b", marginBottom: 4 }}
                />
                <Area
                  type="monotone" dataKey="orders" name="Orders"
                  stroke="#3b82f6" strokeWidth={2.5}
                  fill="url(#ordersGrad)"
                  dot={false} activeDot={{ r: 5, fill: "#3b82f6", stroke: "#fff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Donut chart */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-gray-800">Order Status</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                <span className="text-emerald-600 font-bold">{deliveredPct}%</span> delivered
              </p>
            </div>

            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData} cx="50%" cy="50%"
                  innerRadius={55} outerRadius={80}
                  paddingAngle={3} dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} stroke="#fff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                    fontSize: "12px",
                  }}
                  itemStyle={{ fontWeight: 600 }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="space-y-2 mt-2">
              {pieData.map((p, i) => (
                <div key={p.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i] }} />
                    <span className="text-gray-500">{p.name}</span>
                  </div>
                  <span className="font-bold text-gray-700">{p.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Recent Orders table ── */}
      {(isAdmin || isMerch) && orders.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-gray-800">Recent Orders</h3>
              <p className="text-xs text-gray-400 mt-0.5">Last 5 orders placed</p>
            </div>
            <Link to="/admin/orders" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition">
              View all <HiArrowRight />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  <th className="px-5 py-3 text-left">Order ID</th>
                  <th className="px-5 py-3 text-left">Customer</th>
                  <th className="px-5 py-3 text-left">Amount</th>
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.slice(0, 5).map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs text-gray-400">#{order._id.slice(-8).toUpperCase()}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-linear-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                          {(order.user?.name || "?")[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-800 truncate max-w-30">
                          {order.user?.name || "Unknown"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-gray-900">
                      ₹{order.totalPrice?.toLocaleString("en-IN") || 0}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={order.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Bottom row: Recent Users + Messages ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Recent user signups */}
        {(isAdmin) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-800">New Signups</h3>
                <p className="text-xs text-gray-400 mt-0.5">Latest registered users</p>
              </div>
              <Link to="/admin/users" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition">
                All users <HiArrowRight />
              </Link>
            </div>

            <div className="divide-y divide-gray-50">
              {users.slice(-5).reverse().map((u) => (
                <div key={u._id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition">
                  <div className="w-8 h-8 rounded-xl bg-linear-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {(u.name || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-semibold text-gray-800 truncate">{u.name}</p>
                      {u.role === "admin" && <MdVerified className="text-blue-500 text-xs shrink-0" />}
                    </div>
                    <p className="text-[11px] text-gray-400 truncate">{u.email}</p>
                  </div>
                  <p className="text-[11px] text-gray-300 shrink-0">
                    {new Date(u.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                  </p>
                </div>
              ))}
              {users.length === 0 && (
                <p className="px-5 py-6 text-center text-xs text-gray-400">No users yet.</p>
              )}
            </div>
          </div>
        )}

        {/* Latest messages */}
        {(isAdmin || isMarketing) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-800">Contact Messages</h3>
                <p className="text-xs text-gray-400 mt-0.5">Latest 5 enquiries</p>
              </div>
              <Link to="/admin/contact-messages" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition">
                View all <HiArrowRight />
              </Link>
            </div>

            <div className="divide-y divide-gray-50">
              {latestMessages.map((msg) => (
                <div key={msg._id} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition">
                  <div className="w-8 h-8 rounded-xl bg-linear-to-br from-indigo-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                    {(msg.name || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-800 truncate">{msg.name}</p>
                      <p className="text-[11px] text-gray-300 shrink-0">
                        {new Date(msg.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{msg.subject || "No subject"}</p>
                  </div>
                </div>
              ))}
              {latestMessages.length === 0 && (
                <p className="px-5 py-6 text-center text-xs text-gray-400">No messages yet.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminHomePage;
