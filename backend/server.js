const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(__dirname, ".env") });
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const checkoutRoutes = require("./routes/checkoutRoutes");
const orderRoutes = require("./routes/orderRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const subscriberRoutes = require("./routes/subscriberRoute");
const adminRoutes = require("./routes/adminRoutes");
const productAdminRoutes = require("./routes/productAdminRoutes");
const adminOrderRoutes = require("./routes/adminOrderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const taskRoutes = require("./routes/taskRoutes");
const salesRoutes = require("./routes/salesRoutes");
// const merchRoutes = require("./routes/merchRoutes");
const Task = require("./models/taskModel");
const cron = require("node-cron");
const moment = require("moment-timezone");
const requestTracing = require("./middleware/requestTracing");
const reviewRoutes = require("./routes/reviewRoutes");
const contactRoutes = require("./routes/contactRoutes");
const heroRoutes = require("./routes/heroRoutes");
const webhookRoutes = require("./routes/paymentWebhook");
const suggestionRoutes = require("./routes/suggestionRoutes");
const contactSettingRoutes = require("./routes/contactSettingRoutes");
const aboutRoutes = require("./routes/aboutRoutes");
const collabRoutes = require("./routes/collabRoutes");
const userAddressRoutes = require("./routes/userAddressRoutes");
const policyRoutes = require("./routes/policyRoutes");
const offerRoutes = require("./routes/offerRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const recommendationRoutes = require("./routes/recommendationRoutes");
const walletRoutes = require("./routes/walletRoutes");
const alertRoutes = require("./routes/alertRoutes");
// require("./emailScheduler");
const { sendScheduledEmails } = require("./offerScheduler");
sendScheduledEmails(); // Run once on startup
const metaOptionRoutes = require("./routes/metaOptionRoutes");
const campaignsRoutes = require("./routes/campaignRoutes");
const complaintRoutes = require("./routes/complaintRoutes");
const sizeChartRoutes = require("./routes/sizeChartRoutes");
const returnRequestRoutes = require("./routes/returnRequestRoutes");
const { syncShiprocketStatusesForOpenOrders } = require("./utils/shiprocket");
const { syncShiprocketStatusesForOpenReturns } = require("./routes/returnRequestRoutes");
const { expireDueCredits } = require("./services/walletService");
const { scanAndTriggerAlerts } = require("./services/alertService");
const { startJobWorker } = require("./workers/jobWorker");
const analyticsRoutes = require("./routes/analyticsRoutes");

// Run every day at 7:00 PM IST
cron.schedule("0 19 * * *", async () => {
  const now = moment().tz("Asia/Kolkata");
  console.log(`[RUNNING] IST Time: ${now.format("hh:mm:ss A")} on ${now.format("DD-MM-YYYY")}`);
  const startOfDay = now.clone().startOf("day").toDate();
  const endOfDay = now.clone().endOf("day").toDate();

  try {
    const result = await Task.updateMany(
      {
        status: "working", // still not updated by merchandiser
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      },
      { $set: { status: "not completed" } }
    );

    console.log(
      `[TASK STATUS AUTO-UPDATE] ${result.modifiedCount} tasks marked as "not completed"`
    );
  } catch (err) {
    console.error("Auto-update failed:", err.message);
  }
});

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://localhost:9000",
  "https://raphaaa.com",
  "https://www.raphaaa.com",
  "https://raphaaa.vercel.app",
  process.env.FRONTEND_URL,
  ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim()) : []),
].filter(Boolean);

