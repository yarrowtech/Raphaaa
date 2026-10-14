let sdkPromise;
export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const finish = (error) => {
      clearTimeout(timer);
      script.onload = script.onerror = null;
      if (error) { script.remove(); sdkPromise = null; reject(error); }
      else resolve(window.Razorpay);
    };
    const timer = setTimeout(() => finish(new Error('Payment service timed out. Please retry.')), 15000);
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => finish(window.Razorpay ? null : new Error('Payment service unavailable. Please retry.'));
    script.onerror = () => finish(new Error('Unable to load payment service. Check your connection and retry.'));
    document.body.appendChild(script);
  });
  return sdkPromise;
}
