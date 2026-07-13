import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faStar } from '@fortawesome/free-solid-svg-icons';
import { colors, radius, spacing, typography } from '../../theme';
import { getProducts, getProductsByFilter } from '../../services/api';
import { ROUTES } from '../../navigation/routes';

function ShoppingScreen({ navigation, route }) {
  const searchQuery = route?.params?.search || '';
  const category = route?.params?.category || '';
  const gender = route?.params?.gender || '';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        setError('');
        const data = searchQuery || category || gender
          ? await getProductsByFilter({ search: searchQuery, category, gender, limit: 50 })
          : await getProducts(50);
        setProducts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('[API] Failed to load products:', err.message);
        setError(err.message || 'Unable to load products');
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [searchQuery, category, gender]);

  const getPrimaryImage = (product) => {
    const directImage = product?.images?.[0]?.url;
    if (directImage) return directImage;

    const colorVariantImage = product?.colorVariants?.find((variant) => variant?.images?.[0]?.url)?.images?.[0]?.url;
    return colorVariantImage || '';
  };

  const getDiscountBadge = (product) => {
    if (product?.isNew) return 'NEW';
    if (product?.discount && product.discount > 0) {
      return `Rs. {product.discount}%`;
    }
    return null;
  };

  const getDiscountedPrice = (product) => {
    if (product?.discount && product.discount > 0) {
      const discountedPrice = product.price * (1 - product.discount / 100);
      return discountedPrice;
    }
    return null;
  };

  const renderStars = (rating, numReviews) => {
    if (!rating || numReviews === 0) return null;

    return (
      <View style={styles.ratingRow}>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <FontAwesomeIcon
              key={star}
              icon={faStar}
              size={12}
              color={star <= Math.round(rating) ? '#FFB020' : '#D0D0D0'}
            />
          ))}
        </View>
        <Text style={styles.reviewCount}>({numReviews})</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {searchQuery ? `Results for "${searchQuery}"` : category || gender || 'Shopping'}
          </Text>
          <Text style={styles.subtitle}>{products.length} products</Text>
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading products...</Text>
          </View>
        ) : null}

        {!loading && error ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Unable to load products</Text>
            <Text style={styles.emptyText}>{error}</Text>
          </View>
        ) : null}

        {!loading && !error && products.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No products yet</Text>
            <Text style={styles.emptyText}>Please check back soon for new arrivals.</Text>
          </View>
        ) : null}

        {!loading && !error && products.length > 0 ? (
          <View style={styles.grid}>
            {products.map((product) => {
              const imageUri = getPrimaryImage(product);
              const badge = getDiscountBadge(product);
              const discountedPrice = getDiscountedPrice(product);
              const rating = product?.rating || 0;
              const numReviews = product?.numReviews || 0;

              return (
                <Pressable
                  key={product._id}
                  style={styles.gridItem}
                  onPress={() =>
                    navigation.navigate(ROUTES.PRODUCT_DETAILS, { productId: product._id })
                  }>
                  <View style={styles.productCard}>
                    {/* Product Image */}
                    <View style={styles.imageContainer}>
                      {imageUri ? (
                        <Image
                          source={{ uri: imageUri }}
                          style={styles.productImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.productImage, styles.placeholderImage]} />
                      )}

                      {/* Discount Badge */}
                      {badge && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{badge}</Text>
                        </View>
                      )}
                    </View>

                    {/* Product Info */}
                    <View style={styles.infoContainer}>
                      <Text style={styles.productName} numberOfLines={2}>
                        {product.name || 'Untitled product'}
                      </Text>

                      {/* Rating and Reviews */}
                      {renderStars(rating, numReviews)}

                      {/* Price */}
                      <View style={styles.priceRow}>
                        {discountedPrice ? (
                          <>
                            <Text style={styles.originalPrice}>
                              Rs. {Number(product.price || 0).toFixed(2)}
                            </Text>
                            <Text style={styles.discountedPrice}>
                              Rs. {Number(discountedPrice).toFixed(2)}
                            </Text>
                          </>
                        ) : (
                          <Text style={styles.price}>
                            Rs. {Number(product.price || 0).toFixed(2)}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl + spacing.xl,
  },
  header: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.size.sm,
    color: colors.textMuted,
    marginTop: 4,
  },
  loadingState: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: typography.size.sm,
  },
  emptyState: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  emptyTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  emptyText: {
    fontSize: typography.size.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.lg,
    columnGap: spacing.md,
  },
  gridItem: {
    width: '47%',
    marginBottom: spacing.xs,
  },
  productCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 0.8,
    backgroundColor: '#f5f5f5',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    backgroundColor: '#e8e8e8',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#E85B7C',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeText: {
    color: 'white',
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
  infoContainer: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  productName: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text,
    lineHeight: 16,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewCount: {
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 4,
  },
  price: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  originalPrice: {
    fontSize: typography.size.xs,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  discountedPrice: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
});

export default ShoppingScreen;
