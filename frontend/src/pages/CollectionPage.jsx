import React, { useEffect, useRef, useState } from "react";
import { FiSliders } from "react-icons/fi";
import { HiX, HiChevronRight } from "react-icons/hi";
import { MdFilterList } from "react-icons/md";
import FilterSidebar from "../components/Products/FilterSidebar";
import ProductGrid from "../components/Products/ProductGrid";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchProductsByFilters } from "../redux/slices/productsSlice";
import axios from "axios";
import { Helmet } from "react-helmet-async";

const SORT_OPTIONS = [
  { value: "",           label: "Featured"         },
  { value: "priceAsc",   label: "Price: Low → High" },
  { value: "priceDesc",  label: "Price: High → Low" },
  { value: "popularity", label: "Most Popular"      },
];

const FILTER_LABEL = {
  category: "Category", gender: "Gender", color: "Color",
  size: "Size", material: "Fabric",
  minPrice: "Min ₹", maxPrice: "Max ₹",
};

const CollectionPage = () => {
  const { collection }  = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate   = useNavigate();
  const dispatch   = useDispatch();
  const { products, loading } = useSelector((s) => s.products);
  const queryParams = Object.fromEntries([...searchParams]);

  const sidebarRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/collabs/active`).catch(() => {});
  }, []);

  useEffect(() => {
    // When the URL slug is a specific category (e.g. /collections/shirt),
    // pass it as the `category` filter so the backend uses query.category.
    // If the sidebar also has a category param, that takes priority (user override).
    const categoryFromSlug =
      collection && collection !== "all" ? collection : undefined;

    dispatch(
      fetchProductsByFilters({
        ...(categoryFromSlug && !queryParams.category
          ? { category: categoryFromSlug }
          : {}),
        ...queryParams,
      })
    );
  }, [dispatch, collection, searchParams]);

  useEffect(() => {
    const fn = (e) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target))
        setSidebarOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const handleSort = (e) => {
    const params = new URLSearchParams(searchParams);
    if (e.target.value) params.set("sortBy", e.target.value);
    else params.delete("sortBy");
    setSearchParams(params);
  };

  const removeChip = (key) => {
    const params = new URLSearchParams(searchParams);
    params.delete(key);
    setSearchParams(params);
  };

  const clearAll = () => navigate(`/collections/${collection || "all"}`);

  const activeChips = [...searchParams.entries()].filter(([k]) => k !== "sortBy");

  const displayName = collection && collection !== "all"
    ? collection.charAt(0).toUpperCase() + collection.slice(1)
    : "All";

  const pageTitle   = `${displayName} Collection | Raphaaa`;
  const pageDesc    = `Shop the ${displayName} collection at Raphaaa — premium quality clothing.`;
  const canonicalUrl = `https://www.raphaaa.com/collections/${collection || "all"}`;

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="min-h-screen">

        {/* ── Breadcrumb ── */}
        <div className="bg-linear-to-r from-sky-200 to-sky-100">
          <div className="max-w-400 mx-auto px-4 md:px-6 py-3 flex items-center gap-1.5 text-xs text-slate-950-400 font-medium">
            <span className="hover:text-gray-700 cursor-pointer transition" onClick={() => navigate("/")}>Home</span>
            <HiChevronRight className="text-slate-950" />
            <span className="hover:text-gray-700 cursor-pointer transition" onClick={() => navigate("/collections/all")}>Collections</span>
            {collection && collection !== "all" && (
              <>
                <HiChevronRight className="text-gray-300" />
                <span className="text-gray-800 capitalize font-semibold">{collection}</span>
              </>
            )}
          </div>
        </div>

        {/* ── Page body ── */}
        <div className="max-w-400 mx-auto flex items-start lg:h-[calc(100vh-88px)] lg:overflow-hidden">

          {/* ── Mobile filter FAB ── */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden fixed bottom-24 left-1/2 -translate-x-1/2 z-60
                       flex items-center gap-2 px-5 py-2.5
                       bg-gray-900 text-white text-sm font-semibold rounded-full
                       shadow-xl active:scale-95 transition-all"
          >
            <FiSliders className="text-base" /> Filters
            {activeChips.length > 0 && (
              <span className="bg-white text-gray-900 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {activeChips.length}
              </span>
            )}
          </button>

          {/* ── Mobile backdrop ── */}
          {sidebarOpen && (
            <div className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)} />
          )}

          {/* ── LEFT SIDEBAR ── */}
          <aside
            ref={sidebarRef}
            className={`
              ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
              fixed inset-y-0 left-0 z-50
              lg:translate-x-0 lg:z-auto
              w-64 xl:w-72 shrink-0
              lg:sticky lg:top-0 lg:h-full
              overflow-y-auto
              transition-transform duration-300 ease-in-out
              bg-white lg:bg-transparent
              border-r border-gray-100
            `}
          >
            {/* Mobile close */}
            <div className="lg:hidden flex items-center justify-between px-4 py-4 border-b border-gray-100">
              <span className="text-sm font-bold text-gray-800">Filters</span>
              <button onClick={() => setSidebarOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition">
                <HiX className="text-gray-600" />
              </button>
            </div>

            <FilterSidebar onClose={() => setSidebarOpen(false)} />
          </aside>

          {/* ── MAIN CONTENT ── */}
          <main className="flex-1 min-w-0 px-4 md:px-5 py-5 lg:h-full lg:overflow-y-auto">

            {/* ── Toolbar row ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900 capitalize">
                  {displayName} {collection && collection !== "all" ? "Collection" : "Products"}
                </h1>
                {!loading && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {products?.length ?? 0} item{products?.length !== 1 ? "s" : ""}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Desktop filter toggle */}
                <button
                  onClick={() => setSidebarOpen((p) => !p)}
                  className="lg:hidden flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
                >
                  <MdFilterList className="text-base" /> Filter
                </button>

                {/* Sort select */}
                <div className="relative">
                  <select
                    value={searchParams.get("sortBy") || ""}
                    onChange={handleSort}
                    className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 cursor-pointer"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <MdFilterList className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                </div>
              </div>
            </div>

            {/* ── Active filter chips ── */}
            {activeChips.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {activeChips.map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => removeChip(key)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-full transition group"
                  >
                    <span className="text-gray-400">{FILTER_LABEL[key] || key}:</span>
                    {value}
                    <HiX className="text-gray-400 group-hover:text-gray-600 text-[10px] transition" />
                  </button>
                ))}
                <button
                  onClick={clearAll}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-full hover:bg-gray-700 transition"
                >
                  <HiX className="text-[10px]" /> Clear all
                </button>
              </div>
            )}

            {/* ── Product grid ── */}
            <ProductGrid products={products} loading={loading} />
          </main>
        </div>
      </div>
    </>
  );
};

export default CollectionPage;
