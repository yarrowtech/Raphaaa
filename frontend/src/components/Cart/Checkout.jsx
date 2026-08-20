import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import RazorpayButton from "./RazorpayButton";
import GuestCheckout from "./GuestCheckout";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import {
  createRazorpayOrder,
  createCODOrder,
  verifyRazorpayPayment,
  handlePaymentFailure,
  clearCheckout,
} from "../../redux/slices/checkoutSlice";
import { clearCart, removeFromCart, updateCartItemQuantity } from "../../redux/slices/cartSlice";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import {
  fetchProductDetails,
  fetchSimilarProducts,
} from "../../redux/slices/productsSlice";
import { buildOrderAttribution } from "../../utils/attribution";
import AddressForm from "./AddressForm";
import {
  FaPlus, FaLock, FaTruck, FaUndo, FaMapMarkerAlt,
  FaArrowLeft, FaShieldAlt,
  FaCreditCard,
  FaCashRegister,
  FaMoneyBill,
} from "react-icons/fa";
import { FaChevronDown, FaChevronRight } from "react-icons/fa";
import { HiX } from "react-icons/hi";
import { HiTrash } from "react-icons/hi2";
import { Verified } from "lucide-react";
import { getOrderGstSummary } from "../../utils/gst";



const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Add New Address</h3>
          <button type="button" onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition">
            <HiX className="text-sm" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

