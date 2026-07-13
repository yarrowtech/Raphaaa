// // import React, { useEffect } from "react";
// // import { useDispatch, useSelector } from "react-redux";
// // import { useNavigate } from "react-router-dom";
// // import { fetchAllOrders, updateOrderStatus } from "../../redux/slices/adminOrderSlice";

// // const OrderManagement = () => {
// //   const dispatch = useDispatch();
// //   const navigate = useNavigate();

// //   const { user } = useSelector((state) => state.auth);
// //   const { orders, loading, error } = useSelector((state) => state.adminOrders);

// //   useEffect(() => {
// //     if(!user || user.role !== "admin") {
// //       navigate("/");
// //     } else {
// //       dispatch(fetchAllOrders());
// //     }
// //   }, [dispatch, user, navigate]);
// //   // const orders = [
// //   //   {
// //   //     _id: 221131,
// //   //     user: {
// //   //       name: "john Doe",
// //   //     },
// //   //     totalPrice: 110,
// //   //     status: "Processing",
// //   //   },
// //   // ];

// //   const handleStatusChange = (orderId, status) => {
// //     // console.log({ id: orderId, status });
// //     dispatch(updateOrderStatus({ id: orderId, status }));
// //   };

// //   if(loading) return <p>Loading...</p>
// //   if(error) return <p> Error: {error} </p>

// //   return (
// //     <div className="max-w-7xl mx-auto p-6">
// //       <h2 className="text-2xl font-bold mb-6">Order Management</h2>
// //       <div className="overflow-x-auto shadow-lg rounded-lg bg-white">
// //         <table className="min-w-full text-sm text-left text-gray-700">
// //           <thead className="bg-gray-100 text-xs uppercase text-gray-600">
// //             <tr>
// //               <th className="py-4 px-6">Order ID</th>
// //               <th className="py-4 px-6">Order Customer</th>
// //               <th className="py-4 px-6">Total Price</th>
// //               <th className="py-4 px-6">Status</th>
// //               <th className="py-4 px-6">Actions</th>
// //             </tr>
// //           </thead>
// //           <tbody>
// //             {orders.length > 0 ? (
// //               orders.map((order) => (
// //                 <tr
// //                   key={order._id}
// //                   className="hover:bg-gray-50 transition-all duration-200"
// //                 >
// //                   <td className="py-4 px-6 font-semibold text-gray-900 whitespace-nowrap">
// //                     #{order._id}
// //                   </td>
// //                   <td className="py-4 px-6">{order.user.name}</td>
// //                   <td className="py-4 px-6">₹{order.totalPrice.toFixed(2)}</td>
// //                   <td className="py-4 px-6">
// //                     <select
// //                       value={order.status}
// //                       onChange={(e) =>
// //                         handleStatusChange(order._id, e.target.value)
// //                       }
// //                       className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2 w-full"
// //                     >
// //                       <option value="Processing">Processing</option>
// //                       <option value="Shipped">Shipped</option>
// //                       <option value="Delivered">Delivered</option>
// //                       <option value="Cancelled">Cancelled</option>
// //                     </select>
// //                   </td>
// //                   <td className="py-4 px-6">
// //                     <button
// //                       onClick={() => handleStatusChange(order._id, "Delivered")}
// //                       className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
// //                     >
// //                       Mark as Delivered
// //                     </button>
// //                   </td>
// //                 </tr>
// //               ))
// //             ) : (
// //               <tr>
// //                 <td
// //                   colSpan={5}
// //                   className="p-6 text-center text-gray-500 italic"
// //                 >
// //                   No orders found
// //                 </td>
// //               </tr>
// //             )}
// //           </tbody>
// //         </table>
// //       </div>
// //     </div>
// //   );
// // };

// // export default OrderManagement;

// import React, { useEffect, useState } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { useNavigate } from "react-router-dom";
// import {
//   fetchAllOrders,
//   updateOrderStatus,
//   deleteOrder,
//   clearError,
// } from "../../redux/slices/adminOrderSlice";
// import { FaRegTrashCan } from "react-icons/fa6";
// import { FaBoxOpen } from "react-icons/fa";
// import { FaEye } from "react-icons/fa";

