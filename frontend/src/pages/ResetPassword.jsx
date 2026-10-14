import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const ResetPassword = () => {
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);

    const [, setGreeting] = useState("");
    const [email, setEmail] = useState("");
    const [passwordMode, setPasswordMode] = useState("auto"); // 'auto' | 'custom'
    const [customPassword, setCustomPassword] = useState("");
    const [loading, setLoading] = useState(false);

    // Same greeting behavior as UpdateProfile.jsx
    useEffect(() => {
        const updateGreeting = () => {
            const hour = new Date().getHours();
            if (hour < 12) setGreeting("Good Morning");
            else if (hour < 17) setGreeting("Good Afternoon");
            else if (hour < 21) setGreeting("Good Evening");
            else setGreeting("Good Night");
        };
        updateGreeting();
        const id = setInterval(updateGreeting, 60 * 1000);
        return () => clearInterval(id);
    }, []);

    // Guard: only admin can access
    useEffect(() => {
        if (!user || user.role !== "admin") {
            toast.error("Only admins can reset user passwords");
            navigate("/");
        }
    }, [user, navigate]);

    const generateStrong = () => {
        // Strong, but still readable: 12 chars, letters+numbers+symbols
        const chars =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
        let out = "";
        for (let i = 0; i < 12; i++) {
            out += chars[Math.floor(Math.random() * chars.length)];
        }
        return out;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) {
            toast.error("Enter a user email");
            return;
        }
        let newPassword = passwordMode === "custom" ? customPassword.trim() : "";

        if (passwordMode === "custom" && customPassword.trim().length < 6) {
            toast.error("Custom password must be at least 6 characters");
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem("userToken");
            const body = {
                email,
                newPassword: newPassword || generateStrong(),
            };

            const { data } = await axios.post(
                `${import.meta.env.VITE_BACKEND_URL}/api/users/reset-password`,
                body,
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    timeout: 15000,
                }
            );

            toast.success(data?.message || "Password reset successfully");
            // (Optional) Show the generated pass if you want admin to see it:
            // toast.info(`Temp password: ${data?.tempPassword}`);

            setEmail("");
            setCustomPassword("");
            setPasswordMode("auto");
        } catch (err) {
            const msg =
                err.response?.data?.message ||
                err.message ||
                "Failed to reset password";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-6">
            {/* Header card - mirrors UpdateProfile.jsx */}
            {/* <div className="relative bg-gradient-to-r from-blue-50 via-white to-blue-50 border border-blue-100 shadow-xl rounded-xl mb-8 p-6 sm:flex sm:items-center sm:justify-between transition-all duration-300">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-sky-500 text-white flex items-center justify-center text-2xl font-bold shadow-md ring-4 ring-white">
            {user?.name?.charAt(0)?.toUpperCase() || "A"}
          </div>
          <div>
            <h3 className="text-2xl font-bold text-blue-800 mb-1">
              {greeting}, {user?.name || "Admin"}
            </h3>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Role:</span>{" "}
              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                {user?.role || "admin"}
              </span>
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Email:</span> {user?.email}
            </p>
          </div>
        </div>
      </div> */}

            {/* Form card */}
            <div className="p-0 bg-transparent rounded-2xl mb-6 overflow-hidden shadow-xl ring-1 ring-blue-100/70">
                {/* Card header bar (matches UpdateProfile tone) */}
                <div className="bg-gradient-to-r from-blue-50 via-white to-blue-50 px-6 py-5 border-b border-blue-100/70">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 text-white flex items-center justify-center shadow">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 1.75a5.25 5.25 0 0 1 5.25 5.25v1.25h.5A2.25 2.25 0 0 1 20 10.5v9.25A2.25 2.25 0 0 1 17.75 22H6.25A2.25 2.25 0 0 1 4 19.75V10.5a2.25 2.25 0 0 1 2.25-2.25h.5V7A5.25 5.25 0 0 1 12 1.75Zm0 1.5A3.75 3.75 0 0 0 8.25 7v1.25h7.5V7A3.75 3.75 0 0 0 12 3.25Zm0 8a3.25 3.25 0 1 1 0 6.5 3.25 3.25 0 0 1 0-6.5Z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-xl font-extrabold tracking-tight text-blue-900">Reset Password</h3>
                            <p className="text-xs text-gray-500">Send a fresh password to the user’s registered email</p>
                        </div>
                    </div>
                </div>

                {/* Card body */}
                <div className="p-6 bg-white/90 backdrop-blur">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-1.5">User Email</label>
                            <div className="relative">
                                <input
                                    type="email"
                                    value={email}
                                    placeholder="user@example.com"
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/80 focus:border-blue-300 transition"
                                    required
                                />
                                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                    {/* mail icon */}
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M2.25 6.75A2.25 2.25 0 0 1 4.5 4.5h15a2.25 2.25 0 0 1 2.25 2.25v10.5A2.25 2.25 0 0 1 19.5 19.5h-15A2.25 2.25 0 0 1 2.25 17.25V6.75Zm2.28-.75 7.22 5.41L19 6h-14.47Zm-.78 1.53v9.72c0 .414.336.75.75.75H19.5a.75.75 0 0 0 .75-.75V7.53l-8.02 6.01a.75.75 0 0 1-.9 0L3.75 7.53Z" />
                                    </svg>
                                </span>
                            </div>
                            <p className="mt-1.5 text-[11px] text-gray-500">We’ll email the new password to this address.</p>
                        </div>

                        {/* Mode */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-2">Password Mode</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label className={`flex items-center gap-2 rounded-lg border ${passwordMode === "auto" ? "border-blue-300 ring-2 ring-blue-200/70" : "border-gray-200"} bg-white px-3 py-2 cursor-pointer transition`}>
                                    <input
                                        type="radio"
                                        name="mode"
                                        value="auto"
                                        checked={passwordMode === "auto"}
                                        onChange={() => setPasswordMode("auto")}
                                        className="accent-blue-600"
                                    />
                                    <span className="text-sm text-gray-700">Auto-generate strong password</span>
                                </label>
                                <label className={`flex items-center gap-2 rounded-lg border ${passwordMode === "custom" ? "border-blue-300 ring-2 ring-blue-200/70" : "border-gray-200"} bg-white px-3 py-2 cursor-pointer transition`}>
                                    <input
                                        type="radio"
                                        name="mode"
                                        value="custom"
                                        checked={passwordMode === "custom"}
                                        onChange={() => setPasswordMode("custom")}
                                        className="accent-blue-600"
                                    />
                                    <span className="text-sm text-gray-700">Set a custom password</span>
                                </label>
                            </div>
                        </div>

                        {/* Custom password */}
                        {passwordMode === "custom" && (
                            <div>
                                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                                    New Password <span className="text-gray-400 font-normal">(min 6 chars)</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={customPassword}
                                        onChange={(e) => setCustomPassword(e.target.value)}
                                        placeholder="Type a secure password"
                                        className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/80 focus:border-blue-300 transition"
                                    />
                                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                        {/* key icon */}
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M14.5 6.5a4 4 0 1 0 0 8c.74 0 1.43-.2 2.03-.54l2.23 2.23a1 1 0 0 0 .71.31H21a1 1 0 1 0 0-2h-1.09l-1.92-1.92c.33-.6.51-1.29.51-2.08a4 4 0 0 0-4-4Zm-6 3.5a6 6 0 1 1 10.86 3.3l2.17 2.17A2.5 2.5 0 0 1 21 18.5h-1.53a2.5 2.5 0 0 1-1.77-.73l-2.1-2.1A6 6 0 0 1 8.5 10Z" />
                                        </svg>
                                    </span>
                                </div>
                                <p className="mt-1.5 text-[11px] text-gray-500">Use letters, numbers, and symbols for better security.</p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-3 pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-sky-600 text-white font-semibold shadow hover:from-blue-700 hover:to-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 disabled:opacity-60"
                            >
                                {loading && (
                                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v3a5 5 0 0 0-5 5H4z"></path>
                                    </svg>
                                )}
                                <span>{loading ? "Resetting..." : "Reset & Email Password"}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setEmail("");
                                    setCustomPassword("");
                                    setPasswordMode("auto");
                                }}
                                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
                            >
                                Clear
                            </button>

                            <span className="text-[11px] text-gray-500">
                                The user will receive the new password via email instantly.
                            </span>
                        </div>
                    </form>
                </div>
            </div>

        </div>
    );
};

export default ResetPassword;
