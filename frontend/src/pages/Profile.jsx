import React, { useEffect, useState } from "react";
import MyOrders from "./MyOrdersPage";
import {
  FaUserCircle, FaTrash, FaHeart, FaMapMarkerAlt,
  FaBoxOpen, FaCheckCircle, FaWallet, FaPlus, FaGift,
  FaArrowLeft, FaChevronRight, FaPhone, FaInfoCircle,
  FaShieldAlt, FaFileAlt, FaEnvelope,
  FaHome, FaBriefcase, FaCog, FaHistory,
} from "react-icons/fa";
import { HiX } from "react-icons/hi";
import { AiOutlineLogout } from "react-icons/ai";
import { HiOutlineExclamationCircle } from "react-icons/hi2";
import { MdVerified } from "react-icons/md";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { logout } from "../redux/slices/authSlice";
import { clearCart } from "../redux/slices/cartSlice";
import axios from "axios";
import AddressForm from "../components/Cart/AddressForm";
import { PenIcon } from "lucide-react";
import Wishlist from "./Wishlist";
import { cachedGet } from "../utils/httpCache";

const NAV_ITEMS = [
  { key: "orders",    label: "My Orders",    icon: FaBoxOpen },
  { key: "wishlist",  label: "Wishlist",     icon: FaHeart },
  { key: "wallet",    label: "Wallet",       icon: FaWallet },
  { key: "coupons",   label: "Coupons",      icon: FaGift },
  { key: "address",   label: "Addresses",    icon: FaMapMarkerAlt },
  { key: "profile",   label: "Profile Info", icon: FaUserCircle },
  { key: "complaint", label: "Complaints",   icon: HiOutlineExclamationCircle },
];

const TAB_TITLES = {
  orders:    "My Orders",
  wallet:    "My Wallet",
  coupons:   "My Coupons",
  address:   "Addresses",
  profile:   "Profile Info",
  complaint: "Support & Complaints",
};

