// src/pages/AdminOffersList.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const AdminOffersList = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState(null);

  const fetchOffers = async () => {
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
      // Coupons (offers with a couponCode) are managed on the separate Coupons page.
      setOffers((data || []).filter((o) => !o.couponCode));
    } catch (err) {
      toast.error("Failed to fetch offers");
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (id) => {
    setSelectedOfferId(id);
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!selectedOfferId) return;
    try {
      await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/api/offers/${selectedOfferId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("userToken")}`,
          },
        }
      );
      toast.success("Offer deleted");
      setShowModal(false);
      fetchOffers();
    } catch {
      toast.error("Failed to delete offer");
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          All Seasonal Offers
        </h1>
        {/* <Link
          to="/admin/offers/add"
          className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-5 py-2.5 rounded-lg shadow-md hover:scale-[1.02] transition-all"
        >
          + Add Offer
        </Link> */}
      </div>

      {loading ? (
        <div className="text-center text-blue-600 font-medium">
          Loading offers...
        </div>
      ) : offers.length === 0 ? (
        <div className="text-center text-gray-500">No offers found.</div>
      ) : (
        <div className="overflow-x-auto bg-white shadow-lg rounded-xl border border-gray-200">
          <table className="w-full text-left text-sm table-auto">
            <thead className="bg-blue-50 text-gray-700 text-sm uppercase">
              <tr>
                <th className="px-5 py-3">Title</th>
                <th className="px-5 py-3">Discount</th>
                <th className="px-5 py-3">Products</th>
                <th className="px-5 py-3">Valid Date</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {offers.map((offer) => (
                <tr key={offer._id} className="hover:bg-gray-50 transition-all">
                  <td className="px-5 py-4 font-semibold text-gray-800">
                    {offer.title}
                  </td>
                  <td className="px-5 py-4 text-blue-600 font-medium">
                    {offer.offerPercentage}%
                  </td>
                  <td className="px-5 py-4 space-y-1">
                    {offer.productIds.map((p) => (
                      <div key={p._id} className="text-gray-700">
                        {p.name}{" "}
                        <span className="text-xs text-gray-500">
                          ₹{p.price}
                        </span>
                      </div>
                    ))}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    {offer.startDate.slice(0, 10)} →{" "}
                    {offer.endDate.slice(0, 10)}
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
                      to={`/admin/edit-offer/${offer._id}`}
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
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Confirm Delete
            </h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to permanently delete this offer?
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

export default AdminOffersList;
