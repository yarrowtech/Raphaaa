import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import RazorpayButton from "./RazorpayButton";

import { useDispatch, useSelector } from "react-redux";
import {
  createRazorpayOrder,
  createCODOrder,
  verifyRazorpayPayment,
  handlePaymentFailure,
  clearCheckout,
} from "../../redux/slices/checkoutSlice";
import { clearCart } from "../../redux/slices/cartSlice";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

import AddressForm from "./AddressForm";
import { FaPlus } from "react-icons/fa";
import { FaChevronDown, FaChevronRight, FaMapMarkerAlt } from "react-icons/fa";



const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null; // don't render if closed

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 bg-opacity-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-red-500"
        >
          ✖
        </button>
        {children}
        <div className='flex flex-wrap justify-end items-center'>
          <button type="button" className="mt-4 bg-red-500 text-white rounded-lg px-4 py-2" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// — Place this above `const Checkout = () => { ... }` in Checkout.jsx —

const CheckoutProgress = ({ currentStep = 2 }) => {
  // 1 = Cart (previous page), 2 = Review (this page), 3 = Payment
  const steps = [
    { id: 1, label: "Cart" },
    { id: 2, label: "Review" },
    { id: 3, label: "Payment" },
  ];

  return (
    <div className="w-full mb-8">
      {/* Mobile: compact breadcrumb */}
      <div className="md:hidden text-xs font-medium text-gray-600 mb-3">
        {steps.map((s, i) => (
          <span key={s.id} className={s.id === currentStep ? "text-gray-900" : ""}>
            {s.id}. {s.label}
            {i < steps.length - 1 ? "  ›  " : ""}
          </span>
        ))}
      </div>

      {/* Desktop: numbered stepper */}
      {/* Desktop: centered numbered stepper with lines + labels below */}
      <div className="hidden md:flex items-center justify-center">
        {steps.map((s, i) => {
          const active = s.id === currentStep;
          const done = s.id < currentStep;

          return (
            <React.Fragment key={s.id}>
              <div className="flex flex-col items-center text-center">
                <div
                  className={[
                    "w-10 h-10 rounded-full grid place-items-center text-sm font-bold",
                    done
                      ? "bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow"
                      : active
                        ? "bg-gradient-to-br from-sky-600 to-indigo-600 text-white shadow"
                        : "bg-gray-200 text-gray-600",
                  ].join(" ")}
                  aria-current={active ? "step" : undefined}
                >
                  {s.id}
                </div>
                <span
                  className={[
                    "mt-2 text-sm font-semibold tracking-wide",
                    done || active ? "text-gray-900" : "text-gray-500",
                  ].join(" ")}
                >
                  {s.label}
                </span>
              </div>

              {i < steps.length - 1 && (
                <div
                  className={[
                    "h-[3px] w-full md:w-32 lg:w-40 mx-4 rounded-full pb-1 mb-6",
                    done ? "bg-gradient-to-r from-sky-500 to-indigo-500" : "bg-gray-200",
                  ].join(" ")}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

    </div>
  );
};


const Checkout = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const {
    cart,
    loading: cartLoading,
    error: cartError,
  } = useSelector((state) => state.cart);
  const {  similarProducts } = useSelector(
    (state) => state.products
  );
  const { user } = useSelector((state) => state.auth);
  const {
    
    loading: checkoutLoading,
    error: checkoutError,
    razorpayOrderId,
    orderId,
    razorpayKeyId,
    amount,
    currency,
  } = useSelector((state) => state.checkout);

  const [paymentMethod, setPaymentMethod] = useState("razorpay");
  const [orderProcessing, setOrderProcessing] = useState(false);
  
  const [phoneError, setPhoneError] = useState("");
  const [submitDisabled, setSubmitDisabled] = useState(false);
  const [orderInitiated, setOrderInitiated] = useState(false);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(null);
  const [fullUser, setFullUser] = useState(null);
  const [] = useState(false);
  // const [similarProducts, setSimilarProducts] = useState([]);
  const [displayCount, setDisplayCount] = useState(4);
  const [addressesOpen, setAddressesOpen] = useState(false); // collapsible toggle
  const [featuredCollab, setFeaturedCollab] = useState(null);
  // Step state derived only from existing flags (UI-only)
  const currentStep = razorpayOrderId ? 3 : 2; // 1 = Cart (previous page), 2 = Review, 3 = Payment

  // === START: computed totals (use these everywhere instead of cart.totalPrice) ===
  const computedQuantity = (cart?.products || []).reduce(
    (acc, p) => acc + Number(p.quantity || 0),
    0
  );

  const computedSubtotal = Number(
    (cart?.products || []).reduce((sum, p) => {
      // ensure numeric price, default to 0
      const price = parseFloat(p.price) || 0;
      const qty = Number(p.quantity || 0);
      return sum + price * qty;
    }, 0).toFixed(2)
  );

  // shipping rules — change if you have shipping logic
  const shippingFee = 0; // if free shipping; otherwise compute
  const gst = Number((computedSubtotal * 0.00).toFixed(2)); // 5% GST as used earlier
  const computedTotal = Number((computedSubtotal + gst + shippingFee).toFixed(2));


  useEffect(() => {
    const fetchCollab = async () => {
      try {
        const { data } = await axios.get(`${import.meta.env.VITE_BACKEND_URL}`);
        if (data && data.length > 0) {
          setFeaturedCollab(data[0]);
        }
      } catch (err) {
        console.error("Failed to load feature collab", err);
      }
    };
    fetchCollab();
  }, []);


  // useEffect(() => {
  //   // Ideally, fetch from backend based on cart category or most viewed
  //   setSimilarProducts([
  //     {
  //       _id: "1",
  //       name: "Casual Shirt",
  //       price: 999,
  //       discountPrice: 799,
  //       offerPercentage: 20,
  //       rating: 4.5,
  //       numReviews: 18,
  //       images: [{ url: "/images/shirt1.jpg" }],
  //     },
  //     {
  //       _id: "2",
  //       name: "Denim Jacket",
  //       price: 1999,
  //       discountPrice: 1499,
  //       offerPercentage: 25,
  //       rating: 4.8,
  //       numReviews: 23,
  //       images: [{ url: "/images/jacket1.jpg" }],
  //     },
  //     // ... more mock data
  //   ]);
  // }, []);



  const [shippingAddress, setShippingAddress] = useState({
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    postalCode: "",
    country: "India",
    phone: "+91",
  });

  

  useEffect(() => {
    dispatch(clearCheckout());
    setOrderInitiated(false);
  }, [dispatch]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem("userToken");
        const { data } = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/users/profile`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setFullUser(data);
      } catch (error) {
        console.error(
          "Failed to load user profile:",
          error.response?.data?.message || error.message
        );
      }
    };

    fetchUserProfile();
  }, []);

  // useEffect(() => {
  //   if (
  //     !orderProcessing &&
  //     (!cart || !cart.products || cart.products.length === 0)
  //   ) {
  //     navigate("/");
  //   }
  // }, [cart, navigate, orderProcessing]);

  useEffect(() => {
  if (
    !orderProcessing &&
    !orderInitiated && // ✅ prevent redirect while payment just finished
    (!cart || !cart.products || cart.products.length === 0)
  ) {
    navigate("/");
  }
}, [cart, navigate, orderProcessing, orderInitiated]);


  const validatePhone = (phone) => {
    if (!phone.startsWith("+91")) {
      phone = "+91" + phone.replace(/^\+91/, ""); // silently add +91
    }
    const phoneWithoutCode = phone.slice(3);
    if (phoneWithoutCode.length !== 10 || !/^\d{10}$/.test(phoneWithoutCode)) {
      setPhoneError("Phone number must be exactly 10 digits after +91");
      return false;
    }
    setPhoneError("");
    return true;
  };

  

  

  const handleAddressSelect = (address, index) => {
    setSelectedAddressIndex(index);

    // Split full name into first and last
    const nameParts = fullUser?.name?.split(" ") || [];
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";
    setShippingAddress({
      firstName: firstName,
      lastName: lastName,
      address: address.address || "",
      city: address.city || "",
      postalCode: address.postalCode || "",
      country: address.country || "India",
      phone: address.phone?.toString() || "",
    });
    validatePhone(address.phone?.toString() || "");
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!validatePhone(shippingAddress.phone)) return;
    if (orderInitiated || submitDisabled) return;

    if (cart && cart.products.length > 0) {
      setOrderProcessing(true);
      setSubmitDisabled(true);
      setOrderInitiated(true);

      const shipping = {
        firstName: shippingAddress.firstName,
        lastName: shippingAddress.lastName,
        address: shippingAddress.address,
        city: shippingAddress.city,
        postalCode: shippingAddress.postalCode,
        country: shippingAddress.country,
        phone: shippingAddress.phone,
      };

      const orderData = {
        orderItems: cart.products.map((p) => ({
          productId: p.productId,
          name: p.name,
          image: p.image,
          price: p.price,
          quantity: p.quantity,
          size: p.size,
          color: p.color,
          sku: p.sku,
        })),
        shippingAddress: shipping,
        paymentMethod,
        totalPrice: cart.totalPrice,
        idempotencyKey: uuidv4(), // Add idempotency key
      };

      try {
        if (paymentMethod === "cash_on_delivery") {
          const result = await dispatch(createCODOrder(orderData));
          if (result.type === "checkout/createCODOrder/fulfilled") {
            dispatch(clearCart());
            dispatch(clearCheckout());
            setOrderInitiated(false);
            navigate("/order-confirmation", {
              state: {
                order: result.payload,
                paymentMethod: "cash_on_delivery",
              },
            });
          } else {
            console.error("[ERROR] COD Order Creation Failed:", result.error);
            alert(
              result.error?.message ||
              "Failed to create COD order. Please try again."
            );
            setOrderInitiated(false);
          }
        } else {
          const result = await dispatch(createRazorpayOrder(orderData));
          if (result.type === "checkout/createRazorpayOrder/fulfilled") {
            if (result.payload.amount !== cart.totalPrice) {
              alert(
                `A pending order (${result.payload.orderId}) exists with a different amount (₹${result.payload.amount}). Please complete or cancel it.`
              );
              dispatch(clearCheckout());
              setOrderInitiated(false);
              navigate("/order-confirmation", {
                state: { orderId: result.payload.orderId },
              });
            } else {
              setOrderProcessing(false); // Proceed to Razorpay payment
            }
          } else {
            console.error(
              "[ERROR] Razorpay Order Creation Failed:",
              result.error
            );
            alert(
              result.error?.message ||
              "Failed to create Razorpay order. Please try again."
            );
            setOrderInitiated(false);
          }
        }
      } catch (error) {
        console.error("[ERROR] Order creation error:", error);
        alert("Failed to create order. Please try again.");
        setOrderInitiated(false);
      } finally {
        setSubmitDisabled(false);
      }
    }
  };

  // const handleRazorpaySuccess = async (paymentData) => {
  //   try {
  //     setOrderProcessing(true);
  //     const result = await dispatch(
  //       verifyRazorpayPayment({
  //         razorpayPaymentId: paymentData.razorpay_payment_id,
  //         razorpayOrderId,
  //         razorpaySignature: paymentData.razorpay_signature,
  //         orderId,
  //       })
  //     );

  //     if (result.type === "checkout/verifyRazorpayPayment/fulfilled") {
  //       dispatch(clearCart());
  //       dispatch(clearCheckout());
  //       setOrderInitiated(false);
  //       navigate("/order-confirmation", {
  //         state: { order: result.payload.order, paymentMethod: "razorpay" },
  //       });
  //     } else {
  //       console.error("[ERROR] Payment verification failed:", result.error);
  //       alert(
  //         result.error?.message ||
  //         "Payment verification failed. Please contact support."
  //       );
  //       setOrderInitiated(false);
  //     }
  //   } catch (error) {
  //     console.error("[ERROR] Payment processing error:", error);
  //     alert("Payment processing failed. Please contact support.");
  //     setOrderInitiated(false);
  //   } finally {
  //     setOrderProcessing(false);
  //   }
  // };

  const handleRazorpaySuccess = async (paymentData) => {
  try {
    setOrderProcessing(true);
    const result = await dispatch(
      verifyRazorpayPayment({
        razorpayPaymentId: paymentData.razorpay_payment_id,
        razorpayOrderId,
        razorpaySignature: paymentData.razorpay_signature,
        orderId,
      })
    );

    // if (result.type === "checkout/verifyRazorpayPayment/fulfilled") {
    //   dispatch(clearCart());
    //   dispatch(clearCheckout());
    //   setOrderInitiated(false);
    //   navigate("/order-confirmation", {
    //     state: { order: result.payload.order, paymentMethod: "razorpay" },
    //   });
    // } 
//     if (result.type === "checkout/verifyRazorpayPayment/fulfilled") {
//   await dispatch(clearCart());
//   await dispatch(clearCheckout());
//   setOrderInitiated(false);
//   setTimeout(() => {
//     navigate("/order-confirmation", {
//       state: { order: result.payload.order, paymentMethod: "razorpay" },
//     });
//   }, 500);
// }

//     else {
//       console.warn("Verification fallback: clearing cart anyway.");
//       dispatch(clearCart());
//       dispatch(clearCheckout());
//       navigate("/order-confirmation", {
//         state: { paymentMethod: "razorpay" },
//       });
//     }
if (result.type === "checkout/verifyRazorpayPayment/fulfilled") {
  await dispatch(clearCart());
  await dispatch(clearCheckout());
  setOrderInitiated(false);

  // ✅ Wait a bit to ensure Redux clears before navigation
  setTimeout(() => {
    navigate("/order-confirmation", {
      state: { order: result.payload.order, paymentMethod: "razorpay" },
    });
  }, 800);
} else {
  console.warn("Verification fallback: clearing cart anyway.");
  await dispatch(clearCart());
  await dispatch(clearCheckout());
  setTimeout(() => {
    navigate("/order-confirmation", {
      state: { paymentMethod: "razorpay" },
    });
  }, 800);
}
  } catch (error) {
    console.error("[ERROR] Payment processing error:", error);
    alert("Payment processing failed. Please contact support.");
    setOrderInitiated(false);
  } finally {
    setOrderProcessing(false);
  }
};


  const handleRazorpayError = async (errorData) => {
    console.error("[ERROR] Razorpay error:", errorData);
    setOrderProcessing(false);

    try {
      await dispatch(
        handlePaymentFailure({
          razorpayOrderId,
          error_code: errorData.error.code,
          error_description: errorData.error.description,
        })
      );
      alert(
        `Payment failed: ${errorData.error.description || "Unknown error"
        }. Please try again.`
      );
      dispatch(clearCheckout());
      setOrderInitiated(false);
    } catch (error) {
      console.error("[ERROR] Failed to handle payment failure:", error);
      alert("Payment failed and status update failed. Please contact support.");
      setOrderInitiated(false);
    }
  };

  const loading = cartLoading || checkoutLoading;
  const error = cartError || checkoutError;

  // if (loading) return <p>Loading cart...</p>;

  // near other useEffects in Checkout.jsx
  useEffect(() => {
    const onAddressUpdated = (e) => {
      const next = Array.isArray(e.detail) ? e.detail : e.detail?.addresses;
      if (!Array.isArray(next)) return;

      // update local user snapshot so “Select Saved Address” re-renders
      setFullUser((prev) => ({ ...(prev || {}), addresses: next }));

      // (optional) close the modal after successful save:
      setIsModalOpen(false);

      // (optional) auto-select the newly added address:
      // handleAddressSelect(next[next.length - 1], next.length - 1);
    };
    window.addEventListener("address:list-updated", onAddressUpdated);
    return () => window.removeEventListener("address:list-updated", onAddressUpdated);
  }, []);
  // Automatically trigger Razorpay modal when orderId is ready
useEffect(() => {
  if (razorpayOrderId && paymentMethod === "razorpay") {
    const payBtn = document.getElementById("autoPayButton");
    if (payBtn) payBtn.click();
  }
}, [razorpayOrderId, paymentMethod]);


  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white p-6 rounded-xl border border-gray-300 shadow-md">
              <div className="h-4 bg-gray-300 rounded w-1/2 mb-4"></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
              <div className="mt-4 h-4 bg-gray-300 rounded w-1/3"></div>
            </div>
          ))}
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-300 shadow-md animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-1/2 mb-4"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-20 h-24 bg-gray-200 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            ))}
            <div className="h-4 bg-gray-300 rounded w-1/3 mt-6"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) return <p>Error: {error}</p>;
  if (
    !orderProcessing &&
    (!cart || !cart.products || cart.products.length === 0)
  ) {
    return <p>Your cart is empty!!</p>;
  }

  return (
    <div className="max-w-7xl mx-auto py-12 px-6">
      <CheckoutProgress currentStep={currentStep} />
      <div className="flex flex-col justify-evenly lg:flex-row gap-10">
        {/* Left: Checkout Form */}
        {/* <div className="w-full lg:w-2/3 bg-gradient-to-br from-white to-gray-100 rounded-2xl shadow-2xl p-8 border border-gray-300"> */}
        <div className="w-full lg:w-2/4 bg-gradient-to-br from-white to-gray-100 rounded-2xl shadow-2xl p-8 border border-gray-300 self-start">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 uppercase tracking-tight">
            Checkout
          </h2>
          <form onSubmit={handleCreateOrder}>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Contact Details
            </h3>
            <div className="mb-6">
              <label className="block text-sm text-gray-500 mb-1">Email</label>
              <input
                type="email"
                value={user ? user.email : ""}
                className="w-full p-3 border border-gray-300 rounded-xl bg-slate-100 text-gray-500"
                disabled
              />
            </div>

            <h3 className="text-lg font-semibold text-gray-800 mb-4">Delivery</h3>
            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-xl"
                  required
                  value={shippingAddress.firstName}
                  onChange={(e) =>
                    setShippingAddress({
                      ...shippingAddress,
                      firstName: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-xl"
                  required
                  value={shippingAddress.lastName}
                  onChange={(e) =>
                    setShippingAddress({
                      ...shippingAddress,
                      lastName: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            {/* {fullUser?.addresses?.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Select Saved Address
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fullUser.addresses.map((addr, index) => (
                    <div
                      key={index}
                      className={`border border-gray-300 rounded-xl p-4 cursor-pointer ${selectedAddressIndex === index
                        ? "border-blue-600 bg-blue-50 ring-2 ring-blue-500"
                        : "border-gray-300 hover:border-gray-400"
                        }`}
                      onClick={() => handleAddressSelect(addr, index)}
                    >
                      <p className="text-sm font-medium text-gray-900">
                        {fullUser?.name}
                      </p>

                      <p className="text-sm text-gray-500">{addr.address}</p>
                      <p className="text-sm text-gray-500">
                        {addr.city}, {addr.postalCode}, {addr.country}
                      </p>
                      <p className="text-sm text-gray-500">Ph.: {addr.phone}</p>
                    </div>
                  ))}
                </div>
              </div>
            )} */}
            {fullUser?.addresses?.length > 0 && (
              <div className="mb-6 border border-gray-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setAddressesOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100"
                  aria-expanded={addressesOpen}
                >
                  <span className="text-lg font-semibold text-gray-800">
                    Select Saved Address
                    <span className="ml-2 text-sm text-gray-500">
                      ({fullUser.addresses.length})
                    </span>
                  </span>
                  {addressesOpen ? (
                    <FaChevronDown className="text-gray-600" />
                  ) : (
                    <FaChevronRight className="text-gray-600" />
                  )}
                </button>

                {addressesOpen && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {fullUser.addresses.map((addr, index) => (
                      <div
                        key={index}
                        className={`border rounded-xl p-4 cursor-pointer transition ${selectedAddressIndex === index
                          ? "border-blue-600 bg-blue-50 ring-2 ring-blue-500"
                          : "border-gray-300 hover:border-gray-400"
                          }`}
                        onClick={() => handleAddressSelect(addr, index)}
                      >
                        <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          <FaMapMarkerAlt className="text-blue-600" />
                          {fullUser?.name}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">{addr.address}</p>
                        <p className="text-sm text-gray-600">
                          {addr.city}, {addr.postalCode}, {addr.country}
                        </p>
                        <p className="text-sm text-gray-600">Ph.: {addr.phone}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* <p
              className="text-blue-600 underline cursor-pointer"
              onClick={() => setIsModalOpen(true)}
            >
              Click here to open form
            </p> */}
            <button
              type="button"
              className="bg-blue-600 text-white p-1 mb-2 rounded-md px-2"
              onClick={() => setIsModalOpen(true)}
            >
              <FaPlus className="inline mb-1" size={15} />  Add New Address
            </button>

            {/* Modal */}

            <br />
            {/* <span>
              If you want to add custom address you can enter the address here:
            </span>
            <div className="mb-4">
              <label className="block text-sm text-gray-500 mb-1">Address</label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-xl"
                required
                value={shippingAddress.address}
                onChange={(e) =>
                  setShippingAddress({
                    ...shippingAddress,
                    address: e.target.value,
                  })
                }
              />
            </div>

            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">
                  PIN Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full p-3 border border-gray-300 rounded-xl"
                    required
                    value={shippingAddress.postalCode}
                    onChange={handlePinCodeChange}
                    placeholder="Enter 6-digit PIN code"
                    maxLength="6"
                    pattern="\d{6}"
                  />
                  {addressLoading && (
                    <div className="absolute right-3 top-3">
                      <div className="animate-spin rounded-full h-5 w-5 border border-gray-300-b-2 border-gray-300-gray-600"></div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">City</label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-xl"
                  required
                  value={shippingAddress.city}
                  onChange={(e) =>
                    setShippingAddress({
                      ...shippingAddress,
                      city: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">
                  Country
                </label>
                <select
                  className="w-full p-3 border border-gray-300 rounded-xl"
                  required
                  value={shippingAddress.country}
                  onChange={(e) =>
                    setShippingAddress({
                      ...shippingAddress,
                      country: e.target.value,
                    })
                  }
                >
                  <option value="">Select Country</option>
                  {countries.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Phone</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-gray-300 border-gray-300-r-0 border-gray-300-gray-300 bg-slate-100 text-gray-500 text-sm">
                    +91
                  </span>
                  <input
                    type="tel"
                    className={`w-full p-3 border border-gray-300 rounded-r-lg ${phoneError ? "border border-gray-300-red-500" : "border border-gray-300-gray-300"
                      }`}
                    required
                    value={shippingAddress.phone.replace("+91", "")}
                    onChange={(e) =>
                      handlePhoneChange({
                        target: { value: "+91" + e.target.value },
                      })
                    }
                    placeholder="Enter 10-digit mobile number"
                    maxLength={10}
                  />
                </div>
                {phoneError && (
                  <p className="text-sm text-red-500 mt-1">{phoneError}</p>
                )}
              </div>
            </div> */}

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Payment Method
              </h3>
              <div className="space-y-3">
                <label className="flex items-center p-3 border border-gray-300 rounded-xl cursor-pointer hover:bg-blue-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="razorpay"
                    checked={paymentMethod === "razorpay"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-3"
                  />
                  <div className="flex items-center">
                    <span className="text-sm font-medium">
                      Online Payment (Razorpay)
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      UPI, Cards, Net Banking, Wallet
                    </span>
                  </div>
                </label>
                <label className="flex items-center p-3 border border-gray-300 rounded-xl cursor-pointer hover:bg-blue-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cash_on_delivery"
                    checked={paymentMethod === "cash_on_delivery"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-3"
                  />
                  <div className="flex items-center">
                    <span className="text-sm font-medium">Cash on Delivery</span>
                    <span className="ml-2 text-xs text-gray-500">
                      Pay when you receive
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* <div className="mt-6">
              {!razorpayOrderId ? (
                <button
                  type="submit"
                  className="w-full bg-blue-700 text-white tracking-wide py-3 rounded-xl hover:bg-blue-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={
                    loading ||
                    orderProcessing ||
                    phoneError ||
                    submitDisabled ||
                    orderInitiated
                  }
                >
                  {loading || orderProcessing
                    ? "Processing..."
                    : "Continue to Payment"}
                </button>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold mb-4">Complete Payment</h3>
                  <RazorpayButton
                    amount={amount}
                    currency={currency}
                    name={`${shippingAddress.firstName} ${shippingAddress.lastName}`}
                    email={user?.email}
                    contact={shippingAddress.phone}
                    orderId={razorpayOrderId}
                    keyId={razorpayKeyId}
                    onSuccess={handleRazorpaySuccess}
                    onError={handleRazorpayError}
                  />
                </div>
              )}
            </div> */}
            <div className="mt-6">
              {!razorpayOrderId ? (
                <button
                  type="submit"
                  className="w-full bg-blue-700 text-white tracking-wide py-3 rounded-xl hover:bg-blue-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={
                    loading ||
                    orderProcessing ||
                    phoneError ||
                    submitDisabled ||
                    orderInitiated
                  }
                >
                  {loading || orderProcessing
                    ? "Processing..."
                    : paymentMethod === "razorpay"
                      ? "Pay ₹" + computedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " with Razorpay"
                      : "Place Order (Cash on Delivery)"}
                </button>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold mb-4">Complete Payment</h3>
                  <RazorpayButton
                    amount={amount}
                    currency={currency}
                    name={`${shippingAddress.firstName} ${shippingAddress.lastName}`}
                    email={user?.email}
                    contact={shippingAddress.phone}
                    orderId={razorpayOrderId}
                    keyId={razorpayKeyId}
                    onSuccess={handleRazorpaySuccess}
                    onError={handleRazorpayError}
                  />
                </div>
              )}
            </div>

          </form>
        </div>
        {/* </div> */}

        {/* Right: Order Summary + Similar Products */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6">
          {/* Order Summary Card */}
          {/* <div className="bg-blue-50 p-8 rounded-2xl border border-gray-300 shadow-md self-start"> */}
          <div className="bg-blue-50 p-8 rounded-2xl border border-gray-300 shadow-md self-start">
            <h3 className="text-2xl font-semibold text-gray-900 mb-6">
              Order Summary
            </h3>
            <div className="space-y-6">
              {cart?.products?.map((product, index) => (
                <div key={index} className="flex items-start gap-4 pb-4">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-20 h-24 object-cover rounded-md border border-gray-300"
                  />
                  <div className="flex-1">
                    <h4 className="text-md font-semibold text-gray-800">
                      {product.name}
                    </h4>
                    <p className="text-sm text-gray-500">Size: {product.size}</p>
                    <p className="text-sm text-gray-500">Color: {product.color}</p>
                    <p className="text-sm text-gray-500">
                      Quantity: {product.quantity}
                    </p>
                  </div>
                  <p className="text-lg font-medium text-gray-900">
                    ₹{(product.price * product.quantity).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-2 text-lg text-gray-800">
              <div className="flex justify-between">
                <span>Total Quantity</span>
                <span>{computedQuantity} items</span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{computedSubtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="text-green-600 font-medium">{shippingFee === 0 ? "Free" : `₹${shippingFee.toFixed(2)}`}</span>
              </div>
              {paymentMethod === "cash_on_delivery" && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>COD Charges</span>
                  <span>₹0</span>
                </div>
              )}
              <hr />
              <div className="flex justify-between pt-4 font-semibold text-gray-900">
                <span>Total</span>
                <span>₹{computedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              {/* Deliver-to summary (auto-updates on select/typing) */}
              <div className="mt-4 p-4 bg-white border border-gray-200 rounded-xl">
                <div className="text-sm text-gray-700">
                  <span className="font-semibold">Deliver to:</span>{" "}
                  {`${shippingAddress.firstName || ""} ${shippingAddress.lastName || ""}`.trim() || "—"}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {shippingAddress.address
                    ? `${shippingAddress.address}, ${shippingAddress.city || ""}${shippingAddress.city ? "," : ""
                    } ${shippingAddress.postalCode || ""}, ${shippingAddress.country || ""}`
                    : "No address selected"}
                </div>
                <div className="text-xs text-gray-600">
                  Contact No.: {shippingAddress.phone || ""}
                </div>
              </div>
            </div>

            {/* {razorpayOrderId && (
          <div className="mt-6 p-4 bg-blue-50 border border-gray-300 border border-gray-300-blue-200 rounded-xl">
            <h4 className="font-semibold text-blue-800 mb-2">Payment Method Selected:</h4>
            <p className="text-sm text-blue-700">Online Payment via Razorpay</p>
            <p className="text-xs text-blue-500 mt-1">Order ID: {razorpayOrderId}</p>
            {orderId && (
              <p className="text-xs text-blue-500 mt-1">MongoDB Order ID: {orderId}</p>
            )}
            <button
              onClick={() => navigate("/order-status", { state: { orderId } })}
              className="mt-2 text-sm text-blue-500 hover:underline"
            >
              View or Cancel Order
            </button>
          </div>
        )} */}

            {orderProcessing && (
              <div className="mt-4 p-4 bg-yellow-50 border border-gray-300 border-gray-300-yellow-200 rounded-xl">
                <p className="text-sm text-yellow-600">
                  <strong>Processing your order...</strong> Please wait.
                </p>
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-gray-300 border-gray-300-red-200 rounded-xl">
                <p className="text-sm text-red-700">
                  <strong>Error:</strong> {error}
                </p>
              </div>
            )}
          </div>
          {/* </div> */}

          {/* Similar Products */}
          {similarProducts.length > 0 && !featuredCollab?.isPublished && (
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-md">
              <h3 className="text-xl font-semibold text-gray-700 mb-6 text-center">
                More Products You Might Love
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {similarProducts.slice(0, displayCount).map((product) => (
                  <div
                    key={product._id}
                    onClick={() =>
                      navigate(
                        `/product/${product.name
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`
                      )
                    }
                    className="cursor-pointer rounded-lg border border-gray-200 hover:shadow-xl transition-all duration-300 bg-white"
                  >
                    <img
                      src={product.images?.[0]?.url || "/no-image.png"}
                      alt={product.name}
                      className="w-full h-40 object-cover rounded-t-lg"
                    />
                    <div className="px-3 py-2">
                      <h4 className="text-sm font-medium text-gray-800 truncate">
                        {product.name}
                      </h4>
                      <div className="inline-flex items-center gap-2 bg-green-600 text-white text-xs mt-1 px-2 py-0.5 rounded">
                        ★ {product.rating?.toFixed(1) || "0.0"}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {product.numReviews || 0} Reviews
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm font-bold text-blue-600">
                          ₹{Math.floor(product.discountPrice || product.price)}
                        </p>
                        {product.discountPrice && (
                          <p className="text-xs line-through text-gray-500">
                            ₹{product.price}
                          </p>
                        )}
                        <p className="text-sm text-green-600">
                          {product.offerPercentage
                            ? `${product.offerPercentage}%`
                            : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {similarProducts.length > displayCount && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={() => setDisplayCount((prev) => prev + 4)}
                    className="px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 transition"
                  >
                    Load More
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <AddressForm />
        </Modal>
      </div >
    </div >
  );

};

export default Checkout;
