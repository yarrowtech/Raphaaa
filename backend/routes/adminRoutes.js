const express = require("express");
const User = require("../models/User");
const Order = require("../models/Order");
const { sendMail } = require("../utils/sendMail");
const { protect, admin, adminOrMerchantise } = require("../middleware/authMiddleware");
const { getJson, setJson } = require("../utils/redisCache");
const { getAvailableCredits } = require("../services/walletService");

const router = express.Router();

const escapeHtml = (value) =>
    String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

// Normalise a mobile number to its last 10 digits ("" when nothing usable).
const normalizeMobile = (value) => {
    const digits = String(value ?? "").replace(/\D/g, "");
    return digits.length >= 10 ? digits.slice(-10) : (digits ? digits : "");
};

// Placeholder email domain for phone-only accounts (keeps the unique email
// index satisfied without asking the user for an email address).
const PHONE_EMAIL_DOMAIN = "phone.raphaaa";
const isPlaceholderEmail = (email) =>
    String(email || "").toLowerCase().endsWith(`@${PHONE_EMAIL_DOMAIN}`);

// @route GET /api/admin/users
// @desc Get all users (Admin only)
// @access Private/Admin
router.get("/", protect, admin, async (req, res) => {
    try {
        const cacheKey = `role:${req.user.role}:users`;
        const cached = await getJson("dashboard", cacheKey);
        if (cached) return res.json(cached);

        const users = await User.find({});
        await setJson("dashboard", cacheKey, users, 60);
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server error" });
    }
});

// @route GET /api/admin/users/:id/summary
// @desc Full profile + order stats + wallet for one user (View modal)
// @access Private/Admin
const DELIVERED_STATUSES = new Set(["Delivered", "RTO Delivered"]);
const CANCELLED_STATUSES = new Set(["Cancelled", "RTO Initiated", "Refunded"]);

router.get("/:id/summary", protect, admin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password").lean();
        if (!user) return res.status(404).json({ message: "User not found" });

        const emailMatch =
            user.email && !isPlaceholderEmail(user.email) ? [{ guestEmail: user.email }] : [];
        const orders = await Order.find({ $or: [{ user: user._id }, ...emailMatch] })
            .select("orderId status totalPrice isPaid isDelivered paymentMethod createdAt")
            .sort({ createdAt: -1 })
            .lean();

        const stats = {
            total: orders.length,
            successful: 0,   // paid
            delivered: 0,
            cancelled: 0,
            active: 0,       // in-flight (not delivered / cancelled)
            totalSpent: 0,
        };
        for (const o of orders) {
            if (o.isPaid) stats.successful += 1;
            if (o.isDelivered || DELIVERED_STATUSES.has(o.status)) stats.delivered += 1;
            else if (CANCELLED_STATUSES.has(o.status)) stats.cancelled += 1;
            else stats.active += 1;
            if (o.isPaid) stats.totalSpent += Number(o.totalPrice || 0);
        }
        stats.totalSpent = Math.round(stats.totalSpent);

        let walletBalance = 0;
        try {
            walletBalance = await getAvailableCredits(user._id);
        } catch (_) { /* wallet optional */ }

        res.json({
            user,
            stats,
            walletBalance,
            firstOrderAt: orders.length ? orders[orders.length - 1].createdAt : null,
            lastOrderAt: orders.length ? orders[0].createdAt : null,
            recentOrders: orders.slice(0, 5).map((o) => ({
                _id: o._id,
                orderId: o.orderId,
                status: o.status,
                totalPrice: Math.round(Number(o.totalPrice || 0)),
                isPaid: !!o.isPaid,
                paymentMethod: o.paymentMethod,
                createdAt: o.createdAt,
            })),
        });
    } catch (error) {
        console.error("user summary error:", error);
        res.status(500).json({ message: "Failed to load user summary" });
    }
});

