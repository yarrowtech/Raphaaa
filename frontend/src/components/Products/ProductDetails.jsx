import React, { useEffect, useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import { trackView } from "../../utils/recentlyViewed";
import ProductGrid from "./ProductGrid";
import { HiOutlineShoppingBag } from "react-icons/hi";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchProductDetails,
  fetchSimilarProducts,
} from "../../redux/slices/productsSlice";
import { addToCart } from "../../redux/slices/cartSlice";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { BsPatchCheckFill, BsSearch } from "react-icons/bs";
import { AiOutlineHeart, AiFillHeart } from "react-icons/ai";
import axios from "axios";
import { FiShoppingCart, FiZap } from "react-icons/fi";
import { FiBell } from "react-icons/fi";
import { GoDotFill } from "react-icons/go";
import { FaCartShopping, FaRuler, FaRulerHorizontal } from "react-icons/fa6";
import { flyToCart } from "../../utils/flyToCart";
import { FiShare2 } from "react-icons/fi";
import { FiCopy } from "react-icons/fi";
import { buildTrackedProductUrl } from "../../utils/attribution";
//import ProductQA from "./ProductQA";
import { Helmet } from "react-helmet-async";
import { formatCountdown, isSaleLive, isSaleUpcoming } from "../../utils/offerCountdown";
import { cachedGet } from "../../utils/httpCache";
import { HiScale } from "react-icons/hi2";
import {
  getPendingCoupons,
  addPendingCoupon,
  removePendingCoupon,
  onPendingCouponsChange,
} from "../../utils/pendingCoupons";

// Local CSS for the size-chart drawer animation (kept here to avoid global CSS churn)
const _sizeChartDrawerAnim = `
@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
`;

// ─── Shared UI tokens (match the HTML design exactly) ───────────────────────
const UI = {
  accent:        "#7DD3FC",
  accentFg:      "#111111",
  text:          "#111111",
  muted:         "#707072",
  border:        "#EEEEEE",
  borderStrong:  "#D4D5D9",
  surface:       "#faf9fb",
  surfaceAlt:    "#f5f3f5",
  success:       "#0D8275",
  danger:        "#bb0013",
  badgeBg:       "#F8FDFF",
  badgeBorder:   "#7dd3fc",
};

const cx = (...c) => c.filter(Boolean).join(" ");