/* ─── Coupon helpers ─── */
const couponTheme = (status) => {
  if (status === "used")    return { bg: "from-rose-400 to-rose-600",    light: "bg-rose-50",   border: "border-rose-200",   text: "text-rose-600",   badge: "bg-rose-100 text-rose-700",   label: "Used" };
  if (status === "expired") return { bg: "from-gray-400 to-gray-500",    light: "bg-gray-50",   border: "border-gray-200",   text: "text-gray-500",   badge: "bg-gray-100 text-gray-500",   label: "Expired" };
  return                           { bg: "from-amber-400 to-orange-500", light: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-600",  badge: "bg-emerald-100 text-emerald-700", label: "Active" };
};

function CouponCard({ c }) {
  const t = couponTheme(c.status);
  const inactive = c.status === "used" || c.status === "expired";
  return (
    <div className={`relative flex rounded-xl shadow-md overflow-hidden ${inactive ? "opacity-60" : ""}`}>
      <div className={`relative bg-linear-to-b ${t.bg} text-white w-24 shrink-0 flex flex-col items-center justify-center px-2 py-5`}>
        <span className="text-3xl font-black leading-none">{c.discount || "?"}<span className="text-base font-bold">%</span></span>
        <span className="text-[10px] font-bold uppercase tracking-widest mt-0.5 opacity-90">OFF</span>
      </div>
      <span className="absolute top-0 left-24 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white z-10" />
      <span className="absolute bottom-0 left-24 -translate-x-1/2 translate-y-1/2 w-6 h-6 rounded-full bg-white z-10" />
      <div className="flex-1 bg-white px-4 py-3 flex flex-col justify-between border-l-0">
        <span className="absolute left-24 top-3 bottom-3 border-l-2 border-dashed border-gray-200 pointer-events-none" />
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Coupon Code</p>
            <p className="text-base font-black text-gray-800 tracking-widest mt-0.5 font-mono">{c.code}</p>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${t.badge}`}>{t.label}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5">
          {c.expiresAt && (
            <p className="text-[11px] text-gray-500">
              Expires: <span className="font-semibold text-gray-700">{new Date(c.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
            </p>
          )}
          <p className="text-[11px] text-gray-500">
            Save: <span className="font-semibold text-gray-700">{c.discount || 0}% on your order</span>
          </p>
        </div>
        <div className="mt-3 pt-2 border-t border-dashed border-gray-200 flex items-center gap-1">
          <FaGift className={`text-xs ${t.text}`} />
          <span className="text-[10px] text-gray-400 font-medium">Apply at checkout to redeem</span>
        </div>
      </div>
    </div>
  );
}

function MiniCouponCard({ c }) {
  const t = couponTheme(c.status);
  const inactive = c.status === "used" || c.status === "expired";
  return (
    <div className={`relative flex rounded-lg shadow-sm overflow-hidden ${inactive ? "opacity-55" : ""}`}>
      <div className={`relative bg-linear-to-b ${t.bg} text-white w-16 shrink-0 flex flex-col items-center justify-center px-1 py-3`}>
        <span className="text-xl font-black leading-none">{c.discount || "?"}<span className="text-[10px] font-bold">%</span></span>
        <span className="text-[8px] font-bold uppercase tracking-wider opacity-90">OFF</span>
      </div>
      <span className="absolute top-0 left-16 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white z-10" />
      <span className="absolute bottom-0 left-16 -translate-x-1/2 translate-y-1/2 w-4 h-4 rounded-full bg-white z-10" />
      <div className="flex-1 bg-white px-3 py-2 flex items-center justify-between">
        <span className="absolute left-16 top-2 bottom-2 border-l-2 border-dashed border-gray-200 pointer-events-none" />
        <div>
          <p className="text-xs font-black text-gray-800 tracking-widest font-mono">{c.code}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {c.discount ? `${c.discount}% OFF` : "Discount offer"}
            {c.expiresAt ? ` · Expires ${new Date(c.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}
          </p>
        </div>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${t.badge}`}>{t.label}</span>
      </div>
    </div>
  );
}

/* ─── Mobile menu row ─── */
function MenuRow({ icon: _Icon, label, onClick, iconBg = "bg-gray-100", iconColor = "text-gray-500", right }) {
  void _Icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
        <_Icon className={`text-xs ${iconColor}`} />
      </div>
      <span className="flex-1 text-[13px] text-gray-800 font-normal">{label}</span>
      {right || <FaChevronRight className="text-gray-300 text-xs shrink-0" />}
    </button>
  );
}

/* ─── Mobile section block ─── */
function MenuSection({ title, children }) {
  return (
    <div className="px-4 py-2">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        {title && (
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-4 pt-4 pb-0.5">{title}</p>
        )}
        <div className="divide-y divide-gray-100">{children}</div>
      </div>
    </div>
  );
}

export default function Profile() {
  const { user }  = useSelector((s) => s.auth);
  const navigate  = useNavigate();
  const location  = useLocation();
  const dispatch  = useDispatch();

  const [activeTab,       setActiveTab]      = useState(location.state?.tab === "wishlist" ? "orders" : location.state?.tab || "orders");
  const [mobileShowMenu,  setMobileShowMenu] = useState(!location.state?.tab);
  const [orderId,         setOrderId]        = useState("");
  const [orderVerified,   setOrderVerified]  = useState(null);
  const [submitting,      setSubmitting]     = useState(false);
  const [complaints,      setComplaints]     = useState([]);
  const [verifying,       setVerifying]      = useState(false);
  const [selectedImages,  setSelectedImages] = useState([]);
  const [walletBalance,   setWalletBalance]  = useState(null);
  const [walletLedger,    setWalletLedger]   = useState([]);
  const [walletLoading,   setWalletLoading]  = useState(false);
  const [topupModal,      setTopupModal]     = useState(false);
  const [topupAmount,     setTopupAmount]    = useState("");
  const [topupLoading,    setTopupLoading]   = useState(false);
  const [expandedTxn,     setExpandedTxn]   = useState(null);
  const [homeRecentlyViewed, setHomeRecentlyViewed] = useState([]);
  const [homeCoupon,      setHomeCoupon]     = useState(null);
  const [homeAllCoupons,  setHomeAllCoupons] = useState([]);
  const [myCoupons,       setMyCoupons]     = useState([]);
  const [couponLoading,   setCouponLoading] = useState(false);

  // Address management (mobile)
  const [profileAddresses, setProfileAddresses] = useState([]);
  const [showAddressForm,  setShowAddressForm]  = useState(false);
  const [addrLoading,      setAddrLoading]      = useState(false);
  const [expandedAddrIdx,  setExpandedAddrIdx]  = useState(null);
  const [mobileEditAddress, setMobileEditAddress] = useState(null);

  useEffect(() => { if (!user) navigate("/login"); }, [user, navigate]);

  useEffect(() => {
    const isProfileRoute = location.pathname === "/profile";
    const isMobileOrTablet = typeof window !== "undefined" ? window.innerWidth < 768 : false;
    const hide = isProfileRoute && isMobileOrTablet && !mobileShowMenu;
    window.dispatchEvent(new CustomEvent("profile-mobile-submenu", { detail: { hide } }));
    return () => {
      window.dispatchEvent(new CustomEvent("profile-mobile-submenu", { detail: { hide: false } }));
    };
  }, [mobileShowMenu, location.pathname]);

  // Fetch addresses for mobile address list
  useEffect(() => {
    if (activeTab !== "address") return;
    setShowAddressForm(false);
    setExpandedAddrIdx(null);
    setMobileEditAddress(null);
    setAddrLoading(true);
    axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/user/addresses`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("userToken")}` },
    })
      .then(({ data }) => setProfileAddresses(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setAddrLoading(false));
  }, [activeTab]);

  // Sync address list when AddressForm dispatches updates
  useEffect(() => {
    const onAddrUpdate = (e) => {
      const next = Array.isArray(e.detail) ? e.detail : e.detail?.addresses;
      if (Array.isArray(next)) {
        setProfileAddresses(next);
        setShowAddressForm(false);
      }
    };
    window.addEventListener("address:list-updated", onAddrUpdate);
    return () => window.removeEventListener("address:list-updated", onAddrUpdate);
  }, []);

  const handleDeleteAddr = async (idx) => {
    if (!window.confirm("Delete this address?")) return;
    try {
      const { data } = await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/api/user/addresses/${idx}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("userToken")}` } }
      );
      setProfileAddresses(data.addresses || []);
      toast.success("Address removed");
    } catch { toast.error("Failed to delete address"); }
  };

  useEffect(() => {
    if (activeTab !== "profile" && activeTab !== "coupons") return;
    setCouponLoading(true);
    const tokenHeaders = { headers: { Authorization: `Bearer ${localStorage.getItem("userToken")}` } };
    Promise.all([
      axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/users/my-coupons`, tokenHeaders).catch(() => ({ data: { coupons: [] } })),
    ])
      .then(([list]) => {
        setMyCoupons(Array.isArray(list?.data?.coupons) ? list.data.coupons : []);
      })
      .finally(() => setCouponLoading(false));
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "wallet") return;
    setWalletLoading(true);
    axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/wallet`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("userToken")}` },
    })
      .then(({ data }) => { setWalletBalance(data.balance ?? 0); setWalletLedger(data.ledger || []); })
      .catch(console.error)
      .finally(() => setWalletLoading(false));
  }, [activeTab]);

  const handleTopup = async () => {
    const amt = Number(topupAmount);
    if (!amt || amt < 10)    { toast.error("Minimum top-up is ₹10"); return; }
    if (amt > 100000)        { toast.error("Maximum top-up is ₹1,00,000"); return; }
    setTopupLoading(true);
    try {
      const token = localStorage.getItem("userToken");
      const { data: orderData } = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/wallet/topup/create-order`,
        { amount: amt },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://checkout.razorpay.com/v1/checkout.js";
          s.onload = resolve; s.onerror = reject;
          document.body.appendChild(s);
        });
      }
      const rzp = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amount * 100,
        currency: "INR",
        name: "Raphaaa Wallet",
        description: `Add ₹${amt.toLocaleString("en-IN")} to your wallet`,
        order_id: orderData.orderId,
        handler: async (response) => {
          try {
            const { data: verifyData } = await axios.post(
              `${import.meta.env.VITE_BACKEND_URL}/api/wallet/topup/verify`,
              {
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
                amount: amt,
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            setWalletBalance(verifyData.balance);
            setWalletLedger((prev) => [verifyData.entry, ...prev]);
            toast.success(`₹${amt.toLocaleString("en-IN")} added to your wallet!`);
            setTopupModal(false);
            setTopupAmount("");
          } catch (err) {
            toast.error(err.response?.data?.message || "Payment verified but wallet credit failed. Contact support.");
          }
        },
        prefill: { name: user?.name, email: user?.email },
        theme:   { color: "#10b981" },
        modal:   { ondismiss: () => setTopupLoading(false) },
      });
      rzp.on("payment.failed", () => { toast.error("Payment failed. Please try again."); setTopupLoading(false); });
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to initiate payment");
      setTopupLoading(false);
    }
  };

  const fetchComplaints = async () => {
    const { data } = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/complaints`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("userToken")}` },
    });
    setComplaints(data.complaints || []);
  };
  useEffect(() => { if (activeTab === "complaint") fetchComplaints(); }, [activeTab]);

  const verifyOrder = async () => {
    if (!orderId.trim()) return;
    setVerifying(true);
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/orders/verify/${orderId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("userToken")}` } }
      );
      setOrderVerified(data.exists);
    } catch { setOrderVerified(false); }
    finally   { setVerifying(false); }
  };

  const deleteComplaint = async (id) => {
    if (!window.confirm("Delete this complaint?")) return;
    await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/complaints/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("userToken")}` },
    });
    toast.success("Complaint deleted");
    fetchComplaints();
  };

  const submitComplaint = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData(e.target);
      selectedImages.forEach((f) => fd.append("images", f));
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/complaints/add`, fd, {
        headers: { Authorization: `Bearer ${localStorage.getItem("userToken")}`, "Content-Type": "multipart/form-data" },
      });
      toast.success("Complaint submitted!");
      e.target.reset();
      setSelectedImages([]);
      setOrderId("");
      setOrderVerified(null);
      fetchComplaints();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit");
    } finally { setSubmitting(false); }
  };

  const handleLogout = () => {
    dispatch(logout());
    dispatch(clearCart());
    navigate("/login");
  };

  const handleMobileNav = (tab) => {
    if (tab === "profile") {
      navigate("/update-profile");
      setMobileShowMenu(false);
      return;
    }
    if (tab === "wishlist") {
      setActiveTab("wishlist");
      setMobileShowMenu(false);
      return;
    }
    setActiveTab(tab);
    setMobileShowMenu(false);
  };

  const handleWishlistBack = () => {
    setActiveTab("profile");
    setMobileShowMenu(true);
  };

  const openRecentlyViewed = () => {
    navigate("/recently-viewed", { state: { from: "/profile" } });
  };

  const getProductUrl = (item) => {
    const slug = item?.name
      ? item.name.toLowerCase().trim().replace(/\s+/g, "-")
      : String(item?._id || "");
    const sku = item?.skuCode || item?.sku || item?._id;
    return `/product/${slug}/p/${encodeURIComponent(String(sku || ""))}`;
  };

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("userToken");
    const headers = { Authorization: `Bearer ${token}` };

    Promise.allSettled([
      cachedGet(
        `profile:recently-viewed:${user._id}`,
        () => axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/recommendations/recently-viewed?limit=6`, { headers }),
        20_000
      ),
      cachedGet(
        `profile:my-coupon:${user._id}`,
        () => axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/users/my-coupon`, { headers }),
        15_000
      ),
      cachedGet(
        `profile:my-coupons:${user._id}`,
        () => axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/users/my-coupons`, { headers }),
        15_000
      ),
    ])
      .then(([recentlyViewedResult, couponResult, couponsResult]) => {
        const recentlyViewedData = recentlyViewedResult.status === "fulfilled" ? recentlyViewedResult.value : [];
        const couponData = couponResult.status === "fulfilled" ? couponResult.value : null;
        const couponsData = couponsResult.status === "fulfilled" ? couponsResult.value : null;

        setHomeRecentlyViewed(Array.isArray(recentlyViewedData) ? recentlyViewedData.slice(0, 6) : []);
        setHomeCoupon(couponData || null);
        setHomeAllCoupons(Array.isArray(couponsData?.coupons) ? couponsData.coupons : []);
      })
      .catch(() => {});
  }, [user]);

  const initials = user?.name
    ?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "U";

  /* ═══════ TAB CONTENT (shared between mobile sub-page and desktop main) ═══════ */
  const TabContent = () => (
    <>
      {activeTab === "wishlist" && (
        <div className="p-0 md:p-0">
          <Wishlist embedded onBack={handleWishlistBack} />
        </div>
      )}
      {activeTab === "orders" && (
        <div className="p-4 md:p-6"><MyOrders /></div>
      )}

      {activeTab === "wallet" && (
        <div className="p-4 md:p-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100 mb-6">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0"><FaWallet className="text-emerald-600 text-sm" /></div>
            <div><h2 className="text-lg font-bold text-gray-800 leading-none">My Wallet</h2><p className="text-xs text-gray-400 mt-0.5">Store credits earned from orders and promotions</p></div>
          </div>
          {walletLoading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-gray-400 text-sm"><span className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />Loading wallet…</div>
          ) : (
            <>
              <div className="bg-linear-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 mb-6 shadow-md shadow-emerald-100 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-100 mb-1">Available Balance</p>
                    <p className="text-4xl font-extrabold tracking-tight">₹{(walletBalance ?? 0).toLocaleString("en-IN")}</p>
                    <p className="text-xs text-emerald-100 mt-3">Use this balance at checkout to get an instant discount.</p>
                  </div>
                  <button onClick={() => setTopupModal(true)} className="shrink-0 flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/30 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all">
                    <FaPlus className="text-xs" /> Add Money
                  </button>
                </div>
              </div>
              {topupModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setTopupModal(false)}>
                  <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                      <div className="flex items-center gap-2"><FaWallet className="text-emerald-600" /><h3 className="text-sm font-bold text-gray-800">Add Money to Wallet</h3></div>
                      <button onClick={() => setTopupModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition"><HiX /></button>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 flex items-center justify-between">
                        <span className="text-xs text-emerald-600 font-semibold">Current Balance</span>
                        <span className="text-sm font-extrabold text-emerald-700">₹{(walletBalance ?? 0).toLocaleString("en-IN")}</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Select Amount</p>
                        <div className="grid grid-cols-4 gap-2">
                          {[100, 200, 500, 1000].map((preset) => (
                            <button key={preset} type="button" onClick={() => setTopupAmount(String(preset))}
                              className={`py-2 rounded-xl text-sm font-bold border transition ${topupAmount === String(preset) ? "bg-emerald-600 border-emerald-600 text-white" : "border-gray-200 text-gray-700 hover:border-emerald-400 hover:bg-emerald-50"}`}>
                              ₹{preset}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Or Enter Custom Amount</p>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">₹</span>
                          <input type="number" min="10" max="100000" placeholder="Enter amount" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)}
                            className="w-full pl-8 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 bg-gray-50 focus:bg-white transition" />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">Min ₹10 · Max ₹1,00,000</p>
                      </div>
                      <button onClick={handleTopup} disabled={topupLoading || !topupAmount || Number(topupAmount) < 10}
                        className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition ${topupLoading || !topupAmount || Number(topupAmount) < 10 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"}`}>
                        {topupLoading ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Processing…</> : <>💳 Pay ₹{Number(topupAmount || 0).toLocaleString("en-IN")} via Razorpay</>}
                      </button>
                      <p className="text-[10px] text-center text-gray-400">Secured by Razorpay · UPI · Cards · Net Banking</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                {[
                  { icon: "🎁", title: "Earn Credits", desc: "Get credits on orders, referrals & promotions" },
                  { icon: "🛒", title: "Use at Checkout", desc: "Apply your balance when placing any order" },
                  { icon: "⏳", title: "Expiry", desc: "Some credits may expire — use them before they do!" },
                ].map(({ icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-3 bg-gray-50 border border-gray-100 rounded-xl p-3.5">
                    <span className="text-xl leading-none mt-0.5">{icon}</span>
                    <div><p className="text-xs font-bold text-gray-700">{title}</p><p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{desc}</p></div>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3">
                  Transaction History
                  {walletLedger.length > 0 && <span className="ml-2 text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{walletLedger.length}</span>}
                </h3>
                {walletLedger.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 border-2 border-dashed border-gray-100 rounded-2xl text-center">
                    <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mb-3"><FaWallet className="text-2xl text-gray-200" /></div>
                    <p className="text-sm font-semibold text-gray-500">No transactions yet</p>
                    <p className="text-xs text-gray-400 mt-1">Credits earned and spent will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {walletLedger.map((entry) => {
                      const isEarn   = entry.type === "earn" || entry.type === "adjust";
                      const isExpire = entry.type === "expire";
                      const isRedeem = entry.type === "redeem";
                      const isOpen   = expandedTxn === entry._id;
                      const typeConfig = isEarn
                        ? { label: "Credited", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100", sign: "+", badgeBg: "bg-emerald-100 text-emerald-700" }
                        : isExpire
                        ? { label: "Expired",  color: "text-gray-400",    bg: "bg-gray-50 border-gray-100",       sign: "-", badgeBg: "bg-gray-100 text-gray-500" }
                        : { label: "Redeemed", color: "text-rose-600",    bg: "bg-rose-50 border-rose-100",       sign: "-", badgeBg: "bg-rose-100 text-rose-700" };
                      const sourceLabel = {
                        topup: "Razorpay Top-up", order: "Order Cashback", checkout: "Order Checkout",
                        admin_credit: "Admin Credit", manual: "Manual Adjustment", referral: "Referral Bonus",
                        refund: "Refund", wallet_credit: "Credit Expiry",
                      }[entry.refType] || (entry.refType || "—");
                      return (
                        <div key={entry._id} className={`border rounded-xl overflow-hidden transition-all ${typeConfig.bg}`}>
                          <button type="button" onClick={() => setExpandedTxn(isOpen ? null : entry._id)}
                            className="w-full flex items-center gap-4 px-4 py-3 text-left hover:brightness-95 transition">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-base ${isEarn ? "bg-emerald-100" : isExpire ? "bg-gray-100" : "bg-rose-100"}`}>
                              {isEarn ? "💰" : isExpire ? "⏰" : "🛒"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate">{entry.note || typeConfig.label}</p>
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                {new Date(entry.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                {" · "}
                                {new Date(entry.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <p className={`text-sm font-extrabold ${typeConfig.color}`}>{typeConfig.sign}₹{Number(entry.amount).toLocaleString("en-IN")}</p>
                              <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </button>
                          {isOpen && (
                            <div className="px-4 pb-4 border-t border-gray-100/80">
                              <div className="bg-white rounded-xl border border-gray-100 mt-3 divide-y divide-gray-50 overflow-hidden">
                                {entry.refId && (
                                  <div className="flex items-start justify-between gap-3 px-4 py-3">
                                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest shrink-0 mt-0.5">Transaction ID</span>
                                    <span className="text-xs font-mono font-semibold text-gray-700 text-right break-all select-all">{entry.refId}</span>
                                  </div>
                                )}
                                <div className="flex items-start justify-between gap-3 px-4 py-3">
                                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest shrink-0 mt-0.5">Ledger ID</span>
                                  <span className="text-xs font-mono text-gray-500 text-right break-all select-all">{entry._id}</span>
                                </div>
                                <div className="flex items-center justify-between px-4 py-3">
                                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Type</span>
                                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full capitalize ${typeConfig.badgeBg}`}>{entry.type}</span>
                                </div>
                                <div className="flex items-center justify-between px-4 py-3">
                                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Source</span>
                                  <span className="text-xs font-semibold text-gray-700">{sourceLabel}</span>
                                </div>
                                <div className="flex items-center justify-between px-4 py-3">
                                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Amount</span>
                                  <span className={`text-sm font-extrabold ${typeConfig.color}`}>{typeConfig.sign}₹{Number(entry.amount).toLocaleString("en-IN")}</span>
                                </div>
                                <div className="flex items-center justify-between px-4 py-3">
                                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Date & Time</span>
                                  <span className="text-xs text-gray-700 font-medium text-right">{new Date(entry.createdAt).toLocaleString("en-IN", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                                </div>
                                {isEarn && (
                                  <div className="flex items-center justify-between px-4 py-3">
                                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Expires</span>
                                    <span className={`text-xs font-semibold ${entry.expiresAt ? "text-amber-600" : "text-emerald-600"}`}>
                                      {entry.expiresAt ? new Date(entry.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Never"}
                                    </span>
                                  </div>
                                )}
                                {entry.note && (
                                  <div className="flex items-start justify-between gap-3 px-4 py-3">
                                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest shrink-0 mt-0.5">Note</span>
                                    <span className="text-xs text-gray-600 text-right">{entry.note}</span>
                                  </div>
                                )}
                                <div className="flex items-center justify-between px-4 py-3">
                                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Status</span>
                                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${isExpire ? "bg-gray-100 text-gray-500" : isRedeem ? "bg-rose-100 text-rose-600" : entry.expiresAt && new Date(entry.expiresAt) < new Date() ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"}`}>
                                    {isExpire ? "Expired" : isRedeem ? "Used" : entry.expiresAt && new Date(entry.expiresAt) < new Date() ? "Expired" : "Valid"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "address" && (
        <div className="p-4 md:p-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100 mb-6">
            <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center shrink-0"><FaMapMarkerAlt className="text-sky-600 text-sm" /></div>
            <div><h2 className="text-lg font-bold text-gray-800 leading-none">Saved Addresses</h2><p className="text-xs text-gray-400 mt-0.5">Manage your delivery addresses</p></div>
          </div>
          <div className="space-y-5">
            <div className="rounded-2xl border border-sky-100 overflow-hidden">
              <div className="flex items-center gap-3 bg-sky-50 px-4 py-3 border-b border-sky-100">
                <div className="w-7 h-7 rounded-lg bg-sky-600 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                </div>
                <p className="text-sm font-bold text-sky-700">Add New Address</p>
              </div>
              <div className="p-4 md:p-5 bg-white"><AddressForm /></div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "profile" && (
        <div className="p-4 md:p-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100 mb-6">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0"><FaUserCircle className="text-blue-600 text-sm" /></div>
            <div><h2 className="text-lg font-bold text-gray-800 leading-none">Profile Information</h2><p className="text-xs text-gray-400 mt-0.5">Your personal account details</p></div>
          </div>
          <div className="flex items-center gap-4 bg-linear-to-r from-sky-50 to-blue-50 border border-sky-100 rounded-2xl p-4 mb-6">
            <div className="w-16 h-16 rounded-xl bg-linear-to-br from-sky-500 to-blue-600 text-white text-xl font-extrabold flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
              {user?.photo ? <img src={user.photo} alt="" className="w-full h-full object-cover" /> : initials}
            </div>
            <div>
              <p className="text-base font-extrabold text-gray-800">{user?.name}</p>
              <p className="text-sm text-gray-500 mt-0.5">{user?.email}</p>
              <span className="mt-1.5 inline-block bg-sky-100 text-sky-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize">{user?.role?.replace("_", " ") || "Customer"}</span>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mb-6">
            {[
              { label: "Full Name",     value: user?.name,                                   icon: "👤" },
              { label: "Email Address", value: user?.email,                                  icon: "✉️" },
              { label: "Mobile Number", value: user?.mobile   || "Not added",                icon: "📱" },
              { label: "Account Role",  value: user?.role?.replace("_", " ") || "Customer",  icon: "🏷️" },
            ].map(({ label, value, icon }) => (
              <div key={label} className="group flex items-start gap-3 bg-white border border-gray-100 rounded-xl p-4 hover:border-sky-200 hover:shadow-sm transition-all">
                <span className="text-lg leading-none mt-0.5">{icon}</span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                  <p className={`text-sm font-semibold text-gray-800 truncate ${label === "Email Address" ? "normal-case" : "capitalize"}`}>{value}</p>
                </div>
              </div>
            ))}
          </div>
          <Link to="/update-profile" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            Edit Profile
          </Link>
        </div>
      )}

      {activeTab === "coupons" && (
        <div className="p-4 md:p-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100 mb-6">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0"><FaGift className="text-amber-600 text-sm" /></div>
            <div><h2 className="text-lg font-bold text-gray-800 leading-none">My Coupons</h2><p className="text-xs text-gray-400 mt-0.5">Active, used and expired coupons</p></div>
          </div>
          {couponLoading ? (
            <p className="text-sm text-gray-500">Loading coupons…</p>
          ) : myCoupons.length === 0 ? (
            <p className="text-sm text-gray-500">No coupons found.</p>
          ) : (
            <div className="space-y-4">{myCoupons.map((c) => <CouponCard key={c.code} c={c} />)}</div>
          )}
        </div>
      )}

      {activeTab === "complaint" && (
        <div className="p-4 md:p-6 space-y-6">
          <div className="flex items-center gap-3 pb-5 border-b border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-sm">
              <HiOutlineExclamationCircle className="text-white text-xl" />
            </div>
            <div><h2 className="text-lg font-bold text-gray-800 leading-tight">Support &amp; Complaints</h2><p className="text-xs text-gray-400 mt-0.5">We respond to every complaint within 24–48 hours</p></div>
          </div>
          <form onSubmit={submitComplaint} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-sky-50">
              <h3 className="text-sm font-bold text-sky-800">Raise a Complaint</h3>
              <p className="text-[11px] text-sky-500 mt-0.5">Fill all required fields and verify your order ID before submitting.</p>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Complaint Type <span className="text-red-500">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {["Damaged Product", "Missing Item", "Wrong Product Delivered", "Late Delivery", "Other"].map((type) => (
                    <label key={type} className="cursor-pointer">
                      <input type="radio" name="complaintType" value={type} required className="sr-only peer" />
                      <span className="inline-block px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 bg-white peer-checked:bg-sky-600 peer-checked:text-white peer-checked:border-sky-600 hover:border-sky-300 hover:text-sky-700 transition-all cursor-pointer select-none">{type}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Order ID <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input type="text" name="orderId" required value={orderId} onChange={(e) => { setOrderId(e.target.value); setOrderVerified(null); }} placeholder="Paste your Order ID here…"
                      className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none transition pr-9 ${orderVerified === true ? "border-emerald-400 bg-emerald-50 focus:ring-2 focus:ring-emerald-300" : orderVerified === false ? "border-red-400 bg-red-50 focus:ring-2 focus:ring-red-300" : "border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-sky-400 focus:border-sky-400"}`} />
                    {orderVerified === true && <FaCheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />}
                  </div>
                  <button type="button" onClick={verifyOrder} disabled={!orderId.trim() || verifying}
                    className="shrink-0 px-4 py-2.5 rounded-xl border border-sky-200 bg-sky-50 text-sky-700 text-xs font-bold hover:bg-sky-100 transition disabled:opacity-40 disabled:cursor-not-allowed">
                    {verifying ? "Checking…" : "Verify"}
                  </button>
                </div>
                <div className="mt-1.5 min-h-4">
                  {orderVerified === true  && <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1"><FaCheckCircle className="text-[11px]" /> Order verified successfully</p>}
                  {orderVerified === false && !verifying && <p className="text-xs text-red-500 font-medium">✗ Order not found or doesn't belong to you</p>}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Describe Your Issue <span className="text-red-500">*</span></label>
                <textarea name="description" required rows={4} placeholder="What happened? When? What resolution are you expecting?…"
                  className="w-full border border-gray-200 bg-gray-50 focus:bg-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-400 focus:border-sky-400 outline-none resize-none transition" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Attach Photos<span className="ml-1 text-gray-400 font-normal normal-case tracking-normal">(optional)</span></label>
                <label className="flex items-center gap-4 w-full px-4 py-4 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-sky-50 hover:border-sky-300 transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-sky-100 flex items-center justify-center shrink-0 transition">
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-sky-500 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <div><p className="text-sm font-semibold text-gray-600 group-hover:text-sky-700 transition">Click to upload photos</p><p className="text-xs text-gray-400 mt-0.5">PNG or JPG · multiple files allowed</p></div>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setSelectedImages((p) => [...p, ...Array.from(e.target.files)])} />
                </label>
                {selectedImages.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedImages.map((img, i) => (
                      <div key={i} className="relative group w-16 h-16 rounded-xl overflow-hidden border-2 border-gray-100 shadow-sm">
                        <img src={URL.createObjectURL(img)} className="w-full h-full object-cover" alt="" />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <button type="button" onClick={() => setSelectedImages((p) => p.filter((_, j) => j !== i))} className="w-6 h-6 bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button type="submit" disabled={submitting || !orderVerified}
                className={`w-full py-3 rounded-xl text-sm font-bold tracking-wide transition-all ${submitting || !orderVerified ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-sky-600 hover:bg-sky-700 text-white shadow-sm hover:shadow-md"}`}>
                {submitting ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Submitting…</span> : "Submit Complaint"}
              </button>
            </div>
          </form>
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-700">My Complaints</h3>
              {complaints.length > 0 && <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">{complaints.length} total</span>}
            </div>
            {complaints.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-100 rounded-2xl text-center">
                <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mb-3"><HiOutlineExclamationCircle className="text-2xl text-gray-300" /></div>
                <p className="text-sm font-semibold text-gray-500">No complaints yet</p>
                <p className="text-xs text-gray-400 mt-1">Any complaint you raise will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {complaints.map((c) => {
                  const statusMap = {
                    Pending:  { pill: "bg-amber-100 text-amber-700 border-amber-200",      bar: "bg-amber-400",   dot: "bg-amber-400"  },
                    Resolved: { pill: "bg-emerald-100 text-emerald-700 border-emerald-200", bar: "bg-emerald-500", dot: "bg-emerald-500" },
                  };
                  const s = statusMap[c.status] || { pill: "bg-red-100 text-red-700 border-red-200", bar: "bg-red-500", dot: "bg-red-500" };
                  return (
                    <div key={c._id} className="relative flex bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                      <div className={`w-1 shrink-0 ${s.bar}`} />
                      <div className="flex-1 min-w-0 p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold bg-sky-50 text-sky-700 border border-sky-100 px-2.5 py-0.5 rounded-lg">{c.complaintType}</span>
                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-lg border ${s.pill}`}><span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />{c.status}</span>
                          </div>
                          <button onClick={() => deleteComplaint(c._id)} className="shrink-0 w-7 h-7 rounded-lg border border-gray-100 text-gray-400 hover:border-red-200 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition" title="Delete complaint"><FaTrash className="text-[11px]" /></button>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Order</span>
                          <span className="text-xs font-mono text-gray-700 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-lg">{c.orderId}</span>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">{c.description}</p>
                        {c.images?.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {c.images.map((img, idx) => <img key={idx} src={img} alt={`Attachment ${idx + 1}`} className="w-14 h-14 object-cover rounded-xl border border-gray-100 hover:scale-110 transition-transform cursor-pointer shadow-sm" />)}
                          </div>
                        )}
                        <p className="text-[11px] text-gray-300 mt-3 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          {new Date(c.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );

  /* ═══════════════════════════ RENDER ═══════════════════════════ */
  return (
    <>
      {/* ══════════════════════════════════════════
          MOBILE / TABLET  (< lg) dsfg
      ══════════════════════════════════════════ */}
      <div className="lg:hidden min-h-screen">

        {mobileShowMenu ? (
          /* ── Profile Home (redesigned) ── */
          <>
            {/* ── Top Action Bar ── */}
            <div className="flex items-center justify-between px-5 pt-10 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shrink-0 bg-sky-600">
                  {user?.photo
                    ? <img src={user.photo} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">{initials}</div>}
                </div>
                <button
                  onClick={() => navigate("/my-activity")}
                  className="px-4 py-2 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-bold shadow-sm shadow-sky-200"
                >
                  My Activity
                </button>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => navigate("/contact-us")} className="text-gray-400 hover:text-sky-600 transition">
                  <FaEnvelope className="text-[18px]" />
                </button>
                <button onClick={() => handleMobileNav("coupons")} className="text-gray-400 hover:text-sky-600 transition">
                  <FaGift className="text-[18px]" />
                </button>
                <button onClick={() => navigate("/settings")} className="text-gray-400 hover:text-sky-600 transition">
                  <FaCog className="text-[18px]" />
                </button>
              </div>
            </div>

            {/* ── Greeting ── */}
            <div className="px-5 mb-6">
              <h1 className="text-[26px] font-black text-gray-900 leading-tight">
                Hello, {user?.name?.split(" ")[0]}!!
              </h1>
            </div>

            {/* ── Reward / Coupon Card ── */}
            {homeCoupon && homeCoupon.status !== "used" && (
              <div className="mx-5 mb-5">
                <button
                  type="button"
                  onClick={() => handleMobileNav("coupons")}
                  className="w-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl p-4 flex items-center gap-4 shadow-lg shadow-sky-100 text-left"
                >
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                    <FaHeart className="text-sky-500 text-xl" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm">You just got a reward!</p>
                    <p className="text-sky-100 text-xs mt-0.5 truncate">
                      Use code <span className="font-mono font-bold text-white">{homeCoupon.code}</span> · {homeCoupon.discount}% off your order
                    </p>
                  </div>
                  <FaChevronRight className="text-white/60 text-xs shrink-0" />
                </button>
              </div>
            )}

            {/* ── Recently Viewed ── */}
            {homeRecentlyViewed.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center justify-between px-5 mb-3">
                  <p className="text-[15px] font-bold text-gray-900">Recently viewed</p>
                  <button onClick={openRecentlyViewed} className="text-xs font-semibold text-sky-500">See all</button>
                </div>
                <div className="flex gap-3 px-5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                  {homeRecentlyViewed.map((item) => {
                    const img = item.colorVariants?.[0]?.images?.[0]?.url || item.images?.[0]?.url || "/placeholder.png";
                    return (
                      <Link key={item._id} to={getProductUrl(item)} className="shrink-0">
                        <div className="w-14 h-14 rounded-full border-2 border-sky-100 overflow-hidden bg-gray-50">
                          <img src={img} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Recently Viewed ── */}
            {/* <div className="mx-5 mb-5">
              <button
                type="button"
                onClick={openRecentlyViewed}
                className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 flex items-center gap-3 text-left"
              >
                <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center shrink-0">
                  <FaHistory className="text-sky-600 text-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900">Recently viewed</p>
                  <p className="text-xs text-gray-400 mt-0.5">Open your browsing history</p>
                </div>
                <FaChevronRight className="text-gray-300 text-xs shrink-0" />
              </button>
            </div> */}

            {/* ── My Orders ── */}
            <div className="px-5 mb-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[15px] font-bold text-gray-900">My Orders</p>
                <button onClick={() => handleMobileNav("orders")} className="text-xs font-semibold text-sky-500">See all</button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
                {[
                  { label: "To Pay",     dot: false },
                  { label: "To Receive", dot: true  },
                  { label: "To Review",  dot: false },
                ].map(({ label, dot }) => (
                  <button
                    key={label}
                    onClick={() => handleMobileNav("orders")}
                    className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 text-xs font-semibold text-gray-600 bg-white hover:border-sky-300 hover:text-sky-600 transition-colors"
                  >
                    {label}
                    {dot && <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* ── My Coupons (horizontal scroll) ── */}
            {homeAllCoupons.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center justify-between px-5 mb-3">
                  <p className="text-[15px] font-bold text-gray-900">My Coupons</p>
                  <button onClick={() => handleMobileNav("coupons")} className="text-xs font-semibold text-sky-500">See all</button>
                </div>
                <div className="flex gap-3 px-5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                  {homeAllCoupons.slice(0, 5).map((c) => (
                    <div key={c.code} className="shrink-0 w-52">
                      <MiniCouponCard c={c} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Quick Actions ── */}
            <div className="mx-5 mb-5">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 grid grid-cols-3 divide-x divide-gray-100 overflow-hidden">
                {[
                  { icon: FaBoxOpen,                  label: "Your Orders",  tab: "orders",    iconColor: "text-sky-600",    bg: "bg-sky-50"    },
                  { icon: FaWallet,                   label: "My Wallet",    tab: "wallet",    iconColor: "text-emerald-600", bg: "bg-emerald-50" },
                  { icon: HiOutlineExclamationCircle, label: "Need Help?",   tab: "complaint", iconColor: "text-amber-600",  bg: "bg-amber-50"  },
                ].map(({ icon: _Icon, label, tab, iconColor, bg }) => {
                  void _Icon;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => handleMobileNav(tab)}
                      className="flex flex-col items-center justify-center py-4 gap-2 hover:bg-gray-50 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center`}>
                        <_Icon className={`text-lg ${iconColor}`} />
                      </div>
                      <span className="text-[11px] font-semibold text-gray-700 text-center leading-tight px-1">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Full Menu ── */}
            <div className="space-y-0 pb-6">
              <div className="h-2" />
              <MenuSection title="Your information">
                <MenuRow icon={FaBoxOpen}      label="My Orders"    onClick={() => handleMobileNav("orders")}    iconBg="bg-sky-50"   iconColor="text-sky-600" />
                <MenuRow icon={FaHeart}        label="My Wishlist"  onClick={() => handleMobileNav("wishlist")}       iconBg="bg-red-50"   iconColor="text-red-500" />
                <MenuRow icon={FaHistory}      label="Recently Viewed" onClick={openRecentlyViewed} iconBg="bg-sky-50" iconColor="text-sky-600" />
                <MenuRow icon={FaMapMarkerAlt} label="My Address"   onClick={() => handleMobileNav("address")}   iconBg="bg-blue-50"  iconColor="text-blue-600" />
                <MenuRow icon={FaUserCircle}   label="Profile Info" onClick={() => handleMobileNav("profile")}   iconBg="bg-gray-100" iconColor="text-gray-600" />
              </MenuSection>
              <div className="h-2" />
              <MenuSection title="Payment and coupons">
                <MenuRow icon={FaWallet} label="My Wallet"  onClick={() => handleMobileNav("wallet")}  iconBg="bg-emerald-50" iconColor="text-emerald-600" />
                <MenuRow icon={FaGift}   label="My Coupons" onClick={() => handleMobileNav("coupons")} iconBg="bg-amber-50"   iconColor="text-amber-600" />
              </MenuSection>
              <div className="h-2" />
              <MenuSection title="Other information">
                <MenuRow icon={FaInfoCircle}               label="About Us"               onClick={() => navigate("/about")}           iconBg="bg-sky-50"    iconColor="text-sky-600"    />
                <MenuRow icon={FaPhone}                    label="Contact Us"             onClick={() => navigate("/contact-us")}      iconBg="bg-teal-50"   iconColor="text-teal-600"   />
                <MenuRow icon={FaShieldAlt}                label="Privacy Policy"         onClick={() => navigate("/privacy-policy")}  iconBg="bg-gray-100"  iconColor="text-gray-600"   />
                <MenuRow icon={FaFileAlt}                  label="Terms &amp; Conditions" onClick={() => navigate("/terms")}           iconBg="bg-gray-100"  iconColor="text-gray-600"   />
                <MenuRow icon={HiOutlineExclamationCircle} label="Complaints"             onClick={() => handleMobileNav("complaint")} iconBg="bg-orange-50" iconColor="text-orange-600" />
              </MenuSection>
              <div className="h-2" />
              <div className="px-4 py-2">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-4 px-4 py-4 hover:bg-red-50 active:bg-red-100 transition-colors text-left rounded-2xl"
                  >
                    <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                      <AiOutlineLogout className="text-base text-red-500" />
                    </div>
                    <span className="flex-1 text-[13px] text-red-500 font-medium">Log out</span>
                  </button>
                </div>
              </div>
              <div className="h-2" />
              <div className="py-6 flex flex-col items-center gap-1">
                <p className="text-sm font-bold text-gray-300 tracking-widest uppercase">Raphaaa</p>
                <p className="text-[11px] text-gray-300">v1.0.0</p>
              </div>
            </div>
          </>
        ) : (
          /* ── Sub-page view ── */
          <>
            {/* Sticky sub-header */}
            <div className="fixed top-0 left-0 right-0 z-40 bg-white shadow-sm border-b border-gray-100 lg:hidden">
              <div className="flex items-center gap-3 px-4 py-3.5">
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === "address" && showAddressForm) {
                      setShowAddressForm(false);
                    } else {
                      setMobileShowMenu(true);
                    }
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-700 transition"
                >
                  <FaArrowLeft size={14} />
                </button>
                <h1 className="text-sm font-semibold text-gray-800">
                  {activeTab === "address" && showAddressForm
                    ? "Add new address"
                    : TAB_TITLES[activeTab] || "Account"}
                </h1>
              </div>
            </div>

            {/* Tab content */}
            <div className="bg-gray-50 min-h-screen pt-14">
              {activeTab === "address" ? (
                /* ── Mobile address view (Zomato-style) ── */
                showAddressForm ? (
                  /* Form-only view */
                  <div className="p-4">
                    <AddressForm
                      showSavedList={false}
                      initialEditIndex={mobileEditAddress?.idx ?? null}
                      initialEditAddress={mobileEditAddress?.addr ?? null}
                    />
                  </div>
                ) : (
                  /* Address list view */
                  <>
                    {/* Top action rows */}
                    <div className="bg-white divide-y divide-gray-100">
                      <button
                        type="button"
                        onClick={() => {
                          setMobileEditAddress(null);
                          setShowAddressForm(true);
                        }}
                        className="w-full flex items-center gap-4 px-4 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                      >
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                          <FaPlus className="text-sky-600 text-sm" />
                        </div>
                        <span className="flex-1 text-[13px] text-sky-600 font-medium text-left">Add new address</span>
                        <FaChevronRight className="text-gray-300 text-xs shrink-0" />
                      </button>
                    </div>

                    {/* Address list */}
                    {addrLoading ? (
                      <div className="flex items-center justify-center py-16 gap-2 text-gray-400 text-sm">
                        <span className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                        Loading addresses…
                      </div>
                    ) : profileAddresses.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                        <FaMapMarkerAlt className="text-4xl text-gray-200 mb-3" />
                        <p className="text-sm font-semibold text-gray-500">No saved addresses</p>
                        <p className="text-xs text-gray-400 mt-1">Tap "Add new address" to get started</p>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <p className="text-[11px] text-gray-400 px-4 pt-4 pb-1 font-medium uppercase tracking-wider">Your saved addresses</p>
                        <div className="divide-y divide-gray-100">
                          {profileAddresses.map((addr, idx) => {
                            const isDefault    = addr.isDefault || idx === 0;
                            const TypeIcon     = addr.addressType === "Work" ? FaBriefcase : addr.addressType === "Other" ? FaMapMarkerAlt : FaHome;
                            const isExpanded   = expandedAddrIdx === idx;
                            return (
                              <div key={idx} className="px-4 py-4">
                                <div className="flex gap-3">
                                  {/* Left icon thumbnail */}
                                  <div className="relative shrink-0">
                                    <div className="w-14 h-14 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center">
                                      <TypeIcon className="text-amber-500 text-xl" />
                                    </div>
                                    {isDefault && (
                                      <div className="absolute -top-2 -left-2 bg-green-500 text-white text-[8px] font-bold px-1.5 py-1 rounded-md leading-none text-center z-10">
                                        You're<br />here
                                      </div>
                                    )}
                                  </div>

                                  {/* Content */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 mb-0.5">
                                      <p className="text-[13px] font-bold text-gray-900">{addr.addressType || "Home"}</p>
                                      {/* Bookmark/pin icon */}
                                      {/* <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-300 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                      </svg> */}
                                    </div>
                                    <p className="text-[11px] text-gray-500 leading-snug">
                                      {[addr.firstName, addr.lastName].filter(Boolean).join(" ")}
                                      {(addr.firstName || addr.lastName) ? ", " : ""}
                                      {addr.address}
                                      {addr.landmark ? `, ${addr.landmark}` : ""}
                                      {addr.city ? `, ${addr.city}` : ""}
                                      {addr.state ? `, ${addr.state}` : ""}
                                      {addr.postalCode ? ` ${addr.postalCode}` : ""}
                                    </p>
                                    {addr.phone && (
                                      <p className="text-[11px] text-gray-500 mt-1">Phone number: {addr.phone}</p>
                                    )}
                                    {/* Action row */}
                                    <div className="flex items-center gap-4 mt-2.5">
                                      <button
                                        type="button"
                                        onClick={() => setExpandedAddrIdx(isExpanded ? null : idx)}
                                        className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 text-gray-400 transition"
                                        title="Options"
                                      >
                                        <span className="text-base font-bold leading-none tracking-widest">···</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setMobileEditAddress({ idx, addr });
                                          setShowAddressForm(true);
                                        }}
                                        className="text-[13px] text-sky-600 font-medium border border-sky-200 px-3 py-1 rounded-lg hover:bg-sky-50 transition"
                                      >
                                        <PenIcon size={12} />
                                      </button>
                                    </div>
                                    {/* Expanded options */}
                                    {isExpanded && (
                                      <div className="mt-2 flex gap-2">
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteAddr(idx)}
                                          className="text-xs font-semibold text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition flex items-center gap-1.5"
                                        >
                                          <FaTrash className="text-[10px]" /> Delete
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setExpandedAddrIdx(null)}
                                          className="text-xs font-semibold text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )
              ) : (
                <TabContent />
              )}
            </div>
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════
          DESKTOP  (≥ lg)
      ══════════════════════════════════════════ */}
      <div className="hidden lg:block min-h-screen">
        <div className="max-w-6xl mx-auto px-3 md:px-4 py-6">
          <div className="flex flex-col lg:flex-row gap-5 items-start">

            {/* ════ LEFT SIDEBAR ════ */}
            <aside className="w-full lg:w-64 shrink-0 lg:sticky lg:top-4">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                {/* User card */}
                <div className="bg-linear-to-br from-sky-600 to-blue-700 px-5 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-white text-xl font-extrabold shrink-0 overflow-hidden">
                      {user?.photo ? <img src={user.photo} alt="" className="w-full h-full object-cover" /> : initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-white font-bold text-sm truncate">{user?.name}</p>
                        <MdVerified className="text-sky-200 text-sm shrink-0" />
                      </div>
                      <p className="text-sky-100 text-xs truncate mt-0.5">{user?.email}</p>
                      <span className="mt-2 inline-block bg-white/20 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full capitalize">
                        {user?.role?.replace("_", " ") || "Customer"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Nav links */}
                <nav className="p-2">
                  {NAV_ITEMS.map(({ key, label, icon: _Icon }) => {
                    void _Icon;
                    const active = activeTab === key;
                    return (
                      <button
                        key={key}
                        onClick={() => (key === "wishlist" ? handleMobileNav("wishlist") : key === "refer" ? navigate("/refer") : setActiveTab(key))}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5
                          ${active ? "bg-sky-50 text-sky-700 font-semibold" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
                      >
                        <_Icon className={`text-base shrink-0 ${active ? "text-sky-600" : "text-gray-400"}`} />
                        <span>{label}</span>
                        {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-500" />}
                      </button>
                    );
                  })}
                </nav>

                {/* Divider + logout */}
                <div className="border-t border-gray-100 p-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition"
                  >
                    <AiOutlineLogout className="text-base shrink-0" />
                    Logout
                  </button>
                </div>
              </div>
            </aside>

            {/* ════ MAIN CONTENT ════ */}
            <main className="flex-1 min-w-0">
              <div className="overflow-hidden">
                <TabContent />
              </div>
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
