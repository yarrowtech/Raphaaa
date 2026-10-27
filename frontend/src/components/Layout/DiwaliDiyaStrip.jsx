import React from "react";
import diyaRowSvg from "../../assets/diwali-footer-diyas.svg?raw";

/**
 * DiwaliDiyaStrip — the row of lit diyas from
 * Reference/Landing Page 2 Diwali/Main.dc.html, placed at the very end of
 * the page (after the footer) as a closing festive note, flames flickering
 * via the shared .rp-flame keyframe.
 */
const DiwaliDiyaStrip = () => (
  <div
    aria-hidden="true"
    className="diwali-diya-strip relative w-full"
    style={{ height: "80px", background: "#fff7ea", overflow: "hidden" }}
    dangerouslySetInnerHTML={{ __html: diyaRowSvg }}
  />
);

export default DiwaliDiyaStrip;
