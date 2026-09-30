import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi2";
import LandingProductCard from "./LandingProductCard";

/**
 * LandingProductSection — matches the reference's #shop / #shirts sections
 * literally: 1436px content width, 920px height, padding "80px 80px 0",
 * gap 32px; kicker 12/700/0.12em/#707072, heading 40/48/800/-0.02em;
 * pager 44x44 radius-4 border #D4D5D9; filter chips h44 radius-full border
 * #7DD3FC; 4-col grid gap 24px.
 */
const LandingProductSection = ({
  kicker,
  heading,
  products = [],
  loading,
  error,
  filters = [],
  activeFilter,
  onFilterChange,
  wishlistItems = [],
  onToggleWish,
  viewAllTo = "/collections/all",
  background, // CSS background value for the section (first vs second section differ)
  borderTop,
}) => {
  const PER_PAGE = 4;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(products.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = products.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
  useEffect(() => { setPage(1); }, [activeFilter]);

  return (
    <section
      className="landing-product-section w-full flex flex-col"
      style={{
        width: "100%",
        minHeight: "920px",
        padding: "80px 80px 0",
        gap: "32px",
        background: background || "#ffffff",
        borderTop: borderTop || "none",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <div className="flex flex-col" style={{ gap: "20px" }}>
        <div className="landing-section-heading flex justify-between items-end">
          <div className="flex flex-col" style={{ gap: "8px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.12em", color: "#707072" }}>
              {kicker}
            </div>
            <h2 className="m-0" style={{ fontSize: "40px", lineHeight: "48px", fontWeight: 800, letterSpacing: "-0.02em", color: "#111111" }}>
              {heading}
            </h2>
          </div>

          <div className="flex items-center" style={{ gap: "16px" }}>
            <span style={{ fontSize: "13px", color: "#707072" }}>
              {products.length > 0 ? `Page ${currentPage} of ${totalPages}` : ""}
            </span>
            <div className="flex" style={{ gap: "8px" }}>
              <button
                type="button"
                aria-label="Previous products"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center justify-center"
                style={{ width: "44px", height: "44px", borderRadius: "4px", border: "1px solid #D4D5D9", background: "#ffffff", opacity: page === 1 ? 0.4 : 1 }}
              >
                <HiChevronLeft style={{ color: "#111111" }} />
              </button>
              <button
                type="button"
                aria-label="Next products"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center justify-center"
                style={{ width: "44px", height: "44px", borderRadius: "4px", border: "1px solid #D4D5D9", background: "#ffffff", opacity: currentPage === totalPages ? 0.4 : 1 }}
              >
                <HiChevronRight style={{ color: "#111111" }} />
              </button>
            </div>
          </div>
        </div>

        {filters.length > 0 && (
          <div className="flex flex-wrap items-center" style={{ gap: "8px" }}>
            {filters.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => onFilterChange?.(f.value)}
                aria-pressed={activeFilter === f.value}
                className="inline-flex items-center font-semibold"
                style={{
                  height: "44px",
                  padding: "0 18px",
                  borderRadius: "9999px",
                  fontSize: "13px",
                  fontWeight: 600,
                  gap: "8px",
                  border: "1px solid #7DD3FC",
                  background: activeFilter === f.value ? "#111111" : "transparent",
                  color: activeFilter === f.value ? "#ffffff" : "#111111",
                }}
              >
                {f.label}
                {typeof f.count === "number" && (
                  <span style={{ fontSize: "11px", fontWeight: 700, opacity: 0.7 }}>{f.count}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="landing-product-grid grid" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "24px" }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-100" style={{ height: "400px", marginBottom: "12px" }} />
              <div className="h-3 bg-gray-100 w-1/3 mb-2" />
              <div className="h-3 bg-gray-100 w-2/3" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div role="alert" className="py-16 text-center text-[#707072] text-sm">Unable to load this collection. Please try again later.</div>
      ) : pageItems.length === 0 ? (
        <div className="py-16 text-center text-[#707072] text-sm">No products found in this collection yet.</div>
      ) : (
        <div className="landing-product-grid grid" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "24px" }}>
          {pageItems.map((p) => (
            <LandingProductCard
              key={p._id}
              product={p}
              wishlistItems={wishlistItems}
              onToggleWish={onToggleWish}
            />
          ))}
        </div>
      )}

      <div className="text-center" style={{ paddingTop: "8px", paddingBottom: "32px" }}>
        <Link
          to={viewAllTo}
          className="inline-flex items-center font-bold"
          style={{ gap: "6px", fontSize: "13px", color: "#111111" }}
        >
          View all →
        </Link>
      </div>
    </section>
  );
};

export default LandingProductSection;
