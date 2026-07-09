import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView, PinchGestureHandler, State } from 'react-native-gesture-handler';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faArrowLeft,
  faShareNodes,
  faHeart,
  faChevronLeft,
  faChevronRight,
  faStar,
  faXmark,
  faCartPlus,
  faRulerHorizontal,
} from '@fortawesome/free-solid-svg-icons';
import { colors, radius, spacing, typography } from '../../theme';
import { getProductById } from '../../services/api';
import { useCart } from '../../context/CartContext';

function ImageZoomModal({ visible, imageUri, onClose }) {
  const baseScale = useRef(new Animated.Value(1)).current;
  const pinchScale = useRef(new Animated.Value(1)).current;
  const scale = useRef(Animated.multiply(baseScale, pinchScale)).current;
  const lastScale = useRef(1);

  useEffect(() => {
    if (visible) {
      lastScale.current = 1;
      baseScale.setValue(1);
      pinchScale.setValue(1);
    }
  }, [visible, baseScale, pinchScale]);

  const onPinchGestureEvent = Animated.event([{ nativeEvent: { scale: pinchScale } }], {
    useNativeDriver: true,
  });

  const onPinchHandlerStateChange = (event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      lastScale.current *= event.nativeEvent.scale;
      lastScale.current = Math.min(Math.max(lastScale.current, 1), 4);
      baseScale.setValue(lastScale.current);
      pinchScale.setValue(1);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.zoomModalBackdrop}>
        <Pressable style={styles.zoomCloseButton} onPress={onClose}>
          <FontAwesomeIcon icon={faXmark} size={18} color={colors.white} />
        </Pressable>
        <PinchGestureHandler
          onGestureEvent={onPinchGestureEvent}
          onHandlerStateChange={onPinchHandlerStateChange}>
          <Animated.View style={styles.zoomImageWrapper}>
            {imageUri ? (
              <Animated.Image
                source={{ uri: imageUri }}
                style={[styles.zoomImage, { transform: [{ scale }] }]}
                resizeMode="contain"
              />
            ) : null}
          </Animated.View>
        </PinchGestureHandler>
      </GestureHandlerRootView>
    </Modal>
  );
}

