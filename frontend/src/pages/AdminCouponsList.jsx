// src/pages/AdminCouponsList.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const AdminCouponsList = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedCouponId, setSelectedCouponId] = useState(null);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/offers`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("userToken")}`,
          },
        }
      );
      // Coupons are Offer documents that carry a couponCode; plain
      // banner/timed offers (managed on the separate Offers page) don't.
      setCoupons((data || []).filter((o) => o.couponCode));
    } catch {
      toast.error("Failed to fetch coupons");
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (id) => {
    setSelectedCouponId(id);
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!selectedCouponId) return;
    try {
      await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/api/offers/${selectedCouponId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("userToken")}`,
          },
        }
      );
      toast.success("Coupon deleted");
      setShowModal(false);
      fetchCoupons();
    } catch {
      toast.error("Failed to delete coupon");
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const formatBenefit = (offer) => {
    const benefit = offer.benefit || {};
    if (benefit.type === "flat") return `₹${Number(benefit.amount || 0).toLocaleString("en-IN")} off`;
    const pct = Number(benefit.percent || offer.offerPercentage || 0);
    return `${pct}% off${benefit.maxDiscount ? ` (up to ₹${benefit.maxDiscount})` : ""}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Coupons</h1>
          <p className="text-sm text-gray-500 mt-1">
            Codes shown with an Apply button on product pages and validated at checkout.
          </p>
        </div>
        <Link
          to="/admin/create-coupon"
          className="bg-gradient-to-r from-sky-500 to-blue-600 text-white px-5 py-2.5 rounded-lg shadow-md hover:scale-[1.02] transition-all font-semibold"
        >
          + Create Coupon
        </Link>
      </div>

      {loading ? (
        <div className="text-center text-blue-600 font-medium">Loading coupons...</div>
      ) : coupons.length === 0 ? (
        <div className="text-center text-gray-500">
          No coupons yet. Click “Create Coupon” to add one.
        </div>
      ) : (
        <div className="overflow-x-auto bg-white shadow-lg rounded-xl border border-gray-200">
          <table className="w-full text-left text-sm table-auto">
            <thead className="bg-blue-50 text-gray-700 text-sm uppercase">
              <tr>
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Title</th>
                <th className="px-5 py-3">Discount</th>
                <th className="px-5 py-3">Scope</th>
                <th className="px-5 py-3">Valid Date</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {coupons.map((offer) => (
                <tr key={offer._id} className="hover:bg-gray-50 transition-all">
                  <td className="px-5 py-4 font-mono font-bold text-sky-700">
                    {offer.couponCode}
                  </td>
                  <td className="px-5 py-4 font-semibold text-gray-800">{offer.title}</td>
                  <td className="px-5 py-4 text-blue-600 font-medium">{formatBenefit(offer)}</td>
                  <td className="px-5 py-4 text-gray-600 capitalize">
                    {offer.benefit?.scope || "product"}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    {offer.startDate?.slice(0, 10)} → {offer.endDate?.slice(0, 10)}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        offer.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {offer.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-4 flex gap-2 items-center">
                    <Link
                      to={`/admin/edit-coupon/${offer._id}`}
                      className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-all"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => confirmDelete(offer._id)}
                      className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-all"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30">
          <div className="bg-white w-full max-w-md rounded-lg shadow-lg p-6 text-center relative">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Confirm Delete</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to permanently delete this coupon?
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 shadow-sm transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCouponsList;
