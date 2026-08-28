import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

const PAYMENT_METHOD_OPTIONS = [
  { value: "Razorpay", label: "Razorpay (prepaid / cards / UPI)" },
  { value: "cash_on_delivery", label: "Cash on Delivery" },
  { value: "PayPal", label: "PayPal" },
];

const emptyCouponForm = {
  title: "",
  description: "",
  couponCode: "",
  startDate: "",
  endDate: "",
  productIds: [],
  benefitScope: "product", // product | cart | shipping
  benefitType: "percent", // percent | flat
  offerPercentage: 0, // used when benefitType === "percent"
  benefitAmount: 0, // used when benefitType === "flat"
  maxDiscount: "", // optional cap for percent discounts
  minCartSubtotal: "", // optional minimum cart value
  paymentMethods: [], // restrict coupon to these payment methods
  stackable: true,
};

const AddEditCoupon = () => {
  const [formData, setFormData] = useState({ ...emptyCouponForm });
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();

  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/products`
      );
      setProducts(data);
    } catch {
      toast.error("Failed to fetch products");
    }
  }, []);

  const fetchCoupon = useCallback(async () => {
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/offers/${id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("userToken")}`,
          },
        }
      );
      setFormData({
        ...emptyCouponForm,
        title: data.title || "",
        description: data.description || "",
        couponCode: data.couponCode || "",
        startDate: data.startDate?.slice(0, 10) || "",
        endDate: data.endDate?.slice(0, 10) || "",
        productIds: (data.productIds?.length
          ? data.productIds
          : data.conditions?.includeProductIds || []
        ).map((p) => p._id || p),
        benefitScope: data.benefit?.scope || "product",
        benefitType: data.benefit?.type || "percent",
        offerPercentage: data.offerPercentage || data.benefit?.percent || 0,
        benefitAmount: data.benefit?.amount || 0,
        maxDiscount: data.benefit?.maxDiscount ?? "",
        minCartSubtotal: data.conditions?.minCartSubtotal ?? "",
        paymentMethods: data.conditions?.paymentMethods || [],
        stackable: data.stackable !== false,
      });
    } catch {
      toast.error("Failed to fetch coupon");
    }
  }, [id]);

  useEffect(() => {
    fetchProducts();
    if (id) fetchCoupon();
  }, [fetchProducts, fetchCoupon, id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const code = String(formData.couponCode || "").trim().toUpperCase();
    if (!code) {
      toast.error("Coupon code is required");
      return;
    }

    try {
      setSaving(true);
      const config = {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("userToken")}`,
        },
      };

      const pct = Number(formData.offerPercentage) || 0;

      // Coupons must NOT auto-discount the product on the storefront — timed-sale
      // sync only looks at the legacy `productIds`. Route product targeting
      // through `conditions.includeProductIds` so it only applies with the code.
      const payload = {
        title: formData.title,
        description: formData.description,
        startDate: formData.startDate,
        endDate: formData.endDate,
        couponCode: code,
        offerPercentage: formData.benefitType === "percent" ? pct : 0,
        productIds: [],
        stackable: formData.stackable,
        benefit: {
          scope: formData.benefitScope,
          type: formData.benefitType,
          percent: formData.benefitType === "percent" ? pct : undefined,
          amount: formData.benefitType === "flat" ? Number(formData.benefitAmount) || 0 : undefined,
          maxDiscount: formData.maxDiscount === "" ? undefined : Number(formData.maxDiscount),
        },
        conditions: {
          minCartSubtotal: formData.minCartSubtotal === "" ? undefined : Number(formData.minCartSubtotal),
          paymentMethods: formData.paymentMethods,
          includeProductIds: formData.productIds,
        },
      };

      if (id) {
        await axios.put(
          `${import.meta.env.VITE_BACKEND_URL}/api/offers/${id}`,
          payload,
          config
        );
        toast.success("Coupon updated");
      } else {
        await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/api/offers`,
          payload,
          config
        );
        toast.success("Coupon created");
      }
      navigate("/admin/coupons");
    } catch (error) {
      console.error("Coupon save error:", error);
      toast.error(error?.response?.data?.message || "Failed to save coupon");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="bg-white/80 backdrop-blur-md shadow-2xl rounded-2xl p-8 border border-gray-200">
        <h2 className="text-3xl font-extrabold mb-2 text-slate-800 text-center tracking-wide">
          {id ? "Edit Coupon" : "Create Coupon"}
        </h2>
        <p className="text-center text-sm text-gray-500 mb-8">
          Coupons show up with an <span className="font-semibold">Apply</span> button on the
          product page and are validated again at checkout.
        </p>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="e.g. ICICI Bank Instant Discount"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-sky-400 transition outline-none"
            />
          </div>

          {/* Coupon Code */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Coupon Code</label>
            <input
              type="text"
              name="couponCode"
              value={formData.couponCode}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, couponCode: e.target.value.toUpperCase() }))
              }
              required
              placeholder="e.g. ICICI5"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-sky-400 transition outline-none font-mono"
            />
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-sky-400 transition outline-none"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-sky-400 transition outline-none"
            />
          </div>

          {/* Description */}
          <div className="col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={2}
              placeholder="Shown under the title on the product page"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-sky-400 transition outline-none"
            ></textarea>
          </div>

          {/* Discount settings */}
          <div className="col-span-2 rounded-xl border border-sky-100 bg-sky-50/50 p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Discount Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Applies To</label>
                <select
                  name="benefitScope"
                  value={formData.benefitScope}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-sky-400"
                >
                  <option value="product">Matching product(s)</option>
                  <option value="cart">Whole cart</option>
                  <option value="shipping">Shipping</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Discount Type</label>
                <select
                  name="benefitType"
                  value={formData.benefitType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-sky-400"
                >
                  <option value="percent">Percentage (%)</option>
                  <option value="flat">Flat amount (₹)</option>
                </select>
              </div>

              {formData.benefitType === "flat" ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Flat Discount (₹)
                  </label>
                  <input
                    type="number"
                    name="benefitAmount"
                    min={0}
                    value={formData.benefitAmount}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Discount Percentage (%)
                  </label>
                  <input
                    type="number"
                    name="offerPercentage"
                    min={0}
                    max={90}
                    value={formData.offerPercentage}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Max Discount Cap (₹, optional)
                </label>
                <input
                  type="number"
                  name="maxDiscount"
                  min={0}
                  value={formData.maxDiscount}
                  onChange={handleChange}
                  placeholder="No cap"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Min Cart Subtotal (₹, optional)
                </label>
                <input
                  type="number"
                  name="minCartSubtotal"
                  min={0}
                  value={formData.minCartSubtotal}
                  onChange={handleChange}
                  placeholder="No minimum"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 mt-6">
                  <input
                    type="checkbox"
                    className="accent-sky-500"
                    checked={formData.stackable}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, stackable: e.target.checked }))
                    }
                  />
                  Allow stacking with other offers
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Restrict To Payment Methods (optional)
                </label>
                <div className="flex flex-wrap gap-3">
                  {PAYMENT_METHOD_OPTIONS.map((pm) => (
                    <label
                      key={pm.value}
                      className="flex items-center gap-2 text-xs text-gray-700 bg-white px-3 py-2 rounded-lg border border-gray-200"
                    >
                      <input
                        type="checkbox"
                        className="accent-sky-500"
                        checked={formData.paymentMethods.includes(pm.value)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormData((prev) => ({
                            ...prev,
                            paymentMethods: checked
                              ? [...prev.paymentMethods, pm.value]
                              : prev.paymentMethods.filter((x) => x !== pm.value),
                          }));
                        }}
                      />
                      {pm.label}
                    </label>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Shown on the product page as “on select payment methods”. Only applied
                  once that method is chosen at checkout.
                </p>
              </div>
            </div>
          </div>

          {/* Products */}
          <div className="col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Limit To Specific Products (optional)
            </label>
            <p className="text-xs text-gray-400 mb-3">
              Leave everything unchecked to make this coupon valid store-wide.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto border border-gray-200 rounded-xl p-4 bg-gray-50 shadow-inner">
              {products.map((product) => (
                <label
                  key={product._id}
                  className="flex items-center gap-3 text-sm text-gray-700 bg-white px-3 py-2 rounded-lg shadow-sm hover:shadow-md transition outline-none"
                >
                  <input
                    type="checkbox"
                    value={product._id}
                    checked={formData.productIds.includes(product._id)}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      setFormData((prev) => ({
                        ...prev,
                        productIds: isChecked
                          ? [...prev.productIds, product._id]
                          : prev.productIds.filter((pid) => pid !== product._id),
                      }));
                    }}
                    className="accent-sky-500"
                  />
                  {product.name} - ₹{product.price}
                </label>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="col-span-2 text-center">
            <button
              type="submit"
              disabled={saving}
              className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold py-3 px-10 rounded-full shadow-md hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-60"
            >
              {saving ? "Saving..." : id ? "Update Coupon" : "Create Coupon"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditCoupon;
