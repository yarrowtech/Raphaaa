// frontend/src/pages/marketing/CampaignTracker.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast, Toaster } from "sonner";
import { Link } from "react-router-dom";

const CampaignTracker = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [sourceReport, setSourceReport] = useState({ rows: [], recentOrders: [] });
    const [form, setForm] = useState({
        name: "",
        platform: "Google",
        productUrl: "",
        startDate: "",
        endDate: "",
        budget: "",
        status: "Draft"
    });
    const [isPublished, setIsPublished] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [savedCampaign, setSavedCampaign] = useState(null);
    const token = localStorage.getItem("userToken");
    console.log(token);

    useEffect(() => {
        fetchCampaigns();
        fetchSourceReport();
    }, []);

    const fetchCampaigns = async () => {
        try {
            const { data } = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/campaigns`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("userToken")}`
                }
            });
            setCampaigns(Array.isArray(data.data) ? data.data : []);
        } catch {
            toast.error("Failed to load campaigns");
        }
    };

    const fetchSourceReport = async () => {
        try {
            const { data } = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/admin/analytics/source-report`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("userToken")}`
                }
            });
            setSourceReport({
                rows: Array.isArray(data.rows) ? data.rows : [],
                recentOrders: Array.isArray(data.recentOrders) ? data.recentOrders : [],
            });
        } catch {
            setSourceReport({ rows: [], recentOrders: [] });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingId) {
                const { data } = await axios.put(`${import.meta.env.VITE_BACKEND_URL}/api/campaigns/${editingId}`, { ...form }, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                setSavedCampaign(data?.data || null);
                toast.success("Campaign updated");
            } else {
                const { data } = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/campaigns`, { ...form }, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                setSavedCampaign(data?.data || null);
                toast.success("Campaign added");
            }
            resetForm({ keepSaved: true });
            fetchCampaigns();
        } catch {
            toast.error("Failed to save campaign");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (campaign) => {
        setForm({
            name: campaign.name,
            platform: campaign.platform,
            productUrl: campaign.productUrl || campaign.utmLink || "",
            startDate: campaign.startDate?.split("T")[0] || "",
            endDate: campaign.endDate?.split("T")[0] || "",
            budget: campaign.budget,
            status: campaign.status
        });
        setEditingId(campaign._id);
        setIsPublished(campaign.status === "Active");
        setSavedCampaign(campaign);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/campaigns/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            toast.success("Campaign deleted");
            fetchCampaigns();
        } catch {
            toast.error("Failed to delete campaign");
        }
    };

    const resetForm = ({ keepSaved = false } = {}) => {
        setForm({
            name: "",
            platform: "Google",
            productUrl: "",
            startDate: "",
            endDate: "",
            budget: "",
            status: "Draft"
        });
        setEditingId(null);
        setIsPublished(false);
        if (!keepSaved) setSavedCampaign(null);
    };

    return (
        <div className="max-w-6xl mx-auto p-6 mt-10">
            {/* <Toaster richColors position="top-center" /> */}

            <div className="rounded-2xl border border-gray-200 bg-white shadow-lg">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
                        {editingId ? "Edit Campaign" : "Create Campaign"}
                    </h2>
                    <span
                        className={`text-xs px-3 py-1 rounded-full border ${isPublished
                            ? "border-green-300 bg-green-50 text-green-600"
                            : "border-yellow-300 bg-yellow-50 text-yellow-600"
                            }`}
                    >
                        {isPublished ? "Published" : "Draft"}
                    </span>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
                    {/* Campaign Name */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Campaign Name</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full rounded-xl bg-gray-50 border border-gray-300 px-4 py-2.5 text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-sky-400 outline-none"
                            placeholder="e.g., Winter Sale 2025"
                            required
                        />
                    </div>

                    {/* Platform & Publish Toggle */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Platform</label>
                            <select
                                value={form.platform}
                                onChange={(e) => setForm({ ...form, platform: e.target.value })}
                                className="w-full rounded-xl bg-gray-50 border border-gray-300 px-4 py-2.5 text-gray-800 focus:ring-2 focus:ring-sky-400 outline-none"
                            >
                                <option>Google</option>
                                <option>Instagram</option>
                                <option>Facebook</option>
                            </select>
                        </div>

                        <div className="flex items-end md:items-center">
                            <label className="inline-flex items-center cursor-pointer select-none">
                                <span className="mr-3 text-sm">Draft</span>
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={isPublished}
                                    onChange={(e) => {
                                        setIsPublished(e.target.checked);
                                        setForm({ ...form, status: e.target.checked ? "Active" : "Draft" });
                                    }}
                                />
                                <span className="relative inline-block w-14 h-8 rounded-full bg-gray-300 peer-checked:bg-green-500 transition-colors">
                                    <span className="absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform duration-300 peer-checked:translate-x-6" />
                                </span>
                                <span className="ml-3 text-sm font-medium text-gray-800">
                                    Publish now
                                </span>
                            </label>

                        </div>
                    </div>

                    {/* Product URL */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Product URL</label>
                        <input
                            type="text"
                            value={form.productUrl}
                            onChange={(e) => setForm({ ...form, productUrl: e.target.value })}
                            placeholder="/product/t-shirt or https://www.raphaaa.com/product/t-shirt"
                            className="w-full rounded-xl bg-gray-50 border border-gray-300 px-4 py-2.5 text-gray-800 focus:ring-2 focus:ring-sky-400 outline-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Generated Landing URL</label>
                        <input
                            type="text"
                            readOnly
                            value={savedCampaign?.utmLink || ""}
                            placeholder="Save the campaign to generate the tracked URL"
                            className="w-full rounded-xl bg-gray-100 border border-gray-200 px-4 py-2.5 text-gray-500 outline-none"
                        />
                    </div>

                    {/* Dates & Budget */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Start Date</label>
                            <input
                                type="date"
                                value={form.startDate}
                                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                                className="w-full rounded-xl bg-gray-50 border border-gray-300 px-4 py-2.5 text-gray-800 focus:ring-2 focus:ring-sky-400 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">End Date</label>
                            <input
                                type="date"
                                value={form.endDate}
                                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                                className="w-full rounded-xl bg-gray-50 border border-gray-300 px-4 py-2.5 text-gray-800 focus:ring-2 focus:ring-sky-400 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Budget</label>
                            <input
                                type="number"
                                value={form.budget}
                                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                                placeholder="5000"
                                className="w-full rounded-xl bg-gray-50 border border-gray-300 px-4 py-2.5 text-gray-800 focus:ring-2 focus:ring-sky-400 outline-none"
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-3">
                        {editingId && (
                            <button
                                type="button"
                                onClick={resetForm}
                                className="rounded-xl bg-gray-300 px-6 py-3 text-gray-800 font-semibold hover:bg-gray-400 transition"
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={loading}
                            className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 px-6 py-3 text-white font-semibold shadow-lg hover:opacity-95 disabled:opacity-60 transition"
                        >
                            {loading ? "Saving..." : editingId ? "Update Campaign" : "Save Campaign"}
                        </button>
                    </div>
                </form>
            </div>

            <div className="mt-8 rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Source Report</h3>
                        <p className="text-xs text-gray-500">Orders captured from Facebook, Instagram, and other tracked links</p>
                    </div>
                    <button
                        onClick={fetchSourceReport}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50"
                    >
                        Refresh
                    </button>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {sourceReport.rows.length > 0 ? sourceReport.rows.map((row) => (
                        <div key={row.source} className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{row.source}</p>
                            <p className="text-2xl font-extrabold text-gray-900 mt-2">{row.orders}</p>
                            <p className="text-sm text-gray-500 mt-1">₹{Number(row.revenue || 0).toLocaleString("en-IN")} revenue</p>
                        </div>
                    )) : (
                        <p className="text-sm text-gray-500">No source data yet.</p>
                    )}
                </div>
                <div className="px-6 pb-6">
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-xs uppercase tracking-widest text-gray-500">
                                <tr>
                                    <th className="p-3">Order</th>
                                    <th className="p-3">Customer</th>
                                    <th className="p-3">Source</th>
                                    <th className="p-3">Total</th>
                                    <th className="p-3">Landing</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sourceReport.recentOrders.length > 0 ? sourceReport.recentOrders.map((order) => (
                                    <tr key={order._id} className="border-t">
                                        <td className="p-3 text-sm font-mono text-gray-700">
                                            <Link to={`/order/${order._id}`} className="text-sky-600 hover:underline">
                                                {order.orderId || order._id.slice(-8)}
                                            </Link>
                                        </td>
                                        <td className="p-3 text-sm text-gray-700">{order.customerName}<div className="text-xs text-gray-400">{order.customerEmail}</div></td>
                                        <td className="p-3 text-sm text-gray-700 capitalize">{order.source}</td>
                                        <td className="p-3 text-sm text-gray-700">₹{Number(order.totalPrice || 0).toLocaleString("en-IN")}</td>
                                        <td className="p-3 text-xs text-gray-500 break-all">{order.landingPage || "—"}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="5" className="p-6 text-center text-gray-500">No tracked orders yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Campaign Table */}
            <div className="mt-8 rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-sky-500 text-white">
                        <tr>
                            <th className="p-4">Name</th>
                            <th className="p-4">Platform</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Budget</th>
                            <th className="p-4">Clicks</th>
                            <th className="p-4">Impr.</th>
                            <th className="p-4">CTR %</th>
                            <th className="p-4">Conv.</th>
                            <th className="p-4">CVR %</th>
                            <th className="p-4">Track URL</th>
                            <th className="p-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {campaigns.length > 0 ? (
                            campaigns.map((c) => (
                                <tr
                                    key={c._id}
                                    className="border-b hover:bg-gray-50 transition"
                                >
                                    <td className="p-4">{c.clicks ?? 0}</td>
                                    <td className="p-4">{c.impressions ?? 0}</td>
                                    <td className="p-4">{c.ctr?.toFixed?.(2) ?? ((c.impressions ? (c.clicks / c.impressions * 100) : 0).toFixed(2))}</td>
                                    <td className="p-4">{c.conversions ?? 0}</td>
                                    <td className="p-4">{c.conversionRate?.toFixed?.(2) ?? ((c.clicks ? (c.conversions / c.clicks * 100) : 0).toFixed(2))}</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <input
                                                readOnly
                                                value={`${import.meta.env.VITE_BACKEND_URL}/api/campaigns/r/${c._id}`}
                                                className="w-56 rounded border px-2 py-1 text-xs"
                                            />
                                            <button
                                                onClick={() => navigator.clipboard.writeText(`${import.meta.env.VITE_BACKEND_URL}/api/campaigns/r/${c._id}`)}
                                                className="text-xs bg-gray-800 text-white px-2 py-1 rounded"
                                            >
                                                Copy
                                            </button>
                                        </div>
                                    </td>
                                    <td className="p-4 flex justify-center gap-3">
                                        <button
                                            onClick={() => handleEdit(c)}
                                            className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded transition"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(c._id)}
                                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded transition"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="p-6 text-center text-gray-500">
                                    No campaigns found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CampaignTracker;
