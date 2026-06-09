import { useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";

const STORAGE_PREFIX = "raphaaa:push-optin:v1:";

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const PushNotificationRegistrar = () => {
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    const registerPush = async () => {
      if (!user?._id || !user?.email) return;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;

      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) return;

      const storageKey = `${STORAGE_PREFIX}${user._id}`;
      if (localStorage.getItem(storageKey) === "done") return;
      if (Notification.permission === "denied") return;

      let permission = Notification.permission;
      if (permission === "default") {
        permission = await Notification.requestPermission();
      }
      if (permission !== "granted") return;

      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      const subscription =
        existingSubscription ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        }));

      const token = localStorage.getItem("userToken");
      if (!token) return;

      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/users/push-subscription`,
        { subscription },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      localStorage.setItem(storageKey, "done");
    };

    registerPush().catch((error) => {
      console.error("Push registration failed:", error);
    });
  }, [user?._id, user?.email]);

  return null;
};

export default PushNotificationRegistrar;
