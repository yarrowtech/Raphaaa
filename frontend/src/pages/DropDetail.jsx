import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import ProductGrid from "../components/Products/ProductGrid";
import axios from "axios";
import { toast } from "sonner";

const DropDetail = () => {
  const { slug } = useParams();
  const [footballerData, setFootballerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const collectionRef = useRef(null);

  useEffect(() => {
    const fetchDropData = async () => {
      try {
        const { data } = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/collabs/footballer/${slug}`
        );
        setFootballerData(data);
      } catch (err) {
        toast.error("Drop not found or unpublished");
        setFootballerData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDropData();
  }, [slug]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">Loading...</div>
    );
  }

  if (!footballerData) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold text-red-500">Drop not found</h1>
        <p className="text-gray-500">
          Please check the link or go back to drops.
        </p>
      </div>
    );
  }

  const { footballer, footballerImage, products, collabTitle, collabBanner } =
    footballerData;

  return (
  <>
    {/* Drop Overview */}
    <section className="py-20 px-4 lg:px-0">
      <div className="container mx-auto flex flex-col-reverse lg:flex-row items-center bg-white/70 backdrop-blur-md rounded-3xl shadow-xl hover:shadow-2xl overflow-hidden border border-gray-100 transition-all duration-500">
        
        {/* Left: Content */}
        <div className="lg:w-1/2 p-10 lg:p-14 text-center lg:text-left space-y-6">
          <h2 className="text-sm font-bold tracking-widest text-sky-600 uppercase">
            {footballer} Drop
          </h2>
          <h1 className="text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-sky-600 to-blue-600 text-transparent bg-clip-text leading-tight">
            {collabTitle}
          </h1>
          <div className="w-20 h-1 bg-gradient-to-r from-sky-400 to-blue-500 rounded-full mx-auto lg:mx-0 my-4"></div>
          <p className="text-gray-600 text-lg leading-relaxed">
            Discover the <span className="font-semibold text-gray-800">exclusive collection</span> worn by{" "}
            <span className="text-sky-600 font-bold">{footballer}</span>. Each piece combines performance and style, crafted for legends.
          </p>
          <button
            onClick={() => collectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="mt-6 inline-block px-8 py-3 rounded-full bg-gradient-to-r from-blue-600 to-sky-500 text-white font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300"
          >
            Explore Collection
          </button>
        </div>

        {/* Right: Footballer Image */}
        <div className="lg:w-1/2 relative group overflow-hidden">
          <img
            src={footballerImage}
            alt={footballer}
            className="w-full h-[700px] object-cover transform transition-transform duration-700 ease-in-out group-hover:scale-110"
          />
          {/* Dark overlay hover */}
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-all duration-500"></div>

          {/* Floating Badge */}
          <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-lg px-5 py-2 rounded-full shadow-lg flex items-center gap-3 border border-sky-100">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center text-white font-bold text-lg">
              ⚽
            </div>
            <span className="text-gray-800 font-semibold text-sm tracking-wide">
              {footballer}
            </span>
          </div>
        </div>
      </div>
    </section>

    {/* Used Drop Section */}
    <section ref={collectionRef} className="container mx-auto px-4 py-14">
      <h2 className="text-3xl font-extrabold mb-8 text-center lg:text-left bg-gradient-to-r from-blue-600 to-sky-500 text-transparent bg-clip-text relative inline-block">
        Used Drop Collection
        <span className="absolute -bottom-2 left-1/2 lg:left-0 w-16 h-1 bg-gradient-to-r from-sky-400 to-blue-600 rounded-full transform -translate-x-1/2 lg:translate-x-0"></span>
      </h2>
      <ProductGrid products={products} />
    </section>
  </>
);

};

export default DropDetail;
