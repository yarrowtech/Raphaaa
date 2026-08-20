import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { FaLock, FaTruck, FaUndo } from "react-icons/fa";
import { buildOrderAttribution } from "../../utils/attribution";

const BACKEND = import.meta.env.VITE_BACKEND_URL;

const GuestCheckout = () => {
  const navigate = useNavigate();
  const { cart } = useSelector((state) => state.cart);

  const [form, setForm] = useState({
    guestName: "",
    guestEmail: "",
    address: "",
    city: "",
    postalCode: "",
    country: "India",
    phone: "+91",
  });
  const [paymentMethod, setPaymentMethod] = useState("cash_on_delivery");
  const [quote, setQuote] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const cartItems = cart?.products || [];

  const subtotal = cartItems.reduce(
    (sum, p) => sum + (parseFloat(p.price) || 0) * (p.quantity || 1),
    0
  );

  // Fetch guest quote from backend
  useEffect(() => {
    if (cartItems.length === 0) return;
    const t = setTimeout(async () => {
      try {
        const { data } = await axios.post(`${BACKEND}/api/checkout/guest-quote`, {
          checkoutItems: cartItems.map((p) => ({
            productId: p.productId,
            name: p.name,
            image: p.image,
            price: p.price,
            quantity: p.quantity,
            size: p.size,
            color: p.color,
            sku: p.sku,
          })),
          paymentMethod,
        });
        setQuote(data.quote || null);
      } catch (_) {
        setQuote(null);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [cartItems, paymentMethod]);

  const freeThreshold  = Number(quote?.freeShippingThreshold ?? 999);
  const quoteShipping  = Number(quote?.shipping ?? (subtotal >= freeThreshold ? 0 : 99));
  const netShipping    = Math.max(0, quoteShipping - Number(quote?.shippingDiscount ?? 0));
  const total          = Number(quote?.totalAfterWallet ?? (subtotal + netShipping));

  const validate = () => {
    const e = {};
    if (!form.guestName.trim()) e.guestName = "Name is required";
    if (!form.guestEmail.trim() || !/\S+@\S+\.\S+/.test(form.guestEmail))
      e.guestEmail = "Valid email is required";
    if (!form.address.trim()) e.address = "Address is required";
    if (!form.city.trim()) e.city = "City is required";
    if (!form.postalCode.trim()) e.postalCode = "Postal code is required";
    const digits = form.phone.replace(/^\+91/, "");
    if (digits.length !== 10 || !/^\d+$/.test(digits))
      e.phone = "Enter a valid 10-digit mobile number";
    return e;
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await axios.post(`${BACKEND}/api/checkout/guest-order`, {
        orderItems: cartItems.map((p) => ({
          productId: p.productId,
          name: p.name,
          image: p.image,
          price: p.price,
          quantity: p.quantity,
          size: p.size,
          color: p.color,
          sku: p.sku,
        })),
        shippingAddress: {
          address: form.address,
          city: form.city,
          postalCode: form.postalCode,
          country: form.country,
          phone: Number(form.phone.replace(/\D/g, "")),
        },
        paymentMethod,
        totalPrice: total,
        guestEmail: form.guestEmail,
        guestName: form.guestName,
        trackingInfo: buildOrderAttribution({
          customerName: form.guestName,
          customerEmail: form.guestEmail,
          customerPhone: form.phone,
        }),
      });

      navigate("/order-confirmation", {
        state: { order: data.order, paymentMethod, isGuest: true },
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
        <div className="text-5xl mb-4">🛒</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-3 bg-sky-600 text-white font-semibold rounded-xl hover:opacity-90 transition"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  const field = (name, label, type = "text", placeholder = "") => (
    <div>
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={form[name]}
        onChange={handleChange}
        placeholder={placeholder}
        className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-100 transition ${
          errors[name] ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50 focus:bg-white focus:border-sky-400"
        }`}
      />
      {errors[name] && <p className="text-xs text-red-500 mt-1">{errors[name]}</p>}
    </div>
  );

  return (
    <div className="min-h-screen py-8 px-4 md:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-800">Guest Checkout</h1>
          <button
            onClick={() => navigate("/login?redirect=%2Fcheckout")}
            className="text-sm text-sky-600 font-semibold hover:underline"
          >
            Sign in for faster checkout →
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Left — Form */}
          <form onSubmit={handleSubmit} className="flex-1 space-y-4">
            {/* Contact info */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Contact</h3>
              </div>
              <div className="p-5 space-y-3">
                {field("guestName", "Full Name", "text", "John Doe")}
                {field("guestEmail", "Email", "email", "you@example.com")}
              </div>
            </div>

            {/* Delivery address */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Delivery Address</h3>
              </div>
              <div className="p-5 space-y-3">
                {field("address", "Street Address", "text", "123, Main Street, Area")}
                <div className="grid grid-cols-2 gap-3">
                  {field("city", "City", "text", "Mumbai")}
                  {field("postalCode", "Postal Code", "text", "400001")}
                </div>
                {field("phone", "Mobile Number", "tel", "+91XXXXXXXXXX")}
              </div>
            </div>

            {/* Payment */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Payment Method</h3>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { value: "cash_on_delivery", icon: "💵", label: "Cash on Delivery", sub: "Pay when you receive your order" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all ${
                      paymentMethod === opt.value
                        ? "border-sky-500 bg-sky-50 ring-2 ring-sky-200"
                        : "border-gray-200 hover:border-sky-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={opt.value}
                      checked={paymentMethod === opt.value}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="sr-only"
                    />
                    <span className="text-xl">{opt.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                      <p className="text-xs text-gray-400">{opt.sub}</p>
                    </div>
                    <div
                      className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        paymentMethod === opt.value ? "border-sky-500 bg-sky-500" : "border-gray-300"
                      }`}
                    >
                      {paymentMethod === opt.value && <span className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-4 rounded-2xl font-bold text-base tracking-wide transition-all shadow-md flex items-center justify-center gap-2 ${
                submitting
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-sky-600 text-white hover:bg-sky-700"
              }`}
            >
              {submitting ? (
                <><span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Placing order…</>
              ) : (
                <>📦 Place Order — Cash on Delivery</>
              )}
            </button>

            {/* Trust */}
            <div className="flex flex-wrap items-center justify-center gap-5 py-2">
              {[
                { icon: <FaLock className="text-sky-500" />, text: "Secure checkout" },
                { icon: <FaTruck className="text-emerald-500" />, text: "Free delivery" },
                { icon: <FaUndo className="text-amber-500" />, text: "7-day returns" },
              ].map(({ icon, text }) => (
                <span key={text} className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                  {icon} {text}
                </span>
              ))}
            </div>
          </form>

          {/* Right — Order Summary */}
          <div className="w-full lg:w-96 shrink-0 lg:sticky lg:top-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-sky-50">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                  Order Summary
                  <span className="ml-2 text-xs font-medium text-gray-400 normal-case">
                    {cartItems.length} item{cartItems.length !== 1 ? "s" : ""}
                  </span>
                </h3>
              </div>
              <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                {cartItems.map((product, i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-4">
                    <div className="relative shrink-0 w-16 h-20 rounded-lg overflow-hidden bg-gray-50 border border-gray-100">
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-sky-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {product.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 line-clamp-2">{product.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {product.color && <span>{product.color} · </span>}
                        {product.size && <span>Size {product.size}</span>}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-gray-900 shrink-0">
                      ₹{(product.price * product.quantity).toLocaleString("en-IN")}
                    </p>
                  </div>
                ))}
              </div>
              <div className="px-5 py-4 border-t border-gray-100 space-y-2">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    Shipping
                    {netShipping > 0 && (
                      <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full">
                        Free above ₹999
                      </span>
                    )}
                  </span>
                  {netShipping === 0 ? (
                    <span className="text-emerald-600 font-semibold">Free</span>
                  ) : (
                    <span className="text-gray-700 font-semibold">₹{netShipping.toLocaleString("en-IN")}</span>
                  )}
                </div>
                <div className="flex justify-between pt-3 border-t border-gray-100">
                  <span className="text-base font-bold text-gray-900">Total</span>
                  <span className="text-lg font-extrabold text-sky-700">
                    ₹{total.toLocaleString("en-IN")}
                  </span>
                </div>
                {netShipping > 0 && (
                  <p className="text-[11px] text-center text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    Add ₹{(999 - subtotal).toLocaleString("en-IN")} more to get <strong>FREE shipping</strong>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestCheckout;
