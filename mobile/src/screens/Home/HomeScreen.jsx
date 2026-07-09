import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faMagnifyingGlass,
  faArrowRight,
  faMars,
  faVenus,
  faChild,
  faCartShopping,
} from '@fortawesome/free-solid-svg-icons';
import { colors, radius, spacing, typography } from '../../theme';
import {
  getHomeBanners,
  getProductsByFilter,
  getProductFacets,
  getBestSellers,
  getNewArrivals,
} from '../../services/api';
import { ROUTES } from '../../navigation/routes';
import { useCart } from '../../context/CartContext';

const GENDER_TABS = [
  { id: 'Men', label: 'Men', icon: faMars },
  { id: 'Women', label: 'Women', icon: faVenus },
  { id: 'Kids', label: 'Kids', icon: faChild },
];

const CATEGORY_COLORS = ['#F6C9B0', '#BFE3F0', '#F3D9E6', '#E7D5F5', '#DDE3EA', '#CFE0D6'];
const MAX_CATEGORIES = 8;

const getBannerOverlayStyle = (direction) => {
  switch (direction) {
    case 'right':
      return {
        backgroundColor: 'rgba(0,0,0,0.28)',
      };
    case 'top':
      return {
        backgroundColor: 'rgba(0,0,0,0.22)',
      };
    case 'bottom':
      return {
        backgroundColor: 'rgba(0,0,0,0.26)',
      };
    default:
      return {
        backgroundColor: 'rgba(0,0,0,0.32)',
      };
  }
};

const getBannerPositionStyle = (position) => {
  switch (position) {
    case 'top':
      return {
        justifyContent: 'flex-start',
        paddingTop: spacing.lg,
      };
    case 'center':
      return {
        justifyContent: 'center',
      };
    default:
      return {
        justifyContent: 'flex-end',
        paddingBottom: spacing.lg,
      };
  }
};

const getBannerTextAlignStyle = (align) => {
  switch (align) {
    case 'right':
      return {
        alignItems: 'flex-end',
        textAlign: 'right',
      };
    case 'center':
      return {
        alignItems: 'center',
        textAlign: 'center',
      };
    default:
      return {
        alignItems: 'flex-start',
        textAlign: 'left',
      };
  }
};

