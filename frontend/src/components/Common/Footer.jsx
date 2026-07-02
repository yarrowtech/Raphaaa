import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import Logo from "../../assets/logo1.png";
import visa from "../../assets/visa.png";
import mastercard from "../../assets/mastercard.png";
import upi from "../../assets/upi.png";
import {
  FaTruck, FaUndo, FaLock, FaHeadset,
  FaWhatsapp, FaPhone, FaEnvelope,
} from "react-icons/fa";
import { HiArrowRight } from "react-icons/hi";
import { getActiveSocialLinks, getSocialIcon } from "../../utils/socialLinks";

const Footer = () => {
  const [subscribe,   setSubscribe]   = useState("");
  const [loading,     setLoading]     = useState(false);
  const [contactInfo, setContactInfo] = useState(null);
  const startYear = 2025;
  const year = new Date().getFullYear();
  const socialLinks = getActiveSocialLinks(contactInfo);

  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_BACKEND_URL}/api/settings/contact`)
      .then(({ data }) => setContactInfo(data))
      .catch(() => {});
  }, []);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!subscribe.trim()) return toast.error("Please enter a valid email");
    setLoading(true);
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/subscribe`,
        { email: subscribe },
        { headers: { "Content-Type": "application/json" } }
      );
      toast.success(data.message || "Subscribed successfully!");
      setSubscribe("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Subscription failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="bg-linear-to-b from-sky-50 to-blue-50 text-gray-700">

      {/* ── Trust Strip ── */}
      <div className="border-b border-sky-100 bg-white/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: <FaTruck   className="text-sky-600 text-xl" />,   title: "Free Shipping",       sub: "On orders above ₹999" },
              { icon: <FaUndo    className="text-blue-600 text-xl" />,  title: "Easy 15-Day Returns", sub: "Hassle-free returns" },
              { icon: <FaLock    className="text-sky-700 text-xl" />,   title: "Secure Payments",     sub: "100% safe & encrypted" },
              { icon: <FaHeadset className="text-blue-700 text-xl" />,  title: "24/7 Support",        sub: "We're always here" },
            ].map(({ icon, title, sub }) => (
              <div key={title} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center shrink-0">
                  {icon}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800 leading-tight">{title}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Footer Grid ── */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Col 1 — Brand + Newsletter */}
          <div className="lg:col-span-1">
            <Link to="/">
              <img src={Logo} alt="Raphaaa" className="h-10 w-auto mb-4" />
            </Link>
            <p className="text-sm text-gray-500 leading-relaxed mb-5">
              Discover premium fashion crafted for every occasion. Style that speaks for itself.
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-2.5 mb-6">
              {socialLinks.map((link) => {
                const Icon = getSocialIcon(link.platform);
                return (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    title={link.label}
                    className="w-9 h-9 rounded-full bg-sky-100 hover:bg-sky-600 hover:text-white text-sky-700 flex items-center justify-center transition-all duration-200"
                  >
                    <Icon className="text-sm" />
                  </a>
                );
              })}
              {contactInfo?.whatsappNumber && (
                <a href={`https://wa.me/${contactInfo.whatsappNumber}`} target="_blank" rel="noreferrer"
                  className="w-9 h-9 rounded-full bg-sky-100 hover:bg-emerald-500 hover:text-white text-sky-700 flex items-center justify-center transition-all duration-200">
                  <FaWhatsapp className="text-sm" />
                </a>
              )}
            </div>

            {/* Newsletter */}
            <p className="text-xs font-bold text-sky-700 uppercase tracking-widest mb-1.5">Newsletter</p>
            <p className="text-xs text-gray-500 mb-3">Get 10% off your first order</p>
            <form onSubmit={handleSubscribe} className="flex">
              <input
                type="email"
                placeholder="Enter your email"
                value={subscribe}
                onChange={(e) => setSubscribe(e.target.value)}
                disabled={loading}
                className="flex-1 px-3 py-2.5 text-sm bg-white border border-sky-200 rounded-l-xl focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-gray-700 placeholder:text-gray-400"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold rounded-r-xl transition-colors"
              >
                {loading ? "…" : <HiArrowRight />}
              </button>
            </form>
          </div>

          {/* Col 2 — Shop */}
          <div>
            <h4 className="text-xs font-bold text-sky-700 uppercase tracking-widest mb-5">Shop</h4>
            <ul className="space-y-3">
              {[
                { to: "/collections/all?gender=Men",     label: "Men's Collections" },
                // { to: "/collections/all?category=Bottom+Wear&gender=Men",  label: "Men's Bottom Wear" },
                { to: "/collections/all?gender=Women",   label: "Women's Collections" },
                // { to: "/collections/all?category=Bottom+Wear&gender=Women",label: "Women's Bottom Wear" },
                { to: "/collections/all",                                   label: "All Collections" },
                { to: "/collections/all?sort=newest",                       label: "New Arrivals" },
                { to: "/collections/all?sort=bestseller",                   label: "Best Sellers" },
              ].map(({ to, label }) => (
                <li key={label}>
                  <Link to={to}
                    className="text-sm text-gray-500 hover:text-sky-700 transition-colors flex items-center gap-1.5 group">
                    <span className="w-0 group-hover:w-3 overflow-hidden transition-all duration-200 shrink-0">
                      <HiArrowRight className="text-sky-500 text-xs" />
                    </span>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3 — Help */}
          <div>
            <h4 className="text-xs font-bold text-sky-700 uppercase tracking-widest mb-5">Help &amp; Policies</h4>
            <ul className="space-y-3">
              {[
                { to: "/about",               label: "About Us" },
                { to: "/contact-us",          label: "Contact Us" },
                { to: "/privacy-policy",      label: "Privacy Policy" },
                { to: "/terms",               label: "Terms & Conditions" },
                { to: "/shipping-policy",     label: "Shipping Policy" },
                { to: "/return-policy",       label: "Return & Refund Policy" },
                { to: "/cancellation-policy", label: "Cancellation Policy" },
                // { to: "/refer",               label: "🎁 Refer & Earn" },
              ].map(({ to, label }) => (
                <li key={label}>
                  <Link to={to}
                    className="text-sm text-gray-500 hover:text-sky-700 transition-colors flex items-center gap-1.5 group">
                    <span className="w-0 group-hover:w-3 overflow-hidden transition-all duration-200 shrink-0">
                      <HiArrowRight className="text-sky-500 text-xs" />
                    </span>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4 — Contact */}
          <div>
            <h4 className="text-xs font-bold text-sky-700 uppercase tracking-widest mb-5">Contact Us</h4>
            <ul className="space-y-4">
              {contactInfo?.showPhone && contactInfo.phone && (
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center shrink-0 mt-0.5">
                    <FaPhone className="text-sky-600 text-xs" />
                  </div>
                  <div>
                    <p className="text-[11px] text-sky-600 font-bold uppercase tracking-wider mb-0.5">Phone</p>
                    <a href={`tel:${contactInfo.phone}`} className="text-sm text-gray-600 hover:text-sky-700 transition-colors">
                      {contactInfo.phone}
                    </a>
                  </div>
                </li>
              )}
              {contactInfo?.showGmail && contactInfo.gmail && (
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center shrink-0 mt-0.5">
                    <FaEnvelope className="text-sky-600 text-xs" />
                  </div>
                  <div>
                    <p className="text-[11px] text-sky-600 font-bold uppercase tracking-wider mb-0.5">Email</p>
                    <a href={`mailto:${contactInfo.gmail}`} className="text-sm text-gray-600 hover:text-sky-700 transition-colors break-all">
                      {contactInfo.gmail}
                    </a>
                  </div>
                </li>
              )}
              {contactInfo?.grievanceOfficerEmail && (
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                    <FaHeadset className="text-blue-600 text-xs" />
                  </div>
                  <div>
                    <p className="text-[11px] text-blue-600 font-bold uppercase tracking-wider mb-0.5">Grievance Officer</p>
                    <p className="text-sm text-gray-700">{contactInfo.grievanceOfficerName}</p>
                    <a href={`mailto:${contactInfo.grievanceOfficerEmail}`} className="text-xs text-gray-500 hover:text-sky-700 transition-colors break-all">
                      {contactInfo.grievanceOfficerEmail}
                    </a>
                  </div>
                </li>
              )}
            </ul>

            {/* App download */}
            {/* <div className="mt-6">
              <p className="text-[11px] text-sky-600 font-bold uppercase tracking-wider mb-3">Download App</p>
              <div className="flex flex-col gap-2">
                {[
                  { label: "Google Play", sub: "Available on", icon: "▶" },
                  { label: "App Store",   sub: "Download on the", icon: "🍎" },
                ].map(({ label, sub, icon }) => (
                  <div key={label}
                    className="flex items-center gap-2.5 bg-white border border-sky-200 hover:border-sky-400 rounded-xl px-3 py-2 cursor-pointer transition-colors shadow-sm">
                    <span className="text-lg leading-none">{icon}</span>
                    <div>
                      <p className="text-[10px] text-gray-400 leading-none">{sub}</p>
                      <p className="text-xs font-bold text-gray-700">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div> */}
          </div>

        </div>
      </div>

      {/* ── Bottom Bar — rich sky→blue gradient ── */}
      <div className="bg-linear-to-r from-sky-700 via-sky-800 to-blue-900 text-sky-100">

        {/* Payment methods */}
        <div className="max-w-7xl mx-auto px-4 pt-6 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <span className="text-[11px] text-sky-300 uppercase tracking-widest">We Accept</span>
            {[
              { src: visa,       alt: "Visa" },
              { src: mastercard, alt: "Mastercard" },
              { src: upi,        alt: "UPI" },
            ].map(({ src, alt }) => (
              <div key={alt} className="bg-white rounded-md px-2 py-1 flex items-center justify-center">
                <img src={src} alt={alt} className="h-4 object-contain" />
              </div>
            ))}
            {["COD", "EMI"].map((label) => (
              <div key={label} className="bg-sky-900/60 border border-sky-600 rounded-md px-2.5 py-1">
                <span className="text-[10px] font-bold text-sky-200">{label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-sky-300 text-center">🔒 256-bit SSL Encrypted · 100% Authentic Products</p>
        </div>

        {/* Legal entity */}
        {(contactInfo?.gstin || contactInfo?.registeredAddress || contactInfo?.businessName) && (
          <div className="max-w-7xl mx-auto px-4 py-4 border-t border-sky-700/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px] text-sky-400">
              <div className="space-y-0.5">
                <p className="text-sky-200 font-semibold">{contactInfo?.businessName || "Raphaaa by Citimart"}</p>
                {contactInfo?.registeredAddress && <p>{contactInfo.registeredAddress}</p>}
                {contactInfo?.gstin && (
                  <p>GSTIN: <span className="font-mono text-sky-300">{contactInfo.gstin}</span></p>
                )}
                {contactInfo?.cin && (
                  <p>CIN: <span className="font-mono text-sky-300">{contactInfo.cin}</span></p>
                )}
              </div>
              {(contactInfo?.grievanceOfficerName || contactInfo?.grievanceOfficerEmail) && (
                <div className="space-y-0.5">
                  <p className="text-sky-200 font-semibold">Consumer Grievance Officer</p>
                  {contactInfo.grievanceOfficerName && <p>{contactInfo.grievanceOfficerName}</p>}
                  {contactInfo.grievanceOfficerEmail && (
                    <a href={`mailto:${contactInfo.grievanceOfficerEmail}`} className="hover:text-sky-200 transition-colors">
                      {contactInfo.grievanceOfficerEmail}
                    </a>
                  )}
                  <p>Response: within {contactInfo.grievanceResponseTime || "48 hours"}</p>
                  <p className="text-sky-600 mt-0.5">As per Consumer Protection (E-Commerce) Rules, 2020</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Copyright */}
        <div className="max-w-7xl mx-auto px-4 py-4 border-t border-sky-700/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-sky-400">
            &copy; {startYear === year ? startYear : `${startYear}–${year}`}{" "}
            <span className="text-sky-200 font-semibold">Raphaaa</span>. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-sky-400">
            {[
              { to: "/privacy-policy",  label: "Privacy" },
              { to: "/terms",           label: "Terms" },
              { to: "/return-policy",   label: "Returns" },
              { to: "/sitemap.xml",     label: "Sitemap" },
            ].map(({ to, label }, i, arr) => (
              <React.Fragment key={label}>
                <Link to={to} className="hover:text-sky-200 transition-colors">{label}</Link>
                {i < arr.length - 1 && <span className="text-sky-700">·</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
