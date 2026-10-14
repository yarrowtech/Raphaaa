import { IoIosClose } from "react-icons/io";
import { useNavigate } from "react-router-dom";


import useModalFocus from "../../hooks/useModalFocus";

const WishlistDrawer = ({ drawerOpen, toggleWishlistDrawer, wishlistItems }) => {
  const modalRef = useModalFocus(drawerOpen, toggleWishlistDrawer);
  const navigate = useNavigate();


  const handleBuyNow = (productId) => {
    toggleWishlistDrawer();
    navigate(`/product/${productId}`);
  };

  return (
    <>
      {/* Overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 bg-opacity-40 z-40"
          onClick={toggleWishlistDrawer}
        />
      )}

      {/* Drawer */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal={drawerOpen ? true : undefined}
        aria-label="Wishlist"
        hidden={!drawerOpen}
        tabIndex={-1}
        className={`fixed top-0 right-0 w-3/4 sm:w-1/2 md:w-[30rem] h-full bg-white shadow-lg transform transition-transform duration-300 flex flex-col z-50 ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <div className="flex justify-end p-4">
          <button
            aria-label="Close wishlist"
            onClick={toggleWishlistDrawer}
            className="text-gray-600 hover:text-gray-800"
          >
            <IoIosClose className="h-6 w-6" />
          </button>
        </div>

        {/* Wishlist Contents */}
        <div className="flex-grow p-4 overflow-y-auto">
          <h2 className="text-xl font-semibold mb-4">Your Wishlist</h2>
          {wishlistItems && wishlistItems.length > 0 ? (
            <div className="space-y-4">
              {wishlistItems.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center gap-4 border p-4 rounded-lg shadow-sm bg-gradient-to-br from-white via-blue-50 to-blue-100"
                >
                  <img
                    src={item.images?.[0]?.url || "/placeholder.png"}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-800">{item.name}</h3>
                    <p className="text-xs text-gray-500 truncate">
                      {item.description}
                    </p>
                  </div>
                  <button
                    onClick={() => handleBuyNow(item._id)}
                    className="text-sm px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Buy Now
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 mt-10">
              <p>Your wishlist is empty.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default WishlistDrawer;
