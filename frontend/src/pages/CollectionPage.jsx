import React, { useEffect, useRef, useState } from "react";
import { FiSliders } from "react-icons/fi";
import { HiX, HiChevronRight } from "react-icons/hi";
import { MdFilterList, MdOutlineTimer } from "react-icons/md";
import { BsLightningCharge } from "react-icons/bs";
import FilterSidebar from "../components/Products/FilterSidebar";
import ProductGrid from "../components/Products/ProductGrid";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchProductsByFilters } from "../redux/slices/productsSlice";
import axios from "axios";
import { Helmet } from "react-helmet-async";
import { cachedGet } from "../utils/httpCache";

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
  const isAllCollectionsPage = !collection || collection === "all";

  const sidebarRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* ── Flash Sale (mobile-only, CSS lg:hidden controls visibility) ── */
  const [activeOffer, setActiveOffer] = useState(null);
  const [selectedPct] = useState("all");
  const [offerCd, setOfferCd] = useState({ h: "00", m: "00", s: "00" });
  const now = Date.now();
  const offerStartTime = activeOffer ? new Date(activeOffer.startDate).getTime() : null;
  const offerEndTime = activeOffer ? new Date(activeOffer.endDate).getTime() : null;
  const isOfferLive = Boolean(
    activeOffer &&
    Number.isFinite(offerStartTime) &&
    Number.isFinite(offerEndTime) &&
    now >= offerStartTime &&
    now <= offerEndTime
  );
  const isOfferUpcoming = Boolean(
    activeOffer &&
    Number.isFinite(offerStartTime) &&
    now < offerStartTime
  );

  useEffect(() => {
    cachedGet(
      "offers:public",
      () => axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/offers/public`),
      60 * 1000
    ).then((data) => {
      const now = Date.now();
      const list = Array.isArray(data) ? data : [];
      const live = list.find(
        (o) => new Date(o.startDate).getTime() <= now && new Date(o.endDate).getTime() >= now
      );
      // fallback: if no strictly-live offer found, use first non-expired offer
      setActiveOffer(live || list[0] || null);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeOffer) return;
    const start = new Date(activeOffer.startDate).getTime();
    const end = new Date(activeOffer.endDate).getTime();
    const fmt = (n) => String(Math.max(0, n)).padStart(2, "0");
    const tick = () => {
      const target = isOfferUpcoming ? start : end;
      const diff = Math.max(0, Math.floor((target - Date.now()) / 1000));
      setOfferCd({
        h: fmt(Math.floor((diff % 86400) / 3600)),
        m: fmt(Math.floor((diff % 3600) / 60)),
        s: fmt(diff % 60),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeOffer, isOfferUpcoming]);

  // CSS lg:hidden on the Flash Sale block handles mobile-only visibility;
  // no JS isMobileView needed — avoids SSR/resize race conditions
  const showFlashSale = Boolean(activeOffer);

  const flashProducts = React.useMemo(() => {
    if (!activeOffer || !products?.length) return products;
    if (selectedPct === "all") return products;
    const target = parseInt(selectedPct, 10);
    return products.filter((p) => {
      if (!p.discountPrice || !p.price || p.discountPrice >= p.price) return false;
      const pct = Math.round(((p.price - p.discountPrice) / p.price) * 100);
      return pct >= target - 5 && pct <= target + 15;
    });
  }, [activeOffer, selectedPct, products]);

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

        {!isAllCollectionsPage && (
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
        )}

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
          <main data-scroll-container className="flex-1 min-w-0 py-5 lg:h-full lg:overflow-y-auto">

            {/* ── Mobile Flash Sale header ── */}
            {showFlashSale && (
              <div className="lg:hidden mb-4">

                {/* ── Hero card: title left, countdown right on blue blob ── */}
                <div className="relative mx-4 mb-4" style={{ minHeight: "96px" }}>
                  {/* Blue decorative blob — top-right circle */}
                  <div
                    className="absolute bg-blue-500 rounded-full"
                    style={{ width: "190px", height: "190px", top: "-60px", right: "-40px" }}
                  />
                  {/* Softer inner blob ring */}
                  <div
                    className="absolute bg-blue-500/30 rounded-full"
                    style={{ width: "140px", height: "140px", top: "-20px", right: "60px" }}
                  />

                  <div className="relative flex items-center justify-between px-4 py-4">
                    {/* Left: title */}
                    <div className="min-w-0 pr-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-500">
                        {isOfferLive ? "Live Now" : "Sale starts in"}
                      </p>
                      <h1 className="text-[22px] font-black text-gray-900 leading-tight tracking-tight line-clamp-2">
                        {activeOffer?.title || "Flash Sale"}
                      </h1>
                      <p className="text-[13px] text-gray-400 mt-0.5">
                        {isOfferLive ? "Grab it before it ends" : "Get ready for the drop"}
                      </p>
                    </div>

                    {/* Right: clock + number boxes (sit on blue blob) */}
                    <div className="flex items-center gap-2 shrink-0 z-10">
                      <MdOutlineTimer className="text-black text-2xl shrink-0 drop-shadow" />
                      {[offerCd.h, offerCd.m, offerCd.s].map((val, i) => (
                        <div
                          key={i}
                          className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm"
                        >
                          <span className="text-blue-600 font-black text-[15px] font-mono leading-none">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Discount filter tabs with downward pointer on active ── */}
                {/* <div className="px-4">
                  <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                    {["all", "10", "20", "30", "40", "50"].map((pct) => {
                      const active = selectedPct === pct;
                      return (
                        <div key={pct} className="relative shrink-0 flex flex-col items-center pb-3">
                          <button
                            type="button"
                            onClick={() => setSelectedPct(pct)}
                            className={`px-5 py-2 rounded-full text-[13px] font-semibold border transition-all ${
                              active
                                ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200"
                                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                            }`}
                          >
                            {pct === "all" ? "All" : `${pct}%`}
                          </button>
                          {active && (
                            <div
                              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-600 rotate-45 rounded-[3px]"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div> */}

                {/* ── Offer name + discount label ── */}
                <div className="px-4 mt-1">
                  {/* Offer title as section header */}
                  {/* {activeOffer?.title && (
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-1 h-px bg-gray-200" />
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.18em] whitespace-nowrap">
                        {activeOffer.title}
                      </p>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                  )} */}

                  {/* "N% Discount" label + sliders icon */}
                  <div className="flex items-center justify-between">
                    <p className="text-[17px] font-bold text-gray-900">
                      {selectedPct === "all" ? "All Products" : `${selectedPct}% Discount`}
                    </p>
                    {/* Sliders icon — three horizontal lines with circles */}
                    {/* <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-gray-700 shrink-0">
                      <line x1="3" y1="5" x2="17" y2="5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                      <circle cx="7" cy="5" r="2" fill="white" stroke="currentColor" strokeWidth="1.8"/>
                      <line x1="3" y1="10" x2="17" y2="10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                      <circle cx="13" cy="10" r="2" fill="white" stroke="currentColor" strokeWidth="1.8"/>
                      <line x1="3" y1="15" x2="17" y2="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                      <circle cx="7" cy="15" r="2" fill="white" stroke="currentColor" strokeWidth="1.8"/>
                    </svg> */}
                  </div>
                </div>

              </div>
            )}

            {/* ── Toolbar row (desktop always, mobile only when no active offer) ── */}
            <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 px-4 md:px-5 ${activeOffer ? "hidden lg:flex" : ""}`}>
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
          
                {!isAllCollectionsPage && (
                  <button
                    onClick={() => setSidebarOpen((p) => !p)}
                    className="lg:hidden flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
                  >
                    <MdFilterList className="text-base" /> Filter
                  </button>
                )}

             
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

           
            {activeChips.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4 px-4 md:px-5">
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
            <div className="px-4 md:px-5">
              <ProductGrid products={activeOffer ? flashProducts : products} loading={loading} />
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default CollectionPage;
