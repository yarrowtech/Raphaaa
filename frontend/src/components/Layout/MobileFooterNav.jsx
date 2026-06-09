import React from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { FaStore, FaHeart, FaShoppingBag, FaUser } from "react-icons/fa";
import { useSelector } from "react-redux";
import { BiSolidHome } from "react-icons/bi";

const MobileFooterNav = () => {
  const { cart } = useSelector((state) => state.cart);
  const navigate = useNavigate();
  const location = useLocation();

  const cartItemCount =
    cart?.products?.reduce((total, p) => total + Number(p.quantity || 0), 0) || 0;

  const isWishlistActive = location.pathname === "/wishlist";

  const itemCls = (active) =>
    `flex flex-col items-center justify-center gap-0.5 w-full py-2 transition-all duration-200 ${
      active ? "text-sky-600" : "text-gray-400"
    }`;

  const bubbleCls = (active) =>
    `flex items-center justify-center w-10 h-7 rounded-full transition-transform duration-200 ${
      active ? "scale-110" : "scale-100"
    }`;

  const labelCls = (active) =>
    `text-[10px] leading-none font-medium transition-all duration-200 ${
      active ? "text-[11px] font-semibold" : "text-[10px] font-medium"
    }`;

  const dotCls = (active) =>
    `h-1 w-2 rounded-full bg-sky-500 transition-all duration-200 mt-0.5 ${
      active ? "opacity-100 scale-100" : "opacity-0 scale-0"
    }`;

  return (
    <nav className="fixed bottom-1 pb-0.5 inset-x-0 z-50 lg:hidden bg-white/90 backdrop-blur-3xl border-t border-gray-100 shadow-[0_-2px_16px_rgba(0,0,0,0.08)] rounded-full">
      <ul className="flex">

        {/* Home */}
        <li className="flex-1">
          <NavLink to="/" end className={({ isActive }) => itemCls(isActive)}>
            {({ isActive }) => (
              <>
                <span className={bubbleCls(isActive)}>
                  <BiSolidHome className={`transition-all duration-200 ${isActive ? "text-[28px]" : "text-[25px]"}`} />
                </span>
                {/* <span className={labelCls(isActive)}>Home</span> */}
                <span className={dotCls(isActive)} aria-hidden="true" />
              </>
            )}
          </NavLink>
        </li>

        {/* Shop */}
        <li className="flex-1">
          <NavLink to="/collections/all" className={({ isActive }) => itemCls(isActive)}>
            {({ isActive }) => (
              <>
                <span className={bubbleCls(isActive)}>
                  <FaStore className={`transition-all duration-200 ${isActive ? "text-[28px]" : "text-[25px]"}`} />
                </span>
                {/* <span className={labelCls(isActive)}>Shop</span> */}
                <span className={dotCls(isActive)} aria-hidden="true" />
              </>
            )}
          </NavLink>
        </li>

        {/* Wishlist */}
        <li className="flex-1">
          <button
            onClick={() => navigate("/wishlist")}
            className={itemCls(isWishlistActive)}
          >
            <span className={bubbleCls(isWishlistActive)}>
              <FaHeart className={`transition-all duration-200 ${isWishlistActive ? "text-[28px]" : "text-[25px]"}`} />
            </span>
            {/* <span className={labelCls(isWishlistActive)}>Wishlist</span> */}
            <span className={dotCls(isWishlistActive)} aria-hidden="true" />
          </button>
        </li>

        {/* Cart */}
        <li className="flex-1">
          <NavLink to="/cart" className={({ isActive }) => itemCls(isActive)}>
            {({ isActive }) => (
              <>
                <span className={`${bubbleCls(isActive)} relative`}>
                  <FaShoppingBag className={`transition-all duration-200 ${isActive ? "text-[25px]" : "text-[22px]"}`} />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-sky-500 text-white text-[9px] font-bold leading-4 text-center">
                      {cartItemCount > 99 ? "99+" : cartItemCount}
                    </span>
                  )}
                </span>
                {/* <span className={labelCls(isActive)}>Cart</span> */}
                <span className={dotCls(isActive)} aria-hidden="true" />
              </>
            )}
          </NavLink>
        </li>

        {/* Profile */}
        <li className="flex-1">
          <NavLink
            to="/profile"
            className={({ isActive }) => itemCls(isActive)}
          >
            {({ isActive }) => (
              <>
                <span className={bubbleCls(isActive)}>
                  <FaUser className={`transition-all duration-200 ${isActive ? "text-[28px]" : "text-[25px]"}`} />
                </span>
                {/* <span className={labelCls(isActive)}>Profile</span> */}
                <span className={dotCls(isActive)} aria-hidden="true" />
              </>
            )}
          </NavLink>
        </li>

      </ul>
    </nav>
  );
};

export default MobileFooterNav;
