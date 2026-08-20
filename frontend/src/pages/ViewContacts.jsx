import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Toaster } from "sonner";
import { FaTrashAlt, FaReply } from "react-icons/fa";

const ViewContacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [replyContent, setReplyContent] = useState({
    subject: "",
    message: "",
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const messagesPerPage = 5;
  const [viewMsg, setViewMsg] = useState(null);
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const token = localStorage.getItem("userToken");
        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/contact`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setContacts(res.data);
      } catch (error) {
        toast.error("Failed to load contact messages");
      } finally {
        setLoading(false);
      }
    };
    fetchContacts();
  }, []);

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem("userToken");
      await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/api/contact/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setContacts((prev) => prev.filter((msg) => msg._id !== id));
      toast.success("Message deleted");
    } catch (error) {
      toast.error("Failed to delete message");
    } finally {
      setConfirmDeleteId(null);
    }
  };

  // const filteredContacts = contacts.filter(
  //   (msg) =>
  //     msg.name.toLowerCase().includes(search.toLowerCase()) ||
  //     msg.email.toLowerCase().includes(search.toLowerCase())
  // );

  const filteredContacts = contacts
    .filter(
      (msg) =>
        msg.name.toLowerCase().includes(search.toLowerCase()) ||
        msg.email.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const aVal =
        sortField === "createdAt"
          ? new Date(a[sortField])
          : a[sortField].toLowerCase();
      const bVal =
        sortField === "createdAt"
          ? new Date(b[sortField])
          : b[sortField].toLowerCase();

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  const totalPages = Math.ceil(filteredContacts.length / messagesPerPage);
  const displayedContacts = filteredContacts.slice(
    (currentPage - 1) * messagesPerPage,
    currentPage * messagesPerPage
  );

  const openReply = (msg) => {
    setReplyTo(msg);
    setReplyContent({ subject: `Re: ${msg.subject}`, message: "" });
    setShowReplyForm(true);
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("userToken");
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/contact/reply`,
        {
          to: replyTo.email,
          subject: replyContent.subject,
          message: replyContent.message,
          audience: "reply",
          relatedContactId: replyTo._id,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Email sent to ${replyTo.email}`);
      setShowReplyForm(false);
    } catch (err) {
      toast.error("Failed to send reply email");
    }
  };

  return (
    <div className="p-4">
      <Toaster richColors position="top-right" />
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Contact Messages
      </h2>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or email..."
        className="bg-white mb-4 w-full max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
      />

      {loading ? (
        <p className="text-center text-gray-500">Loading messages...</p>
      ) : displayedContacts.length === 0 ? (
        <p className="text-center text-gray-400">No messages found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100 text-left text-sm font-semibold text-gray-700">
              <tr>
                <th
                  className="px-4 py-3 cursor-pointer select-none"
                  onClick={() => handleSort("createdAt")}
                >
                  Date{" "}
                  {sortField === "createdAt" &&
                    (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th
                  className="px-4 py-3 cursor-pointer select-none"
                  onClick={() => handleSort("name")}
                >
                  Name{" "}
                  {sortField === "name" && (sortOrder === "asc" ? "▲" : "▼")}
                </th>

                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100 text-sm">
              {displayedContacts.map((msg) => (
                <tr key={msg._id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    {new Date(msg.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-2">{msg.name}</td>
                  <td className="px-4 py-2">{msg.email}</td>
                  <td className="px-4 py-2">{msg.subject}</td>
                  <td
                    className="px-4 py-2 max-w-xs truncate"
                    title={msg.message}
                  >
                    {msg.message}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => setViewMsg(msg)}
                        className="text-gray-600 hover:text-gray-800 text-sm px-2 py-1 border border-gray-300 rounded-md"
                      >
                        View
                      </button>
                      <button
                        onClick={() => openReply(msg)}
                        className="text-sky-600 hover:text-sky-800 text-sm p-2 rounded-full hover:bg-sky-100"
                        title="Reply"
                      >
                        <FaReply />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(msg._id)}
                        className="text-red-600 hover:text-red-800 text-sm p-2 rounded-full hover:bg-red-100"
                        title="Delete"
                      >
                        <FaTrashAlt />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center mt-6 gap-2">
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                currentPage === i + 1
                  ? "bg-sky-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {viewMsg && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Message Details
            </h3>
            <p className="text-sm text-gray-700 mb-1">
              <strong>Date:</strong>{" "}
              {new Date(viewMsg.createdAt).toLocaleString("en-IN")}
            </p>
            <p className="text-sm text-gray-700 mb-1">
              <strong>Name:</strong> {viewMsg.name}
            </p>
            <p className="text-sm text-gray-700 mb-1">
              <strong>Email:</strong> {viewMsg.email}
            </p>
            <p className="text-sm text-gray-700 mb-1">
              <strong>Subject:</strong> {viewMsg.subject}
            </p>
            <p className="text-sm text-gray-800 mt-4 whitespace-pre-line border-t pt-3 max-h-60 overflow-y-auto pr-2">
              <strong>Message:</strong>
              <br />
              {viewMsg.message}
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setViewMsg(null)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/40 bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Are you sure?
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              This will permanently delete the message.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showReplyForm && (
        <div className="fixed inset-0 bg-black/40 bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Reply to {replyTo.email}
            </h3>
            <form onSubmit={handleReplySubmit} className="space-y-4">
              <input
                type="text"
                onChange={(e) =>
                  setReplyContent({ ...replyContent, subject: e.target.value })
                }
                placeholder="Subject"
                className="w-full border border-gray-300 px-3 py-2 rounded-md"
              />
              <textarea
                rows="4"
                value={replyContent.message}
                onChange={(e) =>
                  setReplyContent({ ...replyContent, message: e.target.value })
                }
                placeholder="Your message"
                className="w-full border border-gray-300 px-3 py-2 rounded-md"
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowReplyForm(false)}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 text-sm"
                >
                  Send Reply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewContacts;
