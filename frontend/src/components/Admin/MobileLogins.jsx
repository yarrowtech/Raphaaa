import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaWhatsapp } from "react-icons/fa";

const MobileLogins = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_BACKEND_URL}/api/admin/users/mobile-logins`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("userToken")}` },
      })
      .then(({ data }) => setUsers(data))
      .catch(() => setError("Failed to load mobile logins"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return u.mobile.includes(q) || (u.name || "").toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const page = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <FaWhatsapp className="text-green-500 text-2xl" />
        <h1 className="text-2xl font-bold text-gray-800">Mobile Logins</h1>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by number or name"
        className="w-full max-w-sm mb-4 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-400"
      />

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500">No mobile logins found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Mobile Number</th>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Verified</th>
                <th className="px-4 py-3 text-left font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((u) => (
                <tr key={u._id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{u.mobile}</td>
                  <td className="px-4 py-3 text-gray-600">{u.name || ""}</td>
                  <td className="px-4 py-3">
                    {u.mobileVerified ? (
                      <span className="text-xs font-semibold text-emerald-600">Verified</span>
                    ) : (
                      <span className="text-xs font-semibold text-gray-400">Unverified</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-gray-500">
            Showing {(page - 1) * perPage + 1}-{Math.min(page * perPage, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Prev
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileLogins;
