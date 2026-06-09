import React, { useState, useEffect, useRef } from "react";
import { HiMiniMagnifyingGlass, HiMiniXMark } from "react-icons/hi2";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { MdHistory } from "react-icons/md";
import {
  fetchProductsByFilters,
  setFilters,
} from "../../redux/slices/productsSlice";
import axios from "axios";
import { GoArrowUpRight } from "react-icons/go";

const MAX_HISTORY = 6;
const STORAGE_KEY = "searchHistory";

const SearchBar = ({ inline = false, className = "", inputClassName = "", placeholder = "Search for products..." }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [facets, setFacets] = useState({ brands: [], categories: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [history, setHistory] = useState([]);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);


  useEffect(() => {
  if (isOpen && searchInputRef.current) {
    searchInputRef.current.focus();
  }
}, [isOpen]);


  // Toggle search bar
  const handleSearchToggle = () => setIsOpen(!isOpen);
  const shouldRenderInline = inline || isOpen;

  // Search logic
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim() === "") return;

    updateHistory(searchTerm);
    dispatch(setFilters({ search: searchTerm }));
    dispatch(fetchProductsByFilters({ search: searchTerm }));
    navigate(`/collections/all?search=${encodeURIComponent(searchTerm.trim())}`);
    setSearchTerm("");
    setIsOpen(false);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Click on product suggestion
  const handleSuggestionClick = (product) => {
    const slug = product.name.toLowerCase().replace(/\s+/g, "-");
    const productId = product._id || product.productId || product.id;
    navigate(
      productId
        ? `/product/${slug}/p/${encodeURIComponent(productId)}`
        : `/product/${slug}`
    );
    setSearchTerm("");
    setIsOpen(false);
    setSuggestions([]);
  };

  // Update localStorage history
  const updateHistory = (term) => {
    let newHistory = [term, ...history.filter((item) => item !== term)];
    if (newHistory.length > MAX_HISTORY)
      newHistory = newHistory.slice(0, MAX_HISTORY);
    setHistory(newHistory);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
  };

  const handleHistoryClick = (term) => {
    setSearchTerm(""); // prevent suggestion trigger
    setSuggestions([]);
    setShowSuggestions(false);
    setIsOpen(false);
    dispatch(setFilters({ search: term }));
    dispatch(fetchProductsByFilters({ search: term }));
    navigate(`/collections/all?search=${encodeURIComponent(term)}`);
  };

  const handleDeleteHistoryItem = (termToDelete) => {
    const updated = history.filter((term) => term !== termToDelete);
    setHistory(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const clearHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  };

  // Close search on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load history
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setHistory(JSON.parse(stored));
  }, []);

  // Fetch suggestions when user types
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchTerm.trim().length === 0) {
        setSuggestions([]);
        setFacets({ brands: [], categories: [] });
        return;
      }
      try {
        const term = searchTerm.trim();
        const [sugRes, facetRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/suggestions?search=${term}`),
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/products/facets?search=${term}`),
        ]);

        setSuggestions(sugRes.data || []);
        const f = facetRes.data || {};
        setFacets({
          brands: Array.isArray(f.brands) ? f.brands.slice(0, 6) : [],
          categories: Array.isArray(f.categories) ? f.categories.slice(0, 6) : [],
        });
        setShowSuggestions(true);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      }
    };
    const delay = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(delay);
  }, [searchTerm]);

  const handleFacetClick = (type, value) => {
    const term = searchTerm.trim();
    setIsOpen(false);
    setSuggestions([]);
    setShowSuggestions(false);

    const next = { search: term };
    if (type === "brand") next.brand = value;
    if (type === "category") next.category = value;

    dispatch(setFilters(next));
    dispatch(fetchProductsByFilters(next));

    const qp = new URLSearchParams();
    if (term) qp.set("search", term);
    if (type === "brand") qp.set("brand", value);
    if (type === "category") qp.set("category", value);
    navigate(`/collections/all?${qp.toString()}`);
  };

  return (
    <div
      ref={searchRef}
      className={`relative flex items-center justify-center w-full transition-all duration-300 ease-in-out ${className} ${
        inline ? "min-w-0" : shouldRenderInline ? "absolute top-0 left-0 w-full bg-white h-28 z-50" : "w-auto"
      }`}
    >
      {shouldRenderInline ? (
        <form
          onSubmit={handleSearch}
          className="relative flex items-center justify-center gap-3 md:gap-0 md:justify-center w-full"
        >
          <div className={`relative w-full ${inline ? "min-w-0" : "w-4/5 md:w-1/2 lg:w-1/2"}`}>
            <input
              ref={searchInputRef}
              type="text"
              className={`bg-gray-100 py-3 px-4 pr-12 rounded-full md:rounded-lg focus:outline-none w-full placeholder:text-gray-700 ${inputClassName}`}
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-700 px-3 py-1 rounded-full md:rounded-lg hover:bg-gray-600 hover:text-white transition-colors duration-300"
            >
              <HiMiniMagnifyingGlass className="h-6 w-6" />
            </button>

            {/* 🔻 Suggestions */}
            {showSuggestions && (
              <ul className="absolute left-0 right-0 bg-white shadow-md max-h-64 overflow-y-auto z-50 mt-1 rounded-md">
                {searchTerm.trim() ? (
                  suggestions.length > 0 ? (
                    suggestions.map((product) => (
                      <li
                        key={product._id}
                        className="px-4 py-2 flex items-center justify-between cursor-pointer border-b border-gray-300 hover:bg-gray-100"
                        onClick={() => handleSuggestionClick(product)}
                      >
                        <div className="flex flex-wrap justify-center items-center gap-3">
                          <img
                            src={product.images[0]?.url || "/no-image.png"}
                            alt={product.name}
                            className="w-10 h-10 object-cover rounded-md"
                          />
                          <span className="text-sm text-gray-800">
                            {product.name}
                          </span>
                        </div>
                        <GoArrowUpRight />
                      </li>
                    ))
                  ) : (
                    <li className="px-4 py-6 text-sm text-gray-500 text-center">
                      No products found
                    </li>
                  )
                ) : (
                  history.map((item, index) => (
                    <li
                      key={index}
                      className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex justify-between items-center"
                    >
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleHistoryClick(item);
                        }}
                        className="flex-1 text-left flex items-center gap-2"
                      >
                        <MdHistory className="inline" /> {item}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteHistoryItem(item);
                        }}
                        className="text-gray-400 text-lg hover:text-gray-600"
                        title="Remove"
                      >
                        &times;
                      </button>
                    </li>
                  ))
                )}

                {searchTerm.trim() && (facets.brands.length > 0 || facets.categories.length > 0) && (
                  <li className="px-4 py-3 border-t border-gray-200">
                    <div className="text-xs text-gray-500 mb-2">Top matches</div>
                    <div className="flex flex-wrap gap-2">
                      {facets.categories.map((c) => (
                        <button
                          key={`cat-${c._id}`}
                          type="button"
                          onClick={() => handleFacetClick("category", c._id)}
                          className="text-xs px-2 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
                          title={`Category (${c.count})`}
                        >
                          {c._id} ({c.count})
                        </button>
                      ))}
                      {facets.brands.map((b) => (
                        <button
                          key={`brand-${b._id}`}
                          type="button"
                          onClick={() => handleFacetClick("brand", b._id)}
                          className="text-xs px-2 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
                          title={`Brand (${b.count})`}
                        >
                          {b._id} ({b.count})
                        </button>
                      ))}
                    </div>
                  </li>
                )}

                {searchTerm.trim() === "" && history.length > 0 && (
                  <li className="px-4 py-2 text-right">
                    <button
                      onClick={clearHistory}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Clear all history
                    </button>
                  </li>
                )}
              </ul>
            )}
          </div>

          {/* close icon */}
          {!inline && (
            <button
              type="button"
              onClick={handleSearchToggle}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-800"
            >
              <HiMiniXMark className="h-6 w-6 absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-700 cursor-pointer" />
            </button>
          )}
        </form>
      ) : (
        <button onClick={handleSearchToggle}>
          <HiMiniMagnifyingGlass className="h-6 w-6" />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
