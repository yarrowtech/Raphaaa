import React, {  useRef, useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Sparkles, ShoppingBag, Percent, Tag, Filter, Clock, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { BsChatLeftTextFill } from "react-icons/bs";
import { HiSparkles } from "react-icons/hi2";
import { GiCancel } from "react-icons/gi";

/** ─────────────── Pre-typed commands (you can add more) ─────────────── **/
const PRESET_COMMANDS = [
    { id: "new", label: "New Arrivals", prompt: "show new arrivals" },
    { id: "sale", label: "In Sale", prompt: "show discounts" },
    { id: "under", label: "Under ₹999", prompt: "price under 999" },
    { id: "hoodie", label: "Hoodies", prompt: "show category hoodie" },
    { id: "sneaker", label: "Sneakers", prompt: "show category sneaker" },
    { id: "trending", label: "Trending", prompt: "show trending" },
];

const productSlug = (p = {}) => {
    if (p.slug) return String(p.slug);
    if (p.name) {
        return String(p.name)
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-");
    }
    return String(p._id || p.id || "item");
};


/** Optional: map some synonyms -> intents */
function parseIntent(textRaw = "") {
    const text = textRaw.toLowerCase().trim();

    // Structured intents
    if (/^show new|new arrivals|latest/.test(text)) return { type: "new" };
    if (/discount|sale|offer|deal/.test(text)) return { type: "sale" };
    if (/price under (\d+)/.test(text)) return { type: "price_under", value: Number(text.match(/price under (\d+)/)[1]) };
    if (/show category ([a-z0-9-_\s]+)/.test(text)) return { type: "category", value: text.match(/show category ([a-z0-9-_\s]+)/)[1].trim() };
    if (/trending|popular|hot/.test(text)) return { type: "trending" };
    if (/show all|all products|browse/.test(text)) return { type: "all" };

    // default: treat as search query
    return { type: "search", value: text };
}

/** Simple product card inside the chatbot */
function ProductCard({ p, onView }) {
    const slug = productSlug(p);
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm hover:shadow-md transition">
            <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
                {p?.images ? (
                    <img src={p.images[0].url} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                    <div className="h-full w-full grid place-items-center text-gray-400">No Image</div>
                )}
            </div>
            <div className="mt-2">
                <p className="text-sm font-semibold line-clamp-1">{p?.name || "Untitled"}</p>
                <div className="flex items-center justify-between mt-1">
                    <span className="text-[13px] text-gray-600 line-clamp-1">{p?.category || "—"}</span>
                    <span className="text-[13px] font-bold">₹{p?.price ?? "—"}</span>
                </div>
            </div>

            {/* Link to /products/product-name, also call onView for your analytics if needed */}
            {/* <a
        href={`/product/${slug}`}
        onClick={() => onView?.(p)}
        className="mt-2 block w-full text-center rounded-lg bg-gradient-to-r from-sky-600 to-blue-600 text-white text-sm py-2 hover:opacity-90"
      >
        View
      </a> */}
            {/* SPA navigation without refresh */}
            <Link
                to={`/product/${slug}`}
                onClick={() => onView?.(p)}
                className="mt-2 block w-full text-center rounded-lg bg-gradient-to-r from-sky-600 to-blue-600 text-white text-sm py-2 hover:opacity-90"
            >
                View
            </Link>

        </div>
    );
}


