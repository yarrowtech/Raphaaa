const express = require("express");
const router = express.Router();
const Contact = require("../models/Contact");
const SentEmail = require("../models/SentEmail");
const { sendMail } = require("../utils/sendMail");
const { protect, adminOrMerchantise } = require("../middleware/authMiddleware");

// Post the user contact details — public, customers submit this while logged out
router.post("/", async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        if(!name || !email || !subject || !message) {
            return res.status(400).json({ error: "All fields are required" });
        }
        const newMessage = await Contact.create({ name, email, subject, message });
        res.status(201).json({ message: "Message sent successfully", data: newMessage });
    } catch (error) {
        res.status(500).json({ error: "failed to send message" });
    }
});

// Get all messages to the admin (Inbox)
router.get("/", protect, adminOrMerchantise, async (req, res) => {
    try {
        const messages = await Contact.find().sort({ createdAt: -1 });
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ error: "Failed to fecth message" });
    }
});

// Everything this admin/marketing team has sent out (Sent)
router.get("/sent", protect, adminOrMerchantise, async (req, res) => {
    try {
        const sent = await SentEmail.find()
            .populate("sentBy", "name email")
            .populate("relatedContact", "name email subject")
            .sort({ createdAt: -1 });
        res.status(200).json(sent);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch sent emails" });
    }
});

// Delete a particular sent email from the Sent log
router.delete("/sent/:id", protect, adminOrMerchantise, async (req, res) => {
    try {
        await SentEmail.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete" });
    }
});

// Delete a partcular message
router.delete("/:id", protect, adminOrMerchantise, async (req, res) => {
    try {
        await Contact.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete" });
    }
});


router.post("/reply", protect, adminOrMerchantise, async (req, res) => {
  const { to, subject, message, audience, relatedContactId } = req.body;

  if (!to || !subject || !message) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    await sendMail({ to, subject, message });
  } catch (error) {
    console.error("Email sending failed:", error);
    return res.status(500).json({ error: "Failed to send email" });
  }

  res.status(200).json({ message: "Email sent successfully" });

  // Log after responding — a logging failure must never make an already-sent email look failed.
  try {
    const recipientCount = String(to).split(",").map((e) => e.trim()).filter(Boolean).length;
    await SentEmail.create({
      to,
      subject,
      message,
      recipientCount,
      audience: audience || "",
      sentBy: req.user._id,
      relatedContact: relatedContactId || null,
    });
  } catch (logErr) {
    console.error("Failed to log sent email:", logErr.message);
  }
});

module.exports = router;
