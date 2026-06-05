import { IoIosClose } from "react-icons/io";
import CartContents from "../Cart/CartContents";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchCart } from "../../redux/slices/cartSlice";
import { useEffect } from "react";

const CartDrawer = ({ drawerOpen, toggleCartDrawer }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, guestId } = useSelector((state) => state.auth);
  const { cart } = useSelector((state) => state.cart);
  const userId = user ? user._id : null;

  useEffect(() => {
    if (!drawerOpen) return;

    if (userId) {
      dispatch(fetchCart({ userId }));
      return;
    }

    if (guestId) {
      dispatch(fetchCart({ guestId }));
    }
  }, [dispatch, drawerOpen, guestId, userId]);

  const handleCheckout = () => {
    toggleCartDrawer();
    navigate("/checkout");
  };

  return (
    <>
      {/* Overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 bg-opacity-40 z-40"
          onClick={toggleCartDrawer}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 w-3/4 sm:w-1/2 md:w-[30rem] h-full bg-white backdrop-blur-md shadow-lg transform transition-transform duration-300 flex flex-col z-50 ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
        onClick={(e) => e.stopPropagation()} // prevent clicks inside drawer from closing it
      >
        {/* Close Button */}
        <div className="flex justify-end p-4">
          <button
            onClick={toggleCartDrawer}
            className="text-gray-600 hover:text-gray-800"
          >
            <IoIosClose className="h-6 w-6 text-gray-600" />
          </button>
        </div>

        {/* Cart Contents — always mounted so saved-for-later persists */}
        <div className="flex-grow p-4 overflow-y-auto">
          <h2 className="text-xl font-semibold mb-4">Cart Summary</h2>
          <CartContents
            cart={cart}
            userId={userId}
            guestId={guestId}
            onContinueShopping={() => { toggleCartDrawer(); navigate("/collections/all"); }}
          />
        </div>

        {/* Checkout Button */}
        <div className="p-4 bg-white sticky bottom-0">
          {cart && cart?.products?.length > 0 && (
            <>
              <button
                onClick={handleCheckout}
                className="w-full bg-linear-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition"
              >
               Proceed to Checkout
              </button>
              <p className="text-sm tracking-tighter text-gray-500 mt-2 text-center">
                Shipping, taxes and discount codes calculated at checkout.
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
};


export default CartDrawer;
