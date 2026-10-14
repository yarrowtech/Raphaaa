import { useEffect, useState } from 'react';
import axios from 'axios';
export default function useContent(path) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(false); setData(null);
    axios.get(`${import.meta.env.VITE_BACKEND_URL}${path}`, { signal: controller.signal })
      .then((response) => { if (!controller.signal.aborted) setData(response.data); })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [path, attempt]);
  return { data, loading, error, retry: () => setAttempt((value) => value + 1) };
}
