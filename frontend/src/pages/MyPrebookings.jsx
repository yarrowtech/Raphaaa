import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { toast } from "sonner";
import { addToCart } from "../redux/slices/cartSlice";

const STATUS_STYLES = {
  booked:    { label: "Reserved — In the Making", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  ready:     { label: "Ready to Buy!",            className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  fulfilled: { label: "Purchased",                className: "bg-sky-50 text-sky-700 border border-sky-200" },
  cancelled: { label: "Cancelled",                className: "bg-gray-100 text-gray-500 border border-gray-200" },
};

const MyPrebookings = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, guestId } = useSelector((state) => state.auth);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [checkoutId, setCheckoutId] = useState(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("userToken");
      const { data } = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/prebookings/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load your prebookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancel = async (id) => {
    setCancellingId(id);
    try {
      const token = localStorage.getItem("userToken");
      await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/prebookings/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Prebooking cancelled");
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel prebooking");
    } finally {
      setCancellingId(null);
    }
  };

  const handleProceedToCheckout = async (b) => {
    setCheckoutId(b._id);
    try {
      await dispatch(
        addToCart({
          productId: b.product._id,
          quantity: 1,
          size: b.size,
          color: b.color,
          guestId,
          userId: user?._id,
        })
      ).unwrap();
      navigate("/checkout");
    } catch {
      toast.error("Failed to add this product to your cart. Please try again.");
    } finally {
      setCheckoutId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
        <span className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Loading your prebookings…</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">My Prebookings</h1>
      <p className="text-sm text-gray-500 mb-8">
        Products you've reserved ahead of stock arriving.
      </p>

      {bookings.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-2xl">
          <p className="text-gray-500 mb-4">You haven't prebooked any products yet.</p>
          <Link
            to="/collections/all"
            className="inline-flex px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-600 rounded-full hover:from-sky-600 hover:to-blue-700 transition"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const style = STATUS_STYLES[b.status] || STATUS_STYLES.booked;
            const product = b.product || {};
            const image = product.images?.[0]?.url;

            return (
              <div
                key={b._id}
                className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-white border border-gray-200 rounded-2xl shadow-sm"
              >
                <img
                  src={image || "/placeholder.png"}
                  alt={product.name || "Product"}
                  className="w-20 h-20 rounded-xl object-cover bg-gray-100 shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{product.name || "Product"}</p>
                  {product.price !== undefined && (
                    <p className="text-sm text-gray-500">₹{Number(product.price).toLocaleString("en-IN")}</p>
                  )}
                  {(b.color || b.size) && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {[b.color, b.size].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <span
                    className={`inline-block mt-2 text-xs font-semibold px-2.5 py-1 rounded-full ${style.className}`}
                  >
                    {style.label}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {b.status === "booked" && (
                    <button
                      onClick={() => handleCancel(b._id)}
                      disabled={cancellingId === b._id}
                      className="px-3 py-2 text-xs font-semibold text-red-600 border border-red-200 rounded-full hover:bg-red-50 transition disabled:opacity-50"
                    >
                      {cancellingId === b._id ? "Cancelling…" : "Cancel"}
                    </button>
                  )}

                  {b.status === "ready" && product._id && (
                    <button
                      onClick={() => handleProceedToCheckout(b)}
                      disabled={checkoutId === b._id}
                      className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-600 rounded-full hover:from-sky-600 hover:to-blue-700 transition disabled:opacity-50"
                    >
                      {checkoutId === b._id ? "Adding…" : "Proceed to Checkout"}
                    </button>
                  )}

                  {b.status === "fulfilled" && b.order?._id && (
                    <Link
                      to={`/order/${b.order._id}`}
                      className="px-4 py-2 text-xs font-semibold text-sky-700 border border-sky-200 rounded-full hover:bg-sky-50 transition"
                    >
                      View Order
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyPrebookings;
