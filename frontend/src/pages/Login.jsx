import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { loginUser, googleLoginSuccess } from "../redux/slices/authSlice";
import { useDispatch, useSelector } from "react-redux";
import { mergecart } from "../redux/slices/cartSlice";
import { toast } from "sonner";
import { FiRefreshCcw } from "react-icons/fi";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { FaEye, FaEyeSlash, FaWhatsapp } from "react-icons/fa";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginMode, setLoginMode] = useState("otp"); // "password" | "otp"
  const [otpMobileTouched, setOtpMobileTouched] = useState(false);
  const [otpMobile, setOtpMobile] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpStep, setOtpStep] = useState("mobile"); // "mobile" | "otp" | "name"
  const [otpName, setOtpName] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaQuestion, setCaptchaQuestion] = useState({});
  const [requiresCaptcha, setRequiresCaptcha] = useState(false);
  const canvasRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, guestId, loading } = useSelector((state) => state.auth);
  const { cart } = useSelector((state) => state.cart);
  const [showPassword, setShowPassword] = useState(false);

  const redirectParam = new URLSearchParams(location.search).get("redirect");
  const redirect =
    redirectParam && redirectParam.startsWith("/") ? redirectParam : "/";

  useEffect(() => {
    if (user) {
      if (!sessionStorage.getItem("loginToastShown")) {
        sessionStorage.setItem("loginToastShown", "1");
        toast.success("Login successful!");
      }

      if (["admin", "merchantise", "marketing"].includes(user.role)) {
        navigate("/admin");
        return;
      }
      if (cart?.products.length > 0 && guestId) {
        dispatch(mergecart({ guestId, user })).then(() => {
          navigate(redirect);
        });
      } else {
        navigate(redirect);
      }
    }
  }, [user, guestId, cart, navigate, redirect, dispatch]);

  useEffect(() => {
    sessionStorage.removeItem("loginToastShown");
  }, []);

  useEffect(() => {
    const normalized = email.toLowerCase().trim();
    if (!validateEmail(normalized)) {
      setRequiresCaptcha(false);
      setCaptchaAnswer("");
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { data } = await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/api/users/prelogin-role`,
          { email: normalized }
        );
        setRequiresCaptcha(Boolean(data?.requiresCaptcha));
      } catch (_) {
        setRequiresCaptcha(false);
        setCaptchaAnswer("");
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [email]);

  useEffect(() => {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    setCaptchaQuestion({ a, b, answer: a + b });
  }, []);

  useEffect(() => {
    if (canvasRef.current && captchaQuestion.a !== undefined) {
      const ctx = canvasRef.current.getContext("2d");
      canvasRef.current.width = 140;
      canvasRef.current.height = 44;

      ctx.clearRect(0, 0, 140, 44);
      ctx.fillStyle = "#f4f4f5";
      ctx.fillRect(0, 0, 140, 44);

      for (let i = 0; i < 6; i++) {
        ctx.strokeStyle = "rgba(17,24,39,0.35)";
        ctx.beginPath();
        ctx.moveTo(Math.random() * 140, Math.random() * 44);
        ctx.lineTo(Math.random() * 140, Math.random() * 44);
        ctx.stroke();
      }

      ctx.font = "700 30px monospace";
      ctx.fillStyle = "#111827";
      ctx.textBaseline = "middle";
      ctx.fillText(`${captchaQuestion.a}+${captchaQuestion.b}=?`, 8, 22);
    }
  }, [captchaQuestion, requiresCaptcha]);

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPhoneLike = (value) => /^\+?\d[\d\s-]{8,}$/.test(String(value).trim());
  const validateIdentifier = (value) => {
    const v = String(value).trim();
    return validateEmail(v.toLowerCase()) || String(v).replace(/\D/g, "").length === 10;
  };

  const refreshCaptcha = () => {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    setCaptchaQuestion({ a, b, answer: a + b });
    setCaptchaAnswer("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!validateIdentifier(email)) {
      toast.error("Enter a valid email address or 10-digit phone number");
      return;
    }

    if (requiresCaptcha) {
      if (!captchaAnswer) {
        toast.error("Please solve captcha");
        return;
      }

      if (parseInt(captchaAnswer) !== captchaQuestion.answer) {
        toast.error("Captcha is incorrect");
        return;
      }
    }

    const rawId = email.trim();
    const identifier = isPhoneLike(rawId)
      ? rawId.replace(/\D/g, "").slice(-10)
      : rawId.toLowerCase();
    dispatch(loginUser({ identifier, email: identifier, password }));
  };

  const handleSendOtp = async () => {
    const d10 = otpMobile.replace(/\D/g, "").slice(-10);
    if (d10.length !== 10) {
      toast.error("Enter a valid 10-digit phone number");
      return;
    }
    setOtpLoading(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/users/otp/send`,
        { mobile: d10 }
      );
      toast.success("OTP sent to your WhatsApp");
      setOtpStep("otp");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode) {
      toast.error("Enter the OTP");
      return;
    }
    setOtpLoading(true);
    try {
      const d10 = otpMobile.replace(/\D/g, "").slice(-10);
      const { data } = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/users/otp/verify`,
        { mobile: d10, otp: otpCode }
      );
      if (data.isNewUser) {
        toast.success("Number verified! Just one more step.");
        setOtpStep("name");
      } else {
        dispatch(googleLoginSuccess({ user: data.user, token: data.token }));
        toast.success("Login successful!");
        navigate(redirect);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Incorrect or expired OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleCompleteSignup = async () => {
    if (!otpName.trim()) {
      toast.error("Enter your name");
      return;
    }
    setOtpLoading(true);
    try {
      const d10 = otpMobile.replace(/\D/g, "").slice(-10);
      const { data } = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/users/otp/complete-signup`,
        { mobile: d10, name: otpName.trim() }
      );
      dispatch(googleLoginSuccess({ user: data.user, token: data.token }));
      toast.success("Account created — you're logged in!");
      navigate(redirect);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create account");
    } finally {
      setOtpLoading(false);
    }
  };

  // ---- NEW DESIGN FOLLOWS ----
  return (
    <div className="flex h-[80vh]" style={{ fontFamily: "Manrope, sans-serif", background: "#F6F1EA" }}>
      <div
        className="w-full md:w-full flex flex-col justify-center items-center p-6 sm:p-12"
        style={{ background: "#D6F1FF" }}
      >
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md p-8"
          style={{
            background: "transparent",
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h1
              style={{
                margin: 0,
                fontFamily: "Fraunces, serif",
                fontSize: 40,
                fontWeight: 600,
                color: "#000000",
                opacity: 1,
                textAlign: "center",
              }}
            >
              Welcome Back
            </h1>
            <p style={{ margin: 0, fontSize: 15, color: "#5F574F", textAlign: "center" }}>
              Log in or create an account with your phone number.
            </p>
          </div>

          {/* OTP MODE (default) */}
          {loginMode === "otp" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {otpStep === "mobile" && (
                <>
                  <label
                    htmlFor="phone"
                    style={{ fontSize: 13, fontWeight: 600, color: "#3A342E" }}
                  >
                    Phone number
                  </label>
                  <div
                    style={{
                      display: "flex",
                      height: 52,
                      border: "1px solid #7DD3FC",
                      borderRadius: 12,
                      background: "#FFFFFF",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "0 16px",
                        borderRight: "1px solid #E6DDD2",
                        fontSize: 15,
                        fontWeight: 600,
                        color: "#3A342E",
                      }}
                    >
                      +91
                    </div>
                    <input
                      id="phone"
                      type="tel"
                      placeholder="10-digit mobile number"
                      value={otpMobile}
                      onChange={(e) =>
                        setOtpMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
                      }
                      onBlur={() => setOtpMobileTouched(true)}
                      inputMode="numeric"
                      maxLength={10}
                      style={{
                        flexGrow: 1,
                        border: 0,
                        outline: "none",
                        padding: "0 16px",
                        fontFamily: "Manrope, sans-serif",
                        fontSize: 15,
                        background: "transparent",
                      }}
                    />
                  </div>
                  {otpMobileTouched && otpMobile.length > 0 && otpMobile.length !== 10 && (
                    <p style={{ margin: 0, fontSize: 12, color: "#ef4444" }}>
                      Enter a valid 10-digit phone number
                    </p>
                  )}
                  <div className={otpMobileTouched && otpMobile.length !== 10 ? "mt-0 mb-4" : "mt-3 mb-4"}>
                    <button
                      type="button"
                      onClick={() => setLoginMode("password")}
                      className="text-sm text-sky-600 hover:underline font-medium text-right"
                    >
                      Login with Email &amp; Password instead
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={otpLoading || otpMobile.length !== 10}
                    style={{
                      height: 52,
                      border: 0,
                      borderRadius: 12,
                      color: "#000000",
                      fontFamily: "Manrope, sans-serif",
                      fontSize: 15,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      cursor: "pointer",
                      background: "#7DD3FC",
                      opacity: 1,
                    }}
                  >
                    {!otpLoading && <FaWhatsapp style={{ fontSize: 20, color: "#000000" }} />}
                    {otpLoading ? "Sending..." : "Send OTP on WhatsApp"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMode("password")}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 14,
                      color: "#8A4B2A",
                      textDecoration: "underline",
                      marginTop: 4,
                      fontFamily: "Manrope, sans-serif",
                      alignSelf: "center",
                    }}
                  >
                    Login with Email &amp; Password instead
                  </button>
                </>
              )}

              {otpStep === "otp" && (
                <>
                  <p style={{ margin: 0, fontSize: 14, color: "#5F574F" }}>
                    OTP sent to <span style={{ fontWeight: 600 }}>{otpMobile}</span> on WhatsApp
                  </p>
                  <div
                    style={{
                      display: "flex",
                      height: 52,
                      border: "1px solid #7DD3FC",
                      borderRadius: 12,
                      background: "#FFFFFF",
                      overflow: "hidden",
                    }}
                  >
                    <input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="Enter the 6-digit OTP"
                      autoFocus
                      style={{
                        flexGrow: 1,
                        border: 0,
                        outline: "none",
                        padding: "0 16px",
                        fontFamily: "Manrope, sans-serif",
                        fontSize: 15,
                        background: "transparent",
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={otpLoading}
                    style={{
                      height: 52,
                      border: 0,
                      borderRadius: 12,
                      color: "#3a342e",
                      fontFamily: "Manrope, sans-serif",
                      fontSize: 15,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      cursor: "pointer",
                      background: "#7DD3FC",
                      opacity: otpLoading ? 0.6 : 1,
                    }}
                  >
                    {otpLoading ? "Verifying..." : "Verify OTP"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep("mobile");
                      setOtpCode("");
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 14,
                      color: "#8A4B2A",
                      textDecoration: "underline",
                      marginTop: 4,
                      fontFamily: "Manrope, sans-serif",
                      alignSelf: "center",
                    }}
                  >
                    Change phone number
                  </button>
                </>
              )}

              {otpStep === "name" && (
                <>
                  <p style={{ margin: 0, fontSize: 14, color: "#5F574F" }}>
                    Looks like you're new here! Tell us your name to finish creating your account.
                  </p>
                  <div
                    style={{
                      display: "flex",
                      height: 52,
                      border: "1px solid #7DD3FC",
                      borderRadius: 12,
                      background: "#FFFFFF",
                      overflow: "hidden",
                    }}
                  >
                    <input
                      type="text"
                      value={otpName}
                      onChange={(e) => setOtpName(e.target.value)}
                      placeholder="Your full name"
                      autoFocus
                      style={{
                        flexGrow: 1,
                        border: 0,
                        outline: "none",
                        padding: "0 16px",
                        fontFamily: "Manrope, sans-serif",
                        fontSize: 15,
                        background: "transparent",
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCompleteSignup}
                    disabled={otpLoading}
                    style={{
                      height: 52,
                      border: 0,
                      borderRadius: 12,
                      color: "#3a342e",
                      fontFamily: "Manrope, sans-serif",
                      fontSize: 15,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      cursor: "pointer",
                      background: "#7DD3FC",
                      opacity: otpLoading ? 0.6 : 1,
                    }}
                  >
                    {otpLoading ? "Creating account..." : "Continue"}
                  </button>
                </>
              )}
            </div>
          )}

          {/* PASSWORD MODE */}
          {loginMode === "password" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <button
                type="button"
                onClick={() => setLoginMode("otp")}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  color: "#8A4B2A",
                  textDecoration: "underline",
                  fontFamily: "Manrope, sans-serif",
                  alignSelf: "flex-start",
                }}
              >
                &larr; Login with phone number instead
              </button>

              <div>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Phone number or email"
                  autoComplete="username"
                  style={{
                    width: "100%",
                    height: 52,
                    padding: "0 16px",
                    borderRadius: 12,
                    border: "1px solid #D8CEC2",
                    background: "#FFFFFF",
                    fontFamily: "Manrope, sans-serif",
                    fontSize: 15,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{
                    width: "100%",
                    height: 52,
                    padding: "0 40px 0 16px",
                    borderRadius: 12,
                    border: "1px solid #D8CEC2",
                    background: "#FFFFFF",
                    fontFamily: "Manrope, sans-serif",
                    fontSize: 15,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: 14,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#5F574F",
                  }}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              {requiresCaptcha && (
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <canvas
                      ref={canvasRef}
                      width={140}
                      height={44}
                      style={{ borderRadius: 8, border: "1px solid #D8CEC2", background: "#f4f4f5" }}
                    />
                    <button
                      type="button"
                      onClick={refreshCaptcha}
                      style={{
                        width: 40,
                        height: 40,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#7DD3FC",
                        color: "#1c1a17",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontSize: 18,
                      }}
                    >
                      <FiRefreshCcw />
                    </button>
                  </div>
                  <input
                    type="number"
                    value={captchaAnswer}
                    onChange={(e) => setCaptchaAnswer(e.target.value)}
                    placeholder="Answer"
                    style={{
                      flex: 1,
                      height: 44,
                      padding: "0 16px",
                      borderRadius: 12,
                      border: "1px solid #D8CEC2",
                      background: "#FFFFFF",
                      fontFamily: "Manrope, sans-serif",
                      fontSize: 15,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              )}

              <div style={{ textAlign: "right" }}>
                <Link
                  to="/forgot-password"
                  style={{
                    color: "#8A4B2A",
                    fontSize: 14,
                    textDecoration: "underline",
                    fontFamily: "Manrope, sans-serif",
                  }}
                >
                  Forgot Password?
                </Link>
              </div>

              <button
                type="submit"
                style={{
                  height: 52,
                  border: 0,
                  borderRadius: 12,
                  color: "#3a342e",
                  fontFamily: "Manrope, sans-serif",
                  fontSize: 15,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  background: "#7DD3FC",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? "Signing..." : "Sign In"}
              </button>
            </div>
          )}

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, color: "#8C8278", fontSize: 13 }}>
            <div style={{ flexGrow: 1, height: 1, background: "#7dd3fc" }} />
            <span>or</span>
            <div style={{ flexGrow: 1, height: 1, background: "#7dd3fc" }} />
          </div>

          {/* Social Buttons */}
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ position: "relative", flexGrow: 1, height: 52 }}>
              <button
                type="button"
                tabIndex={-1}
                style={{
                  width: "100%",
                  height: 52,
                  border: "1px solid #7dd3fc",
                  borderRadius: 12,
                  background: "#FFFFFF",
                  fontFamily: "Manrope, sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#1C1A17",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  cursor: "pointer",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.5 12.2c0-.8-.1-1.4-.2-2H12v3.9h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-7.9z" />
                  <path fill="#34A853" d="M12 23c3 0 5.5-1 7.2-2.7l-3.5-2.7c-1 .7-2.2 1-3.7 1-2.8 0-5.2-1.9-6.1-4.5H2.3v2.8A11 11 0 0 0 12 23z" />
                  <path fill="#FBBC05" d="M5.9 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.3a11 11 0 0 0 0 9.8z" />
                  <path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.1 1.6l3.1-3.1A11 11 0 0 0 2.3 7.1l3.6 2.8C6.8 7.3 9.2 5.4 12 5.4z" />
                </svg>
                Google
              </button>
              {/* Real GoogleLogin rendered transparently on top so clicks on the
                  styled button above actually trigger Google's OAuth flow */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: 0,
                  overflow: "hidden",
                }}
              >
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
                      navigate(redirect);
                    } catch (error) {
                      console.error(error);
                      toast.error(error.response?.data?.message || "Login failed");
                    }
                  }}
                  onError={() => toast.error("Login failed")}
                  width="300"
                />
              </div>
            </div>
          </div>

          {/* Terms */}
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: "#6E645B", textAlign: "center" }}>
            By continuing you agree to Raphaaa's <a href="/terms" style={{ color: "#1C1A17" }}>Terms of Use</a> and <a href="/privacy-policy" style={{ color: "#1C1A17" }}>Privacy Policy</a>.
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;