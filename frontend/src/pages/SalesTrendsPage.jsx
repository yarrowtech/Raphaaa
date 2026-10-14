import React, { useEffect, useState } from "react";
import { Bar, Line, Pie } from "react-chartjs-2";
import { toast } from "sonner";

// Required chart.js registration
import {
  Chart as ChartJS,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import CustomSelect from "./CustomSelect";

ChartJS.register(
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  Tooltip,
  Legend
);

const SalesTrendsPage = () => {
  const [salesData, setSalesData] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [filters, setFilters] = useState({
    category: "",
    gender: "",
    size: "",
    color: "",
    sku: "",
  });

  

  const fetchSales = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/sales-analysis`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("userToken")}`,
          },
        }
      );
      if (!res.ok) {
        throw new Error("Failed to fetch sales data");
      }
      const data = await res.json();
      setSalesData(data);
      setFilteredProducts(data);
    } catch {
      toast.error("Failed to load sales data");
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  useEffect(() => {
    const filtered = salesData.filter((p) => {
      return (
        (!filters.category || p.category === filters.category) &&
        (!filters.gender || p.gender === filters.gender) &&
        (!filters.size || p.size === filters.size) &&
        (!filters.color || p.color === filters.color) &&
        (!filters.sku || p.sku === filters.sku)
      );
    });
    setFilteredProducts(filtered);
  }, [filters, salesData]);

  // Chart data
  const salesChart = {
    labels: filteredProducts.map((p) => p.name),
    datasets: [
      {
        label: "Units Sold",
        data: filteredProducts.map((p) => p.totalSold),
        backgroundColor: "rgba(99, 102, 241, 0.7)",
      },
    ],
  };

  const trendChart = {
    labels: filteredProducts.map((p) => p.name),
    datasets: [
      {
        label: "Revenue",
        data: filteredProducts.map((p) => p.totalRevenue),
        borderColor: "#6366f1",
        backgroundColor: "rgba(99, 102, 241, 0.2)",
        fill: true,
      },
    ],
  };

  const handleFilterChange = (e) => {
    setFilters((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Sales & Trend Analysis</h2>

      {/* Filters */}

      <div className="flex flex-wrap gap-4 mb-6">
        {["category", "gender", "size", "color", "sku"].map((f) => {
          const opts = [...new Set(salesData.map((p) => p[f]))].filter(Boolean);
          return (
            <CustomSelect
              key={f}
              name={f}
              value={filters[f]}
              options={opts}
              onChange={handleFilterChange}
              placeholder={`Filter by ${f}`}
            />
          );
        })}

        {/* Reset Button */}
        <button
          type="button"
          onClick={() =>
            ["category", "gender", "size", "color", "sku"].forEach((f) =>
              handleFilterChange({ target: { name: f, value: "" } })
            )
          }
          className="px-4 py-2 rounded-xl bg-red-500 text-white font-medium shadow-md
               hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400
               transition duration-200"
        >
          Reset Filters
        </button>
      </div>

      {/* Charts */}
      {/* Charts Section */}
      {filteredProducts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top Selling Products */}
          <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-lg transition">
            <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-amber-500" />
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Top Selling Products</h3>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                  Filtered View
                </span>
              </div>

              <div className="h-72">
                <Bar
                  key={`bar-${filteredProducts.map((p) => p.productId).join(",")}`}
                  data={salesChart}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: "index", intersect: false },
                    plugins: { legend: { display: false }, tooltip: { enabled: true } },
                    scales: {
                      x: { grid: { display: false } },
                      y: { grid: { color: "#f1f5f9" } }
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Revenue Trends */}
          <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-lg transition">
            <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-500" />
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Revenue Trends</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                    Time Series
                  </span>
                </div>
              </div>

              <div className="h-72">
                <Line
                  key={`line-${filteredProducts.map((p) => p.productId).join(",")}`}
                  data={trendChart}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: "index", intersect: false },
                    plugins: { legend: { display: false }, tooltip: { enabled: true } },
                    scales: {
                      x: { grid: { display: false } },
                      y: { grid: { color: "#f1f5f9" } }
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* If you decide to re-enable the Pie chart later, keep the same card style */}
          {/*
    <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-lg transition lg:col-span-2">
      <div className="h-1 w-full bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400" />
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Seasonal Demand Distribution</h3>
          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
            Categories
          </span>
        </div>

        <div className="h-80">
          <Pie
            key={`pie-${filteredProducts.map((p) => p.productId).join(",")}`}
            data={seasonalChart}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: "bottom" } },
            }}
          />
        </div>
      </div>
    </div>
    */}
        </div>
      )}


      {/* Data Table */}
      <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-lg transition">
        {/* Accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-amber-500" />

        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Product Performance</h3>
            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">Table View</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-left text-sm text-gray-700">
              <thead className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur text-xs uppercase text-gray-600 border-b">
                <tr>
                  <th className="py-3.5 px-6 font-semibold tracking-wide">Product</th>
                  <th className="py-3.5 px-6 font-semibold tracking-wide">SKU</th>
                  <th className="py-3.5 px-6 font-semibold tracking-wide">Color</th>
                  <th className="py-3.5 px-6 font-semibold tracking-wide">Size</th>
                  <th className="py-3.5 px-6 font-semibold tracking-wide">Category</th>
                  <th className="py-3.5 px-6 font-semibold tracking-wide text-right">Sold</th>
                  <th className="py-3.5 px-6 font-semibold tracking-wide text-right">Revenue</th>
                  {/* <th className="py-3.5 px-6 font-semibold tracking-wide">Season</th> */}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map((p) => (
                  <tr
                    key={p.productId}
                    className="hover:bg-indigo-50/40 transition-colors"
                  >
                    <td className="py-3.5 px-6">
                      <span className="font-medium text-gray-900">{p.name}</span>
                    </td>
                    <td className="py-3.5 px-6">{p.sku || "-"}</td>
                    <td className="py-3.5 px-6">{p.color || "-"}</td>
                    <td className="py-3.5 px-6">{p.size || "-"}</td>

                    <td className="py-3.5 px-6">
                      <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs capitalize text-gray-700">
                        {p.category}
                      </span>
                    </td>

                    <td className="py-3.5 px-6 text-right tabular-nums">
                      {p.totalSold}
                    </td>

                    <td className="py-3.5 px-6 text-right tabular-nums">
                      ₹{p.totalRevenue.toFixed(2)}
                    </td>

                    {/* <td className="py-3.5 px-6">
                      <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 px-2.5 py-1 text-xs capitalize border border-amber-100">
                        {p.season || "N/A"}
                      </span>
                    </td> */}
                  </tr>
                ))}

                {/* Totals row */}
                <tr className="bg-gray-50 font-semibold text-gray-900">
                  <td className="py-3.5 px-6" colSpan={5}>Total</td>
                  <td className="py-3.5 px-6 text-right tabular-nums">
                    {filteredProducts.reduce((sum, p) => sum + p.totalSold, 0)}
                  </td>
                  <td className="py-3.5 px-6 text-right tabular-nums">
                    ₹{filteredProducts.reduce((sum, p) => sum + p.totalRevenue, 0).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesTrendsPage;
