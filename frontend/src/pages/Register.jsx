import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { registerUser, googleLoginSuccess } from "../redux/slices/authSlice";
import { useDispatch, useSelector } from "react-redux";
import { mergecart } from "../redux/slices/cartSlice";
import { toast } from "sonner";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { FaEye, FaEyeSlash } from "react-icons/fa"; // 👁️ icons added

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [strengthLabel, setStrengthLabel] = useState("Weak");

  // OTP state
  const [otpMode, setOtpMode] = useState(false);
  const [otp, setOtp] = useState("");
  const [resendIn, setResendIn] = useState(0); // seconds cooldown
  const [otpSent, setOtpSent] = useState(false); // track if clicked once
  const [sendingOtp, setSendingOtp] = useState(false); // processing state while OTP request is in flight


  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, guestId, loading } = useSelector((state) => state.auth);
  const { cart } = useSelector((state) => state.cart);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);   // 👁️

  const redirectParam = new URLSearchParams(location.search).get("redirect");
  const redirect =
    redirectParam && redirectParam.startsWith("/") ? redirectParam : "/";

  useEffect(() => {
    if (user) {
      if (cart?.products.length > 0 && guestId) {
        dispatch(mergecart({ guestId, user })).then(() => {
          navigate(redirect);
        });
      } else {
        navigate(redirect);
      }
    }
  }, [user, guestId, cart, navigate, redirect, dispatch]);

  // Password strength calculator
  useEffect(() => {
    let strength = 0;
    if (password.length >= 6) strength += 20;
    if (/[A-Z]/.test(password)) strength += 20;
    if (/[a-z]/.test(password)) strength += 20;
    if (/\d/.test(password)) strength += 20;
    if (/[@$!%*?&]/.test(password)) strength += 20;

    setPasswordStrength(strength);
    setStrengthLabel(strength < 40 ? "Weak" : strength < 80 ? "Medium" : "Strong");
  }, [password]);

  // resend cooldown ticker
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const validateBase = () => {
    if (!name.trim()) return toast.error("Name is required"), false;
    if (!email.trim()) return toast.error("Email is required"), false;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) return toast.error("Enter a valid email"), false;
    if (!password.trim()) return toast.error("Password is required"), false;
    if (password.length < 6) return toast.error("Password must be at least 6 characters"), false;
    if (password !== confirmPassword) return toast.error("Passwords do not match"), false;
    return true;
  };

  // Step 1: send OTP and switch to OTP page
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateBase()) return;

    setSendingOtp(true);
    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/users/send-email-otp`, { email });
      toast.success("OTP sent to your email");
      setOtpSent(true); // disable button after first click
      setOtpMode(true);
      setResendIn(30); // 30s cooldown for resend
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to send OTP";
      toast.error(msg);
    } finally {
      setSendingOtp(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    if (resendIn > 0) return;
    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/users/send-email-otp`, { email });
      toast.success("OTP resent");
      setResendIn(30);
      setOtpSent(true); // disable button after first click
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to resend OTP");
    }
  };

  // Step 2: verify OTP, then call existing registerUser
  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    if (!otp.trim() || otp.length !== 6) return toast.error("Enter the 6-digit code");

    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/users/verify-email-otp`, { email, otp });

      // OTP verified -> proceed with your existing registration flow
      await dispatch(registerUser({ name, email, password })).unwrap();
      toast.success("Registration successful!");
      // navigate happens from your existing effect when user is set
    } catch (err) {
      const msg = err.response?.data?.message || "Invalid or expired OTP";
      toast.error(msg);
    }
  };

  // Render
  return (
    <div className="flex h-[80vh]">
      <div className="w-full md:w-full flex flex-col justify-center items-center p-6 sm:p-12">
        {!otpMode ? (
          // --- Register form (Step 1) ---
          <form onSubmit={handleSubmit} className="w-full max-w-md p-8">
            <div className="flex items-center justify-center mb-8">
              <div className="flex items-center w-fit">
                <h2 className="text-3xl font-bold text-gray-800">Register</h2>
                <span className="h-1 w-16 ml-3 bg-gradient-to-r from-blue-600 to-sky-400 rounded-full"></span>
              </div>
            </div>

            <div className="mb-5">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-400"
                placeholder="Enter your name"
              />
            </div>

            <div className="mb-5">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-400"
                placeholder="Enter your email address"
              />
            </div>

            <div className="mb-5 relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-400"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            {password.length > 0 && (
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-gray-600">Strength: {strengthLabel}</span>
                <div className="w-2/3 h-2 rounded-full bg-gray-200 overflow-hidden ml-3">
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${passwordStrength}%`,
                      background:
                        passwordStrength < 40
                          ? "linear-gradient(to right, #f87171, #ef4444)"
                          : passwordStrength < 80
                            ? "linear-gradient(to right, #facc15, #fbbf24)"
                            : "linear-gradient(to right, #4ade80, #22c55e)",
                    }}
                  ></div>
                </div>
              </div>
            )}

            <div className="mb-6 relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-400"
                placeholder="Confirm your password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
              >
                {showConfirm ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            {/* <button
              type="submit"
              className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white p-2.5 rounded-lg font-semibold hover:opacity-90 transition duration-300"
            >
              {loading ? "Registering..." : "Register"}
            </button> */}
            <button
              type="submit"
              disabled={otpSent || sendingOtp}   // ✅ disable after clicked once or while sending
              className={`w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white p-2.5 rounded-lg font-semibold transition duration-300
    ${otpSent || sendingOtp ? "opacity-60 cursor-not-allowed" : "hover:opacity-90"}`}
            >
              {sendingOtp ? "Processing..." : otpSent ? "OTP Sent" : "Register"}
            </button>


            <div className="flex items-center my-4">
              <div className="flex-grow h-px bg-gradient-to-r from-blue-600 to-sky-400" />
              <span className="mx-3 text-gray-600 text-sm font-medium">or</span>
              <div className="flex-grow h-px bg-gradient-to-r from-sky-400 to-blue-600" />
            </div>

            <div className="mt-4 flex justify-center">
              <GoogleLogin
                onSuccess={async (credentialResponse) => {
                  try {
                    const decoded = jwtDecode(credentialResponse.credential);
                    const { name, email, picture } = decoded;

                    const { data } = await axios.post(
                      `${import.meta.env.VITE_BACKEND_URL}/api/users/google-login`,
                      { name, email, photo: picture }
                    );

                    dispatch(googleLoginSuccess({ user: data.user, token: data.token }));
                    toast.success("Login successful!");
                    navigate(redirect);
                  } catch (error) {
                    console.error(error);
                    toast.error(error.response?.data?.message || "Login failed");
                  }
                }}
                onError={() => toast.error("Login failed")}
              />
            </div>

            <p className="mt-6 text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                to={`/login?redirect=${encodeURIComponent(redirect)}`}
                className="text-sky-600 font-medium hover:underline"
              >
                Login
              </Link>
            </p>
          </form>
        ) : (
          // --- OTP page (Step 2) ---
          <form onSubmit={handleVerifyAndRegister} className="w-full max-w-md p-8">
            <div className="flex items-center justify-center mb-8">
              <div className="flex items-center w-fit">
                <h2 className="text-3xl font-bold text-gray-800">Verify Email</h2>
                <span className="h-1 w-16 ml-3 bg-gradient-to-r from-blue-600 to-sky-400 rounded-full"></span>
              </div>
            </div>

            <p className="text-gray-600 mb-4">
              We’ve sent a 6-digit code to <span className="font-semibold">{email}</span>. Enter it below to continue.
            </p>

            <div className="mb-6">
              <input
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="tracking-[0.4em] text-center text-lg w-full px-4 py-3 rounded-lg bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-400"
                placeholder="------"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white p-2.5 rounded-lg font-semibold hover:opacity-90 transition duration-300"
            >
              {loading ? "Verifying..." : "Verify & Create Account"}
            </button>

            <div className="flex items-center justify-between mt-4">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendIn > 0}
                className={`text-sky-600 hover:underline disabled:text-gray-400`}
                title={resendIn > 0 ? `Wait ${resendIn}s` : "Send OTP again"}
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : "Send OTP again"}
              </button>
              <button
                type="button"
                onClick={() => setOtpMode(false)}
                className="text-gray-600 hover:underline"
              >
                Change email
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Register;
