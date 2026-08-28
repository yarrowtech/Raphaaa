import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import axios from "axios";
import { FaEnvelope, FaPhone, FaPlus, FaTrash } from "react-icons/fa";
import { FaMessage } from "react-icons/fa6";
import {
  SOCIAL_PLATFORM_OPTIONS,
  getSocialIcon,
  mapContactToSocialLinks,
} from "../utils/socialLinks";

const createSocialLink = (overrides = {}) => ({
  platform: "facebook",
  label: "Facebook",
  url: "",
  enabled: true,
  ...overrides,
});

const AdminContactSettings = () => {
  const [form, setForm] = useState({
    socialLinks: [createSocialLink({ enabled: false })],
    showFacebook: false,
    facebookUrl: "",
    showInstagram: false,
    instagramUrl: "",
    showTwitter: false,
    twitterUrl: "",
    showGmail: false,
    gmail: "",
    showPhone: false,
    phone: "",
    showTopText: false,
    topText: "",
    // Legal & business
    businessName:          "Raphaaa by Citimart",
    registeredAddress:     "",
    gstin:                 "",
    cin:                   "",
    grievanceOfficerName:  "",
    grievanceOfficerEmail: "",
    grievanceResponseTime: "48 hours",
    // WhatsApp
    whatsappNumber:        "",
    // Exit-intent popup
    exitIntentEnabled:  true,
    exitIntentCoupon:   "WELCOME10",
    exitIntentDiscount: "10%",
    // Manual bank / payment offers (product page, display-only)
    bankOffers: [],
  });

  const [loading, setLoading] = useState(false);
  const [uploadingLogoIndex, setUploadingLogoIndex] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/settings/contact`
        );
        const socialLinks = mapContactToSocialLinks(data);
        setForm((prev) => ({
          ...prev,
          ...data,
          socialLinks: socialLinks.length ? socialLinks : [createSocialLink({ enabled: false })],
          bankOffers: Array.isArray(data.bankOffers) ? data.bankOffers : [],
        }));
      } catch {
        toast.error("Failed to load contact settings");
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSocialLinkChange = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      socialLinks: prev.socialLinks.map((link, linkIndex) => {
        if (linkIndex !== index) return link;

        if (field === "platform") {
          const nextLabel = value === "custom" ? link.label || "Custom" : SOCIAL_PLATFORM_OPTIONS.find((option) => option.value === value)?.label || link.label;
          return {
            ...link,
            platform: value,
            label: nextLabel,
          };
        }

        return {
          ...link,
          [field]: value,
        };
      }),
    }));
  };

  const addSocialLink = () => {
    setForm((prev) => ({
      ...prev,
      socialLinks: [...prev.socialLinks, createSocialLink({ platform: "custom", label: "Custom" })],
    }));
  };

  const removeSocialLink = (index) => {
    setForm((prev) => ({
      ...prev,
      socialLinks: prev.socialLinks.length > 1
        ? prev.socialLinks.filter((_, linkIndex) => linkIndex !== index)
        : [createSocialLink({ enabled: false })],
    }));
  };

  const addBankOffer = () => {
    setForm((prev) => ({
      ...prev,
      bankOffers: [...(prev.bankOffers || []), { text: "", tncUrl: "", enabled: true }],
    }));
  };

  const removeBankOffer = (index) => {
    setForm((prev) => ({
      ...prev,
      bankOffers: (prev.bankOffers || []).filter((_, i) => i !== index),
    }));
  };

  const handleBankOfferChange = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      bankOffers: (prev.bankOffers || []).map((offer, i) =>
        i === index ? { ...offer, [field]: value } : offer
      ),
    }));
  };

  const handleBankOfferLogoUpload = async (index, file) => {
    if (!file) return;
    try {
      setUploadingLogoIndex(index);
      const imgData = new FormData();
      imgData.append("image", file);
      const { data } = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/upload`,
        imgData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${localStorage.getItem("userToken")}`,
          },
        }
      );
      handleBankOfferChange(index, "logo", data.imageUrl);
    } catch {
      toast.error("Logo upload failed");
    } finally {
      setUploadingLogoIndex(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem("userToken");
      await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/api/settings/contact`,
        form,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Contact settings updated successfully!");
    } catch {
      toast.error("Failed to update settings");
    } finally {
      setLoading(false);
    }
  };

  const ToggleCheckbox = ({ name, checked, onChange, children }) => (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="text-sm font-medium text-gray-800 flex items-center gap-2">
        {children}
      </span>
      <div className="relative">
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={onChange}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-300 rounded-full peer-checked:bg-sky-500 transition-all duration-300" />
        <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-all duration-300 peer-checked:translate-x-5 shadow-md" />
      </div>
    </label>
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 bg-white shadow-2xl rounded-2xl mt-12 border border-gray-200">
      <h2 className="text-3xl font-bold mb-8 text-sky-700">Contact Settings</h2>

      <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-10">
        {/* === SOCIAL SECTION === */}
        <div>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-700">Social Links</h3>
              <p className="text-sm text-gray-500 mt-1">
                Add any social network you want to show in the topbar, footer, and mobile menu.
              </p>
            </div>
            <button
              type="button"
              onClick={addSocialLink}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100 transition-colors"
            >
              <FaPlus className="text-xs" />
              Add Link
            </button>
          </div>

          <div className="space-y-4">
            {form.socialLinks.map((link, index) => {
              const Icon = getSocialIcon(link.platform);

              return (
                <div key={`${link.platform}-${index}`} className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm">
                        <Icon className="text-base" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Social Link {index + 1}</p>
                        <p className="text-xs text-gray-500">Choose the platform and paste the profile URL.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ToggleCheckbox
                        name={`socialLinks.${index}.enabled`}
                        checked={link.enabled}
                        onChange={(event) => handleSocialLinkChange(index, "enabled", event.target.checked)}
                      >
                        Active
                      </ToggleCheckbox>
                      <button
                        type="button"
                        onClick={() => removeSocialLink(index)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm hover:text-red-600 hover:bg-red-50 transition-colors"
                        aria-label="Remove social link"
                      >
                        <FaTrash className="text-xs" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                        Platform
                      </label>
                      <select
                        value={link.platform}
                        onChange={(event) => handleSocialLinkChange(index, "platform", event.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm bg-white"
                      >
                        {SOCIAL_PLATFORM_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                        Display Label
                      </label>
                      <input
                        type="text"
                        value={link.label}
                        onChange={(event) => handleSocialLinkChange(index, "label", event.target.value)}
                        placeholder="Instagram, YouTube, Pinterest..."
                        className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Profile URL
                    </label>
                    <input
                      type="url"
                      value={link.url}
                      onChange={(event) => handleSocialLinkChange(index, "url", event.target.value)}
                      placeholder="https://www.youtube.com/@yourbrand"
                      className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* === CONTACT SECTION === */}
        <div>
          <h3 className="text-xl font-semibold text-gray-700 mb-4">
            Contact Info
          </h3>

          {/* Gmail */}
          <div className="space-y-2 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-800 flex items-center gap-2">
                <FaEnvelope className="text-red-500" /> Show Gmail
              </span>
              <ToggleCheckbox
                name="showGmail"
                checked={form.showGmail}
                onChange={handleChange}
              />
            </div>

            <input
              type="email"
              name="gmail"
              placeholder="yourmail@gmail.com"
              value={form.gmail}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-400 text-sm"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-800 flex items-center gap-2">
                <FaPhone className="text-green-600" /> Show Phone
              </span>
              <ToggleCheckbox
                name="showPhone"
                checked={form.showPhone}
                onChange={handleChange}
              />
            </div>

            <div className="flex rounded-lg shadow-sm border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-green-500">
              <span className="bg-gray-100 text-gray-700 text-sm flex items-center px-3 select-none">
                +91
              </span>
              <input
                type="tel"
                name="phone"
                placeholder="9876543210"
                value={form.phone.replace("+91", "")}
                onChange={(e) =>
                  handleChange({
                    target: {
                      name: "phone",
                      value:
                        "+91" +
                        e.target.value.replace(/[^0-9]/g, "").slice(0, 10),
                    },
                  })
                }
                className="w-full p-3 text-sm focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* === TOP BAR TEXT === */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-800 flex items-center gap-2">
              <FaMessage className="text-sky-600" /> Show Top-Bar Text
            </span>
            <ToggleCheckbox
              name="showTopText"
              checked={form.showTopText}
              onChange={handleChange}
            />
          </div>
          <input
            name="topText"
            type="text"
            placeholder="e.g. Free shipping on orders over ₹999"
            value={form.topText}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
          />
        </div>

        {/* ── Legal & Business Info ── */}
        <div className="md:col-span-2 border-t border-gray-100 pt-6">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-4">
            🏛️ Legal &amp; Business Info
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: "businessName",         label: "Business / Brand Name",          placeholder: "Raphaaa by Citimart" },
              { name: "gstin",                label: "GSTIN",                           placeholder: "27XXXXX (15-digit GST number)" },
              { name: "cin",                  label: "CIN (optional)",                  placeholder: "Company Identification Number" },
              { name: "registeredAddress",    label: "Registered Address",              placeholder: "Full registered address" },
              { name: "grievanceOfficerName", label: "Consumer Grievance Officer Name", placeholder: "Full name" },
              { name: "grievanceOfficerEmail",label: "Grievance Officer Email",         placeholder: "grievance@raphaaa.com" },
              { name: "grievanceResponseTime",label: "Response Time",                   placeholder: "e.g. 48 hours" },
            ].map(({ name, label, placeholder }) => (
              <div key={name}>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
                <input
                  name={name}
                  type="text"
                  placeholder={placeholder}
                  value={form[name] || ""}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── WhatsApp Support ── */}
        <div className="md:col-span-2 border-t border-gray-100 pt-6">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-4">
            💬 WhatsApp Support Widget
          </h2>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              WhatsApp Number <span className="font-normal normal-case text-gray-400">(with country code, digits only)</span>
            </label>
            <input
              name="whatsappNumber"
              type="text"
              placeholder="e.g. 919876543210 (no + or spaces)"
              value={form.whatsappNumber || ""}
              onChange={handleChange}
              className="w-full md:w-1/2 p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">Leave empty to hide the WhatsApp chat widget on the site.</p>
          </div>
        </div>

        {/* ── Exit-Intent Popup ── */}
        <div className="md:col-span-2 border-t border-gray-100 pt-6">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-4">
            🎯 Exit-Intent Popup
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3 flex items-center gap-3 mb-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setForm((p) => ({ ...p, exitIntentEnabled: !p.exitIntentEnabled }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${form.exitIntentEnabled ? "bg-emerald-500" : "bg-gray-300"}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.exitIntentEnabled ? "left-6" : "left-1"}`} />
                </div>
                <span className={`text-sm font-semibold ${form.exitIntentEnabled ? "text-emerald-600" : "text-gray-400"}`}>
                  {form.exitIntentEnabled ? "Enabled" : "Disabled"}
                </span>
              </label>
              <p className="text-xs text-gray-400">Shows a coupon popup when visitor tries to leave the site</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Coupon Code</label>
              <input
                name="exitIntentCoupon"
                type="text"
                placeholder="e.g. STAY10"
                value={form.exitIntentCoupon || ""}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Discount Text</label>
              <input
                name="exitIntentDiscount"
                type="text"
                placeholder="e.g. 10% or ₹100"
                value={form.exitIntentDiscount || ""}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              />
            </div>
          </div>
        </div>

        {/* ── Bank / Payment Offers (Product Page) ── */}
        <div className="md:col-span-2 border-t border-gray-100 pt-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest">
                💳 Bank &amp; Payment Offers
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Shown in the “Bank Offers” box on every product page. Display-only —
                the discount is applied by the bank / payment provider.
              </p>
            </div>
            <button
              type="button"
              onClick={addBankOffer}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100 transition-colors shrink-0"
            >
              <FaPlus className="text-xs" />
              Add Offer
            </button>
          </div>

          <div className="space-y-3">
            {(form.bankOffers || []).length === 0 && (
              <p className="text-sm text-gray-400 italic">No bank offers added.</p>
            )}
            {(form.bankOffers || []).map((offer, index) => (
              <div
                key={index}
                className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-sm font-semibold text-gray-800">Offer {index + 1}</p>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
                      <input
                        type="checkbox"
                        className="accent-sky-500"
                        checked={offer.enabled !== false}
                        onChange={(e) => handleBankOfferChange(index, "enabled", e.target.checked)}
                      />
                      Active
                    </label>
                    <button
                      type="button"
                      onClick={() => removeBankOffer(index)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm hover:text-red-600 hover:bg-red-50 transition-colors"
                      aria-label="Remove bank offer"
                    >
                      <FaTrash className="text-xs" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="shrink-0">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Bank / Card Logo
                    </label>
                    <label className="flex h-16 w-24 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-sky-200 bg-white overflow-hidden hover:bg-sky-50 transition">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleBankOfferLogoUpload(index, e.target.files?.[0])}
                      />
                      {uploadingLogoIndex === index ? (
                        <span className="text-[10px] text-sky-500 animate-pulse">Uploading…</span>
                      ) : offer.logo ? (
                        <img src={offer.logo} alt="" className="h-full w-full object-contain p-1" />
                      ) : (
                        <span className="text-[10px] text-gray-400 text-center px-1">+ Add logo</span>
                      )}
                    </label>
                    {offer.logo && (
                      <button
                        type="button"
                        onClick={() => handleBankOfferChange(index, "logo", "")}
                        className="mt-1 text-[10px] text-red-500 hover:text-red-700"
                      >
                        Remove logo
                      </button>
                    )}
                  </div>

                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                        Offer Text
                      </label>
                      <input
                        type="text"
                        value={offer.text || ""}
                        onChange={(e) => handleBankOfferChange(index, "text", e.target.value)}
                        placeholder="Unlimited 1% cashback with Amazon Pay ICICI Bank Credit Card"
                        className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                        T&amp;C URL (optional)
                      </label>
                      <input
                        type="url"
                        value={offer.tncUrl || ""}
                        onChange={(e) => handleBankOfferChange(index, "tncUrl", e.target.value)}
                        placeholder="https://..."
                        className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="md:col-span-2 pt-8 text-right">
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-sky-500 text-white px-6 py-3 text-sm font-semibold rounded-lg shadow-md hover:from-blue-700 hover:to-sky-600 transition duration-200"
          >
            {loading ? "Saving..." : "Update Settings"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminContactSettings;
