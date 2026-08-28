import React, { useEffect, useState } from "react";
import {
  FaBoxOpen, FaClipboardList, FaShoppingBag, FaSignOutAlt,
  FaStore, FaUser, FaCog, FaLock, FaTasks, FaRupeeSign, FaUsers, FaRulerCombined, FaTruck,
} from "react-icons/fa";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { RiDashboardHorizontalFill } from "react-icons/ri";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../redux/slices/authSlice";
import { clearCart } from "../../redux/slices/cartSlice";
import icon from "../../assets/man.png";
import { HiPlusCircle, HiChevronDown } from "react-icons/hi";
import { CgProfile } from "react-icons/cg";
import { MdOutlineAddTask, MdVerified, MdCampaign } from "react-icons/md";
import { BsGraphUpArrow } from "react-icons/bs";
import { LuMessageSquareText } from "react-icons/lu";
import axios from "axios";
import { toast } from "sonner";
import { GiLetterBomb } from "react-icons/gi";
import { BiSolidOffer, BiCategoryAlt, BiSolidCoupon } from "react-icons/bi";
import { FaPeopleCarryBox } from "react-icons/fa6";
import { TbHierarchy3 } from "react-icons/tb";
import { SiMinutemailer } from "react-icons/si";

/* ── Reusable accordion item ──────────────────────────────────── */
const AccordionGroup = ({ icon: Icon, label, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-gray-300 hover:bg-white/8 hover:text-white transition-all group"
      >
        <span className="flex items-center gap-3">
          <Icon className="text-base shrink-0" />
          <span className="text-sm font-medium">{label}</span>
        </span>
        <HiChevronDown
          className={`text-gray-500 text-sm transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="mt-1 ml-9 space-y-0.5 border-l border-white/10 pl-3">
          {children}
        </div>
      )}
    </div>
  );
};

/* ── Simple nav link ──────────────────────────────────────────── */
const NavItem = ({ to, icon: Icon, label, end = false }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
        isActive
          ? "bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-900/40"
          : "text-gray-400 hover:bg-white/8 hover:text-white"
      }`
    }
  >
    <Icon className="text-base shrink-0" />
    <span>{label}</span>
  </NavLink>
);

/* ── Sub-nav link (inside accordion) ─────────────────────────── */
const SubItem = ({ to, icon: Icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
        isActive
          ? "bg-white/15 text-white"
          : "text-gray-400 hover:bg-white/8 hover:text-gray-200"
      }`
    }
  >
    <Icon className="text-sm shrink-0" />
    <span>{label}</span>
  </NavLink>
);

/* ── Section label ────────────────────────────────────────────── */
const SectionLabel = ({ children }) => (
  <p className="px-3 pt-4 pb-1.5 text-[10px] font-bold tracking-widest text-gray-500 uppercase">
    {children}
  </p>
);

/* ═══════════════════════════════════════════════════════════════ */
const AdminSidebar = () => {
  const navigate  = useNavigate();
  const dispatch  = useDispatch();
  const { user }  = useSelector((state) => state.auth);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [profile,  setProfile]  = useState(null);

  /* fetch profile */
  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_BACKEND_URL}/api/users/profile`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("userToken")}` },
      })
      .then(({ data }) => setProfile(data))
      .catch(() => {});
  }, []);

  /* online/offline */
  useEffect(() => {
    const up   = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener("online",  up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    dispatch(clearCart());
    navigate("/login");
    toast.success("Logged out successfully");
  };

  const isAdmin      = user?.role === "admin";
  const isMerchandise = user?.role === "merchantise";
  const isMarketing  = user?.role === "marketing";
  const isDelivery   = user?.role === "delivery_boy";

  const roleLabel = {
    admin:        "Administrator",
    merchantise:  "Merchandise",
    marketing:    "Marketing",
    delivery_boy: "Packager",
  }[user?.role] || user?.role;

  const initials = user?.name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "A";

  /* ─── render ─── */
  return (
    <aside className="h-full w-full bg-gray-900 text-gray-100 flex flex-col overflow-hidden border-r border-white/5">

      {/* ── Brand ── */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-4 border-b border-white/8">
        <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md">
          <span className="text-white text-xs font-extrabold">R</span>
        </div>
        <div>
          <Link to="/" className="text-base font-extrabold text-white tracking-wide">
            Raphaaa
          </Link>
          <p className="text-[10px] text-gray-500 font-medium">{roleLabel} Panel</p>
        </div>
      </div>

      {/* ── User card ── */}
      {user && (
        <div className="shrink-0 px-4 py-3 border-b border-white/8">
          <div className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5">
            {/* Avatar */}
            <div className="relative shrink-0">
              {profile?.photo ? (
                <img
                  src={profile.photo}
                  alt={user.name}
                  onError={(e) => { e.currentTarget.src = icon; }}
                  className="w-9 h-9 rounded-xl object-cover border border-white/20"
                />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold border border-white/10">
                  {initials}
                </div>
              )}
              {/* online dot */}
              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-gray-900 ${isOnline ? "bg-emerald-400" : "bg-red-400"}`} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{user?.name}</p>
                <MdVerified className="text-blue-400 text-sm shrink-0" />
              </div>
              <span className={`inline-block mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                isAdmin      ? "bg-red-500/20 text-red-300"
                : isMerchandise ? "bg-purple-500/20 text-purple-300"
                : isMarketing   ? "bg-amber-500/20 text-amber-300"
                : isDelivery    ? "bg-yellow-500/20 text-yellow-300"
                : "bg-gray-500/20 text-gray-300"
              }`}>
                {roleLabel}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Navigation ── */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-0.5 custom-scrollbar">

        {/* MAIN */}
        {(isAdmin || isMerchandise || isMarketing) && (
          <>
            <SectionLabel>Main</SectionLabel>
            <NavItem to="/admin" icon={RiDashboardHorizontalFill} label="Dashboard" end />
          </>
        )}

        {/* TASKS */}
        {(isAdmin || isMerchandise) && (
          <>
            <SectionLabel>Tasks</SectionLabel>
            {isAdmin && <NavItem to="/admin/all-tasks" icon={FaTasks} label="All Tasks" />}
            {isMerchandise && (
              <AccordionGroup icon={FaTasks} label="My Tasks">
                <SubItem to="/admin/add-task"    icon={MdOutlineAddTask} label="Add Task" />
                <SubItem to="/admin/view-tasks"  icon={FaClipboardList}  label="View Tasks" />
              </AccordionGroup>
            )}
          </>
        )}

        {/* ANALYTICS */}
        {(isAdmin || isMerchandise) && (
          <>
            <SectionLabel>Analytics</SectionLabel>
            <AccordionGroup icon={BsGraphUpArrow} label="Analysis">
              <SubItem to="/admin/inventory"      icon={FaBoxOpen}      label="Inventory" />
              <SubItem to="/admin/trend-analysis" icon={BsGraphUpArrow} label="Sales Analysis" />
              <SubItem to="/admin/revenue"        icon={FaRupeeSign}    label="Total Revenue" />
            </AccordionGroup>
          </>
        )}

        {/* CATALOGUE */}
        {(isAdmin || isMerchandise) && (
          <>
            <SectionLabel>Catalogue</SectionLabel>
            <NavItem to="/admin/custom-categories" icon={BiCategoryAlt} label="Categories" />
            <AccordionGroup icon={FaBoxOpen} label="Products">
              <SubItem to="/admin/add-product" icon={HiPlusCircle}  label="Add Product" />
              <SubItem to="/admin/products"    icon={FaShoppingBag} label="All Products" />
              <SubItem to="/admin/size-charts" icon={FaRulerCombined} label="Size Charts" />
              <SubItem to="/admin/prebookings" icon={FaBoxOpen}     label="Prebookings" />
            </AccordionGroup>
            {(isAdmin) && (
              <AccordionGroup icon={BiSolidOffer} label="Offers">
                <SubItem to="/admin/create-offers" icon={HiPlusCircle} label="Create Offer" />
                <SubItem to="/admin/offers"        icon={BiSolidOffer} label="View Offers" />
              </AccordionGroup>
            )}
            {(isAdmin) && (
              <AccordionGroup icon={BiSolidCoupon} label="Coupons">
                <SubItem to="/admin/create-coupon" icon={HiPlusCircle}  label="Create Coupon" />
                <SubItem to="/admin/coupons"        icon={BiSolidCoupon} label="View Coupons" />
              </AccordionGroup>
            )}
          </>
        )}

        {/* ORDERS */}
        {(isAdmin || isMerchandise || isDelivery) && (
          <>
            <SectionLabel>Orders</SectionLabel>
            <NavItem to="/admin/orders" icon={FaClipboardList} label="Orders" />
            {(isAdmin || isMerchandise || isMarketing) && (
              <NavItem to="/admin/returns" icon={FaTruck} label="Returns" />
            )}
          </>
        )}

        {/* PEOPLE */}
        {(isAdmin) && (
          <>
            <SectionLabel>People</SectionLabel>
            <AccordionGroup icon={FaUsers} label="Users">
              <SubItem to="/admin/users"          icon={FaUsers} label="Manage Users" />
              <SubItem to="/admin/reset-password" icon={FaLock}  label="Reset Password" />
            </AccordionGroup>
          </>
        )}

        {/* MARKETING */}
        {(isAdmin || isMarketing) && (
          <>
            <SectionLabel>Marketing</SectionLabel>
            <AccordionGroup icon={FaPeopleCarryBox} label="Collab">
              {(isAdmin || isMarketing) && (
                <SubItem to="/admin/collab-settings" icon={HiPlusCircle}      label="Add Collab" />
              )}
              <SubItem to="/admin/collabs"           icon={FaPeopleCarryBox}  label="View Collabs" />
            </AccordionGroup>
            {(isAdmin || isMarketing) && (
              <>
                <NavItem to="/admin/subscribed-users"  icon={GiLetterBomb}    label="Subscribers" />
                <NavItem to="/admin/email-scheduler"   icon={SiMinutemailer}  label="Email Scheduler" />
                <NavItem to="/admin/campaigns"         icon={MdCampaign}      label="Campaign Tracker" />
              </>
            )}
            {isAdmin && (
              <NavItem to="/admin/contact-messages" icon={LuMessageSquareText} label="Contact Messages" />
            )}
          </>
        )}

        {/* ACCOUNT */}
        <SectionLabel>Account</SectionLabel>
        <NavItem to="update-profile" icon={CgProfile} label="My Profile" />
        {(isAdmin || isMarketing) && (
          <NavItem to="hierarchy" icon={TbHierarchy3} label="Raphaaa Hierarchy" />
        )}
        {isAdmin && (
          <AccordionGroup icon={FaCog} label="Website Settings">
            <SubItem to="/admin/website-settings/hero"           icon={FaStore}         label="Hero Carousel" />
            <SubItem to="/admin/website-settings/about"          icon={FaUser}          label="About Section" />
            <SubItem to="/admin/website-settings/privacy&policy" icon={FaClipboardList} label="Privacy & Policy" />
            <SubItem to="/admin/website-settings/contact"        icon={FaStore}         label="Contact Details" />
            <SubItem to="/admin/shipping-settings"               icon={FaTruck}         label="Shipping & Delivery" />
            <SubItem to="/admin/legal-settings"                  icon={FaClipboardList} label="Legal Pages" />
          </AccordionGroup>
        )}

        {/* bottom spacer */}
        <div className="h-4" />
      </nav>

      {/* ── Logout ── */}
      <div className="shrink-0 px-4 py-3 border-t border-white/8 bg-gray-900">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 hover:text-red-300 text-sm font-semibold transition-all border border-red-500/20 hover:border-red-500/40"
        >
          <FaSignOutAlt className="text-sm shrink-0" />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
