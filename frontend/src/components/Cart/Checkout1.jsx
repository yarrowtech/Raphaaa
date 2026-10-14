// import React, { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import RazorpayButton from "./RazorpayButton";
// import { useDispatch, useSelector } from "react-redux";
// import { createCheckout, createCODOrder, updatePaymentStatus, finalizeCheckout, clearCheckout } from "../../redux/slices/checkoutSlice";
// import { clearCart } from "../../redux/slices/cartSlice";
// import axios from "axios";

// const Checkout = () => {
//   const navigate = useNavigate();
//   const dispatch = useDispatch();
//   const { cart, loading: cartLoading, error: cartError } = useSelector((state) => state.cart);
//   const { user } = useSelector((state) => state.auth);
//   const { checkout, order, loading: checkoutLoading, error: checkoutError } = useSelector((state) => state.checkout);

//   const [checkoutId, setCheckoutId] = useState(null);
//   const [paymentMethod, setPaymentMethod] = useState("razorpay");
//   const [orderProcessing, setOrderProcessing] = useState(false);
//   const [addressLoading, setAddressLoading] = useState(false);
//   const [deliveryValidation, setDeliveryValidation] = useState({ isValid: true, message: "" });
//   const [phoneError, setPhoneError] = useState("");
//   const [shippingAddress, setShippingAddress] = useState({
//     firstName: "",
//     lastName: "",
//     address: "",
//     city: "",
//     postalCode: "",
//     country: "India",
//     phone: "+91",
//   });

//   // Country list
//   const countries = [
//     "India", "United States", "United Kingdom", "Canada", "Australia", "Germany", "France", "Japan", "China", "Brazil",
//     "Russia", "Italy", "Spain", "Netherlands", "Sweden", "Switzerland", "Norway", "Denmark", "Finland", "Belgium",
//     "Austria", "Portugal", "Greece", "Ireland", "Poland", "Czech Republic", "Hungary", "Romania", "Bulgaria",
//     "Croatia", "Slovenia", "Slovakia", "Estonia", "Latvia", "Lithuania", "Luxembourg", "Malta", "Cyprus"
//   ];

//   // Clean up checkout state when component mounts
//   useEffect(() => {
//     dispatch(clearCheckout());
//   }, [dispatch]);

//   // Ensure cart is loaded before proceeding - but don't redirect if order is being processed
//   useEffect(() => {
//     if(!orderProcessing && (!cart || !cart.products || cart.products.length === 0)) {
//       navigate("/");
//     }
//   }, [cart, navigate, orderProcessing]);

//   // Phone number validation
//   const validatePhone = (phone) => {
//     if (!phone.startsWith('+91')) {
//       setPhoneError("Phone number must start with +91");
//       return false;
//     }
//     const phoneWithoutCode = phone.slice(3);
//     if (phoneWithoutCode.length !== 10 || !/^\d{10}$/.test(phoneWithoutCode)) {
//       setPhoneError("Phone number must be exactly 10 digits after +91");
//       return false;
//     }
//     setPhoneError("");
//     return true;
//   };

//   // Handle phone input change
//   const handlePhoneChange = (e) => {
//     let value = e.target.value;
    
//     // Ensure it always starts with +91
//     if (!value.startsWith('+91')) {
//       value = '+91' + value.replace(/^\+91/, '');
//     }
    
//     // Remove any non-digit characters except +91
//     value = '+91' + value.slice(3).replace(/\D/g, '');
    
//     // Limit to +91 + 10 digits
//     if (value.length > 13) {
//       value = value.slice(0, 13);
//     }
    
//     setShippingAddress({ ...shippingAddress, phone: value });
//     validatePhone(value);
//   };

//   // Auto-detect address using pin code
//   const handlePinCodeChange = async (e) => {
//     const pinCode = e.target.value;
//     setShippingAddress({ ...shippingAddress, postalCode: pinCode });
    
//     if (pinCode.length === 6 && /^\d{6}$/.test(pinCode)) {
//       setAddressLoading(true);
//       try {
//         // Using India Post API for pin code lookup
//         const response = await axios.get(`https://api.postalpincode.in/pincode/${pinCode}`);
        
//         if (response.data && response.data[0] && response.data[0].Status === "Success") {
//           const postOffice = response.data[0].PostOffice[0];
//           setShippingAddress(prev => ({
//             ...prev,
//             city: postOffice.District,
//             country: "India"
//           }));
          
//           // Check delivery range (assuming delivery center is in a major city)
//           await checkDeliveryRange(postOffice.District, postOffice.State);
//         } else {
//           setDeliveryValidation({ isValid: false, message: "Invalid pin code. Please enter a valid Indian pin code." });
//         }
//       } catch (error) {
//         console.error("Error fetching pin code data:", error);
//         setDeliveryValidation({ isValid: false, message: "Unable to validate pin code. Please enter address manually." });
//       } finally {
//         setAddressLoading(false);
//       }
//     } else {
//       setDeliveryValidation({ isValid: true, message: "" });
//     }
//   };

//   // Check if delivery is within 30km range
//   const checkDeliveryRange = async (city, state) => {
//     try {
//       // This is a simplified check. In a real app, you'd use Google Maps Distance Matrix API
//       // or have a predefined list of serviceable areas
//       const deliveryCenter = { lat: 28.6139, lng: 77.2090 }; // Delhi as example delivery center
      
//       // For demonstration, we'll check against major cities
//       const serviceableCities = [
//         "Delhi", "Mumbai", "Bangalore", "Chennai", "Kolkata", "Hyderabad", 
//         "Pune", "Ahmedabad", "Surat", "Jaipur", "Lucknow", "Kanpur"
//       ];
      
//       const isServiceable = serviceableCities.some(serviceableCity => 
//         city.toLowerCase().includes(serviceableCity.toLowerCase()) ||
//         serviceableCity.toLowerCase().includes(city.toLowerCase())
//       );
      
//       if (!isServiceable) {
//         setDeliveryValidation({ 
//           isValid: false, 
//           message: "Sorry, we currently deliver within 30km of major cities only. Your location is outside our delivery range." 
//         });
//       } else {
//         setDeliveryValidation({ isValid: true, message: "✓ Delivery available in your area" });
//       }
//     } catch (error) {
//       console.error("Error checking delivery range:", error);
//       setDeliveryValidation({ isValid: true, message: "" });
//     }
//   };

//   const handleCreateCheckout = async (e) => {
//     e.preventDefault();
    
//     // Validate phone number before proceeding
//     if (!validatePhone(shippingAddress.phone)) {
//       return;
//     }
    