function HomeScreen({ navigation }) {
  const { cartCount } = useCart();
  const [banners, setBanners] = useState([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [bannerWidth, setBannerWidth] = useState(0);
  const [selectedGender, setSelectedGender] = useState('Men');
  const [genderCategories, setGenderCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [topProducts, setTopProducts] = useState([]);
  const [newItems, setNewItems] = useState([]);
  const [newItemsLoading, setNewItemsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const bannerScrollRef = useRef(null);

  const handleSearchSubmit = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    navigation.navigate(ROUTES.SHOPPING, { search: trimmed });
  };

  useEffect(() => {
    const loadBanners = async () => {
      try {
        const data = await getHomeBanners();
        if (Array.isArray(data) && data.length > 0) {
          setBanners(data);
        }
      } catch (error) {
        console.log('Failed to load banners', error.message);
      } finally {
        setBannersLoading(false);
      }
    };

    loadBanners();
  }, []);

  useEffect(() => {
    const loadTopProducts = async () => {
      try {
        const data = await getBestSellers();
        if (Array.isArray(data)) {
          setTopProducts(data);
        }
      } catch (error) {
        console.log('Failed to load top products', error.message);
      }
    };

    loadTopProducts();
  }, []);

  useEffect(() => {
    const loadNewItems = async () => {
      try {
        setNewItemsLoading(true);
        const data = await getNewArrivals();
        if (Array.isArray(data) && data.length > 0) {
          setNewItems(data);
        }
      } catch (error) {
        console.log('[API] Failed to load new items', error.message);
      } finally {
        setNewItemsLoading(false);
      }
    };

    loadNewItems();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadGenderCategories = async () => {
      setCategoriesLoading(true);
      try {
        const facets = await getProductFacets({ gender: selectedGender });
        const categoryEntries = Array.isArray(facets?.categories)
          ? facets.categories.slice(0, MAX_CATEGORIES)
          : [];

        const withImages = await Promise.all(
          categoryEntries.map(async (entry, index) => {
            const name = entry?._id;
            if (!name) return null;

            let image = null;
            try {
              const products = await getProductsByFilter({
                category: name,
                gender: selectedGender,
                limit: 1,
              });
              const product = Array.isArray(products) ? products[0] : null;
              image =
                product?.colorVariants?.[0]?.images?.[0]?.url ||
                product?.images?.[0]?.url ||
                null;
            } catch (error) {
              console.log(`Failed to load image for ${name}`, error.message);
            }

            return {
              id: name,
              name,
              count: entry.count,
              color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
              image,
            };
          })
        );

        if (isMounted) {
          setGenderCategories(withImages.filter(Boolean));
        }
      } catch (error) {
        console.log(`Failed to load categories for ${selectedGender}`, error.message);
        if (isMounted) {
          setGenderCategories([]);
        }
      } finally {
        if (isMounted) {
          setCategoriesLoading(false);
        }
      }
    };

    loadGenderCategories();

    return () => {
      isMounted = false;
    };
  }, [selectedGender]);

  useEffect(() => {
    if (banners.length <= 1 || !bannerWidth) return;

    const timer = setInterval(() => {
      setActiveBannerIndex((current) => (current + 1) % banners.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [bannerWidth, banners]);

  useEffect(() => {
    if (!bannerWidth || banners.length <= 1) return;

    bannerScrollRef.current?.scrollTo({
      x: activeBannerIndex * bannerWidth,
      animated: true,
    });
  }, [activeBannerIndex, bannerWidth, banners]);

  return (
    <View style={styles.container}>
      <Svg style={styles.gradientOverlay} width="100%" height="100%">
        <Defs>
          <LinearGradient id="skyFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.primary} stopOpacity={0.32} />
            <Stop offset="0.55" stopColor={colors.primary} stopOpacity={0.12} />
            <Stop offset="1" stopColor={colors.primary} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#skyFade)" />
      </Svg>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Image
            source={require('../../../assets/images/logo1.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View style={styles.headerIcons}>
            {/* <Pressable style={styles.iconButton}>
              <FontAwesomeIcon icon={faCamera} size={16} color={colors.text} />
            </Pressable> */}
            <Pressable
              style={styles.iconButton}
              onPress={() => navigation.navigate(ROUTES.SHOPPING)}>
              <FontAwesomeIcon icon={faCartShopping} size={16} color={colors.text} />
              {cartCount > 0 ? (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        </View>

        <View style={styles.searchBar}>
          <FontAwesomeIcon icon={faMagnifyingGlass} size={14} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            placeholder="Search for products"
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
          />
        </View>

        {banners.length > 0 || bannersLoading ? (
          <View style={styles.bannerShadowWrap}>
            <View
              style={styles.banner}
              onLayout={(event) => setBannerWidth(event.nativeEvent.layout.width)}>
            {banners.length > 0 ? (
              <ScrollView
                ref={bannerScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEnabled={banners.length > 1}
                onMomentumScrollEnd={(event) => {
                  const nextIndex = Math.round(event.nativeEvent.contentOffset.x / bannerWidth);
                  if (nextIndex !== activeBannerIndex) {
                    setActiveBannerIndex(nextIndex);
                  }
                }}
                contentContainerStyle={styles.bannerTrack}>
                {banners.map((banner, index) => {
                  const overlayStyle = getBannerOverlayStyle(banner.overlayDirection || 'left');
                  const positionStyle = getBannerPositionStyle(banner.contentPosition || 'bottom');
                  const textAlignStyle = getBannerTextAlignStyle(banner.textAlign || 'left');

                  return (
                    <View key={banner._id || index} style={[styles.bannerSlide, { width: bannerWidth || '100%' }]}>
                      {banner.image ? (
                        <Image source={{ uri: banner.image }} style={styles.bannerImage} resizeMode="cover" />
                      ) : (
                        <View style={styles.bannerImage} />
                      )}
                      <View style={[styles.bannerOverlay, overlayStyle]} />
                      <View style={[styles.bannerContent, positionStyle, textAlignStyle]}>
                        <View style={styles.bannerTextWrapper}>
                          {banner.title ? <Text style={styles.bannerTitle}>{banner.title}</Text> : null}
                          {banner.subtitle || banner.description ? (
                            <Text style={styles.bannerSubtitle}>{banner.subtitle || banner.description}</Text>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.bannerLoading}>
                <ActivityIndicator color={colors.textInverse} />
              </View>
            )}
          </View>
          </View>
        ) : null}

        {banners.length > 1 ? (
          <View style={styles.dotsRow}>
            {banners.map((banner, index) => (
              <Pressable
                key={banner._id || index}
                onPress={() => setActiveBannerIndex(index)}
                style={[styles.dot, index === activeBannerIndex && styles.dotActive]}
              />
            ))}
          </View>
        ) : null}

        <View style={styles.genderTabs}>
          {GENDER_TABS.map((tab) => {
            const isActive = selectedGender === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setSelectedGender(tab.id)}
                style={styles.genderTab}>
                <View
                  style={[
                    styles.genderCircle,
                    isActive && styles.genderCircleActive,
                  ]}>
                  <FontAwesomeIcon
                    icon={tab.icon}
                    size={20}
                    color={isActive ? colors.textInverse : colors.text}
                  />
                </View>
                <Text
                  style={[
                    styles.genderTabText,
                    isActive && styles.genderTabTextActive,
                  ]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <Pressable style={styles.seeAll}>
            <Text style={styles.seeAllText}>See All</Text>
            <View style={styles.seeAllArrow}>
              <FontAwesomeIcon
                icon={faArrowRight}
                size={12}
                color={colors.textInverse}
              />
            </View>
          </Pressable>
        </View>

        {categoriesLoading && genderCategories.length === 0 ? (
          <View style={styles.categoriesLoading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : genderCategories.length === 0 ? (
          <Text style={styles.emptyCategoriesText}>
            No categories found for {selectedGender} yet.
          </Text>
        ) : (
          <View style={styles.grid}>
            {genderCategories.map(category => (
              <View key={category.id} style={styles.card}>
                {category.image ? (
                  <Image
                    source={{ uri: category.image }}
                    style={[styles.cardImage, { backgroundColor: category.color }]}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[styles.cardImage, { backgroundColor: category.color }]}
                  />
                )}
                <View style={styles.cardLabelRow}>
                  <Text style={styles.cardName}>{category.name}</Text>
                  <Text style={styles.cardCount}>{category.count}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {topProducts.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top Products</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.topProductsRow}>
              {topProducts.map((product) => (
                <Pressable
                  key={product.productId}
                  style={styles.topProductItem}
                  onPress={() =>
                    navigation.navigate(ROUTES.PRODUCT_DETAILS, { productId: product.productId })
                  }>
                  <View style={styles.topProductCircle}>
                    {product.image ? (
                      <Image
                        source={{ uri: product.image }}
                        style={styles.topProductImage}
                        resizeMode="cover"
                      />
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}

        {newItems.length > 0 || newItemsLoading ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>New Items</Text>
              <Pressable style={styles.seeAll}>
                <Text style={styles.seeAllText}>See All</Text>
                <View style={styles.seeAllArrow}>
                  <FontAwesomeIcon
                    icon={faArrowRight}
                    size={12}
                    color={colors.textInverse}
                  />
                </View>
              </Pressable>
            </View>

            {newItemsLoading ? (
              <View style={styles.newItemsLoading}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.newItemsRow}>
                {newItems.map((product) => (
                  <Pressable
                    key={product._id || product.productId}
                    style={styles.newItemCard}
                    onPress={() =>
                      navigation.navigate(ROUTES.PRODUCT_DETAILS, {
                        productId: product._id || product.productId,
                      })
                    }>
                    <View style={styles.newItemImageContainer}>
                      {product.colorVariants?.[0]?.images?.[0]?.url ||
                      product.images?.[0]?.url ? (
                        <Image
                          source={{
                            uri:
                              product.colorVariants?.[0]?.images?.[0]?.url ||
                              product.images?.[0]?.url,
                          }}
                          style={styles.newItemImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.newItemImagePlaceholder} />
                      )}
                    </View>
                    <View style={styles.newItemInfo}>
                      <Text
                        style={styles.newItemName}
                        numberOfLines={2}>
                        {product.name || 'Product'}
                      </Text>
                      <Text style={styles.newItemPrice}>
                        Rs. {(product.price || 0).toFixed(2)}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </>
        ) : null}
      </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fcfcfc',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 420,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  logoImage: {
    width: 140,
    height: 44,
  },
  headerTitle: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    fontSize: 10,
    fontWeight: typography.weight.bold,
    color: colors.white,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.text,
    padding: 0,
  },
  bannerShadowWrap: {
    marginTop: spacing.lg,
    marginHorizontal: -spacing.xl,
    borderRadius: 24,
    // shadowColor: '#000',
    // shadowOpacity: 0.15,
    // shadowRadius: 20,
    // shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  banner: {
    position: 'relative',
    borderBottomEndRadius: 50,
    borderBottomStartRadius: 24,
    overflow: 'hidden',
    minHeight: 190,
    backgroundColor: '#FFB020',
  },
  bannerTrack: {
    flexDirection: 'row',
  },
  bannerSlide: {
    height: 190,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  bannerContent: {
    position: 'absolute',
    inset: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  bannerTextWrapper: {
    maxWidth: '78%',
    gap: spacing.xs,
  },
  bannerLoading: {
    minHeight: 190,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    color: colors.textInverse,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
  },
  bannerSubtitle: {
    color: colors.textInverse,
    fontSize: typography.size.md,
    // fontWeight: typography.weight.medium,
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
  genderTabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.xl,
  },
  genderTab: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  genderCircle: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderCircleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  genderTabText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.textMuted,
  },
  genderTabTextActive: {
    color: colors.text,
    fontWeight: typography.weight.semibold,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  seeAllText: {
    fontSize: typography.size.sm,
    color: colors.textMuted,
    fontWeight: typography.weight.medium,
  },
  seeAllArrow: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoriesLoading: {
    marginTop: spacing.xl,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyCategoriesText: {
    marginTop: spacing.lg,
    fontSize: typography.size.sm,
    color: colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    rowGap: spacing.lg,
  },
  card: {
    width: '48%',
  },
  cardImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: radius.lg,
  },
  cardLabelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  cardName: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text,
  },
  cardCount: {
    fontSize: typography.size.sm,
    color: colors.textMuted,
    padding: 2,
    width: 20,
    textAlign: 'center',
    fontWeight: typography.weight.medium,
    borderRadius: 100,
    backgroundColor: '#baefffa2',
  },
  topProductsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingRight: spacing.md,
  },
  topProductItem: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  topProductCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 4,
    borderColor: 'white',
    overflow: 'hidden',
    boxShadow: '0px 4px 6px rgba(20, 30, 50, 0.1)',
  },
  topProductImage: {
    width: '100%',
    height: '100%',
    boxShadow: '0px 4px 6px rgba(20, 30, 50, 0.1)',
    backgroundColor: colors.surface,
    paddingBottom: 44,
  },
  newItemsLoading: {
    marginTop: spacing.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  newItemsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingRight: spacing.md,
  },
  newItemCard: {
    width: 150,
  },
  newItemImageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 4,
    borderColor: 'white',
  },
  newItemImage: {
    width: '100%',
    height: '200%',
  },
  newItemImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
  },
  newItemInfo: {
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
  },
  newItemName: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text,
    lineHeight: 16,
  },
  newItemPrice: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.primary,
    marginTop: spacing.xs,
  },
});

export default HomeScreen;
