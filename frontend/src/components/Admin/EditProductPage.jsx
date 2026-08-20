import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams, Link } from "react-router-dom";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import {
  fetchProductDetails,
  updateProduct,
} from "../../redux/slices/productsSlice";
import axios from "axios";
import { toast } from "sonner";
import {
  COLOR_OPTIONS,
  createColorOption,
  colorFilterOption,
  findColorOption,
  isValidCssColor,
  prettyColorLabel,
} from "../../utils/colorCatalog";
import { moveArrayItem } from "../../utils/reorderArray";

const API_BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:9000";

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL"].map((s) => ({
  value: s, label: s,
}));

const normalizeSize = (s) => {
  const t = String(s || "").trim().toUpperCase().replace(/\s+/g, "");
  if (t === "XLL" || t === "2XL") return "XXL";
  if (t === "XXXL") return "3XL";
  if (t === "XXXXL") return "4XL";
  if (t === "XXXXXL") return "5XL";
  return t;
};

const normalizeGenderLabel = (value) => {
  const gender = String(value || "").trim();
  const key = gender.toLowerCase();
  if (key === "male" || key === "men" || key === "man") return "Men";
  if (key === "female" || key === "women" || key === "woman") return "Women";
  if (key === "kids" || key === "kid" || key === "children" || key === "child") return "Kids";
  return gender;
};

const selectPortalTarget = typeof document !== "undefined" ? document.body : null;
const selectMenuStyles = {
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  menu: (base) => ({ ...base, zIndex: 9999 }),
};

const formatColorOptionLabel = (opt) => (
  <div className="flex items-center gap-2">
    <span
      className="w-4 h-4 rounded-full border border-gray-200 shrink-0"
      style={{ backgroundColor: opt.value }}
    />
    <span>{opt.label}</span>
  </div>
);

const emptySize  = () => ({ size: "", sku: "", countInStock: "" });
const makeId     = () => Date.now() + Math.random();

// Convert saved colorVariants (from DB) to local editable state
const dbColorVariantsToState = (dbCVs = []) =>
  dbCVs.map((cv) => ({
    id: makeId(),
    color:     cv.color     || "",
    colorName: cv.colorName || prettyColorLabel(cv.color) || "",
    images:    (cv.images   || []).map((img) => ({ url: img.url, altText: img.altText || "" })),
    sizes:     (cv.sizes    || []).map((s) => ({
      size:         s.size         || "",
      sku:          s.sku          || "",
      countInStock: s.countInStock ?? "",
    })),
  }));

const inputCls =
  "w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 transition";

const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">{label}</label>
    {children}
  </div>
);