function SizeChartModal({ visible, sizeChart, onClose }) {
  const [activeTab, setActiveTab] = useState('chart');

  useEffect(() => {
    if (visible) {
      setActiveTab('chart');
    }
  }, [visible]);

  const chartImage = sizeChart?.imageUrl;
  const measureImage = sizeChart?.measureImageUrl;
  const activeImage = activeTab === 'chart' ? chartImage : measureImage;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sizeChartBackdrop}>
        <Pressable style={styles.sizeChartBackdropTap} onPress={onClose} />
        <View style={styles.sizeChartSheet}>
          <View style={styles.sizeChartHeader}>
            <View>
              <Text style={styles.sizeChartEyebrow}>SIZE GUIDE</Text>
              <Text style={styles.sizeChartTitle}>{sizeChart?.title || 'Size Chart'}</Text>
            </View>
            <Pressable style={styles.sizeChartCloseButton} onPress={onClose}>
              <FontAwesomeIcon icon={faXmark} size={16} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.sizeChartTabs}>
            <Pressable
              style={[styles.sizeChartTab, activeTab === 'chart' && styles.sizeChartTabActive]}
              onPress={() => setActiveTab('chart')}>
              <Text
                style={[
                  styles.sizeChartTabText,
                  activeTab === 'chart' && styles.sizeChartTabTextActive,
                ]}>
                Size Chart
              </Text>
            </Pressable>
            <Pressable
              style={[styles.sizeChartTab, activeTab === 'measure' && styles.sizeChartTabActive]}
              onPress={() => setActiveTab('measure')}>
              <Text
                style={[
                  styles.sizeChartTabText,
                  activeTab === 'measure' && styles.sizeChartTabTextActive,
                ]}>
                How to Measure
              </Text>
            </Pressable>
          </View>

          <ScrollView style={styles.sizeChartBody} showsVerticalScrollIndicator={false}>
            {activeImage ? (
              <Image
                source={{ uri: activeImage }}
                style={styles.sizeChartImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.sizeChartEmpty}>
                <Text style={styles.sizeChartEmptyText}>
                  {activeTab === 'chart'
                    ? 'Size chart image not available for this product.'
                    : 'How-to-measure image not available for this product.'}
                </Text>
              </View>
            )}
            <Text style={styles.sizeChartTip}>
              Tip: If you are between sizes, choose the larger size for a relaxed fit.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ProductDetailsScreen({ route, navigation }) {
  const productId = route?.params?.productId;
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [zoomVisible, setZoomVisible] = useState(false);
  const [sizeChartVisible, setSizeChartVisible] = useState(false);
  const [imageWidth, setImageWidth] = useState(0);
  const imageScrollRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const loadProduct = async () => {
      if (!productId) {
        setError('Product not found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const data = await getProductById(productId);
        if (isMounted) {
          setProduct(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Unable to load product');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProduct();

    return () => {
      isMounted = false;
    };
  }, [productId]);

  const hasColorVariants = Array.isArray(product?.colorVariants) && product.colorVariants.length > 0;
  const selectedColorVariant = hasColorVariants ? product.colorVariants[selectedColorIndex] : null;

  const images = useMemo(() => {
    if (selectedColorVariant?.images?.length) {
      return selectedColorVariant.images.map((img) => img.url).filter(Boolean);
    }
    if (Array.isArray(product?.images) && product.images.length) {
      return product.images.map((img) => img.url).filter(Boolean);
    }
    return [];
  }, [product, selectedColorVariant]);

  useEffect(() => {
    setActiveImageIndex(0);
    imageScrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [selectedColorIndex]);

  const sizeOptions = useMemo(() => {
    if (selectedColorVariant?.sizes?.length) {
      return selectedColorVariant.sizes.map((s) => ({ size: s.size, countInStock: s.countInStock }));
    }
    if (Array.isArray(product?.sizes) && product.sizes.length) {
      return product.sizes.map((size) => ({ size, countInStock: 1 }));
    }
    return [];
  }, [product, selectedColorVariant]);

  useEffect(() => {
    if (sizeOptions.length > 0 && !sizeOptions.some((option) => option.size === selectedSize)) {
      setSelectedSize(sizeOptions[0].size);
    }
  }, [sizeOptions, selectedSize]);

  const hasDiscount = Boolean(
    product?.discountPrice && product.discountPrice > 0 && product.discountPrice < product.price
  );
  const displayPrice = hasDiscount ? product.discountPrice : product?.price;

  const goToImageIndex = (index) => {
    setActiveImageIndex(index);
    imageScrollRef.current?.scrollTo({ x: index * imageWidth, animated: true });
  };

  const goToPrevImage = () => {
    goToImageIndex(activeImageIndex === 0 ? images.length - 1 : activeImageIndex - 1);
  };

  const goToNextImage = () => {
    goToImageIndex(activeImageIndex === images.length - 1 ? 0 : activeImageIndex + 1);
  };

  const handleBuyNow = () => {
    if (sizeOptions.length > 0 && !selectedSize) {
      Alert.alert('Select a size', 'Please choose a size before buying.');
      return;
    }
    addToCart(product, { size: selectedSize, color: selectedColorVariant?.color });
    Alert.alert('Checkout', 'Checkout is not available yet.');
  };

  const handleAddToCart = () => {
    if (sizeOptions.length > 0 && !selectedSize) {
      Alert.alert('Select a size', 'Please choose a size before adding to cart.');
      return;
    }
    addToCart(product, { size: selectedSize, color: selectedColorVariant?.color });
    Alert.alert('Added to cart', `${product?.name}${selectedSize ? ` (${selectedSize})` : ''} added to your cart.`);
  };

  const handleOpenSizeChart = () => {
    if (!product?.sizeChart?.imageUrl && !product?.sizeChart?.measureImageUrl) {
      Alert.alert('Size chart unavailable', 'Size chart not available for this product.');
      return;
    }
    setSizeChartVisible(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerState}>
          <Text style={styles.errorText}>{error || 'Product not found'}</Text>
          <Pressable style={styles.backLink} onPress={() => navigation.goBack()}>
            <Text style={styles.backLinkText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const breadcrumbParts = ['Home', product.gender, product.category].filter(Boolean);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}>
            <FontAwesomeIcon icon={faArrowLeft} size={16} color={colors.text} />
          </Pressable>
          <Text style={styles.breadcrumbText} numberOfLines={1}>
            {breadcrumbParts.join('  ›  ')}
          </Text>
        </View>

        {/* <Text style={styles.pageTitle} numberOfLines={1}>
          {product.name}
        </Text> */}

        <View
          style={styles.imageSection}
          onLayout={(event) => setImageWidth(event.nativeEvent.layout.width)}>
          {images.length > 0 ? (
            <ScrollView
              ref={imageScrollRef}
              style={styles.imageCarousel}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEnabled={images.length > 1}
              onMomentumScrollEnd={(event) => {
                if (!imageWidth) return;
                const nextIndex = Math.round(event.nativeEvent.contentOffset.x / imageWidth);
                if (nextIndex !== activeImageIndex) {
                  setActiveImageIndex(nextIndex);
                }
              }}>
              {images.map((uri, index) => (
                <Pressable
                  key={`${uri}-${index}`}
                  style={[styles.imageSlide, { width: imageWidth || '100%' }]}
                  onPress={() => setZoomVisible(true)}>
                  <Image source={{ uri }} style={styles.productImage} resizeMode="cover" />
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.productImage, styles.imagePlaceholder]} />
          )}

          <View style={styles.imageOverlayActions}>
            <Pressable style={styles.overlayIconButton}>
              <FontAwesomeIcon icon={faShareNodes} size={14} color={colors.text} />
            </Pressable>
            <Pressable
              style={[styles.overlayIconButton, wishlisted && styles.overlayIconButtonActive]}
              onPress={() => setWishlisted((value) => !value)}>
              <FontAwesomeIcon
                icon={faHeart}
                size={14}
                color={wishlisted ? colors.white : colors.border}
              />
            </Pressable>
          </View>

          {images.length > 1 ? (
            <>
              <Pressable style={[styles.imageNavButton, styles.imageNavLeft]} onPress={goToPrevImage}>
                <FontAwesomeIcon icon={faChevronLeft} size={14} color={colors.text} />
              </Pressable>
              <Pressable style={[styles.imageNavButton, styles.imageNavRight]} onPress={goToNextImage}>
                <FontAwesomeIcon icon={faChevronRight} size={14} color={colors.text} />
              </Pressable>
            </>
          ) : null}
        </View>

        {images.length > 1 ? (
          <View style={styles.dotsRow}>
            {images.map((_, index) => (
              <View
                key={index}
                style={[styles.dot, index === activeImageIndex && styles.dotActive]}
              />
            ))}
          </View>
        ) : null}

        {images.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailRow}>
            {images.map((uri, index) => (
              <Pressable
                key={`${uri}-${index}`}
                onPress={() => goToImageIndex(index)}
                style={[
                  styles.thumbnail,
                  index === activeImageIndex && styles.thumbnailActive,
                ]}>
                <Image source={{ uri }} style={styles.thumbnailImage} resizeMode="cover" />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {product.brand ? <Text style={styles.brand}>{product.brand}</Text> : null}
        <Text style={styles.title}>{product.name}</Text>

        <View style={styles.priceRow}>
          <View style={styles.priceGroup}>
            {hasDiscount ? (
              <Text style={styles.originalPrice}>Rs. {Number(product.price).toFixed(0)}</Text>
            ) : null}
            <Text style={styles.currentPrice}>Rs. {Number(displayPrice || 0).toFixed(0)}</Text>
          </View>
          {product.rating > 0 ? (
            <View style={styles.ratingRow}>
              <FontAwesomeIcon icon={faStar} size={13} color="#FFB020" />
              <Text style={styles.ratingText}>{Number(product.rating).toFixed(1)}</Text>
              {product.numReviews > 0 ? (
                <Text style={styles.reviewCount}>({product.numReviews})</Text>
              ) : null}
            </View>
          ) : null}
        </View>

        {product.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Description:</Text>
            <Text style={styles.descriptionText} numberOfLines={descriptionExpanded ? undefined : 3}>
              {product.description}
            </Text>
            <Pressable onPress={() => setDescriptionExpanded((value) => !value)}>
              <Text style={styles.seeMoreText}>
                {descriptionExpanded ? 'See Less' : 'See More...'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {hasColorVariants ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              Color:{' '}
              <Text style={styles.sectionValue}>
                {selectedColorVariant?.colorName || selectedColorVariant?.color}
              </Text>
            </Text>
            <View style={styles.swatchRow}>
              {product.colorVariants.map((variant, index) => (
                <Pressable
                  key={`${variant.color}-${index}`}
                  onPress={() => setSelectedColorIndex(index)}
                  style={[
                    styles.swatch,
                    { backgroundColor: String(variant.color || '').toLowerCase() },
                    index === selectedColorIndex && styles.swatchActive,
                  ]}
                />
              ))}
            </View>
          </View>
        ) : null}

        {sizeOptions.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sizeHeaderRow}>
              <Text style={styles.sectionLabel}>
                Size: <Text style={styles.sectionValue}>{selectedSize}</Text>
              </Text>
              <Pressable style={styles.sizeGuideButton} onPress={handleOpenSizeChart}>
                <FontAwesomeIcon icon={faRulerHorizontal} size={12} color={colors.textMuted} />
                <Text style={styles.sizeGuideText}>Size Guide</Text>
              </Pressable>
            </View>
            <View style={styles.sizeRow}>
              {sizeOptions.map((option) => {
                const isActive = option.size === selectedSize;
                const outOfStock = option.countInStock === 0;
                return (
                  <Pressable
                    key={option.size}
                    disabled={outOfStock}
                    onPress={() => setSelectedSize(option.size)}
                    style={[
                      styles.sizeButton,
                      isActive && styles.sizeButtonActive,
                      outOfStock && styles.sizeButtonDisabled,
                    ]}>
                    <Text
                      style={[
                        styles.sizeButtonText,
                        isActive && styles.sizeButtonTextActive,
                        outOfStock && styles.sizeButtonTextDisabled,
                      ]}>
                      {option.size}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <Pressable style={styles.buyNowButton} onPress={handleBuyNow}>
            <Text style={styles.buyNowText}>Buy Now</Text>
          </Pressable>
          <Pressable style={styles.addToCartButton} onPress={handleAddToCart}>
            <FontAwesomeIcon icon={faCartPlus} size={22} color={colors.primary} />
          </Pressable>
        </View>
      </ScrollView>

      <ImageZoomModal
        visible={zoomVisible}
        imageUri={images[activeImageIndex]}
        onClose={() => setZoomVisible(false)}
      />

      <SizeChartModal
        visible={sizeChartVisible}
        sizeChart={product.sizeChart}
        onClose={() => setSizeChartVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  errorText: {
    fontSize: typography.size.md,
    color: colors.textMuted,
    textAlign: 'center',
  },
  backLink: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  backLinkText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  breadcrumbText: {
    flex: 1,
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  pageTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  imageSection: {
    position: 'relative',
    width: '100%',
    aspectRatio: 0.85,
    borderRadius: radius.lg,
    overflow: 'visible',
  },
  imageCarousel: {
    width: '100%',
    height: '100%',
  },
  imageSlide: {
    height: '100%',
  },
  productImage: {
    width: '100%',
    height: '150%',
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  imagePlaceholder: {
    backgroundColor: colors.surface,
  },
  imageOverlayActions: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    gap: spacing.xs,
  },
  overlayIconButton: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.black,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  overlayIconButtonActive: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  imageNavButton: {
    position: 'absolute',
    top: '45%',
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  imageNavLeft: {
    left: -14,
  },
  imageNavRight: {
    right: -14,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 18,
    backgroundColor: colors.primary,
  },
  thumbnailRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  thumbnailActive: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  brand: {
    fontSize: typography.size.sm,
    color: colors.textMuted,
    marginTop: spacing.lg,
  },
  title: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text,
    marginTop: spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  priceGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  originalPrice: {
    fontSize: typography.size.sm,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  currentPrice: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ratingText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text,
  },
  reviewCount: {
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionLabel: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text,
  },
  sectionValue: {
    fontWeight: typography.weight.regular,
    color: colors.textMuted,
  },
  descriptionText: {
    fontSize: typography.size.sm,
    color: colors.textMuted,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  seeMoreText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  swatchActive: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  sizeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sizeGuideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sizeGuideText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
  sizeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  sizeButton: {
    minWidth: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sizeButtonDisabled: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  sizeButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  sizeButtonTextActive: {
    color: colors.white,
  },
  sizeButtonTextDisabled: {
    color: colors.border,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: spacing.xl,
  },
  buyNowButton: {
    width: '80%',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyNowText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.white,
  },
  addToCartButton: {
    width: 56,
    height: 56,
    backgroundColor: 'transparent',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomCloseButton: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.lg,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomImageWrapper: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomImage: {
    width: '100%',
    height: '100%',
  },
  sizeChartBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sizeChartBackdropTap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sizeChartSheet: {
    maxHeight: '85%',
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: spacing.xl,
  },
  sizeChartHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sizeChartEyebrow: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  sizeChartTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text,
    marginTop: 2,
  },
  sizeChartCloseButton: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeChartTabs: {
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.xs,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  sizeChartTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeChartTabActive: {
    backgroundColor: colors.background,
  },
  sizeChartTabText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textMuted,
  },
  sizeChartTabTextActive: {
    color: colors.text,
  },
  sizeChartBody: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  sizeChartImage: {
    width: '100%',
    height: 420,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  sizeChartEmpty: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  sizeChartEmptyText: {
    fontSize: typography.size.sm,
    color: colors.textMuted,
  },
  sizeChartTip: {
    fontSize: typography.size.xs,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
});

export default ProductDetailsScreen;
