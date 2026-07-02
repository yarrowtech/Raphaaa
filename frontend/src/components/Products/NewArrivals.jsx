import { useEffect, useRef, useState } from "react";
import { MdKeyboardArrowLeft, MdKeyboardArrowRight } from "react-icons/md";
import { HiSparkles } from "react-icons/hi2";
import { Link } from "react-router-dom";
import axios from "axios";
import useSmartLoader from "../../hooks/useSmartLoader";

const NewArrivals = () => {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);



  // Auto-scroll left to right, pause on hover, stop at end
  useEffect(() => {
    let isHovered = false;
    let animationId;
    const container = scrollRef.current;

    const handleMouseEnter = () => (isHovered = true);
    const handleMouseLeave = () => (isHovered = false);

    container?.addEventListener("mouseenter", handleMouseEnter);
    container?.addEventListener("mouseleave", handleMouseLeave);

    const scrollLoop = () => {
      if (container && !isHovered) {
        const maxScroll = container.scrollWidth - container.clientWidth;
        if (container.scrollLeft < maxScroll) {
          container.scrollLeft += 1;
        }
      }
      animationId = requestAnimationFrame(scrollLoop);
    };

    animationId = requestAnimationFrame(scrollLoop);

    return () => {
      cancelAnimationFrame(animationId);
      container?.removeEventListener("mouseenter", handleMouseEnter);
      container?.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  const { loading, data: newArrivals = [] } = useSmartLoader(async () => {
    const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/products/new-arrivals`);
    return res.data;
  });


  const scroll = (direction) => {
    const container = scrollRef.current;
    const scrollAmount = direction === "left" ? -300 : 300;
    if (container) {
      container.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const updateScrollButtons = () => {
    const container = scrollRef.current;
    if (container) {
      const leftScroll = container.scrollLeft;
      const maxScrollLeft = container.scrollWidth - container.clientWidth;
      setCanScrollLeft(leftScroll > 0);
      setCanScrollRight(leftScroll < maxScrollLeft);
    }
  };

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    updateScrollButtons();
    container.addEventListener("scroll", updateScrollButtons);
    window.addEventListener("resize", updateScrollButtons);

    return () => {
      container.removeEventListener("scroll", updateScrollButtons);
      window.removeEventListener("resize", updateScrollButtons);
    };
  }, [newArrivals]);

  const [collabActive, setCollabActive] = useState(false);

  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_BACKEND_URL}/api/collabs/active`)
      .then((res) => setCollabActive(res.data.isActive))
      .catch(() => setCollabActive(false));
  }, []);

  if (collabActive) return null; // ⛔ hide section when active

  return (
    <section className="py-16 px-4 lg:px-0">
      <div className="container mx-auto text-center mb-10 relative">
        <h2 className="text-3xl font-bold mb-2 inline-block relative">
          Explore New Arrivals
          <span className="block w-32 h-1 bg-gradient-to-r from-sky-300 to-sky-500 mx-auto mt-2 rounded-full"></span>
        </h2>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Discover the latest styles straight off the runway, freshly added to
          keep your wardrobe on the cutting edge of fashion.
        </p>
      </div>

      <div
        ref={scrollRef}
        className="container mx-auto overflow-x-auto flex space-x-6 scroll-smooth px-2 pb-6 new-arrivals-track"
      >
        {(loading
          ? Array.from({ length: 4 })
          : newArrivals
        ).map((product, index) =>
          loading ? (
            <div
              key={index}
              className="min-w-[85%] sm:min-w-[50%] md:min-w-[40%] lg:min-w-[30%] bg-gray-100 shadow-md rounded-xl animate-pulse"
            >
              <div className="h-80 w-full bg-gray-300 rounded-t-xl" />
              <div className="p-4">
                <div className="h-4 w-3/4 bg-gray-300 rounded mb-2" />
                <div className="h-4 w-1/2 bg-gray-300 rounded" />
              </div>
            </div>
          ) : (
            <Link
              key={`${product._id}_${index}`}
              to={`/product/${product.name.toLowerCase().replace(/\s+/g, "-")}/p/${product._id}`}
              className="min-w-55 max-w-55 bg-white rounded-2xl border border-sky-100 shadow-sm hover:shadow-md hover:border-sky-300 transition-all duration-300 group overflow-hidden flex flex-col shrink-0"
            >
              {/* Image */}
              <div className="relative aspect-3/4 overflow-hidden bg-sky-50 rounded-t-2xl">
                <img
                  src={product.images?.[0]?.url.replace(/\.(jpeg|jpg|png)$/i, ".webp")}
                  alt={product.images?.[0]?.altText || product.name}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {/* New ribbon badge */}
                {new Date() - new Date(product.createdAt) < 2 * 24 * 60 * 60 * 1000 && (
                  <div className="absolute top-3 left-0 z-10 drop-shadow-md">
                    <span
                      className="flex items-center gap-1 bg-sky-500 text-white text-[10px] font-bold pl-2.5 pr-4 py-1"
                      style={{ clipPath: "polygon(0 0, 100% 0, 86% 50%, 100% 100%, 0 100%)" }}
                    >
                      <HiSparkles className="text-[10px] shrink-0" />
                      New
                    </span>
                    <span className="absolute -bottom-1.25 left-0 w-0 h-0 border-t-[5px] border-t-sky-800 border-r-[5px] border-r-transparent" />
                  </div>
                )}
                {/* Discount badge */}
                {product.offerPercentage > 0 && (
                  <div className="absolute top-2 right-2 z-10 flex flex-col items-center justify-center bg-white border-2 border-emerald-500 text-emerald-600 rounded-full w-10 h-10 shadow-md">
                    <span className="text-[10px] font-extrabold leading-none">{product.offerPercentage}%</span>
                    <span className="text-[6px] font-bold leading-none">OFF</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3 flex flex-col gap-1 flex-1">
                <h4 className="text-sm font-semibold text-gray-800 group-hover:text-sky-600 transition-colors truncate leading-snug">
                  {product.name}
                </h4>
                <div className="flex items-baseline gap-2 mt-auto pt-1 flex-wrap">
                  <span className="text-sky-700 font-bold text-base">
                    ₹{Math.floor(product.discountPrice && product.discountPrice < product.price ? product.discountPrice : product.price)}
                  </span>
                  {product.discountPrice && product.discountPrice < product.price && (
                    <span className="text-gray-400 line-through text-xs">
                      ₹{Math.floor(product.price)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          )
        )}
      </div>
    </section>
  );
};

export default NewArrivals;