// @route POST /api/admin/users
// @desc Add a new user (admin only)
// @access Private/Admin
router.post("/", protect, admin, adminOrMerchantise, async (req, res) => {
    const { name, email, password, role, mobile } = req.body;
    try {
        const realEmail = String(email || "").trim().toLowerCase();
        const mobile10 = normalizeMobile(mobile);

        if (mobile && mobile10.length !== 10) {
            return res.status(400).json({ message: "Enter a valid 10-digit mobile number" });
        }
        if (!realEmail && !mobile10) {
            return res.status(400).json({ message: "Provide an email address or a mobile number" });
        }

        // Phone-only account: use a placeholder email so the unique index is happy.
        const normalizedEmail = realEmail || `${mobile10}@${PHONE_EMAIL_DOMAIN}`;

        const existing = await User.findOne({
            $or: [
                { email: normalizedEmail },
                ...(mobile10 ? [{ mobile: mobile10 }] : []),
            ],
        });
        if (existing) {
            const clash = mobile10 && existing.mobile === mobile10 ? "mobile number" : "email";
            return res.status(400).json({ message: `A user with this ${clash} already exists` });
        }

        const user = new User({
            name,
            email: normalizedEmail,
            password,
            role: role || "customer",
            ...(mobile10 ? { mobile: mobile10, mobileVerified: true } : {}),
        });
        await user.save();

        let emailSent = false;
        try {
            if (isPlaceholderEmail(normalizedEmail)) {
                throw new Error("phone-only account — no email to send to");
            }
            await sendMail({
                to: normalizedEmail,
                subject: "Your Raphaaa account has been created",
                message: `
                  <p>Hi ${escapeHtml(user.name)},</p>
                  <p>Your Raphaaa account has been created by an admin.</p>
                  <p><strong>Email:</strong> ${escapeHtml(user.email)}</p>
                  ${user.mobile ? `<p><strong>Mobile:</strong> ${escapeHtml(user.mobile)}</p>` : ""}
                  <p><strong>Password:</strong> <code>${escapeHtml(password)}</code></p>
                  <p><strong>Role:</strong> ${escapeHtml(user.role)}</p>
                  <p>You can log in with your ${user.mobile ? "mobile number or email" : "email"} and this password.</p>
                  <p>Love,<br/>Team Raphaaa</p>
                `,
            });
            emailSent = true;
        } catch (mailError) {
            console.error("Admin user credential email failed:", {
                message: mailError?.message,
                code: mailError?.code,
                response: mailError?.response?.body || mailError?.response?.data,
                recipient: normalizedEmail,
            });
        }

        res.status(201).json({
            message: emailSent
                ? "User created successfully and credentials sent by email"
                : isPlaceholderEmail(normalizedEmail)
                    ? "Phone-only user created. Share the password with them directly."
                    : "User created successfully, but credentials email could not be sent",
            user,
            emailSent,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server error" });
    }
});

// @route PUT /api/admin/users/:id
// @desc Update user details (Admin only)
// @access Private/Admin
router.put("/:id", protect, admin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        user.name = req.body.name || user.name;
        user.role = req.body.role || user.role;

        // A real email always replaces a placeholder / previous address.
        const newEmail = String(req.body.email || "").trim().toLowerCase();
        if (newEmail && !isPlaceholderEmail(newEmail) && newEmail !== user.email) {
            const emailClash = await User.findOne({ email: newEmail, _id: { $ne: user._id } });
            if (emailClash) {
                return res.status(400).json({ message: "Another user already has this email" });
            }
            user.email = newEmail;
        }

        if (req.body.mobile !== undefined) {
            const mobile10 = normalizeMobile(req.body.mobile);
            if (req.body.mobile && mobile10.length !== 10) {
                return res.status(400).json({ message: "Enter a valid 10-digit mobile number" });
            }
            if (mobile10) {
                const clash = await User.findOne({ mobile: mobile10, _id: { $ne: user._id } });
                if (clash) {
                    return res.status(400).json({ message: "Another user already has this mobile number" });
                }
                user.mobile = mobile10;
                user.mobileVerified = true;
                // Keep a phone-only account's placeholder email in sync with the number.
                if (isPlaceholderEmail(user.email)) {
                    user.email = `${mobile10}@${PHONE_EMAIL_DOMAIN}`;
                }
            } else {
                if (isPlaceholderEmail(user.email) && !newEmail) {
                    return res.status(400).json({
                        message: "This is a phone-only account — add an email before removing the mobile number",
                    });
                }
                user.mobile = undefined;
            }
        }
        const updatedUser = await user.save();
        res.json({ message: "User updated successfully", user: updatedUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server error" });
    }
});

// @route DELETE /api/admin/users/:id
// @desc Delete a user
// @access Private/Admin
router.delete("/:id", protect, admin, async(req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            await user.deleteOne();
            res.json({ message: "User deleted successfully" });
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server error" });
    }
})

module.exports = router;
