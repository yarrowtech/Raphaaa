import React, { useEffect, useState } from "react";
import {  useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import axios from "axios";

const SubmitReview = () => {
  const { productId } = useParams(); // Now correctly getting productId
  
  const navigate = useNavigate();

  const { user } = useSelector((state) => state.auth);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [image, setImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cloudinary configuration
  const CLOUDINARY_CLOUD_NAME = "dqj64anbj"; // Replace with your actual cloud name
  const CLOUDINARY_UPLOAD_PRESET = "review_uploads"; // Replace with your actual preset

  // Fetch product details
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await axios.get(`/api/products/${productId}`);
        setProduct(response.data);
      } catch (error) {
        console.error("Error fetching product:", error);
        toast.error("Failed to load product details");
        navigate("/my-orders");
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId, navigate]);

  // Check if user is logged in
  // useEffect(() => {
  //   if (!user || !user.token) {
  //     toast.error("Please login to submit a review");
  //     navigate("/login");
  //   }
  // }, [user, navigate]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    try {
      setUploading(true);
      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      if (res.data && res.data.secure_url) {
        setImage(res.data.secure_url);
        toast.success("Image uploaded successfully");
      } else {
        throw new Error("Invalid response from Cloudinary");
      }
    } catch (err) {
      console.error("Image upload error:", err);
      toast.error(err.response?.data?.error?.message || "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!rating || !comment.trim()) {
      toast.error("Please provide both rating and comment");
      return;
    }

    if (!user || !user.token) {
      toast.error("Please login to submit review");
      return;
    }

    try {
      setSubmitting(true);
      
      

      toast.success("Review submitted successfully!");
      navigate("/my-orders");
    } catch (err) {
      console.error("Review submission error:", err);
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          "Failed to submit review";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <span
        key={index}
        className={`text-lg ${
          index < rating ? "text-yellow-400" : "text-gray-300"
        }`}
      >
        ★
      </span>
    ));
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-8 text-center">
        <p className="text-red-600">Product not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 bg-white p-8 rounded-xl shadow-xl border border-sky-100">
      {/* Product Info */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <img
            src={product.images?.[0]?.url || "/placeholder-image.jpg"}
            alt={product.name}
            className="w-16 h-16 object-cover rounded-lg border"
          />
          <div>
            <h3 className="font-semibold text-gray-800">{product.name}</h3>
            <p className="text-sm text-gray-600">
              Current Rating: {renderStars(Math.floor(product.rating))} 
              <span className="ml-2">({product.numReviews} reviews)</span>
            </p>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-6 text-sky-700">Write a Review</h2>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block mb-2 font-medium text-gray-700">Rating *</label>
          <div className="flex items-center gap-4">
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="border rounded-md px-4 py-2 bg-white outline-sky-300"
              required
            >
              <option value="">Select rating</option>
              {[1, 2, 3, 4, 5].map((star) => (
                <option key={star} value={star}>
                  {star} Star{star > 1 && "s"}
                </option>
              ))}
            </select>
            {rating > 0 && (
              <div className="flex items-center">
                {renderStars(rating)}
                <span className="ml-2 text-sm text-gray-600">({rating}/5)</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block mb-2 font-medium text-gray-700">Comment *</label>
          <textarea
            rows="4"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full border rounded-md px-4 py-2 bg-white outline-sky-300 resize-none"
            placeholder="Share your experience with this product..."
            required
            maxLength={500}
          />
          <div className="text-xs text-gray-500 mt-1">
            {comment.length}/500 characters
          </div>
        </div>

        <div>
          <label className="block mb-2 font-medium text-gray-700">
            Upload Image (optional)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="w-full text-sm border rounded-md px-3 py-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
            disabled={uploading}
          />
          {uploading && (
            <div className="mt-2 flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-sky-600"></div>
              <p className="text-xs text-blue-600">Uploading image...</p>
            </div>
          )}
          {image && (
            <div className="mt-3">
              <img 
                src={image} 
                alt="Review preview" 
                className="w-32 h-32 object-cover rounded-md border"
              />
              <button
                type="button"
                onClick={() => setImage("")}
                className="text-xs text-red-600 hover:underline mt-1 block"
              >
                Remove image
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate("/my-orders")}
            className="flex-1 py-3 px-4 bg-gray-200 text-gray-800 font-semibold rounded-md hover:bg-gray-300 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={uploading || submitting || !rating || !comment.trim()}
            className="flex-1 py-3 px-4 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting...
              </>
            ) : (
              "Submit Review"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SubmitReview;