const EditProductPage = () => {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const { id }    = useParams();
  const { selectedProduct, loading, error } = useSelector((state) => state.products);
  const { token } = useSelector((state) => state.auth);

  const [productData, setProductData] = useState({
    name: "", description: "", price: 0, countInStock: 0, sku: "",
    category: "", brand: "", collections: "", material: "", gender: "",
    images: [],
    sizeChart: { imageUrl: "", title: "Size Chart" },
    offerPercentage: 0, discountPrice: 0,
    isFeatured: false, isPublished: false, tags: "",
    dimensions: { length: "", width: "", height: "" }, weight: "",
    prebookingEnabled: false, prebookingLimit: "",
  });

  const [colorVariants, setColorVariants] = useState([]);
  const [uploading, setUploading]         = useState(false);
  const [uploadingColor, setUploadingColor] = useState(null);
  const [deleting, setDeleting]           = useState(null);
  const [draggedImage, setDraggedImage]   = useState(null);
  const [metaOptions, setMetaOptions]     = useState({ category: [], collection: [], gender: [], material: [] });
  const [colorOptions, setColorOptions]   = useState(() => COLOR_OPTIONS);
  const [sizeCharts, setSizeCharts]       = useState([]);
  const [selectedSizeChartId, setSelectedSizeChartId] = useState("");
  // Size chart is selected from library; uploading/creating is done in /admin/size-charts.

  // Load meta options
  useEffect(() => {
    const token = localStorage.getItem("userToken");
    if (!token) return;

    axios
      .get(`${API_BASE}/api/meta-options`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(({ data }) => {
        const b = data.reduce(
          (acc, { type, value }) => {
            if (["category", "collection", "gender", "material"].includes(type)) {
              const nextValue = type === "gender" ? normalizeGenderLabel(value) : value;
              if (nextValue && !acc[type].includes(nextValue)) acc[type].push(nextValue);
            }
            return acc;
          },
          { category: [], collection: [], gender: [], material: [] }
        );
        if (!b.gender.includes("Men")) b.gender.push("Men");
        if (!b.gender.includes("Women")) b.gender.push("Women");
        if (!b.gender.includes("Kids")) b.gender.push("Kids");
        setMetaOptions(b);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const fetchSizeCharts = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/size-charts`);
        setSizeCharts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch size charts:", err);
      }
    };
    fetchSizeCharts();
  }, []);

  useEffect(() => {
    if (id) dispatch(fetchProductDetails(id));
  }, [dispatch, id]);

  useEffect(() => {
    if (!selectedProduct) return;
    const savedDraft = selectedProduct.draftState || {};
    const savedProductData = savedDraft.productData || {};
    const savedColorVariants = Array.isArray(savedDraft.colorVariants) ? savedDraft.colorVariants : null;

    setProductData({
      name:           savedProductData.name ?? selectedProduct.name ?? "",
      description:    savedProductData.description ?? selectedProduct.description ?? "",
      price:          savedProductData.price ?? selectedProduct.price ?? 0,
      countInStock:   savedProductData.countInStock ?? selectedProduct.countInStock ?? 0,
      sku:            savedProductData.sku ?? selectedProduct.sku ?? "",
      category:       savedProductData.category ?? selectedProduct.category ?? "",
      brand:          savedProductData.brand ?? selectedProduct.brand ?? "",
      collections:    savedProductData.collections ?? selectedProduct.collections ?? "",
      material:       savedProductData.material ?? selectedProduct.material ?? "",
      gender:         normalizeGenderLabel(savedProductData.gender ?? selectedProduct.gender),
      images:         savedProductData.images ?? selectedProduct.images ?? [],
      sizeChart:      savedProductData.sizeChart ?? selectedProduct.sizeChart ?? { imageUrl: "", title: "Size Chart" },
      offerPercentage: savedProductData.offerPercentage ?? selectedProduct.offerPercentage ?? 0,
      discountPrice:  savedProductData.discountPrice ?? selectedProduct.discountPrice ?? 0,
      isFeatured:     savedProductData.isFeatured ?? selectedProduct.isFeatured ?? false,
      isPublished:    savedProductData.isPublished ?? selectedProduct.isPublished ?? false,
      prebookingEnabled: savedProductData.prebookingEnabled ?? selectedProduct.prebooking?.enabled ?? false,
      prebookingLimit:   savedProductData.prebookingLimit ?? selectedProduct.prebooking?.limit ?? "",
      tags:           Array.isArray(savedProductData.tags)
                        ? savedProductData.tags.join(", ")
                        : (savedProductData.tags ?? (Array.isArray(selectedProduct.tags) ? selectedProduct.tags.join(", ") : (selectedProduct.tags || ""))),
      dimensions:     savedProductData.dimensions ?? selectedProduct.dimensions ?? { length: "", width: "", height: "" },
      weight:         savedProductData.weight ?? selectedProduct.weight ?? "",
    });

    // Prefer colorVariants; fall back to building from legacy variants
    if (savedColorVariants && savedColorVariants.length > 0) {
      setColorVariants(dbColorVariantsToState(savedColorVariants));
    } else if (Array.isArray(selectedProduct.colorVariants) && selectedProduct.colorVariants.length > 0) {
      setColorVariants(dbColorVariantsToState(selectedProduct.colorVariants));
    } else if (Array.isArray(selectedProduct.variants) && selectedProduct.variants.length > 0) {
      // Convert legacy flat variants → colorVariants structure
      const colorMap = {};
      for (const v of selectedProduct.variants) {
        const col = v.color || "";
        if (!colorMap[col]) {
          colorMap[col] = {
            id: makeId(),
            color:     col,
            colorName: prettyColorLabel(col),
            images:    selectedProduct.images || [],
            sizes:     [],
          };
        }
        colorMap[col].sizes.push({
          size: v.size || "",
          sku:  v.sku  || "",
          countInStock: v.countInStock ?? "",
        });
      }
      setColorVariants(Object.values(colorMap));
    } else {
      setColorVariants([{
        id: makeId(),
        color: selectedProduct.colors?.[0] || "",
        colorName: prettyColorLabel(selectedProduct.colors?.[0] || ""),
        images: selectedProduct.images || [],
        sizes: [{ size: selectedProduct.sizes?.[0] || "", sku: selectedProduct.sku || "", countInStock: selectedProduct.countInStock || "" }],
      }]);
    }
    setSelectedSizeChartId(selectedProduct?.sizeChart?.templateId || "");
  }, [selectedProduct]);

  // Recalculate total stock from colorVariants
  useEffect(() => {
    const total = colorVariants.reduce(
      (sum, cv) => sum + cv.sizes.reduce((s2, sz) => s2 + Math.max(0, Number(sz.countInStock || 0)), 0),
      0
    );
    setProductData((p) => ({ ...p, countInStock: total }));
  }, [colorVariants]);

  // ─── Basic field handlers ────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setProductData((p) => ({ ...p, [name]: checked }));
      return;
    }
    if (name.startsWith("dimensions.")) {
      const key = name.split(".")[1];
      setProductData((p) => ({ ...p, dimensions: { ...p.dimensions, [key]: value } }));
      return;
    }
    setProductData((p) => {
      const u = { ...p, [name]: value };
      if (name === "offerPercentage" || name === "price") {
        const price = parseFloat(name === "price" ? value : u.price);
        const offer = parseFloat(name === "offerPercentage" ? value : u.offerPercentage);
        if (!isNaN(price) && !isNaN(offer))
          u.discountPrice = Math.round(price - (price * offer) / 100);
      }
      return u;
    });
  };

  // (removed) in-form size chart uploads / library creation

  // ─── Color variant helpers ───────────────────────────────────────────────
  const addColorVariant = () =>
    setColorVariants((p) => [...p, { id: makeId(), color: "", colorName: "", images: [], sizes: [emptySize()] }]);

  const removeColorVariant = (id) =>
    setColorVariants((p) => p.filter((cv) => cv.id !== id));

  const updateCV = (id, field, value) =>
    setColorVariants((p) => p.map((cv) => cv.id === id ? { ...cv, [field]: value } : cv));

  const handleCreateColor = (id, inputValue) => {
    const value = String(inputValue || "").trim();
    if (!isValidCssColor(value)) {
      toast.error("Enter a valid CSS color name or hex code.");
      return;
    }

    const option = createColorOption(value);
    setColorOptions((prev) =>
      prev.some((item) => item.value.toLowerCase() === option.value.toLowerCase())
        ? prev
        : [option, ...prev]
    );
    updateCV(id, "color", option.value);
    updateCV(id, "colorName", prettyColorLabel(option.value));
  };

  // Per-color image upload
  const handleColorImageUpload = async (id, files) => {
    setUploadingColor(id);
    const uploaded = [];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("image", file);
      try {
        const { data } = await axios.post(`${API_BASE}/api/upload`, fd, {
          headers: { Authorization: `Bearer ${token}` },
        });
        uploaded.push({ url: data.imageUrl, altText: file.name, publicId: data.publicId });
      } catch { toast.error(`Failed to upload ${file.name}`); }
    }
    setColorVariants((p) =>
      p.map((cv) => cv.id === id ? { ...cv, images: [...cv.images, ...uploaded] } : cv)
    );
    setUploadingColor(null);
  };

  // Per-color image remove (with Cloudinary delete)
  const handleColorImageRemove = async (colorId, imgIndex) => {
    const cv  = colorVariants.find((c) => c.id === colorId);
    const img = cv?.images[imgIndex];
    if (!img) return;
    setDeleting(`${colorId}-${imgIndex}`);
    try {
      await axios.post(`${API_BASE}/api/upload/delete`, { imageUrl: img.url }, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { /* ignore — remove from UI regardless */ }
    setColorVariants((p) =>
      p.map((c) =>
        c.id === colorId ? { ...c, images: c.images.filter((_, i) => i !== imgIndex) } : c
      )
    );
    setDeleting(null);
  };

  const moveColorImage = (colorId, fromIndex, toIndex) =>
    setColorVariants((prev) =>
      prev.map((cv) =>
        cv.id === colorId
          ? { ...cv, images: moveArrayItem(cv.images, fromIndex, toIndex) }
          : cv
      )
    );

  // Sizes
  const addSize = (colorId) =>
    setColorVariants((p) =>
      p.map((cv) => cv.id === colorId ? { ...cv, sizes: [...cv.sizes, emptySize()] } : cv)
    );
  const removeSize = (colorId, idx) =>
    setColorVariants((p) =>
      p.map((cv) => cv.id === colorId ? { ...cv, sizes: cv.sizes.filter((_, i) => i !== idx) } : cv)
    );
  const updateSize = (colorId, idx, field, value) =>
    setColorVariants((p) =>
      p.map((cv) =>
        cv.id === colorId
          ? { ...cv, sizes: cv.sizes.map((s, i) => i === idx ? { ...s, [field]: value } : s) }
          : cv
      )
    );

  // ─── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    const isPublishing = Boolean(productData.isPublished);

    if (!isPublishing) {
      const draftPayload = {
        ...productData,
        price: productData.price === "" ? undefined : Number(productData.price),
        discountPrice: productData.discountPrice === "" ? undefined : Number(productData.discountPrice),
        offerPercentage: Number(productData.offerPercentage || 0),
        countInStock: productData.countInStock || 0,
        sku: productData.sku || "",
        sizes: [],
        colors: [],
        colorVariants: [],
        variants: [],
        images: productData.images || [],
        tags: typeof productData.tags === "string"
          ? productData.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : productData.tags,
        sizeChart: {
          templateId: productData.sizeChart?.templateId || "",
          imageUrl: productData.sizeChart?.imageUrl || "",
          measureImageUrl: productData.sizeChart?.measureImageUrl || "",
          title: productData.sizeChart?.title || "Size Chart",
          audience: productData.sizeChart?.audience || "Unisex",
        },
        draftState: {
          productData: {
            ...productData,
            tags: typeof productData.tags === "string"
              ? productData.tags.split(",").map((t) => t.trim()).filter(Boolean)
              : productData.tags,
          },
          colorVariants,
        },
      };

      try {
        await dispatch(updateProduct({ id, productData: draftPayload })).unwrap();
        toast.success("Draft saved!");
        navigate("/admin/products");
      } catch (err) {
        toast.error(err?.message || "Failed to save draft");
      }
      return;
    }

    const normalizedColorVariants = colorVariants
      .map((cv) => ({
        color:     cv.color.trim(),
        colorName: cv.colorName.trim() || prettyColorLabel(cv.color),
        images:    cv.images,
        sizes:     cv.sizes
          .map((s) => ({ size: normalizeSize(s.size), sku: s.sku.trim(), countInStock: Number(s.countInStock || 0) }))
          .filter((s) => s.size && s.sku),
      }))
      .filter((cv) => cv.color && cv.sizes.length > 0);

    if (!normalizedColorVariants.length) {
      toast.error("Add at least one color with a valid size, SKU and stock.");
      return;
    }

    const allSizes  = [...new Set(normalizedColorVariants.flatMap((cv) => cv.sizes.map((s) => s.size)))];
    const allColors = [...new Set(normalizedColorVariants.map((cv) => cv.color))];
    const totalStock = normalizedColorVariants.reduce(
      (sum, cv) => sum + cv.sizes.reduce((s2, sz) => s2 + Math.max(0, sz.countInStock), 0), 0
    );
    const firstSku = productData.sku || normalizedColorVariants[0]?.sizes[0]?.sku;

    const payload = {
      ...productData,
      price: Number(productData.price),
      offerPercentage: Number(productData.offerPercentage || 0),
      countInStock: totalStock,
      sku: firstSku,
      sizes: allSizes,
      colors: allColors,
      colorVariants: normalizedColorVariants,
      variants: [],
      images: normalizedColorVariants[0]?.images || productData.images || [],
      tags: typeof productData.tags === "string"
        ? productData.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : productData.tags,
      sizeChart: {
        templateId: productData.sizeChart?.templateId || "",
        imageUrl: productData.sizeChart?.imageUrl || "",
        measureImageUrl: productData.sizeChart?.measureImageUrl || "",
        title: productData.sizeChart?.title || "Size Chart",
        audience: productData.sizeChart?.audience || "Unisex",
      },
      prebooking: {
        enabled: Boolean(productData.prebookingEnabled),
        limit: productData.prebookingLimit === "" || productData.prebookingLimit == null
          ? 0
          : Number(productData.prebookingLimit),
      },
      draftState: null,
    };

    setUploading(true);
    try {
      await dispatch(updateProduct({ id, productData: payload })).unwrap();
      toast.success("Product updated!");
      navigate("/admin/products");
    } catch (err) {
      toast.error(err?.message || "Failed to update product");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading product…</p>
      </div>
    </div>
  );
  if (error) return <p className="p-6 text-red-600">Error: {error}</p>;

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-4">

      {/* ── Page header ── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shrink-0 shadow-sm">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Edit Product</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {selectedProduct?.name && <span className="text-violet-600 font-semibold">{selectedProduct.name}</span>}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── Basic Info ── */}
        <SectionCard title="Basic Information" subtitle="Product name, SKU, brand and description">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Product Name *">
              <input type="text" name="name" value={productData.name}
                onChange={handleChange} required className={inputCls} />
            </Field>
            <Field label="SKU">
              <input type="text" name="sku" value={productData.sku}
                onChange={handleChange} className={inputCls} />
            </Field>
            <Field label="Brand">
              <input type="text" name="brand" value={productData.brand}
                onChange={handleChange} placeholder="Brand name" className={inputCls} />
            </Field>
            <Field label="Tags (comma-separated)">
              <input type="text" name="tags" value={productData.tags}
                onChange={handleChange} placeholder="casual, trendy, cotton" className={inputCls} />
            </Field>
          </div>
          <Field label="Description *">
            <textarea name="description" value={productData.description}
              onChange={handleChange} rows={4} required
              placeholder="Product description…" className={inputCls} />
          </Field>
        </SectionCard>

        {/* ── Pricing ── */}
        <SectionCard title="Pricing" subtitle="MRP, offer discount, selling price and total stock">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="MRP Price (₹) *">
              <input type="number" name="price" value={productData.price}
                onChange={handleChange} required min="0" step="0.01" className={inputCls} />
            </Field>
            <Field label="Offer %">
              <input type="number" name="offerPercentage" value={productData.offerPercentage}
                onChange={handleChange} min="0" step="0.1" className={inputCls} />
            </Field>
            <Field label="Selling Price (auto)">
              <input type="number" name="discountPrice" value={productData.discountPrice}
                readOnly className={`${inputCls} bg-gray-100 cursor-not-allowed text-gray-500`} />
            </Field>
            <Field label="Total Stock (auto)">
              <input type="number" value={productData.countInStock}
                readOnly className={`${inputCls} bg-gray-100 cursor-not-allowed text-gray-500`} />
            </Field>
          </div>
        </SectionCard>

        {/* ── Classification ── */}
        <SectionCard title="Classification" subtitle="Category, collection, gender and material">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Category">
              <select name="category" value={productData.category} onChange={handleChange} className={inputCls}>
                <option value="">Select…</option>
                {metaOptions.category.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Collection">
              <select name="collections" value={productData.collections} onChange={handleChange} className={inputCls}>
                <option value="">Select…</option>
                {metaOptions.collection.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Gender">
              <select name="gender" value={productData.gender} onChange={handleChange} className={inputCls}>
                <option value="">Select…</option>
                {metaOptions.gender.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Material / Fabric">
              <select name="material" value={productData.material} onChange={handleChange} className={inputCls}>
                <option value="">Select…</option>
                {metaOptions.material.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
          </div>
        </SectionCard>

        {/* ── Shipping ── */}
        <SectionCard title="Shipping & Dimensions" subtitle="Weight and package dimensions (optional)">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="Weight (kg)">
              <input type="number" name="weight" value={productData.weight}
                onChange={handleChange} min="0" step="0.01" placeholder="0.5" className={inputCls} />
            </Field>
            {["length","width","height"].map((d) => (
              <Field key={d} label={`${d.charAt(0).toUpperCase() + d.slice(1)} (cm)`}>
                <input type="number" name={`dimensions.${d}`}
                  value={productData.dimensions?.[d] || ""} onChange={handleChange}
                  min="0" step="0.1" placeholder="0" className={inputCls} />
              </Field>
            ))}
          </div>
        </SectionCard>

        {/* ── Size Chart ── */}
        <SectionCard title="Size Chart" subtitle="Select a saved chart (manage uploads in Size Charts)">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <Field label="Saved Size Charts">
              <select
                value={selectedSizeChartId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedSizeChartId(id);
                  const selected = sizeCharts.find((s) => s._id === id);
                  if (selected) {
                    setProductData((p) => ({
                      ...p,
                      sizeChart: {
                        templateId: selected._id,
                        imageUrl: selected.chartImageUrl,
                        measureImageUrl: selected.measureImageUrl || "",
                        title: selected.name || "Size Chart",
                        audience: selected.audience || "Unisex",
                      },
                    }));
                  }
                }}
                className={inputCls}
              >
                <option value="">Select from library…</option>
                {sizeCharts.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.audience})
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex gap-2">
              <Link
                to="/admin/size-charts"
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:opacity-90 transition"
              >
                Upload / Manage Charts
              </Link>
              <button
                type="button"
                onClick={() => {
                  setSelectedSizeChartId("");
                  setProductData((p) => ({ ...p, sizeChart: { ...p.sizeChart, templateId: "", imageUrl: "", measureImageUrl: "" } }));
                }}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 transition"
              >
                Clear
              </button>
            </div>
          </div>
          {productData.sizeChart?.imageUrl && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Chart Preview</p>
                <img
                  src={productData.sizeChart.imageUrl}
                  alt="Size chart"
                  className="w-full max-w-sm rounded-xl border border-gray-200 shadow-sm"
                />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">How To Measure</p>
                <img
                  src={productData.sizeChart.measureImageUrl || productData.sizeChart.imageUrl}
                  alt="How to measure"
                  className="w-full max-w-sm rounded-xl border border-gray-200 shadow-sm"
                />
              </div>
            </div>
          )}
        </SectionCard>

        {/* ── Visibility ── */}
        <SectionCard title="Visibility" subtitle="Control whether this product appears on the store">
          <div className="flex flex-wrap gap-6">
            {[
              { name: "isFeatured", label: "Featured Product", desc: "Show on homepage featured section" },
              { name: "isPublished", label: "Published",        desc: "Visible to customers in the store" },
            ].map(({ name, label, desc }) => (
              <label key={name} className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5">
                  <input type="checkbox" name={name} checked={productData[name]}
                    onChange={handleChange} className="sr-only peer" />
                  <div className="w-10 h-5 rounded-full bg-gray-200 peer-checked:bg-violet-600 transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </SectionCard>

        {/* ── Prebooking ── */}
        <SectionCard title="Prebooking" subtitle="Let customers reserve this product before it's in stock, up to a slot limit">
          <div className="flex flex-wrap items-start gap-6">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5">
                <input type="checkbox" name="prebookingEnabled" checked={productData.prebookingEnabled}
                  onChange={handleChange} className="sr-only peer" />
                <div className="w-10 h-5 rounded-full bg-gray-200 peer-checked:bg-violet-600 transition-colors" />
                <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Enable Prebooking</p>
                <p className="text-xs text-gray-400">Shows a "Prebook Now" option instead of Add to Cart</p>
              </div>
            </label>

            {productData.prebookingEnabled && (
              <Field label="Slot Limit">
                <input
                  type="number" name="prebookingLimit" min="1"
                  value={productData.prebookingLimit}
                  onChange={handleChange}
                  placeholder="e.g. 100"
                  className={inputCls}
                />
              </Field>
            )}

            {selectedProduct?.prebooking?.enabled && (
              <div className="text-xs text-gray-500">
                <p><span className="font-semibold text-gray-700">{selectedProduct.prebooking.bookedCount || 0}</span> booked so far</p>
                <p className="mt-0.5">
                  Status: <span className="font-semibold text-gray-700 capitalize">{selectedProduct.prebooking.status}</span>
                  {" · "}manage readiness &amp; notify bookers from{" "}
                  <Link to="/admin/prebookings" className="text-violet-600 hover:underline">Admin → Prebookings</Link>
                </p>
              </div>
            )}
          </div>
        </SectionCard>

        {/* ── Color Variants ── */}
        <SectionCard
          title={<>Color Variants <span className="text-red-500">*</span></>}
          subtitle="Manage colors, photos, sizes, SKU and stock"
          action={
            <button type="button" onClick={addColorVariant}
              className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-sm transition">
              + Add Color
            </button>
          }
        >
          <div className="space-y-4">
            {colorVariants.map((cv, cvIdx) => (
              <div key={cv.id} className="border border-gray-200 rounded-xl overflow-visible">
                {/* Color card header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    {cv.color
                      ? <span className="w-6 h-6 rounded-full border-2 border-white shadow-sm shrink-0" style={{ backgroundColor: cv.color }} />
                      : <span className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 shrink-0" />
                    }
                    <span className="text-sm font-bold text-gray-700">
                      Color {cvIdx + 1}{cv.colorName ? ` — ${cv.colorName}` : ""}
                    </span>
                  </div>
                  {colorVariants.length > 1 && (
                    <button type="button" onClick={() => removeColorVariant(cv.id)}
                      className="text-[11px] font-semibold text-red-500 hover:text-red-700 border border-red-200 hover:bg-red-50 px-2.5 py-1 rounded-lg transition">
                      Remove
                    </button>
                  )}
                </div>

                <div className="p-4 space-y-4">
                  {/* Color picker + name */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Color *</label>
                      <CreatableSelect
                        options={colorOptions}
                        value={findColorOption(cv.color, colorOptions) || (cv.color ? createColorOption(cv.color) : null)}
                        onChange={(sel) => {
                          updateCV(cv.id, "color", sel?.value || "");
                          updateCV(cv.id, "colorName", sel?.label || prettyColorLabel(sel?.value || ""));
                        }}
                        onCreateOption={(inputValue) => handleCreateColor(cv.id, inputValue)}
                        isValidNewOption={(inputValue) => isValidCssColor(inputValue)}
                        filterOption={colorFilterOption}
                        formatOptionLabel={formatColorOptionLabel}
                        placeholder="Pick a colour…"
                        menuPortalTarget={selectPortalTarget}
                        menuPosition="fixed"
                        styles={selectMenuStyles}
                        formatCreateLabel={(inputValue) => `Use "${inputValue}"`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Display Name</label>
                      <input type="text" value={cv.colorName}
                        onChange={(e) => updateCV(cv.id, "colorName", e.target.value)}
                        placeholder="e.g. Midnight Black" className={inputCls} />
                    </div>
                  </div>

                  {/* Photos */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Photos for this colour</label>
                    <label className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold rounded-xl cursor-pointer hover:bg-blue-100 transition">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                      Upload Photos
                      <input type="file" multiple accept="image/*" className="hidden"
                        onChange={(e) => handleColorImageUpload(cv.id, e.target.files)} />
                    </label>
                    {uploadingColor === cv.id && (
                      <span className="ml-3 text-xs text-blue-500 animate-pulse">Uploading…</span>
                    )}
                    {cv.images.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {cv.images.map((img, idx) => (
                          <div
                            key={idx}
                            className={`relative group ${draggedImage?.colorId === cv.id && draggedImage?.imageIndex === idx ? "opacity-60 scale-95" : ""}`}
                            draggable
                            onDragStart={() => setDraggedImage({ colorId: cv.id, imageIndex: idx })}
                            onDragEnd={() => setDraggedImage(null)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => {
                              if (draggedImage?.colorId === cv.id) {
                                moveColorImage(cv.id, draggedImage.imageIndex, idx);
                              }
                              setDraggedImage(null);
                            }}
                          >
                            <img src={img.url} alt={img.altText}
                              className="w-16 h-16 object-cover rounded-xl border border-gray-200 shadow-sm" />
                            <button type="button"
                              onClick={() => handleColorImageRemove(cv.id, idx)}
                              disabled={deleting === `${cv.id}-${idx}`}
                              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs flex items-center justify-center shadow-sm transition disabled:opacity-60">
                              {deleting === `${cv.id}-${idx}` ? (
                                <span className="w-2.5 h-2.5 border border-white/40 border-t-white rounded-full animate-spin" />
                              ) : "×"}
                            </button>
                            {idx === 0 && (
                              <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] text-center rounded-b-xl py-0.5 font-medium">
                                Main
                              </span>
                            )}
                            <span className="absolute top-0 left-0 bg-black/45 text-white text-[8px] rounded-br-lg px-1.5 py-0.5 font-semibold">
                              Drag
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Sizes, SKU, Stock */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Sizes, SKU & Stock *</label>
                      <button type="button" onClick={() => addSize(cv.id)}
                        className="flex items-center gap-1 text-xs font-bold text-violet-600 border border-violet-200 hover:bg-violet-50 px-2.5 py-1 rounded-lg transition">
                        + Size
                      </button>
                    </div>
                    <div className="space-y-2">
                      {cv.sizes.map((sz, idx) => (
                        <div key={idx} className="grid grid-cols-3 gap-2 items-center">
                          <Select
                            options={SIZE_OPTIONS}
                            value={sz.size ? { value: normalizeSize(sz.size), label: normalizeSize(sz.size) } : null}
                            onChange={(sel) => updateSize(cv.id, idx, "size", sel?.value || "")}
                            placeholder="Size"
                            menuPortalTarget={selectPortalTarget}
                            menuPosition="fixed"
                            styles={selectMenuStyles}
                          />
                          <input type="text" value={sz.sku}
                            onChange={(e) => updateSize(cv.id, idx, "sku", e.target.value)}
                            placeholder="SKU" className={inputCls} />
                          <div className="flex gap-1 items-center">
                            <input type="number" min="0" value={sz.countInStock}
                              onChange={(e) => updateSize(cv.id, idx, "countInStock", e.target.value)}
                              placeholder="Stock" className={inputCls} />
                            {cv.sizes.length > 1 && (
                              <button type="button" onClick={() => removeSize(cv.id, idx)}
                                className="w-7 h-7 shrink-0 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition text-sm font-bold">✕</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── Submit ── */}
        <div className="flex items-center gap-3 pt-2 pb-6">
          <button
            type="submit"
            disabled={uploading || !!deleting}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold transition-all shadow-sm
              ${uploading || !!deleting
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-violet-600 hover:bg-violet-700 text-white hover:shadow-md"
              }`}
          >
            {uploading || deleting
              ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</>
              : "Save Changes"
            }
          </button>
          <button
            type="button"
            onClick={() => navigate("/admin/products")}
            className="px-5 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

// ─── Section card ─────────────────────────────────────────────────────────────
const SectionCard = ({ title, subtitle, children, action }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-visible">
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-100">
      <div>
        <h4 className="text-sm font-bold text-gray-800">{title}</h4>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
    <div className="p-5 space-y-4">{children}</div>
  </div>
);

export default EditProductPage;
