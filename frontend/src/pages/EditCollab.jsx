import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";

const EditCollab = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [collab, setCollab] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const token = localStorage.getItem("userToken");

  useEffect(() => {
    const fetchCollab = async () => {
      try {
        const { data } = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/collabs/${id}`
        );
        setCollab(data);
      } catch {
        toast.error("Failed to fetch collab");
      }
    };

    const fetchProducts = async () => {
      const { data } = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/products`
      );
      setAllProducts(data);
    };

    fetchCollab();
    fetchProducts();
  }, [id]);

  const handleChange = (field, value) => {
    setCollab({ ...collab, [field]: value });
  };

  const handleCollaboratorChange = (index, field, value) => {
    const updated = [...collab.collaborators];
    updated[index][field] = value;
    setCollab({ ...collab, collaborators: updated });
  };

  const handleProductToggle = (index, productId) => {
    const updated = [...collab.collaborators];
    const exists = updated[index].products.includes(productId);
    updated[index].products = exists
      ? updated[index].products.filter((id) => id !== productId)
      : [...updated[index].products, productId];
    setCollab({ ...collab, collaborators: updated });
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("image", file);

    try {
      setUploading(true);
      const { data } = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setCollab({ ...collab, image: data.imageUrl });
      toast.success("Banner image uploaded");
    } catch {
      toast.error("Banner upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleCollaboratorImageUpload = async (e, index) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("image", file);

    try {
      setUploading(true);
      const { data } = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const updated = [...collab.collaborators];
      updated[index].image = data.imageUrl;
      setCollab({ ...collab, collaborators: updated });

      toast.success(`Image uploaded for Footballer ${index + 1}`);
    } catch {
      toast.error("Footballer image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/api/collabs/${id}`,
        collab
      );
      toast.success("Collab updated successfully");
      navigate("/admin/collabs");
    } catch {
      toast.error("Failed to update collab");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCollaborator = (index) => {
    const updated = [...collab.collaborators];
    updated.splice(index, 1);
    setCollab({ ...collab, collaborators: updated });
  };

  if (!collab) return <p className="text-center mt-10">Loading...</p>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white/80 backdrop-blur-xl shadow-2xl rounded mt-10 border border-gray-200">
      <h2 className="text-3xl font-extrabold mb-8 text-slate-800 text-center tracking-wide">
        Edit Collaboration
      </h2>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Banner Upload */}
        <div>
          <label className="font-semibold text-gray-700 block mb-2 text-sm">
            Collab Banner Image
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleBannerUpload}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-100 file:text-sky-700 hover:file:bg-sky-200"
          />
          {collab.image && (
            <img
              src={collab.image}
              alt="Banner"
              className="h-32 mt-4 rounded-lg object-cover border-2 border-sky-200 shadow"
            />
          )}
        </div>

        {/* Collab Title */}
        <input
          type="text"
          value={collab.title}
          onChange={(e) => handleChange("title", e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-400"
          placeholder="Collab Title"
        />

        {/* Collab Description */}
        <textarea
          value={collab.description || ""}
          onChange={(e) => handleChange("description", e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-400"
          placeholder="Collab Description"
        />

        {/* Publish Toggle */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Publish:</label>
          <button
            type="button"
            onClick={() => handleChange("isPublished", !collab.isPublished)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
              collab.isPublished ? "bg-green-500" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                collab.isPublished ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <span
            className={`text-xs font-semibold ${
              collab.isPublished ? "text-green-600" : "text-gray-500"
            }`}
          >
            {collab.isPublished ? "Published" : "Draft"}
          </span>
        </div>

        {/* Collaborator Tabs */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {collab.collaborators.map((person, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveTab(idx)}
                className={`px-4 py-1 rounded-full text-sm font-semibold border ${
                  activeTab === idx
                    ? "bg-sky-500 text-white border-sky-500"
                    : "text-sky-600 border-sky-300 hover:bg-sky-100"
                }`}
              >
                {person.name || `Footballer ${idx + 1}`}
              </button>
            ))}
          </div>

          {collab.collaborators.map((person, idx) =>
            activeTab === idx ? (
              <div
                key={idx}
                className="relative border border-gray-300 p-6 rounded-2xl bg-white shadow-sm space-y-4 pt-12"
              >
                <button
                  onClick={() => handleDeleteCollaborator(idx)}
                  className="absolute top-1 right-2 bg-red-500 hover:bg-red-700 text-xl font-bold text-white rounded-full w-8 h-8 flex items-center justify-center transition-all"
                  title="Remove Footballer"
                >
                  &times;
                </button>

                <input
                  type="text"
                  value={person.name}
                  onChange={(e) =>
                    handleCollaboratorChange(idx, "name", e.target.value)
                  }
                  placeholder="Footballer Name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-400 outline-0"
                />

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleCollaboratorImageUpload(e, idx)}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-pink-100 file:text-pink-700 hover:file:bg-pink-200"
                />

                {person.image && (
                  <img
                    src={person.image}
                    alt="footballer"
                    className="h-24 rounded-lg border-2 border-pink-200 object-cover mt-2"
                  />
                )}

                <p className="text-sm font-semibold text-gray-600">
                  Used Products:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-44 overflow-y-auto p-2 border border-gray-200 rounded-md bg-gray-50">
                  {allProducts.map((product) => (
                    <label
                      key={product._id}
                      className="flex items-center gap-2 text-sm text-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={person.products.some((p) =>
                          typeof p === "object"
                            ? p._id === product._id
                            : p === product._id
                        )}
                        onChange={() => handleProductToggle(idx, product._id)}
                        className="accent-sky-500"
                      />
                      <span>{product.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null
          )}
        </div>

        {/* Submit Button */}
        <div className="text-right pt-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-sky-500 text-white px-8 py-3 rounded-full font-semibold hover:opacity-90 shadow-lg transition-all"
          >
            {loading ? "Saving..." : "Update Collab"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditCollab;
