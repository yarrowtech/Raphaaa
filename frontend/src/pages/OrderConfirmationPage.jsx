import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { clearCart } from "../redux/slices/cartSlice";
import axios from "axios";

const OrderConfirmationPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { order: checkoutOrder } = useSelector((state) => state.checkout);
  const { state } = useLocation();
  const [fetchedOrder, setFetchedOrder] = React.useState(null);
  const [loadingOrder, setLoadingOrder] = React.useState(false);
  const stateOrder = state?.order || checkoutOrder;
  const orderId = fetchedOrder?._id || fetchedOrder?.id || stateOrder?._id || stateOrder?.id || state?.orderId;
  const order = fetchedOrder || stateOrder;
  const orderItems = order?.orderItems || order?.checkoutItems || [];
  const transactionId =
    order?.paymentResult?.id ||
    order?.razorpayPaymentId ||
    state?.transactionId ||
    "N/A";
  const appliedCouponCodes = Array.isArray(order?.couponSnapshot?.codes)
    ? order.couponSnapshot.codes
    : [];
  const appliedCouponDiscount = Number(order?.couponSnapshot?.totalDiscount || 0);
  // useEffect(() => {
  //   if (checkout && checkout._id) {
  //     dispatch(clearCart());
  //     localStorage.removeItem("cart");
  //   } else {
  //     navigate("/my-orders");
  //   }
  // }, [checkout, dispatch, navigate]);

  useEffect(() => {
    if (!orderId) navigate("/my-orders");
  }, [orderId, navigate]);

  // Only clear the cart once we know the order is actually confirmed — COD orders
  // are confirmed on creation, but an online order isn't confirmed until paid.
  // Clearing the cart for an unpaid online order would make it unrecoverable.
  const isCOD = order?.paymentMethod === "cash_on_delivery" || state?.paymentMethod === "cash_on_delivery";
  const isPaidOnline = order?.paymentMethod && order.paymentMethod !== "cash_on_delivery" && order.isPaid;
  const isConfirmed = Boolean(order) && (isCOD || isPaidOnline);

  useEffect(() => {
    if (isConfirmed) {
      dispatch(clearCart());
      localStorage.removeItem("cart");
    }
  }, [isConfirmed, dispatch]);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId || state?.isGuest) return;
      try {
        setLoadingOrder(true);
        const token = localStorage.getItem("userToken");
        const { data } = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/orders/${orderId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setFetchedOrder(data);
      } catch (error) {
        console.error(
          "Failed to fetch order details:",
          error?.response?.data?.message || error.message
        );
      } finally {
        setLoadingOrder(false);
      }
    };
    fetchOrderDetails();
  }, [orderId, state?.isGuest]);

  const calculateEstimatedDelivery = (createdAt) => {
    const orderDate = new Date(createdAt);
    orderDate.setDate(orderDate.getDate() + 10);
    return orderDate.toLocaleDateString();
  };

  const handleDownloadInvoice = async () => {
    if (!orderId || state?.isGuest) return;
    try {
      const token = localStorage.getItem("userToken");
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/orders/${orderId}/invoice`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        }
      );

      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `Invoice_${order.orderId || orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Failed to download invoice:", error?.response?.data?.message || error.message);
      alert("Failed to download invoice. Please try again.");
    }
  };

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* ── Header: success only once the order is actually confirmed/paid ── */}
        {!loadingOrder && order && !isConfirmed ? (
          <div className="text-center space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold text-amber-600 mt-2">
              Payment Not Completed
            </h1>
            <p className="text-sm text-gray-500">
              We couldn't confirm payment for this order yet. Your cart has been kept. Check your payment status before trying again.
            </p>
            <button
              onClick={() => navigate("/checkout")}
              className="mt-3 px-5 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition"
            >
              Return to Checkout
            </button>
          </div>
        ) : isConfirmed ? (
          <div className="text-center space-y-1">
            <img
              src="https://i.gifer.com/IDDV.gif"
              alt="Order placed!"
              className="mx-auto w-40 h-40 object-contain"
            />
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mt-2">
              Order Placed Successfully! 🎉
            </h1>
            <p className="text-sm text-gray-500">
              {state?.isGuest
                ? `A confirmation will be sent to ${state?.order?.guestEmail || "your email"}.`
                : "A confirmation email has been sent to your registered email address."}
            </p>
            {state?.isGuest && (
              <p className="text-xs text-sky-600 mt-1">
                <button onClick={() => navigate("/register")} className="underline hover:text-sky-800">
                  Create an account
                </button>{" "}
                for a faster checkout next time. Keep your order reference for support.
              </p>
            )}
          </div>
        ) : null}

        {/* ── Loading ── */}
        {loadingOrder && (
          <div className="flex items-center justify-center gap-3 py-12 text-gray-500 text-sm">
            <span className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
            Loading order details…
          </div>
        )}

        {!loadingOrder && order && isConfirmed && (
          <>
            {/* ── Order ref card ── */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest">Order Reference</p>
                <p className="text-sm font-mono font-bold text-gray-800">{order.orderId || orderId}</p>
                <p className="text-xs text-gray-500">
                  Placed on {order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "—"}
                </p>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-white border border-emerald-200 px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {order.status || "Processing"}
                </div>
                {order.createdAt && (
                  <p className="text-xs text-gray-500">
                    Est. delivery: <span className="font-semibold text-sky-700">{calculateEstimatedDelivery(order.createdAt)}</span>
                  </p>
                )}
              </div>
            </div>

            {/* ── Items ── */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                  Items Ordered ({orderItems.length})
                </p>
              </div>
              {orderItems.length === 0 ? (
                <p className="px-5 py-6 text-sm text-gray-400 text-center">No item details available.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {orderItems.map((item) => (
                    <div key={item.productId || item._id || item.name}
                      className="flex items-center gap-4 px-5 py-4"
                    >
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
                        <img src={item.image} alt={item.name}
                          className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {item.color && <span>{item.color}</span>}
                          {item.color && item.size && <span> · </span>}
                          {item.size && <span>Size {item.size}</span>}
                          {item.sku && <span className="ml-2 font-mono text-gray-400">SKU: {item.sku}</span>}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-gray-800">₹{(item.price * item.quantity).toLocaleString("en-IN")}</p>
                        <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Total row */}
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 space-y-2">
                {appliedCouponCodes.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">
                      Coupon Applied
                    </span>
                    <span className="text-xs font-bold text-emerald-700">
                      {appliedCouponCodes.join(", ")}
                    </span>
                  </div>
                )}
                {appliedCouponDiscount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Coupon Discount</span>
                    <span className="text-xs font-bold text-emerald-600">
                      − ₹{appliedCouponDiscount.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
                {order.totalPrice && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Order Total</span>
                    <span className="text-base font-extrabold text-sky-700">
                      ₹{order.totalPrice.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Payment + Shipping ── */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Payment */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-3">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Payment</p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Method</span>
                    <span className="font-semibold text-gray-800 capitalize">
                      {(order.paymentMethod || state?.paymentMethod || "—").replace("_", " ")}
                    </span>
                  </div>
                  {transactionId !== "N/A" && (
                    <div className="flex items-start justify-between text-sm gap-2">
                      <span className="text-gray-500 shrink-0">Txn ID</span>
                      <span className="font-mono text-xs text-gray-600 text-right break-all">{transactionId}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Status</span>
                    <span className="text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      {order.isPaid ? "Paid" : "Pending"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Shipping */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-3">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Ship To</p>
                <div className="text-sm text-gray-700 leading-relaxed">
                  {order.shippingAddress ? (
                    <>
                      {[order.shippingAddress.firstName, order.shippingAddress.lastName].filter(Boolean).join(" ") && (
                        <p className="font-semibold text-gray-800">
                          {[order.shippingAddress.firstName, order.shippingAddress.lastName].filter(Boolean).join(" ")}
                        </p>
                      )}
                      <p className="text-gray-500">{order.shippingAddress.address || "—"}</p>
                      {order.shippingAddress.landmark && (
                        <p className="text-gray-500">{order.shippingAddress.landmark}</p>
                      )}
                      <p className="text-gray-500">
                        {[order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.postalCode].filter(Boolean).join(", ")}
                      </p>
                      <p className="text-gray-500">{order.shippingAddress.country}</p>
                      {order.shippingAddress.phone && (
                        <p className="text-gray-500 mt-1">📞 +91 {order.shippingAddress.phone}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-400">Address unavailable</p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Actions ── */}
            <div className="flex flex-col sm:flex-row gap-3">
              {!state?.isGuest && <><button
                onClick={handleDownloadInvoice}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-sky-400 hover:text-sky-700 hover:bg-sky-50 transition"
              >
                📄 Download Invoice
              </button>
              <button
                onClick={() => navigate("/profile")}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-sky-200 bg-sky-50 text-sm font-semibold text-sky-700 hover:bg-sky-100 transition"
              >
                📦 Track My Order
              </button></>}
              <button
                onClick={() => navigate("/collections/all")}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-linear-to-r from-sky-600 to-blue-700 text-white text-sm font-bold hover:opacity-90 transition shadow-sm"
              >
                🛍️ Continue Shopping
              </button>
            </div>
          </>
        )}

        {!loadingOrder && !order && (
          <div className="text-center py-16 space-y-3">
            <p className="text-4xl">📋</p>
            <p className="text-sm font-semibold text-gray-600">Order details are unavailable right now.</p>
            <button onClick={() => navigate("/profile")}
              className="mt-2 px-5 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition">
              View My Orders
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderConfirmationPage;
