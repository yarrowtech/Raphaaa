import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

export default function FitFinder({ open, onClose }) {
  const dialog = useRef(null);
  const [sizes, setSizes] = useState([]);
  const [size, setSize] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open) return;
    const modal = dialog.current;
    modal.showModal();
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/products/facets`, { signal: controller.signal })
      .then(({ data }) => setSizes(data.sizes || []))
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); modal.close(); };
  }, [open]);

  return <dialog ref={dialog} className="fit-finder" onCancel={onClose} onClick={e => { if (e.target === dialog.current) onClose(); }}>
    <div className="fit-finder-content">
      <button className="fit-finder-close" onClick={onClose} aria-label="Close fit finder">×</button>
      <span className="eyebrow">YOUR FIT, YOUR STYLE</span>
      <h2>Find your next perfect fit</h2>
      <p>Choose your usual garment size to explore matching styles. Each product’s size guide has its exact measurements.</p>
      {loading ? <p role="status">Loading available sizes…</p> : error ? <p role="alert">Sizes could not be loaded. Please try again.</p> : sizes.length ? <div className="fit-sizes" role="group" aria-label="Your garment size">
        {sizes.map(({ _id, count }) => <button key={_id} aria-pressed={size === _id} onClick={() => setSize(_id)}>{_id}<small>{count} styles</small></button>)}
      </div> : <p>No sizes are available yet.</p>}
      <Link className="fit-shop" onClick={onClose} to={size ? `/collections/all?size=${encodeURIComponent(size)}` : "/collections/all"}>{size ? `Shop size ${size}` : "Explore all styles"} →</Link>
    </div>
  </dialog>;
}