// const OrderManagement = () => {
//   const dispatch = useDispatch();
//   const navigate = useNavigate();

//   const { user } = useSelector((state) => state.auth);
//   const { orders, loading, error } = useSelector((state) => state.adminOrders);

//   const [search, setSearch] = useState("");
//   const [statusFilter, setStatusFilter] = useState("");
//   const [currentPage, setCurrentPage] = useState(1);
//   const [selectedOrder, setSelectedOrder] = useState(null);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const ordersPerPage = 10;

//   useEffect(() => {
//     if (!user) {
//       navigate("/login");
//       return;
//     }

//     if (user.role !== "admin") {
//       navigate("/");
//       return;
//     }

//     dispatch(fetchAllOrders());
//   }, [dispatch, user, navigate]);

//   const handleStatusChange = (orderId, status) => {
//     dispatch(updateOrderStatus({ id: orderId, status }));
//   };

//   const handleDeleteOrder = (orderId) => {
//     if (window.confirm("Are you sure you want to delete this order?")) {
//       dispatch(deleteOrder(orderId));
//     }
//   };

//   const clearErrorHandler = () => {
//     dispatch(clearError());
//   };

//   const filteredOrders = orders
//     .filter(
//       (order) =>
//         order._id.toLowerCase().includes(search.toLowerCase()) ||
//         order.user?.name?.toLowerCase().includes(search.toLowerCase())
//     )
//     .filter((order) => (statusFilter ? order.status === statusFilter : true));

//   const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
//   const paginatedOrders = filteredOrders.slice(
//     (currentPage - 1) * ordersPerPage,
//     currentPage * ordersPerPage
//   );

//   if (loading)
//     return (
//       <div className="max-w-7xl mx-auto p-6">
//         <div className="text-center">
//           <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
//           <p className="mt-2">Loading orders...</p>
//         </div>
//       </div>
//     );

//   if (error)
//     return (
//       <div className="max-w-7xl mx-auto p-6">
//         <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
//           <div className="flex justify-between items-center">
//             <span>
//               Error:{" "}
//               {typeof error === "string"
//                 ? error
//                 : error.message || "Something went wrong"}
//             </span>
//             <button
//               onClick={clearErrorHandler}
//               className="text-red-700 hover:text-red-900"
//             >
//               ×
//             </button>
//           </div>
//         </div>
//         <button
//           onClick={() => dispatch(fetchAllOrders())}
//           className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
//         >
//           Retry
//         </button>
//       </div>
//     );

//   return (
//     <div className="max-w-7xl mx-auto p-6">
//       <div className="flex justify-between items-center mb-6">
//         <h2 className="text-2xl font-bold">Order Management</h2>
//         <div className="text-sm text-gray-600">
//           Total Orders: <span className="bg-blue-600 text-white p-1 rounded-full"> {filteredOrders.length} </span>
//         </div>
//       </div>

//       {/* Search and Filter */}
//       <div className="flex flex-col md:flex-row gap-4 mb-4">
//         <input
//           type="text"
//           placeholder="Search by ID or customer"
//           value={search}
//           onChange={(e) => setSearch(e.target.value)}
//           className="w-full md:w-1/3 px-4 py-2 border border-gray-300 rounded-md bg-white outline-0"
//         />
//         <select
//           value={statusFilter}
//           onChange={(e) => setStatusFilter(e.target.value)}
//           className="w-full md:w-1/4 px-4 py-2 border border-gray-300 rounded-md bg-white outline-0"
//         >
//           <option value="">All Statuses</option>
//           <option value="Processing">Processing</option>
//           <option value="Shipped">Shipped</option>
//           <option value="Delivered">Delivered</option>
//           <option value="Cancelled">Cancelled</option>
//         </select>
//       </div>

