const webpush = require("web-push");
const User = require("../models/User");
const Subscriber = require("../models/Subscriber");

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:raktimmaity2003@gmail.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn("Web push VAPID keys are not set; push notifications will be disabled.");
}

const sendPushNotification = async (subscription, payload) => {
  try {
    if (!subscription?.endpoint) return false;
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return false;
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.error("Push Notification Error:", err.message);
    return false;
  }
};

const normalizePushPayload = (payload = {}) => ({
  title: payload.title || "Raphaaa",
  body: payload.body || "",
  icon: payload.icon || "/favicon-192x192.png",
  url: payload.url || "/",
  data: payload.data || {},
});

const sendPushToSubscription = async (subscription, payload) =>
  sendPushNotification(subscription, normalizePushPayload(payload));

const resolveStoredPushSubscription = async ({ userId, email } = {}) => {
  if (userId) {
    const user = await User.findById(userId).select("pushSubscription email");
    if (user?.pushSubscription?.endpoint) return user.pushSubscription;
    if (!email && user?.email) email = user.email;
  }

  if (email) {
    const subscriber = await Subscriber.findOne({ email: String(email).toLowerCase().trim() }).select("pushSubscription");
    if (subscriber?.pushSubscription?.endpoint) return subscriber.pushSubscription;
  }

  return null;
};

const sendPushToUser = async ({ userId, email } = {}, payload) => {
  const subscription = await resolveStoredPushSubscription({ userId, email });
  if (!subscription) return false;
  return sendPushToSubscription(subscription, payload);
};

module.exports = {
  sendPushNotification,
  sendPushToSubscription,
  sendPushToUser,
};
