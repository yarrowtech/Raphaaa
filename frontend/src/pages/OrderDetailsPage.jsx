// src/pages/OrderDetailsPage.jsx
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import { cancelOrder, createReturnRequest, fetchOrderDetails } from "../redux/slices/orderSlice";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { getGstRate, getOrderGstSummary } from "../utils/gst";

const OrderDetailsPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { orderDetails, loading, error } = useSelector((state) => state.orders);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [showAllUpdates, setShowAllUpdates] = useState(false);
  const [returnForm, setReturnForm] = useState({
    requestType: "return",
    reason: "",
    damageType: "",
    damageDescription: "",
    evidenceFiles: [],
  });

  useEffect(() => {
    dispatch(fetchOrderDetails(id));
  }, [dispatch, id]);

  // compute totals from orderItems (safe numeric conversion)
  const computedQuantity = (orderDetails?.orderItems || []).reduce(
    (acc, it) => acc + (Number(it?.quantity) || 0),
    0
  );

  const computedSubtotal = (orderDetails?.orderItems || []).reduce(
    (sum, it) => sum + (Number(it?.price) || 0) * (Number(it?.quantity) || 0),
    0
  );


  // ✅ Converts numeric total to words
  const convertNumberToWords = (amount) => {
    const a = [
      "",
      "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
      "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
    ];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    if ((amount = amount.toString()).length > 9) return "Overflow";
    let n = ("000000000" + amount).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{3})$/);
    if (!n) return;
    let str = "";
    str += n[1] != 0 ? (a[Number(n[1])] || b[n[1][0]] + " " + a[n[1][1]]) + " Crore " : "";
    str += n[2] != 0 ? (a[Number(n[2])] || b[n[2][0]] + " " + a[n[2][1]]) + " Lakh " : "";
    str += n[3] != 0 ? (a[Number(n[3])] || b[n[3][0]] + " " + a[n[3][1]]) + " Thousand " : "";
    str += n[4] != 0 ? (a[Number(n[4])] || b[n[4][0]] + " " + a[n[4][1]]) + " " : "";
    return str.trim();
  };

  // ✅ Generate modern styled invoice (no logic changed)
  const generatePDF = async () => {
    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // ✅ Fetch company details dynamically
    let companyInfo = {};
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/settings/contact`);
      companyInfo = await res.json();
    } catch (err) {
      console.error("Failed to fetch company info:", err);
    }

    // ✅ Add faint watermark
    doc.setTextColor(220, 220, 220);
    doc.setFontSize(50);
    doc.text("RAPHAAA", pageWidth / 2, pageHeight / 2, {
      align: "center",
      angle: 45,
    });
    doc.setTextColor(0, 0, 0);

    // ✅ Background color strip for header
    doc.setFillColor(230, 242, 255);
    doc.rect(0, 0, pageWidth, 20, "F");

    // ✅ Logo (top-left)
    try {
      const logo = "/logo1.png"; // Ensure this image exists in your public folder
      doc.addImage(logo, "PNG", 14, 5, 20, 10);
    } catch (err) {
      console.error("Logo not found:", err);
    }

    // Header text
    doc.setFontSize(14);
    doc.setTextColor(30, 64, 175);
    doc.text("RAPHAAA - Tax Invoice", 40, 12);

    // ✅ Invoice meta header details (with better top spacing)
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text("Invoice Type: TAX INVOICE / RETAIL INVOICE", 14, 25); // shifted slightly down
    doc.text(`Invoice No: RPH-${new Date().getFullYear()}-${orderDetails?._id?.slice(-6)}`, 14, 30);
    doc.text(`Website: www.raphaaa.com`, 14, 35);

    // Seller info
    doc.setFontSize(10);
    doc.text("RAPHAAA Fashion Pvt. Ltd.", 14, 42);
    doc.text("Kolkata, West Bengal, 700001", 14, 47);
    doc.text(`GSTIN: ${companyInfo?.gstn || "19AAACR1234A1ZB"}`, 14, 52);
    doc.text(`Email: ${companyInfo?.gmail || "support@raphaaa.com"}`, 14, 57);
    doc.text(`Phone: ${companyInfo?.phone || "+91 98765 43210"}`, 14, 62);

    // Buyer info
    doc.setFont("helvetica", "bold");
    doc.text("Buyer (Bill To):", 120, 42);
    doc.setFont("helvetica", "normal");
    doc.text(`${orderDetails?.user?.name || "Customer"}`, 120, 47);
    doc.text(`${orderDetails?.user?.email || ""}`, 120, 52);
    doc.text(`Phone: ${orderDetails?.shippingAddress?.phone || "N/A"}`, 120, 57);
    const buyerAddress = `${orderDetails?.shippingAddress?.address || ""}, ${orderDetails?.shippingAddress?.city || ""}, ${orderDetails?.shippingAddress?.country || ""} - ${orderDetails?.shippingAddress?.postalCode || ""}`;
    doc.text(buyerAddress, 120, 62, { maxWidth: 80 });

    // ✅ Product Table
    autoTable(doc, {
      startY: 72,
      head: [["#", "Description", "Variant", "SKU / HSN", "Qty", "Rate", "Per", "GST %", "Amount"]],
      body: (orderDetails?.orderItems || []).map((item, i) => [
        i + 1,
        item?.name || "-",
        `${item?.variant ? item.variant : `${item?.size || "-"} / ${item?.color || "-"}`}`,
        item?.product?.sku || item?.sku || "-",
        item?.quantity ?? 0,
        item?.price?.toFixed(2) ?? "0.00",
        "pcs",
        `${(getGstRate(item?.price ?? 0) * 100).toFixed(0)}%`,
        `INR. ${((item?.quantity ?? 0) * (item?.price ?? 0)).toFixed(2)}`,
      ]),
      theme: "grid",
      headStyles: {
        fillColor: [63, 149, 255],
        textColor: 255,
        halign: "center",
      },
      styles: {
        fontSize: 9,
        cellPadding: 2,
        halign: "center",
      },
      alternateRowStyles: {
        fillColor: [245, 247, 255],
      },
    });

    // Totals — prices are GST-inclusive, so GST is back-calculated per item
    // using India's apparel slab (5% up to ₹1000/unit, 12% above), not added on top.
    const { taxableValue, gstAmount, grossAmount: total } = getOrderGstSummary(
      orderDetails?.orderItems || []
    );

    const y = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.text(`Taxable Value: INR. ${taxableValue.toFixed(2)}`, 150, y);
    doc.text(`GST: INR. ${gstAmount.toFixed(2)}`, 150, y + 5);
    doc.text(`Total (Incl. GST): INR. ${total.toFixed(2)}`, 150, y + 10);

    // Amount in words
    const numberToWords = (num) => {
      if (num === 0) return "Zero";
      const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
        "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
        "Seventeen", "Eighteen", "Nineteen"];
      const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
      const convert = (n) => {
        if (n < 20) return a[n];
        if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
        if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " + convert(n % 100) : "");
        if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
        if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + convert(n % 100000) : "");
        return "";
      };
      return convert(num);
    };
    const amountWords = numberToWords(Math.round(total));
    doc.text(`Amount Chargeable (in words):`, 14, y + 20);
    doc.text(`INR ${amountWords} Only`, 14, y + 25);

    // Declaration + Terms
    doc.setFontSize(9);
    doc.text("Declaration:", 14, y + 35);
    doc.text(
      "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.",
      14,
      y + 40,
      { maxWidth: 180 }
    );

    doc.text("Terms & Conditions:", 14, y + 50);
    const terms = [
      "1. Goods once sold will not be returned or refunded.",
      "2. Prices include all applicable taxes.",
      `3. For support: ${companyInfo.email || "support@raphaaa.com"} | ${companyInfo.phone || "+91 98765 43210"}`,
    ];
    terms.forEach((t, i) => doc.text(t, 14, y + 55 + i * 5));

    // ✅ Electronically generated — no signature required
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text(
      "This is an electronically generated invoice and does not require a signature.",
      14,
      y + 70,
      { maxWidth: 180 }
    );
    doc.setFont("helvetica", "normal");

    // ✅ Page numbers
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - 25, pageHeight - 10);
    }

    // ✅ Footer background strip
    doc.setFillColor(230, 242, 255);
    doc.rect(0, pageHeight - 20, pageWidth, 20, "F");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("Thank you for shopping with RAPHAAA!", 70, pageHeight - 10);

    doc.save(`Raphaaa_Invoice_${orderDetails?._id || "NA"}.pdf`);
  };






  /* ── helpers ── */
  const statusConfig = (status, isPaid) => {
    if (status === "Delivered")
      return { pill: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" };
    if (["Shipped","In Transit","Out For Delivery","Picked Up","Pickup Scheduled"].includes(status))
      return { pill: "bg-sky-100 text-sky-700 border-sky-200", dot: "bg-sky-500" };
    if (["Cancelled","RTO Initiated","RTO Delivered"].includes(status))
      return { pill: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500" };
    return { pill: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-400" };
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading order…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-white border border-red-100 rounded-2xl shadow-sm p-6 max-w-sm w-full text-center">
        <p className="text-red-600 font-semibold mb-3">Error: {error}</p>
        <Link to="/profile" className="text-sm text-sky-600 hover:underline">← Back to My Orders</Link>
      </div>
    </div>
  );

  if (!orderDetails) return (
    <div className="min-h-screen flex items-center justify-center text-center p-6">
      <div>
        <p className="text-3xl mb-3">📋</p>
        <p className="text-sm font-semibold text-gray-600 mb-4">Order not found</p>
        <Link to="/profile" className="px-5 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition">
          View My Orders
        </Link>
      </div>
    </div>
  );

  const { pill, dot } = statusConfig(orderDetails.status);
  const canCancel = !!orderDetails?.cancellationEligibility?.canCancel;
  const showReturnReplace = orderDetails.status === "Delivered";
  const deliveredDate = orderDetails?.deliveredAt ? new Date(orderDetails.deliveredAt) : null;
  const cancelledDate = orderDetails?.cancellation?.cancelledAt ? new Date(orderDetails.cancellation.cancelledAt) : null;
  const statusDate = orderDetails.status === "Cancelled"
    ? (cancelledDate || (orderDetails?.updatedAt ? new Date(orderDetails.updatedAt) : null))
    : (deliveredDate || (orderDetails?.updatedAt ? new Date(orderDetails.updatedAt) : null));
  const returnPolicyEndDate = deliveredDate
    ? new Date(deliveredDate.getTime() + 7 * 24 * 60 * 60 * 1000)
    : null;
  const statusDateLabel = statusDate
    ? statusDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" })
    : null;
  const formatTimelineHeaderDate = (value) =>
    value
      ? new Date(value).toLocaleDateString("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "2-digit",
        })
      : "";
  const formatTimelineDetailDate = (value) =>
    value
      ? new Date(value).toLocaleDateString("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "2-digit",
          hour: "numeric",
          minute: "2-digit",
        })
      : "";
  const stageOrder = [
    "Order Confirmed",
    "Shipped",
    "In Transit",
    "Out For Delivery",
    "Delivered",
    "Cancelled",
    "RTO",
    "Live Update",
  ];
  const normalizeStage = (text = "") => {
    const t = String(text).toLowerCase();
    if (t.includes("cancel")) return "Cancelled";
    if (t.includes("rto")) return "RTO";
    if (t.includes("deliver")) return "Delivered";
    if (t.includes("out for delivery")) return "Out For Delivery";
    if (t.includes("transit")) return "In Transit";
    if (t.includes("ship")) return "Shipped";
    if (t.includes("pickup")) return "Order Confirmed";
    if (t.includes("process") || t.includes("confirm") || t.includes("pack")) return "Order Confirmed";
    return "";
  };

  const rawTrackingActivities = Array.isArray(orderDetails?.shiprocket?.rawTracking?.shipment_track_activities)
    ? orderDetails.shiprocket.rawTracking.shipment_track_activities
    : [];
  const liveTrackingEvents = rawTrackingActivities
    .map((item) => {
      const message = item?.activity || item?.sr_status || item?.status || item?.current_status || "";
      const eventAt = item?.date || item?.created_at || item?.datetime || item?.updated_at || null;
      const stage = normalizeStage(message || item?.status || item?.current_status) || "Live Update";
      return { stage, message, eventAt };
    })
    .filter((x) => x.message)
    .sort((a, b) => new Date(a.eventAt || 0).getTime() - new Date(b.eventAt || 0).getTime());

  const fallbackEvents = [
    {
      stage: "Order Confirmed",
      message: "Your order has been placed.",
      eventAt: orderDetails?.createdAt || null,
    },
    {
      stage: "Shipped",
      message: "Your item has been shipped.",
      eventAt: orderDetails?.shiprocket?.trackingUpdatedAt || null,
    },
    {
      stage: "Out For Delivery",
      message: "Your item is out for delivery.",
      eventAt: null,
    },
    {
      stage: "Delivered",
      message: "Your item has been delivered.",
      eventAt: orderDetails?.deliveredAt || null,
    },
    {
      stage: "Cancelled",
      message: orderDetails?.cancellation?.reason
        ? `Order cancelled: ${orderDetails.cancellation.reason}`
        : "Your order has been cancelled.",
      eventAt: orderDetails?.cancellation?.cancelledAt || null,
    },
  ].filter((row) => {
    if (row.stage === "Delivered") return orderDetails.status === "Delivered";
    if (row.stage === "Cancelled") return orderDetails.status === "Cancelled";
    if (row.stage === "Out For Delivery") return ["Out For Delivery", "Delivered"].includes(orderDetails.status);
    if (row.stage === "Shipped") return ["Shipped", "In Transit", "Out For Delivery", "Delivered", "Cancelled"].includes(orderDetails.status);
    return true;
  });
  const combinedEvents = [...fallbackEvents, ...liveTrackingEvents]
    .filter((event) => event.message)
    .sort((a, b) => new Date(a.eventAt || 0).getTime() - new Date(b.eventAt || 0).getTime());
  const timelineMap = new Map();
  combinedEvents.forEach((event) => {
    const key = event.stage || "Live Update";
    if (!timelineMap.has(key)) timelineMap.set(key, { stage: key, eventAt: event.eventAt, updates: [] });
    const bucket = timelineMap.get(key);
    bucket.updates.push(event);
    if (!bucket.eventAt || (event.eventAt && new Date(event.eventAt).getTime() < new Date(bucket.eventAt).getTime())) {
      bucket.eventAt = event.eventAt;
    }
  });
  const currentStage = normalizeStage(orderDetails?.status || "") || orderDetails?.status || "Live Update";
  if (!timelineMap.has(currentStage)) {
    timelineMap.set(currentStage, {
      stage: currentStage,
      eventAt: orderDetails?.updatedAt || orderDetails?.createdAt || null,
      updates: [
        {
          stage: currentStage,
          message: `Current status: ${orderDetails?.status || "Processing"}`,
          eventAt: orderDetails?.updatedAt || orderDetails?.createdAt || null,
        },
      ],
    });
  }
  const timelineUpdates = Array.from(timelineMap.values())
    .map((group) => ({
      ...group,
      updates: [...(group.updates || [])].sort(
        (a, b) => new Date(a.eventAt || 0).getTime() - new Date(b.eventAt || 0).getTime()
      ),
    }))
    .sort((a, b) => {
      const ai = stageOrder.indexOf(a.stage);
      const bi = stageOrder.indexOf(b.stage);
      const aRank = ai === -1 ? 999 : ai;
      const bRank = bi === -1 ? 999 : bi;
      if (aRank !== bRank) return aRank - bRank;
      return new Date(a.eventAt || 0).getTime() - new Date(b.eventAt || 0).getTime();
    });

  const handleCancelOrder = async () => {
    if (!canCancel) return;
    const reason = cancelReason.trim();
    if (!reason) {
      toast.error("Please provide cancellation reason");
      return;
    }
    setCancelSubmitting(true);
    const res = await dispatch(cancelOrder({ orderId: orderDetails._id, reason }));
    if (res.meta.requestStatus === "fulfilled") {
      toast.success("Order cancelled successfully");
      setShowCancelModal(false);
      setCancelReason("");
    } else {
      toast.error(res.payload?.message || "Failed to cancel order");
    }
    setCancelSubmitting(false);
  };

  const handleReturnReplace = async (requestType) => {
    setReturnForm({
      requestType,
      reason: "",
      damageType: "",
      damageDescription: "",
      evidenceFiles: [],
    });
    setReturnModalOpen(true);
  };

  const submitReturnRequest = async () => {
    if (!returnForm.reason.trim()) {
      toast.error("Please enter return reason");
      return;
    }
    const productIds = (orderDetails.orderItems || [])
      .map((it) => String(it.productId?._id || it.productId || ""))
      .filter(Boolean);
    setReturnSubmitting(true);
    const res = await dispatch(
      createReturnRequest({
        orderId: orderDetails._id,
        requestType: returnForm.requestType,
        reason: returnForm.reason.trim(),
        damageType: returnForm.damageType,
        damageDescription: returnForm.damageDescription.trim(),
        evidenceFiles: returnForm.evidenceFiles,
        itemProductIds: productIds,
      })
    );
    setReturnSubmitting(false);
    if (res.meta.requestStatus === "fulfilled") {
      toast.success(`${returnForm.requestType === "replace" ? "Replacement" : "Return"} request created`);
      setReturnModalOpen(false);
    } else {
      toast.error(res.payload?.message || "Failed to create request");
    }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* ── Page header ── */}
        <div className="flex items-center justify-between">
          <Link to="/profile"
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-sky-700 transition">
            ← My Orders
          </Link>
          {orderDetails && (
            <button onClick={generatePDF}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-sky-400 hover:text-sky-700 hover:bg-sky-50 transition shadow-sm">
              📄 Download Invoice
            </button>
          )}
        </div>

        {/* ── Order reference banner ── */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-linear-to-r from-sky-50 to-blue-50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold text-sky-600 uppercase tracking-widest mb-1">Order Reference</p>
                <p className="text-sm font-mono font-bold text-gray-800">{orderDetails.orderId || `#${orderDetails._id}`}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {orderDetails.createdAt
                    ? new Date(orderDetails.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
                    : "—"}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Payment badge */}
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  orderDetails.isPaid
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : "bg-rose-100 text-rose-700 border-rose-200"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${orderDetails.isPaid ? "bg-emerald-500" : "bg-rose-500"}`} />
                  {orderDetails.isPaid ? "Paid" : "Unpaid"}
                </span>
                {/* Delivery status badge */}
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${pill}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                  {orderDetails.status || "Processing"}
                </span>
              </div>
            </div>
          </div>
          <div className="px-5 py-4 border-b border-gray-100 bg-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-lg font-extrabold ${orderDetails.status === "Delivered" ? "text-emerald-600" : "text-sky-700"}`}>
                  {orderDetails.status || "Processing"}{statusDateLabel ? `, ${statusDateLabel}` : ""}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {returnPolicyEndDate
                    ? `Return policy ended on ${returnPolicyEndDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`
                    : "Check tracking updates for latest delivery timeline"}
                </p>
              </div>
              <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                orderDetails.status === "Delivered" ? "bg-emerald-600 text-white" : "bg-sky-100 text-sky-700"
              }`}>
                {orderDetails.status === "Delivered" ? "✓" : "•"}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAllUpdates(true)}
            className="w-full px-5 py-3 text-center text-base font-semibold text-blue-600 hover:text-blue-700 border-b border-gray-100"
          >
            See all updates
          </button>

          {/* Shiprocket tracking */}
          {orderDetails.shiprocket?.trackingStatus && (
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 text-xs text-sky-700 bg-sky-50">
              🚚 <span className="font-semibold">Tracking:</span> {orderDetails.shiprocket.trackingStatus}
              {orderDetails.shiprocket.awbCode && (
                <span className="ml-auto font-mono text-gray-500">AWB: {orderDetails.shiprocket.awbCode}</span>
              )}
            </div>
          )}

          {/* Customer info */}
          {orderDetails.user && (
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Customer</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-sm font-bold shrink-0">
                  {(orderDetails.user.name || "?")[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{orderDetails.user.name}</p>
                  <p className="text-xs text-gray-400">{orderDetails.user.email}</p>
                  {orderDetails.shippingAddress?.phone && (
                    <p className="text-xs text-gray-400">📞 +91 {orderDetails.shippingAddress.phone}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Order items ── */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
              Items ({(orderDetails.orderItems || []).length})
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            {(orderDetails.orderItems || []).map((item, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
                  <img src={item?.image} alt={item?.name || "Product"}
                    className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/product/${item?.productId?._id || item?.productId}/p/${item?.sku}`}
                    className="text-sm font-semibold text-gray-800 hover:text-sky-600 transition line-clamp-1"
                  >
                    {item?.name || "—"}
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {item?.color && <span>{item.color}</span>}
                    {item?.color && item?.size && <span> · </span>}
                    {item?.size && <span>Size {item.size}</span>}
                    {item?.sku && <span className="ml-2 font-mono">SKU: {item.sku}</span>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-800">
                    ₹{((item?.price || 0) * (item?.quantity || 0)).toLocaleString("en-IN")}
                  </p>
                  <p className="text-xs text-gray-400">Qty: {item?.quantity}</p>
                  <p className="text-xs text-gray-400">₹{item?.price} each</p>
                </div>
              </div>
            ))}
          </div>
          {/* Total row */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
            <div className="text-xs text-gray-500">
              {computedQuantity} item{computedQuantity !== 1 ? "s" : ""}
            </div>
            <div className="text-right">
              <p className="text-[11px] text-gray-400 uppercase tracking-widest">Order Total</p>
              <p className="text-lg font-extrabold text-sky-700">
                ₹{(orderDetails.totalPrice || computedSubtotal).toLocaleString("en-IN")}
              </p>
              <p className="text-[11px] text-gray-400">
                Inclusive of GST ₹{getOrderGstSummary(orderDetails.orderItems || []).gstAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* ── Shipping + Payment ── */}
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Shipping */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-3">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Shipping Address</p>
            <div className="text-sm text-gray-700 leading-relaxed">
              {orderDetails.shippingAddress ? (
                <>
                  {[orderDetails.shippingAddress.firstName, orderDetails.shippingAddress.lastName].filter(Boolean).join(" ") && (
                    <p className="font-semibold text-gray-800">
                      {[orderDetails.shippingAddress.firstName, orderDetails.shippingAddress.lastName].filter(Boolean).join(" ")}
                    </p>
                  )}
                  <p className="text-gray-500">{orderDetails.shippingAddress.address}</p>
                  {orderDetails.shippingAddress.landmark && (
                    <p className="text-gray-500">{orderDetails.shippingAddress.landmark}</p>
                  )}
                  <p className="text-gray-500">
                    {[orderDetails.shippingAddress.city, orderDetails.shippingAddress.state, orderDetails.shippingAddress.postalCode]
                      .filter(Boolean).join(", ")}
                  </p>
                  <p className="text-gray-500">{orderDetails.shippingAddress.country}</p>
                </>
              ) : (
                <p className="text-gray-400">Address not available</p>
              )}
            </div>
          </div>

          {/* Attribution */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-3">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Attribution</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500">Source</span>
                <span className="font-semibold text-gray-800 capitalize">
                  {orderDetails.attribution?.source || "direct"}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-gray-500">Customer</span>
                <span className="text-right text-gray-700">
                  {orderDetails.attribution?.customerName || orderDetails.user?.name || orderDetails.guestName || "N/A"}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-gray-500">Email</span>
                <span className="text-right text-gray-700 break-all">
                  {orderDetails.attribution?.customerEmail || orderDetails.user?.email || orderDetails.guestEmail || "N/A"}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-gray-500">Referrer</span>
                <span className="text-right text-gray-700 break-all">
                  {orderDetails.attribution?.referrer || "N/A"}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-gray-500">Landing</span>
                <span className="text-right text-gray-700 break-all">
                  {orderDetails.attribution?.landingPage || "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-3">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Payment</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Method</span>
                <span className="font-semibold text-gray-800 capitalize">
                  {(orderDetails.paymentMethod || "—").replace("_", " ")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  orderDetails.isPaid
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : "bg-rose-100 text-rose-700 border-rose-200"
                }`}>
                  {orderDetails.isPaid ? "Paid" : "Pending"}
                </span>
              </div>
              {orderDetails.paymentResult?.id && (
                <div className="flex items-start justify-between gap-2">
                  <span className="text-gray-500 shrink-0">Txn ID</span>
                  <span className="font-mono text-xs text-gray-600 text-right break-all">
                    {orderDetails.paymentResult.id}
                  </span>
                </div>
              )}
              {orderDetails.paidAt && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Paid on</span>
                  <span className="text-xs text-gray-700">
                    {new Date(orderDetails.paidAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </div>
              )}
              {orderDetails.refundTimeline?.status && orderDetails.refundTimeline.status !== "none" && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1">Refund Timeline</p>
                  <p className="text-xs text-gray-600 capitalize">
                    Status: {String(orderDetails.refundTimeline.status).replace("_", " ")}
                  </p>
                  {orderDetails.refundTimeline.initiatedAt && (
                    <p className="text-xs text-gray-500">
                      Initiated: {new Date(orderDetails.refundTimeline.initiatedAt).toLocaleDateString("en-IN")}
                    </p>
                  )}
                  {orderDetails.refundTimeline.processedAt && (
                    <p className="text-xs text-gray-500">
                      Processed: {new Date(orderDetails.refundTimeline.processedAt).toLocaleDateString("en-IN")}
                    </p>
                  )}
                  {orderDetails.refundTimeline.completedAt && (
                    <p className="text-xs text-gray-500">
                      Completed: {new Date(orderDetails.refundTimeline.completedAt).toLocaleDateString("en-IN")}
                    </p>
                  )}
                  {orderDetails.refundTimeline.expectedDate && (
                    <p className="text-xs text-gray-500">
                      Expected by: {new Date(orderDetails.refundTimeline.expectedDate).toLocaleDateString("en-IN")}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Bottom actions ── */}
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <Link to="/profile"
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-sky-400 hover:text-sky-700 hover:bg-sky-50 transition">
            ← Back to My Orders
          </Link>
          <button onClick={generatePDF}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-sky-200 bg-sky-50 text-sm font-semibold text-sky-700 hover:bg-sky-100 transition">
            📄 Download Invoice
          </button>
          <Link to="/collections/all"
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-linear-to-r from-sky-600 to-blue-700 text-white text-sm font-bold hover:opacity-90 transition shadow-sm">
            🛍️ Continue Shopping
          </Link>
          <button
            onClick={() => canCancel && setShowCancelModal(true)}
            disabled={!canCancel}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition ${
              canCancel
                ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                : "border border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            Cancel Order
          </button>
          {showReturnReplace && (
            <>
              <button
                onClick={() => handleReturnReplace("return")}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-amber-200 bg-amber-50 text-sm font-semibold text-amber-700 hover:bg-amber-100 transition"
              >
                Return Order
              </button>
              <button
                onClick={() => handleReturnReplace("replace")}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-indigo-200 bg-indigo-50 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition"
              >
                Replace Order
              </button>
            </>
          )}
        </div>
      </div>
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35">
          <div className="w-full max-w-md rounded-2xl border border-sky-100 bg-white shadow-xl overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-sky-50 to-blue-100 border-b border-sky-100">
              <h3 className="text-sm font-bold text-sky-800">Cancel Order</h3>
              <p className="text-xs text-sky-700 mt-1">
                Please provide cancellation reason
              </p>
            </div>
            <div className="p-5 space-y-4">
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Write your reason..."
                rows={4}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    if (cancelSubmitting) return;
                    setShowCancelModal(false);
                    setCancelReason("");
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={handleCancelOrder}
                  disabled={cancelSubmitting}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-sky-600 to-blue-700 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                >
                  {cancelSubmitting ? "Cancelling..." : "Confirm Cancel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {returnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35">
          <div className="w-full max-w-lg rounded-2xl border border-amber-100 bg-white shadow-xl overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-amber-50 to-yellow-100 border-b border-amber-100">
              <h3 className="text-sm font-bold text-amber-800">
                {returnForm.requestType === "replace" ? "Replacement Request" : "Return Request"}
              </h3>
              <p className="text-xs text-amber-700 mt-1">Share reason and damage details for pickup processing.</p>
            </div>
            <div className="p-5 space-y-3">
              <textarea
                value={returnForm.reason}
                onChange={(e) => setReturnForm((p) => ({ ...p, reason: e.target.value }))}
                rows={3}
                placeholder="Why are you requesting return/replacement?"
                className="w-full rounded-xl border border-amber-200 bg-amber-50/30 px-3 py-2 text-sm"
              />
              <select
                value={returnForm.damageType}
                onChange={(e) => setReturnForm((p) => ({ ...p, damageType: e.target.value }))}
                className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Select damage type (optional)</option>
                <option value="damaged">Damaged</option>
                <option value="defective">Defective</option>
                <option value="wrong_item">Wrong item</option>
                <option value="size_issue">Size issue</option>
                <option value="quality_issue">Quality issue</option>
                <option value="other">Other</option>
              </select>
              <textarea
                value={returnForm.damageDescription}
                onChange={(e) => setReturnForm((p) => ({ ...p, damageDescription: e.target.value }))}
                rows={2}
                placeholder="Damage description (optional)"
                className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm"
              />
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setReturnForm((p) => ({ ...p, evidenceFiles: Array.from(e.target.files || []).slice(0, 5) }))}
                className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm"
              />
              {!!returnForm.evidenceFiles?.length && (
                <p className="text-xs text-gray-500">{returnForm.evidenceFiles.length} file(s) selected</p>
              )}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => {
                    if (returnSubmitting) return;
                    setReturnModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-600"
                >
                  Close
                </button>
                <button
                  onClick={submitReturnRequest}
                  disabled={returnSubmitting}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-semibold disabled:opacity-60"
                >
                  {returnSubmitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showAllUpdates && (
        <div className="fixed inset-x-0 top-0 bottom-20 lg:bottom-0 z-40 bg-[#f4f4f4] overflow-y-auto">
          <div className="max-w-3xl mx-auto px-5 py-6">
            <button
              type="button"
              onClick={() => setShowAllUpdates(false)}
              className="text-4xl leading-none text-gray-700 hover:text-black"
              aria-label="Back to order details"
            >
              ←
            </button>
            <div className="mt-8 relative">
              <div className="absolute left-4 top-4 bottom-4 w-1 bg-green-500 rounded-full" />
              <div className="space-y-10">
                {timelineUpdates.map((event, idx) => {
                  return (
                    <div key={`${event.stage}-${idx}`} className="relative pl-14">
                      <span className="absolute left-[5px] top-1 w-5 h-5 rounded-full bg-green-500 border-2 border-green-500" />
                      <div>
                        <p className="text-[20px] font-medium text-gray-900 leading-tight">
                          {event.stage}
                          {event.eventAt ? (
                            <span className="text-gray-500 font-normal ml-2">{formatTimelineHeaderDate(event.eventAt)}</span>
                          ) : null}
                        </p>
                        <div className="mt-3 space-y-3">
                          {(event.updates || []).map((update, uIdx) => (
                            <div key={`${event.stage}-u-${uIdx}`}>
                              <p className="text-[15px] text-gray-800 leading-snug">{update.message}</p>
                              {update.eventAt ? (
                                <p className="text-[13px] text-gray-500 mt-1">
                                  {formatTimelineDetailDate(update.eventAt)}
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetailsPage;
