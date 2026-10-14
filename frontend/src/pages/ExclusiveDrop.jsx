import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { FaArrowRight } from "react-icons/fa";
import { motion } from "framer-motion";
// import ProductGrid from "../components/Products/ProductGrid";
import { useNavigate } from "react-router-dom";

const ExclusiveDrop = () => {
  const navigate = useNavigate();
  const [exclusiveDrops, setExclusiveDrops] = useState([]);
  const [flippedCard, setFlippedCard] = useState(null);
  const [dropDetails, setDropDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [featuredCollab, setFeaturedCollab] = useState(null);


  useEffect(() => {
    const fetchCollab = async () => {
      try {
        const { data } = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/collabs`);
        if(data && data.length > 0) {
          setFeaturedCollab(data[0]);
        }
      } catch (err) {
        console.error("Failed to load featured collab", err);
      }
    };
    fetchCollab();
  }, []);

  // Fetch all drops
  useEffect(() => {
    const fetchDrops = async () => {
      try {
        const { data } = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/collabs`
        );
        setExclusiveDrops(data);
      } catch (err) {
        toast.error("Failed to load exclusive drops");
      }
    };
    fetchDrops();
  }, []);

  // Fetch drop detail when footballer selected
  useEffect(() => {
    if (!flippedCard) return;
    const fetchDropData = async () => {
      setLoading(true);
      try {
        const slug = flippedCard.toLowerCase().replace(/\s+/g, "-");
        const { data } = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/collabs/footballer/${slug}`
        );
        setDropDetails(data);
      } catch (err) {
        toast.error("Drop not found or unpublished");
        setDropDetails(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDropData();
  }, [flippedCard]);

  return (
    // <section className="container mx-auto px-4 py-14">
    <motion.section
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "tween", duration: 0.45, ease: "easeOut" }}
      className="container mx-auto px-4 py-14"
    >
      {/* Header */}
      <div className="text-center mb-12">
        <span className="inline-block text-xs font-semibold bg-gradient-to-r from-sky-600 to-blue-600 text-white px-4 py-1 rounded-full uppercase tracking-widest mb-3">
          Limited Edition
        </span>
        <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-sky-400">
          Exclusive Drops
        </h2>
        <p className="text-gray-600 mt-2 text-sm font-medium">
          {featuredCollab?.title || "Featured Collab"} x Raphaa Limited Edition
        </p>
      </div>

      {/* Grid of flip cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-10 perspective">
        {exclusiveDrops.flatMap((collab) =>
          collab.collaborators.map((person, i) => {
            const isFlipped = flippedCard === person.name;
            return (
              <motion.div
                key={`${collab._id}-${i}`}
                className={`relative w-full h-[450px] cursor-pointer`}
                onClick={() =>
                  setFlippedCard(isFlipped ? null : person.name)
                }
              >
                <motion.div
                  className={`absolute inset-0 transition-transform duration-700 preserve-3d ${isFlipped ? "rotate-y-180" : ""
                    }`}
                >
                  {/* Front Side */}
                  <div className="absolute inset-0 backface-hidden rounded-3xl overflow-hidden shadow-lg">
                    <img
                      src={person.image}
                      alt={person.name}
                      className="h-full w-full object-cover hover:scale-105 transition-all"
                      loading="lazy"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-4 text-white flex flex-wrap justify-between items-center">
                      <div>
                        <h3 className="text-xl font-bold">{person.name}</h3>
                        <p className="text-sm">
                          {person.products?.[0]?.name || "Exclusive Drop"}
                        </p>
                      </div>
                      <p className="relative text-white px-4 py-1 rounded-full overflow-hidden">
                        <span className="absolute inset-0 animate-gradient bg-[length:200%_200%] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></span>
                        <span className="relative z-10">Click here to view drops</span>
                      </p>
                    </div>
                  </div>

                  {/* Back Side */}
                  <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-3xl bg-white shadow-xl p-6 overflow-y-auto custom-scrollbar">
                    {loading && <p>Loading...</p>}
                    {/* Suggested Products Section */}
                    {dropDetails?.products?.length > 0 && (
                      <div className="">
                        <h3 className="text-2xl font-bold mb-4">
                          Special drop: <span className="text-blue-500">{dropDetails.footballer}</span>
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-1">
                          {dropDetails.products.slice(0, 4).map((product) => (
                            <div
                              key={product._id}
                              onClick={() =>
                                navigate(
                                  `/product/${product.name.toLowerCase().replace(/\s+/g, "-")}`
                                )
                              }
                              className="cursor-pointer rounded-lg border border-gray-200 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-100 via-sky-200 to-sky-100"
                            >
                              <img
                                src={product.images?.[0]?.url || "/no-image.png"}
                                alt={product.name}
                                className="w-full h-40 object-cover rounded-t-lg hover:scale-95 transition-transform duration-300"
                              />
                              <div className="px-3 py-2">
                                <h4 className="text-sm font-medium text-gray-800 truncate">
                                  {product.name}
                                </h4>
                                <div className="inline-flex items-center gap-2 bg-green-600 text-white text-xs mt-1 px-2 py-0.5 rounded">
                                  ★ {product.rating?.toFixed(1) || "0.0"}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  {product.numReviews || 0} Reviews
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-sm font-bold text-blue-600">
                                    ₹{Math.floor(product.discountPrice || product.price)}
                                  </p>
                                  {product.discountPrice && (
                                    <p className="text-xs line-through text-gray-500">
                                      ₹{product.price}
                                    </p>
                                  )}
                                  <p className="text-sm text-green-600">
                                    {product.offerPercentage ? `${product.offerPercentage}%` : ""}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setFlippedCard(null); setDropDetails(null); }} className="mt-4 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full text-sm font-semibold shadow hover:scale-105 transition" > ← Back </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            );
          })
        )}
      </div>
    {/* </section> */}
    </motion.section>
  );
};

export default ExclusiveDrop;


// Drop 2 design