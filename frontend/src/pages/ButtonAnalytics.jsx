import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FiRefreshCw, FiDownload } from "react-icons/fi";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell,
} from "recharts";

const METRICS = [
  { key: "uniqueVisitors",   label: "Unique visitors",   color: "#6366f1", hint: "People who opened the site" },
  { key: "pageViews",        label: "Page views",        color: "#0ea5e9", hint: "Every page opened by visitors" },
  { key: "linkVisits",       label: "Link visits",       color: "#f59e0b", hint: "Arrived through a coupon or campaign link" },
  { key: "clicks",           label: "Clicks",            color: "#ec4899", hint: "Buttons and links tapped" },
  { key: "logins",           label: "Logins",            color: "#10b981", hint: "Successful sign-ins" },
  { key: "signups",          label: "Sign-ups",          color: "#8b5cf6", hint: "New accounts created" },
  { key: "productViews",     label: "Product views",     color: "#14b8a6", hint: "Product pages opened" },
  { key: "checkoutAttempts", label: "Checkout attempts", color: "#f97316", hint: "Visitors who started a checkout" },
];

const FUNNEL_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f97316"];
const DEVICE_COLORS = { desktop: "#0ea5e9", mobile: "#6366f1", tablet: "#f59e0b" };
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const fmtDay = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

const Card = ({ title, subtitle, children, className = "" }) => (
  <div className={`bg-white rounded-2xl p-5 ${className}`}>
    {title && <h3 className="text-[15px] font-bold text-gray-900">{title}</h3>}
    {subtitle && <p className="text-xs text-gray-500 mt-0.5 mb-4">{subtitle}</p>}
    {children}
  </div>
);

const ChangeBadge = ({ current, previous }) => {
  let text;
  if (!previous) text = current ? "New" : "0%";
  else {
    const diff = Math.round(((current - previous) / previous) * 100);
    text = `${diff > 0 ? "+" : ""}${diff}%`;
  }
  const cls =
    text === "New" ? "bg-indigo-100 text-indigo-500"
    : text.startsWith("+") ? "bg-emerald-50 text-emerald-600"
    : text.startsWith("-") ? "bg-rose-50 text-rose-500"
    : "bg-white text-gray-500";
  return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>{text}</span>;
};

const BarList = ({ rows, color, empty }) =>
  rows?.length ? (
    <div className="space-y-4">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-center justify-between text-[13px] font-semibold text-gray-900 mb-1.5">
            <span className="truncate pr-3">{r.label}</span>
            <span>{r.count}</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(pct(r.count, rows[0].count), 2)}%`, background: color }}
            />
          </div>
        </div>
      ))}
    </div>
  ) : (
    <p className="text-sm text-gray-400">{empty}</p>
  );

const FunnelList = ({ steps, colors }) => (
  <div className="space-y-4">
    {steps.map((s, i) => (
      <div key={s.label}>
        <div className="flex items-center justify-between text-[13px] font-semibold text-gray-900 mb-1.5">
          <span>{s.label}</span>
          <span className="flex items-center gap-2">
            {s.count}
            {i > 0 && (
              <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 rounded-md px-1.5 py-0.5">
                {pct(s.count, steps[i - 1].count)}%
              </span>
            )}
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${steps[0].count ? Math.max(pct(s.count, steps[0].count), s.count ? 3 : 0) : 0}%`,
              background: colors[i % colors.length],
            }}
          />
        </div>
      </div>
    ))}
  </div>
);