//     // Check delivery validation
//     if (!deliveryValidation.isValid) {
//       alert("Please check your delivery address. We don't deliver to this location.");
//       return;
//     }
    
//     if(cart && cart.products.length > 0){
//       setOrderProcessing(true);
      
//       if(paymentMethod === "cash_on_delivery") {
//         // For COD, directly create order
//         const orderData = {
//           orderItems: cart.products.map(product => ({
//             productId: product.productId,
//             name: product.name,
//             image: product.image,
//             price: product.price,
//             quantity: product.quantity,
//             size: product.size,
//             color: product.color
//           })),
//           shippingAddress: {
//             firstName: shippingAddress.firstName,
//             lastName: shippingAddress.lastName,
//             address: shippingAddress.address,
//             city: shippingAddress.city,
//             postalCode: shippingAddress.postalCode,
//             country: shippingAddress.country,
//             phone: shippingAddress.phone,
//           },
//           paymentMethod: "cash_on_delivery",
//           totalPrice: cart.totalPrice,
//         };
        
//         const result = await dispatch(createCODOrder(orderData));
//         if (result.type === 'checkout/createCODOrder/fulfilled') {
//           // Clear cart after successful COD order
//           dispatch(clearCart());
//           navigate("/order-confirmation", { 
//             state: { 
//               order: result.payload, 
//               paymentMethod: "cash_on_delivery" 
//             } 
//           });
//         } else {
//           // Reset flag if order creation failed
//           setOrderProcessing(false);
//         }
//       } else {
//         // For online payment, create checkout first
//         const res = await dispatch(
//           createCheckout({
//             checkoutItems: cart.products.map(product => ({
//               productId: product.productId,
//               name: product.name,
//               image: product.image,
//               price: product.price,
//               quantity: product.quantity,
//               size: product.size,
//               color: product.color
//             })),
//             shippingAddress: {
//               firstName: shippingAddress.firstName,
//               lastName: shippingAddress.lastName,
//               address: shippingAddress.address,
//               city: shippingAddress.city,
//               postalCode: shippingAddress.postalCode,
//               country: shippingAddress.country,
//               phone: shippingAddress.phone,
//             },
//             paymentMethod,
//             totalPrice: cart.totalPrice,
//           })
//         );
//         if(res.type === 'checkout/createCheckout/fulfilled') {
//           setCheckoutId(res.payload._id);
//           setOrderProcessing(false);
//         } else {
//           setOrderProcessing(false);
//         }
//       }
//     }
//   };

//   const handleRazorpaySuccess = async (paymentData) => {
//     try {
//       setOrderProcessing(true);
      
//       const result = await dispatch(updatePaymentStatus({
//         checkoutId,
//         paymentData: {
//           paymentStatus: "paid",
//           paymentDetails: paymentData,
//           paymentMethod: "razorpay"
//         }
//       }));

//       if (result.type === 'checkout/updatePaymentStatus/fulfilled') {
//         // Finalize the checkout to create order
//         const finalResult = await dispatch(finalizeCheckout(checkoutId));
//         if (finalResult.type === 'checkout/finalizeCheckout/fulfilled') {
//           // Clear cart after successful payment
//           dispatch(clearCart());
//           navigate("/order-confirmation", { 
//             state: { 
//               order: finalResult.payload, 
//               paymentMethod: "razorpay" 
//             } 
//           });
//         } else {
//           setOrderProcessing(false);
//         }
//       } else {
//         setOrderProcessing(false);
//       }
//     } catch (error) {
//       console.error("Payment processing error:", error);
//       setOrderProcessing(false);
//       alert("Payment processing failed. Please contact support.");
//     }
//   };

//   const handleFinalizeCheckout = async (checkoutId) => {
//     try {
//       setOrderProcessing(true);
//       const result = await dispatch(finalizeCheckout(checkoutId));
//       if (result.type === 'checkout/finalizeCheckout/fulfilled') {
//         dispatch(clearCart());
//         navigate("/order-confirmation", { 
//           state: { 
//             order: result.payload, 
//             paymentMethod: paymentMethod 
//           } 
//         });
//       } else {
//         setOrderProcessing(false);
//       }
//     } catch (error) {
//       console.error("Finalize error:", error);
//       setOrderProcessing(false);
//       alert("Order finalization failed. Please contact support.");
//     }
//   };

//   const loading = cartLoading || checkoutLoading;
//   const error = cartError || checkoutError;

//   if(loading) return <p>Loading cart...</p>
//   if(error) return <p>Error: {error}</p>
//   if(!orderProcessing && (!cart || !cart.products || cart.products.length === 0)) {
//     return <p>Your cart is empty!! </p>
//   }

//   return (
//     <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-7xl mx-auto py-12 px-6">
//       {/* Left Section */}
//       <div className="bg-white rounded-xl shadow-lg p-8 border">
//         <h2 className="text-3xl font-bold text-gray-800 mb-8 uppercase tracking-tight">Checkout</h2>
//         <form onSubmit={handleCreateCheckout}>
//           <h3 className="text-lg font-semibold text-gray-700 mb-4">Contact Details</h3>
//           <div className="mb-6">
//             <label className="block text-sm text-gray-600 mb-1">Email</label>
//             <input
//               type="email"
//               value={user? user.email : ""}
//               className="w-full p-3 border rounded-lg bg-gray-100 text-gray-600"
//               disabled
//             />
//           </div>

//           <h3 className="text-lg font-semibold text-gray-700 mb-4">Delivery</h3>
//           <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div>
//               <label className="block text-sm text-gray-600 mb-1">First Name</label>
//               <input
//                 type="text"
//                 className="w-full p-3 border rounded-lg"
//                 required
//                 value={shippingAddress.firstName}
//                 onChange={(e) =>
//                   setShippingAddress({ ...shippingAddress, firstName: e.target.value })
//                 }
//               />
//             </div>
//             <div>
//               <label className="block text-sm text-gray-600 mb-1">Last Name</label>
//               <input
//                 type="text"
//                 className="w-full p-3 border rounded-lg"
//                 required
//                 value={shippingAddress.lastName}
//                 onChange={(e) =>
//                   setShippingAddress({ ...shippingAddress, lastName: e.target.value })
//                 }
//               />
//             </div>
//           </div>

//           <div className="mb-4">
//             <label className="block text-sm text-gray-600 mb-1">Address</label>
//             <input
//               type="text"
//               className="w-full p-3 border rounded-lg"
//               required
//               value={shippingAddress.address}
//               onChange={(e) =>
//                 setShippingAddress({ ...shippingAddress, address: e.target.value })
//               }
//             />
//           </div>

