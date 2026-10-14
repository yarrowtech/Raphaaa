import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";
import { displayColorName } from "../utils/colorCatalog";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

const InventoryPage = () => {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const userInfo = JSON.parse(localStorage.getItem("userInfo"));

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/products/inventory`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("userToken")}`,
            },
          }
        );
        if (!res.ok) {
          throw new Error("Failed to fetch inventory");
        }
        const data = await res.json();
        setProducts(data);
        setFiltered(data);
      } catch (err) {
        toast.error("Failed to load inventory");
      }
    };

    if (userInfo?.role === "admin" || userInfo?.role === "merchantise") {
      fetchInventory();
    }
  }, []);

  // Handle filter changes
  useEffect(() => {
    let data = [...products];

    if (categoryFilter !== "all") {
      data = data.filter(
        (item) => item.category?.toLowerCase() === categoryFilter
      );
    }

    data = data.filter(
      (item) => item.price >= priceRange[0] && item.price <= priceRange[1]
    );

    setFiltered(data);
    setCurrentPage(1); // reset page on filter
  }, [categoryFilter, priceRange, products]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedData = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const categories = [
    ...new Set(products.map((item) => item.category?.toLowerCase())),
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Inventory & Stock Tracking</h2>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-6 bg-white/70 backdrop-blur-md border border-gray-200 p-4 rounded-xl shadow-sm">
        {/* Left Section: Category + Price */}
        <div className="flex flex-wrap items-center gap-6">
          {/* Category */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-white px-3 py-2 rounded-lg outline-none border border-gray-300 text-gray-700 shadow-sm hover:border-sky-400 focus:ring-2 focus:ring-sky-400 transition"
            >
              <option value="all">All</option>
              {categories.map((cat, idx) => (
                <option key={idx} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Price */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Price
            </label>
            <input
              type="number"
              className="w-24 border border-gray-300 px-3 py-2 rounded-lg bg-white text-gray-700 outline-none shadow-sm hover:border-sky-400 focus:ring-2 focus:ring-sky-400 transition"
              value={priceRange[0]}
              onChange={(e) =>
                setPriceRange([Number(e.target.value), priceRange[1]])
              }
              placeholder="Min"
            />
            <span className="text-gray-500 font-medium">-</span>
            <input
              type="number"
              className="w-24 border border-gray-300 px-3 py-2 rounded-lg bg-white text-gray-700 outline-none shadow-sm hover:border-sky-400 focus:ring-2 focus:ring-sky-400 transition"
              value={priceRange[1]}
              onChange={(e) =>
                setPriceRange([priceRange[0], Number(e.target.value)])
              }
              placeholder="Max"
            />
          </div>
        </div>

        {/* Right Section: Reset Button */}
        <div className="flex justify-end">
          <button
            onClick={() => {
              setCategoryFilter("all");
              setPriceRange([0, 0]);
            }}
            className="px-5 py-2 rounded-lg font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-600 shadow-md hover:shadow-lg hover:scale-105 transition-all"
          >
            Clear Filters
          </button>
        </div>
      </div>



      {products.length > 0 && (
        <div className="space-y-8 mb-10">
          {/* Bar Chart */}
          <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                Stock Count per Product
              </h3>
            </div>
            <Bar
              data={{
                labels: products.map((p) => p.name),
                datasets: [
                  {
                    label: "Stock Count",
                    data: products.map((p) => p.countInStock),
                    backgroundColor: function (context) {
                      const chart = context.chart;
                      const { ctx, chartArea } = chart;

                      if (!chartArea) return null; // chart not ready yet

                      const gradient = ctx.createLinearGradient(0, 0, 0, chartArea.bottom);
                      gradient.addColorStop(0, "rgba(56,189,248,0.9)");  // sky-400
                      gradient.addColorStop(1, "rgba(99,102,241,0.9)"); // indigo-500

                      return gradient;
                    },
                  },
                ],
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1,
                      color: "#374151",
                      font: { weight: "600" },
                    },
                    grid: { color: "#e5e7eb" },
                  },
                  x: {
                    ticks: {
                      color: "#6b7280",
                      font: { weight: "500" },
                    },
                    grid: { display: false },
                  },
                },
              }}
            />
          </div>

          {/* Pie Chart */}
          {/* <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              🥧 Stock by Category
            </h3>
            <Pie
              data={{
                labels: [...new Set(products.map((p) => p.category))],
                datasets: [
                  {
                    label: "Stock by Category",
                    data: [...new Set(products.map((p) => p.category))].map((cat) =>
                      products
                        .filter((p) => p.category === cat)
                        .reduce((acc, curr) => acc + curr.countInStock, 0)
                    ),
                    backgroundColor: [
                      "#6366f1",
                      "#f59e0b",
                      "#10b981",
                      "#ef4444",
                      "#8b5cf6",
                      "#ec4899",
                    ],
                    borderWidth: 2,
                    borderColor: "#fff",
                  },
                ],
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: "bottom",
                    labels: {
                      color: "#374151",
                      padding: 16,
                      font: { size: 12, weight: "500" },
                    },
                  },
                },
              }}
            />
          </div> */}
        </div>
      )}


      <div className="overflow-x-auto rounded-xl shadow-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 bg-white rounded-xl overflow-hidden">
          {/* Table Head */}
          <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Product</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Variants</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Category</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Price</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Stock</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Status</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-gray-100 text-sm">
            {paginatedData.map((prod, idx) => (
              <tr
                key={prod._id}
                className={`transition hover:bg-sky-50 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                  }`}
              >
                {/* Product */}
                <td className="px-6 py-4 font-medium text-gray-800">{prod.name}</td>

                {/* Variants */}
                <td className="px-6 py-4 text-xs text-gray-600">
                  {Array.isArray(prod.colorVariants) && prod.colorVariants.length > 0 ? (
                    <>
                      <div className="font-semibold text-gray-800">
                        {prod.colorVariants.length} color{prod.colorVariants.length > 1 ? "s" : ""}
                        {" · "}
                        {prod.colorVariants.reduce((s, cv) => s + (cv.sizes?.length || 0), 0)} sizes
                      </div>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {prod.colorVariants.slice(0, 3).map((cv, i) => (
                          <span key={i} className="inline-flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded">
                            <span className="w-2.5 h-2.5 rounded-full border border-gray-300 inline-block" style={{ backgroundColor: cv.color }} />
                            {displayColorName(cv.colorName, cv.color)}
                          </span>
                        ))}
                        {prod.colorVariants.length > 3 && <span className="text-gray-400">+{prod.colorVariants.length - 3}</span>}
                      </div>
                    </>
                  ) : Array.isArray(prod.variants) && prod.variants.length > 0 ? (
                    <>
                      <div className="font-semibold text-gray-800">
                        {prod.variants.length} variant{prod.variants.length > 1 ? "s" : ""}
                      </div>
                      <div>
                        {prod.variants.slice(0, 2).map((v) => `${v.color}/${v.size}`).join(", ")}
                        {prod.variants.length > 2 ? "…" : ""}
                      </div>
                    </>
                  ) : (
                    <span className="italic text-gray-400">No variants</span>
                  )}
                </td>

                {/* Category */}
                <td className="px-6 py-4 capitalize text-gray-600">{prod.category}</td>

                {/* Price */}
                <td className="px-6 py-4 font-semibold text-gray-900">₹{prod.price}</td>

                {/* Stock Count */}
                <td className="px-6 py-4 font-bold">
                  <span
                    className={`${prod.countInStock <= 5 ? "text-red-600" : "text-green-600"
                      }`}
                  >
                    {prod.countInStock}
                  </span>
                </td>

                {/* Status */}
                <td className="px-6 py-4">
                  <span
                    className={`flex items-center justify-center gap-1 text-xs font-semibold px-3 py-1 rounded-full w-fit ${prod.countInStock === 0
                      ? "bg-red-100 text-red-700"
                      : prod.countInStock <= 5
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                      }`}
                  >
                    {prod.countInStock === 0 ? (
                      <>Out of Stock</>
                    ) : prod.countInStock <= 5 ? (
                      <>Low Stock</>
                    ) : (
                      <>In Stock</>
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      {/* Pagination */}
      <div className="mt-6 flex justify-center gap-2">
        {Array.from({ length: totalPages }, (_, idx) => (
          <button
            key={idx}
            className={`px-3 py-1 rounded-full ${currentPage === idx + 1
              ? "bg-indigo-600 text-white"
              : "bg-gray-400 text-white hover:bg-gray-500"
              }`}
            onClick={() => setCurrentPage(idx + 1)}
          >
            {idx + 1}
          </button>
        ))}
      </div>
    </div>
  );
};

export default InventoryPage;
