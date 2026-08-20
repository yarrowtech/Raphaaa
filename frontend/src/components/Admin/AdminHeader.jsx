import React, { useEffect, useState, useRef } from "react";
import { FaBell, FaUserCircle, FaSignOutAlt } from "react-icons/fa";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../../redux/slices/authSlice";
import { clearCart } from "../../redux/slices/cartSlice";
import { useNavigate, Link, useLocation } from "react-router-dom";
import axios from "axios";
import { FiChevronDown } from "react-icons/fi";
import icon from "../../assets/man.png";
import { RiDashboardHorizontalFill } from "react-icons/ri";
import { MdVerified } from "react-icons/md";
import { CgProfile } from "react-icons/cg";
import { toast } from "sonner";

const PAGE_TITLES = {
  "/admin": "Dashboard",
  "/admin/products": "Products",
  "/admin/add-product": "Add Product",
  "/admin/orders": "Orders",
  "/admin/users": "Users",
  "/admin/returns": "Returns",
  "/admin/revenue": "Revenue",
  "/admin/inventory": "Inventory",
  "/admin/trend-analysis": "Sales Analysis",
  "/admin/custom-categories": "Categories",
  "/admin/size-charts": "Size Charts",
  "/admin/offers": "Offers",
  "/admin/create-offers": "Create Offer",
  "/admin/contact-messages": "Contact Messages",
  "/admin/subscribed-users": "Subscribers",
  "/admin/email-scheduler": "Email Scheduler",
  "/admin/collab-settings": "Add Collab",
  "/admin/collabs": "Collabs",
  "/admin/all-tasks": "All Tasks",
  "/admin/add-task": "Add Task",
  "/admin/view-tasks": "My Tasks",
  "/admin/update-profile": "My Profile",
  "/admin/hierarchy": "Hierarchy",
  "/admin/reset-password": "Reset Password",
  "/admin/shipping-settings": "Shipping & Delivery",
  "/admin/legal-settings": "Legal Pages",
};

const AdminHeader = () => {
  const { user } = useSelector((state) => state.auth);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profile, setProfile] = useState(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);

  const roleLabel =
    user?.role === "admin" ? "Admin"
    : user?.role === "merchantise" ? "Merchandise"
    : user?.role === "marketing" ? "Marketing"
    : user?.role === "delivery_boy" ? "Delivery Boy"
    : "Admin";

  const isAdmin = user?.role === "admin";

  const pageTitle =
    PAGE_TITLES[location.pathname] ||
    location.pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ")?.replace(/\b\w/g, (c) => c.toUpperCase()) ||
    "Dashboard";

  const initials = user?.name
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "A";

  const handleLogout = () => {
    dispatch(logout());
    dispatch(clearCart());
    navigate("/login");
    toast.success("Logout successful!");
  };

  useEffect(() => {
    if (!isAdmin) return;
    const fetchContacts = async () => {
      try {
        const token = localStorage.getItem("userToken");
        const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/contact`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setContacts(res.data);
        setUnreadCount(res.data.length);
      } catch {
        // silent
      }
    };
    fetchContacts();
  }, []);

  useEffect(() => {
    setShowNotifications(false);
    setShowProfile(false);
  }, [location]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowNotifications(false);
        setShowProfile(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("userToken");
    if (!token) return;
    axios
      .get(`${import.meta.env.VITE_BACKEND_URL}/api/users/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(({ data }) => setProfile(data))
      .catch(() => {});
  }, []);

  const handleBellClick = () => {
    setShowNotifications((v) => !v);
    setShowProfile(false);
    setUnreadCount(0);
  };

  return (
    <header className="flex items-center justify-between h-full bg-gray-900 border-b border-white/8 px-5">
      {/* Left — page title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase hidden sm:block">
            {roleLabel} Panel
          </span>
          <h2 className="text-sm font-bold text-white truncate">{pageTitle}</h2>
        </div>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-2 shrink-0" ref={dropdownRef}>

        {/* Notification bell — admin only */}
        {isAdmin && (
          <div className="relative">
            <button
              onClick={handleBellClick}
              className="relative w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-white/8 transition-all"
            >
              <FaBell size={16} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-gray-900" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
                  <span className="text-sm font-bold text-white">Notifications</span>
                  <span className="text-xs text-gray-500">{contacts.length} messages</span>
                </div>

                {contacts.length === 0 ? (
                  <p className="px-4 py-5 text-sm text-gray-500 text-center">No new messages</p>
                ) : (
                  <ul className="divide-y divide-white/5 max-h-72 overflow-y-auto">
                    {contacts.slice(0, 5).map((msg) => (
                      <li key={msg._id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-all">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                          <FaUserCircle size={18} className="text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{msg.name}</p>
                          <p className="text-xs text-gray-400 line-clamp-1">{msg.message}</p>
                          <p className="text-[10px] text-gray-600 mt-0.5">
                            {new Date(msg.createdAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="px-4 py-3 border-t border-white/8 bg-white/3">
                  <Link
                    to="/admin/contact-messages"
                    className="block text-center text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    View all messages
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Profile button */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfile((v) => !v);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-white/8 transition-all text-white"
          >
            {profile?.photo ? (
              <img
                src={profile.photo}
                alt="profile"
                className="w-7 h-7 rounded-lg object-cover border border-white/20"
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold border border-white/10 shrink-0">
                {initials}
              </div>
            )}
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-white leading-none">{user?.name || "Admin"}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{roleLabel}</p>
            </div>
            <FiChevronDown
              size={14}
              className={`text-gray-500 transition-transform duration-200 ${showProfile ? "rotate-180" : ""}`}
            />
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-2 w-60 bg-gray-800 border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50">
              {/* User info */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 bg-white/3">
                {profile?.photo ? (
                  <img
                    src={profile.photo}
                    alt="profile"
                    className="w-10 h-10 rounded-xl object-cover border border-white/20 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {initials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{user?.name || "Admin"}</p>
                    <MdVerified className="text-blue-400 text-sm shrink-0" />
                  </div>
                  <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
                </div>
              </div>

              {/* Menu */}
              <div className="py-1.5">
                <Link
                  to="/admin"
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/8 hover:text-white transition-all"
                >
                  <RiDashboardHorizontalFill className="text-gray-500 shrink-0" />
                  Dashboard
                </Link>
                <Link
                  to="/admin/update-profile"
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/8 hover:text-white transition-all"
                >
                  <CgProfile className="text-gray-500 shrink-0" />
                  My Profile
                </Link>
              </div>

              <div className="px-3 pb-2 border-t border-white/8 pt-1.5">
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 hover:text-red-300 text-sm font-semibold transition-all border border-red-500/20"
                >
                  <FaSignOutAlt className="shrink-0" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
