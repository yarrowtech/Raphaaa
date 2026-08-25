import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import { FaPlus, FaTrash, FaEdit, FaEye, FaEyeSlash } from "react-icons/fa";
import { HiX } from "react-icons/hi";

const BACKEND = import.meta.env.VITE_BACKEND_URL;
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem("userToken")}` });

const OVERLAY_OPTIONS = [
  { label: "Left", value: "left" },
  { label: "Right", value: "right" },
  { label: "Top", value: "top" },
  { label: "Bottom", value: "bottom" },
];

const EMPTY = {
  title: "", subtitle: "", description: "", badge: "",
  ctaText: "Shop Now", ctaLink: "/collections/all",
  ctaSecondaryText: "", ctaSecondaryLink: "",
  textAlign: "left", contentPosition: "bottom", overlayDirection: "left", isVisible: true,
};

const directionToOverlayClass = (direction) => {
  switch (direction) {
    case "right":
      return "bg-linear-to-l from-sky-950/80 via-sky-900/40 to-transparent";
    case "top":
      return "bg-linear-to-b from-sky-950/80 via-sky-900/40 to-transparent";
    case "bottom":
      return "bg-linear-to-t from-sky-950/80 via-sky-900/40 to-transparent";
    case "left":
    default:
      return "bg-linear-to-r from-sky-950/80 via-sky-900/40 to-transparent";
  }
};

const inferOverlayDirection = (value) => {
  const overlay = String(value || "");
  if (overlay.includes("bg-linear-to-l")) return "right";
  if (overlay.includes("bg-linear-to-b")) return "top";
  if (overlay.includes("bg-linear-to-t")) return "bottom";
  return "left";
};

/* ── Slide form (used in modal) ── */
const SlideForm = ({ initial, existingImage, onSave, onCancel, saving }) => {
  const [form, setForm]     = useState(initial || EMPTY);
  const [file, setFile]     = useState(null);
  const [preview, setPreview] = useState(existingImage || "");
  const fileRef = useRef();

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const inp = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400 transition";

  const onFile = (f) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  return (
    <div className="space-y-5">

      {/* Image upload zone */}
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
          Slide Image <span className="text-red-400">*</span>
        </label>
        <div
          onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="relative cursor-pointer border-2 border-dashed border-sky-300 hover:border-sky-500 rounded-2xl overflow-hidden transition group"
          style={{ aspectRatio: "16/5" }}
        >
          {preview ? (
            <>
              <img src={preview} alt="preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <p className="text-white text-sm font-bold bg-black/50 px-3 py-1.5 rounded-full">Click or drag to replace</p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-sky-400 py-8">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm font-semibold">Drag & drop or click to upload</p>
              <p className="text-xs text-gray-400">Recommended: 1440 × 500px · JPG / PNG / WebP</p>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files[0])} />
        </div>
      </div>

      {/* Text fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Badge Chip</label>
          <input className={inp} placeholder='e.g. "New Season" or "Sale"' value={form.badge} onChange={(e) => set("badge", e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Title <span className="text-red-400">*</span></label>
          <input className={inp} placeholder="e.g. Summer Collection" value={form.title} onChange={(e) => set("title", e.target.value)} />
          <p className="text-[10px] text-gray-400 mt-0.5">Use \n to break into two lines</p>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Subtitle</label>
          <input className={inp} placeholder="e.g. Fresh Arrivals · 2025" value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Description</label>
          <input className={inp} placeholder="Short line below subtitle" value={form.description} onChange={(e) => set("description", e.target.value)} />
        </div>
      </div>

      {/* CTA buttons */}
      <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 space-y-3">
        <p className="text-xs font-bold text-sky-700 uppercase tracking-widest">Call-to-Action Buttons</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Primary Text</label>
            <input className={inp} placeholder="Shop Now" value={form.ctaText} onChange={(e) => set("ctaText", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Primary Link</label>
            <input className={inp} placeholder="/collections/all" value={form.ctaLink} onChange={(e) => set("ctaLink", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Secondary Text <span className="text-gray-400 font-normal">(optional)</span></label>
            <input className={inp} placeholder="View All" value={form.ctaSecondaryText} onChange={(e) => set("ctaSecondaryText", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Secondary Link</label>
            <input className={inp} placeholder="/collections/all?gender=Women" value={form.ctaSecondaryLink} onChange={(e) => set("ctaSecondaryLink", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Style */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Text Position</label>
          <div className="flex gap-2">
            {["left", "center", "right"].map((a) => (
              <button key={a} type="button" onClick={() => set("textAlign", a)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition capitalize ${form.textAlign === a ? "bg-sky-600 text-white border-sky-600" : "border-gray-200 text-gray-600 hover:border-sky-300"}`}>
                {a}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Content Position</label>
          <div className="flex gap-2">
            {["top", "center", "bottom"].map((position) => (
              <button
                key={position}
                type="button"
                onClick={() => set("contentPosition", position)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition capitalize ${
                  form.contentPosition === position
                    ? "bg-sky-600 text-white border-sky-600"
                    : "border-gray-200 text-gray-600 hover:border-sky-300"
                }`}
              >
                {position}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Overlay Direction</label>
          <div className="grid grid-cols-2 gap-2">
            {OVERLAY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => set("overlayDirection", option.value)}
                className={`py-2 rounded-xl text-xs font-bold border transition capitalize ${
                  form.overlayDirection === option.value
                    ? "bg-sky-600 text-white border-sky-600"
                    : "border-gray-200 text-gray-600 hover:border-sky-300"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-1">Dark overlay fades toward the selected side</p>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Visibility</label>
          <div className="flex items-center gap-3 h-10">
            <div onClick={() => set("isVisible", !form.isVisible)}
              className={`relative w-11 h-6 rounded-full cursor-pointer transition-colors ${form.isVisible ? "bg-emerald-500" : "bg-gray-300"}`}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.isVisible ? "left-6" : "left-1"}`} />
            </div>
            <span className={`text-sm font-semibold ${form.isVisible ? "text-emerald-600" : "text-gray-400"}`}>
              {form.isVisible ? "Visible" : "Hidden"}
            </span>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <button type="button" onClick={onCancel}
          className="px-5 py-2.5 rounded-xl text-sm font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
          Cancel
        </button>
        <button type="button"
          onClick={() => onSave(form, file)}
          disabled={saving || !form.title || !preview}
          className={`px-7 py-2.5 rounded-xl text-sm font-bold transition shadow-sm ${
            saving || !form.title || !preview
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-sky-600 hover:bg-sky-700 text-white"
          }`}>
          {saving ? "Saving…" : "Save Slide"}
        </button>
      </div>
    </div>
  );
};

/* ── Main HeroSettings page ── */
export default function HeroSettings() {
  const [slides, setSlides]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null); // null | "add" | slideObject
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = () => {
    setLoading(true);
    axios.get(`${BACKEND}/api/hero-slides/all`, { headers: authH() })
      .then(({ data }) => setSlides(data))
      .catch(() => toast.error("Failed to load slides"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form, file) => {
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
      if (file) fd.append("image", file);
      else if (modal?._id && modal.image) fd.append("imageUrl", modal.image);

      if (modal?._id) {
        await axios.put(`${BACKEND}/api/hero-slides/${modal._id}`, fd, { headers: authH() });
        toast.success("Slide updated!");
      } else {
        await axios.post(`${BACKEND}/api/hero-slides`, fd, { headers: authH() });
        toast.success("Slide added!");
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this slide permanently?")) return;
    setDeleting(id);
    try {
      await axios.delete(`${BACKEND}/api/hero-slides/${id}`, { headers: authH() });
      setSlides((p) => p.filter((s) => s._id !== id));
      toast.success("Slide deleted");
    } catch { toast.error("Delete failed"); }
    finally { setDeleting(null); }
  };

  const handleToggle = async (slide) => {
    try {
      const { data } = await axios.patch(`${BACKEND}/api/hero-slides/${slide._id}/toggle`, {}, { headers: authH() });
      setSlides((p) => p.map((s) => s._id === slide._id ? { ...s, isVisible: data.isVisible } : s));
    } catch { toast.error("Toggle failed"); }
  };

  const move = async (idx, dir) => {
    const arr = [...slides];
    const to  = idx + dir;
    if (to < 0 || to >= arr.length) return;
    [arr[idx], arr[to]] = [arr[to], arr[idx]];
    setSlides(arr);
    try {
      await axios.post(`${BACKEND}/api/hero-slides/reorder`,
        { order: arr.map((s, i) => ({ id: s._id, order: i })) },
        { headers: authH() }
      );
    } catch { toast.error("Reorder failed"); load(); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-gray-800">Hero Carousel</h1>
          <p className="text-xs text-gray-400 mt-1">Add slides with images, text, and CTA buttons for the homepage banner</p>
        </div>
        <button onClick={() => setModal("add")}
          className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold rounded-xl shadow-sm transition">
          <FaPlus className="text-xs" /> Add Slide
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Slides",   value: slides.length,                          color: "bg-sky-50 border-sky-100 text-sky-700" },
          { label: "Live / Visible", value: slides.filter(s => s.isVisible).length, color: "bg-emerald-50 border-emerald-100 text-emerald-700" },
          { label: "Hidden",         value: slides.filter(s => !s.isVisible).length,color: "bg-gray-50 border-gray-200 text-gray-500" },
          { label: "Tip",            value: "Drag ↑↓ to reorder",                  color: "bg-amber-50 border-amber-100 text-amber-700", small: true },
        ].map(({ label, value, color, small }) => (
          <div key={label} className={`border rounded-xl px-4 py-3 ${color}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</p>
            <p className={`font-extrabold mt-0.5 ${small ? "text-xs" : "text-xl"}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Slide list */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-gray-400 text-sm">
          <span className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          Loading…
        </div>
      ) : slides.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-sky-200 rounded-2xl text-center gap-3">
          <p className="text-5xl">🖼️</p>
          <p className="text-sm font-semibold text-gray-500">No slides yet — the homepage uses default slides</p>
          <button onClick={() => setModal("add")} className="px-5 py-2 bg-sky-600 text-white text-sm font-bold rounded-xl hover:bg-sky-700 transition">
            Add First Slide
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {slides.map((slide, idx) => (
            <div key={slide._id}
              className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition-all hover:shadow-md ${slide.isVisible ? "border-gray-100" : "border-dashed border-gray-300"}`}>
              <div className="flex items-stretch">

                {/* Order controls */}
                <div className="flex flex-col items-center justify-center px-3 bg-gray-50 border-r border-gray-100 gap-1 shrink-0">
                  <button onClick={() => move(idx, -1)} disabled={idx === 0}
                    className="w-7 h-7 rounded-lg text-[11px] font-bold text-gray-400 hover:bg-sky-100 hover:text-sky-600 disabled:opacity-30 transition">
                    ▲
                  </button>
                  <span className="text-xs font-extrabold text-gray-500 w-5 text-center">{idx + 1}</span>
                  <button onClick={() => move(idx, 1)} disabled={idx === slides.length - 1}
                    className="w-7 h-7 rounded-lg text-[11px] font-bold text-gray-400 hover:bg-sky-100 hover:text-sky-600 disabled:opacity-30 transition">
                    ▼
                  </button>
                </div>

                {/* Thumbnail */}
                <div className="w-28 sm:w-44 shrink-0 relative overflow-hidden" style={{ minHeight: "90px" }}>
                  <img src={slide.image} alt={slide.title} className={`w-full h-full object-cover ${!slide.isVisible ? "opacity-40 grayscale" : ""}`} />
                  {!slide.isVisible && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] font-bold bg-gray-700/70 text-white px-2 py-0.5 rounded-full">Hidden</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 p-4 min-w-0 flex flex-col justify-between">
                  <div>
                    {slide.badge && (
                      <span className="inline-block text-[10px] font-bold bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full mb-1.5">
                        {slide.badge}
                      </span>
                    )}
                    <p className="text-sm font-bold text-gray-800 leading-snug">
                      {slide.title?.replace(/\\n/g, " ")}
                    </p>
                    {slide.subtitle && <p className="text-xs text-gray-400 mt-0.5 truncate">{slide.subtitle}</p>}
                    {(slide.ctaText?.trim() && slide.ctaLink?.trim()) || (slide.ctaSecondaryText?.trim() && slide.ctaSecondaryLink?.trim()) ? (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                      {slide.ctaText?.trim() && slide.ctaLink?.trim() ? (
                        <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full">
                          [{slide.ctaText}] → {slide.ctaLink}
                        </span>
                      ) : null}
                      {slide.ctaSecondaryText?.trim() && slide.ctaSecondaryLink?.trim() ? (
                        <span className="text-[10px] bg-gray-50 text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full">
                          [{slide.ctaSecondaryText}] → {slide.ctaSecondaryLink}
                        </span>
                      ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${slide.isVisible ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-gray-50 text-gray-400 border-gray-200"}`}>
                      {slide.isVisible ? "● Live" : "○ Hidden"}
                    </span>
                    <span className="text-[10px] text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
                      Align: {slide.textAlign}
                    </span>
                    <span className="text-[10px] text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
                      Pos: {slide.contentPosition || "bottom"}
                    </span>
                    <span className="text-[10px] text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
                      Overlay: {slide.overlayDirection || inferOverlayDirection(slide.overlayColor)}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col items-center justify-center gap-2 px-3 sm:px-4 border-l border-gray-100 shrink-0">
                  <button onClick={() => handleToggle(slide)} title={slide.isVisible ? "Hide slide" : "Show slide"}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center border transition ${slide.isVisible ? "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-100"}`}>
                    {slide.isVisible ? <FaEye className="text-sm" /> : <FaEyeSlash className="text-sm" />}
                  </button>
                  <button onClick={() => setModal(slide)} title="Edit slide"
                    className="w-9 h-9 rounded-xl flex items-center justify-center border border-sky-200 bg-sky-50 text-sky-600 hover:bg-sky-100 transition">
                    <FaEdit className="text-sm" />
                  </button>
                  <button onClick={() => handleDelete(slide._id)} disabled={deleting === slide._id} title="Delete"
                    className="w-9 h-9 rounded-xl flex items-center justify-center border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-40 transition">
                    {deleting === slide._id
                      ? <span className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      : <FaTrash className="text-sm" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL ── */}
      {modal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto flex items-start justify-center pt-6 pb-10 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-800">
                  {modal === "add" ? "➕ Add New Slide" : "✏️ Edit Slide"}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Upload an image and fill in the text for this carousel slide</p>
              </div>
              <button onClick={() => setModal(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition">
                <HiX />
              </button>
            </div>
            <div className="p-6">
              <SlideForm
                initial={modal === "add" ? null : {
                  title: modal.title, subtitle: modal.subtitle, description: modal.description,
                  badge: modal.badge, ctaText: modal.ctaText, ctaLink: modal.ctaLink,
                  ctaSecondaryText: modal.ctaSecondaryText, ctaSecondaryLink: modal.ctaSecondaryLink,
                  textAlign: modal.textAlign,
                  contentPosition: modal.contentPosition || "bottom",
                  overlayDirection: modal.overlayDirection || inferOverlayDirection(modal.overlayColor),
                  isVisible: modal.isVisible,
                }}
                existingImage={modal === "add" ? "" : modal.image}
                onSave={handleSave}
                onCancel={() => setModal(null)}
                saving={saving}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
