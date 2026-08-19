import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../redux/slices/authSlice";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";

const AutoLogout = () => {
  const dispatch = useDispatch();
  const { user, token } = useSelector((state) => state.auth);
  const [showDialog, setShowDialog] = useState(false);
  const navigate = useNavigate();

  const forceLogout = (showToast = false) => {
    localStorage.removeItem("userInfo");
    localStorage.removeItem("userToken");
    dispatch(logout());
    setShowDialog(true);
    if (showToast) toast.error("Session expired. Please login again.");
  };

  const getTokenExpiryMs = (jwtToken) => {
    try {
      if (!jwtToken) return null;
      const payload = JSON.parse(atob(jwtToken.split(".")[1]));
      if (!payload?.exp) return null;
      return payload.exp * 1000;
    } catch (error) {
      return null;
    }
  };

  useEffect(() => {
    if (!user || !token) return;
    const expiryMs = getTokenExpiryMs(token);
    if (!expiryMs) return;
    const remaining = expiryMs - Date.now();
    if (remaining <= 0) {
      forceLogout(true);
      return;
    }
    const timer = setTimeout(() => forceLogout(true), remaining);
    return () => clearTimeout(timer);
  }, [user, token]);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error?.response?.status === 401) {
          const storedToken = localStorage.getItem("userToken");
          // Only force a global logout if the stored token is actually expired/missing.
          // A 401 from a single request (e.g. a background wishlist check) doesn't mean
          // the whole session is invalid — don't punish the user for an unrelated failure.
          const expiryMs = getTokenExpiryMs(storedToken);
          if (!storedToken || (expiryMs && expiryMs <= Date.now())) {
            forceLogout(true);
          }
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  const handleLoginAgain = () => {
    setShowDialog(false);
    navigate("/login");
  };

  const handleCancel = () => {
    setShowDialog(false);
  };

  return (
    <>
      {showDialog && (
        <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-gradient-to-br bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full">
            <h2 className="text-xl font-bold mb-3">
              Session Expired
            </h2>
            <p className="text-sm text-gray-800 mb-6">
              Your session has expired. Please login again to continue.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleLoginAgain}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-sky-500 text-white font-semibold hover:from-blue-600 hover:to-sky-600 transition duration-200"
              >
                Login Again
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AutoLogout;