/** Chat message bubble */
function Bubble({ from = "bot", children }) {
    const isBot = from === "bot";
    return (
        <div className={`flex ${isBot ? "justify-start" : "justify-end"} w-full`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow ${isBot ? "bg-gray-100" : "bg-gradient-to-r from-sky-600 to-blue-600 text-white"}`}>
                {children}
            </div>
        </div>
    );
}

/** ─────────────── Chatbot ─────────────── **/
export default function Chatbot({ onNavigateProduct }) {
    const [open, setOpen] = useState(false);
    const [sending, setSending] = useState(false);
    const [text, setText] = useState("");
    const [messages, setMessages] = useState([
        { id: 1, from: "bot", text: "Hi! I’m Raphaaa Assistant. Try a quick command below or type what you need." }
    ]);
    const [results, setResults] = useState([]);     // product results
    const [lastQuery, setLastQuery] = useState(""); // last executed query (for showing context)
    const inputRef = useRef(null);

    // Focus input when opened
    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 150);
    }, [open]);

    // Minimal API helper — adjust to your backend
    async function fetchProducts(filters) {
        // You can adapt this to your exact API:
        // Examples:
        // GET /api/products?query=term
        // GET /api/products?category=hoodie
        // GET /api/products?maxPrice=999
        // GET /api/products?sort=createdAt:desc&limit=8
        const base = import.meta.env.VITE_BACKEND_URL || "";
        const url = new URL(`${base}/api/products`);
        Object.entries(filters || {}).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
        });
        const { data } = await axios.get(url.toString());
        // Expecting either {products: [...]} or [...]
        return Array.isArray(data) ? data : (data?.products || []);
    }

    async function runIntent(inputText) {
        const intent = parseIntent(inputText);
        setSending(true);
        setLastQuery(inputText);

        try {
            let products = [];

            if (intent.type === "new") {
                products = await fetchProducts({ sort: "createdAt:desc", limit: 8 });
            } else if (intent.type === "sale") {
                products = await fetchProducts({ onSale: "true", limit: 12 });
            } else if (intent.type === "price_under") {
                products = await fetchProducts({ maxPrice: intent.value, limit: 12 });
            } else if (intent.type === "category") {
                products = await fetchProducts({ category: intent.value, limit: 12 });
            } else if (intent.type === "trending") {
                products = await fetchProducts({ sort: "popularity:desc", limit: 8 });
            } else if (intent.type === "all") {
                products = await fetchProducts({ limit: 12 });
            } else {
                // search fallback
                products = await fetchProducts({ query: intent.value, limit: 12 });
            }

            setResults(products);
            setMessages((m) => [
                ...m,
                { id: Date.now(), from: "user", text: inputText },
                { id: Date.now() + 1, from: "bot", text: products.length ? `Found ${products.length} result(s).` : "No products found." }
            ]);
        } catch (e) {
            setMessages((m) => [
                ...m,
                { id: Date.now(), from: "user", text: inputText },
                { id: Date.now() + 1, from: "bot", text: "Sorry, I couldn't fetch products. Please try again." }
            ]);
        } finally {
            setSending(false);
        }
    }

    const handleSend = async (e) => {
        e?.preventDefault?.();
        if (!text.trim()) return;
        const t = text.trim();
        setText("");
        await runIntent(t);
    };

    const handlePreset = async (cmd) => {
        await runIntent(cmd.prompt);
    };

    const handleView = (product) => {
        // Navigate to your product page OR open modal
        // Preferably use your existing router:
        onNavigateProduct?.(product);
        // Or just message the user:
        setMessages((m) => [
            ...m,
            { id: Date.now(), from: "bot", text: `Opening product: ${product?.name}` }
        ]);
    };

    return (
        <>
            {/* FAB button */}
            <button
                onClick={() => setOpen((s) => !s)}
                className="fixed bottom-20 right-5 z-40 rounded-full p-4 shadow-xl bg-gradient-to-r from-sky-600 to-blue-600 text-white hover:opacity-90"
                aria-label="Open Raphaaa Chatbot"
            >
                {/* <MessageSquare /> */}
              {open ? <X size={16} /> : <BsChatLeftTextFill />}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 16 }}
                        className="fixed bottom-2 right-18 z-40 w-[90vw] max-w-[350px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-sky-600 to-blue-600 text-white">
                            <div className="flex items-center gap-2">
                                {/* <Sparkles className="w-4 h-4" /> */}
                                <HiSparkles className="w-4 h-4" />
                                <p className="font-semibold">Raphaaa Assistant</p>
                            </div>
                            <button onClick={() => setOpen(false)} className="hover:opacity-80">
                                <X />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="max-h-[62vh] overflow-y-auto px-3 py-3 space-y-3">
                            {/* Suggestion chips */}
                            <div className="flex flex-wrap gap-2">
                                {PRESET_COMMANDS.map((c) => (
                                    <button
                                        key={c.id}
                                        onClick={() => handlePreset(c)}
                                        className="flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12px] hover:bg-gray-50"
                                    >
                                        {c.id === "new" && <Clock className="w-3.5 h-3.5" />}
                                        {c.id === "sale" && <Percent className="w-3.5 h-3.5" />}
                                        {c.id === "under" && <Tag className="w-3.5 h-3.5" />}
                                        {["hoodie", "sneaker"].includes(c.id) && <Filter className="w-3.5 h-3.5" />}
                                        {c.id === "trending" && <ShoppingBag className="w-3.5 h-3.5" />}
                                        <span>{c.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Chat messages */}
                            <div className="space-y-2">
                                {messages.map((m) => (
                                    <Bubble key={m.id} from={m.from}>{m.text}</Bubble>
                                ))}
                            </div>

                            {/* Results header */}
                            {lastQuery && (
                                <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                                    <Search className="w-3.5 h-3.5" /> Showing results for: <span className="font-medium">“{lastQuery}”</span>
                                </div>
                            )}

                            {/* Product grid */}
                            {!!results.length && (
                                <div className="grid grid-cols-2 gap-3 mt-2">
                                    {results.map((p) => (
                                        <ProductCard key={p._id || p.id} p={p} onView={handleView} />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSend} className="flex items-center gap-2 p-3 border-t bg-white">
                            <input
                                ref={inputRef}
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Ask for products, categories, price under X..."
                                className="flex-1 rounded-xl border px-3 py-2 outline-none"
                            />
                            <button
                                type="submit"
                                disabled={sending}
                                className="rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 text-white px-3 py-2 hover:opacity-90 disabled:opacity-60"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
