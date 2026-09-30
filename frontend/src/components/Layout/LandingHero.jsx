import React from "react";
import { Link } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";
import FestiveGarland from "./FestiveGarland";
import heroImg from "../../assets/landing-hero-festive.jpg";

const FIT_FILTERS = [
  { label: "Drop shoulder", to: "/collections/all?search=drop+shoulder" },
  { label: "Relaxed", to: "/collections/all?search=relaxed" },
  { label: "Boxy", to: "/collections/all?search=boxy" },
  { label: "Polo", to: "/collections/all?search=polo" },
];

/**
 * LandingHero — matches Reference/Landing Page/Main.dc.html #top section
 * literally: fixed 1436px content width (capped, fluid below that), 700px
 * height, padding "56px 80px 0", grid-template-columns "minmax(0,1fr) 620px",
 * gap 40px, the exact 8-stop gradient, and the exact type-scale/pill specs.
 */
const LandingHero = ({ activeOffer }) => {
  const kickerLabel = "DURGA PUJA EDIT";

  return (
    <section
      className="landing-hero relative overflow-hidden grid items-center w-full"
      style={{
        height: "700px",
        width: "100%",
        padding: "56px 80px 0",
        gridTemplateColumns: "minmax(0, 1fr) 620px",
        gap: "40px",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        background:
          "linear-gradient(90deg, #fff7ea 0%, #fff7ea 38%, #fbe8cc 47%, #efc08a 55%, #d58a58 63%, #a8583a 71%, #8f4b28 80%, #7a3a1e 100%)",
      }}
    >
      {/* Festive top strip */}
      <div
        className="absolute left-0 right-0 top-0"
        style={{ height: "14px", background: "#b3121f", borderBottom: "3px solid #e0a526" }}
      />

      {/* Garland motif */}
      <div className="absolute top-[14px] left-0 right-0 z-10 opacity-90 pointer-events-none">
        <FestiveGarland variant="top" width={1436} />
      </div>

      {/* Hero photo — bleeds in from the right, masked with a horizontal fade */}
      <div
        className="landing-hero-photo absolute pointer-events-none"
        style={{
          right: "-39px",
          top: "16px",
          width: "900px",
          height: "700px",
          maskImage:
            "linear-gradient(to right, transparent 0%, rgba(0,0,0,.2) 10%, rgba(0,0,0,.55) 20%, rgba(0,0,0,.88) 30%, #000 38%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, rgba(0,0,0,.2) 10%, rgba(0,0,0,.55) 20%, rgba(0,0,0,.88) 30%, #000 38%)",
        }}
      >
        <img
          src={heroImg}
          alt="Raphaaa seasonal edit"
          className="w-full h-full object-cover"
          style={{ objectPosition: "60% 25%" }}
        />
      </div>

      {/* Text column */}
      <div className="landing-hero-copy relative z-20 flex flex-col" style={{ gap: "28px", maxWidth: "641px" }}>
        <div className="flex items-center" style={{ gap: "12px" }}>
          <span lang="bn" className="landing-greeting">শুভ শারদীয়া</span>
          <span aria-hidden="true" className="landing-greeting-dot" />
          <span
            className="font-bold"
            style={{ fontSize: "12px", letterSpacing: "0.12em", color: "#7a4a12" }}
          >
            {kickerLabel}
          </span>
        </div>

        <h1
          className="m-0"
          style={{ fontSize: "72px", fontWeight: 800, lineHeight: 1.02, letterSpacing: "-0.035em", maxWidth: "621px" }}
        >
          <span className="block" style={{ color: "rgb(42, 20, 8)" }}>
            Pandal-hop in
          </span>
          <span className="block" style={{ color: "rgb(179, 18, 31)" }}>
            Style that fit.
          </span>
        </h1>

        <p className="m-0" style={{ maxWidth: "520px", fontSize: "18px", lineHeight: "28px", color: "#5a3a22" }}>
          From Shashthi to Dashami: heavyweight cottons, waffle knits and knitted polos from Raphaaa Studio and the labels you trust.
          {activeOffer?.offerPercentage ? ` Up to ${activeOffer.offerPercentage}% off for Pujo.` : " Discover your Pujo look."}
        </p>

        {/* Fit filter pills */}
        <div className="flex flex-wrap" style={{ gap: "8px" }}>
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
                color: "#000000",
                border: "1px solid #e0a526",
                background: "transparent",
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

          {activeOffer?.offerPercentage ? (
            <Link
              to="/offers"
              className="inline-flex items-center font-bold"
              style={{
                height: "40px",
                padding: "0 16px",
                borderRadius: "9999px",
                background: "#fdebc8",
                border: "1px dashed #c98a12",
                color: "#7a4a12",
                fontSize: "13px",
                fontWeight: 700,
                gap: "8px",
              }}
            >
              {activeOffer.offerPercentage}% off — {activeOffer.title}
            </Link>
          ) : null}
        </div>
      </div>

      {/* Hanging garland along the bottom edge, fading into next section */}
      <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none">
        <FestiveGarland variant="bottom" width={1436} />
      </div>
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{ height: "220px", zIndex: 1, background: "linear-gradient(to bottom, rgba(255,247,234,0) 0%, rgba(255,247,234,.6) 45%, rgba(255,247,234,.95) 80%, #fff7ea 100%)" }}
      />
    </section>
  );
};

export default LandingHero;
