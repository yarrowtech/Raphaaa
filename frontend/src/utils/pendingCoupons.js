// Coupons a shopper "applied" from a product page, kept until checkout.
// Stored in localStorage so they survive navigation and reloads.

const KEY = "pendingCoupons";
const EVENT = "pending-coupons-changed";

const normalize = (code) => String(code || "").trim().toUpperCase();

export const getPendingCoupons = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return [...new Set(raw.map(normalize).filter(Boolean))].slice(0, 5);
  } catch {
    return [];
  }
};

const persist = (list) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(EVENT, { detail: list }));
  } catch {
    // ignore quota / private-mode errors
  }
};

export const addPendingCoupon = (code) => {
  const c = normalize(code);
  if (!c) return getPendingCoupons();
  const next = [...new Set([...getPendingCoupons(), c])].slice(0, 5);
  persist(next);
  return next;
};

export const removePendingCoupon = (code) => {
  const c = normalize(code);
  const next = getPendingCoupons().filter((x) => x !== c);
  persist(next);
  return next;
};

export const clearPendingCoupons = () => persist([]);

export const onPendingCouponsChange = (handler) => {
  const wrapped = () => handler(getPendingCoupons());
  window.addEventListener(EVENT, wrapped);
  window.addEventListener("storage", wrapped);
  return () => {
    window.removeEventListener(EVENT, wrapped);
    window.removeEventListener("storage", wrapped);
  };
};
