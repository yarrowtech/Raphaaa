import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import axios from "axios";
import { updateProfile } from "../redux/slices/authSlice";

const UpdateProfile = () => {
  const dispatch = useDispatch();
  const { user, loading, error } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    photo: "",
  });
  const [uploading, setUploading] = useState(false);
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) setGreeting("Good Morning");
      else if (hour < 17) setGreeting("Good Afternoon");
      else if (hour < 21) setGreeting("Good Evening");
      else setGreeting("Good Night");
    };
    updateGreeting();
    const interval = setInterval(updateGreeting, 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  const [profile, setProfile] = useState(null);

  const fetchUserProfile = async () => {
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/users/profile`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("userToken")}`,
          },
        }
      );
      setProfile(data); // Save full user object from DB
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      toast.error("Could not fetch profile");
    }
  };
  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        password: "",
        photo: user.photo || "",
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formDataCloud = new FormData();
    formDataCloud.append("image", file);
    try {
      setUploading(true);
      const { data } = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/upload`,
        formDataCloud,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${localStorage.getItem("userToken")}`,
          },
        }
      );
      setFormData((prev) => ({ ...prev, photo: data.imageUrl }));
      setUploading(false);
    } catch (error) {
      setUploading(false);
      toast.error("Image upload failed");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast.error("Name and email are required");
      return;
    }
    const result = await dispatch(updateProfile(formData));
    if (result?.meta?.requestStatus === "fulfilled") {
      // toast.success("Profile updated successfully");
      fetchUserProfile(); // 🔄 refresh from DB
    } else {
      toast.error("Failed to update profile");
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Update Profile</h2>
      {loading && <p className="text-blue-600 font-medium">Loading...</p>}
      {error && <p className="text-red-500 font-medium">Error: {error}</p>}

      {user && (
        <div className="relative bg-gradient-to-r from-blue-50 via-white to-blue-50 border border-blue-100 shadow-xl rounded-xl mb-8 p-6 sm:flex sm:items-center sm:justify-between transition-all duration-300">
          <div className="flex items-center gap-4">
            {profile?.photo ? (
              <img
                src={profile.photo}
                alt="Profile"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "/default-avatar.png";
                }}
                className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-md"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-sky-500 text-white flex items-center justify-center text-2xl font-bold shadow-md ring-4 ring-white">
                {profile?.name?.charAt(0).toUpperCase() || "?"}
              </div>
            )}

            <div>
              <h3 className="text-2xl font-bold text-blue-800 mb-1">
                {greeting}, {user.name}
              </h3>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Role:</span>{" "}
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                    user.role === "admin"
                      ? "bg-red-100 text-red-700"
                      : user.role === "merchantise"
                      ? "bg-purple-100 text-purple-700"
                      : user.role === "delivery_boy"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {user.role
                    .replace("_", " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Email:</span> {user.email}
              </p>
              {/* <p className="text-xs text-gray-400 mt-1">
                <span className="font-medium">User ID:</span> {user._id}
              </p> */}
            </div>
          </div>
        </div>
      )}

      <div className="p-6 bg-white shadow-md rounded-lg mb-6">
        <h3 className="text-lg font-bold mb-6">Edit Your Details</h3>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="name"
                className="block text-gray-700 mb-1 font-medium"
              >
                Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="block text-gray-700 mb-1 font-medium"
              >
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-gray-700 mb-1 font-medium"
              >
                New Password <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label
                htmlFor="photo"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Profile Picture
              </label>

              <div className="flex items-center gap-4">
                {/* Preview if available */}
                {formData.photo ? (
                  <img
                    src={formData.photo}
                    alt="Preview"
                    className="w-14 h-14 rounded-full object-cover border-2 border-blue-500 shadow-sm"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-blue-600 font-bold text-lg border-2 border-gray-300 shadow-sm">
                    {formData.name?.charAt(0).toUpperCase() || "?"}
                  </div>
                )}

                <div className="flex-1">
                  <input
                    type="file"
                    id="photo"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="block w-full text-sm text-gray-600 bg-white border border-gray-300 rounded-md shadow-sm cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition"
                  />
                  {uploading && (
                    <p className="text-blue-500 text-xs mt-1">Uploading...</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded shadow"
              disabled={loading || uploading}
            >
              {loading || uploading ? "Updating..." : "Update Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateProfile;