//       <div className="overflow-x-auto shadow-lg rounded-lg bg-white">
//         <table className="min-w-full text-sm text-left text-gray-700">
//           <thead className="bg-gray-100 text-xs uppercase text-gray-600">
//             <tr>
//               <th className="py-4 px-6">Order ID</th>
//               <th className="py-4 px-6">Customer</th>
//               <th className="py-4 px-6">Total Price</th>
//               <th className="py-4 px-6">Status</th>
//               {/* <th className="py-4 px-6">Payment Method</th> */}
//               <th className="py-4 px-6">Created At</th>
//               <th className="py-4 px-6">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {paginatedOrders.length > 0 ? (
//               paginatedOrders.map((order) => (
//                 <tr
//                   key={order._id}
//                   className="hover:bg-gray-50 transition-all duration-200 border-b"
//                 >
//                   <td className="py-4 px-6 font-semibold text-gray-900 whitespace-nowrap">
//                     #{order._id.slice(-8)}
//                   </td>
//                   <td className="py-4 px-6">
//                     {order.user?.name || "Unknown User"}
//                   </td>
//                   <td className="py-4 px-6">
//                     ₹{order.totalPrice?.toFixed(2) || "0.00"}
//                   </td>
//                   <td className="py-4 px-6">
//                     <select
//                       value={order.status}
//                       onChange={(e) =>
//                         handleStatusChange(order._id, e.target.value)
//                       }
//                       className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2 w-full"
//                     >
//                       <option value="Processing">Processing</option>
//                       <option value="Shipped">Shipped</option>
//                       <option value="Delivered">Delivered</option>
//                       <option value="Cancelled">Cancelled</option>
//                     </select>
//                   </td>
//                   {/* <td className="py-4 px-6 capitalize">
//                     {order.paymentMethod?.replace("_", " ") || "N/A"}
//                   </td> */}
//                   <td className="py-4 px-6">
//                     {new Date(order.createdAt).toLocaleDateString()}
//                   </td>
//                   <td className="py-4 px-6">
//                     <div className="flex space-x-2">
//                       <button
//                         onClick={() => {
//                           setSelectedOrder(order);
//                           setIsModalOpen(true);
//                         }}
//                         className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 transition-colors text-xs"
//                       >
//                         View Details
//                       </button>
//                       <button
//                         onClick={() =>
//                           handleStatusChange(order._id, "Delivered")
//                         }
//                         className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600 transition-colors text-xs"
//                       >
//                        <FaBoxOpen className="inline"/> Mark Delivered
//                       </button>
//                       <button
//                         onClick={() => handleDeleteOrder(order._id)}
//                         className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition-colors text-xs"
//                       >
//                       <FaRegTrashCan className="inline"/>  Delete
//                       </button>
//                     </div>
//                   </td>
//                 </tr>
//               ))
//             ) : (
//               <tr>
//                 <td
//                   colSpan={7}
//                   className="p-6 text-center text-gray-500 italic"
//                 >
//                   No orders found
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>

//       {/* Pagination */}
//       {totalPages > 1 && (
//         <div className="flex justify-center mt-6 gap-2">
//           {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
//             <button
//               key={page}
//               onClick={() => setCurrentPage(page)}
//               className={`px-4 py-2 rounded-md border ${
//                 page === currentPage
//                   ? "bg-blue-500 text-white"
//                   : "bg-white text-gray-700"
//               } hover:bg-blue-100`}
//             >
//               {page}
//             </button>
//           ))}
//         </div>
//       )}

//       {/* Modal */}
//       {isModalOpen && selectedOrder && (
//         <div
//           className="fixed inset-0 bg-black/40 bg-opacity-40 flex items-center justify-center z-50"
//           onClick={() => setIsModalOpen(false)} // closes when clicked outside
//         >
//           <div
//             className="bg-white p-6 rounded-lg max-w-md w-full relative shadow-lg"
//             onClick={(e) => e.stopPropagation()} // prevents inner clicks from closing modal
//           >
//             <button
//               onClick={() => setIsModalOpen(false)}
//               className="absolute top-2 right-3 text-gray-500 hover:text-red-600 text-xl"
//             >
//               &times;
//             </button>
//             <h3 className="text-lg font-bold mb-4">Order Details</h3>
//             <div className="grid gap-2 text-sm text-gray-800">
//               <p>
//                 <strong>Order ID:</strong> {selectedOrder._id}
//               </p>
//               <p>
//                 <strong>Customer:</strong>{" "}
//                 {selectedOrder.user?.name || "Unknown"}
//               </p>
//               <p>
//                 <strong>Email:</strong> {selectedOrder.user?.email || "N/A"}
//               </p>
//               <p>
//                 <strong>Status:</strong> {selectedOrder.status}
//               </p>
//               <p>
//                 <strong>Total Price:</strong> ₹
//                 {selectedOrder.totalPrice?.toFixed(2)}
//               </p>
//               <p>
//                 <strong>Payment Method:</strong> {selectedOrder.paymentMethod}
//               </p>
//               <p>
//                 <strong>Ordered On:</strong>{" "}
//                 {new Date(selectedOrder.createdAt).toLocaleString()}
//               </p>
//               <p>
//                 <strong>Shipping Address:</strong>{" "}
//                 {selectedOrder.shippingAddress
//                   ? `${selectedOrder.shippingAddress.address}, ${selectedOrder.shippingAddress.city}, ${selectedOrder.shippingAddress.postalCode}, ${selectedOrder.shippingAddress.country}`
//                   : "N/A"}
//               </p>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default OrderManagement;

