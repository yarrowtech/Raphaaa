const CACHE_PREFIX = "raphaaa:http-cache:v1:";

const isBrowser = () => typeof window !== "undefined" && typeof localStorage !== "undefined";

const readCacheEntry = (key) => {
  if (!isBrowser()) return null;

  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;

    const entry = JSON.parse(raw);
    if (!entry?.expiresAt || entry.expiresAt <= Date.now()) {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }

    return entry.value ?? null;
  } catch {
    return null;
  }
};

const writeCacheEntry = (key, value, ttlMs) => {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(
      `${CACHE_PREFIX}${key}`,
      JSON.stringify({
        value,
        expiresAt: Date.now() + ttlMs,
      })
    );
  } catch {
    // Ignore storage quota or serialization errors.
  }
};

export const cachedGet = async (key, fetcher, ttlMs = 60_000) => {
  const cachedValue = readCacheEntry(key);
  if (cachedValue !== null) return cachedValue;

  const response = await fetcher();
  const value = response?.data ?? response;

  writeCacheEntry(key, value, ttlMs);
  return value;
};