const CheckoutProgress = ({ currentStep = 2 }) => {
  const steps = [
    { id: 1, label: "Address" },
    { id: 2, label: "Order Summary" },
    { id: 3, label: "Payment" },
  ];
  const N = 14;

  return (
    <div className="flex justify-center mb-6">
      <div className="flex h-10" style={{ filter: "drop-shadow(0 2px 8px rgba(14,165,233,0.22))" }}>
        {steps.map((s, i) => {
          const done = s.id < currentStep;
          const active = s.id === currentStep;
          const isFirst = i === 0;
          const isLast = i === steps.length - 1;

          const bg = done
            ? "linear-gradient(to right, #0ea5e9, #2563eb)"
            : active
            ? "linear-gradient(to right, #7dd3fc, #38bdf8)"
            : "#f1f5f9";

          const clip = isFirst
            ? `polygon(0 0, calc(100% - ${N}px) 0, 100% 50%, calc(100% - ${N}px) 100%, 0 100%)`
            : isLast
            ? `polygon(${N}px 0, 100% 0, 100% 100%, ${N}px 100%, 0 50%)`
            : `polygon(${N}px 0, calc(100% - ${N}px) 0, 100% 50%, calc(100% - ${N}px) 100%, ${N}px 100%, 0 50%)`;

          return (
            <div
              key={s.id}
              className="relative flex items-center gap-2 h-full select-none"
              style={{
                background: bg,
                clipPath: clip,
                marginLeft: isFirst ? 0 : `${-(N - 1)}px`,
                zIndex: steps.length - i,
                paddingLeft: isFirst ? "20px" : `${N + 12}px`,
                paddingRight: isLast ? "20px" : `${N + 12}px`,
              }}
            >
              <span
                className="flex items-center justify-center text-[11px] font-bold w-5 h-5 rounded-full shrink-0"
                style={{
                  background: done || active ? "rgba(255,255,255,0.28)" : "#e2e8f0",
                  color: done || active ? "#fff" : "#94a3b8",
                }}
              >
                {done ? "✓" : s.id}
              </span>
              <span
                className="text-xs font-semibold whitespace-nowrap"
                style={{ color: done || active ? "#fff" : "#94a3b8" }}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};


const Checkout = () => {
  const formatColor = (value) => {
    const c = String(value || "").trim();
    if (!c) return "";
    return /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(c) ? "Selected Color" : c;
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const {
    cart,
    loading: cartLoading,
    error: cartError,
  } = useSelector((state) => state.cart);
  const { selectedProduct, similarProducts } = useSelector(
    (state) => state.products
  );
  const { user } = useSelector((state) => state.auth);
  const {
    order,
    loading: checkoutLoading,
    error: checkoutError,
    razorpayOrderId,
    orderId,
    razorpayKeyId,
    amount,
    currency,
  } = useSelector((state) => state.checkout);

  const [paymentMethod, setPaymentMethod] = useState("razorpay");
  const [orderProcessing, setOrderProcessing] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [submitDisabled, setSubmitDisabled] = useState(false);
  const [orderInitiated, setOrderInitiated] = useState(false);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(null);
  const [fullUser, setFullUser] = useState(null);
  const [displayCount, setDisplayCount] = useState(4);
  const [addressesOpen, setAddressesOpen] = useState(false);
  const [featuredCollab, setFeaturedCollab] = useState(null);
  const [showPriceDetails, setShowPriceDetails] = useState(true);
  const [stockByItem, setStockByItem] = useState({});
  const [qtyModeByItem, setQtyModeByItem] = useState({});
  const [customQtyByItem, setCustomQtyByItem] = useState({});
  const [productMetaByItem, setProductMetaByItem] = useState({});

  // Phase 4: promos + wallet

  const currentStep = razorpayOrderId ? 3 : 2;

  const computedQuantity = (cart?.products || []).reduce(
    (acc, p) => acc + Number(p.quantity || 0),
    0
  );

  const computedSubtotal = Number(
    (cart?.products || []).reduce((sum, p) => {
      const price = resolveDisplayPrice(p, productMetaByItem[itemKey(p)] || {});
      const qty = Number(p.quantity || 0);
      return sum + price * qty;
    }, 0).toFixed(2)
  );

  // Informational only — prices (and shipping/zone fees) are GST-inclusive,
  // so this doesn't change the total. Freight is taxed at the goods' blended rate.
  const gstSummary = getOrderGstSummary(
    cart?.products || [],
    (p) => resolveDisplayPrice(p, productMetaByItem[itemKey(p)] || {}),
    0 // Assuming fees are added later or handled within quote
  );

  const [couponCode, setCouponCode] = useState("");
  const [couponCodes, setCouponCodes] = useState([]);
  const [walletRedeem, setWalletRedeem] = useState(0);
  const [orderNote, setOrderNote] = useState("");
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const displaySubtotal  = Number(quote?.subtotal    ?? computedSubtotal);
  const freeThreshold    = Number(quote?.freeShippingThreshold ?? 999);
  const displayShipping  = Number(quote?.shipping    ?? (computedSubtotal >= freeThreshold ? 0 : 99));
  const shippingDiscount = Number(quote?.shippingDiscount ?? 0);
  const netShipping      = Math.max(0, displayShipping - shippingDiscount);

  const displayTotal     = Number(quote?.totalAfterWallet ?? (computedSubtotal + netShipping + gstSummary.gstAmount));
  const isFirstOrder     = quote?.isNewUser === true;
  const zoneCharge       = Number(quote?.zoneCharge ?? 0);
  const zoneName         = quote?.zoneName || null;

  // Mobile price breakdown helpers
  const feesTotal      = netShipping + zoneCharge;
  const discountsTotal = Math.max(0, displaySubtotal + feesTotal - (displayTotal - gstSummary.gstAmount));
  const savingsTotal   = discountsTotal;

  useEffect(() => {
    const fetchCollab = async () => {
      try {
        const { data } = await axios.get(`${import.meta.env.VITE_BACKEND_URL}`);
        if (data && data.length > 0) setFeaturedCollab(data[0]);
      } catch (err) {
        console.error("Failed to load feature collab", err);
      }
    };
    fetchCollab();
  }, []);

  useEffect(() => {
    if (razorpayOrderId && paymentMethod === "razorpay") {
      const payBtn = document.getElementById("autoPayButton");
      if (payBtn) payBtn.click();
    }
  }, [razorpayOrderId, paymentMethod]);

  useEffect(() => {
    // If user switches from online payment to COD after creating/canceling Razorpay flow,
    // reset checkout payment state so COD can proceed normally.
    if (paymentMethod !== "cash_on_delivery") return;
    if (!razorpayOrderId && !orderId) return;
    dispatch(clearCheckout());
    setOrderProcessing(false);
    setOrderInitiated(false);
    setSubmitDisabled(false);
  }, [paymentMethod, razorpayOrderId, orderId, dispatch]);

  useEffect(() => {
    const token = localStorage.getItem("userToken");
    if (!token) return;
    if (!cart?.products || cart.products.length === 0) return;

    const run = async () => {
      setQuoteLoading(true);
      try {
        const pm = paymentMethod === "cash_on_delivery" ? "cash_on_delivery" : "Razorpay";
        const { data } = await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/api/checkout/quote`,
          {
            checkoutItems: cart.products.map((p) => ({
              productId: p.productId,
              name: p.name,
              image: p.image,
              price: resolveDisplayPrice(p, productMetaByItem[itemKey(p)] || {}),
              quantity: p.quantity,
              size: p.size,
              color: p.color,
              sku: p.sku,
            })),
            paymentMethod: pm,
            couponCodes,
            walletRedeem,
            shippingAddress: shippingAddress.postalCode ? shippingAddress : undefined,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setQuote(data?.quote || null);
      } catch (err) {
        console.error("Quote failed:", err);
        setQuote(null);
      } finally {
        setQuoteLoading(false);
      }
    };

    const t = setTimeout(run, 250);
    return () => clearTimeout(t);
  }, [cart?.products, paymentMethod, couponCodes, walletRedeem]);

  const [shippingAddress, setShippingAddress] = useState({
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    postalCode: "",
    country: "India",
    phone: "+91",
  });

  function itemKey(p) {
    return `${p?.productId || ""}::${p?.size || ""}::${p?.color || ""}::${p?.sku || ""}`;
  }

  function resolveDisplayPrice(product, meta = {}) {
    const candidates = [
      meta.displayPrice,
      meta.discountPrice,
      product?.discountPrice,
      product?.price,
    ]
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0);

    return candidates.length > 0 ? Math.min(...candidates) : 0;
  }

  const resolveAvailableStock = (product, cartItem) => {
    if (!product) return 0;
    const itemSku = String(cartItem?.sku || "").trim().toLowerCase();
    const itemColor = String(cartItem?.color || "").trim().toLowerCase();
    const itemSize = String(cartItem?.size || "").trim().toLowerCase();

    if (Array.isArray(product.colorVariants) && product.colorVariants.length > 0) {
      if (itemSku) {
        for (const cv of product.colorVariants) {
          const matched = (cv?.sizes || []).find(
            (s) => String(s?.sku || "").trim().toLowerCase() === itemSku
          );
          if (matched) return Number(matched?.countInStock || 0);
        }
      }
      for (const cv of product.colorVariants) {
        const colorHex = String(cv?.color || "").trim().toLowerCase();
        const colorName = String(cv?.colorName || "").trim().toLowerCase();
        if (itemColor && itemColor !== colorHex && itemColor !== colorName) continue;
        const matched = (cv?.sizes || []).find(
          (s) => String(s?.size || "").trim().toLowerCase() === itemSize
        );
        if (matched) return Number(matched?.countInStock || 0);
      }
    }

    if (Array.isArray(product.variants) && product.variants.length > 0) {
      if (itemSku) {
        const bySku = product.variants.find(
          (v) => String(v?.sku || "").trim().toLowerCase() === itemSku
        );
        if (bySku) return Number(bySku?.countInStock || 0);
      }
      const matched = product.variants.find(
        (v) =>
          String(v?.color || "").trim().toLowerCase() === itemColor &&
          String(v?.size || "").trim().toLowerCase() === itemSize
      );
      if (matched) return Number(matched?.countInStock || 0);
    }

    return Number(product?.countInStock || 0);
  };

  const countries = [
    "India","United States","United Kingdom","Canada","Australia","Germany","France","Japan",
    "China","Brazil","Russia","Italy","Spain","Netherlands","Sweden","Switzerland","Norway",
    "Denmark","Finland","Belgium","Austria","Portugal","Greece","Ireland","Poland",
    "Czech Republic","Hungary","Romania","Bulgaria","Croatia","Slovenia","Slovakia",
    "Estonia","Latvia","Lithuania","Luxembourg","Malta","Cyprus",
  ];

  useEffect(() => {
    dispatch(clearCheckout());
    setOrderInitiated(false);
  }, [dispatch]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem("userToken");
        const { data } = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/users/profile`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setFullUser(data);
      } catch (error) {
        console.error("Failed to load user profile:", error.response?.data?.message || error.message);
      }
    };
    fetchUserProfile();
  }, []);

  useEffect(() => {
    const products = cart?.products || [];
    if (products.length === 0) {
      setStockByItem({});
      return;
    }

    const run = async () => {
      try {
        const rows = await Promise.all(
          products.map(async (p) => {
            const pid = p?.productId;
            if (!pid) return { key: itemKey(p), stock: Number(p?.quantity || 0), meta: {} };
            const { data } = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/products/${pid}`);
            return {
              key: itemKey(p),
              stock: resolveAvailableStock(data, p),
              meta: {
                rating:     Number(data?.rating     || 0),
                numReviews: Number(data?.numReviews || 0),
                slug: String(data?.name || p?.name || "").toLowerCase().replace(/\s+/g, "-"),
              },
            };
          })
        );
        setStockByItem(Object.fromEntries(rows.map((r) => [r.key, r.stock])));
        setProductMetaByItem(Object.fromEntries(rows.map((r) => [r.key, r.meta])));
      } catch (err) {
        console.error("Failed to fetch stock:", err);
      }
    };

    run();
  }, [cart?.products]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleQtySelect = async (product, value) => {
    const key = itemKey(product);
    const maxStock = Number(stockByItem[key] ?? 0);
    if (value === "more") {
      setQtyModeByItem((prev) => ({ ...prev, [key]: "more" }));
      setCustomQtyByItem((prev) => ({ ...prev, [key]: String(product.quantity || "") }));
      return;
    }

    const nextQty = Number(value);
    if (!Number.isFinite(nextQty) || nextQty < 1) return;
    if (maxStock > 0 && nextQty > maxStock) {
      toast.error(`Only ${maxStock} left in stock`);
      return;
    }

    setQtyModeByItem((prev) => ({ ...prev, [key]: "preset" }));
    await dispatch(
      updateCartItemQuantity({
        productId: product.productId,
        quantity: nextQty,
        userId: user?._id,
        size: product.size,
        color: product.color,
      })
    );
  };

  const applyCustomQty = async (product) => {
    const key = itemKey(product);
    const maxStock = Number(stockByItem[key] ?? 0);
    const value = Number(customQtyByItem[key] || 0);
    if (!Number.isFinite(value) || value < 1) {
      toast.error("Enter a valid quantity");
      return;
    }
    if (maxStock > 0 && value > maxStock) {
      toast.error(`Only ${maxStock} available in stock`);
      return;
    }

    await dispatch(
      updateCartItemQuantity({
        productId: product.productId,
        quantity: value,
        userId: user?._id,
        size: product.size,
        color: product.color,
      })
    );
    setQtyModeByItem((prev) => ({ ...prev, [key]: "preset" }));
  };

  const handleRemoveItem = async (product) => {
    await dispatch(
      removeFromCart({
        productId: product.productId,
        userId: user?._id,
        size: product.size,
        color: product.color,
      })
    );
  };

  const validatePhone = (phone) => {
    if (!phone.startsWith("+91")) phone = "+91" + phone.replace(/^\+91/, "");
    const phoneWithoutCode = phone.slice(3);
    if (phoneWithoutCode.length !== 10 || !/^\d{10}$/.test(phoneWithoutCode)) {
      setPhoneError("Phone number must be exactly 10 digits after +91");
      return false;
    }
    setPhoneError("");
    return true;
  };

  const handleAddressSelect = (address, index) => {
    setSelectedAddressIndex(index);
    const firstName = address?.firstName || fullUser?.name?.split(" ")?.[0] || "";
    const lastName  = address?.lastName  || (fullUser?.name ? fullUser.name.split(" ").slice(1).join(" ") : "");
    setShippingAddress({
      firstName,
      lastName,
      address: address.address   || "",
      city:    address.city      || "",
      postalCode: address.postalCode || "",
      country: address.country   || "India",
      phone:   String(address.phone || ""),
    });
    validatePhone(String(address.phone || ""));
  };

  const handleCreateOrder = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!shippingAddress.address) {
      toast.error("Please select an address first.");
      return;
    }
    if (!validatePhone(shippingAddress.phone)) return;
    if (orderInitiated || submitDisabled) return;

    if (cart && cart.products.length > 0) {
      setOrderProcessing(true);
      setSubmitDisabled(true);
      setOrderInitiated(true);

      const shipping = {
        firstName:  shippingAddress.firstName,
        lastName:   shippingAddress.lastName,
        address:    shippingAddress.address,
        city:       shippingAddress.city,
        postalCode: shippingAddress.postalCode,
        country:    shippingAddress.country,
        phone:      shippingAddress.phone,
      };

      const orderData = {
        orderItems: cart.products.map((p) => ({
          productId: p.productId,
          name:      p.name,
          image:     p.image,
          price:     resolveDisplayPrice(p, productMetaByItem[itemKey(p)] || {}),
          quantity:  p.quantity,
          size:      p.size,
          color:     p.color,
          sku:       p.sku,
        })),
        shippingAddress: shipping,
        paymentMethod,
        totalPrice:    displayTotal,
        couponCodes,
        walletRedeem,
        orderNote:     orderNote.trim() || undefined,
        idempotencyKey: uuidv4(),
        trackingInfo: buildOrderAttribution({
          customerName: user?.name || fullUser?.name || "",
          customerEmail: user?.email || fullUser?.email || "",
          customerPhone: shippingAddress.phone || "",
        }),
      };

      try {
        if (paymentMethod === "cash_on_delivery") {
          const result = await dispatch(createCODOrder(orderData));
          if (result.type === "checkout/createCODOrder/fulfilled") {
            dispatch(clearCart());
            dispatch(clearCheckout());
            setOrderInitiated(false);
            navigate("/order-confirmation", {
              state: { order: result.payload, paymentMethod: "cash_on_delivery" },
            });
          } else {
            console.error("[ERROR] COD Order Creation Failed:", result.error);
            alert(result.error?.message || "Failed to create COD order. Please try again.");
            setOrderInitiated(false);
          }
        } else {
          const result = await dispatch(createRazorpayOrder(orderData));
          if (result.type === "checkout/createRazorpayOrder/fulfilled") {
            if (Number(result.payload.amount) !== Number(displayTotal)) {
              alert(`A pending order (${result.payload.orderId}) exists with a different amount (₹${result.payload.amount}). Please complete or cancel it.`);
              dispatch(clearCheckout());
              setOrderInitiated(false);
              navigate("/order-confirmation", { state: { orderId: result.payload.orderId } });
            } else {
              setOrderProcessing(false);
            }
          } else {
            console.error("[ERROR] Razorpay Order Creation Failed:", result.error);
            alert(result.error?.message || "Failed to create Razorpay order. Please try again.");
            setOrderInitiated(false);
          }
        }
      } catch (error) {
        console.error("[ERROR] Order creation error:", error);
        alert("Failed to create order. Please try again.");
        setOrderInitiated(false);
      } finally {
        setSubmitDisabled(false);
      }
    }
  };

  const handleRazorpaySuccess = async (paymentData) => {
    try {
      setOrderProcessing(true);
      const result = await dispatch(
        verifyRazorpayPayment({
          razorpayPaymentId: paymentData.razorpay_payment_id,
          razorpayOrderId,
          razorpaySignature: paymentData.razorpay_signature,
          orderId,
        })
      );
      if (result.type === "checkout/verifyRazorpayPayment/fulfilled") {
        dispatch(clearCart());
        dispatch(clearCheckout());
        setOrderInitiated(false);
        navigate("/order-confirmation", {
          state: { order: result.payload.order, paymentMethod: "razorpay" },
        });
      } else {
        console.error("[ERROR] Payment verification failed:", result.error);
        alert(result.error?.message || "Payment verification failed. Please contact support.");
        setOrderInitiated(false);
      }
    } catch (error) {
      console.error("[ERROR] Payment processing error:", error);
      alert("Payment processing failed. Please contact support.");
      setOrderInitiated(false);
    } finally {
      setOrderProcessing(false);
    }
  };

  const handleRazorpayError = async (errorData) => {
    console.error("[ERROR] Razorpay error:", errorData);
    setOrderProcessing(false);
    try {
      const code        = errorData?.code        || errorData?.error?.code        || "PAYMENT_FAILED";
      const description = errorData?.description || errorData?.error?.description || errorData?.reason || "Unknown error";
      const result = await dispatch(handlePaymentFailure({ razorpayOrderId, error_code: code, error_description: description }));
      if (result.type === "checkout/handlePaymentFailure/rejected") throw new Error(result.payload || "Failed to update payment failure status");
      alert(`Payment failed: ${description}. Please try again.`);
      dispatch(clearCheckout());
      setOrderInitiated(false);
    } catch (error) {
      console.error("[ERROR] Failed to handle payment failure:", error);
      alert("Payment failed and status update failed. Please contact support.");
      setOrderInitiated(false);
    }
  };

  const loading = cartLoading || checkoutLoading;
  const error   = cartError  || checkoutError;

  useEffect(() => {
    const onAddressUpdated = (e) => {
      const next = Array.isArray(e.detail) ? e.detail : e.detail?.addresses;
      if (!Array.isArray(next)) return;
      setFullUser((prev) => ({ ...(prev || {}), addresses: next }));
      setIsModalOpen(false);
      if (next.length > 0) {
        const idx = next.length - 1;
        handleAddressSelect(next[idx], idx);
      }
    };
    window.addEventListener("address:list-updated", onAddressUpdated);
    return () => window.removeEventListener("address:list-updated", onAddressUpdated);
  }, []);

  useEffect(() => {
    const list = fullUser?.addresses || [];
    if (!Array.isArray(list) || list.length === 0) return;
    if (selectedAddressIndex !== null) return;
    const defaultIndex = list.findIndex((a) => a?.isDefault);
    const index = defaultIndex >= 0 ? defaultIndex : 0;
    handleAddressSelect(list[index], index);
  }, [fullUser?.addresses]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading your cart…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6 max-w-sm w-full text-center">
        <p className="text-red-600 font-semibold mb-4">Something went wrong: {error}</p>
        <button onClick={() => navigate("/")} className="px-5 py-2.5 bg-sky-600 text-white text-sm font-semibold rounded-xl hover:bg-sky-700 transition">
          Go Home
        </button>
      </div>
    </div>
  );

  if (!orderProcessing && (!cart || !cart.products || cart.products.length === 0)) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
      <div className="text-5xl mb-4">
        <img src="https://cdni.iconscout.com/illustration/premium/thumb/empty-cart-illustration-svg-download-png-1800917.png" alt="empty cart" />
      </div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
      <p className="text-gray-500 text-sm mb-6">Add some products before checking out.</p>
      <button onClick={() => navigate("/collections/all")}
        className="px-6 py-3 bg-gradient-to-r from-sky-600 to-blue-600 text-white font-semibold rounded-xl hover:opacity-90 transition shadow-sm">
        Continue Shopping
      </button>
    </div>
  );

  if (!user && guestMode) return <GuestCheckout />;

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Ready to checkout?</h2>
          <p className="text-gray-500 text-sm">Sign in for a faster experience, or continue as a guest.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
          <button
            onClick={() => navigate("/login?redirect=%2Fcheckout")}
            className="flex-1 px-6 py-3 bg-sky-600 text-white font-semibold rounded-xl hover:bg-sky-700 transition shadow-sm"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const labelCls = "block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5";

  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + (paymentMethod === "cash_on_delivery" ? 5 : 4));
  const deliveryStr = deliveryDate.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

  const isContinueDisabled = loading || orderProcessing || !!phoneError || submitDisabled || orderInitiated;

  return (
    <>
      {/* ══════════════════════════════════════════════
          MOBILE / TABLET  (< lg)
      ══════════════════════════════════════════════ */}
      <div className="lg:hidden min-h-screen pb-28">
        
        {/* ── Sticky header ── */}
        <div className="sticky top-0 z-30 bg-white shadow-sm">
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
            <button onClick={() => navigate(-1)} className="text-gray-700 p-1 -ml-1">
              <FaArrowLeft size={15} />
            </button>
            <h1 className="text-base font-semibold text-gray-800">Order Summary</h1>
          </div>
          <div className="pt-4 pb-1">
            <CheckoutProgress currentStep={currentStep} />
          </div>
        </div>
        <div className="p-5">
        {/* ── Deliver to ── */}
        <div className="mt-2 bg-white px-4 pt-4 pb-4 shadow-sm rounded-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500 font-medium mb-1.5">Deliver to:</p>
              {shippingAddress.address ? (
                <>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-[15px] font-bold text-gray-900">
                      {`${shippingAddress.firstName} ${shippingAddress.lastName}`.trim() || fullUser?.name || "—"}
                    </p>
                    <span className="text-[10px] font-bold bg-gray-200 text-gray-500 px-2 py-0.5 rounded-sm uppercase tracking-wide shrink-0">
                      Home
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 leading-snug">
                    {shippingAddress.address}, {shippingAddress.city} {shippingAddress.postalCode}
                  </p>
                  <p className="text-sm text-gray-600 mt-0.5">{shippingAddress.phone}</p>
                </>
              ) : (
                <p className="text-sm text-amber-600 font-medium">No address selected. Please add one.</p>
              )}
            </div>
            <button
              onClick={() => {
                if (fullUser?.addresses?.length > 0) {
                  setAddressesOpen((v) => !v);
                } else {
                  setIsModalOpen(true);
                }
              }}
              className="shrink-0 border border-sky-500 text-sky-600 text-sm font-semibold px-4 py-1.5 rounded"
            >
              Change
            </button>
          </div>

          {/* Address selector */}
          {addressesOpen && fullUser?.addresses?.length > 0 && (
            <div className="mt-3 border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                Select Address
              </div>
              {fullUser.addresses.map((addr, index) => (
                <div key={index}
                  onClick={() => { handleAddressSelect(addr, index); setAddressesOpen(false); }}
                  className={`px-3 py-3 border-t border-gray-100 cursor-pointer flex items-start justify-between gap-2 ${
                    selectedAddressIndex === index ? "bg-sky-50" : "hover:bg-gray-50"
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {[addr.firstName, addr.lastName].filter(Boolean).join(" ") || fullUser?.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{addr.address}, {addr.city} {addr.postalCode}</p>
                    <p className="text-xs text-gray-500">{addr.phone}</p>
                  </div>
                  {selectedAddressIndex === index && (
                    <div className="w-5 h-5 rounded-full bg-sky-500 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-white" />
                    </div>
                  )}
                </div>
              ))}
              <button
                onClick={() => { setAddressesOpen(false); setIsModalOpen(true); }}
                className="w-full px-3 py-3 border-t border-gray-200 text-sm font-semibold text-sky-600 flex items-center gap-2 hover:bg-sky-50"
              >
                <FaPlus className="text-xs" /> Add New Address
              </button>
            </div>
          )}

          {!fullUser?.addresses?.length && !shippingAddress.address && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-3 flex items-center gap-2 text-sm font-semibold text-sky-600 hover:text-sky-800 border border-sky-200 hover:border-sky-400 bg-sky-50 hover:bg-sky-100 px-4 py-2 rounded-xl transition"
            >
              <FaPlus className="text-xs" /> Add Address
            </button>
          )}
        </div>

        {/* ── Products ── */}
        <div className="mt-2 bg-white divide-y divide-gray-100 shadow-sm rounded-xl">
          {cart?.products?.map((product, index) => {
            const meta = productMetaByItem[itemKey(product)] || {};
            const slug = meta.slug || String(product.name || "").toLowerCase().replace(/\s+/g, "-");
            const hasRating = meta.rating > 0 || meta.numReviews > 0;
            return (
            <div key={index} className="px-4 py-4">
              <div
                className="flex gap-3 cursor-pointer active:opacity-70 transition-opacity"
                onClick={() => navigate(`/product/${slug}`)}
              >
                <div className="shrink-0 w-20 h-24 bg-gray-50 rounded-md overflow-hidden border border-gray-100">
                  <img src={product.image} alt={product.name} className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 leading-snug line-clamp-2 hover:text-sky-700 transition-colors">
                    {product.name}
                  </p>
                  {(product.color || product.size) && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {product.color && <span>Colour: {formatColor(product.color)}</span>}
                      {product.color && product.size && <span> · </span>}
                      {product.size && <span>Size {product.size}</span>}
                    </p>
                  )}

                  {/* Rating row */}
                  {hasRating && (
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const r = meta.rating || 0;
                          const filled  = star <= Math.floor(r);
                          const half    = !filled && star - 0.5 <= r;
                          return (
                            <svg key={star} viewBox="0 0 20 20"
                              className={`w-3 h-3 ${filled || half ? "text-yellow-400" : "text-gray-300"}`}
                              fill="currentColor"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          );
                        })}
                      </div>
                      {meta.rating > 0 && (
                        <span className="text-[11px] font-semibold text-gray-600">{Number(meta.rating).toFixed(1)}</span>
                      )}
                      {meta.numReviews > 0 && (
                        <span className="text-[11px] text-gray-400">({meta.numReviews})</span>
                      )}
                      <span className="text-[10px] font-bold text-sky-600 flex items-center gap-0.5 ml-1">
                        <FaShieldAlt className="text-[9px]" /> Assured
                      </span>
                    </div>
                  )}

                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-base font-bold text-gray-900">
                      ₹{product.price.toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs text-gray-400">× {product.quantity}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Delivery by {deliveryStr}</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 mt-3">
                {(() => {
                  const key = itemKey(product);
                  const maxStock = Number(stockByItem[key] ?? 0);
                  const presetLimit = Math.min(5, Math.max(1, maxStock || 1));
                  const quantity = Number(product.quantity || 1);
                  const isMore = qtyModeByItem[key] === "more" || quantity > 5;
                  const selectValue = isMore ? "more" : String(Math.min(quantity, presetLimit));
                  return (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-700 bg-white">
                        <span className="text-xs mr-2">Qty</span>
                        <select
                          value={selectValue}
                          onChange={(e) => handleQtySelect(product, e.target.value)}
                          className="text-sm bg-transparent outline-none"
                        >
                          {Array.from({ length: presetLimit }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={String(n)}>{n}</option>
                          ))}
                          <option value="more">More</option>
                        </select>
                      </div>
                      {isMore && (
                        <>
                          <input
                            type="number"
                            min={1}
                            max={maxStock > 0 ? maxStock : undefined}
                            value={customQtyByItem[key] ?? ""}
                            onChange={(e) =>
                              setCustomQtyByItem((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            className="w-20 border border-gray-300 rounded px-2 py-1.5 text-sm"
                            placeholder="Qty"
                          />
                          <button
                            type="button"
                            onClick={() => applyCustomQty(product)}
                            className="px-2.5 py-1.5 rounded border border-sky-200 text-sky-700 text-xs font-semibold"
                          >
                            Set
                          </button>
                        </>
                      )}
                      {maxStock > 0 && (
                        <span className="text-[10px] text-gray-400">Stock: {maxStock}</span>
                      )}
                    </div>
                  );
                })()}
                <button
                  type="button"
                  onClick={() => handleRemoveItem(product)}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-red-200 bg-red-50 text-red-600 active:scale-95 transition lg:hidden"
                  title="Remove from cart"
                >
                  <HiTrash className="text-sm" />
                </button>
              </div>
            </div>
          );
          })}
        </div>

        {/* ── Coupons ── */}
        <div className="mt-2 bg-white px-4 py-4 shadow-sm rounded-xl">
          <h4 className="text-sm font-bold text-gray-700 mb-3">Coupons &amp; Offers</h4>
          <div className="flex gap-2">
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Enter coupon code"
              className="flex-1 px-3 py-2.5 text-sm border border-gray-200 bg-gray-50 rounded-lg focus:bg-white focus:outline-none focus:border-sky-400 transition"
            />
            <button
              type="button"
              onClick={() => {
                const c = couponCode.trim().toUpperCase();
                if (!c || couponCodes.includes(c)) return;
                setCouponCodes((prev) => [...prev, c].slice(0, 5));
                setCouponCode("");
              }}
              className="px-4 rounded-lg text-sm font-bold border-2 border-sky-600 text-sky-700 hover:bg-sky-600 hover:text-white transition"
            >
              Apply
            </button>
          </div>
          {couponCodes.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {couponCodes.map((c) => (
                <button key={c} type="button"
                  onClick={() => setCouponCodes((prev) => prev.filter((x) => x !== c))}
                  className="text-xs font-bold px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 hover:bg-sky-100"
                  title="Remove"
                >
                  {c} ×
                </button>
              ))}
            </div>
          )}
          {Array.isArray(quote?.appliedOffers) && quote.appliedOffers.length > 0 && (
            <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <div className="font-bold uppercase tracking-wide mb-1">Applied offers</div>
              <div className="flex flex-wrap gap-2">
                {quote.appliedOffers.map((o) => (
                  <span key={o.offerId} className="px-2 py-0.5 rounded-full bg-white/70 border border-emerald-200">{o.title}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Payment method ── */}
        <div className="mt-2 bg-white px-4 py-4 shadow-sm rounded-xl">
          <h4 className="text-sm font-bold text-gray-700 mb-3">Payment Method</h4>
          <div className="space-y-2">
            {[
              { value: "razorpay",        icon: <FaCreditCard />, label: "Online Payment",   sub: "UPI · Cards · Net Banking · Wallets" },
              { value: "cash_on_delivery", icon: <FaMoneyBill />, label: "Cash on Delivery", sub: "Pay when you receive your order" },
            ].map((opt) => (
              <label key={opt.value}
                className={`flex items-center gap-3 p-3.5 border rounded-xl cursor-pointer transition-all ${
                  paymentMethod === opt.value
                    ? "border-sky-500 bg-sky-50 ring-1 ring-sky-200"
                    : "border-gray-200 hover:border-sky-300"
                }`}
              >
                <input type="radio" name="paymentMethodMobile" value={opt.value}
                  checked={paymentMethod === opt.value}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="sr-only" />
                <span className="text-lg shrink-0">{opt.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{opt.sub}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  paymentMethod === opt.value ? "border-sky-500 bg-sky-500" : "border-gray-300"
                }`}>
                  {paymentMethod === opt.value && <span className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* ── Price breakdown ── */}
        <div className="mt-2 bg-white px-4 py-4 shadow-sm rounded-xl">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-gray-700">
              <span className="border-b border-dashed border-gray-400 pb-px cursor-default">MRP</span>
              <span>₹{displaySubtotal.toLocaleString("en-IN")}</span>
            </div>
            <div>
              <button
                type="button"
                onClick={() => setShowPriceDetails((v) => !v)}
                className="w-full flex items-center justify-between text-sm text-gray-700"
              >
                <span className="flex items-center gap-1">
                  Fees{" "}
                  <FaChevronDown
                    className={`text-[10px] text-gray-400 transition-transform ${showPriceDetails ? "rotate-180" : ""}`}
                  />
                </span>
                <span>₹{feesTotal.toLocaleString("en-IN")}</span>
              </button>
              {showPriceDetails && (
                <div className="mt-2 pl-3 space-y-1.5 border-l-2 border-gray-100">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Shipping</span>
                    <span>{netShipping === 0 ? "Free" : `₹${netShipping.toLocaleString("en-IN")}`}</span>
                  </div>
                  {zoneCharge > 0 && (
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{zoneName ? `${zoneName} delivery surcharge` : "Delivery surcharge"}</span>
                      <span>₹{zoneCharge.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  {paymentMethod === "cash_on_delivery" && (
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>COD charges</span>
                      <span>₹0</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>GST <span className="text-[10px] text-gray-400">(already included above)</span></span>
              <span>₹{gstSummary.gstAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
            </div>
            {discountsTotal > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-gray-700">
                  Discounts <FaChevronDown className="text-[10px] text-gray-400" />
                </span>
                <span className="text-emerald-600 font-semibold">
                  −₹{discountsTotal.toLocaleString("en-IN")}
                </span>
              </div>
            )}
            {quote?.wallet?.applied > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">Wallet</span>
                <span className="text-emerald-600 font-semibold">
                  −₹{Number(quote.wallet.applied).toLocaleString("en-IN")}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
              <span className="text-[15px] font-bold text-gray-900">Total Amount</span>
              <span className="text-[15px] font-bold text-gray-900">
                ₹{displayTotal.toLocaleString("en-IN")}
              </span>
            </div>
            {savingsTotal > 0 && (
              <div className="bg-emerald-50 border border-emerald-100 rounded text-sm text-gray-700 text-center py-2.5 font-medium">
                You will save ₹{savingsTotal.toLocaleString("en-IN")} on this order
              </div>
            )}
          </div>
        </div>

        {/* ── Order note ── */}
        <div className="mt-2 bg-white px-4 py-4 shadow-sm rounded-xl">
          <h4 className="text-sm font-bold text-gray-700 mb-2">
            Order Note <span className="text-gray-400 font-normal text-xs">(optional)</span>
          </h4>
          <textarea
            rows={2}
            placeholder="E.g. Please leave at the door, gift wrap requested…"
            value={orderNote}
            onChange={(e) => setOrderNote(e.target.value)}
            maxLength={300}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 bg-gray-50 focus:bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400 resize-none transition"
          />
          <p className="text-[10px] text-gray-400 mt-1 text-right">{orderNote.length}/300</p>
        </div>

        {/* ── Safety info ── */}
        {/* <div className="mt-2 bg-white px-4 py-4 mb-2">
          <div className="flex items-center gap-3 text-gray-500">
            <FaShieldAlt className="text-gray-400 text-2xl shrink-0" />
            <span className="text-xs leading-relaxed">
              Safe and secure payments. Easy returns. 100% Authentic products
            </span>
          </div>
        </div> */}

        {/* Razorpay widget (mobile) */}
        {razorpayOrderId && (
          <div className="mt-2 bg-white px-4 py-4 shadow-sm rounded-xl">
            <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wide">Complete Payment</h3>
            <RazorpayButton
              amount={amount} currency={currency}
              name={`${shippingAddress.firstName} ${shippingAddress.lastName}`}
              email={user?.email} contact={shippingAddress.phone}
              orderId={razorpayOrderId || orderId} keyId={razorpayKeyId}
              onSuccess={handleRazorpaySuccess} onError={handleRazorpayError}
            />
          </div>
        )}

        {/* Status banners */}
        {orderProcessing && (
          <div className="mx-4 mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs text-amber-700 font-semibold flex items-center gap-1.5">
              <span className="w-3 h-3 border-2 border-amber-400 border-t-amber-600 rounded-full animate-spin shrink-0" />
              Processing your order… please wait.
            </p>
          </div>
        )}
        {error && (
          <div className="mx-4 mb-3 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-xs text-red-700 font-semibold">⚠ {error}</p>
          </div>
        )}

        {/* ── Fixed bottom bar ── */}
        {!razorpayOrderId && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between z-40 shadow-lg rounded-xl">
            <div>
              {displaySubtotal > displayTotal && (
                <p className="text-xs text-gray-400 line-through leading-none mb-0.5">
                  ₹{displaySubtotal.toLocaleString("en-IN")}
                </p>
              )}
              <p className="text-xl font-bold text-gray-900 leading-none">
                ₹{displayTotal.toLocaleString("en-IN")}
              </p>
              <button
                onClick={() => setShowPriceDetails((v) => !v)}
                className="text-xs text-sky-600 font-medium mt-0.5"
              >
                {showPriceDetails ? "Hide price details" : "View price details"}
              </button>
            </div>
            <button
              onClick={() => handleCreateOrder(null)}
              disabled={isContinueDisabled}
              className={`px-8 py-3.5 rounded font-bold text-base transition-all ${
                isContinueDisabled
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:opacity-90 shadow-md shadow-sky-200"
              }`}
            >
              {loading || orderProcessing ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Wait…
                </span>
              ) : "Continue"}
            </button>
          </div>
        )}
      
      </div>
      </div>

      {/* ══════════════════════════════════════════════
          DESKTOP  (≥ lg)
      ══════════════════════════════════════════════ */}
      <div className="hidden lg:block min-h-screen py-8 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">

          <CheckoutProgress currentStep={currentStep} />

          <div className="flex flex-row gap-6 items-start">

            {/* ════ LEFT — Checkout Form ════ */}
            <div className="flex-1 min-w-0 space-y-4">

              {/* Contact */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Contact</h3>
                </div>
                <div className="p-5">
                  <label className={labelCls}>Email</label>
                  <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
                    <span className="text-sm text-gray-500 truncate">{user?.email || "—"}</span>
                    <span className="ml-auto text-[10px] font-bold bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full">
                      <Verified className="inline" size={15} /> Verified
                    </span>
                  </div>
                </div>
              </div>

              {/* Delivery */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Delivery Address</h3>
                </div>
                <div className="p-5 space-y-4">
                  <form onSubmit={handleCreateOrder} id="checkout-form">
                    <p className="text-sm text-gray-500 mb-4">Select a saved address or add a new one.</p>

                    {fullUser?.addresses?.length > 0 && (
                      <div className="mb-4 border border-gray-100 rounded-xl overflow-hidden">
                        <button type="button"
                          onClick={() => setAddressesOpen((v) => !v)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-sky-50 hover:bg-sky-100 transition"
                          aria-expanded={addressesOpen}
                        >
                          <span className="text-sm font-semibold text-sky-700 flex items-center gap-2">
                            <FaMapMarkerAlt className="text-sky-500" />
                            Use a saved address
                            <span className="text-xs font-medium text-sky-400 bg-sky-100 px-2 py-0.5 rounded-full">
                              {fullUser.addresses.length}
                            </span>
                          </span>
                          {addressesOpen ? <FaChevronDown className="text-sky-500 text-xs" /> : <FaChevronRight className="text-sky-500 text-xs" />}
                        </button>
                        {addressesOpen && (
                          <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                            {fullUser.addresses.map((addr, index) => (
                              <div key={index}
                                onClick={() => handleAddressSelect(addr, index)}
                                className={`border rounded-xl p-3.5 cursor-pointer transition-all ${
                                  selectedAddressIndex === index
                                    ? "border-sky-500 bg-sky-50 ring-2 ring-sky-200"
                                    : "border-gray-200 hover:border-sky-300 hover:bg-gray-50"
                                }`}
                              >
                                <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                                  {selectedAddressIndex === index && <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />}
                                  {[addr.firstName, addr.lastName].filter(Boolean).join(" ") || fullUser?.name || "—"}
                                </p>
                                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                  {addr.address}<br />
                                  {addr.city}, {addr.postalCode}, {addr.country}<br />
                                  📞 {addr.phone}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <button type="button"
                      onClick={() => {
                        if (!user) { navigate("/login?redirect=%2Fcheckout"); return; }
                        setIsModalOpen(true);
                      }}
                      className="flex items-center gap-2 text-sm font-semibold text-sky-600 hover:text-sky-800 border border-sky-200 hover:border-sky-400 bg-sky-50 hover:bg-sky-100 px-4 py-2 rounded-xl transition"
                    >
                      <FaPlus className="text-xs" /> Add New Address
                    </button>

                    {selectedAddressIndex === null && (
                      <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        No address selected yet.
                      </p>
                    )}
                  </form>
                </div>
              </div>

              {/* Order Note */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                    Order Note <span className="text-gray-400 font-normal normal-case text-xs">(optional)</span>
                  </h3>
                </div>
                <div className="p-5">
                  <textarea
                    rows={2}
                    placeholder="E.g. Please leave at the door, gift wrap requested, call before delivery…"
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    maxLength={300}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 bg-gray-50 focus:bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400 resize-none transition"
                  />
                  <p className="text-[10px] text-gray-400 mt-1 text-right">{orderNote.length}/300</p>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Payment Method</h3>
                </div>
                <div className="p-5 space-y-3">
                  {[
                    { value: "razorpay",        icon: "💳", label: "Online Payment",   sub: "UPI · Cards · Net Banking · Wallets" },
                    { value: "cash_on_delivery", icon: "💵", label: "Cash on Delivery", sub: "Pay when you receive your order" },
                  ].map((opt) => (
                    <label key={opt.value}
                      className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all ${
                        paymentMethod === opt.value
                          ? "border-sky-500 bg-sky-50 ring-2 ring-sky-200"
                          : "border-gray-200 hover:border-sky-300 hover:bg-gray-50"
                      }`}
                    >
                      <input type="radio" name="paymentMethod" value={opt.value}
                        checked={paymentMethod === opt.value}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="sr-only" />
                      <span className="text-xl shrink-0">{opt.icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{opt.sub}</p>
                      </div>
                      <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        paymentMethod === opt.value ? "border-sky-500 bg-sky-500" : "border-gray-300"
                      }`}>
                        {paymentMethod === opt.value && <span className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Submit / Razorpay */}
              <div>
                {!razorpayOrderId ? (
                  <button type="submit" form="checkout-form"
                    className={`w-full py-4 rounded-2xl font-bold text-base tracking-wide transition-all shadow-md flex items-center justify-center gap-2.5 ${
                      isContinueDisabled
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                        : "bg-gradient-to-r from-sky-600 to-blue-700 text-white hover:opacity-90 shadow-sky-200"
                    }`}
                    disabled={isContinueDisabled}
                  >
                    {loading || orderProcessing ? (
                      <><span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Processing…</>
                    ) : paymentMethod === "razorpay" ? (
                      <><FaLock className="text-sm" /> Pay ₹{displayTotal.toLocaleString("en-IN")} online</>
                    ) : (
                      <>📦 Place Order — Cash on Delivery</>
                    )}
                  </button>
                ) : (
                  <div className="bg-white rounded-2xl border border-sky-200 shadow-sm p-5">
                    <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wide">Complete Payment</h3>
                    <RazorpayButton
                      amount={amount} currency={currency}
                      name={`${shippingAddress.firstName} ${shippingAddress.lastName}`}
                      email={user?.email} contact={shippingAddress.phone}
                      orderId={razorpayOrderId || orderId} keyId={razorpayKeyId}
                      onSuccess={handleRazorpaySuccess} onError={handleRazorpayError}
                    />
                  </div>
                )}
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap items-center justify-center gap-5 py-3">
                {[
                  { icon: <FaLock className="text-sky-500" />,    text: "Secure payment" },
                  { icon: <FaTruck className="text-emerald-500" />, text: "Free delivery" },
                  { icon: <FaUndo className="text-amber-500" />,  text: "7-day returns" },
                ].map(({ icon, text }) => (
                  <span key={text} className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                    {icon} {text}
                  </span>
                ))}
              </div>
            </div>

            {/* ════ RIGHT — Order Summary ════ */}
            <div className="w-96 shrink-0 space-y-4 sticky top-4 bg-transparent md:bg-gray-100 rounded-2xl border border-gray-100 shadow-sm p-0">
              <div className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-sky-50 to-blue-50">
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                    Order Summary
                    <span className="ml-2 text-xs font-medium text-gray-400 normal-case tracking-normal">
                      {computedQuantity} item{computedQuantity !== 1 ? "s" : ""}
                    </span>
                  </h3>
                </div>

                {/* Product list */}
                <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                  {cart?.products?.map((product, index) => (
                    <div key={index} className="flex items-start gap-3 px-5 py-4">
                      <div className="relative shrink-0 w-16 h-20 rounded-lg overflow-hidden bg-gray-50 border border-gray-100">
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-sky-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center z-50">
                          {product.quantity}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 line-clamp-2">{product.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {product.color && <span>Colour: {formatColor(product.color)}</span>}
                          {product.color && product.size && <span> · </span>}
                          {product.size && <span>Size: {product.size}</span>}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          {(() => {
                            const key = itemKey(product);
                            const maxStock = Number(stockByItem[key] ?? 0);
                            const presetLimit = Math.min(5, Math.max(1, maxStock || 1));
                            const quantity = Number(product.quantity || 1);
                            const isMore = qtyModeByItem[key] === "more" || quantity > 5;
                            const selectValue = isMore ? "more" : String(Math.min(quantity, presetLimit));
                            return (
                              <>
                                <select
                                  value={selectValue}
                                  onChange={(e) => handleQtySelect(product, e.target.value)}
                                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
                                >
                                  {Array.from({ length: presetLimit }, (_, i) => i + 1).map((n) => (
                                    <option key={n} value={String(n)}>{n}</option>
                                  ))}
                                  <option value="more">More</option>
                                </select>
                                {isMore && (
                                  <>
                                    <input
                                      type="number"
                                      min={1}
                                      max={maxStock > 0 ? maxStock : undefined}
                                      value={customQtyByItem[key] ?? ""}
                                      onChange={(e) =>
                                        setCustomQtyByItem((prev) => ({ ...prev, [key]: e.target.value }))
                                      }
                                      className="w-16 text-xs border border-gray-200 rounded-lg px-2 py-1.5"
                                      placeholder="Qty"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => applyCustomQty(product)}
                                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-sky-200 text-sky-700 hover:bg-sky-50"
                                    >
                                      Set
                                    </button>
                                  </>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      <p className="text-sm font-bold text-gray-900 shrink-0">
                        ₹{(resolveDisplayPrice(product, productMetaByItem[itemKey(product)] || {}) * product.quantity).toLocaleString("en-IN")}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(product)}
                        className="ml-2 mt-1 inline-flex items-center justify-center rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-semibold text-gray-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition"
                        title="Remove item"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                {/* Promos + Wallet */}
                <div className="px-5 py-4 border-t border-gray-100 space-y-3">
                  <div className="flex gap-2">
                    <input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Coupon code"
                      className="flex-1 px-3 py-2.5 text-sm border border-gray-200 bg-gray-50 rounded-xl focus:bg-white focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const c = couponCode.trim().toUpperCase();
                        if (!c || couponCodes.includes(c)) return;
                        setCouponCodes((prev) => [...prev, c].slice(0, 5));
                        setCouponCode("");
                      }}
                      className="px-4 rounded-xl text-sm font-bold border-2 border-sky-600 text-sky-700 hover:bg-sky-600 hover:text-white transition"
                    >
                      Apply
                    </button>
                  </div>

                  {couponCodes.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {couponCodes.map((c) => (
                        <button key={c} type="button"
                          onClick={() => setCouponCodes((prev) => prev.filter((x) => x !== c))}
                          className="text-xs font-bold px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 hover:bg-sky-100"
                          title="Remove"
                        >
                          {c} ×
                        </button>
                      ))}
                    </div>
                  )}

                  {quote?.wallet?.balance !== undefined && (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                        <span className="font-bold uppercase tracking-wide">Wallet</span>
                        <span>Balance: ₹{Number(quote.wallet.balance || 0).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="number" min={0} step={1}
                          value={walletRedeem}
                          onChange={(e) => setWalletRedeem(Number(e.target.value || 0))}
                          className="w-32 px-3 py-2 text-sm border border-gray-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-100"
                        />
                        <div className="text-xs text-gray-500">
                          Applied: <span className="font-semibold text-gray-800">₹{Number(quote.wallet.applied || 0).toLocaleString("en-IN")}</span>
                        </div>
                        {quoteLoading && <div className="ml-auto text-xs text-gray-400">Recalculating…</div>}
                      </div>
                    </div>
                  )}

                  {Array.isArray(quote?.appliedOffers) && quote.appliedOffers.length > 0 && (
                    <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                      <div className="font-bold uppercase tracking-wide mb-1">Applied offers</div>
                      <div className="flex flex-wrap gap-2">
                        {quote.appliedOffers.map((o) => (
                          <span key={o.offerId} className="px-2 py-0.5 rounded-full bg-white/70 border border-emerald-200">{o.title}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Price breakdown */}
                <div className="px-5 py-4 border-t border-gray-100 space-y-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="text-gray-600">₹{displaySubtotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      Shipping
                      {isFirstOrder && netShipping === 0 && (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full font-bold">
                          🎉 First order
                        </span>
                      )}
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
                  {zoneCharge > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        {zoneName} delivery surcharge
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{zoneName}</span>
                      </span>
                      <span className="text-gray-600">₹{zoneCharge.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  {paymentMethod === "cash_on_delivery" && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">COD Charges</span>
                      <span className="text-gray-500">₹0</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      GST <span className="text-[10px] text-gray-400">(already included above)</span>
                    </span>
                    <span className="text-gray-600">₹{gstSummary.gstAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-base font-bold text-gray-900">Total</span>
                    <span className="text-lg font-extrabold text-sky-700">
                      ₹{displayTotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                  {netShipping > 0 && (
                    <p className="text-[11px] text-center text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                      Add ₹{(999 - displaySubtotal).toLocaleString("en-IN")} more to get <strong>FREE shipping</strong>
                    </p>
                  )}
                </div>

                {/* Deliver-to */}
                {(shippingAddress.firstName || shippingAddress.address) && (
                  <div className="px-5 pb-4">
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3.5">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Delivering to</p>
                      <p className="text-sm font-semibold text-gray-800">
                        {`${shippingAddress.firstName} ${shippingAddress.lastName}`.trim() || "—"}
                      </p>
                      {shippingAddress.address && (
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                          {shippingAddress.address}, {shippingAddress.city} {shippingAddress.postalCode}, {shippingAddress.country}
                        </p>
                      )}
                      {shippingAddress.phone && (
                        <p className="text-xs text-gray-500 mt-0.5">📞 {shippingAddress.phone}</p>
                      )}
                      <div className="mt-2.5 pt-2.5 border-t border-gray-200">
                        <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                          🚚 Est. Delivery:{" "}
                          {(() => {
                            const d = new Date();
                            d.setDate(d.getDate() + (paymentMethod === "cash_on_delivery" ? 5 : 4));
                            const d2 = new Date(d);
                            d2.setDate(d2.getDate() + 2);
                            const fmt = (dt) => dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
                            return `${fmt(d)} – ${fmt(d2)}`;
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Status banners */}
                {orderProcessing && (
                  <div className="mx-5 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-xs text-amber-700 font-semibold flex items-center gap-1.5">
                      <span className="w-3 h-3 border-2 border-amber-400 border-t-amber-600 rounded-full animate-spin shrink-0" />
                      Processing your order… please wait.
                    </p>
                  </div>
                )}
                {error && (
                  <div className="mx-5 mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-xs text-red-700 font-semibold">⚠ {error}</p>
                  </div>
                )}
              </div>

              {/* Similar Products */}
              {similarProducts.length > 0 && !featuredCollab?.isPublished && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">You may also like</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {similarProducts.slice(0, displayCount).map((product) => (
                      <div key={product._id}
                        onClick={() => navigate(`/product/${product.name.toLowerCase().replace(/\s+/g, "-")}`)}
                        className="cursor-pointer group"
                      >
                        <div className="aspect-3/4 rounded-lg overflow-hidden bg-gray-50 mb-2">
                          <img src={product.images?.[0]?.url || "/no-image.png"} alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        </div>
                        <p className="text-xs font-medium text-gray-800 truncate">{product.name}</p>
                        <p className="text-xs font-bold text-sky-600 mt-0.5">
                          ₹{Math.floor(product.discountPrice || product.price).toLocaleString("en-IN")}
                        </p>
                      </div>
                    ))}
                  </div>
                  {similarProducts.length > displayCount && (
                    <button onClick={() => setDisplayCount((p) => p + 4)}
                      className="w-full mt-3 py-2 text-xs font-semibold text-sky-600 border border-sky-200 rounded-xl hover:bg-sky-50 transition">
                      Load More
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Shared: Address Modal ── */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <AddressForm />
      </Modal>
    </>
  );
};

export default Checkout;
