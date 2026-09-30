import React, { useEffect, useState } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { FaThumbsUp, FaChevronDown, FaChevronUp } from "react-icons/fa";

const BACKEND = import.meta.env.VITE_BACKEND_URL;

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr);
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
};

const ProductQA = ({ productId }) => {
  const { user } = useSelector((state) => state.auth);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [question, setQuestion] = useState("");
  const [guestName, setGuestName] = useState("");
  const [posting, setPosting] = useState(false);

  const [expandedId, setExpandedId] = useState(null);
  const [answerInputs, setAnswerInputs] = useState({});
  const [answerGuestName, setAnswerGuestName] = useState({});
  const [postingAnswer, setPostingAnswer] = useState({});
  const [helpfulVoted, setHelpfulVoted] = useState(() => {
    try { return JSON.parse(localStorage.getItem("qa_helpful") || "{}"); } catch { return {}; }
  });

  const fetchQA = async (p = 1) => {
    if (!productId) return;
    setLoading(true);
    try {
      const { data } = await axios.get(`${BACKEND}/api/qa/${productId}?page=${p}&limit=5`);
      setItems(p === 1 ? data.items : (prev) => [...prev, ...data.items]);
      setTotal(data.total);
      setPage(p);
    } catch (_) {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQA(1); }, [productId]);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    setPosting(true);
    try {
      const token = localStorage.getItem("userToken");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const body = { question };
      if (!user) body.guestName = guestName.trim() || "Anonymous";
      const { data } = await axios.post(`${BACKEND}/api/qa/${productId}`, body, { headers });
      setItems((prev) => [data, ...prev]);
      setTotal((t) => t + 1);
      setQuestion("");
      setGuestName("");
      toast.success("Question submitted!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to post question");
    } finally {
      setPosting(false);
    }
  };

  const handleAnswer = async (qId) => {
    const ans = answerInputs[qId]?.trim();
    if (!ans) return;
    setPostingAnswer((p) => ({ ...p, [qId]: true }));
    try {
      const token = localStorage.getItem("userToken");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const body = { answer: ans };
      if (!user) body.guestName = answerGuestName[qId]?.trim() || "Anonymous";
      const { data } = await axios.post(`${BACKEND}/api/qa/${qId}/answer`, body, { headers });
      setItems((prev) => prev.map((q) => (q._id === qId ? data : q)));
      setAnswerInputs((p) => ({ ...p, [qId]: "" }));
      toast.success("Answer posted!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to post answer");
    } finally {
      setPostingAnswer((p) => ({ ...p, [qId]: false }));
    }
  };

  const handleHelpful = async (qId) => {
    if (helpfulVoted[qId]) return;
    try {
      const { data } = await axios.patch(`${BACKEND}/api/qa/${qId}/helpful`);
      setItems((prev) => prev.map((q) => (q._id === qId ? { ...q, helpful: data.helpful } : q)));
      const updated = { ...helpfulVoted, [qId]: true };
      setHelpfulVoted(updated);
      localStorage.setItem("qa_helpful", JSON.stringify(updated));
    } catch (_) {}
  };

  return (
    <div className="border-t border-sky-500 mt-8 pt-8 pb-4 max-w-7xl mx-auto px-4 md:px-6">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left — question list */}
        <div className="lg:col-span-2 space-y-3">
          {loading && items.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Loading…</div>
          ) : items.length === 0 ? (
            <div className="text-center py-8">
              
              
            </div>
          ) : (
            <>
              {items.map((qa) => (
                <div key={qa._id} className="border border-gray-100 rounded-2xl overflow-hidden">
                  {/* Question */}
                  <div className="p-4 bg-gray-50/60">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <span className="text-sky-600 font-extrabold text-sm shrink-0 mt-0.5">Q</span>
                        <p className="text-sm font-semibold text-gray-800 leading-snug">{qa.question}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleHelpful(qa._id)}
                          disabled={helpfulVoted[qa._id]}
                          className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border transition ${
                            helpfulVoted[qa._id]
                              ? "bg-sky-50 border-sky-200 text-sky-600"
                              : "border-gray-200 text-gray-400 hover:border-sky-300 hover:text-sky-600"
                          }`}
                        >
                          <FaThumbsUp className="text-[9px]" /> {qa.helpful || 0}
                        </button>
                        <button
                          onClick={() => setExpandedId(expandedId === qa._id ? null : qa._id)}
                          className="text-xs text-sky-600 font-semibold hover:text-sky-800 flex items-center gap-1"
                        >
                          {qa.answers?.length > 0 ? (
                            <>
                              {qa.answers.length} Answer{qa.answers.length !== 1 ? "s" : ""}
                              {expandedId === qa._id ? <FaChevronUp className="text-[10px]" /> : <FaChevronDown className="text-[10px]" />}
                            </>
                          ) : "Answer"}
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1.5 ml-5">
                      {qa.user?.name || qa.guestName || "Anonymous"} · {timeAgo(qa.createdAt)}
                    </p>
                  </div>

                  {/* Answers */}
                  {expandedId === qa._id && (
                    <div className="px-4 py-3 space-y-3 border-t border-gray-100">
                      {qa.answers?.map((ans, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className={`font-extrabold text-sm shrink-0 mt-0.5 ${ans.isSellerAnswer ? "text-emerald-600" : "text-orange-500"}`}>A</span>
                          <div className="flex-1">
                            <p className="text-sm text-gray-700 leading-relaxed">{ans.answer}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {ans.isSellerAnswer && <span className="text-emerald-600 font-bold mr-1">Seller · </span>}
                              {ans.user?.name || ans.guestName || "Anonymous"} · {timeAgo(ans.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}

                      {/* Answer input */}
                      <div className="pt-2 border-t border-gray-100">
                        {!user && (
                          <input
                            type="text"
                            placeholder="Your name (optional)"
                            value={answerGuestName[qa._id] || ""}
                            onChange={(e) => setAnswerGuestName((p) => ({ ...p, [qa._id]: e.target.value }))}
                            className="w-full mb-2 px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-300 bg-gray-50"
                          />
                        )}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Write your answer…"
                            value={answerInputs[qa._id] || ""}
                            onChange={(e) => setAnswerInputs((p) => ({ ...p, [qa._id]: e.target.value }))}
                            className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-300 bg-gray-50 focus:bg-white"
                          />
                          <button
                            onClick={() => handleAnswer(qa._id)}
                            disabled={postingAnswer[qa._id] || !answerInputs[qa._id]?.trim()}
                            className="px-3 py-2 text-xs font-bold bg-sky-600 text-white rounded-xl hover:bg-sky-700 disabled:opacity-40 transition"
                          >
                            Post
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {items.length < total && (
                <button
                  onClick={() => fetchQA(page + 1)}
                  className="w-full py-2 text-xs font-semibold text-sky-600 border border-sky-200 rounded-xl hover:bg-sky-50 transition"
                >
                  Load more questions ({total - items.length} remaining)
                </button>
              )}
            </>
          )}
        </div>

        {/* Right — ask question form */}
        <div>
          
        </div>
      </div>
    </div>
  );
};

export default ProductQA;
