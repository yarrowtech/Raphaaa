import { useEffect, useRef, useState } from 'react';
import { loadRazorpay } from '../../utils/loadRazorpay';

export default function RazorpayButton({ amount, currency = 'INR', name, email, contact, orderId, keyId, onSuccess, onError }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const active = useRef(false);
  const mounted = useRef(true);
  const instance = useRef(null);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; instance.current?.close(); };
  }, []);
  const handlePayment = async () => {
    if (active.current) return;
    active.current = true;
    setBusy(true);
    setError('');
    const finish = () => { active.current = false; if (mounted.current) setBusy(false); };
    try {
      if (!keyId || !orderId) throw new Error('Payment order is unavailable. Please return to checkout.');
      const Razorpay = await loadRazorpay();
      if (!mounted.current) return;
      const rzp = new Razorpay({
        key: keyId, order_id: orderId, amount: Math.round(amount * 100), currency,
        name: 'Raphaaa by Citimart', description: 'Fashion Purchase', image: '/logo1.png',
        prefill: { name, email, contact }, theme: { color: '#3399cc' },
        handler: (response) => { finish(); if (mounted.current) onSuccess(response); },
        modal: { ondismiss: () => { finish(); if (mounted.current) onError?.({ code: 'USER_CANCELLED', description: 'Payment popup closed', reason: 'user_cancelled' }); } },
      });
      instance.current = rzp;
      rzp.on('payment.failed', (response) => { finish(); if (mounted.current) onError?.(response.error); });
      rzp.open();
    } catch (err) {
      finish();
      if (mounted.current) { setError(err.message); onError?.({ message: err.message, description: err.message }); }
    }
  };
  return <div>
    {error && <p role="alert" className="text-red-600">{error}</p>}
    <button id="autoPayButton" type="button" disabled={busy} onClick={handlePayment}
      className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg disabled:opacity-50">
      {busy ? 'Opening payment…' : `Pay ₹${amount?.toLocaleString()} Online`}
    </button>
  </div>;
}