const corsConfig = {
  origin: (origin, cb) => {
    // allow requests with no origin (mobile apps, curl, Postman, same-origin)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);

    try {
      const hostname = new URL(origin).hostname;
      if (hostname === "raphaaa.com" || hostname === "www.raphaaa.com" || hostname.endsWith(".vercel.app")) {
        return cb(null, true);
      }
    } catch (_) {
      // ignore invalid origin values
    }

    cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
};

const app = express();
app.use(express.json());
app.use(requestTracing);
app.options(/(.*)/, cors(corsConfig)); // handle ALL preflight requests (Express 5 regex syntax)
app.use(cors(corsConfig));

const PORT = process.env.PORT || 3000;

// Reset Mongoose models in development to prevent OverwriteModelError
if (process.env.NODE_ENV === 'development') {
  mongoose.models = {};
  mongoose.modelSchemas = {};
}

// Connect to the MongoDB database
connectDB();

app.get("/", (req, res) => {
    res.send("Welcome to Raphaaa API!!");
});

// API Routes 
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api", subscriberRoutes);
app.use("/api/paymentRoutes", paymentRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/inventory", require("./routes/inventoryRoutes"));
app.use("/api/sales-analysis", salesRoutes);
// In server.js or app.js
app.use("/uploads", express.static("uploads"));
app.use("/api/reviews", reviewRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/website/hero", heroRoutes);
app.use("/api/hero-slides", require("./routes/heroSlideRoutes"));
app.use("/api/suggestions", suggestionRoutes);
app.use("/api/settings/contact", contactSettingRoutes);
app.use("/api/settings/about", aboutRoutes);
app.use("/api/collabs", collabRoutes);
app.use("/api/payment/webhook", webhookRoutes);
app.use("/api/user/addresses", userAddressRoutes);
app.use("/api/settings/policy", policyRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/campaigns", campaignsRoutes);

// Admin routes
app.use("/api/admin/users", adminRoutes);
app.use("/api/admin/products", productAdminRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
// app.use("/api/merch", merchRoutes);
app.use("/api/meta-options", metaOptionRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/size-charts", sizeChartRoutes);
app.use("/api/returns", returnRequestRoutes);
app.use("/api/admin/analytics", analyticsRoutes);
app.use("/api/qa", require("./routes/productQARoutes"));
app.use("/api/shipping-config", require("./routes/shippingConfigRoutes"));
app.use("/api/legal", require("./routes/legalRoutes"));
app.use("/api/referral", require("./routes/referralRoutes"));
app.use("/sitemap.xml",  require("./routes/sitemapRoutes"));

// Health check endpoint
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});


app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on https://localhost:${PORT}`);
});

// Background worker for queued jobs (emails/webhooks/retries)
startJobWorker({
  intervalMs: Number(process.env.JOB_WORKER_INTERVAL_MS || 500),
  concurrency: Number(process.env.JOB_WORKER_CONCURRENCY || 1),
});

// Sync shipped orders with Shiprocket tracking updates every 15 minutes
setInterval(async () => {
  try {
    await syncShiprocketStatusesForOpenOrders(100);
  } catch (error) {
    console.error("[SHIPROCKET SYNC ERROR]:", error.message);
  }
}, 15 * 60 * 1000);

// Sync return reverse-pickup statuses from Shiprocket every 10 minutes
setInterval(async () => {
  try {
    await syncShiprocketStatusesForOpenReturns(100);
  } catch (error) {
    console.error("[SHIPROCKET RETURN SYNC ERROR]:", error.message);
  }
}, 10 * 60 * 1000);

// Wallet expiry + alert scanning (Phase 4)
cron.schedule("10 * * * *", async () => {
  try {
    const r = await expireDueCredits({ limit: 500 });
    if (r?.expiredCount) console.log(`[WALLET] Expired credits: ${r.expiredCount}`);
  } catch (e) {
    console.error("[WALLET EXPIRY ERROR]:", e?.message || e);
  }
});

cron.schedule("*/5 * * * *", async () => {
  try {
    const r = await scanAndTriggerAlerts({ limitProducts: 200 });
    if (r?.totalTriggered) console.log(`[ALERTS] Triggered: ${r.totalTriggered}`);
  } catch (e) {
    console.error("[ALERT SCAN ERROR]:", e?.message || e);
  }
});
// const webpush = require("web-push");
// const vapidKeys = webpush.generateVAPIDKeys();
// console.log(vapidKeys);
// {
//   publicKey: 'BIfPA4HUUcJVRPAqn4NEAcE8Bzg9cYmLTVNqGYCY5SqJvPKjp6JPva2C2aTyXKcKoUrwbwjrj7puKNPHWIgdvls',
//   privateKey: 'AevdtLtBPJhn062uTjiLqHjgpE7rKv4hwlr3Gku_dXI'
// }
