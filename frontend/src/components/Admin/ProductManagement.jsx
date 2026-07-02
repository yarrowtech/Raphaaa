import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { deleteProduct, fetchAdminProducts } from "../../redux/slices/adminProductSlice";
import { FiEdit } from "react-icons/fi";
import { FaTrash, FaSearch, FaBoxOpen, FaPlus } from "react-icons/fa";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi2";
import { MdFilterList } from "react-icons/md";
import { toast } from "sonner";

/* ── stock badge ── */
const StockBadge = ({ count }) => {
  if (count === 0)  return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Out of Stock</span>;
  if (count < 10)   return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Low ({count})</span>;
  return              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />In Stock ({count})</span>;
};

const ProductManagement = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { products, loading, error } = useSelector((s) => s.adminProducts);
  const user = JSON.parse(localStorage.getItem("userInfo") || "{}");

  const [searchTerm,       setSearchTerm]       = useState("");
  const [skuSearchTerm,    setSkuSearchTerm]     = useState("");
  const [sortOption,       setSortOption]        = useState("");
  const [viewFilter,       setViewFilter]        = useState("all");
  const [currentPage,      setCurrentPage]       = useState(1);
  const [showConfirmModal, setShowConfirmModal]  = useState(false);
  const [productToDelete,  setProductToDelete]   = useState(null);

  const PRODUCTS_PER_PAGE = 8;

  useEffect(() => { dispatch(fetchAdminProducts()); }, [dispatch]);
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") setShowConfirmModal(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const confirmDelete = () => {
    if (!productToDelete) return;
    dispatch(deleteProduct(productToDelete));
    toast.success("Product deleted");
    setProductToDelete(null);
    setShowConfirmModal(false);
  };

  /* ── filter + sort ── */
  const draftProducts = products.filter((p) => !p.isPublished);
  const publishedProducts = products.filter((p) => p.isPublished);

  const scopedProducts = viewFilter === "drafts"
    ? draftProducts
    : viewFilter === "published"
      ? publishedProducts
      : products;

  const filtered = scopedProducts.filter((p) => {
    const variantSku = (p.variants || []).map((v) => v?.sku || "").join(" ");
    const colorSku   = (p.colorVariants || []).flatMap((cv) => (cv.sizes || []).map((s) => s?.sku || "")).join(" ");
    return (
      (p.name || "").toLowerCase().includes(searchTerm.toLowerCase()) &&
      (!skuSearchTerm ||
        p.sku?.toLowerCase().includes(skuSearchTerm.toLowerCase()) ||
        variantSku.toLowerCase().includes(skuSearchTerm.toLowerCase()) ||
        colorSku.toLowerCase().includes(skuSearchTerm.toLowerCase()))
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortOption === "name-asc")   return a.name.localeCompare(b.name);
    if (sortOption === "name-desc")  return b.name.localeCompare(a.name);
    if (sortOption === "price-asc")  return a.price - b.price;
    if (sortOption === "price-desc") return b.price - a.price;
    return 0;
  });

  const totalPages    = Math.ceil(sorted.length / PRODUCTS_PER_PAGE);
  const currentList   = sorted.slice((currentPage - 1) * PRODUCTS_PER_PAGE, currentPage * PRODUCTS_PER_PAGE);

  const getProductImage = (p) =>
    p.colorVariants?.[0]?.images?.[0]?.url || p.images?.[0]?.url || null;

  const openProduct = (product) => {
    navigate(`/admin/products/${product._id}/edit`);
  };

  /* ── loading / error ── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading products…</p>
      </div>
    </div>
  );
  if (error) return <p className="p-6 text-red-500">Error: {error}</p>;

  return (
    <div className="min-h-screen p-4 space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shrink-0 shadow-sm">
            <FaBoxOpen className="text-white text-lg" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">Products</h1>
            <p className="text-xs text-gray-400 mt-0.5">{products.length} product{products.length !== 1 ? "s" : ""} in catalogue</p>
          </div>
        </div>
        <Link
          to="/admin/add-product"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl shadow-sm transition self-start sm:self-auto"
        >
          <FaPlus className="text-xs" /> Add Product
        </Link>
      </div>

      {/* ── View switcher ── */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: "all", label: "All Products", count: products.length },
          { key: "drafts", label: "Drafts", count: draftProducts.length },
          { key: "published", label: "Published", count: publishedProducts.length },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setViewFilter(tab.key);
              setCurrentPage(1);
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border transition ${
              viewFilter === tab.key
                ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {tab.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              viewFilter === tab.key ? "bg-white/15 text-white" : "bg-gray-100 text-gray-500"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div className="p-4 flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-40">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
          <input
            type="text" placeholder="Search by name…"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
          />
        </div>
        <div className="relative flex-1 min-w-35">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
          <input
            type="text" placeholder="Search by SKU…"
            value={skuSearchTerm}
            onChange={(e) => { setSkuSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
          />
        </div>
        <div className="relative">
          <MdFilterList className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 transition appearance-none cursor-pointer"
          >
            <option value="">Sort by</option>
            <option value="name-asc">Name A → Z</option>
            <option value="name-desc">Name Z → A</option>
            <option value="price-asc">Price Low → High</option>
            <option value="price-desc">Price High → Low</option>
          </select>
        </div>
        <div className="flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-xl px-3 py-2.5 text-xs font-bold text-violet-700 shrink-0">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* ── Table card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-100 text-[11px] font-bold text-black uppercase tracking-widest">
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left">SKU / Variants</th>
                <th className="px-4 py-3 text-left">Price</th>
                <th className="px-4 py-3 text-left">Stock</th>
                {user.role === "admin" && <th className="px-4 py-3 text-left">Added by</th>}
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {currentList.length === 0 ? (
                <tr>
                  <td colSpan={user.role === "admin" ? 6 : 5} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FaBoxOpen className="text-3xl text-gray-200" />
                      <p className="text-sm font-semibold text-gray-400">No products found</p>
                      <p className="text-xs text-gray-300">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentList.map((product) => {
                  const imgUrl      = getProductImage(product);
                  const variantCount = (product.colorVariants?.length || 0) + (product.variants?.length || 0);
                  const displayName  = product.name || "Untitled Draft";
                  const draftLabel   = !product.isPublished;

                  return (
                    <tr
                      key={product._id}
                      className="hover:bg-gray-50/70 transition group cursor-pointer"
                      onClick={() => openProduct(product)}
                    >
                      {/* Product */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative w-11 h-11 shrink-0 rounded-xl overflow-hidden bg-gray-100 border border-gray-100 group-hover:border-violet-200 transition">
                            {imgUrl
                              ? <img src={imgUrl} alt={displayName} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs font-bold">N/A</div>
                            }
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 truncate max-w-[180px]">{displayName}</p>
                            {product.brand && <p className="text-[11px] text-gray-400">{product.brand}</p>}
                            <div className="flex gap-1 mt-0.5 flex-wrap">
                              {product.isFeatured && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Featured</span>}
                              {draftLabel
                                ? <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Draft</span>
                                : <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">Published</span>
                              }
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* SKU / Variants */}
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-lg inline-block">
                          {product.sku || "—"}
                        </p>
                        {variantCount > 0 && (
                          <p className="text-[11px] text-gray-400 mt-1">{variantCount} variant{variantCount !== 1 ? "s" : ""}</p>
                        )}
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3">
                        <p className="font-bold text-gray-800">₹{(product.discountPrice || product.price)?.toLocaleString("en-IN")}</p>
                        {product.discountPrice && product.discountPrice < product.price && (
                          <p className="text-[11px] text-gray-400 line-through">₹{product.price?.toLocaleString("en-IN")}</p>
                        )}
                      </td>

                      {/* Stock */}
                      <td className="px-4 py-3">
                        <StockBadge count={product.countInStock} />
                      </td>

                      {/* Added by */}
                      {user.role === "admin" && (
                        <td className="px-4 py-3">
                          <p className="text-xs font-semibold text-gray-700">{product.user?.name}</p>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            product.user?.role === "admin"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-teal-100 text-teal-700"
                          }`}>
                            {product.user?.role === "admin" ? "Admin" : "Merchandise"}
                          </span>
                        </td>
                      )}

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/admin/products/${product._id}/edit`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100 transition"
                          >
                            <FiEdit className="text-xs" /> Edit
                          </Link>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setProductToDelete(product._id);
                              setShowConfirmModal(true);
                            }}
                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition"
                          >
                            <FaTrash className="text-[10px]" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Page {currentPage} of {totalPages} · {sorted.length} products
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <HiChevronLeft className="text-sm" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold transition ${
                    currentPage === i + 1
                      ? "bg-violet-600 text-white shadow-sm"
                      : "border border-gray-200 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <HiChevronRight className="text-sm" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Delete modal ── */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowConfirmModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <FaTrash className="text-red-500 text-lg" />
            </div>
            <h3 className="text-base font-bold text-gray-800 text-center mb-1">Delete Product?</h3>
            <p className="text-sm text-gray-500 text-center mb-5">This action is permanent and cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-sm font-bold text-white shadow-sm transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;
