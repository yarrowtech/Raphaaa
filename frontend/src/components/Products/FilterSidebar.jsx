import React, { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { HiChevronDown, HiChevronUp, HiX, HiSearch } from "react-icons/hi";
import { MdFilterList } from "react-icons/md";

const MIN_BOUND = 0;
const MAX_BOUND = 10000;
const STEP = 50;

const PRICE_PRESETS = [
  { label: "Under ₹799",      min: MIN_BOUND, max: 799  },
  { label: "₹800 – ₹1,499",   min: 800,       max: 1499 },
  { label: "₹1,500 – ₹2,999", min: 1500,      max: 2999 },
  { label: "Luxury (₹3,000+)",min: 3000,      max: MAX_BOUND },
];

const jakarta = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

  /* ── section card ── */
const FilterSection = ({ id, label, count, right, children, open, setOpen }) => (
    <div className="filter-section bg-white">
      <button
        type="button"
        aria-expanded={Boolean(open[id])}
        onClick={() => setOpen((p) => ({ ...p, [id]: !p[id] }))}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold tracking-widest text-[#111111] uppercase">{label}</span>
          {count > 0 && (
            <span className="w-4 h-4 rounded-full bg-[#111111] text-white text-[9px] font-bold flex items-center justify-center">
              {count}
            </span>
          )}
        </div>
        {right || (
          open[id]
            ? <HiChevronUp className="text-[#94969F] text-sm shrink-0" />
            : <HiChevronDown className="text-[#94969F] text-sm shrink-0" />
        )}
      </button>
      {open[id] && <div className="pt-3">{children}</div>}
    </div>
  );


const FilterSidebar = ({ onClose, collectionSlug, categories = [], genders = [], materials = [] }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState({
    category: "", gender: "", color: "", brand: [],
    size: [], material: [], minPrice: MIN_BOUND, maxPrice: MAX_BOUND,
  });
  const [priceRange, setPriceRange] = useState([MIN_BOUND, MAX_BOUND]);
  const [open, setOpen] = useState({
    category: true, brand: true, gender: true, color: true, size: true, material: false, price: true,
  });
  const priceDebounceTimer = useRef(null);
  const [brandSearch, setBrandSearch] = useState("");

  // Real per-option counts under the current filter context — GET /api/products/facets
  const [facets, setFacets] = useState({ brands: [], categories: [], sizes: [], colors: [] });

  const SIZES = facets.sizes.length ? facets.sizes.map(item => item._id) : ["XS", "S", "M", "L", "XL", "XXL", "3XL"];

  /* ── sync URL → state ── */
  useEffect(() => {
    const p   = Object.fromEntries([...searchParams]);
    const min = p.minPrice ? Number(p.minPrice) : MIN_BOUND;
    const max = p.maxPrice ? Number(p.maxPrice) : MAX_BOUND;
    setFilters({
      category: p.category || "",
      gender:   p.gender   || "",
      color:    p.color    || "",
      brand:    p.brand    ? p.brand.split(",")    : [],
      size:     p.size     ? p.size.split(",")     : [],
      material: p.material ? p.material.split(",") : [],
      minPrice: isNaN(min) ? MIN_BOUND : min,
      maxPrice: isNaN(max) ? MAX_BOUND : max,
    });
    setPriceRange([
      isNaN(min) ? MIN_BOUND : Math.max(MIN_BOUND, Math.min(min, MAX_BOUND)),
      isNaN(max) ? MAX_BOUND : Math.max(MIN_BOUND, Math.min(max, MAX_BOUND)),
    ]);
  }, [searchParams]);

  /* ── fetch real facet counts for the current filter context ── */
  useEffect(() => {
    const p = Object.fromEntries([...searchParams]);
    const params = new URLSearchParams();
    const categoryFromSlug = collectionSlug && collectionSlug !== "all" ? collectionSlug : undefined;
    const cat = p.category || categoryFromSlug;
    if (cat) params.set("category", cat);
    if (p.gender) params.set("gender", p.gender);
    if (p.color) params.set("color", p.color);
    if (p.size) params.set("size", p.size);
    if (p.material) params.set("material", p.material);
    if (p.brand) params.set("brand", p.brand);
    if (p.minPrice) params.set("minPrice", p.minPrice);
    if (p.maxPrice) params.set("maxPrice", p.maxPrice);
    if (p.search) params.set("search", p.search);

    const controller = new AbortController();
    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/products/facets?${params.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data?.success) {
          setFacets({
            brands:     data.brands     || [],
            categories: data.categories || [],
            sizes:      data.sizes      || [],
            colors:     data.colors     || [],
          });
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [searchParams, collectionSlug]);

  const countFor = (list, value) => {
    const hit = list.find((x) => String(x._id).toLowerCase() === String(value).toLowerCase());
    return hit ? hit.count : 0;
  };

  const push = (nf) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(nf).forEach(([key, value]) => {
      params.delete(key);
      if (Array.isArray(value)) {
        if (value.length) params.set(key, value.join(","));
      } else if (value !== "" && value != null &&
        !(key === "maxPrice" && Number(value) === MAX_BOUND) &&
        !(key === "minPrice" && Number(value) === MIN_BOUND)) {
        params.set(key, value);
      }
    });
    setSearchParams(params);
  };

  const set = (name, value, type = "radio") => {
    clearTimeout(priceDebounceTimer.current);
    const nf = { ...filters };
    if (type === "checkbox") {
      nf[name] = nf[name].includes(value)
        ? nf[name].filter((x) => x !== value)
        : [...nf[name], value];
    } else {
      nf[name] = nf[name] === value ? "" : value;
    }
    setFilters(nf);
    push(nf);
  };

  const applyPricePreset = (min, max) => {
    clearTimeout(priceDebounceTimer.current);
    const next = [min, max];
    setPriceRange(next);
    const nf = { ...filters, minPrice: min, maxPrice: max };
    setFilters(nf);
    push(nf);
  };

  const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));

  const onMinChange = (e) => {
    const next = [clamp(Number(e.target.value), MIN_BOUND, priceRange[1]), priceRange[1]];
    setPriceRange(next);
    const nf = { ...filters, minPrice: next[0], maxPrice: next[1] };
    setFilters(nf);
    clearTimeout(priceDebounceTimer.current);
    priceDebounceTimer.current = setTimeout(() => push(nf), 220);
  };
  const onMaxChange = (e) => {
    const next = [priceRange[0], clamp(Number(e.target.value), priceRange[0], MAX_BOUND)];
    setPriceRange(next);
    const nf = { ...filters, minPrice: next[0], maxPrice: next[1] };
    setFilters(nf);
    clearTimeout(priceDebounceTimer.current);
    priceDebounceTimer.current = setTimeout(() => push(nf), 220);
  };

  useEffect(() => () => clearTimeout(priceDebounceTimer.current), [searchParams]);

  const hasFilters  = [...searchParams.keys()].some((k) => k !== "sortBy");
  const activeCount = [...searchParams.keys()].filter((k) => k !== "sortBy").length;

  const clearAll = () => {
    clearTimeout(priceDebounceTimer.current);
    const params = new URLSearchParams();
    const sort = searchParams.get("sortBy");
    if (sort) params.set("sortBy", sort);
    setSearchParams(params);
    onClose?.();
  };

  const removeFilter = (key) => {
    const params = new URLSearchParams(searchParams);
    if (key === "price") {
      params.delete("minPrice");
      params.delete("maxPrice");
    } else {
      params.delete(key);
    }
    setSearchParams(params);
  };

  /* active filter chips for display */
  const chips = [
    ...(filters.category ? [{ key: "category", label: filters.category }] : []),
    ...filters.brand.map((b) => ({ key: "brand", label: b })),
    ...(filters.gender   ? [{ key: "gender",   label: filters.gender   }] : []),
    ...(filters.color    ? [{ key: "color",    label: filters.color    }] : []),
    ...filters.size.map((s) => ({ key: "size",     label: s })),
    ...filters.material.map((m) => ({ key: "material", label: m })),
    ...(filters.minPrice !== MIN_BOUND || filters.maxPrice !== MAX_BOUND
      ? [{ key: "price", label: `₹${filters.minPrice.toLocaleString()} – ₹${filters.maxPrice.toLocaleString()}` }]
      : []),
  ];

  const visibleBrands = facets.brands.filter((b) =>
    !brandSearch || String(b._id).toLowerCase().includes(brandSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA] lg:bg-transparent" style={jakarta}>

      {/* ── Header ── */}
      <div className="shrink-0 p-4 lg:p-0 lg:pb-3 space-y-3">
        <div className="flex items-center justify-between bg-white rounded shadow-sm p-4">
          <div className="flex items-center gap-2">
            <MdFilterList className="text-[#111111] text-lg" />
            <span className="text-[13px] font-extrabold tracking-widest text-[#111111] uppercase">
              Filters
            </span>
            {activeCount > 0 && (
              <span className="min-w-[18px] h-[18px] rounded-full bg-[#E11B22] text-white text-[10px] font-bold flex items-center justify-center px-1">
                {activeCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {hasFilters && (
              <button
                onClick={clearAll}
                className="text-[10px] font-bold text-[#E11B22] hover:underline uppercase tracking-wide"
              >
                Clear All
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                aria-label="Close filters"
                className="lg:hidden w-7 h-7 flex items-center justify-center rounded-full bg-[#F5F5F6] hover:bg-[#EEEEEE] transition"
              >
                <HiX className="text-[#444748] text-sm" />
              </button>
            )}
          </div>
        </div>

        {/* Active filter chips */}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 bg-white rounded shadow-sm p-4">
            {chips.map(({ key, label }) => (
              <span
                key={`${key}-${label}`}
                className="inline-flex items-center gap-1 bg-[#F5F5F6] border border-[#EEEEEE] text-[#111111] text-[10px] font-semibold px-2 py-1 rounded"
              >
                {label}
                <button
                  onClick={() =>
                    key === "brand"
                      ? set("brand", label, "checkbox")
                      : key === "size"
                      ? set("size", label, "checkbox")
                      : key === "material"
                      ? set("material", label, "checkbox")
                      : removeFilter(key)
                  }
                  className="text-[#94969F] hover:text-[#E11B22] transition ml-0.5"
                >
                  <HiX className="text-[9px]" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Sections ── */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-0 space-y-3 pb-4">

        {/* Category */}
        {categories.length > 0 && (
          <FilterSection open={open} setOpen={setOpen} id="category" label="Categories" count={filters.category ? 1 : 0}>
            <div className="space-y-0.5">
              {categories.map((c) => {
                const active = (filters.category || (collectionSlug !== "all" ? collectionSlug : ""))?.toLowerCase() === c.toLowerCase();
                const cnt = countFor(facets.categories, c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set("category", c)}
                    aria-pressed={active}
                    className={`w-full flex items-center justify-between px-2 py-2 rounded text-sm transition-all ${
                      active
                        ? "bg-[#F5F5F6] text-[#111111] font-semibold"
                        : "text-[#444748] hover:bg-[#FAFAFA] hover:text-[#111111]"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-xs"><span aria-hidden="true" className={`w-4 h-4 border rounded-[2px] grid place-items-center ${active ? "bg-black text-white border-black" : "border-[#D4D5D9]"}`}>{active ? "✓" : ""}</span><span className="capitalize">{c}</span></span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-[11px] text-[#94969F]">({cnt})</span>
                      {active && <span className="w-2 h-2 rounded-full bg-[#E11B22] shrink-0" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </FilterSection>
        )}

        {/* Price */}
        <FilterSection open={open} setOpen={setOpen}
          id="price"
          label="Price Range"
          count={0}
          right={
            <span className="text-[11px] font-bold text-[#E11B22]">
              ₹{priceRange[0].toLocaleString()} – ₹{priceRange[1].toLocaleString()}
            </span>
          }
        >
          {/* Dual range slider */}
          <div className="relative h-5 mx-1 mt-1">
            <div className="absolute top-1/2 left-0 right-0 h-1.5 -translate-y-1/2 bg-[#EEEEEE] rounded-full" />
            <div
              className="absolute top-1/2 h-1.5 -translate-y-1/2 bg-[#111111] rounded-full"
              style={{
                left:  `${((priceRange[0] - MIN_BOUND) / (MAX_BOUND - MIN_BOUND)) * 100}%`,
                right: `${(1 - (priceRange[1] - MIN_BOUND) / (MAX_BOUND - MIN_BOUND)) * 100}%`,
              }}
            />
            <input
              aria-label="Minimum price"
              type="range" min={MIN_BOUND} max={MAX_BOUND} step={STEP}
              value={priceRange[0]} onChange={onMinChange}
              className="filter-range absolute left-0 right-0 top-1/2 -translate-y-1/2 w-full appearance-none bg-transparent cursor-pointer accent-[#111111]"
            />
            <input
              aria-label="Maximum price"
              type="range" min={MIN_BOUND} max={MAX_BOUND} step={STEP}
              value={priceRange[1]} onChange={onMaxChange}
              className="filter-range absolute left-0 right-0 top-1/2 -translate-y-1/2 w-full appearance-none bg-transparent cursor-pointer accent-[#111111]"
            />
          </div>

          <div className="flex justify-between text-[10px] text-[#94969F] mt-2 px-0.5 font-medium">
            <span>₹{MIN_BOUND.toLocaleString()}</span>
            <span>₹{MAX_BOUND.toLocaleString()}+</span>
          </div>

          {/* Quick budget presets */}
          <div className="grid grid-cols-2 gap-1.5 pt-3">
            {PRICE_PRESETS.map((preset) => {
              const active = priceRange[0] === preset.min && priceRange[1] === preset.max;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPricePreset(preset.min, preset.max)}
                  className={`py-1.5 px-1.5 rounded text-center text-[11px] font-semibold transition-all ${
                    active
                      ? "bg-[#111111] text-white"
                      : "bg-[#F5F5F6] hover:bg-[#EEEEEE] text-[#444748]"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </FilterSection>


        {/* Brand */}
        {facets.brands.length > 0 && (
          <FilterSection open={open} setOpen={setOpen} id="brand" label="Brands" count={filters.brand.length}>
            <div className="relative mb-2">
              <HiSearch className="absolute left-2 top-2 text-[#94969F] text-[14px]" />
              <input
                type="text"
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                placeholder="Search brands..."
                className="w-full bg-[#F5F5F6] pl-7 pr-2 py-1.5 rounded text-sm outline-none text-[#111111] placeholder:text-[#94969F]"
              />
            </div>
            <div className="space-y-0.5 max-h-44 overflow-y-auto pr-1">
              {visibleBrands.length === 0 && (
                <p className="text-xs text-[#94969F] py-1">No brands match "{brandSearch}"</p>
              )}
              {visibleBrands.map(({ _id: b, count }) => {
                const active = filters.brand.includes(b);
                return (
                  <label
                    key={b}
                    className="flex items-center justify-between cursor-pointer group px-2 py-1.5 rounded hover:bg-[#FAFAFA]"
                  >
                    <span className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded-[2px] border flex items-center justify-center shrink-0 transition-all ${
                        active ? "bg-[#E11B22] border-[#E11B22]" : "border-[#D4D5D9]"
                      }`}>
                        {active && (
                          <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none">
                            <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => set("brand", b, "checkbox")}
                        className="sr-only"
                      />
                      <span className={`text-sm ${active ? "text-[#111111] font-semibold" : "text-[#444748]"}`}>{b}</span>
                    </span>
                    <span className="text-[11px] text-[#94969F]">({count})</span>
                  </label>
                );
              })}
            </div>
          </FilterSection>
        )}

        {/* Gender */}
        {genders.length > 0 && (
          <FilterSection open={open} setOpen={setOpen} id="gender" label="Gender" count={filters.gender ? 1 : 0}>
            <div className="flex flex-wrap gap-2">
              {genders.map((g) => {
                const active = filters.gender === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => set("gender", g)}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-full border transition-all ${
                      active
                        ? "border-[#111111] bg-[#111111] text-white"
                        : "border-[#D4D5D9] text-[#444748] hover:border-[#111111] hover:text-[#111111]"
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </FilterSection>
        )}

        {/* Color — driven by real catalog values (CSS accepts named colors like "PeachPuff" directly) */}
        {facets.colors.length > 0 && (
          <FilterSection open={open} setOpen={setOpen} id="color" label="Colors" count={filters.color ? 1 : 0}>
            <div className="grid grid-cols-2 gap-y-1 gap-x-2">
              {facets.colors.map(({ _id: color, count }) => {
                const active = filters.color === color;
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => set("color", color)}
                    className={`flex items-center gap-1.5 px-1.5 py-1.5 rounded transition-all ${
                      active ? "bg-[#F5F5F6]" : "hover:bg-[#FAFAFA]"
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full relative shrink-0 ring-1 ring-[#D4D5D9]"
                      style={{ backgroundColor: color }}
                    />
                    <span className={`text-[12px] truncate ${active ? "text-[#111111] font-bold" : "text-[#444748]"}`}>
                      {color}
                    </span>
                    <span className="text-[11px] text-[#94969F] shrink-0">({count})</span>
                  </button>
                );
              })}
            </div>
          </FilterSection>
        )}

        {/* Size */}
        <FilterSection open={open} setOpen={setOpen} id="size" label="Garment Size" count={filters.size.length}>
          <div className="grid grid-cols-4 gap-1.5">
            {SIZES.map((s) => {
              const active = filters.size.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => set("size", s, "checkbox")}
                  className={`h-9 text-xs font-bold rounded transition-all ${
                    active
                      ? "bg-[#111111] text-white shadow-sm"
                      : "bg-[#F5F5F6] text-[#444748] hover:bg-[#111111] hover:text-white"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </FilterSection>

        {/* Fabric */}
        {materials.length > 0 && (
          <FilterSection open={open} setOpen={setOpen} id="material" label="Fabric" count={filters.material.length}>
            <div className="space-y-1">
              {materials.map((m) => {
                const active = filters.material.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => set("material", m, "checkbox")}
                    className={`w-full flex items-center gap-3 px-2 py-2 rounded text-sm transition-all ${
                      active
                        ? "bg-[#F5F5F6] text-[#111111]"
                        : "text-[#444748] hover:bg-[#FAFAFA] hover:text-[#111111]"
                    }`}
                  >
                    {/* Custom checkbox */}
                    <span className={`w-4 h-4 rounded-[2px] border flex items-center justify-center shrink-0 transition-all ${
                      active ? "bg-[#E11B22] border-[#E11B22]" : "border-[#D4D5D9]"
                    }`}>
                      {active && (
                        <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none">
                          <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span className={`capitalize ${active ? "font-semibold" : ""}`}>{m}</span>
                  </button>
                );
              })}
            </div>
          </FilterSection>
        )}

        <div className="h-2" />
      </div>
    </div>
  );
};

export default FilterSidebar;
