import React, { useEffect, useState } from "react";
import {  useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import axios from "axios";

const SubmitReviewFromOrder = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [order, setOrder] = useState(null);
  const [selectedProduct] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [image, setImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const CLOUDINARY_CLOUD_NAME = "dqj64anbj";
  const CLOUDINARY_UPLOAD_PRESET = "review_uploads";

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const response = await axios.get(`/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setOrder(response.data);
      // Auto-select first product if only one item
    //   if (response.data.orderItems.length === 1) {
    //     setSelectedProduct(response.data.orderItems[0]);
    //   }
    } catch (error) {
      console.error("Error fetching order:", error);
      toast.error("Failed to fetch order details");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

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
        formData
      );
      
      if (res.data && res.data.secure_url) {
        setImage(res.data.secure_url);
        toast.success("Image uploaded successfully");
      }
    } catch (err) {
      console.error("Image upload error:", err);
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedProduct) {
      toast.error("Please select a product to review");
      return;
    }

    if (!rating || !comment.trim()) {
      toast.error("Please provide both rating and comment");
      return;
    }

    try {
      setSubmitting(true);
      
      await axios.post(
        `/api/products/${selectedProduct.product}/reviews`,
        { 
          rating: Number(rating), 
          comment: comment.trim(), 
          image: image || undefined 
        },
        { 
          headers: { 
            Authorization: `Bearer ${user.token}`,
            'Content-Type': 'application/json',
          }
        }
      );

      toast.success("Review submitted successfully");
      navigate("/my-orders");
    } catch (err) {
      console.error("Review submission error:", err);
      const errorMessage = err.response?.data?.message || "Failed to submit review";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading order details...</div>;
  }

  if (!order) {
    return <div className="text-center py-8">Order not found</div>;
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 bg-white p-8 rounded-xl shadow-xl border border-sky-100">
      <h2 className="text-2xl font-bold mb-6 text-sky-700">Write a Review</h2>
      
      {/* Product Selection */}
      {/* {order.orderItems.length > 1 && (
        <div className="mb-6">
          <label className="block mb-2 font-medium text-gray-700">
            Select Product to Review:
          </label>
          <div className="space-y-2">
            {order.orderItems.map((item, index) => (
              <div 
                key={index}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedProduct === item 
                    ? 'border-sky-500 bg-sky-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedProduct(item)}
              >
                <div className="flex items-center gap-3">
                  <img 
                    src={item.image} 
                    alt={item.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                  <div>
                    <h4 className="font-medium">{item.name}</h4>
                    <p className="text-sm text-gray-600">₹{item.price}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )} */}

      {/* Selected Product Display */}
      {selectedProduct && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-700 mb-2">Reviewing:</h3>
          <div className="flex items-center gap-3">
            <img 
              src={selectedProduct.image} 
              alt={selectedProduct.name}
              className="w-16 h-16 object-cover rounded"
            />
            <div>
              <h4 className="font-medium">{selectedProduct.name}</h4>
              <p className="text-sm text-gray-600">₹{selectedProduct.price}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block mb-1 font-medium text-gray-700">Rating *</label>
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="w-full border rounded-md px-4 py-2 bg-white outline-sky-300"
            required
          >
            <option value="">Select rating</option>
            {[1, 2, 3, 4, 5].map((star) => (
              <option key={star} value={star}>
                {star} Star{star > 1 && "s"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1 font-medium text-gray-700">Comment *</label>
          <textarea
            rows="4"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full border rounded-md px-4 py-2 bg-white outline-sky-300"
            placeholder="Share your experience with this product..."
            required
            maxLength={500}
          />
          <div className="text-xs text-gray-500 mt-1">
            {comment.length}/500 characters
          </div>
        </div>

        <div>
          <label className="block mb-1 font-medium text-gray-700">
            Upload Image (optional)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="w-full text-sm border rounded-md px-3 py-2"
            disabled={uploading}
          />
          {uploading && (
            <p className="text-xs text-blue-600 mt-1">Uploading image...</p>
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
                className="text-xs text-red-600 hover:underline mt-1"
              >
                Remove image
              </button>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={uploading || submitting || !rating || !comment.trim() || !selectedProduct}
          className="w-full py-3 px-4 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Submitting..." : "Submit Review"}
        </button>
      </form>
    </div>
  );
};

export default SubmitReviewFromOrder;