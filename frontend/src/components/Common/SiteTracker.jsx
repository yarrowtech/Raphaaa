import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

// Lightweight first-party tracking for the admin "Button Analytics" page.
// Sends page views, clicks, logins and campaign landings to /api/track.

const ENDPOINT = `${import.meta.env.VITE_BACKEND_URL}/api/track`;
const SESSION_IDLE_MS = 30 * 60 * 1000;

const randomId = () =>
  (crypto?.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`).slice(0, 36);

const safeGet = (store, key) => {
  try { return store.getItem(key); } catch { return null; }
};
const safeSet = (store, key, value) => {
  try { store.setItem(key, value); } catch { /* storage blocked */ }
};

const getVisitor = () => {
  let id = safeGet(localStorage, "rp_vid");
  let isNew = false;
  if (!id) {
    id = randomId();
    isNew = true;
    safeSet(localStorage, "rp_vid", id);
    safeSet(localStorage, "rp_vid_new_until", String(Date.now() + 24 * 60 * 60 * 1000));
  }
  const newUntil = Number(safeGet(localStorage, "rp_vid_new_until") || 0);
  return { visitorId: id, isNewVisitor: isNew || Date.now() < newUntil };
};

const getSession = () => {
  const last = Number(safeGet(localStorage, "rp_sid_ts") || 0);
  let sid = safeGet(localStorage, "rp_sid");
  if (!sid || Date.now() - last > SESSION_IDLE_MS) sid = randomId();
  safeSet(localStorage, "rp_sid", sid);
  safeSet(localStorage, "rp_sid_ts", String(Date.now()));
  return sid;
};

const getDevice = () => {
  const ua = navigator.userAgent || "";
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return "tablet";
  if (/Mobi|iPhone|iPod|Android/i.test(ua)) return "mobile";
  return "desktop";
};

const isExcluded = (path) => /^\/admin(\/|$)/i.test(path);

const send = (events) => {
  const token = safeGet(localStorage, "userToken");
  const { visitorId, isNewVisitor } = getVisitor();
  const base = { visitorId, isNewVisitor, sessionId: getSession(), device: getDevice() };
  fetch(ENDPOINT, {
    method: "POST",
    keepalive: true,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ events: events.map((e) => ({ ...base, ...e })) }),
  }).catch(() => {});
};

const clickLabel = (el) => {
  const text =
    el.getAttribute("aria-label") ||
    el.getAttribute("data-track") ||
    el.innerText ||
    el.getAttribute("title") ||
    el.value ||
    "";
  return text.replace(/\s+/g, " ").trim().slice(0, 60);
};

const SiteTracker = () => {
  const location = useLocation();
  const user = useSelector((state) => state.auth?.user);
  const prevUser = useRef(user);
  const campaignSent = useRef(false);

  // Page views + campaign link landings
  useEffect(() => {
    const path = location.pathname;
    if (isExcluded(path)) return;

    let referrerHost = "";
    try {
      const ref = document.referrer ? new URL(document.referrer) : null;
      if (ref && ref.host !== window.location.host) referrerHost = ref.host;
    } catch { /* ignore */ }

    const events = [{ type: "pageview", path, referrerHost }];

    if (!campaignSent.current) {
      campaignSent.current = true;
      const params = new URLSearchParams(location.search);
      const campaign =
        params.get("coupon") || params.get("ref") || params.get("utm_campaign") || params.get("campaign_id");
      if (campaign) events.push({ type: "campaign", path, campaign, referrerHost });
    }
    send(events);
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clicks on buttons and links
  useEffect(() => {
    const onClick = (e) => {
      if (isExcluded(window.location.pathname)) return;
      const el = e.target?.closest?.("button, a, [role='button'], input[type='submit']");
      if (!el) return;
      const label = clickLabel(el);
      if (!label) return;
      send([{ type: "click", path: window.location.pathname, label }]);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Heartbeat for "online now"
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible" && !isExcluded(window.location.pathname)) {
        send([{ type: "ping", path: window.location.pathname }]);
      }
    }, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Login: user went from signed-out to signed-in
  useEffect(() => {
    if (!prevUser.current && user && !["admin", "merchantise", "marketing", "delivery_boy"].includes(user.role)) {
      send([{ type: "login", path: window.location.pathname }]);
    }
    prevUser.current = user;
  }, [user]);

  return null;
};

export default SiteTracker;
