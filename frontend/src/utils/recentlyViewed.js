import axios from "axios";

export const trackView = async (product) => {
  if (!product?._id) return;

  const token = localStorage.getItem("userToken");
  if (!token) return;

  try {
    await axios.post(
      `${import.meta.env.VITE_BACKEND_URL}/api/recommendations/recently-viewed/${product._id}`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
  } catch {
    // ignore tracking failures
  }
};
