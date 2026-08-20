const { createClient } = require("redis");

const redisUrl = process.env.REDIS_URL || "";
const cacheEnabled = process.env.REDIS_CACHE_ENABLED !== "false";

let client = null;
let ready = false;
let connectPromise = null;

const getClient = async () => {
  if (!cacheEnabled || !redisUrl) return null;
  if (client && ready) return client;

  if (!client) {
    client = createClient({ url: redisUrl });
    client.on("error", (err) => {
      ready = false;
      console.error("Redis error:", err.message);
    });
    client.on("ready", () => {
      ready = true;
    });
    client.on("end", () => {
      ready = false;
    });
  }

  if (!connectPromise && !client.isOpen) {
    connectPromise = client.connect().catch((err) => {
      ready = false;
      console.error("Redis connect failed:", err.message);
    }).finally(() => {
      connectPromise = null;
    });
  }

  if (connectPromise) await connectPromise;
  return ready ? client : null;
};

const buildKey = (scope, key) => `raphaaa:${scope}:${key}`;

const getJson = async (scope, key) => {
  try {
    const c = await getClient();
    if (!c) return null;
    const raw = await c.get(buildKey(scope, key));
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error("Redis getJson failed:", err.message);
    return null;
  }
};

const setJson = async (scope, key, value, ttlSeconds = 60) => {
  try {
    const c = await getClient();
    if (!c) return false;
    await c.set(buildKey(scope, key), JSON.stringify(value), { EX: ttlSeconds });
    return true;
  } catch (err) {
    console.error("Redis setJson failed:", err.message);
    return false;
  }
};

const deleteJson = async (scope, key) => {
  try {
    const c = await getClient();
    if (!c) return false;
    await c.del(buildKey(scope, key));
    return true;
  } catch (err) {
    console.error("Redis deleteJson failed:", err.message);
    return false;
  }
};

// Wipes every cached key under a scope — needed where keys are built from a variable
// request (e.g. the product list's cache key includes the full query string), so a
// single mutation (create/update/delete) can't be invalidated by one exact key.
const deleteByPrefix = async (scope) => {
  try {
    const c = await getClient();
    if (!c) return false;
    const prefix = buildKey(scope, "");
    for await (const key of c.scanIterator({ MATCH: `${prefix}*`, COUNT: 100 })) {
      await c.del(key);
    }
    return true;
  } catch (err) {
    console.error("Redis deleteByPrefix failed:", err.message);
    return false;
  }
};

module.exports = {
  getJson,
  setJson,
  deleteJson,
  deleteByPrefix,
};
