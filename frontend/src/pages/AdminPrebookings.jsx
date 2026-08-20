import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { FaSearch, FaBoxOpen, FaChevronDown, FaChevronUp } from "react-icons/fa";

const BACKEND = import.meta.env.VITE_BACKEND_URL;
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("userToken")}` });

const STATUS_BADGE = {
  open:   "bg-amber-50 text-amber-700 border border-amber-200",
  ready:  "bg-emerald-50 text-emerald-700 border border-emerald-200",
  closed: "bg-gray-100 text-gray-500 border border-gray-200",
};

const AdminPrebookings = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [limitDrafts, setLimitDrafts] = useState({}); // productId -> draft limit while adding

  const [expandedId, setExpandedId] = useState(null);
  const [bookers, setBookers] = useState({}); // productId -> [bookings]
  const [busyId, setBusyId] = useState(null);

  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [history, setHistory] = useState({}); // productId -> [{ round, firstBookedAt, readyAt, bookers }]

  const loadPrebookingProducts = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${BACKEND}/api/prebookings/admin/products`, {
        headers: authHeader(),
      });
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load prebooking products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrebookingProducts();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await axios.get(`${BACKEND}/api/products`, {
          params: { search: searchTerm, includeUnpublished: true, limit: 10 },
          headers: authHeader(),
        });
        const list = Array.isArray(data) ? data : data?.products || [];
        setSearchResults(list);
      } catch {
        toast.error("Search failed");
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const enablePrebooking = async (productId) => {
    const limit = Number(limitDrafts[productId] || 0);
    if (limit <= 0) {
      toast.error("Set a prebooking slot limit greater than 0");
      return;
    }
    setBusyId(productId);
    try {
      await axios.put(
        `${BACKEND}/api/prebookings/admin/config/${productId}`,
        { enabled: true, limit },
        { headers: authHeader() }
      );
      toast.success("Prebooking enabled for this product");
      setSearchTerm("");
      setSearchResults([]);
      loadPrebookingProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to enable prebooking");
    } finally {
      setBusyId(null);
    }
  };

  const updateLimit = async (productId, newLimit) => {
    setBusyId(productId);
    try {
      const { data } = await axios.put(
        `${BACKEND}/api/prebookings/admin/config/${productId}`,
        { limit: Number(newLimit) || 0 },
        { headers: authHeader() }
      );
      setProducts((prev) => prev.map((p) => (p._id === productId ? data.product : p)));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update limit");
    } finally {
      setBusyId(null);
    }
  };

  const disablePrebooking = async (productId) => {
    setBusyId(productId);
    try {
      await axios.put(
        `${BACKEND}/api/prebookings/admin/config/${productId}`,
        { enabled: false },
        { headers: authHeader() }
      );
      toast.success("Prebooking disabled");
      loadPrebookingProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to disable prebooking");
    } finally {
      setBusyId(null);
    }
  };

  const markReady = async (productId) => {
    if (!window.confirm("Mark this product ready? All customers who prebooked it will be emailed immediately.")) {
      return;
    }
    setBusyId(productId);
    try {
      const { data } = await axios.post(
        `${BACKEND}/api/prebookings/admin/mark-ready/${productId}`,
        {},
        { headers: authHeader() }
      );
      toast.success(`Marked ready — ${data.notified} customer(s) notified`);
      loadPrebookingProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to mark ready");
    } finally {
      setBusyId(null);
    }
  };

  const toggleBookers = async (productId) => {
    if (expandedId === productId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(productId);
    if (!bookers[productId]) {
      try {
        const { data } = await axios.get(
          `${BACKEND}/api/prebookings/admin/products/${productId}/bookings`,
          { headers: authHeader() }
        );
        setBookers((prev) => ({ ...prev, [productId]: data }));
      } catch {
        toast.error("Failed to load bookers");
      }
    }
  };

  const toggleHistory = async (productId) => {
    if (expandedHistoryId === productId) {
      setExpandedHistoryId(null);
      return;
    }
    setExpandedHistoryId(productId);
    if (!history[productId]) {
      try {
        const { data } = await axios.get(
          `${BACKEND}/api/prebookings/admin/products/${productId}/history`,
          { headers: authHeader() }
        );
        setHistory((prev) => ({ ...prev, [productId]: data }));
      } catch {
        toast.error("Failed to load prebooking history");
      }
    }
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");

  const alreadyEnabledIds = new Set(products.map((p) => p._id));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-1">
        <FaBoxOpen className="text-violet-600" />
        <h1 className="text-2xl font-bold text-gray-800">Prebookings</h1>
      </div>
      <p className="text-sm text-gray-500 mb-8">
        Let customers reserve a product before it's in stock, with a limited number of slots.
      </p>

      {/* Add product to prebooking */}
      <div className="border border-gray-200 rounded-2xl p-5 mb-8">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-3">
          Add a product to prebooking
        </h2>
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search products by name…"
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-200"
          />
        </div>

        {searching && <p className="text-xs text-gray-400 mt-2">Searching…</p>}

        {searchResults.length > 0 && (
          <div className="mt-3 space-y-2">
            {searchResults.map((p) => (
              <div
                key={p._id}
                className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl"
              >
                <img
                  src={p.images?.[0]?.url || "/placeholder.png"}
                  alt={p.name}
                  className="w-12 h-12 rounded-lg object-cover bg-gray-100"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                  <p className="text-xs text-gray-400">₹{p.price}</p>
                </div>
                {alreadyEnabledIds.has(p._id) ? (
                  <span className="text-xs font-semibold text-emerald-600">Already enabled</span>
                ) : (
                  <>
                    <input
                      type="number"
                      min={1}
                      placeholder="Slot limit"
                      value={limitDrafts[p._id] || ""}
                      onChange={(e) =>
                        setLimitDrafts((prev) => ({ ...prev, [p._id]: e.target.value }))
                      }
                      className="w-24 px-2 py-1.5 text-xs border border-gray-200 rounded-lg"
                    />
                    <button
                      onClick={() => enablePrebooking(p._id)}
                      disabled={busyId === p._id}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition disabled:opacity-50"
                    >
                      Enable
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prebooking-enabled products */}
      <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-3">
        Active prebooking products
      </h2>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-gray-400">No products have prebooking enabled yet.</p>
      ) : (
        <div className="space-y-3">
          {products.map((p) => {
            const pb = p.prebooking || {};
            const badge = STATUS_BADGE[pb.status] || STATUS_BADGE.open;
            return (
              <div key={p._id} className="border border-gray-200 rounded-2xl overflow-hidden">
                <div className="flex flex-wrap items-center gap-4 p-4">
                  <img
                    src={p.images?.[0]?.url || "/placeholder.png"}
                    alt={p.name}
                    className="w-14 h-14 rounded-xl object-cover bg-gray-100"
                  />
                  <div className="flex-1 min-w-[160px]">
                    <p className="font-semibold text-gray-800">{p.name}</p>
                    <span className={`inline-block mt-1 text-xs font-semibold px-2.5 py-1 rounded-full ${badge}`}>
                      {pb.status === "ready" ? "Ready" : pb.status === "closed" ? "Closed" : "Open"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-semibold text-gray-800">{pb.bookedCount || 0}</span>
                    <span>/</span>
                    <input
                      type="number"
                      min={pb.bookedCount || 0}
                      defaultValue={pb.limit}
                      onBlur={(e) => {
                        if (Number(e.target.value) !== pb.limit) updateLimit(p._id, e.target.value);
                      }}
                      className="w-16 px-2 py-1 text-xs border border-gray-200 rounded-lg"
                    />
                    <span className="text-xs text-gray-400">slots</span>
                  </div>

                  <button
                    onClick={() => toggleBookers(p._id)}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700"
                  >
                    Bookers {expandedId === p._id ? <FaChevronUp /> : <FaChevronDown />}
                  </button>

                  <button
                    onClick={() => toggleHistory(p._id)}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700"
                  >
                    History {expandedHistoryId === p._id ? <FaChevronUp /> : <FaChevronDown />}
                  </button>

                  {pb.status === "open" && (
                    <button
                      onClick={() => markReady(p._id)}
                      disabled={busyId === p._id}
                      className="px-3 py-2 text-xs font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-600 rounded-full hover:from-sky-600 hover:to-blue-700 transition disabled:opacity-50"
                    >
                      Mark Ready &amp; Notify
                    </button>
                  )}

                  <button
                    onClick={() => disablePrebooking(p._id)}
                    disabled={busyId === p._id}
                    className="px-3 py-2 text-xs font-semibold text-red-600 border border-red-200 rounded-full hover:bg-red-50 transition disabled:opacity-50"
                  >
                    Disable
                  </button>
                </div>

                {expandedId === p._id && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4">
                    {!bookers[p._id] ? (
                      <p className="text-xs text-gray-400">Loading bookers…</p>
                    ) : bookers[p._id].length === 0 ? (
                      <p className="text-xs text-gray-400">No one has prebooked this yet.</p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-gray-400 uppercase tracking-widest">
                            <th className="py-1">Name</th>
                            <th className="py-1">Email</th>
                            <th className="py-1">Color</th>
                            <th className="py-1">Size</th>
                            <th className="py-1">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bookers[p._id].map((b) => (
                            <tr key={b._id} className="border-t border-gray-100">
                              <td className="py-1.5">{b.user?.name || "—"}</td>
                              <td className="py-1.5">{b.user?.email || "—"}</td>
                              <td className="py-1.5">{b.color || "—"}</td>
                              <td className="py-1.5">{b.size || "—"}</td>
                              <td className="py-1.5 capitalize">{b.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {expandedHistoryId === p._id && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4">
                    {!history[p._id] ? (
                      <p className="text-xs text-gray-400">Loading history…</p>
                    ) : history[p._id].length === 0 ? (
                      <p className="text-xs text-gray-400">No prebooking rounds yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {history[p._id].map((r) => (
                          <div key={r.round} className="border border-gray-200 rounded-xl bg-white p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                              <span className="text-xs font-bold text-gray-700">
                                Round {r.round}{r.round === (p.prebooking?.round || 1) ? " (current)" : ""}
                              </span>
                              <span className="text-[11px] text-gray-500">
                                Prebooked from {formatDate(r.firstBookedAt)}
                                {" · "}
                                {r.readyAt ? `Marked ready on ${formatDate(r.readyAt)}` : "Not yet marked ready"}
                              </span>
                            </div>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-left text-gray-400 uppercase tracking-widest">
                                  <th className="py-1">Name</th>
                                  <th className="py-1">Email</th>
                                  <th className="py-1">Color</th>
                                  <th className="py-1">Size</th>
                                  <th className="py-1">Booked On</th>
                                  <th className="py-1">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {r.bookers.map((b) => (
                                  <tr key={b._id} className="border-t border-gray-100">
                                    <td className="py-1.5">{b.user?.name || "—"}</td>
                                    <td className="py-1.5">{b.user?.email || "—"}</td>
                                    <td className="py-1.5">{b.color || "—"}</td>
                                    <td className="py-1.5">{b.size || "—"}</td>
                                    <td className="py-1.5">{formatDate(b.bookedAt)}</td>
                                    <td className="py-1.5 capitalize">{b.status}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminPrebookings;