//           <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div>
//               <label className="block text-sm text-gray-600 mb-1">PIN Code</label>
//               <div className="relative">
//                 <input
//                   type="text"
//                   className="w-full p-3 border rounded-lg"
//                   required
//                   value={shippingAddress.postalCode}
//                   onChange={handlePinCodeChange}
//                   placeholder="Enter 6-digit PIN code"
//                   maxLength="6"
//                   pattern="\d{6}"
//                 />
//                 {addressLoading && (
//                   <div className="absolute right-3 top-3">
//                     <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
//                   </div>
//                 )}
//               </div>
//               {deliveryValidation.message && (
//                 <p className={`text-sm mt-1 ${deliveryValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
//                   {deliveryValidation.message}
//                 </p>
//               )}
//             </div>
//             <div>
//               <label className="block text-sm text-gray-600 mb-1">City</label>
//               <input
//                 type="text"
//                 className="w-full p-3 border rounded-lg"
//                 required
//                 value={shippingAddress.city}
//                 onChange={(e) =>
//                   setShippingAddress({ ...shippingAddress, city: e.target.value })
//                 }
//               />
//             </div>
//           </div>

//           <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div>
//               <label className="block text-sm text-gray-600 mb-1">Country</label>
//               <select
//                 className="w-full p-3 border rounded-lg"
//                 required
//                 value={shippingAddress.country}
//                 onChange={(e) =>
//                   setShippingAddress({ ...shippingAddress, country: e.target.value })
//                 }
//               >
//                 <option value="">Select Country</option>
//                 {countries.map((country) => (
//                   <option key={country} value={country}>
//                     {country}
//                   </option>
//                 ))}
//               </select>
//             </div>
//             <div>
//               <label className="block text-sm text-gray-600 mb-1">Phone</label>
//               <input
//                 type="tel"
//                 className={`w-full p-3 border rounded-lg ${phoneError ? 'border-red-500' : ''}`}
//                 required
//                 value={shippingAddress.phone}
//                 onChange={handlePhoneChange}
//                 placeholder="+91XXXXXXXXXX"
//               />
//               {phoneError && (
//                 <p className="text-sm text-red-600 mt-1">{phoneError}</p>
//               )}
//             </div>
//           </div>

//           {/* Payment Method Selection */}
//           {!checkoutId && (
//             <div className="mb-6">
//               <h3 className="text-lg font-semibold text-gray-700 mb-4">Payment Method</h3>
//               <div className="space-y-3">
//                 <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
//                   <input
//                     type="radio"
//                     name="paymentMethod"
//                     value="razorpay"
//                     checked={paymentMethod === "razorpay"}
//                     onChange={(e) => setPaymentMethod(e.target.value)}
//                     className="mr-3"
//                   />
//                   <div className="flex items-center">
//                     <span className="text-sm font-medium">Online Payment (Razorpay)</span>
//                     <span className="ml-2 text-xs text-gray-500">UPI, Cards, Net Banking</span>
//                   </div>
//                 </label>
//                 <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
//                   <input
//                     type="radio"
//                     name="paymentMethod"
//                     value="cash_on_delivery"
//                     checked={paymentMethod === "cash_on_delivery"}
//                     onChange={(e) => setPaymentMethod(e.target.value)}
//                     className="mr-3"
//                   />
//                   <div className="flex items-center">
//                     <span className="text-sm font-medium">Cash on Delivery</span>
//                     <span className="ml-2 text-xs text-gray-500">Pay when you receive</span>
//                   </div>
//                 </label>
//               </div>
//             </div>
//           )}

//           <div className="mt-6">
//             {!checkoutId ? (
//               <button 
//                 type="submit" 
//                 className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
//                 disabled={loading || orderProcessing || !deliveryValidation.isValid || phoneError}
//               >
//                 {loading || orderProcessing ? "Processing..." : "Continue to Payment"}
//               </button>
//             ) : (
//               <div className="space-y-4">
//                 <div>
//                   <h3 className="text-lg font-semibold mb-4">Complete Payment</h3>
//                   <RazorpayButton
//                     amount={cart?.totalPrice || 0}
//                     currency="INR"
//                     name={`${shippingAddress.firstName} ${shippingAddress.lastName}`}
//                     email={user?.email}
//                     contact={shippingAddress.phone}
//                     onSuccess={handleRazorpaySuccess}
//                     onError={(err) => {
//                       console.error("Razorpay error:", err);
//                       setOrderProcessing(false);
//                       alert("Payment failed. Please try again.");
//                     }}
//                   />
//                 </div>
//               </div>
//             )}
//           </div>
//         </form>
//       </div>

//       {/* Right Section */}
//       <div className="bg-gray-50 p-8 rounded-xl border shadow-md">
//         <h3 className="text-2xl font-semibold text-gray-800 mb-6">Order Summary</h3>
//         <div className="space-y-6">
//           {cart?.products?.map((product, index) => (
//             <div key={index} className="flex items-start gap-4 border-b pb-4">
//               <img
//                 src={product.image}
//                 alt={product.name}
//                 className="w-20 h-24 object-cover rounded-md border"
//               />
//               <div className="flex-1">
//                 <h4 className="text-md font-semibold text-gray-700">{product.name}</h4>
//                 <p className="text-sm text-gray-500">Size: {product.size}</p>
//                 <p className="text-sm text-gray-500">Color: {product.color}</p>
//               </div>
//               <p className="text-lg font-medium text-gray-800">
//                 ₹{product.price?.toLocaleString()}
//               </p>
//             </div>
//           ))}
//         </div>

//         <div className="mt-6 space-y-2 text-lg text-gray-700">
//           <div className="flex justify-between">
//             <span>Subtotal</span>
//             <span>₹{cart?.totalPrice?.toLocaleString()}</span>
//           </div>
//           <div className="flex justify-between">
//             <span>Shipping</span>
//             <span className="text-green-600 font-medium">Free</span>
//           </div>
//           {paymentMethod === "cash_on_delivery" && checkoutId && (
//             <div className="flex justify-between text-sm text-gray-600">
//               <span>COD Charges</span>
//               <span>₹0</span>
//             </div>
//           )}
//           <div className="flex justify-between border-t pt-4 font-semibold text-gray-900">
//             <span>Total</span>
//             <span>₹{cart?.totalPrice?.toLocaleString()}</span>
//           </div>
//         </div>

//         {checkoutId && (
//           <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
//             <h4 className="font-semibold text-blue-800 mb-2">Payment Method Selected:</h4>
//             <p className="text-sm text-blue-700">
//               Online Payment via Razorpay
//             </p>
//           </div>
//         )}

