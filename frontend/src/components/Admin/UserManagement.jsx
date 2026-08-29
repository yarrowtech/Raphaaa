import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  addUser,
  deleteUser,
  fetchUsers,
  updateUser,
} from "../../redux/slices/adminSlice";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { RiFileExcel2Line } from "react-icons/ri";
import {
  HiOutlineEye,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineWallet,
} from "react-icons/hi2";
import axios from "axios";

const ROLE_STYLES = {
  admin: "bg-linear-to-r from-purple-500 to-indigo-500",
  merchantise: "bg-linear-to-r from-orange-400 to-pink-500",
  delivery_boy: "bg-linear-to-r from-amber-400 to-amber-600",
  marketing: "bg-linear-to-r from-pink-500 to-red-500",
  customer: "bg-linear-to-r from-emerald-400 to-sky-400",
};
const roleLabel = (r) =>
  String(r || "")
    .charAt(0)
    .toUpperCase() + String(r || "").slice(1).replace(/_/g, " ");

// Compact page list with gaps: 1 … 4 5 [6] 7 8 … 20
const buildPageList = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const wanted = new Set([1, 2, total - 1, total, current - 1, current, current + 1]);
  const sorted = [...wanted].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) out.push("…");
    out.push(p);
    prev = p;
  }
  return out;
};

