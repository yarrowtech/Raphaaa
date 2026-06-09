import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  FaChevronLeft, FaChevronRight, FaUserCircle,
  FaGlobe, FaInfoCircle, FaTrash, FaPen,
} from "react-icons/fa";
import { toast } from "sonner";
import axios from "axios";
import { updateProfile } from "../redux/slices/authSlice";
import Logo from "../assets/logo1.png";

const BUILD_DATE = new Date(__APP_BUILD_DATE__).toLocaleDateString("en-IN", {
  month: "long",
  year: "numeric",
});

function SettingsRow({ icon: _Icon, label, value, onClick, danger }) {
  void _Icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${danger ? "bg-red-50" : "bg-gray-100"}`}>
        <_Icon className={`text-xs ${danger ? "text-red-500" : "text-gray-500"}`} />
      </div>
      <span className={`flex-1 text-[14px] font-medium ${danger ? "text-red-500" : "text-gray-800"}`}>{label}</span>
      {value && <span className="text-xs text-gray-400">{value}</span>}
      {!danger && <FaChevronRight className="text-gray-300 text-xs shrink-0" />}
    </button>
  );
}

function SettingsSection({ title, children }) {
  return (
    <div className="px-4 mb-6">
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-1 pb-2">{title}</p>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
        {children}
      </div>
    </div>
  );
}

/* ─── Header shared by both Settings views ─── */
function SettingsHeader({ subtitle, onBack }) {
  return (
    <div className="px-5 pt-8 pb-6 flex items-center gap-3">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white border border-gray-100 shadow-sm text-gray-500 flex items-center justify-center shrink-0"
          aria-label="Go back"
        >
          <FaChevronLeft className="text-sm" />
        </button>
      )}
      <div>
        <h1 className="text-2xl font-black text-gray-900 leading-tight">Settings</h1>
        {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

/* ─── Edit Profile sub-view ─── */
function EditProfileView({ onBack }) {
  const dispatch = useDispatch();
  const { user, loading } = useSelector((s) => s.auth);

  const [formData, setFormData] = useState({ name: "", email: "", password: "", photo: "" });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({ name: user.name || "", email: user.email || "", password: "", photo: user.photo || "" });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const cloudForm = new FormData();
    cloudForm.append("image", file);
    try {
      setUploading(true);
      const { data } = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/upload`,
        cloudForm,
        { headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${localStorage.getItem("userToken")}` } }
      );
      setFormData((prev) => ({ ...prev, photo: data.imageUrl }));
    } catch {
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast.error("Name and email are required");
      return;
    }
    const result = await dispatch(updateProfile(formData));
    if (result?.meta?.requestStatus === "fulfilled") {
      toast.success("Profile updated successfully");
      setFormData((prev) => ({ ...prev, password: "" }));
    } else {
      toast.error("Failed to update profile");
    }
  };

  const initials = (formData.name || user?.name || "?").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen pb-28">
      <SettingsHeader subtitle="Your Profile" onBack={onBack} />

      <form onSubmit={handleSubmit} className="px-5 flex flex-col">
        {/* Avatar with edit badge */}
        <div className="relative w-20 h-20 mb-6 self-center">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-linear-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white text-2xl font-bold shadow-sm">
            {formData.photo ? <img src={formData.photo} alt="" className="w-full h-full object-cover" /> : initials}
          </div>
          <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center cursor-pointer shadow-sm">
            <FaPen className="text-white text-[10px]" />
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} disabled={uploading} />
          </label>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Name"
            required
            className="w-full px-4 py-3.5 rounded-full bg-indigo-50/70 text-sm text-gray-700 placeholder:text-gray-400 outline-none border border-transparent focus:border-sky-400 focus:bg-white transition"
          />
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Email"
            required
            className="w-full px-4 py-3.5 rounded-full bg-indigo-50/70 text-sm text-gray-700 placeholder:text-gray-400 outline-none border border-transparent focus:border-sky-400 focus:bg-white transition"
          />
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="New password (optional)"
            className="w-full px-4 py-3.5 rounded-full bg-indigo-50/70 text-sm text-gray-700 placeholder:text-gray-400 outline-none border border-sky-400 ring-2 ring-sky-100 focus:bg-white transition"
          />
        </div>

        <button
          type="submit"
          disabled={loading || uploading}
          className="mt-10 w-full py-3.5 rounded-full bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-200 disabled:opacity-50 transition"
        >
          {loading || uploading ? "Saving…" : "Save Changes"}
        </button>
      </form>
    </div>
  );
}

export default function Settings({ initialView = "menu" }) {
  const navigate = useNavigate();
  const [view, setView] = useState(initialView);

  const handleDeleteAccount = () => {
    if (window.confirm("Deleting your account is permanent and cannot be undone. To proceed, please contact our support team. Continue to Contact Us?")) {
      navigate("/contact-us");
    }
  };

  if (view === "profile") {
    return <EditProfileView onBack={() => setView("menu")} />;
  }

  return (
    <div className="min-h-screen pb-16">
      <SettingsHeader onBack={() => navigate(-1)} />

      {/* ── Personal ── */}
      <SettingsSection title="Personal">
        <SettingsRow icon={FaUserCircle} label="Profile" onClick={() => setView("profile")} />
      </SettingsSection>

      {/* ── Account ── */}
      <SettingsSection title="Account">
        <SettingsRow
          icon={FaGlobe}
          label="Language"
          value="English"
          onClick={() => toast.info("More languages coming soon!")}
        />
        <SettingsRow icon={FaInfoCircle} label="About Raphaaa" onClick={() => navigate("/about")} />
      </SettingsSection>

      {/* ── Delete account ── */}
      <div className="px-4 mb-10">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <SettingsRow icon={FaTrash} label="Delete My Account" onClick={handleDeleteAccount} danger />
        </div>
      </div>

      {/* ── Footer / version ── */}
      <div className="flex flex-col items-center gap-1.5">
        <img src={Logo} alt="Raphaaa" className="" />
        {/* <p className="text-sm font-bold text-gray-900">Raphaaa</p> */}
        <p className="text-[11px] text-gray-400">Version 1.0 · Updated {BUILD_DATE}</p>
      </div>
    </div>
  );
}
