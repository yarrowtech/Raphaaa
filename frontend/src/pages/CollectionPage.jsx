import React, { useEffect, useRef, useState } from "react";
import { FiSliders } from "react-icons/fi";
import { HiX } from "react-icons/hi";
import { MdOutlineTimer, MdGridView, MdViewComfy } from "react-icons/md";
import LandingFooter from "../components/Layout/LandingFooter";
import FilterSidebar from "../components/Products/FilterSidebar";
import ProductGrid from "../components/Products/ProductGrid";
import { Link, useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchProductsByFilters } from "../redux/slices/productsSlice";
import axios from "axios";
import { Helmet } from "react-helmet-async";
import { cachedGet } from "../utils/httpCache";

const SORT_OPTIONS = [
  { value: "",           label: "Recommended"         },
  { value: "priceAsc",   label: "Price: Low → High" },
  { value: "priceDesc",  label: "Price: High → Low" },
  { value: "popularity", label: "Customer Rating"      },
];

const FILTER_LABEL = {
  category: "Category", gender: "Gender", color: "Color",
  size: "Size", material: "Fabric", brand: "Brand",
  minPrice: "Min ₹", maxPrice: "Max ₹",
};

const normalizeGender = (value) => {
  const key = String(value || "").trim().toLowerCase();
  if (key === "man" || key === "male") return "Men";
  if (key === "woman" || key === "female") return "Women";
  if (key === "kid" || key === "child" || key === "children") return "Kids";
  if (key === "men") return "Men";
  if (key === "women") return "Women";
  if (key === "kids") return "Kids";
  return value;
};

const prettifySlug = (value) =>
  String(value || "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());

const CollectionPage = () => {
  const { collection }  = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate   = useNavigate();
  const dispatch   = useDispatch();
  const { products, loading, error } = useSelector((s) => s.products);

  const sidebarRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [wideView, setWideView] = useState(false);

  /* ── Meta options (shared by the quick-pick pills + FilterSidebar) ── */
  const [categories, setCategories] = useState([]);
  const [genders,    setGenders]    = useState([]);
  const [materials,  setMaterials]  = useState([]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/meta-options/public`)
      .then((r) => r.json())
      .then((data) => {
        setCategories(data.filter((o) => o.type === "category").map((o) => o.value));
        setGenders(   [...new Set(data.filter((o) => o.type === "gender"  ).map((o) => normalizeGender(o.value)))]);
        setMaterials( data.filter((o) => o.type === "material").map((o) => o.value));
      })
      .catch(() => {});
  }, []);

  const setQuickCategory = (cat) => {
    const params = new URLSearchParams(searchParams);
    if (params.get("category") === cat) params.delete("category");
    else params.set("category", cat);
    setSearchParams(params);
  };

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
  const showFlashSale = Boolean(activeOffer && activeOffer.isActive !== false);

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
    const queryParams = Object.fromEntries(searchParams);
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

  useEffect(() => {
    if (!sidebarOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event) => { if (event.key === "Escape") setSidebarOpen(false); };
    document.addEventListener("keydown", close);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", close); };
  }, [sidebarOpen]);

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

  const selectedCategory = searchParams.get("category") || (collection !== "all" ? collection : "");
  const selectedGender = searchParams.get("gender");
  const displayName = [selectedGender && `${selectedGender}'s`, selectedCategory ? prettifySlug(selectedCategory) : "All Products"].filter(Boolean).join(" ");

  useEffect(() => {
    const gender = searchParams.get("gender");
    const normalizedGender = normalizeGender(gender);
    if (!gender || !normalizedGender || normalizedGender === gender) return;

    const next = new URLSearchParams(searchParams);
    next.set("gender", normalizedGender);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

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

      <div className="reference-collection">
        <div className="collection-breadcrumb">
          <nav aria-label="Breadcrumb">
            <Link to="/">Home</Link><span>/</span>
            <Link to="/collections/all">{selectedGender ? `${selectedGender}'s Fashion` : "Collections"}</Link>
            <span>/</span><strong>{selectedCategory ? prettifySlug(selectedCategory) : "All Products"}</strong>
          </nav>
          <span className="collection-count" aria-live="polite">{loading ? "Loading styles…" : `Showing ${products?.length ?? 0} items`}</span>
        </div>
        <section className="collection-toolbar">
          <div className="collection-toolbar-row">
            <div>
              <h1>{displayName}</h1>
              <p>{searchParams.get("search") ? `Results for “${searchParams.get("search")}”` : "Premium everyday styles, curated for you"}</p>
            </div>
            <div className="collection-controls">
              <div className="collection-density" role="group" aria-label="Grid density">
                <button aria-label="4-column grid" aria-pressed={!wideView} onClick={() => setWideView(false)}><MdGridView /></button>
                <button aria-label="5-column grid" aria-pressed={wideView} onClick={() => setWideView(true)}><MdViewComfy /></button>
              </div>
              <label className="collection-sort">Sort by:
                <select aria-label="Sort products" value={searchParams.get("sortBy") || ""} onChange={handleSort}>
                  {SORT_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            </div>
          </div>
          {categories.length > 0 && <div className="collection-picks" role="group" aria-label="Quick category filters">
            <span>Picks:</span>
            {categories.map(cat => <button key={cat} aria-pressed={selectedCategory === cat} onClick={() => setQuickCategory(cat)}>{cat}</button>)}
          </div>}
        </section>
        {showFlashSale && (isOfferLive || isOfferUpcoming) && <Link to="/offers" className="collection-offer">
          <span>{activeOffer.title} · {isOfferLive ? "Ends in" : "Starts in"}</span>
          <span><MdOutlineTimer /> {offerCd.h}:{offerCd.m}:{offerCd.s}</span>
        </Link>}
        <div className="collection-body">
          {sidebarOpen && <div className="collection-backdrop" onClick={() => setSidebarOpen(false)} />}
          <aside ref={sidebarRef} aria-label="Product filters" className={`collection-sidebar ${sidebarOpen ? "is-open" : ""}`}>
            <FilterSidebar onClose={() => setSidebarOpen(false)} collectionSlug={collection} categories={categories} genders={genders} materials={materials} />
          </aside>
          <section className="collection-results" aria-label="Products" aria-busy={loading}>
            {activeChips.length > 0 && <div className="collection-applied">
              {activeChips.map(([key, value]) => <button key={key} onClick={() => removeChip(key)} aria-label={`Remove ${FILTER_LABEL[key] || key}: ${value}`}>
                {FILTER_LABEL[key] || key}: {value}<HiX />
              </button>)}
              <button className="clear-filters" onClick={clearAll}>Clear all</button>
            </div>}
            <ProductGrid products={flashProducts} loading={loading} error={error} variant="editorial" wide={wideView} />
          </section>
        </div>
        <div className="collection-mobile-actions">
          <label>Sort
            <select aria-label="Sort products on mobile" value={searchParams.get("sortBy") || ""} onChange={handleSort}>
              {SORT_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <button onClick={() => setSidebarOpen(true)} aria-expanded={sidebarOpen}><FiSliders /> Filters {activeChips.length > 0 && `(${activeChips.length})`}</button>
        </div>
        <LandingFooter variant="collection" />
      </div>
    </>
  );
};

export default CollectionPage;