import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  fetchAllOrders,
  updateOrderStatus,
  clearError,
} from "../../redux/slices/adminOrderSlice";
import { FaEye, FaCheckCircle, FaSearch, FaClipboardList } from "react-icons/fa";
import { HiChevronLeft, HiChevronRight, HiXMark } from "react-icons/hi2";
import { MdFilterList, MdOutlineRefresh, MdRefresh } from "react-icons/md";
import { toast } from "sonner";

const OrderManagement = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user } = useSelector((state) => state.auth);
  const { orders, loading, error } = useSelector((state) => state.adminOrders);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const ordersPerPage = 10;

  // Check if user has permission to access this page
  const hasPermission =
    user &&
    (user.role === "admin" ||
      user.role === "merchantise" ||
      user.role === "delivery_boy");
  const isAdmin = user && user.role === "admin";

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!hasPermission) {
      navigate("/");
      return;
    }

    dispatch(fetchAllOrders());
  }, [dispatch, user, navigate, hasPermission]);

  const handleStatusChange = (orderId, status) => {
    dispatch(updateOrderStatus({ id: orderId, status }));
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await dispatch(fetchAllOrders()).unwrap();
      toast.success("Orders refreshed");
    } catch {
      toast.error("Failed to refresh orders");
    } finally {
      setIsRefreshing(false);
    }
  };

  const clearErrorHandler = () => {
    dispatch(clearError());
  };

  const filteredOrders = orders
    .filter(
      (order) =>
        order._id?.toLowerCase().includes(search.toLowerCase()) ||
        order.orderId?.toLowerCase().includes(search.toLowerCase()) ||
        order.user?.name?.toLowerCase().includes(search.toLowerCase())
    )
    .filter((order) => (statusFilter ? order.status === statusFilter : true));

  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ordersPerPage,
    currentPage * ordersPerPage
  );

  /* ── status badge ── */
  const StatusBadge = ({ status }) => {
    const cfg = {
      Delivered:          "bg-emerald-100 text-emerald-700 border-emerald-200",
      Processing:         "bg-amber-100  text-amber-700  border-amber-200",
      Cancelled:          "bg-red-100    text-red-700    border-red-200",
      Shipped:            "bg-sky-100    text-sky-700    border-sky-200",
      Packed:             "bg-violet-100 text-violet-700 border-violet-200",
      Transfer:           "bg-indigo-100 text-indigo-700 border-indigo-200",
      "In Transit":       "bg-sky-100    text-sky-700    border-sky-200",
      "Out For Delivery": "bg-blue-100   text-blue-700   border-blue-200",
    }[status] || "bg-gray-100 text-gray-600 border-gray-200";
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cfg}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />{status}
        {/* {status === "Processing" && (
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] leading-none">
            NEW
          </span>
        )} */}
      </span>
    );
  };

  if (loading && orders.length === 0) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading orders…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="rounded-2xl border border-red-100 shadow-sm p-6 max-w-sm w-full text-center">
        <p className="text-red-600 font-semibold mb-3">
          {typeof error === "string" ? error : error.message || "Something went wrong"}
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={clearErrorHandler}
            className="px-4 py-2 text-xs font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 transition">
            Dismiss
          </button>
          <button onClick={() => dispatch(fetchAllOrders())}
            className="px-4 py-2 text-xs font-semibold bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition">
            Retry
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shrink-0 shadow-sm">
            <FaClipboardList className="text-white text-lg" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">Orders</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {isAdmin ? "Admin" : user?.role === "delivery_boy" ? "Delivery" : "Merchandise"} · {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="p-4 flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-40">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
          <input
            type="text"
            placeholder="Search by order ID or customer…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
          />
        </div>
        <div className="relative">
          <MdFilterList className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 transition appearance-none cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="Processing">Processing</option>
            <option value="Packed">Packed</option>
            <option value="Transfer">Transfer</option>
          </select>
        </div>
        <div className="flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-xl px-3 py-2.5 text-xs font-bold text-violet-700 shrink-0">
          {filteredOrders.length} result{filteredOrders.length !== 1 ? "s" : ""}
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-3 py-2.5 text-xs font-bold rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <MdOutlineRefresh className={isRefreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {/* ── Table ── */}
      <div className="relative bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading && orders.length > 0 && (
          <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-500 font-medium">Loading orders…</p>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                <th className="px-4 py-3 text-left">Order ID</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Coupon</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FaClipboardList className="text-3xl text-gray-200" />
                      <p className="text-sm font-semibold text-gray-400">No orders found</p>
                      <p className="text-xs text-gray-300">Try adjusting your search or filter</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50/70 transition group">
                    {/* Order ID */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                      {order.status === "Processing" && (
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold leading-none">
                          NEW
                        </span>
                      )}
                      <span className="font-mono text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-lg">
                        {order?.orderId || `#${order._id?.slice(-8).toUpperCase()}`}
                      </span>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                          {(order.user?.name || "?")[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{order.user?.name || "Unknown"}</p>
                          <p className="text-[11px] text-gray-400 truncate">{order.user?.email || ""}</p>
                        </div>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3 font-bold text-gray-900">
                      ₹{order.totalPrice?.toLocaleString("en-IN") || "0"}
                    </td>

                    {/* Coupon */}
                    <td className="px-4 py-3">
                      {Array.isArray(order?.couponSnapshot?.codes) && order.couponSnapshot.codes.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {order.couponSnapshot.codes.slice(0, 2).map((c) => (
                            <span key={c} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {c}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>

                    {/* Status dropdown */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={order.status} />
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order._id, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 cursor-pointer appearance-none"
                        >
                          <option value="Processing">Processing</option>
                          <option value="Packed">Packed</option>
                          <option value="Transfer">Transfer</option>
                        </select>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setSelectedOrder(order); setIsModalOpen(true); }}
                          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 border border-sky-100 hover:bg-sky-100 transition"
                        >
                          <FaEye className="text-xs" /> View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Page {currentPage} of {totalPages} · {filteredOrders.length} orders
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <HiChevronLeft className="text-sm" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold transition ${
                    currentPage === page
                      ? "bg-violet-600 text-white shadow-sm"
                      : "border border-gray-200 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <HiChevronRight className="text-sm" />
              </button>
            </div>
          </div>
        )}
      </div>


      {/* ── Order details modal ── */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setIsModalOpen(false)}>
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
              <div>
                <h3 className="text-base font-bold text-gray-800">Order Details</h3>
                <p className="text-xs text-gray-400 mt-0.5 font-mono">
                  {selectedOrder.orderId || `#${selectedOrder._id?.slice(-8).toUpperCase()}`}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 transition">
                <HiXMark className="text-sm" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* ── Order info ── */}
                <div className="md:col-span-1 space-y-3">
                  <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-3">Order Info</p>
                  {[
                    { label: "Customer",   value: selectedOrder.user?.name || "Unknown" },
                    { label: "Email",      value: selectedOrder.user?.email || "N/A" },
                    { label: "Payment",    value: selectedOrder.paymentMethod },
                    { label: "Ordered On", value: new Date(selectedOrder.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) },
                    {
                      label: "Coupon",
                      value:
                        Array.isArray(selectedOrder?.couponSnapshot?.codes) &&
                        selectedOrder.couponSnapshot.codes.length > 0
                          ? selectedOrder.couponSnapshot.codes.join(", ")
                          : "N/A",
                    },
                    {
                      label: "Discount",
                      value: `₹${Number(selectedOrder?.couponSnapshot?.totalDiscount || 0).toLocaleString("en-IN")}`,
                    },
                    { label: "Total",      value: `₹${selectedOrder.totalPrice?.toLocaleString("en-IN")}`, bold: true },
                  ].map(({ label, value, bold }) => (
                    <div key={label} className="flex items-start justify-between gap-3">
                      <span className="text-xs text-gray-400 shrink-0">{label}</span>
                      <span className={`text-xs text-right ${bold ? "font-bold text-gray-900" : "text-gray-700 font-medium"}`}>{value}</span>
                    </div>
                  ))}

                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-1">Shipping Address</p>
                    <p className="text-xs text-gray-700 leading-relaxed">
                      {selectedOrder.shippingAddress
                        ? `${selectedOrder.shippingAddress.address}, ${selectedOrder.shippingAddress.city}, ${selectedOrder.shippingAddress.postalCode}, ${selectedOrder.shippingAddress.country}`
                        : "N/A"}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-2">Current Status</p>
                    <StatusBadge status={selectedOrder.status} />
                  </div>
                </div>

                {/* ── Items ── */}
                <div className="md:col-span-1">
                  <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-3">Items Ordered</p>
                  <div className="space-y-2">
                    {selectedOrder.orderItems?.length > 0 ? (
                      selectedOrder.orderItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl p-3">
                          <img src={item.image} alt={item.name}
                            className="w-12 h-12 rounded-lg object-cover border border-gray-100 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">{item.name}</p>
                            <p className="text-[11px] text-gray-500">
                              {item.color && `Color: ${item.color}`}{item.size && ` · Size: ${item.size}`}
                            </p>
                            <p className="text-[11px] text-gray-400">Qty: {item.quantity}</p>
                          </div>
                          <p className="text-xs font-bold text-gray-800 shrink-0">
                            ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400 italic">No items found</p>
                    )}
                  </div>
                </div>

                {/* ── Timeline ── */}
                <div className="md:col-span-1">
                  <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-3">Order Timeline</p>
                  <div className="relative pl-6">
                    <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-100 z-0">
                      <div
                        className="absolute top-0 w-full bg-violet-500 transition-all duration-700"
                        style={{
                          height: `${["Ordered","Processing","Shipped",
                            selectedOrder.status === "Cancelled" ? "Cancelled" : "Delivered",
                          ].indexOf(selectedOrder.status) * 33.3}%`,
                        }}
                      />
                    </div>
                    <div className="space-y-6 relative z-10">
                      {[
                        { label: "Ordered",    time: selectedOrder.createdAt },
                        { label: "Processing", time: selectedOrder.updatedAt },
                        { label: "Shipped",    time: selectedOrder.shippedAt || selectedOrder.updatedAt },
                        {
                          label: selectedOrder.status === "Cancelled" ? "Cancelled" : "Delivered",
                          time: selectedOrder.status === "Cancelled"
                            ? selectedOrder.cancelledAt || selectedOrder.updatedAt
                            : selectedOrder.deliveredAt || selectedOrder.updatedAt,
                        },
                      ].map((step, index, steps) => {
                        const currentIndex = steps.findIndex((s) =>
                          s.label === (selectedOrder.status === "Cancelled" ? "Cancelled" : selectedOrder.status)
                        );
                        const isCompleted = index < currentIndex;
                        const isCurrent   = index === currentIndex;
                        return (
                          <div key={step.label} className="relative flex items-start gap-3">
                            <div className="relative z-20 w-5 h-5 flex items-center justify-center shrink-0">
                              {isCompleted ? (
                                <FaCheckCircle className="text-emerald-500 text-base" />
                              ) : isCurrent ? (
                                <div className="w-3 h-3 bg-violet-600 rounded-full ring-2 ring-violet-200 animate-pulse" />
                              ) : (
                                <div className="w-3 h-3 bg-gray-200 rounded-full" />
                              )}
                            </div>
                            <div>
                              <p className={`text-xs font-semibold ${isCompleted || isCurrent ? "text-gray-800" : "text-gray-400"}`}>
                                {step.label}
                              </p>
                              <p className="text-[11px] text-gray-400">
                                {step.time ? new Date(step.time).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Pending"}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;
