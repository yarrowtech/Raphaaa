import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { createProduct } from "../../redux/slices/adminProductSlice";
import { toast } from "sonner";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import { Link } from "react-router-dom";
import { FiCloud } from "react-icons/fi";
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
  value: s,
  label: s,
}));

const normalizeSize = (s) => {
  const t = String(s).trim().toUpperCase().replace(/\s+/g, "");
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

const emptySize = () => ({ size: "", sku: "", countInStock: "" });
const emptyColorVariant = (index) => ({
  id: Date.now() + index,
  color: "",
  colorName: "",
  images: [],
  sizes: [emptySize()],
});

const DRAFT_STORAGE_KEY = "raphaaa:add-product-draft";

const getInitialProductData = () => ({
  name: "",
  description: "",
  price: "",
  discountPrice: "",
  offerPercentage: "",
  sku: "",
  category: "",
  brand: "",
  collections: "",
  material: "",
  gender: "",
  sizeChart: { imageUrl: "", measureImageUrl: "", title: "Size Chart", audience: "Unisex", templateId: "" },
  isFeatured: false,
  isPublished: false,
  tags: "",
  dimensions: { length: "", width: "", height: "" },
  weight: "",
  mrp: "",
  countryOfOrigin: "India",
  materialComposition: "",
  washCare: "",
  netQuantity: "1 Piece",
  manufacturerInfo: "",
  images: [],
  prebookingEnabled: false,
  prebookingLimit: "",
});

const normalizeDraftProductData = (data = {}) => ({
  ...getInitialProductData(),
  ...data,
  sizeChart: {
    ...getInitialProductData().sizeChart,
    ...(data.sizeChart || {}),
  },
  dimensions: {
    ...getInitialProductData().dimensions,
    ...(data.dimensions || {}),
  },
});

const normalizeDraftColorVariants = (variants = []) =>
  Array.isArray(variants) && variants.length > 0
    ? variants.map((cv, index) => ({
        id: cv?.id || Date.now() + index,
        color: cv?.color || "",
        colorName: cv?.colorName || "",
        images: Array.isArray(cv?.images) ? cv.images : [],
        sizes: Array.isArray(cv?.sizes) && cv.sizes.length > 0 ? cv.sizes : [emptySize()],
      }))
    : [emptyColorVariant(0)];

const hasDraftContent = (productData, colorVariants) => {
  const flatValues = [
    productData?.name,
    productData?.description,
    productData?.price,
    productData?.discountPrice,
    productData?.offerPercentage,
    productData?.sku,
    productData?.category,
    productData?.brand,
    productData?.collections,
    productData?.material,
    productData?.gender,
    productData?.tags,
    productData?.weight,
    productData?.mrp,
    productData?.countryOfOrigin,
    productData?.materialComposition,
    productData?.washCare,
    productData?.netQuantity,
    productData?.manufacturerInfo,
    productData?.sizeChart?.imageUrl,
    productData?.sizeChart?.measureImageUrl,
    productData?.sizeChart?.title,
  ];

  if (flatValues.some((v) => String(v || "").trim() !== "")) return true;

  return Array.isArray(colorVariants) && colorVariants.some((cv) =>
    String(cv?.color || "").trim() !== "" ||
    String(cv?.colorName || "").trim() !== "" ||
    (Array.isArray(cv?.images) && cv.images.length > 0) ||
    (Array.isArray(cv?.sizes) && cv.sizes.some((s) =>
      String(s?.size || "").trim() !== "" ||
      String(s?.sku || "").trim() !== "" ||
      String(s?.countInStock || "").trim() !== ""
    ))
  );
};

const AddProduct = () => {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.adminProducts);
  const autosaveTimerRef = useRef(null);
  const isHydratingDraftRef = useRef(true);
  const isSubmittingRef = useRef(false);

  const [colorVariants, setColorVariants] = useState([emptyColorVariant(0)]);
  const [draggedImage, setDraggedImage] = useState(null);
  const [productData, setProductData] = useState(() => getInitialProductData());
  const [draftId, setDraftId] = useState(() => localStorage.getItem(DRAFT_STORAGE_KEY) || "");

  const [metaOptions, setMetaOptions] = useState({ category: [], collection: [], gender: [], material: [] });
  const [colorOptions, setColorOptions] = useState(() => COLOR_OPTIONS);
  const [uploadingColor, setUploadingColor] = useState(null);
  const [sizeCharts, setSizeCharts] = useState([]);
  const [selectedSizeChartId, setSelectedSizeChartId] = useState("");
  const [isHydratingDraft, setIsHydratingDraft] = useState(true);
  const [draftStatus, setDraftStatus] = useState("idle");

  const buildDraftState = (nextProductData = productData, nextColorVariants = colorVariants) => ({
    productData: normalizeDraftProductData(nextProductData),
    colorVariants: Array.isArray(nextColorVariants) ? nextColorVariants : [],
  });

  const buildDraftSavePayload = (nextProductData = productData, nextColorVariants = colorVariants) => {
    const normalizedProductData = normalizeDraftProductData(nextProductData);
    const totalStock = (Array.isArray(nextColorVariants) ? nextColorVariants : []).reduce(
      (sum, cv) => sum + (Array.isArray(cv?.sizes)
        ? cv.sizes.reduce((inner, sz) => inner + Math.max(0, Number(sz?.countInStock || 0)), 0)
        : 0),
      0
    );

    return {
      ...normalizedProductData,
      price: normalizedProductData.price === "" ? undefined : Number(normalizedProductData.price),
      discountPrice: normalizedProductData.discountPrice === "" ? undefined : Number(normalizedProductData.discountPrice),
      offerPercentage: normalizedProductData.offerPercentage === "" ? 0 : Number(normalizedProductData.offerPercentage || 0),
      countInStock: totalStock,
      sku: normalizedProductData.sku || "",
      sizes: [],
      colors: [],
      colorVariants: [],
      variants: [],
      images: normalizedProductData.images || [],
      tags: typeof normalizedProductData.tags === "string"
        ? normalizedProductData.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
      dimensions: {
        length: normalizedProductData.dimensions?.length === "" ? undefined : Number(normalizedProductData.dimensions?.length),
        width: normalizedProductData.dimensions?.width === "" ? undefined : Number(normalizedProductData.dimensions?.width),
        height: normalizedProductData.dimensions?.height === "" ? undefined : Number(normalizedProductData.dimensions?.height),
      },
      weight: normalizedProductData.weight === "" ? undefined : Number(normalizedProductData.weight),
      mrp: normalizedProductData.mrp === "" ? undefined : Number(normalizedProductData.mrp),
      countryOfOrigin: normalizedProductData.countryOfOrigin || "India",
      materialComposition: normalizedProductData.materialComposition || undefined,
      washCare: normalizedProductData.washCare || undefined,
      netQuantity: normalizedProductData.netQuantity || undefined,
      manufacturerInfo: normalizedProductData.manufacturerInfo || undefined,
      prebooking: {
        enabled: Boolean(normalizedProductData.prebookingEnabled),
        limit: normalizedProductData.prebookingLimit === "" || normalizedProductData.prebookingLimit == null
          ? 0
          : Number(normalizedProductData.prebookingLimit),
      },
      isPublished: false,
      draftState: buildDraftState(nextProductData, nextColorVariants),
    };
  };

  const buildPublishPayload = (nextProductData = productData, nextColorVariants = colorVariants) => {
    const normalizedColorVariants = (Array.isArray(nextColorVariants) ? nextColorVariants : [])
      .map((cv) => ({
        color: cv.color.trim(),
        colorName: cv.colorName.trim() || prettyColorLabel(cv.color),
        images: cv.images,
        sizes: cv.sizes
          .map((s) => ({
            size: normalizeSize(s.size),
            sku: s.sku.trim(),
            countInStock: Number(s.countInStock || 0),
          }))
          .filter((s) => s.size && s.sku),
      }))
      .filter((cv) => cv.color && cv.sizes.length > 0);

    if (!normalizedColorVariants.length) {
      return { error: "Add at least one color with a valid size, SKU and stock." };
    }

    const allSizes = [...new Set(normalizedColorVariants.flatMap((cv) => cv.sizes.map((s) => s.size)))];
    const allColors = [...new Set(normalizedColorVariants.map((cv) => cv.color))];
    const totalStock = normalizedColorVariants.reduce(
      (sum, cv) => sum + cv.sizes.reduce((s2, sz) => s2 + Math.max(0, Number(sz.countInStock || 0)), 0),
      0
    );
    const firstSku = nextProductData.sku || normalizedColorVariants[0]?.sizes[0]?.sku;
    const normalizedProductData = normalizeDraftProductData(nextProductData);

    const payload = {
      ...normalizedProductData,
      price: Number(normalizedProductData.price),
      offerPercentage: normalizedProductData.offerPercentage ? Number(normalizedProductData.offerPercentage) : 0,
      discountPrice: normalizedProductData.offerPercentage
        ? Math.round(Number(normalizedProductData.price) - (Number(normalizedProductData.price) * Number(normalizedProductData.offerPercentage)) / 100)
        : normalizedProductData.discountPrice ? Math.round(Number(normalizedProductData.discountPrice)) : undefined,
      countInStock: totalStock,
      sku: firstSku,
      sizes: allSizes,
      colors: allColors,
      colorVariants: normalizedColorVariants,
      variants: [],
      images: normalizedColorVariants[0]?.images || [],
      weight: normalizedProductData.weight ? Number(normalizedProductData.weight) : undefined,
      mrp: normalizedProductData.mrp ? Number(normalizedProductData.mrp) : undefined,
      countryOfOrigin: normalizedProductData.countryOfOrigin || "India",
      materialComposition: normalizedProductData.materialComposition || undefined,
      washCare: normalizedProductData.washCare || undefined,
      netQuantity: normalizedProductData.netQuantity || undefined,
      manufacturerInfo: normalizedProductData.manufacturerInfo || undefined,
      prebooking: {
        enabled: Boolean(normalizedProductData.prebookingEnabled),
        limit: normalizedProductData.prebookingLimit === "" || normalizedProductData.prebookingLimit == null
          ? 0
          : Number(normalizedProductData.prebookingLimit),
      },
      tags: normalizedProductData.tags
        ? normalizedProductData.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
      dimensions: {
        length: normalizedProductData.dimensions.length ? Number(normalizedProductData.dimensions.length) : undefined,
        width:  normalizedProductData.dimensions.width  ? Number(normalizedProductData.dimensions.width)  : undefined,
        height: normalizedProductData.dimensions.height ? Number(normalizedProductData.dimensions.height) : undefined,
      },
      sizeChart: {
        templateId: normalizedProductData.sizeChart?.templateId || "",
        imageUrl: normalizedProductData.sizeChart?.imageUrl || "",
        measureImageUrl: normalizedProductData.sizeChart?.measureImageUrl || "",
        title: normalizedProductData.sizeChart?.title || "Size Chart",
        audience: normalizedProductData.sizeChart?.audience || "Unisex",
      },
      draftState: null,
      isPublished: true,
    };

    if (!payload.dimensions.length && !payload.dimensions.width && !payload.dimensions.height) {
      delete payload.dimensions;
    }

    return { payload };
  };

  useEffect(() => {
    const token = localStorage.getItem("userToken");
    if (!token) return;

    axios
      .get(`${API_BASE}/api/meta-options`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(({ data }) => {
        const buckets = data.reduce(
          (acc, { type, value }) => {
            if (["category", "collection", "gender", "material"].includes(type)) {
              const nextValue = type === "gender" ? normalizeGenderLabel(value) : value;
              if (nextValue && !acc[type].includes(nextValue)) acc[type].push(nextValue);
            }
            return acc;
          },
          { category: [], collection: [], gender: [], material: [] }
        );
        if (!buckets.gender.includes("Men")) buckets.gender.push("Men");
        if (!buckets.gender.includes("Women")) buckets.gender.push("Women");
        if (!buckets.gender.includes("Kids")) buckets.gender.push("Kids");
        setMetaOptions(buckets);
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
    const savedDraftId = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!savedDraftId) {
      isHydratingDraftRef.current = false;
      setIsHydratingDraft(false);
      return;
    }

    setDraftId(savedDraftId);

    const loadDraft = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/products/${savedDraftId}`);
        const saved = data?.draftState;

        if (saved?.productData || saved?.colorVariants) {
          setProductData(normalizeDraftProductData(saved.productData));
          setColorVariants(normalizeDraftColorVariants(saved.colorVariants));
          if (saved.productData?.sizeChart?.templateId) {
            setSelectedSizeChartId(saved.productData.sizeChart.templateId);
          }
        } else if (data) {
          setProductData(normalizeDraftProductData({
            name: data.name || "",
            description: data.description || "",
            price: data.price ?? "",
            discountPrice: data.discountPrice ?? "",
            offerPercentage: data.offerPercentage ?? "",
            sku: data.sku || "",
            category: data.category || "",
            brand: data.brand || "",
            collections: data.collections || "",
            material: data.material || "",
            gender: data.gender || "",
            sizeChart: data.sizeChart || { imageUrl: "", title: "Size Chart" },
            isFeatured: data.isFeatured || false,
            isPublished: data.isPublished || false,
            prebookingEnabled: data.prebooking?.enabled || false,
            prebookingLimit: data.prebooking?.limit || "",
            tags: Array.isArray(data.tags) ? data.tags.join(", ") : (data.tags || ""),
            dimensions: data.dimensions || { length: "", width: "", height: "" },
            weight: data.weight ?? "",
            mrp: data.mrp ?? "",
            countryOfOrigin: data.countryOfOrigin || "India",
            materialComposition: data.materialComposition || "",
            washCare: data.washCare || "",
            netQuantity: data.netQuantity || "1 Piece",
            manufacturerInfo: data.manufacturerInfo || "",
            images: data.images || [],
          }));
          setColorVariants(normalizeDraftColorVariants((data.colorVariants || []).map((cv) => ({
            ...cv,
            id: cv?.id,
          }))));
        }
      } catch (error) {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        setDraftId("");
      } finally {
        isHydratingDraftRef.current = false;
        setIsHydratingDraft(false);
      }
    };

    loadDraft();
  }, []);

  useEffect(() => {
    if (isHydratingDraft || isSubmittingRef.current || !hasDraftContent(productData, colorVariants)) return;

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    setDraftStatus("saving");
    autosaveTimerRef.current = setTimeout(async () => {
      const payload = buildDraftSavePayload(productData, colorVariants);
      const headers = { Authorization: `Bearer ${localStorage.getItem("userToken")}` };

      try {
        if (draftId) {
          await axios.put(`${API_BASE}/api/products/${draftId}`, payload, { headers });
        } else {
          const { data } = await axios.post(`${API_BASE}/api/products`, payload, { headers });
          if (data?._id) {
            setDraftId(data._id);
            localStorage.setItem(DRAFT_STORAGE_KEY, data._id);
          }
        }
        setDraftStatus("saved");
      } catch (error) {
        console.error("Draft autosave failed:", error);
        setDraftStatus("error");
      }
    }, 1400);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [productData, colorVariants, draftId, isHydratingDraft]);

  // ─── Product field handlers ───────────────────────────────────────────────
  const handleProductChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setProductData((p) => ({ ...p, [name]: checked }));
    } else if (name.startsWith("dimensions.")) {
      const key = name.split(".")[1];
      setProductData((p) => ({ ...p, dimensions: { ...p.dimensions, [key]: value } }));
    } else {
      setProductData((p) => {
        const updated = { ...p, [name]: value };
        if (name === "offerPercentage") {
          const price = parseFloat(updated.price);
          const offer = parseFloat(value);
          if (!isNaN(price) && !isNaN(offer))
            updated.discountPrice = Math.round(price - (price * offer) / 100);
        }
        return updated;
      });
    }
  };

  // Size chart is selected from library; uploading/creating is done in /admin/size-charts.

  // ─── Color variant handlers ───────────────────────────────────────────────
  const addColorVariant = () =>
    setColorVariants((prev) => [...prev, emptyColorVariant(prev.length)]);

  const removeColorVariant = (id) =>
    setColorVariants((prev) => prev.filter((cv) => cv.id !== id));

  const updateColorVariant = (id, field, value) =>
    setColorVariants((prev) =>
      prev.map((cv) => (cv.id === id ? { ...cv, [field]: value } : cv))
    );

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
    updateColorVariant(id, "color", option.value);
    updateColorVariant(id, "colorName", prettyColorLabel(option.value));
  };

  // Images for a color
  const handleColorImageUpload = async (id, files) => {
    setUploadingColor(id);
    const uploaded = [];
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("image", file);
      try {
        const { data } = await axios.post(`${API_BASE}/api/upload`, formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem("userToken")}` },
        });
        uploaded.push({ url: data.imageUrl, altText: file.name });
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    setColorVariants((prev) =>
      prev.map((cv) =>
        cv.id === id ? { ...cv, images: [...cv.images, ...uploaded] } : cv
      )
    );
    setUploadingColor(null);
  };

  const removeColorImage = (colorId, imgIndex) =>
    setColorVariants((prev) =>
      prev.map((cv) =>
        cv.id === colorId
          ? { ...cv, images: cv.images.filter((_, i) => i !== imgIndex) }
          : cv
      )
    );

  const moveColorImage = (colorId, fromIndex, toIndex) =>
    setColorVariants((prev) =>
      prev.map((cv) =>
        cv.id === colorId
          ? { ...cv, images: moveArrayItem(cv.images, fromIndex, toIndex) }
          : cv
      )
    );

  // Sizes inside a color variant
  const addSize = (colorId) =>
    setColorVariants((prev) =>
      prev.map((cv) =>
        cv.id === colorId ? { ...cv, sizes: [...cv.sizes, emptySize()] } : cv
      )
    );

  const removeSize = (colorId, sizeIndex) =>
    setColorVariants((prev) =>
      prev.map((cv) =>
        cv.id === colorId
          ? { ...cv, sizes: cv.sizes.filter((_, i) => i !== sizeIndex) }
          : cv
      )
    );

  const updateSize = (colorId, sizeIndex, field, value) =>
    setColorVariants((prev) =>
      prev.map((cv) =>
        cv.id === colorId
          ? {
              ...cv,
              sizes: cv.sizes.map((s, i) =>
                i === sizeIndex ? { ...s, [field]: value } : s
              ),
            }
          : cv
      )
    );

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    isSubmittingRef.current = true;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

    const published = buildPublishPayload(productData, colorVariants);
    if (published.error) {
      toast.error(published.error);
      isSubmittingRef.current = false;
      return;
    }

    const payload = {
      ...published.payload,
      isPublished: true,
    };

    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem("userToken")}` };
      if (draftId) {
        await axios.put(`${API_BASE}/api/products/${draftId}`, payload, { headers });
      } else {
        await dispatch(createProduct(payload)).unwrap();
      }
      toast.success("Product added successfully!");
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setDraftId("");
    } catch (err) {
      const details = err?.details;
      const message =
        err?.message ||
        (Array.isArray(details) && details.length ? details[0] : "Failed to add product");
      toast.error(message);
      isSubmittingRef.current = false;
      return;
    }

    setProductData(getInitialProductData());
    setColorVariants([emptyColorVariant(0)]);
    setSelectedSizeChartId("");
    isSubmittingRef.current = false;
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen p-4 md:p-6 space-y-5">

      {/* ── Page header ── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shrink-0 shadow-sm">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-extrabold text-gray-900">Add New Product</h1>
          <p className="text-xs text-gray-400 mt-0.5">Fill all required fields to publish a new product</p>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                draftStatus === "saving"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : draftStatus === "saved"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : draftStatus === "error"
                      ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-slate-50 text-slate-600 border-slate-200"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  draftStatus === "saving"
                    ? "bg-amber-500 animate-pulse"
                    : draftStatus === "saved"
                      ? "bg-emerald-500"
                      : draftStatus === "error"
                        ? "bg-red-500"
                        : "bg-slate-400"
                }`}
              />
              {draftStatus === "saving" && "Saving draft..."}
              {draftStatus === "saved" && (
                <>
                  <FiCloud className="text-[11px]" />
                  <span>Draft saved</span>
                </>
              )}
              {draftStatus === "error" && "Draft save failed"}
              {draftStatus === "idle" && "Draft autosave ready"}
            </span>
            {draftId && (
              <span className="text-[11px] text-gray-400">
                Draft ID: {draftId}
              </span>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── Section card wrapper ── */}
        {/* Basic Info */}
        <SectionCard title="Basic Information" subtitle="Product name, SKU and description">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Product Name *">
              <input type="text" name="name" value={productData.name}
                onChange={handleProductChange} required
                placeholder="e.g. Classic Crew-Neck T-Shirt" className={inputCls} />
            </Field>
            <Field label="SKU (optional)">
              <input type="text" name="sku" value={productData.sku}
                onChange={handleProductChange}
                placeholder="Auto-filled from first variant" className={inputCls} />
            </Field>
            <Field label="Brand">
              <input type="text" name="brand" value={productData.brand}
                onChange={handleProductChange} placeholder="Brand name" className={inputCls} />
            </Field>
            <Field label="Tags (comma-separated)">
              <input type="text" name="tags" value={productData.tags}
                onChange={handleProductChange} placeholder="casual, trendy, cotton" className={inputCls} />
            </Field>
          </div>
          <Field label="Description *">
            <textarea name="description" value={productData.description}
              onChange={handleProductChange} rows={4} required
              placeholder="Write a compelling product description…" className={inputCls} />
          </Field>
        </SectionCard>

        {/* Pricing */}
        <SectionCard title="Pricing" subtitle="Set MRP, offer discount and final selling price">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="MRP Price (₹) *">
              <input type="number" name="price" value={productData.price}
                onChange={handleProductChange} required min="0" step="0.01"
                placeholder="e.g. 999" className={inputCls} />
            </Field>
            <Field label="Offer % (optional)">
              <input type="number" name="offerPercentage" value={productData.offerPercentage}
                onChange={handleProductChange} min="0" step="0.1"
                placeholder="e.g. 20" className={inputCls} />
            </Field>
            <Field label="Selling Price (auto)">
              <input type="number" name="discountPrice" value={productData.discountPrice}
                readOnly placeholder="Auto calculated"
                className={`${inputCls} bg-gray-100 cursor-not-allowed text-gray-500`} />
            </Field>
          </div>
        </SectionCard>

        {/* Classification */}
        <SectionCard title="Classification" subtitle="Category, collection, gender and material">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Category *">
              <select name="category" value={productData.category}
                onChange={handleProductChange} required className={inputCls}>
                <option value="">Select…</option>
                {metaOptions.category.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Collection *">
              <select name="collections" value={productData.collections}
                onChange={handleProductChange} required className={inputCls}>
                <option value="">Select…</option>
                {metaOptions.collection.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Gender">
              <select name="gender" value={productData.gender}
                onChange={handleProductChange} className={inputCls}>
                <option value="">Select…</option>
                {metaOptions.gender.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Material / Fabric">
              <select name="material" value={productData.material}
                onChange={handleProductChange} className={inputCls}>
                <option value="">Select…</option>
                {metaOptions.material.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
          </div>
        </SectionCard>

        {/* Shipping */}
        <SectionCard title="Shipping & Dimensions" subtitle="Weight and package dimensions (optional)">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="Weight (kg)">
              <input type="number" name="weight" value={productData.weight}
                onChange={handleProductChange} min="0" step="0.01"
                placeholder="0.5" className={inputCls} />
            </Field>
            {["length", "width", "height"].map((d) => (
              <Field key={d} label={`${d.charAt(0).toUpperCase() + d.slice(1)} (cm)`}>
                <input type="number" name={`dimensions.${d}`}
                  value={productData.dimensions[d]} onChange={handleProductChange}
                  min="0" step="0.1" placeholder="0" className={inputCls} />
              </Field>
            ))}
          </div>
        </SectionCard>

        {/* Legal & Compliance */}
        <SectionCard title="Legal & Compliance" subtitle="Required by Indian law for textile/apparel products">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="MRP (₹)">
              <input type="number" name="mrp" value={productData.mrp}
                onChange={handleProductChange} min="0" step="0.01"
                placeholder="e.g. 999" className={inputCls} />
            </Field>
            <Field label="Country of Origin">
              <input type="text" name="countryOfOrigin" value={productData.countryOfOrigin}
                onChange={handleProductChange} placeholder="India" className={inputCls} />
            </Field>
            <Field label="Net Quantity">
              <input type="text" name="netQuantity" value={productData.netQuantity}
                onChange={handleProductChange} placeholder="1 Piece" className={inputCls} />
            </Field>
            <Field label="Material Composition">
              <input type="text" name="materialComposition" value={productData.materialComposition}
                onChange={handleProductChange} placeholder="60% Cotton, 40% Polyester" className={inputCls} />
            </Field>
            <Field label="Wash Care Instructions">
              <input type="text" name="washCare" value={productData.washCare}
                onChange={handleProductChange} placeholder="Machine wash cold, Do not bleach" className={inputCls} />
            </Field>
            <Field label="Manufacturer Info">
              <input type="text" name="manufacturerInfo" value={productData.manufacturerInfo}
                onChange={handleProductChange} placeholder="Manufacturer name & address" className={inputCls} />
            </Field>
          </div>
        </SectionCard>

        {/* Size Chart */}
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

        {/* Visibility toggles */}
        <SectionCard title="Visibility" subtitle="Control whether this product appears on the store">
          <div className="flex flex-wrap gap-4">
            {[
              { name: "isFeatured", label: "Featured Product", desc: "Show on homepage featured section" },
              { name: "isPublished", label: "Published",        desc: "Visible to customers in the store" },
            ].map(({ name, label, desc }) => (
              <label key={name} className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5">
                  <input type="checkbox" name={name}
                    checked={productData[name]} onChange={handleProductChange}
                    className="sr-only peer" />
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

        {/* Prebooking */}
        <SectionCard title="Prebooking" subtitle="Let customers reserve this product before it's in stock, up to a slot limit">
          <div className="flex flex-wrap items-start gap-6">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5">
                <input type="checkbox" name="prebookingEnabled"
                  checked={productData.prebookingEnabled} onChange={handleProductChange}
                  className="sr-only peer" />
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
                  onChange={handleProductChange}
                  placeholder="e.g. 100"
                  className={inputCls}
                />
              </Field>
            )}
          </div>
        </SectionCard>

        {/* Color Variants */}
        <SectionCard
          title={<>Color Variants <span className="text-red-500">*</span></>}
          subtitle="Add at least one color with size, SKU and stock"
          action={
            <button type="button" onClick={addColorVariant}
              className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition shadow-sm">
              + Add Color
            </button>
          }
        >
          <div className="space-y-4">
            {colorVariants.map((cv, cvIdx) => (
              <ColorVariantCard
                key={cv.id} cv={cv} cvIdx={cvIdx}
                totalColors={colorVariants.length}
                uploadingColor={uploadingColor}
                draggedImage={draggedImage}
                colorOptions={colorOptions}
                onColorChange={(color) => {
                  updateColorVariant(cv.id, "color", color);
                  updateColorVariant(cv.id, "colorName", prettyColorLabel(color));
                }}
                onColorNameChange={(name) => updateColorVariant(cv.id, "colorName", name)}
                onCreateColor={(inputValue) => handleCreateColor(cv.id, inputValue)}
                onImageUpload={(files) => handleColorImageUpload(cv.id, files)}
                onImageRemove={(idx) => removeColorImage(cv.id, idx)}
                onMoveImage={(fromIndex, toIndex) => moveColorImage(cv.id, fromIndex, toIndex)}
                onDragStartImage={(imageIndex) => setDraggedImage({ colorId: cv.id, imageIndex })}
                onDragEndImage={() => setDraggedImage(null)}
                onAddSize={() => addSize(cv.id)}
                onRemoveSize={(idx) => removeSize(cv.id, idx)}
                onSizeChange={(idx, field, val) => updateSize(cv.id, idx, field, val)}
                onRemoveColor={() => removeColorVariant(cv.id)}
              />
            ))}
          </div>
        </SectionCard>

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit" disabled={loading}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold transition-all shadow-sm
              ${loading
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-violet-600 hover:bg-violet-700 text-white hover:shadow-md"
              }`}
          >
            {loading
              ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</>
              : "Publish Product"
            }
          </button>
        </div>
      </form>
    </div>
  );
};

// ─── Section card wrapper ─────────────────────────────────────────────────────
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

// ─── Sub-component: one color variant card ────────────────────────────────────
const ColorVariantCard = ({
  cv, cvIdx, totalColors, uploadingColor,
  draggedImage, colorOptions, onCreateColor,
  onColorChange, onColorNameChange,
  onImageUpload, onImageRemove,
  onMoveImage, onDragStartImage, onDragEndImage,
  onAddSize, onRemoveSize, onSizeChange,
  onRemoveColor,
}) => (
  <div className="border border-gray-200 rounded-xl overflow-visible">
    {/* Card header */}
    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
      <div className="flex items-center gap-3">
        {cv.color ? (
          <span className="w-6 h-6 rounded-full border-2 border-white shadow-sm shrink-0"
            style={{ backgroundColor: cv.color }} />
        ) : (
          <span className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 shrink-0" />
        )}
        <h5 className="text-sm font-bold text-gray-700">
          Color {cvIdx + 1}{cv.colorName ? ` — ${cv.colorName}` : ""}
        </h5>
      </div>
      {totalColors > 1 && (
        <button type="button" onClick={onRemoveColor}
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
              onColorChange(sel?.value || "");
              onColorNameChange(sel?.label || prettyColorLabel(sel?.value || ""));
            }}
            onCreateOption={onCreateColor}
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
          <input type="text" value={cv.colorName} onChange={(e) => onColorNameChange(e.target.value)}
            placeholder="e.g. Midnight Black (auto-filled)"
            className={inputCls} />
        </div>
      </div>

      {/* Photo upload */}
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Photos for this colour</label>
        <label className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold rounded-xl cursor-pointer hover:bg-blue-100 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          Upload Photos
          <input type="file" multiple accept="image/*" className="hidden"
            onChange={(e) => onImageUpload(e.target.files)} />
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
                onDragStart={() => onDragStartImage(idx)}
                onDragEnd={onDragEndImage}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggedImage?.colorId === cv.id) {
                    onMoveImage(draggedImage.imageIndex, idx);
                  }
                  onDragEndImage();
                }}
              >
                <img src={img.url} alt={img.altText}
                  className="w-16 h-16 object-cover rounded-xl border border-gray-200 shadow-sm" />
                <button type="button" onClick={() => onImageRemove(idx)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs flex items-center justify-center shadow-sm transition">
                  ×
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
          <button type="button" onClick={onAddSize}
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
                onChange={(sel) => onSizeChange(idx, "size", sel?.value || "")}
                placeholder="Size"
                classNamePrefix="sz-select"
                menuPortalTarget={selectPortalTarget}
                menuPosition="fixed"
                styles={selectMenuStyles}
              />
              <input type="text" value={sz.sku}
                onChange={(e) => onSizeChange(idx, "sku", e.target.value)}
                placeholder="SKU (e.g. BLK-S)" className={inputCls} />
              <div className="flex gap-1 items-center">
                <input type="number" min="0" value={sz.countInStock}
                  onChange={(e) => onSizeChange(idx, "countInStock", e.target.value)}
                  placeholder="Stock" className={inputCls} />
                {cv.sizes.length > 1 && (
                  <button type="button" onClick={() => onRemoveSize(idx)}
                    className="w-7 h-7 shrink-0 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition text-sm font-bold">✕</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ─── Shared helpers ───────────────────────────────────────────────────────────
const inputCls =
  "w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 transition";

const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">{label}</label>
    {children}
  </div>
);

export default AddProduct;
