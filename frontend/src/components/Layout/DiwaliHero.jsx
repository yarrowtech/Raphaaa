import React from "react";
import { Link } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";
import sparklesSvg from "../../assets/diwali-hero-sparkles.svg?raw";
import lightStringSvg from "../../assets/diwali-hero-lightstring.svg?raw";
import lanternSvg from "../../assets/diwali-hero-lantern.svg?raw";

const FIT_FILTERS = [
  { label: "Relaxed", to: "/collections/all?search=relaxed" },
  { label: "T-Shirt", to: "/collections/all?search=t-shirt" },
  { label: "Casual Shirt", to: "/collections/all?search=casual+shirt" },
];

/**
 * DiwaliHero — matches Reference/Landing Page 2 Diwali/Main.dc.html #top
 * section literally: fixed 1436px content width (capped, fluid below that),
 * 700px height, padding "56px 80px 0", grid-template-columns
 * "minmax(0,1fr) 620px", gap 40px, the radial purple gradient, the gold
 * top accent bar, twinkling bulbs, hanging light string, the lantern/rangoli
 * artwork and the diya row fading into the next section.
 */
const DiwaliHero = ({ activeOffer }) => {
  return (
    <section
      className="diwali-hero relative overflow-hidden grid items-center w-full"
      style={{
        height: "700px",
        width: "100%",
        padding: "56px 80px 0",
        gridTemplateColumns: "minmax(0, 1fr) 620px",
        gap: "40px",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        background:
          "radial-gradient(ellipse 70% 85% at 72% 45%, #a06db6 0%, #84529c 35%, #6c3f86 65%, #573070 100%)",
      }}
    >
      {/* Gold festive top accent */}
      <div
        className="absolute left-0 right-0 top-0"
        style={{
          height: "8px",
          background: "linear-gradient(90deg, #f5b942, #ff8a1f, #d81b60, #ff8a1f, #f5b942)",
        }}
      />

      {/* Twinkling bulbs scattered across the hero */}
      <div
        className="absolute inset-0 pointer-events-none"
        dangerouslySetInnerHTML={{ __html: sparklesSvg }}
      />

      {/* Hanging marigold light string under the top accent */}
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{ top: 0 }}
        dangerouslySetInnerHTML={{ __html: lightStringSvg }}
      />

      {/* Text column */}
      <div className="relative z-20 flex flex-col" style={{ gap: "28px", width: "641px", maxWidth: "100%" }}>
        <div className="flex items-center" style={{ gap: "12px" }}>
          <span
            lang="bn"
            style={{ fontFamily: "'Hind Siliguri', sans-serif", fontSize: "20px", fontWeight: 700, color: "rgb(255, 207, 90)" }}
          >
            শুভ দীপাবলি
          </span>
          <span aria-hidden="true" style={{ width: "6px", height: "6px", borderRadius: "9999px", background: "rgb(255, 138, 31)" }} />
          <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.12em", color: "rgb(243, 217, 177)" }}>
            &nbsp;1,240 STYLES
          </span>
        </div>

        <h1 className="m-0" style={{ fontSize: "72px", lineHeight: 1.02, fontWeight: 800, letterSpacing: "-0.035em", width: "621px", maxWidth: "100%" }}>
          <span className="block" style={{ color: "#fff4e0" }}>Light up in</span>
          <span className="block" style={{ color: "#ffc24a", textShadow: "0 0 24px rgba(255,170,60,.45)" }}>style that fits.</span>
        </h1>

        <p className="m-0" style={{ maxWidth: "520px", fontSize: "18px", lineHeight: "28px", color: "#e6d6ee" }}>
          Diyas, rangoli and a fresh fit. Heavyweight cottons, waffle knits and knitted polos from Raphaaa Studio and the labels you trust.
          {activeOffer?.offerPercentage ? ` Up to ${activeOffer.offerPercentage}% off this Diwali.` : " Up to 57% off this Diwali."}
        </p>

        {/* Fit filter pills */}
        <div role="group" aria-label="Pick your silhouette" className="flex flex-wrap" style={{ gap: "8px" }}>
          {FIT_FILTERS.map((f) => (
            <Link
              key={f.label}
              to={f.to}
              className="inline-flex items-center font-semibold"
              style={{
                height: "48px",
                padding: "0 22px",
                borderRadius: "9999px",
                fontSize: "14px",
                fontWeight: 600,
                color: "#fff4e0",
                border: "1px solid #f5b942",
                background: "rgba(255,255,255,.04)",
              }}
            >
              {f.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center flex-wrap" style={{ gap: "12px", marginTop: "4px" }}>
          <Link
            to="/collections/all"
            className="inline-flex items-center justify-center font-bold"
            style={{
              height: "44px",
              width: "160px",
              padding: "0 22px",
              borderRadius: "9999px",
              fontSize: "15px",
              fontWeight: 700,
              gap: "10px",
              background: "#00adfd",
              color: "#ffffff",
            }}
          >
            Shop Now <FiArrowRight />
          </Link>

          <span
            className="inline-flex items-center font-bold"
            style={{
              height: "40px",
              padding: "0 16px",
              borderRadius: "9999px",
              background: "rgba(245,185,66,.14)",
              border: "1px dashed #f5b942",
              color: "#ffd98a",
              fontSize: "13px",
              fontWeight: 700,
              gap: "8px",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f5b942" strokeWidth="1.6" strokeLinejoin="round">
              <path d="M12 3c2 3 3 5 0 8-3-3-2-5 0-8z" fill="#ffb21a" stroke="none" />
              <path d="M3 13h18c0 4-4 7-9 7s-9-3-9-7z" />
            </svg>
            Diwali Special · up to {activeOffer?.offerPercentage || 57}% off
          </span>
        </div>
      </div>

      {/* Lantern / rangoli artwork */}
      <div className="relative z-10" style={{ height: "600px" }} dangerouslySetInnerHTML={{ __html: lanternSvg }} />

      {/* Blend the purple hero into the cream product section below */}
      <div
        aria-hidden="true"
        className="absolute left-0 right-0 bottom-0 pointer-events-none"
        style={{
          height: "260px",
          zIndex: 1,
          background:
            "linear-gradient(to bottom, rgba(255,247,234,0) 0%, rgba(255,247,234,.55) 55%, rgba(255,247,234,.9) 80%, #fff7ea 100%)",
        }}
      />
    </section>
  );
};

export default DiwaliHero;
