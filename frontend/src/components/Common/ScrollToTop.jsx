import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Instant jump — smooth is wrong here because the new page hasn't
    // rendered yet, causing a visible slow-scroll on the old content.
    window.scrollTo(0, 0);

    // Also reset any overflow-y containers (e.g. CollectionPage, Admin)
    document
      .querySelectorAll("[data-scroll-container]")
      .forEach((el) => (el.scrollTop = 0));
  }, [pathname]);

  return null;
};

export default ScrollToTop;