const ProductDetails = ({ productId }) => {
  const imgRef = useRef(null);
  const cartIconRef = window.cartIconRef;
  const { slug, sku } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { selectedProduct, loading, error, similarProducts } = useSelector(
    (state) => state.products
  );
  const { user, guestId } = useSelector((state) => state.auth);
  const [mainImage, setMainImage] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isButtonDisabled, setIsButtonDisabled] = useState(
    selectedProduct?.countInStock === 0
  );
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [reviews, setReviews] = useState([]);

  const [myPrebooking, setMyPrebooking] = useState(null);
  const [prebookSubmitting, setPrebookSubmitting] = useState(false);

  const [pincode, setPincode] = useState("");
  const [deliveryInfo, setDeliveryInfo] = useState(null);
  const [isCheckingDelivery, setIsCheckingDelivery] = useState(false);
  const [showDeliveryCheck, setShowDeliveryCheck] = useState(false);

  const productFetchId = selectedProduct?._id;
  const [sortOption, setSortOption] = useState("newest");
  const [ratingFilter, setRatingFilter] = useState(null);
  const [withPhotosFilter, setWithPhotosFilter] = useState(false);
  const [expandedReviews, setExpandedReviews] = useState({});
  const [showAllReviews, setShowAllReviews] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [modalImage, setModalImage] = useState("");
  const [modalIndex, setModalIndex] = useState(0);
  const [modalIsGallery, setModalIsGallery] = useState(false);
  const [paymentOffers, setPaymentOffers] = useState([]);
  const [bankOffersOpen, setBankOffersOpen] = useState(false);
  const [productOffers, setProductOffers] = useState([]);
  const [appliedCoupons, setAppliedCoupons] = useState(() => getPendingCoupons());
  const [modalZoom, setModalZoom] = useState(1);
  const [modalOffset, setModalOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [finalPrice, setFinalPrice] = useState(null);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const [isBuyNowDisabled, setIsBuyNowDisabled] = useState(false);
  const [displayCount, setDisplayCount] = useState(8);

  const [featuredCollab, setFeaturedCollab] = useState(null);
  const [zoom, setZoom] = useState({ active: false, x: 50, y: 50 });
  const [zoomPanel, setZoomPanel] = useState({ top: 0, left: 0, size: 0 });

  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [publicOffers, setPublicOffers] = useState([]);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [fbtProducts, setFbtProducts] = useState([]);
  const [ctlProducts, setCtlProducts] = useState([]);
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const [sizeChartTab, setSizeChartTab] = useState("chart");
  const [isNotifySubmitting, setIsNotifySubmitting] = useState(false);
  const [isNotifySubscribed, setIsNotifySubscribed] = useState(false);
  const modalTouchRef = useRef({
    mode: null,
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
    startDistance: 0,
    startZoom: 1,
  });

  const cart = useSelector((state) => state.cart);

  useEffect(() => {
    const styleTag = document.createElement("style");
    styleTag.setAttribute("data-sizechart-drawer", "true");
    styleTag.innerHTML = _sizeChartDrawerAnim;
    document.head.appendChild(styleTag);
    return () => {
      try {
        document.head.removeChild(styleTag);
      } catch (_) {}
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    cachedGet(
      "offers:public",
      () => axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/offers/public`),
      60 * 1000
    )
      .then((data) => setPublicOffers(Array.isArray(data) ? data : []))
      .catch(() => setPublicOffers([]));
  }, []);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const { data } = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/offers/payment`
        );
        if (Array.isArray(data)) setPaymentOffers(data);
      } catch (error) {
        console.error("Failed to fetch payment offers:", error);
      }
    };
    fetchOffers();
  }, []);

  useEffect(() => {
    const pid = selectedProduct?._id;
    if (!pid) {
      setProductOffers([]);
      return;
    }
    let cancelled = false;
    axios
      .get(`${import.meta.env.VITE_BACKEND_URL}/api/offers/for-product/${pid}`)
      .then(({ data }) => {
        if (!cancelled && Array.isArray(data)) setProductOffers(data);
      })
      .catch(() => {
        if (!cancelled) setProductOffers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProduct?._id]);

  useEffect(() => onPendingCouponsChange(setAppliedCoupons), []);

  const hasColorVariants =
    Array.isArray(selectedProduct?.colorVariants) && selectedProduct.colorVariants.length > 0;
  const hasLegacyVariants =
    !hasColorVariants &&
    Array.isArray(selectedProduct?.variants) && selectedProduct.variants.length > 0;

  const effectiveColors = hasColorVariants
    ? [...new Set(selectedProduct.colorVariants.map((cv) => cv.color).filter(Boolean))]
    : hasLegacyVariants
    ? [...new Set(selectedProduct.variants.map((v) => v.color).filter(Boolean))]
    : selectedProduct?.colors || [];

  const activeColorVariant = hasColorVariants && selectedColor
    ? selectedProduct.colorVariants.find(
        (cv) => String(cv.color || "").toLowerCase() === String(selectedColor || "").toLowerCase()
      )
    : null;

  const displayImages = activeColorVariant?.images?.length
    ? activeColorVariant.images
    : selectedProduct?.images || [];

  const effectiveMainImage =
    displayImages.length > 0
      ? (displayImages.some((img) => img.url === mainImage)
          ? mainImage
          : displayImages[0].url)
      : mainImage;
  const modalImages = displayImages.map((img) => img.url).filter(Boolean);
  const modalCurrentImage = modalIsGallery
    ? (modalImages[modalIndex] || modalImage || effectiveMainImage || selectedProduct?.images?.[0]?.url || "")
    : (modalImage || effectiveMainImage || selectedProduct?.images?.[0]?.url || "");

  const effectiveSizes = hasColorVariants
    ? activeColorVariant
      ? activeColorVariant.sizes.map((s) => s.size).filter(Boolean)
      : []
    : hasLegacyVariants
    ? [...new Set(
        selectedProduct.variants
          .filter((v) => !selectedColor || String(v.color || "").toLowerCase() === String(selectedColor || "").toLowerCase())
          .map((v) => v.size)
          .filter(Boolean)
      )]
    : selectedProduct?.sizes || [];

  const getSizeStock = (size) => {
    if (hasColorVariants && activeColorVariant) {
      const sz = activeColorVariant.sizes.find(
        (s) => String(s.size || "").toLowerCase() === String(size || "").toLowerCase()
      );
      return Number(sz?.countInStock || 0);
    }
    if (hasLegacyVariants) {
      const v = selectedProduct.variants.find(
        (v) =>
          String(v.color || "").toLowerCase() === String(selectedColor || "").toLowerCase() &&
          String(v.size  || "").toLowerCase() === String(size  || "").toLowerCase()
      );
      return Number(v?.countInStock || 0);
    }
    return Number(selectedProduct?.countInStock || 0);
  };

  const matchedColorSizeEntry = (() => {
    if (hasColorVariants && activeColorVariant && selectedSize) {
      return activeColorVariant.sizes.find(
        (s) => String(s.size || "").toLowerCase() === String(selectedSize || "").toLowerCase()
      ) || null;
    }
    if (hasLegacyVariants && selectedColor && selectedSize) {
      return selectedProduct.variants.find(
        (v) =>
          String(v.color || "").toLowerCase() === String(selectedColor || "").toLowerCase() &&
          String(v.size  || "").toLowerCase() === String(selectedSize  || "").toLowerCase()
      ) || null;
    }
    return null;
  })();

  const matchedVariantBySku =
    hasLegacyVariants && sku
      ? selectedProduct.variants.find((v) => String(v?.sku || "") === String(sku))
      : null;

  const overallStock = Number(selectedProduct?.countInStock || 0);
  const selectedVariantStock = matchedColorSizeEntry
    ? Number(matchedColorSizeEntry.countInStock || 0)
    : matchedVariantBySku
    ? Number(matchedVariantBySku.countInStock || 0)
    : overallStock;

  const isOutOfStock = overallStock <= 0 || (selectedSize ? selectedVariantStock <= 0 : false);

  const isPrebookOpenMode = Boolean(
    selectedProduct?.prebooking?.enabled && selectedProduct?.prebooking?.status === "open"
  );
  const resolveTimedOffer = (product) => {
    const timed = product?.timedOffer || null;
    if (timed) return timed;

    const matched = publicOffers.find((offer) =>
      Array.isArray(offer.productIds) &&
      offer.productIds.some((item) => String(item?._id || item) === String(product?._id))
    );
    if (!matched) return null;

    const nowTs = Date.now();
    const startsAt = matched.startDate;
    const endsAt = matched.endDate;
    const isLive = nowTs >= new Date(startsAt).getTime() && nowTs <= new Date(endsAt).getTime();
    const isUpcoming = nowTs < new Date(startsAt).getTime();
    return {
      status: isLive ? "live" : isUpcoming ? "upcoming" : "expired",
      startsAt,
      endsAt,
      offerPercentage: Number(matched.offerPercentage || matched.benefit?.percent || 0),
      title: matched.title,
      originalPrice: Number(product?.price || 0),
      discountPrice: Number(
        (
          Number(product?.price || 0) -
          (Number(product?.price || 0) * Number(matched.offerPercentage || matched.benefit?.percent || 0)) / 100
        ).toFixed(2)
      ),
    };
  };
  const matchingPublicOffer = publicOffers.find((offer) =>
    Array.isArray(offer.productIds) &&
    offer.productIds.some((item) => String(item?._id || item) === String(selectedProduct?._id))
  );
  const timedOffer = resolveTimedOffer(selectedProduct);
  const fallbackOffer = !timedOffer && matchingPublicOffer ? {
    status: Date.now() >= new Date(matchingPublicOffer.startDate).getTime() && Date.now() <= new Date(matchingPublicOffer.endDate).getTime()
      ? "live"
      : Date.now() < new Date(matchingPublicOffer.startDate).getTime()
      ? "upcoming"
      : "expired",
    startsAt: matchingPublicOffer.startDate,
    endsAt: matchingPublicOffer.endDate,
    offerPercentage: Number(matchingPublicOffer.offerPercentage || matchingPublicOffer.benefit?.percent || 0),
    title: matchingPublicOffer.title,
    originalPrice: Number(selectedProduct?.price || 0),
    discountPrice: Number(
      (
        Number(selectedProduct?.price || 0) -
        (Number(selectedProduct?.price || 0) * Number(matchingPublicOffer.offerPercentage || matchingPublicOffer.benefit?.percent || 0)) / 100
      ).toFixed(2)
    ),
  } : null;
  const activeSaleOffer = timedOffer || fallbackOffer;
  const saleStartAt = activeSaleOffer?.startsAt || activeSaleOffer?.startDate || null;
  const saleEndAt = activeSaleOffer?.endsAt || activeSaleOffer?.endDate || null;
  const salePhase = activeSaleOffer && saleStartAt && saleEndAt
    ? now >= new Date(saleStartAt).getTime() && now <= new Date(saleEndAt).getTime()
      ? "live"
      : now < new Date(saleStartAt).getTime()
      ? "upcoming"
      : "expired"
    : activeSaleOffer?.status || null;
  const saleLabel = activeSaleOffer
    ? (salePhase === "live"
        ? "Sale is live now"
        : salePhase === "upcoming"
        ? `💥 Sale starts in ${formatCountdown(saleStartAt, now)}`
        : "")
    : "";
  const saleLive = salePhase === "live";
  const saleUpcoming = salePhase === "upcoming";
  const originalPrice = Number(selectedProduct?.price || 0);
  const apiDisplayPrice = Number(
    selectedProduct?.displayPrice ??
      selectedProduct?.discountPrice ??
      originalPrice
  );
  const resolvedOfferPercentage = Number(
    activeSaleOffer?.offerPercentage ||
      selectedProduct?.offerPercentage ||
      0
  );
  const computedOfferPrice = resolvedOfferPercentage > 0
    ? Number((originalPrice - (originalPrice * resolvedOfferPercentage) / 100).toFixed(2))
    : originalPrice;
  const priceCandidates = [
    activeSaleOffer?.discountPrice,
    selectedProduct?.timedOffer?.discountPrice,
    apiDisplayPrice,
    computedOfferPrice,
  ]
    .map(Number)
    .filter((price) => Number.isFinite(price) && price > 0);
  const displayPrice = priceCandidates.length > 0
    ? Math.min(...priceCandidates)
    : originalPrice;
  const showDiscount = displayPrice > 0 && displayPrice < originalPrice;
  const timedOfferBadge = saleLabel;

  const PM_LABELS = {
    Razorpay: "prepaid / cards / UPI",
    cash_on_delivery: "Cash on Delivery",
    PayPal: "PayPal",
  };

  const estimateOfferSaving = (offer) => {
    const unit = Number(displayPrice) || 0;
    if (unit <= 0 || offer.scope === "shipping") return 0;
    let saving = 0;
    if (offer.benefitType === "flat") {
      saving = Math.min(unit, Number(offer.amount) || 0);
    } else {
      saving = (unit * (Number(offer.percent) || 0)) / 100;
      if (offer.maxDiscount != null) saving = Math.min(saving, Number(offer.maxDiscount));
    }
    return Math.round(saving);
  };

  const couponOffers = productOffers.filter((o) => o.couponCode);
  const autoOffers = productOffers.filter((o) => !o.couponCode);

  const isCouponApplied = (code) =>
    appliedCoupons.includes(String(code || "").trim().toUpperCase());

  const handleApplyCouponOffer = (offer) => {
    if (!offer?.couponCode) return;
    if (isCouponApplied(offer.couponCode)) {
      setAppliedCoupons(removePendingCoupon(offer.couponCode));
      toast.success(`Removed ${offer.couponCode}`);
      return;
    }
    setAppliedCoupons(addPendingCoupon(offer.couponCode));
    const saved = estimateOfferSaving(offer);
    toast.success(
      saved > 0
        ? `${offer.couponCode} applied — save about ₹${saved.toLocaleString("en-IN")} at checkout`
        : `${offer.couponCode} applied — savings shown at checkout`
    );
  };

  const getCardTimedOffer = (product) => {
    const timed = product?.timedOffer || null;
    if (timed) return timed;

    const matched = publicOffers.find((offer) =>
      Array.isArray(offer.productIds) &&
      offer.productIds.some((item) => String(item?._id || item) === String(product?._id))
    );
    if (!matched) return null;

    const nowTs = Date.now();
    const startsAt = matched.startDate;
    const endsAt = matched.endDate;
    const isLive = nowTs >= new Date(startsAt).getTime() && nowTs <= new Date(endsAt).getTime();
    const isUpcoming = nowTs < new Date(startsAt).getTime();

    return {
      status: isLive ? "live" : isUpcoming ? "upcoming" : "expired",
      startsAt,
      endsAt,
      offerPercentage: Number(matched.offerPercentage || matched.benefit?.percent || 0),
      title: matched.title,
      originalPrice: Number(product?.price || 0),
      discountPrice: Number(
        (
          Number(product?.price || 0) -
          (Number(product?.price || 0) * Number(matched.offerPercentage || matched.benefit?.percent || 0)) / 100
        ).toFixed(2)
      ),
    };
  };

  const getColorVariantCount = (product) => {
    if (Array.isArray(product?.colorVariants) && product.colorVariants.length > 0) {
      return new Set(product.colorVariants.map((variant) => String(variant?.color || "").trim()).filter(Boolean)).size;
    }
    if (Array.isArray(product?.variants) && product.variants.length > 0) {
      return new Set(product.variants.map((variant) => String(variant?.color || "").trim()).filter(Boolean)).size;
    }
    return 0;
  };

  const [viewersNow, setViewersNow] = React.useState(() => Math.floor(Math.random() * 18) + 4);
  React.useEffect(() => {
    const id = setInterval(() => setViewersNow(Math.floor(Math.random() * 18) + 4), 30000);
    return () => clearInterval(id);
  }, []);

  const [showStickyCTA, setShowStickyCTA] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setShowStickyCTA(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const selectedVariantSku =
    matchedColorSizeEntry?.sku ||
    matchedVariantBySku?.sku ||
    selectedProduct?.skuCode ||
    selectedProduct?.sku;

  const handleZoomEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.min(rect.height, 440);
    setZoomPanel({ top: rect.top, left: rect.right + 14, size });
    setZoom((s) => ({ ...s, active: true }));
  };

  const handleZoomLeave = () => setZoom({ active: false, x: 50, y: 50 });

  const handleZoomMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setZoom((prev) => ({ ...prev, x, y }));
  };

  const handleZoomTouchMove = (e) => {
    const t = e.touches?.[0];
    if (!t) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((t.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((t.clientY - rect.top) / rect.height) * 100));
    setZoom((prev) => ({ ...prev, x, y }));
  };

  useEffect(() => {
    const fetchWishlist = async () => {
      const token = localStorage.getItem("userToken");
      if (!token) return;
      try {
        const { data } = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/wishlist`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setWishlistItems(data);
      } catch (err) {
        console.error("Error fetching wishlist:", err);
      }
    };
    fetchWishlist();
  }, []);

  const isInWishlist = (productId) => {
    return wishlistItems.some((item) => item._id === productId);
  };

  useEffect(() => {
    const productId = selectedProduct?._id;
    if (!productId || !selectedProduct?.prebooking?.enabled) {
      setMyPrebooking(null);
      return;
    }
    const token = localStorage.getItem("userToken");
    if (!token) {
      setMyPrebooking(null);
      return;
    }
    axios
      .get(`${import.meta.env.VITE_BACKEND_URL}/api/prebookings/mine/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(({ data }) => setMyPrebooking(data))
      .catch(() => setMyPrebooking(null));
  }, [selectedProduct?._id, selectedProduct?.prebooking?.enabled]);

  const handlePrebook = async () => {
    const token = localStorage.getItem("userToken");
    if (!token) {
      toast.warning("Please login to prebook this product");
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (hasColorVariants && (!selectedColor || !selectedSize)) {
      toast.warning("Please select a color and size before prebooking");
      return;
    }
    setPrebookSubmitting(true);
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/prebookings/${selectedProduct._id}`,
        { size: selectedSize, color: selectedColor },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMyPrebooking(data);
      toast.success("You're in! We'll email you the moment this product is ready.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reserve a prebooking slot");
    } finally {
      setPrebookSubmitting(false);
    }
  };

  const handleRemoveFromWishlist = async (productId) => {
    try {
      const token = localStorage.getItem("userToken");
      if (!token) {
        toast.warning("Please login to add itmes to wishlist");
        navigate("/login");
        return;
      }
      await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/api/wishlist/remove/${productId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Removed from wishlist");
      setWishlistItems((prev) => prev.filter((item) => item._id !== productId));
    } catch (err) {
      console.error("Failed to remove from wishlist:", err);
      toast.error("Failed to remove from wishlist");
    }
  };

  const handleAddToWishlist = async (product) => {
    try {
      const token = localStorage.getItem("userToken");
      if (!token) {
        toast.warning("Please login to add itmes to wishlist");
        navigate("/login");
        return;
      }
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/wishlist/add/${product._id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`${product.name} added to wishlist`);
      setWishlistItems((prev) => [...prev, product]);
    } catch (error) {
      console.error("Failed to add to wishlist:", error);
      toast.error("Failed to add to wishlist");
    }
  };

  useEffect(() => {
    const isMongoId = (s) => /^[a-f\d]{24}$/i.test(String(s || ""));

    const fetchByParams = async () => {
      try {
        if (isMongoId(sku)) {
          dispatch(fetchProductDetails(sku));
          dispatch(fetchSimilarProducts(sku));
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/products`)
            .then(({ data }) => setCatalogProducts(Array.isArray(data) ? data : []))
            .catch(() => {});
          return;
        }

        const { data } = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/products`
        );
        setCatalogProducts(Array.isArray(data) ? data : []);

        const toSlug = (name = "") =>
          name.toLowerCase().trim().replace(/\s+/g, "-");

        let matchedProduct = null;
        if (sku) {
          matchedProduct = data.find((p) => {
            if (String(p.skuCode || p.sku || p._id) === String(sku)) return true;
            if (Array.isArray(p.colorVariants)) {
              for (const cv of p.colorVariants) {
                if (Array.isArray(cv.sizes) && cv.sizes.some((s) => String(s?.sku || "") === String(sku)))
                  return true;
              }
            }
            if (Array.isArray(p.variants) && p.variants.some((v) => String(v?.sku || "") === String(sku)))
              return true;
            return false;
          });
        }

        if (!matchedProduct && slug) {
          matchedProduct = data.find((p) => toSlug(p.name) === toSlug(slug));
        }

        if (matchedProduct) {
          dispatch(fetchProductDetails(matchedProduct._id));
          dispatch(fetchSimilarProducts(matchedProduct._id));
        } else {
          toast.error("Product not found");
        }
      } catch (err) {
        console.error("Error fetching product by slug:", err);
      }
    };

    fetchByParams();
  }, [slug, sku, dispatch]);

  const resolvedSimilarProducts = useMemo(() => {
    if (Array.isArray(similarProducts) && similarProducts.length > 0) {
      return similarProducts;
    }
    if (!selectedProduct || !Array.isArray(catalogProducts)) return [];
    return catalogProducts
      .filter(
        (p) =>
          p?._id !== selectedProduct?._id &&
          String(p?.category || "").toLowerCase() ===
            String(selectedProduct?.category || "").toLowerCase()
      )
      .slice(0, 12);
  }, [similarProducts, selectedProduct, catalogProducts]);

  const buildMarketplaceUrl = (provider, productName) => {
    const q = encodeURIComponent(String(productName || "").trim());
    switch (provider) {
      case "Amazon":
        return `https://www.amazon.in/s?k=${q}`;
      case "Flipkart":
        return `https://www.flipkart.com/search?q=${q}`;
      case "Meesho":
        return `https://www.meesho.com/search?q=${q}`;
      default:
        return "";
    }
  };

  useEffect(() => {
    const p = selectedProduct;
    if (!p?._id) return;

    trackView(p);

    axios
      .get(`${import.meta.env.VITE_BACKEND_URL}/api/recommendations/fbt/${p._id}?limit=8`)
      .then((res) => setFbtProducts(Array.isArray(res.data) ? res.data : []))
      .catch(() => setFbtProducts([]));

    axios
      .get(`${import.meta.env.VITE_BACKEND_URL}/api/recommendations/complete-the-look/${p._id}?limit=6`)
      .then((res) => setCtlProducts(Array.isArray(res.data) ? res.data : []))
      .catch(() => setCtlProducts([]));
  }, [selectedProduct?._id]);

  useEffect(() => {
    if (!sizeChartOpen) return;
    const escHandler = (e) => {
      if (e.key === "Escape") setSizeChartOpen(false);
    };
    document.addEventListener("keydown", escHandler);
    return () => document.removeEventListener("keydown", escHandler);
  }, [sizeChartOpen]);

  const handleBuyNow = async () => {
    if (isOutOfStock) {
      toast.error("This product is out of stock.");
      return;
    }
    if (!selectedSize || !selectedColor) {
      toast.error("Please select a size and color.");
      return;
    }
    const cartItems = cart?.products || [];
    const totalQuantity = cartItems.reduce((acc, item) => acc + item.quantity, 0);
    if (totalQuantity >= 10) {
      toast.error("You can buy up to 10 items only.");
      return;
    }
    setIsBuyingNow(true);
    setIsBuyNowDisabled(true);

    const alreadyInCart = cartItems.find(
      (item) =>
        item.productId === selectedProduct._id &&
        item.size === selectedSize &&
        item.color === selectedColor
    );

    try {
      if (!user) {
        if (!alreadyInCart) {
          const guestId = localStorage.getItem("guestId");
          const res = await dispatch(
            addToCart({
              productId: selectedProduct._id,
              quantity,
              size: selectedSize,
              color: selectedColor,
              sku: selectedVariantSku,
              guestId,
            })
          );
          if (res.meta.requestStatus !== "fulfilled") {
            toast.error("Failed to add product. Try again.");
            return;
          }
        }
        toast.warning("Please login to continue.");
        navigate("/login?redirect=%2Fcheckout");
        return;
      }

      if (!alreadyInCart) {
        const user = JSON.parse(localStorage.getItem("userInfo"));
        const guestId = localStorage.getItem("guestId");
        const res = await dispatch(
          addToCart({
            productId: selectedProduct._id,
            quantity,
            size: selectedSize,
            color: selectedColor,
            sku: selectedVariantSku,
            userId: user?._id,
            guestId,
          })
        );
        if (res.meta.requestStatus !== "fulfilled") {
          toast.error("Failed to add product. Try again.");
          return;
        }
      }

      navigate("/checkout");
    } catch (error) {
      console.error("Buy Now Error:", error);
      toast.error("Error while adding to cart.");
    } finally {
      setIsBuyingNow(false);
      setIsBuyNowDisabled(false);
    }
  };

  useEffect(() => {
    const validateUserCoupon = async () => {
      try {
        const token = localStorage.getItem("userToken");
        if (!token || !couponCode.trim()) {
          setFinalPrice(null);
          return;
        }
        const { data } = await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/api/users/validate-coupon`,
          { couponCode },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (data.valid && selectedProduct) {
          const discount = data.discount || 0;
          const discounted =
            selectedProduct.discountPrice -
            selectedProduct.discountPrice * (discount / 100);
          setFinalPrice(Math.round(discounted));
          toast.success("Coupon applied successfully!");
        } else {
          setFinalPrice(null);
          toast.error("Invalid or expired coupon");
        }
      } catch (err) {
        console.error("Coupon validation error:", err);
        toast.error("Failed to validate coupon");
        setFinalPrice(null);
      }
    };
    validateUserCoupon();
  }, [couponCode, selectedProduct]);

  const handleImageClick = (imgUrl, index = 0) => {
    const galleryIndex = index >= 0 ? index : modalImages.findIndex((url) => url === imgUrl);
    setModalImage(imgUrl);
    setModalIndex(galleryIndex >= 0 ? galleryIndex : 0);
    setModalIsGallery(galleryIndex >= 0);
    setModalZoom(1);
    setModalOffset({ x: 0, y: 0 });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setModalZoom(1);
    setModalOffset({ x: 0, y: 0 });
    setIsPanning(false);
    setModalIsGallery(false);
  };

  const goToModalImage = (dir) => {
    if (!modalIsGallery || !modalImages.length) return;
    setModalIndex((prev) => (prev + dir + modalImages.length) % modalImages.length);
    setModalZoom(1);
    setModalOffset({ x: 0, y: 0 });
  };

  const getTouchDistance = (touches) => {
    if (!touches || touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const handleModalTouchStart = (e) => {
    if (e.touches.length === 2) {
      modalTouchRef.current = {
        ...modalTouchRef.current,
        mode: "pinch",
        startDistance: getTouchDistance(e.touches),
        startZoom: modalZoom,
      };
      return;
    }
    if (e.touches.length === 1 && modalZoom > 1) {
      const t = e.touches[0];
      modalTouchRef.current = {
        ...modalTouchRef.current,
        mode: "pan",
        startX: t.clientX,
        startY: t.clientY,
        startOffsetX: modalOffset.x,
        startOffsetY: modalOffset.y,
      };
      setIsPanning(true);
    }
  };

  const handleModalTouchMove = (e) => {
    if (modalTouchRef.current.mode === "pinch" && e.touches.length === 2) {
      const nextDistance = getTouchDistance(e.touches);
      if (!modalTouchRef.current.startDistance) return;
      const ratio = nextDistance / modalTouchRef.current.startDistance;
      const nextZoom = Math.max(1, Math.min(4, modalTouchRef.current.startZoom * ratio));
      setModalZoom(nextZoom);
      if (nextZoom <= 1) setModalOffset({ x: 0, y: 0 });
      return;
    }
    if (modalTouchRef.current.mode === "pan" && e.touches.length === 1 && modalZoom > 1) {
      e.preventDefault();
      const t = e.touches[0];
      const dx = t.clientX - modalTouchRef.current.startX;
      const dy = t.clientY - modalTouchRef.current.startY;
      setModalOffset({
        x: modalTouchRef.current.startOffsetX + dx,
        y: modalTouchRef.current.startOffsetY + dy,
      });
    }
  };

  const handleModalTouchEnd = () => {
    modalTouchRef.current.mode = null;
    setIsPanning(false);
  };

  useEffect(() => {
    const escHandler = (e) => {
      if (e.key === "Escape") handleCloseModal();
    };
    document.addEventListener("keydown", escHandler);
    return () => document.removeEventListener("keydown", escHandler);
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      setIsButtonDisabled(isOutOfStock);
    }
  }, [selectedProduct, isOutOfStock]);

  useEffect(() => {
    if (productFetchId) {
      setSelectedColor("");
      setSelectedSize("");
      setMainImage("");
    }
  }, [productFetchId]);

  useEffect(() => {
    if (!selectedProduct) return;
    const firstImg =
      selectedProduct.colorVariants?.[0]?.images?.[0]?.url ||
      selectedProduct.images?.[0]?.url ||
      "";
    if (firstImg && !mainImage) setMainImage(firstImg);
    if (!selectedColor && Array.isArray(selectedProduct.colorVariants) && selectedProduct.colorVariants.length > 0) {
      setSelectedColor(selectedProduct.colorVariants[0].color || "");
    }
  }, [selectedProduct]);

  useEffect(() => {
    if (!selectedColor || !selectedProduct) return;
    if (hasColorVariants) {
      const cv = selectedProduct.colorVariants.find(
        (c) => String(c.color || "").toLowerCase() === String(selectedColor || "").toLowerCase()
      );
      const img = cv?.images?.[0]?.url;
      if (img) setMainImage(img);
    } else {
      const colorIdx = (selectedProduct.colors || []).indexOf(selectedColor);
      const posImg =
        (colorIdx >= 0 && selectedProduct.images?.[colorIdx]?.url) ||
        selectedProduct.images?.[0]?.url;
      if (posImg) setMainImage(posImg);
    }
  }, [selectedColor]);

  useEffect(() => {
    if (!selectedProduct) return;

    if (hasColorVariants) {
      if (sku) {
        for (const cv of selectedProduct.colorVariants) {
          const sz = cv.sizes.find((s) => String(s.sku || "") === String(sku));
          if (sz) {
            setSelectedColor(cv.color || "");
            setSelectedSize(sz.size || "");
            return;
          }
        }
      }
      if (!selectedColor && selectedProduct.colorVariants[0]?.color) {
        setSelectedColor(selectedProduct.colorVariants[0].color);
      }
      if (!selectedSize && selectedProduct.colorVariants[0]?.sizes?.[0]?.size) {
        setSelectedSize(selectedProduct.colorVariants[0].sizes[0].size);
      }
      return;
    }

    if (hasLegacyVariants) {
      if (sku) {
        const m = selectedProduct.variants.find((v) => String(v?.sku || "") === String(sku));
        if (m) {
          setSelectedColor(m.color || "");
          setSelectedSize(m.size || "");
          return;
        }
      }
      if (!selectedColor && selectedProduct.variants[0]?.color)
        setSelectedColor(selectedProduct.variants[0].color);
      if (!selectedSize && selectedProduct.variants[0]?.size)
        setSelectedSize(selectedProduct.variants[0].size);
    }
  }, [selectedProduct, hasColorVariants, hasLegacyVariants, sku]);

  const sortedReviews = useMemo(() => {
    let filtered = [...reviews];
    if (ratingFilter !== null) filtered = filtered.filter((r) => r.rating === ratingFilter);
    if (withPhotosFilter) filtered = filtered.filter((r) => r.image && r.image.length > 0);
    if (sortOption === "highest") return filtered.sort((a, b) => b.rating - a.rating);
    if (sortOption === "lowest") return filtered.sort((a, b) => a.rating - b.rating);
    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [sortOption, reviews, ratingFilter, withPhotosFilter]);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/reviews/product/${productFetchId}`
        );
        const data = await res.json();
        setReviews(data);
      } catch (error) {
        console.error("Failed to fetch reviews:", error);
      }
    };

    if (productFetchId) {
      fetchReviews();
    }
  }, [productFetchId]);

  useEffect(() => {
    setShowFullDescription(false);
  }, [productFetchId]);

  const handleQuantityChange = (action) => {
    if (action === "plus") {
      setQuantity((prev) => prev + 1);
    }
    if (action === "minus" && quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  const checkDeliveryAvailability = async (pincode) => {
    setIsCheckingDelivery(true);

    const isValidPincode = /^\d{6}$/.test(pincode);

    if (!isValidPincode) {
      setDeliveryInfo({
        isDeliverable: false,
        message: "Please enter a valid 6-digit pincode",
      });
      setIsCheckingDelivery(false);
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/products/delivery/check?pincode=${encodeURIComponent(
          pincode
        )}&cod=0`
      );
      const data = await response.json();
      if (!response.ok || !data?.success) {
        setDeliveryInfo({
          isDeliverable: false,
          message: data?.message || "Unable to check delivery now.",
        });
        return;
      }
      setDeliveryInfo({
        isDeliverable: Boolean(data.isDeliverable),
        message: data.message || "Delivery check completed",
        deliveryDate: data.deliveryDate || null,
        deliveryDays: data.deliveryDays ?? null,
        location: data.location || null,
        courierName: data.courierName || null,
        courierCount: data.courierCount || 0,
        codAvailable: Boolean(data.codAvailable),
      });
    } catch (error) {
      console.error("Error checking delivery:", error);
      setDeliveryInfo({
        isDeliverable: false,
        message: "Error checking delivery availability. Please try again.",
      });
    } finally {
      setIsCheckingDelivery(false);
    }
  };

  const handleDeliveryCheck = () => {
    if (pincode.trim()) {
      checkDeliveryAvailability(pincode.trim());
    } else {
      toast.error("Please enter a pincode", { duration: 1500 });
    }
  };

  useEffect(() => {
    const pin = String(pincode || "").trim();

    if (!pin) {
      setDeliveryInfo(null);
      return;
    }

    if (!/^\d{0,6}$/.test(pin)) return;
    if (pin.length !== 6) return;

    const timer = setTimeout(() => {
      checkDeliveryAvailability(pin);
    }, 450);

    return () => clearTimeout(timer);
  }, [pincode]);

  const handleAddToCart = (e) => {
    if (isOutOfStock) {
      toast.error("This product is out of stock.", { duration: 1500 });
      return;
    }

    if (!selectedSize || !selectedColor) {
      toast.error("Please select a size and color before adding to cart.", {
        duration: 1500,
      });
      return;
    }

    const currentCartItems = JSON.parse(
      localStorage.getItem("persist:root")
    )?.cart;
    const totalProductsInCart = currentCartItems
      ? JSON.parse(currentCartItems)?.cartItems?.reduce(
        (acc, item) => acc + item.quantity,
        0
      )
      : 0;

    if (totalProductsInCart + quantity > 10) {
      toast.error("You can buy up to 10 items", { duration: 2000 });
      return;
    }

    setIsButtonDisabled(true);
    setIsAddingToCart(true);
    const selectedColorLabel =
      hasColorVariants
        ? (selectedProduct?.colorVariants?.find(
            (cv) =>
              String(cv?.color || "").toLowerCase() ===
              String(selectedColor || "").toLowerCase()
          )?.colorName || selectedColor)
        : selectedColor;

    dispatch(
      addToCart({
        productId: productFetchId,
        quantity,
        size: selectedSize,
        color: selectedColorLabel,
        sku: selectedVariantSku,
        guestId,
        userId: user?._id,
      })
    )
      .then(() => {
        toast.success("Product added to cart!!", { duration: 3000 });
        flyToCart(effectiveMainImage, imgRef.current, cartIconRef);
      })
      .finally(() => {
        setIsButtonDisabled(false);
        setIsAddingToCart(false);
      });
  };

  const handleNotifyMe = async () => {
    if (!selectedProduct?._id) return;
    if (!isOutOfStock) {
      toast.success("This product is currently in stock.");
      return;
    }
    if (!selectedVariantSku) {
      toast.error("Please select a size and color first.");
      return;
    }

    const normalizedUserEmail =
      String(user?.email || JSON.parse(localStorage.getItem("userInfo") || "{}")?.email || "")
        .trim()
        .toLowerCase();

    let email = normalizedUserEmail;
    if (!email) {
      const input = window.prompt("Enter your email to get notified when this item is back in stock:");
      email = String(input || "").trim().toLowerCase();
    }

    if (!/.+@.+\..+/.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    try {
      setIsNotifySubmitting(true);
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/alerts/subscribe`, {
        type: "back_in_stock",
        productId: selectedProduct._id,
        sku: selectedVariantSku,
        email,
      });
      setIsNotifySubscribed(true);
      toast.success("You'll get an email when this item is back in stock.");
    } catch (err) {
      console.error("Notify subscription failed:", err);
      toast.error(err?.response?.data?.message || "Failed to subscribe for restock alert.");
    } finally {
      setIsNotifySubmitting(false);
    }
  };

  useEffect(() => {
    const fetchCollab = async () => {
      try {
        const { data } = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/collabs`
        );
        if (data && data.length > 0) {
          setFeaturedCollab(data[0]);
        }
      } catch (err) {
        console.error("Failed to load featured collab", err);
      }
    };

    fetchCollab();
  }, []);

  if (loading) return <ProductDetailsSkeleton />;
  if (error && !selectedProduct) return <p className="text-center text-red-500 py-10">{error}</p>;
  if (!selectedProduct) return <ProductDetailsSkeleton />;

  const formatReviewDate = (isoDate) => {
    const options = { day: "2-digit", month: "long", year: "numeric" };
    return new Date(isoDate).toLocaleDateString("en-IN", options);
  };
  const totalReviews = reviews.length || 1;
  const ratingCounts = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => r.rating === star).length;
    return {
      star,
      count,
      percentage: Math.round((count / totalReviews) * 100),
    };
  });
  const totalQuantity =
    cart?.products?.reduce((acc, item) => acc + item.quantity, 0) || 0;
  const maxLimitReached = totalQuantity >= 10;

  const handleShare = async () => {
    try {
      const productUrl = buildTrackedProductUrl("share");

      if (navigator.share) {
        await navigator.share({
          title: selectedProduct?.name,
          text: "Check out this product!",
          url: productUrl,
        });
      } else {
        await navigator.clipboard.writeText(productUrl);
        toast.success("Link copied to clipboard!");
      }
    } catch (err) {
      console.error("Share failed:", err);
    }
  };

  const productSchema = selectedProduct
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: selectedProduct.name,
        description: selectedProduct.description || selectedProduct.name,
        image:
          selectedProduct.colorVariants?.[0]?.images?.map((img) => img.url) ||
          selectedProduct.images?.map((img) => img.url) ||
          [],
        sku: selectedProduct.skuCode || selectedProduct.sku || selectedProduct._id,
        brand: {
          "@type": "Brand",
          name: selectedProduct.brand || "Raphaaa",
        },
        offers: {
          "@type": "Offer",
          priceCurrency: "INR",
          price: displayPrice,
          availability:
            selectedProduct.stock > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          url: typeof window !== "undefined" ? window.location.href : "",
          seller: { "@type": "Organization", name: "Raphaaa" },
        },
        ...(selectedProduct.rating > 0 && {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: selectedProduct.rating.toFixed(1),
            reviewCount: selectedProduct.numReviews || 0,
            bestRating: "5",
            worstRating: "1",
          },
        }),
      }
    : null;

  return (
    <div
      className={cx(
        "min-h-screen transition-[padding] duration-300 bg-[#faf9fb] text-[#111111]",
        showStickyCTA ? "pb-24" : "pb-20"
      )}
    >
      {selectedProduct && (
        <>
          <Helmet>
            <title>{selectedProduct.name} — Raphaaa</title>
            <meta name="description" content={selectedProduct.description?.slice(0, 160) || selectedProduct.name} />
            <meta property="og:title" content={`${selectedProduct.name} — Raphaaa`} />
            <meta property="og:type" content="product" />
            <meta
              property="og:image"
              content={
                selectedProduct.colorVariants?.[0]?.images?.[0]?.url ||
                selectedProduct.images?.[0]?.url ||
                ""
              }
            />
            <meta property="og:url" content={typeof window !== "undefined" ? window.location.href : ""} />
            <meta property="product:price:amount" content={String(displayPrice)} />
            <meta property="product:price:currency" content="INR" />
            {productSchema && (
              <script type="application/ld+json">{JSON.stringify(productSchema)}</script>
            )}
          </Helmet>

          {/* Breadcrumb */}
          <div className="bg-[#F8FDFF] border-b border-[#7dd3fc]">
            <div className="max-w-[1436px] mx-auto px-6 md:px-10 lg:px-20 py-3 text-xs font-semibold flex items-center gap-2 flex-wrap">
              <span onClick={() => navigate("/")} className="cursor-pointer text-[#707072] hover:text-[#111111] transition">Home</span>
              <span className="text-[#D4D5D9]">/</span>
              {selectedProduct.category && (
                <>
                  <span
                    onClick={() => navigate(`/collections/${selectedProduct.category.toLowerCase()}`)}
                    className="cursor-pointer capitalize text-[#707072] hover:text-[#111111] transition"
                  >
                    {selectedProduct.category}
                  </span>
                  <span className="text-[#D4D5D9]">/</span>
                </>
              )}
              <span className="text-[#111111] truncate max-w-[220px]">{selectedProduct.name}</span>
            </div>
          </div>

          <div className="max-w-[1436px] mx-auto px-4 md:px-8 lg:px-20 pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
              {/* LEFT: Image Gallery */}
              <div className="lg:col-span-5">
                <div className="lg:sticky lg:top-20">
                  <div className="flex gap-3 relative">
                    {/* Thumbnails (desktop) */}
                    <div className="hidden md:flex flex-col gap-2 flex-shrink-0 w-20">
                      {displayImages.map((img, i) => (
                        <button
                          key={i}
                          onClick={() => setMainImage(img.url)}
                          className={cx(
                            "w-20 h-20 rounded overflow-hidden border-2 transition-all flex-shrink-0 bg-[#f5f3f5]",
                            effectiveMainImage === img.url
                              ? "border-[#7DD3FC]"
                              : "border-transparent opacity-70 hover:opacity-100"
                          )}
                        >
                          <img
                            src={img.url}
                            alt={img.altText || `View ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>

                    {/* Main image */}
                    <div className="flex-1 relative">
                      {saleUpcoming && (
                        <div className="absolute top-3 left-3 z-10 bg-[#e0a526] text-white text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-sm">
                          {timedOfferBadge}
                        </div>
                      )}
                      {saleLive && (
                        <div className="absolute top-3 left-3 z-10 bg-[#0D8275] text-white text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-sm">
                          {timedOfferBadge}
                        </div>
                      )}
                      {!timedOffer && selectedProduct.offerPercentage > 0 && (
                        <div className="absolute top-3 left-3 z-10 bg-[#bb0013] text-white text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-sm">
                          {selectedProduct.offerPercentage}% off
                        </div>
                      )}
                      {new Date() - new Date(selectedProduct.createdAt) < 2 * 24 * 60 * 60 * 1000 && (
                        <div className="absolute top-3 right-14 z-10 bg-[#7DD3FC] text-[#111111] text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-sm">
                          New
                        </div>
                      )}

                      <div
                        className={cx(
                          "relative w-full aspect-square overflow-hidden select-none rounded bg-[#f5f3f5] border border-[#EEEEEE]",
                          zoom.active ? "cursor-crosshair" : "cursor-zoom-in"
                        )}
                        onMouseEnter={handleZoomEnter}
                        onMouseLeave={handleZoomLeave}
                        onMouseMove={handleZoomMove}
                        onTouchStart={() => setZoom((s) => ({ ...s, active: true }))}
                        onTouchEnd={handleZoomLeave}
                        onTouchMove={handleZoomTouchMove}
                        onClick={() =>
                          handleImageClick(
                            effectiveMainImage,
                            Math.max(0, modalImages.findIndex((url) => url === effectiveMainImage))
                          )
                        }
                      >
                        <img
                          ref={imgRef}
                          src={effectiveMainImage || selectedProduct.images?.[0]?.url}
                          alt="Main Product"
                          className="w-full h-full object-contain select-none"
                          draggable={false}
                        />

                        {zoom.active && (
                          <div
                            className="hidden md:block absolute pointer-events-none border-2 border-[#7DD3FC] bg-[#7DD3FC]/15"
                            style={{
                              width: "33.33%",
                              height: "33.33%",
                              left: `calc(${zoom.x}% - 16.67%)`,
                              top: `calc(${zoom.y}% - 16.67%)`,
                            }}
                          />
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="absolute top-2 right-2 flex flex-col gap-2 z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            isInWishlist(selectedProduct._id)
                              ? handleRemoveFromWishlist(selectedProduct._id)
                              : handleAddToWishlist(selectedProduct);
                          }}
                          className={cx(
                            "w-11 h-11 flex items-center justify-center rounded-full border bg-white/95 transition-all hover:scale-105",
                            isInWishlist(selectedProduct._id)
                              ? "text-[#E11B22] border-[#E11B22]"
                              : "text-[#111111] border-[#EEEEEE] hover:border-[#7DD3FC]"
                          )}
                        >
                          {isInWishlist(selectedProduct._id) ? (
                            <AiFillHeart className="text-lg" />
                          ) : (
                            <AiOutlineHeart className="text-lg" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShareOpen(true);
                          }}
                          className="w-11 h-11 flex items-center justify-center rounded-full border border-[#EEEEEE] bg-white/95 text-[#111111] hover:border-[#7DD3FC] hover:scale-105 transition"
                        >
                          <FiShare2 className="text-base" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Mobile thumbnails */}
                  <div className="flex md:hidden mt-3 gap-2 overflow-x-auto pb-1">
                    {displayImages.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setMainImage(img.url)}
                        className={cx(
                          "w-16 h-16 rounded overflow-hidden border-2 flex-shrink-0 transition-all bg-[#f5f3f5]",
                          effectiveMainImage === img.url
                            ? "border-[#7DD3FC]"
                            : "border-transparent opacity-60 hover:opacity-100"
                        )}
                      >
                        <img src={img.url} alt={img.altText || `View ${i + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>

                  <p className="hidden md:flex items-center justify-center gap-1.5 mt-3 text-[11px] text-[#707072]">
                    <BsSearch size={10} />
                    Move mouse over image to zoom
                  </p>
                </div>
              </div>

              {/* RIGHT */}
              <div className="lg:col-span-7 lg:grid lg:grid-cols-7 lg:gap-8 lg:items-start">
                {/* MIDDLE — product info */}
                <div className="lg:col-span-4 min-w-0 space-y-5">
                  {/* Brand + Title */}
                  <div>
                    {selectedProduct.brand && (
                      <p className="text-[11px] font-bold tracking-[0.15em] text-[#707072] uppercase mb-2">
                        {selectedProduct.brand}
                      </p>
                    )}
                    <h1 className="text-2xl md:text-[28px] font-bold text-[#111111] leading-snug tracking-[-0.02em]">
                      {selectedProduct.name}
                    </h1>
                  </div>

                  {/* Rating row */}
                  {selectedProduct.rating > 0 && selectedProduct.numReviews > 0 && (
                    <div className="flex items-center gap-3 flex-wrap pb-3 border-b border-[#EEEEEE]">
                      <div className="flex items-center gap-1 bg-[#0D8275] text-white text-xs font-bold px-2 py-0.5 rounded">
                        {selectedProduct.rating.toFixed(1)} ★
                      </div>
                      <span className="text-[#707072] text-xs font-medium">
                        {selectedProduct.numReviews} ratings
                      </span>
                      <span className="ml-auto flex items-center gap-1 text-[#707072] text-[11px] font-medium">
                        <BsPatchCheckFill className="text-[#0D8275]" /> Raphaaa Assured
                      </span>
                    </div>
                  )}

                  {/* Price */}
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="text-[28px] font-extrabold text-[#111111]">
                        ₹{Math.floor(displayPrice).toLocaleString("en-IN")}
                      </span>
                      {showDiscount && (
                        <>
                          <span className="text-base text-[#707072] line-through">
                            ₹{Math.floor(originalPrice).toLocaleString("en-IN")}
                          </span>
                          <span className="text-[#bb0013] font-bold text-sm">
                            ({resolvedOfferPercentage || selectedProduct.offerPercentage || 0}% OFF)
                          </span>
                        </>
                      )}
                    </div>
                    {showDiscount && (
                      <p className="text-[#0D8275] text-xs font-semibold">
                        You save ₹{Math.floor(Math.max(0, originalPrice - displayPrice)).toLocaleString("en-IN")}
                      </p>
                    )}
                    {selectedProduct.mrp && selectedProduct.mrp > (displayPrice || selectedProduct.price) && (
                      <p className="text-xs text-[#707072]">
                        MRP: <span className="line-through">₹{Math.floor(selectedProduct.mrp).toLocaleString("en-IN")}</span>
                        <span className="ml-1.5 text-[#0D8275] font-semibold">
                          {Math.round(100 - ((displayPrice || selectedProduct.price) / selectedProduct.mrp) * 100)}% off on MRP
                        </span>
                      </p>
                    )}
                    <p className="text-xs text-[#707072]">Inclusive of all taxes. Free delivery above ₹999.</p>
                    {finalPrice && (
                      <div className="mt-2 inline-flex items-center gap-2 bg-[#e6f6f3] border border-[#0D8275]/30 px-3 py-1.5 rounded text-sm text-[#0D8275]">
                        <span className="font-bold">Coupon price: ₹{finalPrice}</span>
                        <span className="text-[#0D8275] text-xs">Applied!</span>
                      </div>
                    )}
                  </div>

                  {/* Trust badges */}
                  <div className="flex flex-wrap gap-x-5 gap-y-2 py-2">
                    {(() => {
                      const rp = selectedProduct?.returnPolicy;
                      const returnLabel =
                        rp && rp.eligible === false
                          ? "No returns"
                          : `${Number(rp?.days || 7)}-day returns`;
                      const defaults = [
                        { icon: "🚚", label: "Free delivery above ₹999" },
                        { icon: "↩", label: returnLabel },
                        { icon: "✔", label: "Authentic product" },
                      ];
                      const badges = Array.isArray(selectedProduct?.trustBadges)
                        ? selectedProduct.trustBadges.filter(Boolean).slice(0, 6)
                        : [];
                      if (badges.length === 0) return defaults;
                      return badges.map((b) => ({ icon: "✔", label: b }));
                    })().map(({ icon, label }) => (
                      <span key={label} className="flex items-center gap-1.5 text-[12px] font-medium text-[#444748]">
                        <span className="text-[#0D8275]">{icon}</span> {label}
                      </span>
                    ))}
                  </div>

                  {/* Colour */}
                  {effectiveColors.length > 0 && (
                    <div className="pt-2">
                      <p className="text-[11px] font-bold tracking-[0.12em] text-[#707072] uppercase mb-3">
                        COLOUR:{" "}
                        {selectedColor && (
                          <span className="font-semibold text-[#111111] normal-case tracking-normal text-sm capitalize">
                            {hasColorVariants
                              ? (selectedProduct.colorVariants.find(
                                  (cv) => cv.color.toLowerCase() === selectedColor.toLowerCase()
                                )?.colorName || selectedColor)
                              : selectedColor}
                          </span>
                        )}
                      </p>
                      <div className="flex flex-wrap gap-3">
                        {effectiveColors.map((color) => {
                          const cvEntry = hasColorVariants
                            ? selectedProduct.colorVariants.find(
                                (cv) => cv.color.toLowerCase() === color.toLowerCase()
                              )
                            : null;
                          const thumb = cvEntry?.images?.[0]?.url;
                          const isActive = selectedColor.toLowerCase() === color.toLowerCase();
                          return (
                            <button
                              key={color}
                              onClick={() => {
                                setSelectedColor(color);
                                setSelectedSize("");
                                const firstImg = cvEntry?.images?.[0]?.url;
                                if (firstImg) {
                                  setMainImage(firstImg);
                                } else {
                                  const colorIdx = effectiveColors.indexOf(color);
                                  const posImg =
                                    (colorIdx >= 0 && selectedProduct?.images?.[colorIdx]?.url) ||
                                    selectedProduct?.images?.[0]?.url;
                                  if (posImg) setMainImage(posImg);
                                }
                              }}
                              title={cvEntry?.colorName || color}
                              className={cx(
                                "relative transition-all duration-200",
                                thumb
                                  ? cx(
                                      "w-14 h-14 rounded overflow-hidden",
                                      isActive
                                        ? "ring-2 ring-[#7DD3FC] ring-offset-2"
                                        : "opacity-60 hover:opacity-100"
                                    )
                                  : cx(
                                      "w-8 h-8 rounded-full border border-[#D4D5D9]",
                                      isActive ? "ring-2 ring-[#7DD3FC] ring-offset-2" : ""
                                    )
                              )}
                              style={!thumb ? { backgroundColor: color.toLowerCase() } : {}}
                            >
                              {thumb ? (
                                <img
                                  src={thumb}
                                  alt={cvEntry?.colorName || color}
                                  className="w-full h-full object-cover"
                                />
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Size */}
                  {effectiveSizes.length > 0 && (
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[11px] font-bold tracking-[0.12em] text-[#707072] uppercase">
                          SIZE:{" "}
                          {selectedSize && (
                            <span className="font-bold text-[#111111] normal-case tracking-normal text-sm">
                              {selectedSize}
                            </span>
                          )}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedProduct?.sizeChart?.imageUrl && !selectedProduct?.sizeChart?.measureImageUrl) {
                              toast.error("Size chart not available for this product.");
                              return;
                            }
                            setSizeChartTab("chart");
                            setSizeChartOpen(true);
                          }}
                          className="text-[12px] font-semibold text-[#707072] hover:text-[#111111] underline underline-offset-2 transition flex items-center gap-1"
                        >
                          <FaRulerHorizontal size={13} /> Size Guide
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                        {effectiveSizes.map((size) => {
                          const sizeStock = getSizeStock(size);
                          const outOfStock = !isPrebookOpenMode && sizeStock <= 0;
                          const isLow = !outOfStock && sizeStock <= 5;

                          return (
                            <div key={size} className="flex flex-col items-center gap-1">
                              <button
                                onClick={() => !outOfStock && setSelectedSize(size)}
                                disabled={outOfStock}
                                title={outOfStock ? "Out of stock" : `${size} — ${sizeStock} left`}
                                className={cx(
                                  "min-w-[56px] h-12 px-3 rounded text-xs font-bold border transition-all relative",
                                  outOfStock
                                    ? "border-[#EEEEEE] text-[#D4D5D9] bg-white cursor-not-allowed line-through"
                                    : selectedSize === size
                                    ? "bg-[#111111] text-white border-[#111111]"
                                    : "border-[#D4D5D9] text-[#111111] hover:border-[#7DD3FC] bg-white"
                                )}
                              >
                                {size}
                              </button>
                              {outOfStock ? (
                                <span className="text-[9px] font-bold text-[#D4D5D9] tracking-wide uppercase">
                                  sold out
                                </span>
                              ) : isLow ? (
                                <span className="text-[10px] font-bold bg-[#bb0013] text-white px-2 py-0.5 rounded-full leading-none whitespace-nowrap">
                                  {sizeStock} left
                                </span>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                      {matchedColorSizeEntry?.designName && (
                        <p className="text-xs text-[#707072] mt-2">
                          Design: <span className="font-medium text-[#111111]">{matchedColorSizeEntry.designName}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Quantity + Stock */}
                  <div className="flex items-center gap-4 flex-wrap pt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold tracking-widest text-[#707072] uppercase">QTY</span>
                      <div className="flex items-center border border-[#D4D5D9] rounded overflow-hidden bg-white">
                        <button
                          onClick={() => handleQuantityChange("minus")}
                          disabled={quantity <= 1}
                          className="w-9 h-10 flex items-center justify-center text-[#111111] hover:bg-[#f5f3f5] disabled:opacity-30 disabled:cursor-not-allowed border-r border-[#EEEEEE] transition text-lg"
                        >−</button>
                        <span className="w-10 text-center text-sm font-bold text-[#111111]">{quantity}</span>
                        <button
                          onClick={() => handleQuantityChange("plus")}
                          disabled={quantity >= 10 || quantity >= selectedVariantStock || isOutOfStock}
                          className="w-9 h-10 flex items-center justify-center text-[#111111] hover:bg-[#f5f3f5] disabled:opacity-30 disabled:cursor-not-allowed border-l border-[#EEEEEE] transition text-lg"
                        >+</button>
                      </div>
                    </div>
                    <div>
                      {isOutOfStock ? (
                        <span className="text-[11px] font-bold text-[#bb0013] bg-[#ffe9ec] border border-[#bb0013]/20 px-2.5 py-1 rounded-full">
                          Out of Stock
                        </span>
                      ) : selectedVariantStock < 10 ? (
                        <span className="text-[11px] font-bold text-[#7a4a12] bg-[#fdebc8] border border-[#c98a12]/30 px-2.5 py-1 rounded-full">
                          Only {selectedVariantStock} left
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-[#0D8275] bg-[#e6f6f3] border border-[#0D8275]/20 px-2.5 py-1 rounded-full">
                          In Stock
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Prebooking banners */}
                  {selectedProduct?.prebooking?.enabled && selectedProduct.prebooking.status === "open" && (
                    <div className="rounded border border-violet-200 bg-violet-50 px-4 py-3.5 text-sm text-violet-800 space-y-2.5">
                      <p className="font-semibold">You can prebook it here.</p>
                      {myPrebooking && myPrebooking.status === "booked" ? (
                        <p className="text-xs font-semibold text-[#0D8275]">
                          🎉 You've reserved a spot
                          {(myPrebooking.color || myPrebooking.size) && (
                            <> — {[myPrebooking.color, myPrebooking.size].filter(Boolean).join(", ")}</>
                          )}
                          ! You will be notified when it's ready.
                        </p>
                      ) : Number(selectedProduct.prebooking.bookedCount) >= Number(selectedProduct.prebooking.limit) ? (
                        <p className="text-xs font-semibold text-[#bb0013]">All prebooking slots are full.</p>
                      ) : (
                        <button
                          type="button"
                          onClick={handlePrebook}
                          disabled={prebookSubmitting}
                          className="inline-flex items-center justify-center px-4 py-2 rounded text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 transition disabled:opacity-50"
                        >
                          {prebookSubmitting ? "Reserving…" : "Prebook Now"}
                        </button>
                      )}
                    </div>
                  )}

                  {selectedProduct?.prebooking?.enabled &&
                    selectedProduct.prebooking.status === "ready" &&
                    myPrebooking &&
                    ["ready", "fulfilled"].includes(myPrebooking.status) && (
                      <div className="rounded border border-[#0D8275]/30 bg-[#e6f6f3] px-4 py-3.5 text-sm text-[#0D8275]">
                        <p className="font-semibold">✅ Your prebooked item is ready — proceed to buy it below.</p>
                      </div>
                    )}

                  {/* CTA */}
                  {selectedProduct?.prebooking?.enabled && selectedProduct.prebooking.status === "open" ? null : !isOutOfStock ? (
                    <div className="flex gap-3 flex-col sm:flex-row pt-3">
                      <button
                        onClick={handleAddToCart}
                        disabled={isButtonDisabled}
                        className={cx(
                          "flex-1 flex items-center justify-center gap-2 py-3.5 rounded font-bold text-sm tracking-wide transition-all active:scale-[0.99]",
                          isButtonDisabled
                            ? "bg-[#f5f3f5] text-[#D4D5D9] cursor-not-allowed"
                            : "bg-[#7DD3FC] text-[#111111] hover:brightness-95"
                        )}
                      >
                        <FaCartShopping className="text-base" />
                        {isAddingToCart ? "Adding…" : "Add to Bag"}
                      </button>
                      <button
                        onClick={handleBuyNow}
                        disabled={isBuyNowDisabled || maxLimitReached}
                        className={cx(
                          "flex-1 flex items-center justify-center gap-2 py-3.5 rounded font-bold text-sm tracking-wide border transition-all active:scale-[0.99]",
                          isBuyNowDisabled || maxLimitReached
                            ? "border-[#EEEEEE] text-[#D4D5D9] cursor-not-allowed bg-white"
                            : "border-[#111111] text-[#111111] bg-white hover:bg-[#111111] hover:text-white"
                        )}
                      >
                        <FiZap className={cx("text-base", isBuyingNow && "animate-pulse")} />
                        {isBuyingNow ? "Processing…" : "Buy Now"}
                      </button>
                    </div>
                  ) : (
                    <div className="rounded border border-[#7DD3FC] bg-[#F8FDFF] px-4 py-3 text-sm font-medium text-[#111111] text-center space-y-3">
                      <p>This product is currently out of stock.</p>
                      <button
                        type="button"
                        onClick={handleNotifyMe}
                        disabled={isNotifySubmitting || isNotifySubscribed || !selectedVariantSku}
                        className={cx(
                          "mx-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded text-sm font-bold border transition",
                          isNotifySubmitting || isNotifySubscribed || !selectedVariantSku
                            ? "border-[#EEEEEE] bg-[#f5f3f5] text-[#707072] cursor-not-allowed"
                            : "border-[#111111] text-[#111111] bg-white hover:bg-[#111111] hover:text-white"
                        )}
                      >
                        <FiBell className="text-base" />
                        {isNotifySubscribed ? "Subscribed" : isNotifySubmitting ? "Submitting..." : "Notify Me"}
                      </button>
                    </div>
                  )}

                  {/* Delivery Check */}
                  <div className="pt-4 space-y-3 border-t border-[#EEEEEE]">
                    <p className="text-[11px] font-bold tracking-[0.12em] text-[#707072] uppercase">
                      CHECK DELIVERY
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter 6-digit pincode"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        maxLength={6}
                        className="flex-1 px-3 py-2.5 text-sm border border-[#D4D5D9] bg-white rounded outline-none focus:border-[#7DD3FC] transition"
                      />
                      <button
                        onClick={handleDeliveryCheck}
                        disabled={isCheckingDelivery}
                        className="px-5 py-2.5 text-xs font-bold tracking-wide rounded border border-[#D4D5D9] bg-white text-[#111111] hover:bg-[#f5f3f5] transition disabled:opacity-50"
                      >
                        {isCheckingDelivery ? "Checking…" : "Check"}
                      </button>
                    </div>
                    {deliveryInfo && (
                      <div
                        className={cx(
                          "p-3 rounded text-sm border",
                          deliveryInfo.isDeliverable
                            ? "bg-[#e6f6f3] border-[#0D8275]/30 text-[#0D8275]"
                            : "bg-[#ffe9ec] border-[#bb0013]/20 text-[#bb0013]"
                        )}
                      >
                        <p className="font-semibold">{deliveryInfo.message}</p>
                        {deliveryInfo.isDeliverable && deliveryInfo.deliveryDate && (
                          <p className="mt-0.5 text-xs">
                            Estimated: <strong>{deliveryInfo.deliveryDate}</strong> ({deliveryInfo.deliveryDays} days)
                          </p>
                        )}
                        {deliveryInfo.isDeliverable && deliveryInfo.courierName && (
                          <p className="mt-0.5 text-xs">
                            Courier: <strong>{deliveryInfo.courierName}</strong>
                            {deliveryInfo.courierCount > 1 ? ` +${deliveryInfo.courierCount - 1} more` : ""}
                          </p>
                        )}
                        {deliveryInfo.isDeliverable && (
                          <p className="mt-0.5 text-xs">
                            COD: <strong>{deliveryInfo.codAvailable ? "Available" : "Not available"}</strong>
                          </p>
                        )}
                        {deliveryInfo.location && (
                          <p className="mt-0.5 text-xs text-[#707072]">{deliveryInfo.location}</p>
                        )}
                      </div>
                    )}
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#444748]">
                      {selectedProduct?.deliveryPromise?.text && (
                        <div className="p-2.5 rounded bg-[#f5f3f5] border border-[#EEEEEE]">
                          <span className="font-semibold text-[#111111]">Delivery promise:</span>{" "}
                          {selectedProduct.deliveryPromise.text}
                        </div>
                      )}
                      {(() => {
                        const rp = selectedProduct?.returnPolicy;
                        if (!rp) return null;
                        const label =
                          rp.eligible === false ? "Not eligible for return" : `${Number(rp.days || 7)}-day returns`;
                        const text = String(rp.text || "").trim();
                        return (
                          <div className="p-2.5 rounded bg-[#f5f3f5] border border-[#EEEEEE]">
                            <span className="font-semibold text-[#111111]">Return policy:</span> {label}
                            {text ? <span className="text-[#707072]"> · {text}</span> : null}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                {/* end MIDDLE */}

                {/* RIGHT — Offers */}
                <div className="lg:col-span-3 min-w-0 space-y-3 mt-6 lg:mt-0 lg:sticky lg:top-20">
                  {/* Available Offers */}
                  {(couponOffers.length > 0 || autoOffers.length > 0) && (
                    <div className="rounded border border-[#0D8275]/20 bg-[#e6f6f3]/40 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[#0D8275]">🏷️</span>
                        <h4 className="text-sm font-bold text-[#111111]">Available Offers</h4>
                      </div>
                      <ul className="space-y-3">
                        {couponOffers.map((offer) => {
                          const applied = isCouponApplied(offer.couponCode);
                          const saving = estimateOfferSaving(offer);
                          return (
                            <li key={offer._id} className="flex items-start gap-3">
                              <span className="text-[#0D8275] mt-0.5 shrink-0">%</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] text-[#111111] leading-snug">
                                  <span className="font-semibold">{offer.title}</span>
                                  {offer.description ? ` — ${offer.description}` : ""}
                                </p>
                                <p className="text-[11px] text-[#707072] mt-0.5">
                                  Code{" "}
                                  <span className="font-mono font-semibold text-[#111111]">
                                    {offer.couponCode}
                                  </span>
                                  {offer.paymentMethods?.length > 0 && (
                                    <>
                                      {" "}· on{" "}
                                      {offer.paymentMethods.map((pm) => PM_LABELS[pm] || pm).join(", ")}
                                    </>
                                  )}
                                  {offer.minCartSubtotal
                                    ? ` · min cart ₹${Number(offer.minCartSubtotal).toLocaleString("en-IN")}`
                                    : ""}
                                  {applied && saving > 0
                                    ? ` · saves ~₹${saving.toLocaleString("en-IN")}`
                                    : ""}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleApplyCouponOffer(offer)}
                                className={cx(
                                  "shrink-0 text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded transition",
                                  applied
                                    ? "bg-[#0D8275] text-white hover:brightness-95"
                                    : "border border-[#0D8275] text-[#0D8275] hover:bg-[#0D8275]/10"
                                )}
                              >
                                {applied ? "Applied ✓" : "Apply"}
                              </button>
                            </li>
                          );
                        })}
                        {autoOffers.map((offer) => (
                          <li key={offer._id} className="flex items-start gap-3">
                            <span className="text-[#0D8275] mt-0.5 shrink-0">✓</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] text-[#111111] leading-snug">
                                <span className="font-semibold">{offer.title}</span>
                                {offer.description ? ` — ${offer.description}` : ""}
                              </p>
                              <p className="text-[11px] text-[#0D8275] font-medium mt-0.5">
                                Applied automatically at checkout
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                      {couponOffers.some((o) => isCouponApplied(o.couponCode)) && (
                        <p className="text-[11px] text-[#707072] mt-3">
                          Applied coupons are carried to checkout. Final savings depend on
                          your cart and payment method.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Bank / Payment Offers */}
                  {paymentOffers.length > 0 && (
                    <div className="rounded border border-[#7DD3FC]/40 bg-[#F8FDFF] p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <h4 className="text-sm font-bold text-[#111111]">Bank Offers</h4>
                      </div>
                      <ul className="space-y-2">
                        {paymentOffers.slice(0, 2).map((offer) => (
                          <li key={offer.id} className="text-[12px] text-[#444748] leading-snug flex items-center gap-2">
                            {offer.logo ? (
                              <img
                                src={offer.logo}
                                alt=""
                                className="h-6 w-9 object-contain shrink-0 bg-white rounded border border-[#EEEEEE] p-0.5"
                              />
                            ) : (
                              <span className="text-[#7DD3FC] shrink-0">•</span>
                            )}
                            <span>
                              {offer.displayText}
                              {offer.tncUrl && (
                                <a
                                  href={offer.tncUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-1 text-[#0D8275] underline"
                                >
                                  T&amp;C
                                </a>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {paymentOffers.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setBankOffersOpen(true)}
                          className="mt-2 text-xs font-semibold text-[#0D8275] hover:text-[#0D8275]/80"
                        >
                          View all {paymentOffers.length} offers →
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {/* end RIGHT */}
              </div>
            </div>
          </div>

          {/* Product Details + Specs */}
          <div className="max-w-[1436px] mx-auto px-4 md:px-8 lg:px-20 py-6">
            <h3 className="text-lg font-bold text-[#111111] border-b-2 border-[#7DD3FC] mb-4 pb-2 inline-block">
              Product Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
              {selectedProduct.description && (
                <div>
                  <h4 className="font-bold text-[#111111] text-sm mb-3 tracking-wide">Description</h4>
                  <p className="text-sm text-[#444748] leading-relaxed whitespace-pre-line">
                    {(() => {
                      const description = String(selectedProduct.description || "");
                      const previewLength = 260;
                      const isLong = description.length > previewLength;
                      if (!isLong || showFullDescription) return description;
                      return `${description.slice(0, previewLength)}...`;
                    })()}
                  </p>
                  {String(selectedProduct.description || "").length > 260 && (
                    <button
                      type="button"
                      onClick={() => setShowFullDescription((prev) => !prev)}
                      className="mt-2 text-sm font-semibold text-[#0D8275] hover:text-[#0D8275]/80"
                    >
                      {showFullDescription ? "See less" : "See more"}
                    </button>
                  )}
                </div>
              )}
              <div>
                <h4 className="font-bold text-[#111111] text-sm mb-3 tracking-wide">Specifications</h4>
                <table className="w-full text-sm border border-[#EEEEEE] rounded overflow-hidden">
                  <tbody>
                    {[
                      ["Brand", selectedProduct.brand],
                      ["Material", selectedProduct.material],
                      ["Material Composition", selectedProduct.materialComposition],
                      ["Gender", selectedProduct.gender],
                      ["Net Quantity", selectedProduct.netQuantity],
                      ["Country of Origin", selectedProduct.countryOfOrigin],
                      ["Wash Care", selectedProduct.washCare],
                      ["Manufacturer", selectedProduct.manufacturerInfo],
                      selectedProduct.dimensions && [
                        "Dimensions",
                        `${selectedProduct.dimensions.length || 0} × ${selectedProduct.dimensions.width || 0} × ${selectedProduct.dimensions.height || 0} cm`,
                      ],
                      selectedProduct.weight && ["Weight", `${selectedProduct.weight} gm`],
                    ]
                      .filter((row) => row && row[1])
                      .map(([label, value], i) => (
                        <tr key={label} className={i % 2 === 0 ? "bg-[#faf9fb]" : "bg-white"}>
                          <td className="px-3 py-2.5 text-[#707072] font-medium w-[40%] border-r border-[#EEEEEE]">
                            {label}
                          </td>
                          <td className="px-3 py-2.5 text-[#111111]">{value}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Ratings & Reviews */}
          <div className="max-w-[1436px] mx-auto px-4 md:px-8 lg:px-20 py-6">
            <h2 className="text-lg font-bold text-[#111111] mb-4 pb-2 border-b border-[#7DD3FC]">
              Ratings &amp; Reviews
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {(() => {
                const LABELS = { 5: "Excellent", 4: "Very Good", 3: "Good", 2: "Average", 1: "Poor" };
                const BAR_COLOR = (star) =>
                  star >= 4 ? "bg-[#0D8275]" : star === 3 ? "bg-[#e0a526]" : star === 2 ? "bg-[#e0a526]" : "bg-[#bb0013]";
                const totalRatings =
                  selectedProduct?.numRatings ?? ratingCounts.reduce((sum, r) => sum + (r.count || 0), 0);
                const avg = selectedProduct?.rating || 0;
                const totalReviewCount = selectedProduct?.numReviews || 0;
                return (
                  <div className="bg-[#f5f3f5] rounded p-5 self-start border border-[#EEEEEE]">
                    <div className="mb-4">
                      <p className="text-4xl font-extrabold text-[#111111]">{avg.toFixed(1)}</p>
                      <div className="flex gap-0.5 mt-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <span
                            key={s}
                            className={cx(
                              "text-lg",
                              s <= Math.round(avg) ? "text-[#0D8275]" : "text-[#D4D5D9]"
                            )}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-[#707072] mt-1">
                        {totalRatings} Ratings · {totalReviewCount} Reviews
                      </p>
                    </div>
                    <div className="space-y-2">
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = ratingCounts.find((r) => r.star === star)?.count || 0;
                        const pct = totalRatings ? (count / totalRatings) * 100 : 0;
                        return (
                          <div key={star} className="flex items-center gap-2 text-xs text-[#707072]">
                            <span className="w-16 shrink-0">{LABELS[star]}</span>
                            <div className="flex-1 h-1.5 bg-[#EEEEEE] rounded-full overflow-hidden">
                              <div
                                className={cx("h-full rounded-full transition-all duration-500", BAR_COLOR(star))}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-5 text-right">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <p className="font-semibold text-[#111111] text-sm">
                    {sortedReviews.length} Review{sortedReviews.length !== 1 ? "s" : ""}
                    {(ratingFilter !== null || withPhotosFilter) && (
                      <span className="ml-2 text-xs text-[#0D8275] font-normal">(filtered)</span>
                    )}
                  </p>
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="text-xs border border-[#D4D5D9] rounded px-2 py-1.5 text-[#111111] bg-white outline-none focus:border-[#7DD3FC]"
                  >
                    <option value="newest">Newest First</option>
                    <option value="highest">Highest Rating</option>
                    <option value="lowest">Lowest Rating</option>
                  </select>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = reviews.filter((r) => r.rating === star).length;
                    return (
                      <button
                        key={star}
                        onClick={() => setRatingFilter(ratingFilter === star ? null : star)}
                        className={cx(
                          "flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border transition",
                          ratingFilter === star
                            ? "bg-[#111111] border-[#111111] text-white"
                            : "bg-white border-[#D4D5D9] text-[#111111] hover:border-[#7DD3FC]"
                        )}
                      >
                        {star}★ <span className="opacity-60">({count})</span>
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setWithPhotosFilter((v) => !v)}
                    className={cx(
                      "flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border transition",
                      withPhotosFilter
                        ? "bg-[#111111] border-[#111111] text-white"
                        : "bg-white border-[#D4D5D9] text-[#111111] hover:border-[#7DD3FC]"
                    )}
                  >
                    📷 With Photos
                  </button>
                  {(ratingFilter !== null || withPhotosFilter) && (
                    <button
                      onClick={() => {
                        setRatingFilter(null);
                        setWithPhotosFilter(false);
                      }}
                      className="text-xs text-[#bb0013] px-3 py-1.5 rounded-full border border-[#bb0013]/30 hover:bg-[#ffe9ec] transition"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
                {sortedReviews.length > 0 ? (
                  <>
                    <div className="space-y-3">
                      {(showAllReviews ? sortedReviews : sortedReviews.slice(0, 3)).map((review, index) => (
                        <div
                          key={index}
                          className="p-4 rounded border border-[#EEEEEE] bg-white hover:bg-[#faf9fb] transition"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-[#7DD3FC]/30 text-[#0D8275] rounded-full flex items-center justify-center font-bold text-base flex-shrink-0">
                              {review.user?.name?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div>
                                  <p className="font-semibold text-[#111111] text-sm">
                                    {review.user?.name || "Anonymous"}
                                  </p>
                                  <p className="text-xs text-[#707072] mt-0.5">
                                    {new Date(review.createdAt).toLocaleDateString("en-IN", {
                                      day: "numeric",
                                      month: "long",
                                      year: "numeric",
                                    })}
                                  </p>
                                </div>
                                <span
                                  className={cx(
                                    "text-white text-xs font-bold px-2 py-0.5 rounded",
                                    review.rating >= 4
                                      ? "bg-[#0D8275]"
                                      : review.rating === 3
                                      ? "bg-[#e0a526]"
                                      : review.rating === 2
                                      ? "bg-[#e0a526]"
                                      : "bg-[#bb0013]"
                                  )}
                                >
                                  {review.rating} ★
                                </span>
                              </div>
                              <p className="text-[#444748] text-sm mt-2 leading-relaxed">{review.comment}</p>
                              {review.image && review.image.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {review.image.map((imgUrl, idx) => (
                                    <img
                                      key={idx}
                                      src={imgUrl}
                                      alt={`Review ${idx + 1}`}
                                      onClick={() => handleImageClick(imgUrl)}
                                      className="w-16 h-16 rounded object-cover cursor-zoom-in border border-[#EEEEEE] hover:border-[#7DD3FC] transition"
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {sortedReviews.length > 3 && (
                      <div className="text-center mt-4">
                        <button
                          onClick={() => setShowAllReviews((v) => !v)}
                          className="px-5 py-2 text-sm font-semibold text-[#111111] border border-[#D4D5D9] rounded bg-white hover:bg-[#f5f3f5] transition"
                        >
                          {showAllReviews ? "Show Less" : `View All ${sortedReviews.length} Reviews`}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-10 text-[#707072]">
                    <p className="text-3xl mb-2">💬</p>
                    <p className="font-medium text-[#111111]">No reviews yet</p>
                    <p className="text-sm mt-1">Be the first to review this product</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Product Q&A */}
          

          {/* Frequently Bought Together */}
          {Array.isArray(fbtProducts) && fbtProducts.length > 0 && (
            <div className="max-w-[1436px] mx-auto px-4 md:px-8 lg:px-20 border-t border-[#EEEEEE] mt-8 pt-8 pb-4">
              <h3 className="text-[11px] font-bold tracking-[0.15em] text-[#707072] uppercase mb-6">
                Frequently Bought Together
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
                {fbtProducts.slice(0, 8).map((product) => {
                  const cardTimedOffer = getCardTimedOffer(product);
                  const cardSaleLive = isSaleLive(cardTimedOffer);
                  const cardSaleSoon = isSaleUpcoming(cardTimedOffer);
                  const colorVariantCount = getColorVariantCount(product);
                  const cardBadgeText = cardSaleLive
                    ? "Sale is live now"
                    : cardSaleSoon
                    ? `💥 Sale starts in ${formatCountdown(cardTimedOffer?.startsAt, now)}`
                    : "";

                  return (
                    <div
                      key={product._id}
                      onClick={() =>
                        navigate(
                          `/product/${product.name.toLowerCase().replace(/\s+/g, "-")}/p/${encodeURIComponent(product._id)}`
                        )
                      }
                      className="cursor-pointer group"
                    >
                      <div className="relative overflow-hidden bg-[#f5f3f5] aspect-[3/4] rounded mb-2.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            isInWishlist(product._id)
                              ? handleRemoveFromWishlist(product._id)
                              : handleAddToWishlist(product);
                          }}
                          className={cx(
                            "absolute top-2 right-2 z-10 w-9 h-9 flex items-center justify-center rounded-full border bg-white/95 transition-all",
                            isInWishlist(product._id)
                              ? "border-[#E11B22] text-[#E11B22]"
                              : "border-[#EEEEEE] text-[#111111] hover:border-[#7DD3FC]"
                          )}
                        >
                          {isInWishlist(product._id) ? (
                            <AiFillHeart className="text-base" />
                          ) : (
                            <AiOutlineHeart className="text-base" />
                          )}
                        </button>
                        <img
                          src={product.colorVariants?.[0]?.images?.[0]?.url || product.images?.[0]?.url || "/no-image.png"}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                        />
                        {cardSaleSoon && (
                          <div className="absolute top-2 left-2 bg-[#e0a526] text-white text-[9px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded-sm">
                            {cardBadgeText}
                          </div>
                        )}
                        {cardSaleLive && (
                          <div className="absolute top-2 left-2 bg-[#0D8275] text-white text-[9px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded-sm">
                            {cardBadgeText}
                          </div>
                        )}
                        {!cardTimedOffer && product.offerPercentage > 0 && (
                          <div className="absolute top-2 left-2 bg-[#bb0013] text-white text-[9px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded-sm">
                            {product.offerPercentage}% off
                          </div>
                        )}
                        {colorVariantCount > 0 && (
                          <div className="absolute bottom-2 right-2 z-10 rounded-full bg-black/75 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white border border-white/10">
                            {colorVariantCount === 2
                              ? "2 variants"
                              : colorVariantCount > 2
                              ? "2+ variants available"
                              : "1 variant"}
                          </div>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-[#111111] leading-snug line-clamp-2">{product.name}</p>
                      <p className="text-xs text-[#707072] mt-0.5">{product.category}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Complete the Look */}
          {Array.isArray(ctlProducts) && ctlProducts.length > 0 && (
            <div className="max-w-[1436px] mx-auto px-4 md:px-8 lg:px-20 border-t border-[#EEEEEE] mt-8 pt-8 pb-4">
              <div className="flex items-center gap-3 mb-6">
                <h3 className="text-[11px] font-bold tracking-[0.15em] text-[#707072] uppercase">
                  Complete the Look
                </h3>
                <span className="text-[10px] font-semibold text-white bg-[#bb0013] px-2 py-0.5 rounded-full uppercase tracking-wide">
                  Style It
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                {ctlProducts.map((product) => {
                  const cardTimedOffer = getCardTimedOffer(product);
                  const cardSaleLive = isSaleLive(cardTimedOffer);
                  const cardSaleSoon = isSaleUpcoming(cardTimedOffer);
                  const colorVariantCount = getColorVariantCount(product);
                  const cardPrice = cardSaleLive
                    ? Number(cardTimedOffer?.discountPrice || product.price || 0)
                    : Number(product.discountPrice || product.price || 0);
                  const cardHasDiscount = cardSaleLive
                    ? Number(cardTimedOffer?.discountPrice || 0) < Number(product.price || 0)
                    : !cardTimedOffer && product.discountPrice && product.discountPrice < product.price;
                  const cardBadgeText = cardSaleLive
                    ? "Sale is live now"
                    : cardSaleSoon
                    ? `💥 Sale starts in ${formatCountdown(cardTimedOffer?.startsAt, now)}`
                    : "";

                  return (
                    <div
                      key={product._id}
                      onClick={() =>
                        navigate(
                          `/product/${product.name.toLowerCase().replace(/\s+/g, "-")}/p/${encodeURIComponent(product._id)}`
                        )
                      }
                      className="cursor-pointer group"
                    >
                      <div className="relative overflow-hidden bg-[#f5f3f5] aspect-[3/4] rounded mb-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            isInWishlist(product._id)
                              ? handleRemoveFromWishlist(product._id)
                              : handleAddToWishlist(product);
                          }}
                          className={cx(
                            "absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center rounded-full border bg-white/95 transition-all",
                            isInWishlist(product._id)
                              ? "border-[#E11B22] text-[#E11B22]"
                              : "border-[#EEEEEE] text-[#111111] hover:border-[#7DD3FC]"
                          )}
                        >
                          {isInWishlist(product._id) ? (
                            <AiFillHeart className="text-sm" />
                          ) : (
                            <AiOutlineHeart className="text-sm" />
                          )}
                        </button>
                        <img
                          src={product.colorVariants?.[0]?.images?.[0]?.url || product.images?.[0]?.url || "/no-image.png"}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                        />
                        {cardSaleSoon && (
                          <span className="absolute top-1.5 left-1.5 bg-[#e0a526] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                            {cardBadgeText}
                          </span>
                        )}
                        {cardSaleLive && (
                          <span className="absolute top-1.5 left-1.5 bg-[#0D8275] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                            {cardBadgeText}
                          </span>
                        )}
                        {!cardTimedOffer && product.offerPercentage > 0 && (
                          <span className="absolute top-1.5 left-1.5 bg-[#bb0013] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                            -{product.offerPercentage}%
                          </span>
                        )}
                        {colorVariantCount > 0 && (
                          <span className="absolute bottom-1.5 right-1.5 z-10 rounded-full bg-black/75 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white border border-white/10">
                            {colorVariantCount === 2
                              ? "2 variants"
                              : colorVariantCount > 2
                              ? "2+ variants available"
                              : "1 variant"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-[#111111] leading-snug line-clamp-2">{product.name}</p>
                      <p className="text-xs text-[#707072] mt-0.5 capitalize">{product.category}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {cardHasDiscount ? (
                          <>
                            <span className="text-xs font-bold text-[#111111]">
                              ₹{Math.floor(cardPrice).toLocaleString("en-IN")}
                            </span>
                            <span className="text-[10px] line-through text-[#707072]">
                              ₹{Math.floor(product.price).toLocaleString("en-IN")}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs font-bold text-[#111111]">
                            ₹{Math.floor(cardPrice).toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Similar Products */}
          {resolvedSimilarProducts.length > 0 && (
            <div className="max-w-[1436px] mx-auto px-4 md:px-8 lg:px-20 border-t border-[#7DD3FC] mt-8 pt-8 pb-4">
              <h3 className="text-[11px] font-bold tracking-[0.15em] text-[#707072] uppercase mb-6">
                You May Also Like
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
                {resolvedSimilarProducts.slice(0, displayCount).map((product) => {
                  const cardTimedOffer = getCardTimedOffer(product);
                  const cardSaleLive = isSaleLive(cardTimedOffer);
                  const cardSaleSoon = isSaleUpcoming(cardTimedOffer);
                  const colorVariantCount = getColorVariantCount(product);
                  const cardPrice = cardSaleLive
                    ? Number(cardTimedOffer?.discountPrice || product.price || 0)
                    : Number(product.discountPrice || product.price || 0);
                  const cardHasDiscount = cardSaleLive
                    ? Number(cardTimedOffer?.discountPrice || 0) < Number(product.price || 0)
                    : !cardTimedOffer && product.discountPrice && product.discountPrice < product.price;
                  const cardBadgeText = cardSaleLive
                    ? "Sale is live now"
                    : cardSaleSoon
                    ? `💥 Sale starts in ${formatCountdown(cardTimedOffer?.startsAt, now)}`
                    : "";

                  return (
                    <div
                      key={product._id}
                      onClick={() =>
                        navigate(
                          `/product/${product.name.toLowerCase().replace(/\s+/g, "-")}/p/${encodeURIComponent(product._id)}`
                        )
                      }
                      className="cursor-pointer group bg-white rounded border border-[#EEEEEE] p-3 hover:border-[#7DD3FC] transition"
                    >
                      <div className="relative overflow-hidden bg-[#f5f3f5] aspect-[3/4] rounded mb-2.5">
                        <img
                          src={product.colorVariants?.[0]?.images?.[0]?.url || product.images?.[0]?.url || "/no-image.png"}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                        />
                        {cardSaleSoon && (
                          <div className="absolute top-2 left-2 bg-[#e0a526] text-white text-[9px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded-sm">
                            {cardBadgeText}
                          </div>
                        )}
                        {cardSaleLive && (
                          <div className="absolute top-2 left-2 bg-[#0D8275] text-white text-[9px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded-sm">
                            {cardBadgeText}
                          </div>
                        )}
                        {!cardTimedOffer && product.offerPercentage > 0 && (
                          <div className="absolute top-2 left-2 bg-[#bb0013] text-white text-[9px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded-sm">
                            {product.offerPercentage}% off
                          </div>
                        )}
                        {colorVariantCount > 0 && (
                          <div className="absolute bottom-2 right-2 z-10 rounded-full bg-black/75 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white border border-white/10">
                            {colorVariantCount === 2
                              ? "2 variants"
                              : colorVariantCount > 2
                              ? "2+ variants available"
                              : "1 variant"}
                          </div>
                        )}
                      </div>
                      <div className="pt-0.5">
                        {product.brand && (
                          <p className="text-[10px] font-bold tracking-[0.12em] text-[#707072] uppercase mb-0.5 truncate">
                            {product.brand}
                          </p>
                        )}
                        <h4 className="text-sm font-medium text-[#111111] line-clamp-1">{product.name}</h4>
                        <div className="flex items-baseline gap-1.5 mt-1">
                          <span className="font-bold text-sm text-[#111111]">
                            ₹{Math.floor(cardPrice).toLocaleString("en-IN")}
                          </span>
                          {cardHasDiscount && (
                            <span className="text-xs line-through text-[#707072]">
                              ₹{Math.floor(product.price).toLocaleString("en-IN")}
                            </span>
                          )}
                          {cardHasDiscount && (
                            <span className="text-[#0D8275] text-[10px] font-semibold">
                              {cardSaleLive
                                ? `${cardTimedOffer?.offerPercentage || 0}% off`
                                : `${product.offerPercentage}% off`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {resolvedSimilarProducts.length > displayCount && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={() => setDisplayCount((prev) => prev + 4)}
                    className="px-6 py-2.5 text-xs font-bold tracking-widest uppercase border border-[#111111] text-[#111111] hover:bg-[#111111] hover:text-white transition rounded"
                  >
                    Load More
                  </button>
                </div>
              )}
            </div>
          )}
          

          {/* Zoom panel */}
          {zoom.active && (
            <div
              className="hidden md:block fixed rounded border-2 border-[#7DD3FC] pointer-events-none overflow-hidden bg-white"
              style={{
                zIndex: 99999,
                top: zoomPanel.top,
                left: zoomPanel.left,
                width: zoomPanel.size,
                height: zoomPanel.size,
                backgroundImage: `url(${effectiveMainImage || selectedProduct?.images?.[0]?.url})`,
                backgroundSize: "300%",
                backgroundRepeat: "no-repeat",
                backgroundPosition: `${zoom.x}% ${zoom.y}%`,
              }}
            />
          )}
        </>
      )}

      {/* Bank Offers Modal */}
      {bankOffersOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setBankOffersOpen(false)}
        >
          <div
            className="bg-white w-full max-w-md rounded border border-[#EEEEEE] p-6 relative max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setBankOffersOpen(false)}
              className="absolute top-3 right-3 text-[#707072] hover:text-[#bb0013] text-xl transition"
            >
              ×
            </button>
            <h2 className="text-lg font-bold text-[#111111] mb-1">Bank &amp; Payment Offers</h2>
            <p className="text-xs text-[#707072] mb-4">
              Applied by the bank / payment provider at the time of payment.
            </p>
            <ul className="space-y-3">
              {paymentOffers.map((offer) => (
                <li key={offer.id} className="flex items-center gap-3 text-[13px] text-[#111111] leading-snug">
                  {offer.logo ? (
                    <img
                      src={offer.logo}
                      alt=""
                      className="h-8 w-11 object-contain shrink-0 bg-white rounded border border-[#EEEEEE] p-0.5"
                    />
                  ) : (
                    <span className="text-[#7DD3FC] shrink-0">💳</span>
                  )}
                  <span>
                    {offer.displayText}
                    {offer.tncUrl && (
                      <a
                        href={offer.tncUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 text-[#0D8275] underline"
                      >
                        T&amp;C
                      </a>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShareOpen(false)}
        >
          <div
            className="bg-white w-full max-w-sm rounded border border-[#EEEEEE] p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShareOpen(false)}
              className="absolute top-3 right-3 text-[#707072] hover:text-[#bb0013] text-xl transition"
            >
              ×
            </button>
            <h2 className="text-lg font-bold text-[#111111] mb-4 text-center">Share this Product</h2>
            <div className="grid grid-cols-2 gap-3 text-center">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(buildTrackedProductUrl("whatsapp"))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 hover:opacity-80 transition"
              >
                <img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" className="w-10 h-10" alt="" />
                <span className="text-xs text-[#707072]">WhatsApp</span>
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(buildTrackedProductUrl("facebook"))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 hover:opacity-80 transition"
              >
                <img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" className="w-10 h-10" alt="" />
                <span className="text-xs text-[#707072]">Facebook</span>
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(buildTrackedProductUrl("instagram"));
                  setCopied(true);
                  toast.success("Instagram link copied!");
                  setTimeout(() => setCopied(false), 1000);
                }}
                className="flex flex-col items-center gap-1 hover:opacity-80 transition"
              >
                <img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" className="w-10 h-10" alt="" />
                <span className="text-xs text-[#707072]">Instagram</span>
              </button>
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(buildTrackedProductUrl("telegram"))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 hover:opacity-80 transition"
              >
                <img src="https://cdn-icons-png.flaticon.com/512/2111/2111646.png" className="w-10 h-10" alt="" />
                <span className="text-xs text-[#707072]">Telegram</span>
              </a>
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(buildTrackedProductUrl("twitter"))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 hover:opacity-80 transition"
              >
                <img src="https://cdn-icons-png.flaticon.com/512/733/733579.png" className="w-10 h-10" alt="" />
                <span className="text-xs text-[#707072]">Twitter</span>
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(buildTrackedProductUrl("copy"));
                  setCopied(true);
                  toast.success("Link Copied!");
                  setTimeout(() => setCopied(false), 1000);
                }}
                className="flex flex-col items-center gap-1 hover:opacity-80 transition"
              >
                <FiCopy
                  className={cx(
                    "w-10 h-10 p-1 transition-all duration-300",
                    copied ? "text-[#0D8275] scale-110" : "text-[#111111]"
                  )}
                />
                <span className="text-xs text-[#707072]">{copied ? "Copied!" : "Copy link"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Size Chart Drawer */}
      {sizeChartOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSizeChartOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 w-full max-w-md sm:max-w-lg lg:max-w-2xl bg-white border-l border-[#EEEEEE] animate-[slideIn_200ms_ease-out]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#EEEEEE]">
              <div>
                <p className="text-xs font-bold text-[#707072] uppercase tracking-widest">Size Guide</p>
                <h3 className="text-base font-extrabold text-[#111111]">
                  {selectedProduct?.sizeChart?.title || "Size Chart"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSizeChartOpen(false)}
                className="w-9 h-9 rounded-full bg-[#f5f3f5] hover:bg-[#EEEEEE] text-[#111111] flex items-center justify-center transition"
                aria-label="Close size chart"
              >
                ×
              </button>
            </div>

            <div className="px-5 pt-4">
              <div className="flex gap-2 rounded bg-[#f5f3f5] border border-[#EEEEEE] p-1">
                <button
                  type="button"
                  onClick={() => setSizeChartTab("chart")}
                  className={cx(
                    "flex-1 text-sm font-bold py-2 rounded transition",
                    sizeChartTab === "chart" ? "bg-white text-[#111111]" : "text-[#707072] hover:text-[#111111]"
                  )}
                >
                  Size Chart
                </button>
                <button
                  type="button"
                  onClick={() => setSizeChartTab("measure")}
                  className={cx(
                    "flex-1 text-sm font-bold py-2 rounded transition",
                    sizeChartTab === "measure" ? "bg-white text-[#111111]" : "text-[#707072] hover:text-[#111111]"
                  )}
                >
                  How to Measure
                </button>
              </div>
            </div>

            <div className="px-5 py-4 overflow-y-auto h-[calc(100vh-132px)]">
              {sizeChartTab === "chart" ? (
                selectedProduct?.sizeChart?.imageUrl ? (
                  <img
                    src={selectedProduct.sizeChart.imageUrl}
                    alt="Size chart"
                    className="w-full rounded border border-[#EEEEEE] bg-white"
                  />
                ) : (
                  <div className="p-4 rounded border border-[#EEEEEE] bg-[#f5f3f5] text-sm text-[#707072]">
                    Size chart image not available for this product.
                  </div>
                )
              ) : selectedProduct?.sizeChart?.measureImageUrl ? (
                <img
                  src={selectedProduct.sizeChart.measureImageUrl}
                  alt="How to measure"
                  className="w-full rounded border border-[#EEEEEE] bg-white"
                />
              ) : (
                <div className="p-4 rounded border border-[#EEEEEE] bg-[#f5f3f5] text-sm text-[#707072]">
                  How-to-measure image not available for this product.
                </div>
              )}
              <p className="mt-3 text-[11px] text-[#707072]">
                Tip: If you are between sizes, choose the larger size for a relaxed fit.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => {
            if (!isPanning) handleCloseModal();
          }}
        >
          <div
            className="w-full max-w-4xl max-h-[92vh] relative flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleCloseModal}
              className="absolute top-0 right-0 text-white hover:text-[#bb0013] text-2xl font-bold z-50 bg-black/40 w-10 h-10 rounded-full flex items-center justify-center"
            >
              ×
            </button>
            {modalIsGallery && modalImages.length > 1 && (
              <>
                <button
                  onClick={() => goToModalImage(-1)}
                  className="absolute left-1 sm:left-3 top-1/2 -translate-y-1/2 z-50 bg-black/40 text-white hover:bg-black/60 w-10 h-10 rounded-full flex items-center justify-center text-xl"
                  aria-label="Previous image"
                >
                  ‹
                </button>
                <button
                  onClick={() => goToModalImage(1)}
                  className="absolute right-1 sm:right-3 top-1/2 -translate-y-1/2 z-50 bg-black/40 text-white hover:bg-black/60 w-10 h-10 rounded-full flex items-center justify-center text-xl"
                  aria-label="Next image"
                >
                  ›
                </button>
              </>
            )}
            <div
              className="w-full h-[78vh] sm:h-[85vh] flex items-center justify-center overflow-hidden touch-none"
              onDoubleClick={() => {
                if (modalZoom > 1) {
                  setModalZoom(1);
                  setModalOffset({ x: 0, y: 0 });
                } else {
                  setModalZoom(2);
                }
              }}
              onTouchStart={handleModalTouchStart}
              onTouchMove={handleModalTouchMove}
              onTouchEnd={handleModalTouchEnd}
            >
              <img
                src={modalCurrentImage}
                alt="Zoomed Product"
                className="max-w-full max-h-full object-contain rounded transition-transform duration-100"
                style={{
                  userSelect: "none",
                  touchAction: "none",
                  transform: `translate(${modalOffset.x}px, ${modalOffset.y}px) scale(${modalZoom})`,
                }}
                draggable={false}
              />
            </div>
            <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] text-white/80 bg-black/35 px-3 py-1 rounded-full">
              Pinch or double-tap to zoom
            </p>
            {modalIsGallery && modalImages.length > 1 && (
              <div className="absolute left-0 right-0 bottom-16 sm:bottom-4 px-3">
                <div className="mx-auto max-w-xl flex items-center gap-2 overflow-x-auto bg-black/35 rounded p-2">
                  {modalImages.map((url, i) => (
                    <button
                      key={`${url}-${i}`}
                      onClick={() => {
                        setModalIndex(i);
                        setModalImage(url);
                        setModalZoom(1);
                        setModalOffset({ x: 0, y: 0 });
                      }}
                      className={cx(
                        "w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded overflow-hidden border-2 transition",
                        i === modalIndex ? "border-white" : "border-white/30"
                      )}
                      aria-label={`View image ${i + 1}`}
                    >
                      <img src={url} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ProductDetailsSkeleton = () => {
  return (
    <div className="max-w-[1436px] mx-auto p-6 md:p-12 animate-pulse bg-[#faf9fb]">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="hidden md:flex flex-col space-y-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} width={80} height={80} circle />
          ))}
        </div>

        <div className="md:w-1/2 w-full">
          <Skeleton height={400} className="rounded" />
          <div className="flex md:hidden mt-4 space-x-4 overflow-x-auto">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} width={80} height={80} circle />
            ))}
          </div>

          <div className="mt-4 space-y-2">
            <Skeleton height={20} width={150} />
            <Skeleton height={80} />
          </div>
        </div>

        <div className="md:w-1/2 space-y-4">
          <Skeleton height={40} width={`80%`} />
          <Skeleton height={20} width={`60%`} />
          <Skeleton height={30} width={`30%`} />
          <Skeleton height={60} />
          <Skeleton height={20} width={`40%`} />
          <Skeleton count={3} height={20} />
          <Skeleton height={45} width={`100%`} className="rounded" />
        </div>
      </div>

      <div className="mt-20">
        <Skeleton height={30} width={200} className="mx-auto mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} height={250} className="rounded" />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;