const ButtonAnalytics = () => {
  const [days, setDays] = useState(7);
  const [metric, setMetric] = useState("uniqueVisitors");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: res } = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/admin/analytics/site`,
        {
          params: { days, tz: new Date().getTimezoneOffset() },
          headers: { Authorization: `Bearer ${localStorage.getItem("userToken")}` },
        }
      );
      setData(res);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const active = METRICS.find((m) => m.key === metric);
  const series = useMemo(
    () => (data?.series || []).map((d) => ({ ...d, label: fmtDay(d.date) })),
    [data]
  );

  const heatMax = useMemo(() => Math.max(1, ...(data?.heatmap || []).flat()), [data]);
  const busiest = useMemo(() => {
    let best = null;
    (data?.heatmap || []).forEach((row, d) =>
      row.forEach((v, h) => { if (v && (!best || v > best.v)) best = { d, h, v }; })
    );
    return best;
  }, [data]);

  const downloadCsv = () => {
    if (!data) return;
    const header = ["date", ...METRICS.map((m) => m.key), "newsletter"];
    const lines = data.series.map((r) => header.map((k) => r[k] ?? 0).join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `raphaaa-analytics-${days}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const devices = data?.audience?.devices || {};
  const deviceTotal = Object.values(devices).reduce((s, v) => s + v, 0);
  const pieData = Object.entries(devices).map(([name, value]) => ({ name, value }));

  return (
    <div className="bg-gray-100 rounded-3xl p-4 sm:p-6 space-y-5 min-h-full">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-md">
            Traffic, link visits, clicks and logins. Admin and staff dashboard pages are excluded.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-2 bg-white rounded-full px-3 py-1.5 text-xs font-semibold text-emerald-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {data?.onlineNow ?? 0} online now
          </span>
          <div className="flex bg-gray-200/70 rounded-xl p-1">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  days === d ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {d} days
              </button>
            ))}
          </div>
          <button onClick={load} title="Refresh" className="w-9 h-9 flex items-center justify-center bg-white rounded-xl text-gray-700 hover:bg-gray-50">
            <FiRefreshCw className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={downloadCsv} title="Download CSV" className="w-9 h-9 flex items-center justify-center bg-white rounded-xl text-gray-700 hover:bg-gray-50">
            <FiDownload />
          </button>
        </div>
      </div>

      {error && <div className="bg-rose-50 text-rose-600 text-sm rounded-xl px-4 py-3">{error}</div>}

      {/* Metric tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key)}
            className={`text-left rounded-2xl p-5 bg-gray-200/60 border-2 transition ${
              metric === m.key ? "border-indigo-500" : "border-transparent hover:border-gray-300"
            }`}
          >
            <p className="text-sm font-medium text-gray-800">{m.label}</p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-5xl font-extrabold tracking-tight" style={{ color: m.color }}>
                {data?.totals?.[m.key] ?? 0}
              </span>
              <ChangeBadge current={data?.totals?.[m.key] || 0} previous={data?.previous?.[m.key] || 0} />
            </div>
            <p className="text-xs text-gray-500 mt-2">{m.hint}</p>
          </button>
        ))}
      </div>

      {/* Over time */}
      <Card>
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-[15px] font-bold text-gray-900">{active.label} over time</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {data?.totals?.[metric] ?? 0} in the last {days} days
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => setMetric(m.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                  metric === m.key
                    ? "bg-indigo-500 border-indigo-500 text-white"
                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="baFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={active.color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={active.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} minTickGap={20} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey={metric} name={active.label} stroke={active.color} strokeWidth={2} fill="url(#baFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Funnel + audience */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Conversion funnel" subtitle="How visitors move from landing to checkout">
          <FunnelList steps={data?.funnel || []} colors={FUNNEL_COLORS} />
        </Card>
        <Card title="Audience" subtitle="Devices and returning visitors">
          <div className="flex items-center justify-center gap-8 flex-wrap">
            <div className="relative w-36 h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceTotal ? pieData : [{ name: "none", value: 1 }]}
                    dataKey="value"
                    innerRadius={50}
                    outerRadius={66}
                    stroke="#fff"
                    strokeWidth={2}
                    startAngle={90}
                    endAngle={-270}
                  >
                    {(deviceTotal ? pieData : [{ name: "none" }]).map((d) => (
                      <Cell key={d.name} fill={DEVICE_COLORS[d.name] || "#e5e7eb"} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold text-gray-900">{data?.audience?.visitors ?? 0}</span>
                <span className="text-[10px] font-semibold tracking-widest text-gray-500">VISITORS</span>
              </div>
            </div>
            <div className="space-y-2">
              {["desktop", "mobile", "tablet"].map((k) => (
                <div key={k} className="flex items-center gap-3 text-[13px] font-semibold text-gray-800">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: DEVICE_COLORS[k] }} />
                  <span className="w-20 capitalize">{k}</span>
                  <span>{pct(devices[k] || 0, deviceTotal)}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {[
              ["New", data?.audience?.newVisitors],
              ["Returning", data?.audience?.returning],
              ["Signed in", data?.audience?.signedIn],
              ["Sessions", data?.audience?.sessions],
            ].map(([label, v]) => (
              <div key={label} className="bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="text-[11px] text-gray-500">{label}</p>
                <p className="text-lg font-bold text-gray-900">{v ?? 0}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Top pages" subtitle="By page views">
          <BarList rows={data?.topPages} color="#6366f1" empty="No page views yet." />
        </Card>
        <Card title="Traffic sources" subtitle="Where visitors come from">
          <BarList rows={data?.sources} color="#0ea5e9" empty="No traffic yet." />
        </Card>
        <Card title="Coupon and campaign links" subtitle="Visits through shared links">
          <BarList rows={data?.campaigns} color="#f59e0b" empty="No campaign link visits yet." />
        </Card>
        <Card title="Most clicked" subtitle="Buttons and links">
          <BarList rows={data?.topClicks} color="#ec4899" empty="No clicks yet." />
        </Card>
      </div>

      {/* Peak hours */}
      <Card title="Peak hours" subtitle="Page views by day and hour (your local time)">
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[40px_repeat(24,1fr)] gap-1 mb-1">
              <span />
              {Array.from({ length: 24 }, (_, h) => (
                <span key={h} className="text-[10px] font-semibold text-gray-500">
                  {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
                </span>
              ))}
            </div>
            {DAYS.map((day, d) => (
              <div key={day} className="grid grid-cols-[40px_repeat(24,1fr)] gap-1 mb-1">
                <span className="text-[11px] font-semibold text-gray-500 self-center">{day}</span>
                {(data?.heatmap?.[d] || Array(24).fill(0)).map((v, h) => (
                  <div
                    key={h}
                    title={`${day} ${String(h).padStart(2, "0")}:00 — ${v} page views`}
                    className="h-9 rounded-md"
                    style={{
                      background: v ? `rgba(99,102,241,${0.15 + 0.85 * (v / heatMax)})` : "#f3f4f6",
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Busiest:{" "}
          {busiest ? (
            <>
              <b className="text-gray-900">{DAYS[busiest.d]} {String(busiest.h).padStart(2, "0")}:00</b> ({busiest.v} page views)
            </>
          ) : "—"}
        </p>
      </Card>

      {/* Newsletter + order funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Newsletter growth" subtitle={`${data?.newsletter?.total ?? 0} new in this period`}>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="nlFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} minTickGap={20} />
                <YAxis allowDecimals={false} domain={[0, (max) => Math.max(4, max)]} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="newsletter" name="Subscribers" stroke="#10b981" strokeWidth={2} fill="url(#nlFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Order funnel" subtitle="Checkouts and orders in this period">
          <FunnelList steps={data?.orderFunnel || []} colors={["#6366f1", "#0ea5e9", "#10b981", "#f97316"]} />
        </Card>
      </div>
    </div>
  );
};

export default ButtonAnalytics;
