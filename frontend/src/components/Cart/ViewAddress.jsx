import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { FaLocationCrosshairs } from "react-icons/fa6";
import axios from "axios";
import {  useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaUserCircle, FaTrash, FaMapMarkerAlt } from "react-icons/fa";



const ViewAddress = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();
  const authHeaders = () => {
    const token = localStorage.getItem("userToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };
  const [addresses, setAddresses] = useState([]);
  const [] = useState({
    address: "",
    city: "",
    postalCode: "",
    country: "",
    phone: "",
  });
  const [, setCountryList] = useState([]);
  

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await fetch("https://restcountries.com/v3.1/all?fields=name");
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();

        if (!Array.isArray(data)) throw new Error("Invalid data structure");

        const countries = data
          .map((country) => country?.name?.common)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));

        setCountryList(countries);
      } catch (error) {
        console.error("Failed to load countries:", error.message);
        toast.error("Could not load country list.");
        setCountryList(["India", "United States", "Canada", "Australia"]); // fallback
      }
    };

    fetchCountries();
  }, []);

  useEffect(() => {
    const sync = (e) => {
      const incoming = e.detail;
      // handle either an array or {addresses: [...]}
      const next = Array.isArray(incoming) ? incoming : incoming?.addresses;
      if (Array.isArray(next)) setAddresses(next);
    };
    window.addEventListener("address:list-updated", sync);
    return () => window.removeEventListener("address:list-updated", sync);
  }, []);

  //   useEffect(() => {
  //     const fetchCoupon = async () => {
  //       try {
  //         const token = user?.token || localStorage.getItem("userToken");
  //         const { data } = await axios.get(
  //           `${import.meta.env.VITE_BACKEND_URL}/api/users/my-coupon`,
  //           {
  //             headers: {
  //               Authorization: `Bearer ${token}`,
  //             },
  //           }
  //         );
  //         setCoupon(data);
  //         setCouponError("");
  //       } catch (err) {
  //         setCoupon(null);
  //         setCouponError(
  //           err.response?.data?.message || "Could not fetch coupon details"
  //         );
  //       }
  //     };

  //     if (activeTab === "coupon" && user?.role === "customer") {
  //       fetchCoupon();
  //     }
  //   }, [activeTab, user]);

  useEffect(() => {
    if (!user) {
      const redirect = encodeURIComponent(location.pathname || "/checkout");
      navigate(`/login?redirect=${redirect}`);
    }
  }, [user, navigate, location.pathname]);

  //   useEffect(() => {
  //     const fetchWishlist = async () => {
  //       try {
  //         const token = localStorage.getItem("userToken");
  //         const { data } = await axios.get(
  //           `${import.meta.env.VITE_BACKEND_URL}/api/wishlist`,
  //           {
  //             headers: {
  //               Authorization: `Bearer ${token}`,
  //             },
  //           }
  //         );
  //         setWishlistItems(data);
  //       } catch (err) {
  //         console.error("Failed to fetch wishlist:", err);
  //       }
  //     };

  //     if (activeTab === "wishlist") fetchWishlist();
  //   }, [activeTab]);

  

  //   useEffect(() => {
  //     const handleOnline = () => {
  //       if (!isOnline) {
  //         setIsOnline(true);
  //         toast.success("You're back online");
  //       }
  //     };
  //     const handleOffline = () => {
  //       if (isOnline) {
  //         setIsOnline(false);
  //         toast.error("You're offline");
  //       }
  //     };
  //     window.addEventListener("online", handleOnline);
  //     window.addEventListener("offline", handleOffline);
  //     return () => {
  //       window.removeEventListener("online", handleOnline);
  //       window.removeEventListener("offline", handleOffline);
  //     };
  //   }, [isOnline]);

  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        const { data } = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/user/addresses`,
          { headers: authHeaders() }
        );
        setAddresses(data);
      } catch (err) {
        console.error("Failed to load addresses", err);
      }
    };
    if (user && localStorage.getItem("userToken")) fetchAddresses();
  }, [user]);

  

  const handleDeleteAddress = async (index) => {
    if (!window.confirm("Delete this address?")) return;
    try {
      const { data } = await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/api/user/addresses/${index}`,
        { headers: authHeaders() }
      );
      setAddresses(data.addresses);
      toast.success("Address deleted");
    } catch (err) {
      toast.error("Failed to delete address");
    }
  };

  const [editingIdx, setEditingIdx] = useState(null);
  const [editForm, setEditForm] = useState({});

  const startEdit = (idx) => {
    setEditingIdx(idx);
    setEditForm({ ...addresses[idx] });
  };

  const handleEditSave = async () => {
    try {
      const { data } = await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/api/user/addresses/${editingIdx}`,
        editForm,
        { headers: authHeaders() }
      );
      setAddresses(data.addresses || data.user?.addresses || addresses);
      setEditingIdx(null);
      toast.success("Address updated");
    } catch (err) {
      toast.error("Failed to update address");
    }
  };

  

  return (
    <div>
      {/* <h3 className="text-xl font-semibold mb-4">
                Add New Address
            </h3> */}
      {/* <form
                onSubmit={handleAddressSubmit}
                className="space-y-6 "
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                        type="text"
                        name="address"
                        value={newAddress.address}
                        onChange={(e) =>
                            setNewAddress({
                                ...newAddress,
                                address: e.target.value,
                            })
                        }
                        placeholder="Street Address"
                        className="bg-white w-full p-3 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        required
                    />
                    <input
                        type="text"
                        name="city"
                        value={newAddress.city}
                        onChange={(e) =>
                            setNewAddress({ ...newAddress, city: e.target.value })
                        }
                        placeholder="City"
                        className="bg-white w-full p-3 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        required
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                        type="number"
                        name="postalCode"
                        value={newAddress.postalCode}
                        onChange={(e) =>
                            setNewAddress({
                                ...newAddress,
                                postalCode: e.target.value,
                            })
                        }
                        placeholder="Postal Code"
                        className="bg-white w-full p-3 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        required
                    />
                    <select
                        name="country"
                        value={newAddress.country}
                        onChange={(e) =>
                            setNewAddress({
                                ...newAddress,
                                country: e.target.value,
                            })
                        }
                        className="bg-white w-full p-3 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        required
                    >
                        <option value="" disabled>Select Country</option>
                        {countryList.map((country) => (
                            <option key={country} value={country}>
                                {country}
                            </option>
                        ))}
                    </select>

                </div>
                <div className="flex justify-between items-center">
                    <input
                        type="number"
                        name="phone"
                        value={newAddress.phone}
                        onChange={(e) =>
                            setNewAddress({ ...newAddress, phone: e.target.value })
                        }
                        placeholder="Phone"
                        className="bg-white w-full p-3 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 appearance-none [-moz-appearance:textfield] [appearance:textfield]"
                    />
                    <button
                        type="button"
                        onClick={handleUseCurrentLocation}
                        disabled={locating}
                        className="ml-2 whitespace-nowrap text-sm bg-sky-500 hover:bg-sky-600 disabled:bg-sky-400 disabled:cursor-not-allowed text-white font-medium px-4 py-3 transition flex justify-around items-center gap-2"
                    >
                        {/* Spinner while locating */}
      {/* {locating ? (
                            <>
                                <span className="inline-block h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                                <span>Loading...</span>
                            </>
                        ) : (
                            <>
                                <FaLocationCrosshairs className="inline" size={25} />
                                Use my current Location
                            </>
                        )}
                    </button>
                </div>

                <button
                    type="submit"
                    className="w-full py-3 text-white font-semibold bg-blue-600 hover:bg-blue-700 transition"
                >
                    Save Address
                </button>
            </form>  */}

      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4 text-sky-700">
          Saved Addresses
        </h3>

        {(!addresses || addresses.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-12 bg-gradient-to-br from-white via-sky-50 to-blue-100 rounded-2xl border border-blue-100 shadow-sm">
            <FaMapMarkerAlt className="text-sky-500 text-4xl mb-3 animate-bounce" />
            <p className="text-gray-600 text-lg font-medium">
              No address found
            </p>
            <p className="text-sm text-gray-400">
              Add a new address to get started!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {addresses.map((addr, idx) => (
              <div
                key={idx}
                className="relative bg-gradient-to-br from-white via-blue-50 to-sky-100 border border-blue-100 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                {/* Action buttons */}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <button
                    onClick={() => startEdit(idx)}
                    className="text-sky-500 hover:text-sky-700 transition"
                    title="Edit address"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeleteAddress(idx)}
                    className="text-red-400 hover:text-red-600 transition"
                    title="Delete address"
                  >
                    <FaTrash size={14} />
                  </button>
                </div>

                {/* Inline edit form */}
                {editingIdx === idx && (
                  <div className="mb-4 space-y-2">
                    {["address", "city", "postalCode", "country", "phone"].map((field) => (
                      <input
                        key={field}
                        type="text"
                        placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                        value={editForm[field] || ""}
                        onChange={(e) => setEditForm((p) => ({ ...p, [field]: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-300 bg-white"
                      />
                    ))}
                    <div className="flex gap-2 pt-1">
                      <button onClick={handleEditSave}
                        className="flex-1 py-2 text-xs font-bold bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition">
                        Save
                      </button>
                      <button onClick={() => setEditingIdx(null)}
                        className="flex-1 py-2 text-xs font-bold border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Address Details */}
                <div className="space-y-2 text-sm text-gray-800">
                  <p>
                    <span className="font-semibold text-gray-900">Address:</span>{" "}
                    {addr.address}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-900">City:</span>{" "}
                    {addr.city}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-900">Postal Code:</span>{" "}
                    {addr.postalCode}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-900">Country:</span>{" "}
                    {addr.country}
                  </p>
                  {addr.phone && (
                    <p>
                      <span className="font-semibold text-gray-900">Phone:</span>{" "}
                      +91 {addr.phone}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

export default ViewAddress
