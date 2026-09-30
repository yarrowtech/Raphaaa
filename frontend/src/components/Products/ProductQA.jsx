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
  );
};

export default ProductQA;
