import React, { useEffect, useState } from "react";
import greetingImg from "../../assets/diwali-greeting.png";

const STORAGE_KEY = "diwaliGreetingSeen";

/**
 * DiwaliGreeting — a one-time "Happy Diwali" welcome overlay shown the
 * first time a visitor opens the site, with a small close (×) button.
 * Dismissal is remembered in localStorage so it doesn't show again.
 */
const DiwaliGreeting = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Happy Diwali greeting"
      onClick={close}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(20,10,5,.72)",
        padding: "24px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          maxWidth: "360px",
          width: "100%",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 24px 60px -12px rgba(0,0,0,.55)",
        }}
      >
        <img
          src={greetingImg}
          alt="Happy Diwali — a lit diya surrounded by marigold flowers"
          style={{ display: "block", width: "100%", height: "auto" }}
        />
        <button
          type="button"
          aria-label="Close greeting"
          onClick={close}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            width: "28px",
            height: "28px",
            borderRadius: "9999px",
            border: "none",
            background: "rgba(0,0,0,.45)",
            color: "#fff",
            fontSize: "16px",
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default DiwaliGreeting;
