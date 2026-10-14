export const safeStorage = {
  getItem(key) { try { return globalThis.localStorage.getItem(key); } catch { return null; } },
  setItem(key, value) { try { globalThis.localStorage.setItem(key, value); } catch { /* Storage may be disabled. */ } },
  removeItem(key) { try { globalThis.localStorage.removeItem(key); } catch { /* Storage may be disabled. */ } },
};

export function readStoredJson(key, valid, fallback) {
  try {
    const value = JSON.parse(safeStorage.getItem(key));
    if (valid(value)) return value;
  } catch { /* Discard damaged records. */ }
  safeStorage.removeItem(key);
  return fallback;
}
export const validCart = (value) => value && Array.isArray(value.products) && value.products.every((p) =>
  p && typeof p.productId === 'string' && Number.isSafeInteger(p.quantity) && p.quantity > 0 && Number.isFinite(Number(p.price)) && Number(p.price) >= 0);
export const validUser = (value) => value && typeof value === 'object' && !Array.isArray(value) && typeof value._id === 'string' && value._id.length > 0;
