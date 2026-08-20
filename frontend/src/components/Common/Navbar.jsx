import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { HiOutlineShoppingBag, HiOutlineUser, HiChevronDown } from "react-icons/hi";
import { HiMiniBars3BottomRight } from "react-icons/hi2";
import SearchBar from "./SearchBar";
import CartDrawer from "../Layout/CartDrawer";
import { IoIosClose } from "react-icons/io";
import logo from "../../assets/logo1.png";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../redux/slices/authSlice";
import axios from "axios";
import { GiTreasureMap } from "react-icons/gi"; // example icon
import useSmartLoader from "../../hooks/useSmartLoader";
import { toast } from "sonner";
import { getActiveSocialLinks, getSocialIcon } from "../../utils/socialLinks";

const Navbar = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);
  const [isNavbarFixed, setIsNavbarFixed] = useState(false);
  const [hideOnMobileProfileSubmenu, setHideOnMobileProfileSubmenu] = useState(false);
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


  const { loading, data: contactInfo } = useSmartLoader(async () => {
    const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/settings/contact`);
    return res.data;
  });
  const socialLinks = getActiveSocialLinks(contactInfo);

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
  }, [location]);

  useEffect(() => {
    const onProfileSubmenu = (e) => {
      setHideOnMobileProfileSubmenu(Boolean(e?.detail?.hide));
    };
    window.addEventListener("profile-mobile-submenu", onProfileSubmenu);
    return () => window.removeEventListener("profile-mobile-submenu", onProfileSubmenu);
  }, []);

  const isActive = (path) => location.pathname === path;

  const cartItemCount =
    cart?.products?.reduce((total, product) => total + product.quantity, 0) || 0;

  const toggleNavDrawer = () => {
    setNavDrawerOpen(!navDrawerOpen);
  };

  const toggleCartDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  if (loading) {
    return (
      <div className="w-full px-6 py-4">
        <div className="container mx-auto flex items-center justify-between animate-pulse">
          <div className="h-10 w-24 bg-gray-200 rounded" />
          <div className="hidden md:flex space-x-6">
            <div className="h-4 w-20 bg-gray-200 rounded" />
            <div className="h-4 w-20 bg-gray-200 rounded" />
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-4 w-28 bg-gray-200 rounded" />
          </div>
          <div className="flex items-center space-x-4">
            <div className="h-6 w-6 bg-gray-200 rounded-full" />
            <div className="h-6 w-6 bg-gray-200 rounded-full" />
            <div className="h-6 w-6 bg-gray-200 rounded-full" />
            <div className="h-6 w-6 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  const hideNavbarClass = hideOnMobileProfileSubmenu ? "hidden md:block" : "";

  return (
    <>
      {isNavbarFixed && !hideOnMobileProfileSubmenu && <div className="h-[104px] md:h-[88px]" />}
      <div
        className={`${hideNavbarClass} w-full ${
          isNavbarFixed
            ? "fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-sm border-b border-gray-100"
            : "relative bg-transparent"
        }`}
      >
      <nav className="container mx-auto flex items-center justify-between py-3 md:py-4 px-3 sm:px-4 md:px-6 lg:px-8 gap-2">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2 group shrink-0" title="Raphaaa">
          <img src={logo} alt="Logo" className="h-8 sm:h-9 md:h-10 w-auto transition-transform duration-300 group-hover:scale-105" />
        </Link>

        {/* Center Navigation */}
        <div className="hidden md:flex space-x-5 xl:space-x-6 items-center">
          {/* ✅ Show Exclusive Drop only when collab is active */}
          {collabActive && (
            <Link
              to="/exclusive-drop"
              className={`text-sm font-semibold tracking-wide transition-all duration-300 ease-in-out uppercase ${isActive("/exclusive-drop")
                  ? "text-sky-600 border-b-2 border-sky-600 pb-1"
                  : "text-gray-600 hover:text-black hover:border-b-2 hover:border-gray-300 pb-1"
                }`}
            >
              Exclusive Drop
            </Link>
          )}
          {["/collections/all", "/about", "/contact-us", "/privacy-policy"].map((path, index) => {
            const labels = ["Collections", "About", "Contact Us", "Privacy & Policy"];
            const routesToShow = path === "/collections/all" ? !collabActive : true;

            return routesToShow ? (
              <Link
                key={path}
                to={path}
                className={`text-sm font-semibold tracking-wide transition-all duration-300 ease-in-out uppercase ${isActive(path)
                    ? "text-sky-600 border-b-2 border-sky-600 pb-1"
                    : "text-gray-600 hover:text-black hover:border-b-2 hover:border-gray-300 pb-1"
                  }`}
              >
                {labels[index]}
              </Link>
            ) : null;
          })}



        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 shrink-0">
          {user &&
            (user.role === "admin" ||
              user.role === "merchantise" ||
              user.role === "marketing" ||
              user.role === "delivery_boy") && (
              <Link
                to={user.role === "delivery_boy" ? "/admin/orders" : "/admin"}
                className="hidden sm:inline-flex px-3 md:px-4 py-2 text-xs md:text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-600 rounded-full shadow hover:shadow-md hover:from-sky-600 hover:to-blue-700 transition-all duration-300 whitespace-nowrap"
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

          {user ? (
            user.role === "customer" && (
              <div className="relative hidden md:block" ref={dropdownRef}>
                <button
                  onClick={() => setProfileOpen((prev) => !prev)}
                  className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-100 transition-all"
                >
                  {user.photo ? (
                    <img
                      src={user.photo}
                      alt="Profile"
                      className="w-8 h-8 rounded-full object-cover border border-gray-300 shadow-sm"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-sky-600 text-white flex items-center justify-center rounded-full text-sm font-bold uppercase">
                      {user.name?.charAt(0) || "U"}
                    </div>
                  )}

                  <span className="text-sm font-medium text-gray-800 hidden md:inline">
                    {user.name}
                  </span>
                  <HiChevronDown className="h-4 w-4 text-gray-500" />
                </button>


                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      View Profile
                    </Link>
                    <Link
                      to="/my-orders"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      My Orders
                    </Link>
                    <Link
                      to="/prebookings"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
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
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
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
              className="hidden sm:inline-flex px-3 md:px-4 py-2 text-xs md:text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-600 rounded-full shadow hover:from-sky-600 hover:to-blue-700 transition duration-300 whitespace-nowrap"
              title="Login"
            >
              Login
            </Link>
          )}

          {/* <button ref={cartIconRef} onClick={toggleCartDrawer} className="relative hover:scale-105 transition-transform" title="Cart">
            <HiOutlineShoppingBag className="h-6 w-6 text-gray-700" />
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-sky-500 text-white text-xs rounded-full px-2 py-0.5 shadow">
                {cartItemCount}
              </span>
            )}
          </button> */}
          <button
  ref={cartIconRef}
  onClick={toggleCartDrawer}
  className="relative hover:scale-105 transition-transform"
  title="Cart"
>
  <HiOutlineShoppingBag className="h-6 w-6 text-gray-700" />
  {cartItemCount > 0 && (
    <span className="absolute -top-1 -right-2 bg-sky-500 text-white text-xs rounded-full px-2 py-0.5 shadow">
      {cartItemCount}
    </span>
  )}
</button>

          <div className="block overflow-hidden max-w-[44px] md:max-w-[170px] lg:max-w-[220px]" title="Search">
            <SearchBar />
          </div>

          <button onClick={toggleNavDrawer} className="md:hidden transition-transform hover:scale-110">
            <HiMiniBars3BottomRight className="h-6 w-6 text-gray-700" />
          </button>
        </div>
      </nav>
      </div>

      <CartDrawer drawerOpen={drawerOpen} toggleCartDrawer={toggleCartDrawer} />

      {/* Mobile Drawer */}
      <div
        className={`fixed top-0 left-0 w-[86%] sm:w-[70%] md:w-[48%] h-full bg-white shadow-xl transform transition-transform duration-300 z-50 ${navDrawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex justify-end p-4">
          <button
            onClick={toggleNavDrawer}
            className="text-gray-600 hover:text-gray-800"
          >
            <IoIosClose className="h-6 w-6 text-gray-600" />
          </button>
        </div>
        <div className="p-4">
          <h2 className="text-xl font-semibold mb-4">Menu</h2>
          <nav className="space-y-4">
            {[
              { path: "/", label: "Home" },
              { path: "/collections/all", label: "Collections" },
              { path: "/about", label: "About Us" },
              { path: "/contact-us", label: "Contact Us" },
              { path: "/privacy-policy", label: "Privacy & Policy" },
            ].map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={toggleNavDrawer}
                className="block text-gray-700 hover:text-sky-600 text-base font-semibold uppercase tracking-wide transition"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mt-8 pt-4 absolute bottom-0 pb-8">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Follow Us</h3>
            <div className="flex space-x-4 mb-4">
              {socialLinks.map((link) => {
                const Icon = getSocialIcon(link.platform);
                return (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.label}
                    title={link.label}
                  >
                    <Icon className="h-5 w-5 text-sky-600 inline" />
                  </a>
                );
              })}
            </div>

            <h3 className="text-sm font-semibold text-gray-700 mb-1">Contact</h3>
            {contactInfo?.showGmail && (
              <a href={`mailto:${contactInfo.gmail}`} className="text-xs text-gray-600">{contactInfo.gmail}</a>
            )} |{" "}
            {contactInfo?.showPhone && (
              <a href={`tel:${contactInfo.phone}`} className="text-xs text-gray-600">{contactInfo.phone}</a>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