//         {orderProcessing && (
//           <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
//             <p className="text-sm text-yellow-700">
//               <strong>Processing your order...</strong> Please wait.
//             </p>
//           </div>
//         )}

//         {error && (
//           <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
//             <p className="text-sm text-red-700">
//               <strong>Error:</strong> {error}
//             </p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default Checkout;

// import React, { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// // import RazorpayButton from "./RazorpayButton";
// import { useDispatch, useSelector } from "react-redux";
// import { createCheckout, createCODOrder, updatePaymentStatus, finalizeCheckout, clearCheckout } from "../../redux/slices/checkoutSlice";
// import { clearCart } from "../../redux/slices/cartSlice";
// import axios from "axios";

// const Checkout = () => {
//   const navigate = useNavigate();
//   const dispatch = useDispatch();
//   const { cart, loading: cartLoading, error: cartError } = useSelector((state) => state.cart);
//   const { user } = useSelector((state) => state.auth);
//   const { checkout, order, loading: checkoutLoading, error: checkoutError } = useSelector((state) => state.checkout);

//   const [checkoutId, setCheckoutId] = useState(null);
//   const [paymentMethod, setPaymentMethod] = useState("razorpay");
//   const [orderProcessing, setOrderProcessing] = useState(false);
//   const [addressLoading, setAddressLoading] = useState(false);
//   const [deliveryValidation, setDeliveryValidation] = useState({ isValid: true, message: "" });
//   const [phoneError, setPhoneError] = useState("");
//   const [shippingAddress, setShippingAddress] = useState({
//     firstName: "",
//     lastName: "",
//     address: "",
//     city: "",
//     postalCode: "",
//     country: "India",
//     phone: "+91",
//   });

//   // Country list
//   const countries = [
//     "India", "United States", "United Kingdom", "Canada", "Australia", "Germany", "France", "Japan", "China", "Brazil",
//     "Russia", "Italy", "Spain", "Netherlands", "Sweden", "Switzerland", "Norway", "Denmark", "Finland", "Belgium",
//     "Austria", "Portugal", "Greece", "Ireland", "Poland", "Czech Republic", "Hungary", "Romania", "Bulgaria",
//     "Croatia", "Slovenia", "Slovakia", "Estonia", "Latvia", "Lithuania", "Luxembourg", "Malta", "Cyprus"
//   ];

//   // Clean up checkout state when component mounts
//   useEffect(() => {
//     dispatch(clearCheckout());
//   }, [dispatch]);

//   // Ensure cart is loaded before proceeding - but don't redirect if order is being processed
//   useEffect(() => {
//     if(!orderProcessing && (!cart || !cart.products || cart.products.length === 0)) {
//       navigate("/");
//     }
//   }, [cart, navigate, orderProcessing]);

//   // Phone number validation
//   const validatePhone = (phone) => {
//     if (!phone.startsWith('+91')) {
//       setPhoneError("Phone number must start with +91");
//       return false;
//     }
//     const phoneWithoutCode = phone.slice(3);
//     if (phoneWithoutCode.length !== 10 || !/^\d{10}$/.test(phoneWithoutCode)) {
//       setPhoneError("Phone number must be exactly 10 digits after +91");
//       return false;
//     }
//     setPhoneError("");
//     return true;
//   };

//   // Handle phone input change
//   const handlePhoneChange = (e) => {
//     let value = e.target.value;

//     // Ensure it always starts with +91
//     if (!value.startsWith('+91')) {
//       value = '+91' + value.replace(/^\+91/, '');
//     }

//     // Remove any non-digit characters except +91
//     value = '+91' + value.slice(3).replace(/\D/g, '');

//     // Limit to +91 + 10 digits
//     if (value.length > 13) {
//       value = value.slice(0, 13);
//     }

//     setShippingAddress({ ...shippingAddress, phone: value });
//     validatePhone(value);
//   };

//   // Auto-detect address using pin code
//   const handlePinCodeChange = async (e) => {
//     const pinCode = e.target.value;
//     setShippingAddress({ ...shippingAddress, postalCode: pinCode });

//     if (pinCode.length === 6 && /^\d{6}$/.test(pinCode)) {
//       setAddressLoading(true);
//       try {
//         // Using India Post API for pin code lookup
//         const response = await axios.get(`https://api.postalpincode.in/pincode/${pinCode}`);

//         if (response.data && response.data[0] && response.data[0].Status === "Success") {
//           const postOffice = response.data[0].PostOffice[0];
//           setShippingAddress(prev => ({
//             ...prev,
//             city: postOffice.District,
//             country: "India"
//           }));

//           // Check delivery range (assuming delivery center is in a major city)
//           await checkDeliveryRange(postOffice.District, postOffice.State);
//         } else {
//           setDeliveryValidation({ isValid: false, message: "Invalid pin code. Please enter a valid Indian pin code." });
//         }
//       } catch (error) {
//         console.error("Error fetching pin code data:", error);
//         setDeliveryValidation({ isValid: false, message: "Unable to validate pin code. Please enter address manually." });
//       } finally {
//         setAddressLoading(false);
//       }
//     } else {
//       setDeliveryValidation({ isValid: true, message: "" });
//     }
//   };

//   // Check if delivery is within 30km range
//   const checkDeliveryRange = async (city, state) => {
//     try {
//       // This is a simplified check. In a real app, you'd use Google Maps Distance Matrix API
//       // or have a predefined list of serviceable areas
//       const deliveryCenter = { lat: 28.6139, lng: 77.2090 }; // Delhi as example delivery center

//       // For demonstration, we'll check against major cities
//       const serviceableCities = [
//         "Delhi", "Mumbai", "Bangalore", "Chennai", "Kolkata", "Hyderabad",
//         "Pune", "Ahmedabad", "Surat", "Jaipur", "Lucknow", "Kanpur"
//       ];

//       const isServiceable = serviceableCities.some(serviceableCity =>
//         city.toLowerCase().includes(serviceableCity.toLowerCase()) ||
//         serviceableCity.toLowerCase().includes(city.toLowerCase())
//       );

//       if (!isServiceable) {
//         setDeliveryValidation({
//           isValid: false,
//           message: "Sorry, we currently deliver within 30km of major cities only. Your location is outside our delivery range."
//         });
//       } else {
//         setDeliveryValidation({ isValid: true, message: "✓ Delivery available in your area" });
//       }
//     } catch (error) {
//       console.error("Error checking delivery range:", error);
//       setDeliveryValidation({ isValid: true, message: "" });
//     }
//   };

//   const handleCreateCheckout = async (e) => {
//     e.preventDefault();

//     // Validate phone number before proceeding
//     if (!validatePhone(shippingAddress.phone)) {
//       return;
//     }

