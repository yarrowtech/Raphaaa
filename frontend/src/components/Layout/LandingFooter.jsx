import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";

/**
 * LandingFooter — matches the reference's <footer> literally: bg #f5f3f5,
 * border-top 1px solid #EEEEEE, padding "48px 80px 32px", 1436px content
 * width, grid-template-columns "1.2fr 1fr 1fr 1.6fr" gap 40px. Reuses the
 * same real routes as the app's global Footer.jsx (Help/Legal nav,
 * newsletter subscribe endpoint) rather than inventing new ones.
 */
const LandingFooter = ({ variant = "landing" }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const year = new Date().getFullYear();

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email.trim()) return toast.error("Please enter a valid email");
    setLoading(true);
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/subscribe`,
        { email },
        { headers: { "Content-Type": "application/json" } }
      );
      toast.success(data.message || "Subscribed successfully!");
      setEmail("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Subscription failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer
      className={`landing-footer ${variant === "collection" ? "collection-footer" : ""} w-full flex flex-col justify-between`}
      style={{
        width: "100%",
        minHeight: "253px",
        background: "#f5f3f5",
        borderTop: "1px solid #EEEEEE",
        padding: "48px 80px 32px",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <div className="landing-footer-grid grid" style={{ gridTemplateColumns: "1.2fr 1fr 1fr 1.6fr", gap: "40px" }}>
        {variant === "collection" && <nav aria-label="Shop" className="footer-shop flex flex-col gap-2 text-xs">
          <h3>Shop</h3>
          {["Men", "Women", "Kids"].map(gender => <Link key={gender} to={`/collections/all?gender=${gender}`}>{gender}'s fashion</Link>)}
          <Link to="/collections/all">All collections</Link>
          <Link to="/offers">Offers</Link>
        </nav>}
        {/* Brand */}
        <div className="footer-brand flex flex-col" style={{ gap: "8px" }}>
          <div style={{ fontSize: "22px", fontWeight: 800, letterSpacing: "-0.02em", color: "#111111" }}>
            RAPHAAA
          </div>
          <div style={{ fontSize: "13px", color: "#707072" }}>
            Luxury &amp; casual engineered garments.
          </div>
        </div>

        {/* Help */}
        <nav aria-label="Help" className="flex flex-col" style={{ gap: "8px", fontSize: "13px" }}>
          {variant === "collection" && <h3>Customer care</h3>}
          {[
            { to: "/my-orders", label: "Track order status" },
            { to: "/about", label: "About Us" },
            { to: "/contact-us", label: "Contact Us" },
            { to: "/shipping-policy", label: "Shipping Policy" },
            { to: "/return-policy", label: "Returns & Refunds" },
          ].map(({ to, label }) => (
            <Link key={label} to={to} style={{ color: "#111111" }}>
              {label}
            </Link>
          ))}
        </nav>

        {/* Legal */}
        <nav aria-label="Legal" className="flex flex-col" style={{ gap: "8px", fontSize: "13px" }}>
          {variant === "collection" && <h3>About Raphaaa</h3>}
          {[
            { to: "/privacy-policy", label: "Privacy Policy" },
            { to: "/terms", label: "Terms & Conditions" },
            { to: "/cancellation-policy", label: "Cancellation Policy" },
          ].map(({ to, label }) => (
            <Link key={label} to={to} style={{ color: "#111111" }}>
              {label}
            </Link>
          ))}
        </nav>

        {/* Newsletter */}
        <div className="flex flex-col" style={{ gap: "10px" }}>
          <label htmlFor="rp-email" style={{ fontSize: "13px", fontWeight: 700, color: "#111111" }}>
            {variant === "collection" ? "Stay ahead of the curve" : "Get early drops & private sale invites"}
          </label>
          {variant === "collection" && <p className="text-xs text-[#444748]">Subscribe to receive early drops, archival releases, and member-exclusive private sale invitations.</p>}
          <form onSubmit={handleSubscribe} className="flex">
            <input
              id="rp-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              disabled={loading}
              className="flex-grow min-w-0 focus:outline-none"
              style={{ height: "44px", padding: "0 14px", border: "1px solid #D4D5D9", borderRight: 0, borderRadius: "4px 0 0 4px", fontFamily: "inherit", fontSize: "13px", background: "#ffffff" }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{ height: "44px", padding: "0 20px", border: 0, borderRadius: "0 4px 4px 0", background: "#111111", color: "#ffffff", fontSize: "13px", fontWeight: 700 }}
            >
              {loading ? "…" : "Subscribe"}
            </button>
          </form>
        </div>
      </div>

      <div className="landing-footer-bottom flex justify-between" style={{ fontSize: "12px", color: "#707072" }}>
        <span>© {year} RAPHAAA Commerce Ltd. All editorial apparel rights reserved.</span>
        <Link to="/shipping-policy">Shipping & delivery</Link>
      </div>
    </footer>
  );
};

export default LandingFooter;
