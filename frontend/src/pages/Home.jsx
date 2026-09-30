import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProductsByFilters } from "../redux/slices/productsSlice";
import axios from "axios";
import { Helmet } from "react-helmet-async";
import FitFinder from "../components/Products/FitFinder";
import LandingHero from "../components/Layout/LandingHero";
import LandingProductSection from "../components/Products/LandingProductSection";
import LandingFooter from "../components/Layout/LandingFooter";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";

const FeaturedCollection = React.lazy(() => import("../components/Products/FeaturedCollection"));
const PreviouslyViewed = React.lazy(() => import("./PreviouslyViewed"));

const Home = () => {
  const [fitOpen, setFitOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { products: mostWanted, loading: mostWantedLoading, error: mostWantedError } = useSelector(
    (state) => state.products
  );

  const [activeOffer, setActiveOffer] = useState(null);
  const [collabActive, setCollabActive] = useState(null);
  const [wishlistItems, setWishlistItems] = useState([]);

  const [categories, setCategories] = useState([]);
  const [genders, setGenders] = useState([]);
  const [secondCategory, setSecondCategory] = useState(null);
  const [secondProducts, setSecondProducts] = useState([]);
  const [secondLoading, setSecondLoading] = useState(true);
  const [secondError, setSecondError] = useState(null);

  const [mostWantedFilter, setMostWantedFilter] = useState("");

  /* ── This season's most-wanted (real products) ── */
  useEffect(() => {
    dispatch(
      fetchProductsByFilters({
        gender: mostWantedFilter || undefined,
        limit: 8,
      })
    );
  }, [dispatch, mostWantedFilter]);

  /* ── Meta options → real category/gender filter chips ── */
  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_BACKEND_URL}/api/meta-options/public`)
      .then(({ data }) => {
        const cats = Array.isArray(data)
          ? data.filter((o) => o.type === "category").map((o) => o.value)
          : [];
        const gens = Array.isArray(data)
          ? data.filter((o) => o.type === "gender").map((o) => o.value)
          : [];
        setCategories(cats);
        setGenders(gens);
        setSecondCategory(cats.find(c => /polo|shirt/i.test(c) && !/t.?shirt/i.test(c)) || cats[0] || null);
      })
      .catch(() => {});
  }, []);

  /* ── Second product section (real category-based collection) ── */
  useEffect(() => {
    if (!secondCategory) return;
    setSecondLoading(true);
    setSecondError(null);
    const controller = new AbortController();
    axios
      .get(`${import.meta.env.VITE_BACKEND_URL}/api/products`, {
        params: { category: secondCategory, limit: 8 },
        signal: controller.signal,
      })
      .then(({ data }) => setSecondProducts(Array.isArray(data) ? data : []))
      .catch((error) => { if (!controller.signal.aborted) { setSecondProducts([]); setSecondError(error.message); } })
      .finally(() => { if (!controller.signal.aborted) setSecondLoading(false); });
    return () => controller.abort();
  }, [secondCategory]);

  /* ── Active offer (real, from /api/offers/public) ── */
  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_BACKEND_URL}/api/offers/public`)
      .then(({ data }) => {
        const now = new Date();
        const visible = Array.isArray(data)
          ? data.filter(
              (offer) =>
                offer?.isActive !== false &&
                !offer.couponCode &&
                new Date(offer.startDate) <= now &&
                new Date(offer.endDate) >= now
            )
          : [];
        setActiveOffer(visible[0] || null);
      })
      .catch(() => setActiveOffer(null));
  }, []);

  /* ── Collab gate (existing site behaviour) ── */
  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_BACKEND_URL}/api/collabs/active`)
      .then((res) => setCollabActive(res.data.isActive))
      .catch(() => setCollabActive(false));
  }, []);

  /* ── Wishlist (real, for the product-card heart buttons) ── */
  useEffect(() => {
    const token = localStorage.getItem("userToken");
    if (!token) return;
    axios
      .get(`${import.meta.env.VITE_BACKEND_URL}/api/wishlist`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => setWishlistItems(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, []);

  const toggleWish = async (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    const token = localStorage.getItem("userToken");
    if (!token) {
      toast.warning("Please login");
      navigate("/login");
      return;
    }
    const inWishlist = wishlistItems.some((i) => i._id === product._id);
    try {
      if (inWishlist) {
        await axios.delete(
          `${import.meta.env.VITE_BACKEND_URL}/api/wishlist/remove/${product._id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setWishlistItems((prev) => prev.filter((x) => x._id !== product._id));
        toast.success("Removed from wishlist");
      } else {
        await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/api/wishlist/add/${product._id}`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setWishlistItems((prev) => [...prev, product]);
        toast.success("Added to wishlist");
      }
      window.dispatchEvent(new Event("wishlist-updated"));
    } catch {
      toast.error("Something went wrong");
    }
  };

  const genderFilters = useMemo(
    () => [
      { value: "", label: "All" },
      ...genders.map((g) => ({ value: g, label: g })),
    ],
    [genders]
  );

  if (collabActive) {
    return (
      <div>
        <React.Suspense fallback={null}>
          <FeaturedCollection />
        </React.Suspense>
      </div>
    );
  }

  return (
    <>

      <Helmet>
        <title>Raphaaa | Premium Streetwear & Lifestyle</title>
        <meta
          name="description"
          content="Shop premium streetwear, sneakers, and exclusive collections from Raphaaa."
        />
      </Helmet>

      {/* ── Desktop / tablet layout (≥ 1024px) ── */}
      <div className="reference-home" style={{ background: "#faf9fb" }}>
        <LandingHero
          activeOffer={activeOffer}
        />

        <LandingProductSection
          kicker=""
          heading="This season's most-wanted"
          products={mostWanted}
          loading={mostWantedLoading}
          error={mostWantedError}
          filters={genderFilters}
          activeFilter={mostWantedFilter}
          onFilterChange={setMostWantedFilter}
          wishlistItems={wishlistItems}
          onToggleWish={toggleWish}
          viewAllTo="/collections/all"
          background="linear-gradient(to bottom, #fff7ea 0px, #fdf6ef 120px, #faf9fb 320px)"
        />

        {secondCategory && (
          <LandingProductSection
            kicker={secondCategory}
            heading={/shirt|polo/i.test(secondCategory) ? "Collared, crisp and ready to go" : "Fresh styles, ready to go"}
            products={secondProducts}
            loading={secondLoading}
            error={secondError}
            filters={categories.slice(0, 6).map((c) => ({ value: c, label: c }))}
            activeFilter={secondCategory}
            onFilterChange={setSecondCategory}
            wishlistItems={wishlistItems}
            onToggleWish={toggleWish}
            viewAllTo={`/collections/all?category=${encodeURIComponent(secondCategory)}`}
            background="#ffffff"
            borderTop="1px solid #EEEEEE"
          />
        )}

        {/* CTA band — matches the reference's centered two-button band
            (height 246px, bg #ffffff, gap 12px), full page width. */}
        <div
          className="landing-cta w-full flex flex-col items-center justify-center text-center"
          style={{
            width: "100%",
            minHeight: "246px",
            background: "#ffffff",
            padding: "0 80px",
            gap: "12px",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          <div className="flex" style={{ gap: "12px", marginTop: "8px" }}>
            <Link
              to="/collections/all"
              className="inline-flex items-center font-bold"
              style={{ height: "54px", padding: "0 28px", background: "#111111", color: "#ffffff", borderRadius: "4px", fontSize: "15px", fontWeight: 700 }}
            >
              Shop all styles
            </Link>
            <button
              type="button" onClick={() => setFitOpen(true)}
              className="inline-flex items-center font-bold"
              style={{ height: "54px", padding: "0 24px", background: "#ffffff", color: "#111111", border: "1px solid #D4D5D9", borderRadius: "4px", fontSize: "15px", fontWeight: 700 }}
            >
              Launch fit finder
            </button>
          </div>
        </div>

        <React.Suspense fallback={null}>
          <PreviouslyViewed hideWhenEmpty />
        </React.Suspense>

        <LandingFooter />
        <FitFinder open={fitOpen} onClose={() => setFitOpen(false)} />
      </div>
    </>
  );
};

export default Home;
