import React, { useEffect, useState } from "react";
import axios from "axios";
import ProductCard from "../components/Products/ProductCard";

const PreviouslyViewed = () => {
  const [viewedProducts, setViewedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("userToken");
        if (!token) {
          setViewedProducts([]);
          return;
        }

        const { data } = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/recommendations/recently-viewed?limit=12`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setViewedProducts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load recently viewed:", err);
        setViewedProducts([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="container mx-auto px-4 sm:px-6 py-10 md:py-12 pb-24 md:pb-12">
      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-5 md:mb-6 text-sky-700">
        Previously Viewed
      </h2>
      {loading && (
        <p className="text-center text-sm text-gray-500">Loading…</p>
      )}
      {!loading && viewedProducts.length === 0 && (
        <p className="text-center text-sm text-gray-500">
          No recently viewed products yet.
        </p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {viewedProducts.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </div>
  );
};

export default PreviouslyViewed;
