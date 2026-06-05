import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { HiChevronDown, HiChevronUp, HiX } from "react-icons/hi";
import { MdFilterList } from "react-icons/md";

const MIN_BOUND = 500;
const MAX_BOUND = 10000;
const STEP = 50;

const COLOR_MAP = {
  Red: "#ef4444",   Blue: "#3b82f6",  Black: "#111827",  Green: "#22c55e",
  Yellow: "#eab308", Gray: "#9ca3af", White: "#f3f4f6",  Pink: "#ec4899",
  Beige: "#e5d5b7", Navy: "#1e3a5f",  Orange: "#f97316", Purple: "#a855f7",
  Brown: "#92400e", Teal: "#14b8a6",  Olive: "#7c8c3b",  Maroon: "#7f1d1d",
};

const FilterSidebar = ({ onClose }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [genders,    setGenders]    = useState([]);
  const [materials,  setMaterials]  = useState([]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/meta-options/public`)
      .then((r) => r.json())
      .then((data) => {
        setCategories(data.filter((o) => o.type === "category").map((o) => o.value));
        setGenders(   data.filter((o) => o.type === "gender"  ).map((o) => o.value));
        setMaterials( data.filter((o) => o.type === "material").map((o) => o.value));
      })
      .catch(console.error);
  }, []);

  const [filters, setFilters] = useState({
    category: "", gender: "", color: "",
    size: [], material: [], minPrice: MIN_BOUND, maxPrice: MAX_BOUND,
  });
  const [priceRange, setPriceRange] = useState([MIN_BOUND, MAX_BOUND]);
  const [open, setOpen] = useState({
    category: true, gender: true, color: true, size: true, material: false, price: true,
  });
  const [priceDebounceTimer, setPriceDebounceTimer] = useState(null);

  const COLORS = Object.keys(COLOR_MAP);
  const SIZES  = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];

  /* ── sync URL → state ── */
  useEffect(() => {
    const p   = Object.fromEntries([...searchParams]);
    const min = p.minPrice ? Number(p.minPrice) : MIN_BOUND;
    const max = p.maxPrice ? Number(p.maxPrice) : MAX_BOUND;
    setFilters({
      category: p.category || "",
      gender:   p.gender   || "",
      color:    p.color    || "",
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

  const push = (nf) => {
    const params = new URLSearchParams();
    Object.entries(nf).forEach(([k, v]) => {
      if (Array.isArray(v) && v.length) params.append(k, v.join(","));
      else if (v !== "" && v != null &&
        !(k === "maxPrice" && Number(v) === MAX_BOUND) &&
        !(k === "minPrice" && Number(v) === MIN_BOUND)
      ) params.append(k, v);
    });
    const sort = searchParams.get("sortBy");
    if (sort) params.set("sortBy", sort);
    setSearchParams(params);
  };

  const set = (name, value, type = "radio") => {
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

  const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));

  const onMinChange = (e) => {
    const next = [clamp(Number(e.target.value), MIN_BOUND, priceRange[1]), priceRange[1]];
    setPriceRange(next);
    const nf = { ...filters, minPrice: next[0], maxPrice: next[1] };
    setFilters(nf);
    if (priceDebounceTimer) clearTimeout(priceDebounceTimer);
    setPriceDebounceTimer(setTimeout(() => push(nf), 220));
  };
  const onMaxChange = (e) => {
    const next = [priceRange[0], clamp(Number(e.target.value), priceRange[0], MAX_BOUND)];
    setPriceRange(next);
    const nf = { ...filters, minPrice: next[0], maxPrice: next[1] };
    setFilters(nf);
    if (priceDebounceTimer) clearTimeout(priceDebounceTimer);
    setPriceDebounceTimer(setTimeout(() => push(nf), 220));
  };

  useEffect(() => () => { if (priceDebounceTimer) clearTimeout(priceDebounceTimer); }, [priceDebounceTimer]);

  const hasFilters  = [...searchParams.keys()].some((k) => k !== "sortBy");
  const activeCount = [...searchParams.keys()].filter((k) => k !== "sortBy").length;

  const clearAll = () => {
    const params = new URLSearchParams();
    const sort = searchParams.get("sortBy");
    if (sort) params.set("sortBy", sort);
    setSearchParams(params);
    onClose?.();
  };

  const removeFilter = (key) => {
    const params = new URLSearchParams(searchParams);
    params.delete(key);
    setSearchParams(params);
  };

  /* ── section accordion ── */
  const Section = ({ id, label, count, children }) => (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((p) => ({ ...p, [id]: !p[id] }))}
        className="w-full flex items-center justify-between py-3.5 group"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tracking-wide text-gray-800 uppercase">{label}</span>
          {count > 0 && (
            <span className="w-4 h-4 rounded-full bg-sky-500 text-white text-[9px] font-bold flex items-center justify-center">
              {count}
            </span>
          )}
        </div>
        {open[id]
          ? <HiChevronUp className="text-gray-400 text-sm shrink-0 group-hover:text-sky-500 transition-colors" />
          : <HiChevronDown className="text-gray-400 text-sm shrink-0 group-hover:text-sky-500 transition-colors" />
        }
      </button>
      {open[id] && <div className="pb-4">{children}</div>}
    </div>
  );

  /* active filter chips for display */
  const chips = [
    ...(filters.category ? [{ key: "category", label: filters.category }] : []),
    ...(filters.gender   ? [{ key: "gender",   label: filters.gender   }] : []),
    ...(filters.color    ? [{ key: "color",    label: filters.color    }] : []),
    ...filters.size.map((s) => ({ key: "size",     label: s })),
    ...filters.material.map((m) => ({ key: "material", label: m })),
    ...(filters.minPrice !== MIN_BOUND || filters.maxPrice !== MAX_BOUND
      ? [{ key: "price", label: `₹${filters.minPrice.toLocaleString()} – ₹${filters.maxPrice.toLocaleString()}` }]
      : []),
  ];

  return (
    <div className="flex flex-col h-full bg-white">

      {/* ── Header ── */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MdFilterList className="text-sky-600 text-lg" />
            <span className="text-sm font-extrabold tracking-wide text-gray-900 uppercase">
              Filters
            </span>
            {activeCount > 0 && (
              <span className="min-w-4.5 h-4.5 rounded-full bg-sky-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                {activeCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasFilters && (
              <button
                onClick={clearAll}
                className="text-[10px] font-bold text-sky-600 hover:text-sky-800 uppercase tracking-wide border border-sky-200 hover:border-sky-400 rounded-full px-3 py-1 transition-all"
              >
                Clear All
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="lg:hidden w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition"
              >
                <HiX className="text-gray-600 text-sm" />
              </button>
            )}
          </div>
        </div>

        {/* Active filter chips */}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chips.map(({ key, label }) => (
              <span
                key={`${key}-${label}`}
                className="inline-flex items-center gap-1 bg-sky-50 border border-sky-200 text-sky-700 text-[10px] font-semibold px-2 py-0.5 rounded-full"
              >
                {label}
                <button
                  onClick={() => removeFilter(key)}
                  className="text-sky-400 hover:text-sky-700 transition ml-0.5"
                >
                  <HiX className="text-[9px]" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Sections ── */}
      <div className="flex-1 overflow-y-auto px-4">

        {/* Category */}
        {categories.length > 0 && (
          <Section id="category" label="Category" count={filters.category ? 1 : 0}>
            <div className="space-y-0.5">
              {categories.map((c) => {
                const active = filters.category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set("category", c)}
                    className={`w-full flex items-center justify-between px-2 py-2 rounded-lg text-sm transition-all ${
                      active
                        ? "bg-sky-50 text-sky-700 font-semibold"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <span className="capitalize">{c}</span>
                    {active && (
                      <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        {/* Gender */}
        {genders.length > 0 && (
          <Section id="gender" label="Gender" count={filters.gender ? 1 : 0}>
            <div className="flex flex-wrap gap-2">
              {genders.map((g) => {
                const active = filters.gender === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => set("gender", g)}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-full border-2 transition-all ${
                      active
                        ? "border-sky-500 bg-sky-500 text-white shadow-sm shadow-sky-200"
                        : "border-gray-200 text-gray-600 hover:border-sky-300 hover:text-sky-600 hover:bg-sky-50"
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        {/* Color */}
        <Section id="color" label="Color" count={filters.color ? 1 : 0}>
          <div className="grid grid-cols-4 gap-2">
            {COLORS.map((color) => {
              const hex    = COLOR_MAP[color];
              const active = filters.color === color;
              const isWhite = color === "White";
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => set("color", color)}
                  className={`flex flex-col items-center gap-1 p-1.5 rounded-xl border-2 transition-all ${
                    active
                      ? "border-sky-500 bg-sky-50 shadow-sm"
                      : "border-transparent hover:border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-full shadow-sm relative shrink-0 ${isWhite ? "border border-gray-200" : ""}`}
                    style={{ backgroundColor: hex }}
                  >
                    {active && (
                      <svg className="absolute inset-0 m-auto w-3 h-3" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke={isWhite ? "#0ea5e9" : "#fff"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className={`text-[9px] font-medium leading-none truncate w-full text-center ${active ? "text-sky-700" : "text-gray-500"}`}>
                    {color}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        {/* Size */}
        <Section id="size" label="Size" count={filters.size.length}>
          <div className="grid grid-cols-4 gap-1.5">
            {SIZES.map((s) => {
              const active = filters.size.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => set("size", s, "checkbox")}
                  className={`h-9 text-xs font-bold rounded-lg border-2 transition-all ${
                    active
                      ? "border-sky-500 bg-sky-500 text-white shadow-sm shadow-sky-200"
                      : "border-gray-200 text-gray-600 hover:border-sky-300 hover:text-sky-600 hover:bg-sky-50"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Fabric */}
        {materials.length > 0 && (
          <Section id="material" label="Fabric" count={filters.material.length}>
            <div className="space-y-1">
              {materials.map((m) => {
                const active = filters.material.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => set("material", m, "checkbox")}
                    className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-all ${
                      active
                        ? "bg-sky-50 text-sky-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    {/* Custom checkbox */}
                    <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                      active ? "bg-sky-500 border-sky-500" : "border-gray-300"
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
          </Section>
        )}

        {/* Price */}
        <Section id="price" label="Price Range" count={filters.minPrice !== MIN_BOUND || filters.maxPrice !== MAX_BOUND ? 1 : 0}>
          {/* Price display boxes */}
          <div className="flex items-center gap-2 mb-5">
            <div className="flex-1 rounded-lg border-2 border-gray-200 px-3 py-2 text-center">
              <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Min</p>
              <p className="text-sm font-bold text-gray-800">₹{priceRange[0].toLocaleString()}</p>
            </div>
            <div className="text-gray-300 font-bold text-lg">—</div>
            <div className="flex-1 rounded-lg border-2 border-gray-200 px-3 py-2 text-center">
              <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Max</p>
              <p className="text-sm font-bold text-gray-800">₹{priceRange[1].toLocaleString()}</p>
            </div>
          </div>

          {/* Dual range slider */}
          <div className="relative h-5 mx-1">
            {/* Track */}
            <div className="absolute top-1/2 left-0 right-0 h-1.5 -translate-y-1/2 bg-gray-100 rounded-full" />
            {/* Active range */}
            <div
              className="absolute top-1/2 h-1.5 -translate-y-1/2 bg-sky-500 rounded-full"
              style={{
                left:  `${((priceRange[0] - MIN_BOUND) / (MAX_BOUND - MIN_BOUND)) * 100}%`,
                right: `${(1 - (priceRange[1] - MIN_BOUND) / (MAX_BOUND - MIN_BOUND)) * 100}%`,
              }}
            />
            <input
              type="range" min={MIN_BOUND} max={MAX_BOUND} step={STEP}
              value={priceRange[0]} onChange={onMinChange}
              className="absolute left-0 right-0 top-1/2 -translate-y-1/2 w-full appearance-none bg-transparent cursor-pointer accent-sky-500"
            />
            <input
              type="range" min={MIN_BOUND} max={MAX_BOUND} step={STEP}
              value={priceRange[1]} onChange={onMaxChange}
              className="absolute left-0 right-0 top-1/2 -translate-y-1/2 w-full appearance-none bg-transparent cursor-pointer accent-sky-500"
            />
          </div>

          <div className="flex justify-between text-[10px] text-gray-400 mt-2 px-0.5 font-medium">
            <span>₹{MIN_BOUND.toLocaleString()}</span>
            <span>₹{MAX_BOUND.toLocaleString()}</span>
          </div>
        </Section>

        <div className="h-4" />
      </div>
    </div>
  );
};

export default FilterSidebar;
