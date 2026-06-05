import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { HiChevronDown, HiChevronUp, HiX } from "react-icons/hi";

const MIN_BOUND = 500;
const MAX_BOUND = 10000;
const STEP = 50;

const COLOR_MAP = {
  Red: "#ef4444",   Blue: "#3b82f6",  Black: "#111827",  Green: "#22c55e",
  Yellow: "#eab308",Gray: "#9ca3af",  White: "#f3f4f6",  Pink: "#ec4899",
  Beige: "#e5d5b7", Navy: "#1e3a5f",  Orange: "#f97316", Purple: "#a855f7",
  Brown: "#92400e", Teal: "#14b8a6",  Olive: "#7c8c3b",  Maroon: "#7f1d1d",
};

const FilterSidebar = ({ onClose }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories]     = useState([]);
  const [genders,    setGenders]        = useState([]);
  const [materials,  setMaterials]      = useState([]);

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

  const [filters, setFilters]     = useState({
    category: "", gender: "", color: "",
    size: [], material: [], minPrice: MIN_BOUND, maxPrice: MAX_BOUND,
  });
  const [priceRange, setPriceRange] = useState([MIN_BOUND, MAX_BOUND]);
  const [open, setOpen]             = useState({
    category: true, gender: true, color: true, size: true, material: true, price: true,
  });
  const [priceDebounceTimer, setPriceDebounceTimer] = useState(null);

  const COLORS  = Object.keys(COLOR_MAP);
  const SIZES   = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];

  /* ── sync URL → state ── */
  useEffect(() => {
    const p   = Object.fromEntries([...searchParams]);
    const min = p.minPrice ? Number(p.minPrice) : MIN_BOUND;
    const max = p.maxPrice ? Number(p.maxPrice) : MAX_BOUND;
    setFilters({
      category:  p.category  || "",
      gender:    p.gender    || "",
      color:     p.color     || "",
      size:      p.size      ? p.size.split(",")     : [],
      material:  p.material  ? p.material.split(",") : [],
      minPrice:  isNaN(min) ? MIN_BOUND : min,
      maxPrice:  isNaN(max) ? MAX_BOUND : max,
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
    const t = setTimeout(() => push(nf), 220);
    setPriceDebounceTimer(t);
  };
  const onMaxChange = (e) => {
    const next = [priceRange[0], clamp(Number(e.target.value), priceRange[0], MAX_BOUND)];
    setPriceRange(next);
    const nf = { ...filters, minPrice: next[0], maxPrice: next[1] };
    setFilters(nf);
    if (priceDebounceTimer) clearTimeout(priceDebounceTimer);
    const t = setTimeout(() => push(nf), 220);
    setPriceDebounceTimer(t);
  };

  useEffect(() => {
    return () => {
      if (priceDebounceTimer) clearTimeout(priceDebounceTimer);
    };
  }, [priceDebounceTimer]);

  const hasFilters = [...searchParams.keys()].some((k) => k !== "sortBy");
  const clearAll = () => {
    const params = new URLSearchParams();
    const sort = searchParams.get("sortBy");
    if (sort) params.set("sortBy", sort);
    setSearchParams(params);
    onClose?.();
  };

  const activeCount = [...searchParams.keys()].filter((k) => k !== "sortBy").length;

  /* ── section toggle ── */
  const Section = ({ id, label, children }) => (
    <div className="border-b border-gray-100 last:border-b-0 py-5">
      <button
        type="button"
        onClick={() => setOpen((p) => ({ ...p, [id]: !p[id] }))}
        className="w-full flex items-center justify-between group"
      >
        <span className="text-[11px] font-bold tracking-[0.12em] text-gray-800 uppercase">{label}</span>
        {open[id]
          ? <HiChevronUp className="text-gray-400 text-sm group-hover:text-gray-700 transition" />
          : <HiChevronDown className="text-gray-400 text-sm group-hover:text-gray-700 transition" />
        }
      </button>
      {open[id] && <div className="mt-4">{children}</div>}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold tracking-[0.15em] text-gray-900 uppercase">Filters</span>
          {activeCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-gray-900 text-white text-[10px] font-bold flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {hasFilters && (
            <button
              onClick={clearAll}
              className="text-[10px] font-semibold tracking-wide text-gray-500 hover:text-gray-900 uppercase underline underline-offset-2 transition"
            >
              Clear all
            </button>
          )}
          {/* Mobile close */}
          {onClose && (
            <button onClick={onClose}
              className="lg:hidden w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition">
              <HiX className="text-gray-500 text-sm" />
            </button>
          )}
        </div>
      </div>

      {/* ── Sections ── */}
      <div className="flex-1 overflow-y-auto px-5">

        {/* Category */}
        {categories.length > 0 && (
          <Section id="category" label="Category">
            <div className="space-y-2.5">
              {categories.map((c) => {
                const active = filters.category === c;
                return (
                  <button key={c} type="button"
                    onClick={() => set("category", c)}
                    className="w-full flex items-center justify-between group"
                  >
                    <span className={`text-sm transition ${active ? "font-semibold text-gray-900" : "text-gray-500 group-hover:text-gray-800"}`}>
                      {c}
                    </span>
                    {active && <div className="w-1.5 h-1.5 rounded-full bg-gray-900" />}
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        {/* Gender */}
        {genders.length > 0 && (
          <Section id="gender" label="Gender">
            <div className="flex flex-wrap gap-2">
              {genders.map((g) => {
                const active = filters.gender === g;
                return (
                  <button key={g} type="button"
                    onClick={() => set("gender", g)}
                    className={`px-4 py-1.5 text-xs font-semibold border rounded-full transition-all
                      ${active
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900"
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
        <Section id="color" label="Color">
          <div className="grid grid-cols-6 gap-2.5">
            {COLORS.map((color) => {
              const hex    = COLOR_MAP[color];
              const active = filters.color === color;
              const isWhite = color === "White";
              return (
                <button
                  key={color}
                  type="button"
                  title={color}
                  onClick={() => set("color", color)}
                  className={`relative w-8 h-8 rounded-full transition-all duration-150 ${
                    active
                      ? "ring-2 ring-offset-2 ring-gray-900 scale-110"
                      : "hover:scale-110"
                  } ${isWhite ? "border border-gray-200" : ""}`}
                  style={{ backgroundColor: hex }}
                >
                  {active && (
                    <svg className="absolute inset-0 m-auto w-3 h-3" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke={isWhite ? "#111" : "#fff"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
          {filters.color && (
            <p className="text-[11px] text-gray-500 mt-3 flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full inline-block border border-gray-200" style={{ background: COLOR_MAP[filters.color] }} />
              {filters.color}
              <button onClick={() => set("color", "")} className="ml-1 text-gray-400 hover:text-gray-700 transition">×</button>
            </p>
          )}
        </Section>

        {/* Size */}
        <Section id="size" label="Size">
          <div className="grid grid-cols-4 gap-2">
            {SIZES.map((s) => {
              const active = filters.size.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => set("size", s, "checkbox")}
                  className={`h-9 text-xs font-semibold border transition-all rounded
                    ${active
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 text-gray-600 hover:border-gray-500 hover:text-gray-900"
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
          <Section id="material" label="Fabric">
            <div className="space-y-2.5">
              {materials.map((m) => {
                const active = filters.material.includes(m);
                return (
                  <label key={m} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all
                      ${active ? "bg-gray-900 border-gray-900" : "border-gray-300 group-hover:border-gray-600"}`}>
                      {active && (
                        <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none">
                          <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <input type="checkbox" className="hidden" checked={active}
                      onChange={() => set("material", m, "checkbox")} />
                    <span className={`text-sm transition ${active ? "text-gray-900 font-medium" : "text-gray-500 group-hover:text-gray-800"}`}>
                      {m}
                    </span>
                  </label>
                );
              })}
            </div>
          </Section>
        )}

        {/* Price */}
        <Section id="price" label="Price">
          {/* Price chips */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-gray-800 bg-gray-100 px-2.5 py-1 rounded">
              ₹{priceRange[0].toLocaleString()}
            </span>
            <div className="h-px flex-1 mx-2 bg-gray-200" />
            <span className="text-xs font-semibold text-gray-800 bg-gray-100 px-2.5 py-1 rounded">
              ₹{priceRange[1].toLocaleString()}
            </span>
          </div>

          {/* Dual slider */}
          <div className="relative py-2 mx-1">
            <div className="h-0.5 bg-gray-200 rounded-full" />
            <div
              className="absolute top-1/2 -translate-y-1/2 h-0.5 bg-gray-900 rounded-full"
              style={{
                left:  `${((priceRange[0] - MIN_BOUND) / (MAX_BOUND - MIN_BOUND)) * 100}%`,
                right: `${(1 - (priceRange[1] - MIN_BOUND) / (MAX_BOUND - MIN_BOUND)) * 100}%`,
              }}
            />
            <input type="range" min={MIN_BOUND} max={MAX_BOUND} step={STEP}
              value={priceRange[0]} onChange={onMinChange}
              className="absolute left-0 right-0 top-1/2 -translate-y-1/2 w-full appearance-none bg-transparent pointer-events-auto accent-gray-900 cursor-pointer" />
            <input type="range" min={MIN_BOUND} max={MAX_BOUND} step={STEP}
              value={priceRange[1]} onChange={onMaxChange}
              className="absolute left-0 right-0 top-1/2 -translate-y-1/2 w-full appearance-none bg-transparent pointer-events-auto accent-gray-900 cursor-pointer" />
          </div>

          <div className="flex justify-between text-[10px] text-gray-400 mt-2 px-1">
            <span>₹{MIN_BOUND.toLocaleString()}</span>
            <span>₹{MAX_BOUND.toLocaleString()}</span>
          </div>
        </Section>
      </div>
    </div>
  );
};

export default FilterSidebar;
