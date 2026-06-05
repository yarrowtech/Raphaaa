// BestSeller.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import ProductCard from "./ProductCard";
import "./BestSellersSection.css";

const BestSellersSection = () => {
  const [collabActive, setCollabActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bestSellers, setBestSellers] = useState([]);

  // Check collab status
  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_BACKEND_URL}/api/collabs/active`)
      .then((res) => setCollabActive(res.data.isActive))
      .catch(() => setCollabActive(false));
  }, []);

  // Fetch best sellers when collab is NOT active
  useEffect(() => {
    if (collabActive === false) {
      const fetchBestSellers = async () => {
        try {
          const { data } = await axios.get(
            `${import.meta.env.VITE_BACKEND_URL}/api/products/best-seller`
          );
          // API may return a single product object or an array
          setBestSellers(Array.isArray(data) ? data : data?._id ? [data] : []);
        } catch (err) {
          setError("Failed to load best sellers");
        } finally {
          setLoading(false);
        }
      };
      fetchBestSellers();
    }
  }, [collabActive]);

  if (collabActive === null) return null; // waiting
  if (collabActive === true) return null; // hide during collab

  if (loading)
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-12 py-10 md:py-12">
        <div className="bs-skeleton">
          <div className="bs-skel-title" />
          <div className="bs-skel-row">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bs-skel-card" />
            ))}
          </div>
        </div>
      </div>
    );

  if (error)
    return (
      <p className="text-center text-blue-700 bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 mx-4">
        {error}
      </p>
    );

  if (bestSellers.length === 0)
    return (
      <p className="text-center text-slate-600 bg-white rounded-xl px-4 py-3 mx-4">
        No best sellers found.
      </p>
    );

  // Duplicate for seamless loop
  const looped = [...bestSellers, ...bestSellers];

  return (
    <section className="py-10 md:py-12">
      <div className="text-center mb-6 md:mb-8 px-4">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 inline-block relative">
          <span className="">
            Best Seller
          </span>
          <span className="block h-1 w-24 mx-auto mt-3 rounded-full bg-gradient-to-r from-blue-600 to-sky-300" />
        </h2>
        <p className="mt-3 text-slate-600">
          Most-loved picks—hover to pause and explore.
        </p>
      </div>

      <div className="px-2 sm:px-4">
        <div className="best-seller-wrapper">
          <div className="best-seller-marquee" aria-label="Best seller carousel">
            {looped.map((item, idx) => (
              <div key={idx} className="product-card-wrapper bs-card-fx">
                <ProductCard
                  product={item}
                  badge={`Total ${item.totalSold} users buy this product. Now your turn!!`}
                />
              </div>
            ))}
          </div>
          {/* gradient edge fades */}
          <div className="bs-fade bs-fade-left" aria-hidden="true" />
          <div className="bs-fade bs-fade-right" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
};

export default BestSellersSection;