const UserManagement = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user } = useSelector((state) => state.auth);
  const { users, loading, error } = useSelector((state) => state.admin);

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage, setUsersPerPage] = useState(10);
  const [viewedUser, setViewedUser] = useState(null);
  const [viewSummary, setViewSummary] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", mobile: "", role: "customer" });
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    if (user && user.role !== "admin" && user.role !== "merchantise") {
      navigate("/");
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user && (user.role === "admin" || user.role === "merchantise")) {
      dispatch(fetchUsers());
    }
  }, [dispatch, user]);

  // Load full profile + order stats whenever the View modal opens.
  useEffect(() => {
    if (!viewedUser?._id) {
      setViewSummary(null);
      return;
    }
    let cancelled = false;
    setViewLoading(true);
    setViewSummary(null);
    axios
      .get(`${import.meta.env.VITE_BACKEND_URL}/api/admin/users/${viewedUser._id}/summary`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("userToken")}` },
      })
      .then(({ data }) => {
        if (!cancelled) setViewSummary(data);
      })
      .catch(() => {
        if (!cancelled) setViewSummary(null);
      })
      .finally(() => {
        if (!cancelled) setViewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewedUser?._id]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    role: "customer",
  });

  const [walletCreditModal, setWalletCreditModal] = useState(null); // { userId, userName }
  const [walletCreditAmount, setWalletCreditAmount] = useState("");
  const [walletCreditNote, setWalletCreditNote] = useState("");
  const [walletCreditLoading, setWalletCreditLoading] = useState(false);

  const handleAdminCredit = async () => {
    const amt = Number(walletCreditAmount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    setWalletCreditLoading(true);
    try {
      const token = localStorage.getItem("userToken");
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/wallet/admin-credit`,
        { userId: walletCreditModal.userId, amount: amt, note: walletCreditNote || "Admin credit" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`₹${amt.toLocaleString("en-IN")} credited to ${walletCreditModal.userName}'s wallet`);
      setWalletCreditModal(null);
      setWalletCreditAmount("");
      setWalletCreditNote("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to credit wallet");
    } finally {
      setWalletCreditLoading(false);
    }
  };

  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    message: '',
    onConfirm: null,
  });

  const openConfirm = (message, onConfirm) => {
    setConfirmModal({ visible: true, message, onConfirm });
  };

  const closeConfirm = () => {
    setConfirmModal({ visible: false, message: '', onConfirm: null });
  };

  const handleRoleChange = (userId, newRole) => {
    const userToUpdate = users.find((u) => u._id === userId);
    if (userToUpdate && userToUpdate.role !== newRole) {
      openConfirm(`Change ${userToUpdate.name}'s role to ${newRole}?`, () => {
        dispatch(
          updateUser({
            id: userId,
            name: userToUpdate.name,
            email: userToUpdate.email,
            role: newRole,
          })
        );
        toast.success(`${userToUpdate.name}'s role updated to ${newRole}`, {
          position: toast.POSITION.TOP_RIGHT,
          autoClose: 2000,
        });
      });
    }
  };

  const openEdit = (u) => {
    setEditForm({
      name: u.name || "",
      email: /@phone\.raphaaa$/i.test(u.email || "") ? "" : (u.email || ""),
      mobile: u.mobile || "",
      role: u.role || "customer",
    });
    setEditUser(u);
  };

  const handleEditSave = async () => {
    const mobile = editForm.mobile.replace(/\D/g, "").slice(-10);
    if (editForm.mobile && mobile.length !== 10) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }
    if (!editForm.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!editForm.email.trim() && !mobile) {
      toast.error("Keep an email address or a phone number");
      return;
    }
    setEditSaving(true);
    try {
      const res = await dispatch(
        updateUser({
          id: editUser._id,
          name: editForm.name.trim(),
          email: editForm.email.trim(),
          role: editForm.role,
          mobile,
        })
      );
      if (res.type?.endsWith("/fulfilled")) {
        toast.success("User updated");
        setEditUser(null);
      } else {
        toast.error(res.payload || "Failed to update user");
      }
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteUser = (userId) => {
    openConfirm("Are you sure you want to delete this user?", () => {
      return dispatch(deleteUser(userId)).then(() => {
        toast.success("User deleted successfully", {
          position: toast.POSITION.TOP_RIGHT,
          autoClose: 2000,
        });
      });
    });
  };


  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const mobile = formData.mobile.replace(/\D/g, "").slice(-10);
    if (formData.mobile && mobile.length !== 10) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }
    if (!formData.email.trim() && !mobile) {
      toast.error("Enter an email address or a phone number");
      return;
    }
    dispatch(addUser({ ...formData, mobile }));
    setFormData({ name: "", email: "", mobile: "", password: "", role: "customer" });
  };

  // Phone-only accounts carry a placeholder email — don't show it as real.
  const displayEmail = (u) =>
    /@phone\.raphaaa$/i.test(u?.email || "") ? "" : u?.email || "";

  // const handleRoleChange = (userId, newRole) => {
  //   const userToUpdate = users.find((u) => u._id === userId);
  //   if (userToUpdate && userToUpdate.role !== newRole) {
  //     if (
  //       window.confirm(
  //         `Are you sure you want to change ${userToUpdate.name}'s role to ${newRole}?`
  //       )
  //     ) {
  //       dispatch(
  //         updateUser({
  //           id: userId,
  //           name: userToUpdate.name,
  //           email: userToUpdate.email,
  //           role: newRole,
  //         })
  //       );
  //       toast.success(`${userToUpdate.name}'s role updated to ${newRole}`, {
  //         position: toast.POSITION.TOP_RIGHT,
  //         autoClose: 2000,
  //       });
  //     }
  //   }
  // };

  // const handleDeleteUser = (userId) => {
  //   if (window.confirm("Are you sure you want to delete this user?")) {
  //     dispatch(deleteUser(userId));
  //   }
  // };

  const exportToExcel = () => {
    const data = filteredUsers.map((u) => ({
      Name: u.name,
      Email: displayEmail(u),
      Phone: u.mobile ? `+91${u.mobile}` : "",
      Role: u.role,
      CreatedAt: new Date(u.createdAt).toLocaleString(),
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
    XLSX.writeFile(workbook, "Users.xlsx");
  };

  const filteredUsers = users
    .filter((u) => u.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter((u) => {
      if (user?.role === "admin") return true;
      if (user?.role === "merchantise") {
        return (
          // u.role === "customer" ||
          u.role === "delivery_boy"
          // u.role === "merchantise"
        );
      }
      return false;
    })
    .filter((u) => (roleFilter ? u.role === roleFilter : true));

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / usersPerPage));
  const page = Math.min(currentPage, totalPages);
  const paginatedUsers = filteredUsers.slice(
    (page - 1) * usersPerPage,
    page * usersPerPage
  );
  const rangeStart = filteredUsers.length === 0 ? 0 : (page - 1) * usersPerPage + 1;
  const rangeEnd = Math.min(page * usersPerPage, filteredUsers.length);

  // Snap back to page 1 whenever the result set changes underneath the pager.
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, usersPerPage]);

  // Keep currentPage in range after deletes shrink the list.
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4"> User Management</h2>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      {/* Add new user form */}
      {/* ... unchanged add user form ... */}
      <div className="p-6 bg-white shadow-md rounded-lg mb-6">
        <h3 className="text-lg font-bold mb-6">Add New User</h3>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="name"
                className="block text-gray-700 mb-1 font-medium"
              >
                Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="block text-gray-700 mb-1 font-medium"
              >
                Email <span className="text-gray-400 font-normal">(optional if phone is given)</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label
                htmlFor="mobile"
                className="block text-gray-700 mb-1 font-medium"
              >
                Phone Number <span className="text-gray-400 font-normal">(primary login)</span>
              </label>
              <div className="flex rounded-md border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-blue-400">
                <span className="bg-gray-100 text-gray-600 text-sm flex items-center px-3 select-none">+91</span>
                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={(e) =>
                    setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })
                  }
                  placeholder="10-digit mobile"
                  className="w-full px-4 py-2 focus:outline-none"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Optional. If set, the user logs in with this number; otherwise with email.
              </p>
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-gray-700 mb-1 font-medium"
              >
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>
            <div>
              <label
                htmlFor="role"
                className="block text-gray-700 mb-1 font-medium"
              >
                Role
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {user?.role === "admin" && (
                  <>
                    <option value="customer">Customer</option>
                    <option value="admin">Admin</option>
                    <option value="merchantise">Merchantise</option>
                    <option value="marketing">Marketing</option>
                    <option value="delivery_boy">Delivery Boy</option>
                  </>
                )}

                {user?.role === "merchantise" && (
                  <>
                    <option value="">Select Role</option>
                    {/* <option value="merchantise">Merchantise</option> */}
                    {/* <option value="marketing">Marketing</option> */}
                    <option value="delivery_boy">Delivery Boy</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="mt-6">
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded shadow"
              disabled={loading}
            >
              {loading ? "Adding..." : "Add User"}
            </button>
          </div>
        </form>
      </div>

      {/* user list management */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h3 className="text-lg font-bold text-gray-800">Manage Existing Users</h3>
          <button
            onClick={exportToExcel}
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
          >
            <RiFileExcel2Line size={18} /> Export
          </button>
        </div>
        <div className="mb-5 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search by name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="sm:w-44 px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">All Roles</option>
            <option value="customer">Customer</option>
            <option value="admin">Admin</option>
            <option value="merchantise">Merchantise</option>
            <option value="marketing">Marketing</option>
            <option value="delivery_boy">Delivery Boy</option>
          </select>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="py-3 px-4 font-semibold text-left">User</th>
                <th className="py-3 px-4 font-semibold text-left">Email</th>
                <th className="py-3 px-4 font-semibold text-left">Phone</th>
                <th className="py-3 px-4 font-semibold text-left">Role</th>
                {/* {user.role === "admin" && (
                  <th className="py-3 px-4 font-semibold text-left">Change Role</th>
                )} */}
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50/70 transition-colors">
                    {/* User */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {u.photo ? (
                          <img
                            src={u.photo}
                            alt={u.name}
                            className="w-9 h-9 rounded-full object-cover border border-gray-200 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold shrink-0">
                            {(u.name || displayEmail(u) || "?").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{u.name || "—"}</p>
                          {u.createdAt && (
                            <p className="text-xs text-gray-400">
                              Joined {new Date(u.createdAt).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3 px-4 text-gray-600 break-all">
                      {displayEmail(u) || <span className="text-gray-300">—</span>}
                    </td>

                    {/* Phone */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-gray-600">
                      {u.mobile ? `+91 ${u.mobile}` : <span className="text-gray-300 font-sans">—</span>}
                    </td>

                    {/* Role */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block text-xs font-semibold px-3 py-1 rounded-full text-white ${
                          ROLE_STYLES[u.role] || ROLE_STYLES.customer
                        }`}
                      >
                        {roleLabel(u.role)}
                      </span>
                    </td>

                    {/* Change Role */}
                    {/* {user.role === "admin" && (
                      <td className="py-3 px-4">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u._id, e.target.value)}
                          className="px-2 py-1.5 border border-gray-200 text-xs rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                          disabled={loading}
                        >
                          <option value="customer">Customer</option>
                          {user?.role === "admin" && (
                            <>
                              <option value="admin">Admin</option>
                              <option value="merchantise">Merchantise</option>
                              <option value="marketing">Marketing</option>
                              <option value="delivery_boy">Delivery Boy</option>
                            </>
                          )}
                          {user?.role === "merchantise" && (
                            <option value="delivery_boy">Delivery Boy</option>
                          )}
                        </select>
                      </td>
                    )} */}

                    {/* Actions */}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewedUser(u)}
                          title="View details"
                          aria-label="View details"
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition"
                        >
                          <HiOutlineEye className="text-base" />
                        </button>
                        {(user?.role === "admin" ||
                          (user?.role === "merchantise" && u.role === "delivery_boy")) && (
                          <button
                            onClick={() => openEdit(u)}
                            title="Edit user"
                            aria-label="Edit user"
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-600 transition"
                          >
                            <HiOutlinePencilSquare className="text-base" />
                          </button>
                        )}
                        {user?.role === "admin" && u.role === "customer" && (
                          <button
                            onClick={() => setWalletCreditModal({ userId: u._id, userName: u.name })}
                            title="Credit wallet"
                            aria-label="Credit wallet"
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 transition"
                          >
                            <HiOutlineWallet className="text-base" />
                          </button>
                        )}
                        {u._id !== user._id &&
                          (user?.role === "admin" ||
                            (user?.role === "merchantise" && u.role === "delivery_boy")) && (
                            <button
                              onClick={() => handleDeleteUser(u._id)}
                              title="Delete user"
                              aria-label="Delete user"
                              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition"
                            >
                              <HiOutlineTrash className="text-base" />
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={user.role === "admin" ? 6 : 5}
                    className="text-center py-12 text-gray-400"
                  >
                    <p className="text-3xl mb-2">🧑‍🤝‍🧑</p>
                    <p className="text-sm font-medium">
                      {searchTerm || roleFilter ? "No users match your filters" : "No users yet"}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500 order-2 sm:order-1">
            {filteredUsers.length === 0 ? (
              "No users"
            ) : (
              <>
                Showing{" "}
                <span className="font-semibold text-gray-700">
                  {rangeStart}–{rangeEnd}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-gray-700">
                  {filteredUsers.length}
                </span>{" "}
                users
              </>
            )}
          </p>

          <div className="flex items-center gap-3 order-1 sm:order-2">
            <label className="flex items-center gap-2 text-sm text-gray-500">
              Rows
              <select
                value={usersPerPage}
                onChange={(e) => setUsersPerPage(Number(e.target.value))}
                className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage(page - 1)}
                  disabled={page === 1}
                  aria-label="Previous page"
                  className="w-9 h-9 flex items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ‹
                </button>

                {buildPageList(page, totalPages).map((p, i) =>
                  p === "…" ? (
                    <span
                      key={`gap-${i}`}
                      className="w-9 h-9 flex items-center justify-center text-gray-400 select-none"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      aria-current={p === page ? "page" : undefined}
                      className={`min-w-9 h-9 px-2 flex items-center justify-center rounded-md border text-sm font-medium transition ${
                        p === page
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-gray-300 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  type="button"
                  onClick={() => setCurrentPage(page + 1)}
                  disabled={page === totalPages}
                  aria-label="Next page"
                  className="w-9 h-9 flex items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ›
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {confirmModal.visible && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={closeConfirm}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-center transition-all duration-300 scale-95 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Confirm Action</h3>
            <p className="text-sm text-gray-600 mb-6">{confirmModal.message}</p>
            <div className="flex justify-center gap-4">
              <button
                className="px-5 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                onClick={async () => {
                  try {
                    const maybePromise = confirmModal.onConfirm?.();
                    // If onConfirm returned a promise (async), await it
                    if (maybePromise?.then) await maybePromise;
                  } finally {
                    closeConfirm(); // always closes, even if onConfirm throws
                  }
                }}

              >
                Confirm
              </button>
              <button
                className="px-5 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                onClick={closeConfirm}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={() => !editSaving && setEditUser(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="text-sm font-bold text-gray-800">Edit User</h3>
              <button
                onClick={() => setEditUser(null)}
                disabled={editSaving}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-500 hover:bg-gray-100 transition text-lg font-bold disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                  Email <span className="text-gray-400 font-normal normal-case">(optional if phone is set)</span>
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                  Phone Number
                </label>
                <div className="flex rounded-xl border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-blue-300 bg-gray-50 focus-within:bg-white">
                  <span className="bg-gray-100 text-gray-600 text-sm flex items-center px-3 select-none">+91</span>
                  <input
                    type="tel"
                    value={editForm.mobile}
                    onChange={(e) =>
                      setEditForm({ ...editForm, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })
                    }
                    placeholder="10-digit mobile"
                    className="w-full px-3 py-2.5 text-sm bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              {user?.role === "admin" && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                    Role
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
                  >
                    <option value="customer">Customer</option>
                    <option value="admin">Admin</option>
                    <option value="merchantise">Merchantise</option>
                    <option value="marketing">Marketing</option>
                    <option value="delivery_boy">Delivery Boy</option>
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleEditSave}
                  disabled={editSaving}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
                    editSaving
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {editSaving ? "Saving…" : "Save Changes"}
                </button>
                <button
                  onClick={() => setEditUser(null)}
                  disabled={editSaving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View User Modal */}
      {viewedUser && (() => {
        const uv = viewSummary?.user || viewedUser;
        const s = viewSummary?.stats;
        const fmtINR = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
        const fmtDate = (d) =>
          d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
        const statusPill = (st) => {
          const map = {
            Delivered: "bg-emerald-100 text-emerald-700",
            "RTO Delivered": "bg-emerald-100 text-emerald-700",
            Cancelled: "bg-red-100 text-red-700",
            Refunded: "bg-red-100 text-red-700",
            "RTO Initiated": "bg-red-100 text-red-700",
          };
          return map[st] || "bg-amber-100 text-amber-700";
        };
        const tiles = s
          ? [
              { label: "Total Orders", value: s.total, cls: "text-gray-800" },
              { label: "Successful", value: s.successful, cls: "text-blue-600" },
              { label: "Delivered", value: s.delivered, cls: "text-emerald-600" },
              { label: "Cancelled", value: s.cancelled, cls: "text-red-600" },
              { label: "In Progress", value: s.active, cls: "text-amber-600" },
              { label: "Total Spent", value: fmtINR(s.totalSpent), cls: "text-gray-800", wide: true },
            ]
          : [];

        return (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 px-4"
          onClick={() => setViewedUser(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden max-h-[88vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-linear-to-r from-blue-600 to-indigo-600 p-6 text-white shrink-0">
              <div className="flex items-start gap-4">
                {uv.photo ? (
                  <img
                    src={uv.photo}
                    alt={uv.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white/70 shadow shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-white text-blue-600 flex items-center justify-center text-2xl font-bold border-2 border-white/70 shadow shrink-0">
                    {(uv.name || displayEmail(uv) || "?").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-bold truncate">{uv.name || "—"}</h3>
                  <span className="inline-block mt-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/20 capitalize">
                    {roleLabel(uv.role)}
                  </span>
                  <p className="text-sm text-white/85 mt-2 break-all">
                    {displayEmail(uv) || "No email"}
                  </p>
                  <p className="text-sm text-white/85">
                    {uv.mobile ? `+91 ${uv.mobile}` : "No phone"}
                  </p>
                </div>
                <button
                  onClick={() => setViewedUser(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition text-lg font-bold shrink-0"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6 overflow-y-auto">
              {viewLoading && (
                <p className="text-sm text-gray-400 text-center py-4">Loading activity…</p>
              )}

              {/* Order stats */}
              {s && (
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                    Order Activity
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {tiles.map((t) => (
                      <div
                        key={t.label}
                        className={`rounded-xl border border-gray-100 bg-gray-50 p-3 ${
                          t.wide ? "col-span-2 sm:col-span-3" : ""
                        }`}
                      >
                        <p className={`text-lg font-extrabold ${t.cls}`}>{t.value}</p>
                        <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                          {t.label}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-xs text-gray-500">
                    <span>Wallet balance: <strong className="text-gray-800">{fmtINR(viewSummary.walletBalance)}</strong></span>
                    <span>First order: <strong className="text-gray-800">{fmtDate(viewSummary.firstOrderAt)}</strong></span>
                    <span>Last order: <strong className="text-gray-800">{fmtDate(viewSummary.lastOrderAt)}</strong></span>
                  </div>
                </div>
              )}

              {/* Recent orders */}
              {viewSummary?.recentOrders?.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                    Recent Orders
                  </p>
                  <div className="rounded-xl border border-gray-100 divide-y divide-gray-100">
                    {viewSummary.recentOrders.map((o) => (
                      <div key={o._id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 truncate">#{o.orderId || o._id.slice(-6)}</p>
                          <p className="text-xs text-gray-400">
                            {fmtDate(o.createdAt)} · {o.paymentMethod || "—"}
                          </p>
                        </div>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusPill(o.status)}`}>
                          {o.status}
                        </span>
                        <span className="font-bold text-gray-800 shrink-0 w-20 text-right">{fmtINR(o.totalPrice)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {s && s.total === 0 && !viewLoading && (
                <p className="text-sm text-gray-400">This user hasn't placed any orders yet.</p>
              )}

              {/* Addresses */}
              {uv.addresses?.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                    Saved Addresses ({uv.addresses.length})
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {uv.addresses.map((addr, idx) => (
                      <div
                        key={addr._id || idx}
                        className="border border-gray-100 bg-gray-50 rounded-xl p-3 text-sm text-gray-600 relative"
                      >
                        {addr.isDefault && (
                          <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-blue-600 text-white font-semibold">
                            Default
                          </span>
                        )}
                        <p className="font-semibold text-gray-800">
                          {[addr.firstName, addr.lastName].filter(Boolean).join(" ") || uv.name}
                        </p>
                        <p className="mt-0.5">{addr.address}{addr.landmark ? `, ${addr.landmark}` : ""}</p>
                        <p>{[addr.city, addr.state, addr.postalCode].filter(Boolean).join(", ")}</p>
                        <p>{addr.country}</p>
                        {addr.phone && <p className="mt-0.5">📞 {addr.phone}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Meta */}
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500 pt-2 border-t border-gray-100">
                <span>User ID: <span className="font-mono text-gray-700">{uv._id}</span></span>
                <span>Joined: <strong className="text-gray-800">{fmtDate(uv.createdAt)}</strong></span>
                {uv.referralCode && <span>Referral code: <strong className="text-gray-800">{uv.referralCode}</strong></span>}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 border-t border-gray-100 p-4 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => { setViewedUser(null); openEdit(uv); }}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-white transition"
              >
                Edit
              </button>
              <button
                onClick={() => setViewedUser(null)}
                className="bg-gray-700 hover:bg-gray-800 text-white px-5 py-2 rounded-lg text-sm font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
        );
      })()}
      {/* ── Admin Wallet Credit Modal ── */}
      {walletCreditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={() => setWalletCreditModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-emerald-50">
              <div>
                <h3 className="text-sm font-bold text-gray-800">Credit Wallet</h3>
                <p className="text-xs text-gray-500 mt-0.5">User: <span className="font-semibold">{walletCreditModal.userName}</span></p>
              </div>
              <button onClick={() => setWalletCreditModal(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-500 hover:bg-gray-100 transition text-lg font-bold">
                ×
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Amount (₹)</label>
                <input
                  type="number" min="1" placeholder="e.g. 200"
                  value={walletCreditAmount}
                  onChange={(e) => setWalletCreditAmount(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-gray-50 focus:bg-white transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Note (optional)</label>
                <input
                  type="text" placeholder="e.g. Birthday bonus, Refund adjustment…"
                  value={walletCreditNote}
                  onChange={(e) => setWalletCreditNote(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-gray-50 focus:bg-white transition"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleAdminCredit}
                  disabled={walletCreditLoading || !walletCreditAmount || Number(walletCreditAmount) <= 0}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
                    walletCreditLoading || !walletCreditAmount
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  {walletCreditLoading ? "Crediting…" : "Credit Wallet"}
                </button>
                <button
                  onClick={() => setWalletCreditModal(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