//     // Check delivery validation
//     if (!deliveryValidation.isValid) {
//       alert("Please check your delivery address. We don't deliver to this location.");
//       return;
//     }

//     if(cart && cart.products.length > 0){
//       setOrderProcessing(true);

//       if(paymentMethod === "cash_on_delivery") {
//         // For COD, directly create order
//         const orderData = {
//           orderItems: cart.products.map(product => ({
//             productId: product.productId,
//             name: product.name,
//             image: product.image,
//             price: product.price,
//             quantity: product.quantity,
//             size: product.size,
//             color: product.color
//           })),
//           shippingAddress: {
//             firstName: shippingAddress.firstName,
//             lastName: shippingAddress.lastName,
//             address: shippingAddress.address,
//             city: shippingAddress.city,
//             postalCode: shippingAddress.postalCode,
//             country: shippingAddress.country,
//             phone: shippingAddress.phone,
//           },
//           paymentMethod: "cash_on_delivery",
//           totalPrice: cart.totalPrice,
//         };

//         const result = await dispatch(createCODOrder(orderData));
//         if (result.type === 'checkout/createCODOrder/fulfilled') {
//           // Clear cart after successful COD order
//           dispatch(clearCart());
//           navigate("/order-confirmation", {
//             state: {
//               order: result.payload,
//               paymentMethod: "cash_on_delivery"
//             }
//           });
//         } else {
//           // Reset flag if order creation failed
//           setOrderProcessing(false);
//         }
//       } else {
//         // For online payment, create checkout first
//         const res = await dispatch(
//           createCheckout({
//             checkoutItems: cart.products.map(product => ({
//               productId: product.productId,
//               name: product.name,
//               image: product.image,
//               price: product.price,
//               quantity: product.quantity,
//               size: product.size,
//               color: product.color
//             })),
//             shippingAddress: {
//               firstName: shippingAddress.firstName,
//               lastName: shippingAddress.lastName,
//               address: shippingAddress.address,
//               city: shippingAddress.city,
//               postalCode: shippingAddress.postalCode,
//               country: shippingAddress.country,
//               phone: shippingAddress.phone,
//             },
//             paymentMethod,
//             totalPrice: cart.totalPrice,
//           })
//         );
//         if(res.type === 'checkout/createCheckout/fulfilled') {
//           setCheckoutId(res.payload._id);
//           setOrderProcessing(false);
//         } else {
//           setOrderProcessing(false);
//         }
//       }
//     }
//   };

//   const handleRazorpaySuccess = async (paymentData) => {
//     try {
//       setOrderProcessing(true);

//       const result = await dispatch(updatePaymentStatus({
//         checkoutId,
//         paymentData: {
//           paymentStatus: "paid",
//           paymentDetails: paymentData,
//           paymentMethod: "razorpay"
//         }
//       }));

//       if (result.type === 'checkout/updatePaymentStatus/fulfilled') {
//         // Finalize the checkout to create order
//         const finalResult = await dispatch(finalizeCheckout(checkoutId));
//         if (finalResult.type === 'checkout/finalizeCheckout/fulfilled') {
//           // Clear cart after successful payment
//           dispatch(clearCart());
//           navigate("/order-confirmation", {
//             state: {
//               order: finalResult.payload,
//               paymentMethod: "razorpay"
//             }
//           });
//         } else {
//           setOrderProcessing(false);
//         }
//       } else {
//         setOrderProcessing(false);
//       }
//     } catch (error) {
//       console.error("Payment processing error:", error);
//       setOrderProcessing(false);
//       alert("Payment processing failed. Please contact support.");
//     }
//   };

//   const handleFinalizeCheckout = async (checkoutId) => {
//     try {
//       setOrderProcessing(true);
//       const result = await dispatch(finalizeCheckout(checkoutId));
//       if (result.type === 'checkout/finalizeCheckout/fulfilled') {
//         dispatch(clearCart());
//         navigate("/order-confirmation", {
//           state: {
//             order: result.payload,
//             paymentMethod: paymentMethod
//           }
//         });
//       } else {
//         setOrderProcessing(false);
//       }
//     } catch (error) {
//       console.error("Finalize error:", error);
//       setOrderProcessing(false);
//       alert("Order finalization failed. Please contact support.");
//     }
//   };

//   const loading = cartLoading || checkoutLoading;
//   const error = cartError || checkoutError;

//   if(loading) return <p>Loading cart...</p>
//   if(error) return <p>Error: {error}</p>
//   if(!orderProcessing && (!cart || !cart.products || cart.products.length === 0)) {
//     return <p>Your cart is empty!! </p>
//   }

//   return (
//     <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-7xl mx-auto py-12 px-6">
//       {/* Left Section */}
//       <div className="bg-white rounded-xl shadow-lg p-8 border">
//         <h2 className="text-3xl font-bold text-gray-800 mb-8 uppercase tracking-tight">Checkout</h2>
//         <form onSubmit={handleCreateCheckout}>
//           <h3 className="text-lg font-semibold text-gray-700 mb-4">Contact Details</h3>
//           <div className="mb-6">
//             <label className="block text-sm text-gray-600 mb-1">Email</label>
//             <input
//               type="email"
//               value={user? user.email : ""}
//               className="w-full p-3 border rounded-lg bg-gray-100 text-gray-600"
//               disabled
//             />
//           </div>

//           <h3 className="text-lg font-semibold text-gray-700 mb-4">Delivery</h3>
//           <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div>
//               <label className="block text-sm text-gray-600 mb-1">First Name</label>
//               <input
//                 type="text"
//                 className="w-full p-3 border rounded-lg"
//                 required
//                 value={shippingAddress.firstName}
//                 onChange={(e) =>
//                   setShippingAddress({ ...shippingAddress, firstName: e.target.value })
//                 }
//               />
//             </div>
//             <div>
//               <label className="block text-sm text-gray-600 mb-1">Last Name</label>
//               <input
//                 type="text"
//                 className="w-full p-3 border rounded-lg"
//                 required
//                 value={shippingAddress.lastName}
//                 onChange={(e) =>
//                   setShippingAddress({ ...shippingAddress, lastName: e.target.value })
//                 }
//               />
//             </div>
//           </div>

//           <div className="mb-4">
//             <label className="block text-sm text-gray-600 mb-1">Address</label>
//             <input
//               type="text"
//               className="w-full p-3 border rounded-lg"
//               required
//               value={shippingAddress.address}
//               onChange={(e) =>
//                 setShippingAddress({ ...shippingAddress, address: e.target.value })
//               }
//             />
//           </div>

