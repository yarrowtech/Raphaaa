import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { HiOutlineShoppingBag, HiOutlineUser, HiChevronDown } from "react-icons/hi";
import { HiMiniBars3BottomRight } from "react-icons/hi2";
import SearchBar from "./SearchBar";
import CartDrawer from "../Layout/CartDrawer";
import WishlistDrawer from "../Layout/WishlistDrawer";
import { IoIosClose } from "react-icons/io";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../redux/slices/authSlice";
import axios from "axios";
import { GiTreasureMap } from "react-icons/gi"; // example icon
import useSmartLoader from "../../hooks/useSmartLoader";
import { toast } from "sonner";

const Navbar = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [wishlistDrawerOpen, setWishlistDrawerOpen] = useState(false);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);
  const [isNavbarFixed, setIsNavbarFixed] = useState(false);
  const [hideOnMobileProfileSubmenu, setHideOnMobileProfileSubmenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { cart } = useSelector((state) => state.cart);
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();
  const dropdownRef = useRef();
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [collabActive, setCollabActive] = useState(false);
  const cartIconRef = useRef(null); // 👈 Add ref

  useEffect(() => {
  window.cartIconRef = cartIconRef; // 👈 expose it globally
}, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsNavbarFixed(window.scrollY > 10);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);


  useEffect(() => {
    axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/collabs/active`)
      .then(res => setCollabActive(res.data.isActive))
      .catch(() => setCollabActive(false));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("userToken");
    if (!user || !token) { setWishlistItems([]); return; }
    const refreshWishlist = () => axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/wishlist`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => setWishlistItems(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    refreshWishlist();
    window.addEventListener("wishlist-updated", refreshWishlist);
    return () => window.removeEventListener("wishlist-updated", refreshWishlist);
  }, [user, wishlistDrawerOpen]);


  const { data: contactInfo } = useSmartLoader(async () => {
    const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/settings/contact`);
    return res.data;
  });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setProfileOpen(false);
    setNavDrawerOpen(false);
  }, [location]);

  useEffect(() => {
    const onProfileSubmenu = (e) => {
      setHideOnMobileProfileSubmenu(Boolean(e?.detail?.hide));
    };
    window.addEventListener("profile-mobile-submenu", onProfileSubmenu);
    return () => window.removeEventListener("profile-mobile-submenu", onProfileSubmenu);
  }, []);

  const isCollection = location.pathname.startsWith("/collections/");
  const isActive = (path) => location.pathname === path;

  const cartItemCount =
    cart?.products?.reduce((total, product) => total + product.quantity, 0) || 0;
  const wishlistCount = wishlistItems.length;

  const toggleNavDrawer = () => {
    setNavDrawerOpen(!navDrawerOpen);
  };

  const toggleCartDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const toggleWishlistDrawer = () => {
    if (!user) { navigate("/login"); return; }
    setWishlistDrawerOpen((p) => !p);
  };

  const hideNavbarClass = hideOnMobileProfileSubmenu ? "hidden md:block" : "";

  return (
    <>
      {isNavbarFixed && !hideOnMobileProfileSubmenu && <div className={`storefront-nav-spacer ${isCollection ? "is-collection" : ""}`} />}
      <div
        className={`storefront-header ${isCollection ? "is-collection" : ""} ${hideNavbarClass} w-full ${
          isNavbarFixed
            ? "fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
            : "relative bg-transparent lg:bg-[#F8FDFF] lg:border-b lg:border-[#7dd3fc]"
        }`}
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
      <nav className="storefront-nav" aria-label="Main navigation">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2 group shrink-0" title="Raphaaa">
          <span className="storefront-wordmark">RAPHAAA</span>
        </Link>

        {/* Center Navigation — typography matches the reference's Men/Women/Kids
            nav row exactly: 14px/600, normal case, 32px gap, no letter-spacing. */}
        <div
          className="storefront-primary"
          style={{ gap: "32px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {/* ✅ Show Exclusive Drop only when collab is active */}
          {collabActive && (
            <Link
              to="/exclusive-drop"
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: isActive("/exclusive-drop") ? "#111111" : "#444748",
              }}
              className="transition-colors duration-200 hover:text-[#111111]"
            >
              Exclusive Drop
            </Link>
          )}
          {["Men", "Women", "Kids"].map(gender => (
            <Link key={gender} to={`/collections/all?gender=${gender}`} aria-current={new URLSearchParams(location.search).get("gender") === gender ? "page" : undefined}>{gender}</Link>
          ))}



        </div>

        {/* Right Side — order matches Reference/Landing Page/Main.dc.html's
            header right group exactly: Search → Wishlist → Bag → Account */}
        <div className="storefront-actions">
          {user &&
            (user.role === "admin" ||
              user.role === "merchantise" ||
              user.role === "marketing" ||
              user.role === "delivery_boy") && (
              <Link
                to={user.role === "delivery_boy" ? "/admin/orders" : "/admin"}
                className={`${searchOpen ? "hidden" : "hidden sm:inline-flex"} px-3 md:px-4 py-2 text-xs font-bold uppercase tracking-wide text-white bg-[#111111] rounded-full hover:bg-[#E11B22] transition-colors duration-300 whitespace-nowrap`}
              >
                {user.role === "admin"
                  ? "Admin Panel"
                  : user.role === "merchantise"
                    ? "Merchandise Panel"
                    : user.role === "marketing"
                      ? "Marketing Panel"
                      : "Delivery Panel"}
              </Link>
            )}

          {/* 1. Search */}
          <div className="storefront-search text-[#111111]" title="Search">
            <SearchBar onOpenChange={setSearchOpen} variant="pillDesktop" />
          </div>

          {/* 2. Wishlist */}
          <button
            onClick={toggleWishlistDrawer}
            aria-label={`Wishlist, ${wishlistCount} items`}
            className={`${searchOpen ? "hidden" : ""} relative w-11 h-11 flex items-center justify-center rounded`}
            style={{ border: 0, background: "transparent" }}
            title="Wishlist"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111111" strokeWidth="1.8" strokeLinejoin="round">
              <path d="M12 20.5s-7.5-4.6-9.4-9.1C1.2 7.9 3.4 4.5 6.9 4.5c2 0 3.5 1.1 5.1 3 1.6-1.9 3.1-3 5.1-3 3.5 0 5.7 3.4 4.3 6.9-1.9 4.5-9.4 9.1-9.4 9.1z" />
            </svg>
            {wishlistCount > 0 && (
              <span
                className="absolute flex items-center justify-center font-bold text-white"
                style={{ top: "6px", right: "4px", minWidth: "18px", height: "18px", padding: "0 5px", borderRadius: "9999px", fontSize: "10px", fontWeight: 700, background: "#FF3D3D" }}
              >
                {wishlistCount}
              </span>
            )}
          </button>

          {/* 3. Bag */}
          <button
            ref={cartIconRef}
            onClick={toggleCartDrawer}
            aria-label={`Bag, ${cartItemCount} items`}
            className="storefront-bag relative flex items-center gap-2.5"
            style={{ height: "44px", padding: "0 16px 0 12px", border: "1px solid #D4D5D9", borderRadius: "4px", marginLeft: "8px", background: "transparent" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7DD3FC" strokeWidth="1.8" strokeLinejoin="round">
              <path d="M5 8h14l-1 12H6L5 8z" />
              <path d="M9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
            <span className="text-[13px] font-bold text-[#111111]">
              {isCollection ? (cartItemCount > 0 ? cartItemCount : null) : cartItemCount > 0 ? `${cartItemCount} item${cartItemCount > 1 ? "s" : ""}` : "Bag"}
            </span>
          </button>

          {/* 4. Account (profile dropdown / login) */}
          <div style={{ marginLeft: "8px" }} className="flex items-center">
            {user ? (
              user.role === "customer" && (
                <div className={`relative ${searchOpen ? "hidden" : "block"}`} ref={dropdownRef}>
                  <button
                    aria-label="Account menu"
                    aria-expanded={profileOpen}
                    onClick={() => setProfileOpen((prev) => !prev)}
                    className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-[#F5F5F6] transition-all"
                  >
                    {user.photo ? (
                      <img
                        src={user.photo}
                        alt="Profile"
                        className="w-8 h-8 rounded-full object-cover border border-[#EEEEEE] shadow-sm"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-[#7dd3fc] text-white flex items-center justify-center rounded-full text-sm font-bold uppercase">
                        {user.name?.charAt(0) || "U"}
                      </div>
                    )}

                    <span className="text-xs font-bold uppercase tracking-wide text-[#111111] hidden md:inline">
                      {user.name}
                    </span>
                    <HiChevronDown className="h-4 w-4 text-[#94969F]" />
                  </button>


                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-44 bg-white border border-[#EEEEEE] rounded shadow-lg z-50">
                      <Link
                        to="/profile"
                        className="block px-4 py-2 text-sm text-[#444748] hover:bg-[#F5F5F6] hover:text-[#111111]"
                      >
                        View Profile
                      </Link>
                      <Link
                        to="/my-orders"
                        className="block px-4 py-2 text-sm text-[#444748] hover:bg-[#F5F5F6] hover:text-[#111111]"
                      >
                        My Orders
                      </Link>
                      <Link
                        to="/prebookings"
                        className="block px-4 py-2 text-sm text-[#444748] hover:bg-[#F5F5F6] hover:text-[#111111]"
                      >
                        My Prebookings
                      </Link>
                      <button
                        onClick={() => {
                          localStorage.removeItem("userInfo");
                          dispatch(logout());
                          toast.success("Logged out successfully!");
                          navigate("/login");
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-[#E11B22] hover:bg-[#F5F5F6]"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              )
            ) : (
              <Link
                to="/login"
                className="storefront-account"
                aria-label="Account" title="Login"
              >
                <HiOutlineUser size={20} />
              </Link>
            )}
          </div>

          <button onClick={toggleNavDrawer} aria-label="Open menu" className="md:hidden transition-transform hover:scale-110">
            <HiMiniBars3BottomRight className="h-6 w-6 text-[#111111]" />
          </button>
        </div>
      </nav>
      </div>

      <CartDrawer drawerOpen={drawerOpen} toggleCartDrawer={toggleCartDrawer} />
      <WishlistDrawer
        drawerOpen={wishlistDrawerOpen}
        toggleWishlistDrawer={toggleWishlistDrawer}
        wishlistItems={wishlistItems}
      />

      {navDrawerOpen && <div className="fixed inset-0 bg-black/40 z-40" onClick={toggleNavDrawer} />}
      {/* Mobile Drawer */}
      <div
        className={`fixed top-0 left-0 w-[86%] sm:w-[70%] md:w-[48%] h-full bg-white shadow-xl transform transition-transform duration-300 z-50 ${navDrawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex justify-end p-4">
          <button
            onClick={toggleNavDrawer}
            className="text-[#444748] hover:text-[#111111]"
          >
            <IoIosClose className="h-6 w-6" />
          </button>
        </div>
        <div className="p-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-[#111111] mb-4">Menu</h2>
          <nav className="space-y-4">
            {[
              { path: "/", label: "Home" },
              { path: "/collections/all", label: "Collections" },
              { path: "/wishlist", label: `Wishlist${wishlistCount ? ` (${wishlistCount})` : ""}` },
              { path: "/about", label: "About Us" },
              { path: "/contact-us", label: "Contact Us" },
              { path: "/privacy-policy", label: "Privacy & Policy" },
            ].map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={toggleNavDrawer}
                className="block text-[#444748] hover:text-[#E11B22] text-base font-bold uppercase tracking-wide transition"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mt-8 pt-4 absolute bottom-0 pb-8">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#94969F] mb-1">Contact</h3>
            {contactInfo?.showGmail && (
              <a href={`mailto:${contactInfo.gmail}`} className="text-xs text-[#444748]">{contactInfo.gmail}</a>
            )} |{" "}
            {contactInfo?.showPhone && (
              <a href={`tel:${contactInfo.phone}`} className="text-xs text-[#444748]">{contactInfo.phone}</a>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
