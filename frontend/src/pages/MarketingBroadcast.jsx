// src/pages/MarketingBroadcast.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { fetchAllOrders, clearError } from "../redux/slices/adminOrderSlice";
import { toast } from "sonner";
import {
  FaUsers,
  FaShoppingBag,
  FaEnvelopeOpenText,
  FaInbox,
  FaPaperPlane,
  FaSearch,
  FaReply,
  FaTimes,
  FaPen,
  FaTrashAlt,
} from "react-icons/fa";
import { MdOutlineContentPaste } from "react-icons/md";

import JoditEditor from "jodit-react";

const BACKEND = import.meta.env.VITE_BACKEND_URL;
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("userToken")}` });

const Chip = ({ children, className = "" }) => (
  <span className={`inline-flex items-center text-xs font-semibold px-2 py-1 rounded-full border ${className}`}>
    {children}
  </span>
);

const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const stripHtml = (html) => String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const MarketingBroadcast = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { orders, loading: ordersLoading, error: ordersError } = useSelector((s) => s.adminOrders);

  // ── Mail client state ────────────────────────────────────────────
  const [folder, setFolder] = useState("inbox"); // 'inbox' | 'sent'
  const [inbox, setInbox] = useState([]);
  const [sent, setSent] = useState([]);
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [loadingSent, setLoadingSent] = useState(true);
  const [selected, setSelected] = useState(null);
  const [listSearch, setListSearch] = useState("");

  // ── Compose state ────────────────────────────────────────────────
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyTo, setReplyTo] = useState(null); // the inbox message being replied to, or null for a fresh broadcast
  const [audience, setAudience] = useState("buyers"); // 'buyers' | 'subscribers' | 'custom'
  const [subscribers, setSubscribers] = useState([]);
  const [customList, setCustomList] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const editorRef = useRef(null);
  const joditConfig = useMemo(
    () => ({
      readonly: false,
      minHeight: 220,
      toolbarAdaptive: false,
      toolbarSticky: false,
      spellcheck: true,
      statusbar: false,
      removeButtons: ["file", "print"],
    }),
    []
  );

  const canAccess = user?.role === "marketing" || user?.role === "admin" || user?.role === "merchantise";

  // ── Load Inbox (contact messages) & Sent history ────────────────
  const loadInbox = async () => {
    setLoadingInbox(true);
    try {
      const { data } = await axios.get(`${BACKEND}/api/contact`, { headers: authHeader() });
      setInbox(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load inbox messages");
    } finally {
      setLoadingInbox(false);
    }
  };

  const loadSent = async () => {
    setLoadingSent(true);
    try {
      const { data } = await axios.get(`${BACKEND}/api/contact/sent`, { headers: authHeader() });
      setSent(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load sent emails");
    } finally {
      setLoadingSent(false);
    }
  };

  useEffect(() => {
    if (!canAccess) return;
    loadInbox();
    loadSent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load buyers/subscribers for the audience picker
  useEffect(() => {
    if (audience === "buyers") {
      dispatch(fetchAllOrders());
    } else if (audience === "subscribers") {
      const loadSubs = async () => {
        try {
          const token = localStorage.getItem("userToken");
          const { data } = await axios.get(`${BACKEND}/api/subscribers`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setSubscribers(data || []);
        } catch {
          toast.error("Failed to fetch subscribers");
        }
      };
      loadSubs();
    }
  }, [audience, dispatch]);

  const buyerEmails = useMemo(() => {
    if (!orders || !orders.length) return [];
    const set = new Set();
    for (const o of orders) {
      const email = o?.user?.email;
      if (email) set.add(email.toLowerCase());
    }
    return [...set];
  }, [orders]);

  const subscriberEmails = useMemo(() => {
    if (!subscribers || !subscribers.length) return [];
    return subscribers.filter((s) => s.isSubscribed && s.email).map((s) => s.email.toLowerCase());
  }, [subscribers]);

  const customEmails = useMemo(() => {
    if (!customList.trim()) return [];
    return customList.split(/[\s,;]+/g).map((e) => e.trim().toLowerCase()).filter(Boolean);
  }, [customList]);

  const selectedEmails = useMemo(() => {
    if (replyTo) return [replyTo.email];
    if (audience === "buyers") return buyerEmails;
    if (audience === "subscribers") return subscriberEmails;
    return customEmails;
  }, [replyTo, audience, buyerEmails, subscriberEmails, customEmails]);

  // ── Folder list (filtered by search) ────────────────────────────
  const filteredInbox = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return inbox;
    return inbox.filter(
      (m) => m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q) || m.subject?.toLowerCase().includes(q)
    );
  }, [inbox, listSearch]);

  const filteredSent = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return sent;
    return sent.filter((m) => m.to?.toLowerCase().includes(q) || m.subject?.toLowerCase().includes(q));
  }, [sent, listSearch]);

  const activeList = folder === "inbox" ? filteredInbox : filteredSent;

  // ── Compose helpers ──────────────────────────────────────────────
  const openCompose = (replyMsg = null) => {
    setReplyTo(replyMsg);
    setSubject(replyMsg ? `Re: ${replyMsg.subject}` : "");
    setMessage("");
    setAudience("buyers");
    setCustomList("");
    setComposeOpen(true);
  };

  const closeCompose = () => {
    setComposeOpen(false);
    setReplyTo(null);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error("Subject and message are required");
      return;
    }
    if (selectedEmails.length === 0) {
      toast.error("No recipients found for the selected audience");
      return;
    }

    setSending(true);
    try {
      await axios.post(
        `${BACKEND}/api/contact/reply`,
        {
          to: selectedEmails.join(","),
          subject,
          message,
          audience: replyTo ? "reply" : audience,
          relatedContactId: replyTo?._id,
        },
        { headers: authHeader() }
      );
      toast.success(`Email sent to ${selectedEmails.length} recipient(s)`);
      closeCompose();
      loadSent();
      setFolder("sent");
    } catch {
      toast.error("Failed to send emails");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (m, evt) => {
    evt?.stopPropagation();
    if (!window.confirm("Delete this message?")) return;

    const targetFolder = folder;
    try {
      const endpoint =
        targetFolder === "inbox" ? `${BACKEND}/api/contact/${m._id}` : `${BACKEND}/api/contact/sent/${m._id}`;
      await axios.delete(endpoint, { headers: authHeader() });

      if (targetFolder === "inbox") {
        setInbox((prev) => prev.filter((x) => x._id !== m._id));
      } else {
        setSent((prev) => prev.filter((x) => x._id !== m._id));
      }
      setSelected((prev) => (prev?._id === m._id ? null : prev));
      toast.success("Message deleted");
    } catch {
      toast.error("Failed to delete message");
    }
  };

  if (!canAccess) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h2 className="text-xl font-semibold text-red-600">You do not have permission to access this page.</h2>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-extrabold text-gray-800">Mail</h1>
        <Chip className="border-sky-300 text-sky-700 bg-sky-50">Role: {user?.role}</Chip>
      </div>

      {ordersError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start justify-between gap-3">
          <div>
            <strong className="mr-2">Couldn't load orders.</strong>
            <span>{typeof ordersError === "string" ? ordersError : ordersError?.message || "Forbidden or not authorized"}</span>
          </div>
          <button
            onClick={() => {
              dispatch(clearError());
              dispatch(fetchAllOrders());
            }}
            className="shrink-0 px-3 py-1 rounded-md border border-red-300 hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      <div className="flex gap-4 h-[calc(100vh-180px)] min-h-[520px]">
        {/* ── Left: folders ── */}
        <div className="w-52 shrink-0 flex flex-col gap-1">
          <button
            onClick={() => openCompose(null)}
            className="mb-3 flex items-center gap-2 justify-center bg-gradient-to-r from-sky-600 to-blue-600 hover:opacity-90 text-white font-semibold px-4 py-3 rounded-2xl shadow-md"
          >
            <FaPen /> Compose
          </button>

          <button
            onClick={() => {
              setFolder("inbox");
              setSelected(null);
            }}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
              folder === "inbox" ? "bg-sky-100 text-sky-700" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <span className="flex items-center gap-2">
              <FaInbox /> Inbox
            </span>
            <span className="text-xs text-gray-400">{inbox.length}</span>
          </button>

          <button
            onClick={() => {
              setFolder("sent");
              setSelected(null);
            }}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
              folder === "sent" ? "bg-sky-100 text-sky-700" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <span className="flex items-center gap-2">
              <FaPaperPlane /> Sent
            </span>
            <span className="text-xs text-gray-400">{sent.length}</span>
          </button>
        </div>

        {/* ── Middle: message list ── */}
        <div className="w-80 shrink-0 border border-gray-200 rounded-2xl bg-white flex flex-col overflow-hidden">
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
              <input
                type="text"
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                placeholder={`Search ${folder}…`}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {(folder === "inbox" ? loadingInbox : loadingSent) ? (
              <p className="text-xs text-gray-400 p-4">Loading…</p>
            ) : activeList.length === 0 ? (
              <p className="text-xs text-gray-400 p-4">No messages here.</p>
            ) : folder === "inbox" ? (
              filteredInbox.map((m) => (
                <div
                  key={m._id}
                  onClick={() => setSelected(m)}
                  className={`group relative w-full text-left px-3 py-3 border-b border-gray-50 hover:bg-sky-50 transition cursor-pointer ${
                    selected?._id === m._id ? "bg-sky-50" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-800 truncate pr-5">{m.name}</p>
                    <span className="text-[10px] text-gray-400 shrink-0 group-hover:hidden">{formatDate(m.createdAt)}</span>
                  </div>
                  <p className="text-xs text-gray-600 truncate">{m.subject}</p>
                  <p className="text-[11px] text-gray-400 truncate pr-5">{stripHtml(m.message)}</p>
                  <button
                    onClick={(e) => handleDelete(m, e)}
                    title="Delete"
                    className="hidden group-hover:flex absolute top-3 right-3 items-center justify-center w-6 h-6 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <FaTrashAlt className="text-xs" />
                  </button>
                </div>
              ))
            ) : (
              filteredSent.map((m) => (
                <div
                  key={m._id}
                  onClick={() => setSelected(m)}
                  className={`group relative w-full text-left px-3 py-3 border-b border-gray-50 hover:bg-sky-50 transition cursor-pointer ${
                    selected?._id === m._id ? "bg-sky-50" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-800 truncate pr-5">
                      {m.recipientCount > 1 ? `${m.recipientCount} recipients` : m.to}
                    </p>
                    <span className="text-[10px] text-gray-400 shrink-0 group-hover:hidden">{formatDate(m.createdAt)}</span>
                  </div>
                  <p className="text-xs text-gray-600 truncate">{m.subject}</p>
                  <p className="text-[11px] text-gray-400 truncate pr-5">{stripHtml(m.message)}</p>
                  <button
                    onClick={(e) => handleDelete(m, e)}
                    title="Delete"
                    className="hidden group-hover:flex absolute top-3 right-3 items-center justify-center w-6 h-6 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <FaTrashAlt className="text-xs" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Right: reading pane ── */}
        <div className="flex-1 border border-gray-200 rounded-2xl bg-white overflow-y-auto">
          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-2">
              <FaEnvelopeOpenText className="text-4xl" />
              <p className="text-sm">Select a message to read</p>
            </div>
          ) : folder === "inbox" ? (
            <div className="p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">{selected.subject}</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    From <strong>{selected.name}</strong> &lt;{selected.email}&gt;
                  </p>
                  <p className="text-[11px] text-gray-400">{formatDate(selected.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openCompose(selected)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition"
                  >
                    <FaReply /> Reply
                  </button>
                  <button
                    onClick={(e) => handleDelete(selected, e)}
                    title="Delete"
                    className="flex items-center justify-center w-9 h-9 text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition"
                  >
                    <FaTrashAlt className="text-xs" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-line border-t border-gray-100 pt-4">{selected.message}</p>
            </div>
          ) : (
            <div className="p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">{selected.subject}</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    To: {selected.to}
                    {selected.recipientCount > 1 ? ` (${selected.recipientCount} recipients)` : ""}
                  </p>
                  {selected.audience && (
                    <p className="text-[11px] text-gray-400 capitalize">Audience: {selected.audience}</p>
                  )}
                  <p className="text-[11px] text-gray-400">{formatDate(selected.createdAt)}</p>
                </div>
                <button
                  onClick={(e) => handleDelete(selected, e)}
                  title="Delete"
                  className="flex items-center justify-center w-9 h-9 text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition shrink-0"
                >
                  <FaTrashAlt className="text-xs" />
                </button>
              </div>
              <div
                className="prose max-w-none text-sm text-gray-800 border-t border-gray-100 pt-4"
                dangerouslySetInnerHTML={{ __html: selected.message }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Compose panel ── */}
      {composeOpen && (
        <div className="fixed bottom-4 right-4 w-[min(680px,calc(100vw-2rem))] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-800 text-white rounded-t-2xl">
            <p className="text-sm font-semibold">{replyTo ? `Reply to ${replyTo.email}` : "New Message"}</p>
            <button onClick={closeCompose} className="text-gray-300 hover:text-white">
              <FaTimes />
            </button>
          </div>

          <form onSubmit={handleSend} className="flex-1 overflow-y-auto p-4 space-y-4">
            {replyTo ? (
              <Chip className="border-sky-300 text-sky-700 bg-sky-50">To: {replyTo.email}</Chip>
            ) : (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Audience</p>
                <div className="grid grid-cols-3 gap-2">
                  <label
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-medium cursor-pointer ${
                      audience === "buyers" ? "border-indigo-500 bg-indigo-50" : "bg-white border-gray-200"
                    }`}
                  >
                    <FaShoppingBag /> Buyers
                    <input type="radio" name="audience" className="hidden" checked={audience === "buyers"} onChange={() => setAudience("buyers")} />
                  </label>
                  <label
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-medium cursor-pointer ${
                      audience === "subscribers" ? "border-emerald-500 bg-emerald-50" : "bg-white border-gray-200"
                    }`}
                  >
                    <FaUsers /> Subscribers
                    <input type="radio" name="audience" className="hidden" checked={audience === "subscribers"} onChange={() => setAudience("subscribers")} />
                  </label>
                  <label
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-medium cursor-pointer ${
                      audience === "custom" ? "border-indigo-500 bg-indigo-50" : "bg-white border-gray-200"
                    }`}
                  >
                    <MdOutlineContentPaste /> Custom
                    <input type="radio" name="audience" className="hidden" checked={audience === "custom"} onChange={() => setAudience("custom")} />
                  </label>
                </div>

                {audience === "custom" && (
                  <textarea
                    value={customList}
                    onChange={(e) => setCustomList(e.target.value)}
                    placeholder="Paste emails separated by commas, spaces, or new lines"
                    className="bg-white outline-none mt-2 w-full min-h-20 p-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-400"
                  />
                )}

                <p className="text-[11px] text-gray-400 mt-1.5">
                  {audience === "buyers" && ordersLoading
                    ? "Loading buyers…"
                    : `${selectedEmails.length} recipient(s) selected`}
                </p>
              </div>
            )}

            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="w-full border-b border-gray-200 py-2 text-sm font-medium focus:outline-none focus:border-sky-500"
            />

            <JoditEditor
              ref={editorRef}
              value={message}
              config={joditConfig}
              onBlur={(newContent) => setMessage(newContent)}
              onChange={(newContent) => setMessage(newContent)}
            />
          </form>

          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              <FaEnvelopeOpenText className="inline mr-1 mb-0.5" />
              {selectedEmails.length} recipient(s)
            </span>
            <button
              onClick={handleSend}
              disabled={sending || !selectedEmails.length}
              className="bg-gradient-to-r from-sky-600 to-blue-600 hover:opacity-90 text-white font-semibold px-5 py-2 rounded-lg shadow-md disabled:opacity-60"
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketingBroadcast;