//           <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div>
//               <label className="block text-sm text-gray-600 mb-1">PIN Code</label>
//               <div className="relative">
//                 <input
//                   type="text"
//                   className="w-full p-3 border rounded-lg"
//                   required
//                   value={shippingAddress.postalCode}
//                   onChange={handlePinCodeChange}
//                   placeholder="Enter 6-digit PIN code"
//                   maxLength="6"
//                   pattern="\d{6}"
//                 />
//                 {addressLoading && (
//                   <div className="absolute right-3 top-3">
//                     <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
//                   </div>
//                 )}
//               </div>
//               {deliveryValidation.message && (
//                 <p className={`text-sm mt-1 ${deliveryValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
//                   {deliveryValidation.message}
//                 </p>
//               )}
//             </div>
//             <div>
//               <label className="block text-sm text-gray-600 mb-1">City</label>
//               <input
//                 type="text"
//                 className="w-full p-3 border rounded-lg"
//                 required
//                 value={shippingAddress.city}
//                 onChange={(e) =>
//                   setShippingAddress({ ...shippingAddress, city: e.target.value })
//                 }
//               />
//             </div>
//           </div>

//           <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div>
//               <label className="block text-sm text-gray-600 mb-1">Country</label>
//               <select
//                 className="w-full p-3 border rounded-lg"
//                 required
//                 value={shippingAddress.country}
//                 onChange={(e) =>
//                   setShippingAddress({ ...shippingAddress, country: e.target.value })
//                 }
//               >
//                 <option value="">Select Country</option>
//                 {countries.map((country) => (
//                   <option key={country} value={country}>
//                     {country}
//                   </option>
//                 ))}
//               </select>
//             </div>
//             <div>
//               <label className="block text-sm text-gray-600 mb-1">Phone</label>
//               <input
//                 type="tel"
//                 className={`w-full p-3 border rounded-lg ${phoneError ? 'border-red-500' : ''}`}
//                 required
//                 value={shippingAddress.phone}
//                 onChange={handlePhoneChange}
//                 placeholder="+91XXXXXXXXXX"
//               />
//               {phoneError && (
//                 <p className="text-sm text-red-600 mt-1">{phoneError}</p>
//               )}
//             </div>
//           </div>

//           {/* Payment Method Selection */}
//           {!checkoutId && (
//             <div className="mb-6">
//               <h3 className="text-lg font-semibold text-gray-700 mb-4">Payment Method</h3>
//               <div className="space-y-3">
//                 <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
//                   <input
//                     type="radio"
//                     name="paymentMethod"
//                     value="razorpay"
//                     checked={paymentMethod === "razorpay"}
//                     onChange={(e) => setPaymentMethod(e.target.value)}
//                     className="mr-3"
//                   />
//                   <div className="flex items-center">
//                     <span className="text-sm font-medium">Online Payment (Razorpay)</span>
//                     <span className="ml-2 text-xs text-gray-500">UPI, Cards, Net Banking</span>
//                   </div>
//                 </label>
//                 <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
//                   <input
//                     type="radio"
//                     name="paymentMethod"
//                     value="cash_on_delivery"
//                     checked={paymentMethod === "cash_on_delivery"}
//                     onChange={(e) => setPaymentMethod(e.target.value)}
//                     className="mr-3"
//                   />
//                   <div className="flex items-center">
//                     <span className="text-sm font-medium">Cash on Delivery</span>
//                     <span className="ml-2 text-xs text-gray-500">Pay when you receive</span>
//                   </div>
//                 </label>
//               </div>
//             </div>
//           )}

//           <div className="mt-6">
//             {!checkoutId ? (
//               <button
//                 type="submit"
//                 className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
//                 disabled={loading || orderProcessing || !deliveryValidation.isValid || phoneError}
//               >
//                 {loading || orderProcessing ? "Processing..." : "Continue to Payment"}
//               </button>
//             ) : (
//               <div className="space-y-4">
//                 <div>
//                   <h3 className="text-lg font-semibold mb-4">Complete Payment</h3>
//                   <RazorpayButton
//                     amount={cart?.totalPrice || 0}
//                     currency="INR"
//                     name={`${shippingAddress.firstName} ${shippingAddress.lastName}`}
//                     email={user?.email}
//                     contact={shippingAddress.phone}
//                     onSuccess={handleRazorpaySuccess}
//                     onError={(err) => {
//                       console.error("Razorpay error:", err);
//                       setOrderProcessing(false);
//                       alert("Payment failed. Please try again.");
//                     }}
//                   />
//                 </div>
//               </div>
//             )}
//           </div>
//         </form>
//       </div>

//       {/* Right Section */}
//       <div className="bg-gray-50 p-8 rounded-xl border shadow-md">
//         <h3 className="text-2xl font-semibold text-gray-800 mb-6">Order Summary</h3>
//         <div className="space-y-6">
//           {cart?.products?.map((product, index) => (
//             <div key={index} className="flex items-start gap-4 border-b pb-4">
//               <img
//                 src={product.image}
//                 alt={product.name}
//                 className="w-20 h-24 object-cover rounded-md border"
//               />
//               <div className="flex-1">
//                 <h4 className="text-md font-semibold text-gray-700">{product.name}</h4>
//                 <p className="text-sm text-gray-500">Size: {product.size}</p>
//                 <p className="text-sm text-gray-500">Color: {product.color}</p>
//               </div>
//               <p className="text-lg font-medium text-gray-800">
//                 ₹{product.price?.toLocaleString()}
//               </p>
//             </div>
//           ))}
//         </div>

//         <div className="mt-6 space-y-2 text-lg text-gray-700">
//           <div className="flex justify-between">
//             <span>Subtotal</span>
//             <span>₹{cart?.totalPrice?.toLocaleString()}</span>
//           </div>
//           <div className="flex justify-between">
//             <span>Shipping</span>
//             <span className="text-green-600 font-medium">Free</span>
//           </div>
//           {paymentMethod === "cash_on_delivery" && checkoutId && (
//             <div className="flex justify-between text-sm text-gray-600">
//               <span>COD Charges</span>
//               <span>₹0</span>
//             </div>
//           )}
//           <div className="flex justify-between border-t pt-4 font-semibold text-gray-900">
//             <span>Total</span>
//             <span>₹{cart?.totalPrice?.toLocaleString()}</span>
//           </div>
//         </div>

//         {checkoutId && (
//           <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
//             <h4 className="font-semibold text-blue-800 mb-2">Payment Method Selected:</h4>
//             <p className="text-sm text-blue-700">
//               Online Payment via Razorpay
//             </p>
//           </div>
//         )}

//         {orderProcessing && (
//           <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
//             <p className="text-sm text-yellow-700">
//               <strong>Processing your order...</strong> Please wait.
//             </p>
//           </div>
//         )}

//         {error && (
//           <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
//             <p className="text-sm text-red-700">
//               <strong>Error:</strong> {error}
//             </p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default Checkout;
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import RazorpayButton from "./RazorpayButton";
import { useDispatch, useSelector } from "react-redux";
import {
  createCheckout,
  createCODOrder,
  updatePaymentStatus,
  finalizeCheckout,
  clearCheckout,
} from "../../redux/slices/checkoutSlice";
import { clearCart } from "../../redux/slices/cartSlice";
import axios from "axios";

const Checkout = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { cart, loading: cartLoading, error: cartError } = useSelector((state) => state.cart);
  const { user } = useSelector((state) => state.auth);
  const {  loading: checkoutLoading, error: checkoutError } = useSelector((state) => state.checkout);

  const [checkoutId, setCheckoutId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("razorpay");
  const [orderProcessing, setOrderProcessing] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  // Delivery validation removed
  const [phoneError, setPhoneError] = useState("");
  const [shippingAddress, setShippingAddress] = useState({
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    postalCode: "",
    country: "India",
    phone: "+91",
  });

  const countries = [
    "India", "United States", "United Kingdom", "Canada", "Australia",
    "Germany", "France", "Japan", "China", "Brazil", "Russia", "Italy",
    "Spain", "Netherlands", "Sweden", "Switzerland", "Norway", "Denmark",
    "Finland", "Belgium", "Austria", "Portugal", "Greece", "Ireland", "Poland",
    "Czech Republic", "Hungary", "Romania", "Bulgaria", "Croatia", "Slovenia",
    "Slovakia", "Estonia", "Latvia", "Lithuania", "Luxembourg", "Malta", "Cyprus",
  ];

  useEffect(() => {
    dispatch(clearCheckout());
  }, [dispatch]);

  useEffect(() => {
    if (!orderProcessing && (!cart || !cart.products || cart.products.length === 0)) {
      navigate("/");
    }
  }, [cart, navigate, orderProcessing]);

  const validatePhone = (phone) => {
    if (!phone.startsWith("+91")) {
      setPhoneError("Phone number must start with +91");
      return false;
    }
    const phoneWithoutCode = phone.slice(3);
    if (phoneWithoutCode.length !== 10 || !/^\d{10}$/.test(phoneWithoutCode)) {
      setPhoneError("Phone number must be exactly 10 digits after +91");
      return false;
    }
    setPhoneError("");
    return true;
  };

  const handlePhoneChange = (e) => {
    let value = e.target.value;
    if (!value.startsWith("+91")) {
      value = "+91" + value.replace(/^\+91/, "");
    }
    value = "+91" + value.slice(3).replace(/\D/g, "");
    if (value.length > 13) {
      value = value.slice(0, 13);
    }
    setShippingAddress({ ...shippingAddress, phone: value });
    validatePhone(value);
  };

  const handlePinCodeChange = async (e) => {
    const pinCode = e.target.value;
    setShippingAddress({ ...shippingAddress, postalCode: pinCode });

    if (pinCode.length === 6 && /^\d{6}$/.test(pinCode)) {
      setAddressLoading(true);
      try {
        const response = await axios.get(`https://api.postalpincode.in/pincode/${pinCode}`);
        if (response.data && response.data[0] && response.data[0].Status === "Success") {
          const postOffice = response.data[0].PostOffice[0];
          setShippingAddress((prev) => ({
            ...prev,
            city: postOffice.District,
            country: "India",
          }));
          // Delivery validation removed
          // await checkDeliveryRange(postOffice.District, postOffice.State);
        }
        // else {
        //   setDeliveryValidation({ isValid: false, message: "Invalid pin code. Please enter a valid Indian pin code." });
        // }
      } catch (error) {
        console.error("Error fetching pin code data:", error);
        // setDeliveryValidation({ isValid: false, message: "Unable to validate pin code. Please enter address manually." });
      } finally {
        setAddressLoading(false);
      }
    } else {
      // setDeliveryValidation({ isValid: true, message: "" });
    }
  };

  // const checkDeliveryRange = async (city, state) => {
  //   try {
  //     const serviceableCities = ["Delhi", "Mumbai", "Bangalore", "Chennai", "Kolkata", "Hyderabad", "Pune", "Ahmedabad", "Surat", "Jaipur", "Lucknow", "Kanpur"];
  //     const isServiceable = serviceableCities.some((c) =>
  //       city.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(city.toLowerCase())
  //     );
  //     if (!isServiceable) {
  //       setDeliveryValidation({ isValid: false, message: "Sorry, we currently deliver within 30km of major cities only." });
  //     } else {
  //       setDeliveryValidation({ isValid: true, message: "✓ Delivery available in your area" });
  //     }
  //   } catch (error) {
  //     console.error("Error checking delivery range:", error);
  //     setDeliveryValidation({ isValid: true, message: "" });
  //   }
  // };

  const handleCreateCheckout = async (e) => {
    e.preventDefault();
    if (!validatePhone(shippingAddress.phone)) return;

    // Delivery validation check removed
    // if (!deliveryValidation.isValid) {
    //   alert("Please check your delivery address. We don't deliver to this location.");
    //   return;
    // }

    if (cart && cart.products.length > 0) {
      setOrderProcessing(true);

      const shipping = {
        firstName: shippingAddress.firstName,
        lastName: shippingAddress.lastName,
        address: shippingAddress.address,
        city: shippingAddress.city,
        postalCode: shippingAddress.postalCode,
        country: shippingAddress.country,
        phone: shippingAddress.phone,
      };

      if (paymentMethod === "cash_on_delivery") {
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
          paymentMethod: "cash_on_delivery",
          totalPrice: cart.totalPrice,
        };
        const result = await dispatch(createCODOrder(orderData));
        if (result.type === "checkout/createCODOrder/fulfilled") {
          dispatch(clearCart());
          navigate("/order-confirmation", { state: { order: result.payload, paymentMethod: "cash_on_delivery" } });
        } else {
          setOrderProcessing(false);
        }
      } else {
        const res = await dispatch(
          createCheckout({
            checkoutItems: cart.products.map((p) => ({
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
          })
        );
        if (res.type === "checkout/createCheckout/fulfilled") {
          setCheckoutId(res.payload._id);
          setOrderProcessing(false);
        } else {
          setOrderProcessing(false);
        }
      }
    }
  };

  const handleRazorpaySuccess = async (paymentData) => {
    try {
      setOrderProcessing(true);
      const result = await dispatch(updatePaymentStatus({
        checkoutId,
        paymentData: {
          paymentStatus: "paid",
          paymentDetails: paymentData,
          paymentMethod: "razorpay",
        },
      }));

      if (result.type === "checkout/updatePaymentStatus/fulfilled") {
        const finalResult = await dispatch(finalizeCheckout(checkoutId));
        if (finalResult.type === "checkout/finalizeCheckout/fulfilled") {
          dispatch(clearCart());
          navigate("/order-confirmation", {
            state: {
              order: finalResult.payload,
              paymentMethod: "razorpay",
            },
          });
        } else {
          setOrderProcessing(false);
        }
      } else {
        setOrderProcessing(false);
      }
    } catch (error) {
      console.error("Payment processing error:", error);
      setOrderProcessing(false);
      alert("Payment processing failed. Please contact support.");
    }
  };

  

  const loading = cartLoading || checkoutLoading;
  const error = cartError || checkoutError;


  if (loading) return <p>Loading cart...</p>;
  if (error) return <p>Error: {error}</p>;
  if (
    !orderProcessing &&
    (!cart || !cart.products || cart.products.length === 0)
  ) {
    return <p>Your cart is empty!! </p>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-7xl mx-auto py-12 px-6">
      {/* Left Section */}
      <div className="bg-white rounded-xl shadow-lg p-8 border">
        <h2 className="text-3xl font-bold text-gray-800 mb-8 uppercase tracking-tight">
          Checkout
        </h2>
        <form onSubmit={handleCreateCheckout}>
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Contact Details
          </h3>
          <div className="mb-6">
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <input
              type="email"
              value={user ? user.email : ""}
              className="w-full p-3 border rounded-lg bg-gray-100 text-gray-600"
              disabled
            />
          </div>

          <h3 className="text-lg font-semibold text-gray-700 mb-4">Delivery</h3>
          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                First Name
              </label>
              <input
                type="text"
                className="w-full p-3 border rounded-lg"
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
              <label className="block text-sm text-gray-600 mb-1">
                Last Name
              </label>
              <input
                type="text"
                className="w-full p-3 border rounded-lg"
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

          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-1">Address</label>
            <input
              type="text"
              className="w-full p-3 border rounded-lg"
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
              <label className="block text-sm text-gray-600 mb-1">
                PIN Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full p-3 border rounded-lg"
                  required
                  value={shippingAddress.postalCode}
                  onChange={handlePinCodeChange}
                  placeholder="Enter 6-digit PIN code"
                  maxLength="6"
                  pattern="\d{6}"
                />
                {addressLoading && (
                  <div className="absolute right-3 top-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
                  </div>
                )}
              </div>
              {/* {deliveryValidation.message && (
                <p
                  className={`text-sm mt-1 ${
                    deliveryValidation.isValid
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {deliveryValidation.message}
                </p>
              )} */}
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">City</label>
              <input
                type="text"
                className="w-full p-3 border rounded-lg"
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
              <label className="block text-sm text-gray-600 mb-1">
                Country
              </label>
              <select
                className="w-full p-3 border rounded-lg"
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
              <label className="block text-sm text-gray-600 mb-1">Phone</label>
              <input
                type="tel"
                className={`w-full p-3 border rounded-lg ${
                  phoneError ? "border-red-500" : ""
                }`}
                required
                value={shippingAddress.phone}
                onChange={handlePhoneChange}
                placeholder="+91XXXXXXXXXX"
              />
              {phoneError && (
                <p className="text-sm text-red-600 mt-1">{phoneError}</p>
              )}
            </div>
          </div>

          {/* Payment Method Selection */}
          {!checkoutId && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">
                Payment Method
              </h3>
              <div className="space-y-3">
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
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
                      UPI, Cards, Net Banking
                    </span>
                  </div>
                </label>
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cash_on_delivery"
                    checked={paymentMethod === "cash_on_delivery"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-3"
                  />
                  <div className="flex items-center">
                    <span className="text-sm font-medium">
                      Cash on Delivery
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      Pay when you receive
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          <div className="mt-6">
            {!checkoutId ? (
              <button
                type="submit"
                className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={
                  loading ||
                  orderProcessing ||
                  // !deliveryValidation.isValid ||
                  phoneError
                }
              >
                {loading || orderProcessing
                  ? "Processing..."
                  : "Continue to Payment"}
              </button>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Complete Payment
                  </h3>
                  <RazorpayButton
                    amount={cart?.totalPrice || 0}
                    currency="INR"
                    name={`${shippingAddress.firstName} ${shippingAddress.lastName}`}
                    email={user?.email}
                    contact={shippingAddress.phone}
                    onSuccess={handleRazorpaySuccess}
                    onError={(err) => {
                      console.error("Razorpay error:", err);
                      setOrderProcessing(false);
                      alert("Payment failed. Please try again.");
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Right Section */}
      <div className="bg-gray-50 p-8 rounded-xl border shadow-md">
        <h3 className="text-2xl font-semibold text-gray-800 mb-6">
          Order Summary
        </h3>
        <div className="space-y-6">
          {cart?.products?.map((product, index) => (
            <div key={index} className="flex items-start gap-4 border-b pb-4">
              <img
                src={product.image}
                alt={product.name}
                className="w-20 h-24 object-cover rounded-md border"
              />
              <div className="flex-1">
                <h4 className="text-md font-semibold text-gray-700">
                  {product.name}
                </h4>
                <p className="text-sm text-gray-500">Size: {product.size}</p>
                <p className="text-sm text-gray-500">Color: {product.color}</p>
              </div>
              <p className="text-lg font-medium text-gray-800">
                ₹{product.price?.toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-2 text-lg text-gray-700">
          <div className="flex justify-between">
            <span>Total Quantity</span>
            <span>
              {cart?.products?.reduce(
                (total, item) => total + item.quantity,
                0
              )}{" "}
              items
            </span>
          </div>
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>₹{cart?.totalPrice?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping</span>
            <span className="text-green-600 font-medium">Free</span>
          </div>
          {paymentMethod === "cash_on_delivery" && checkoutId && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>COD Charges</span>
              <span>₹0</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-4 font-semibold text-gray-900">
            <span>Total</span>
            <span>₹{cart?.totalPrice?.toLocaleString()}</span>
          </div>
        </div>

        {checkoutId && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">
              Payment Method Selected:
            </h4>
            <p className="text-sm text-blue-700">Online Payment via Razorpay</p>
          </div>
        )}

        {orderProcessing && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-700">
              <strong>Processing your order...</strong> Please wait.
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Checkout;
