import { useEffect, useState } from 'react';
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
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faMagnifyingGlass,
  faMicrophone,
  faUser,
  faSort,
  faFilter,
} from '@fortawesome/free-solid-svg-icons';
import { colors, radius, spacing, typography } from '../../theme';
import { getProductFacets, getProductsByFilter } from '../../services/api';
import { ROUTES } from '../../navigation/routes';

const CHIP_COLORS = ['#F6C9B0', '#BFE3F0', '#F3D9E6', '#E7D5F5', '#DDE3EA', '#CFE0D6'];
const GENDERS = ['Men', 'Women', 'Kids'];

function StoreScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [chips, setChips] = useState([]);
  const [chipsLoading, setChipsLoading] = useState(true);

  const handleSearchSubmit = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    navigation.navigate(ROUTES.SHOPPING, { search: trimmed });
  };

  useEffect(() => {
    let isMounted = true;

    const loadChips = async () => {
      setChipsLoading(true);
      try {
        const facets = await getProductFacets();
        const categoryEntries = Array.isArray(facets?.categories)
          ? facets.categories.map((entry) => entry?._id).filter(Boolean)
          : [];

        const entries = [
          ...GENDERS.map((value) => ({ type: 'gender', value })),
          ...categoryEntries.map((value) => ({ type: 'category', value })),
        ];

        const withImages = await Promise.all(
          entries.map(async (entry, index) => {
            const filter = entry.type === 'gender' ? { gender: entry.value } : { category: entry.value };

            let image = null;
            try {
              const products = await getProductsByFilter({ ...filter, limit: 1 });
              const product = Array.isArray(products) ? products[0] : null;
              image =
                product?.colorVariants?.[0]?.images?.[0]?.url ||
                product?.images?.[0]?.url ||
                null;
            } catch (error) {
              console.log(`Failed to load image for ${entry.value}`, error.message);
            }

            return {
              key: `${entry.type}-${entry.value}`,
              type: entry.type,
              value: entry.value,
              image,
              color: CHIP_COLORS[index % CHIP_COLORS.length],
            };
          })
        );

        if (isMounted) {
          setChips(withImages);
        }
      } catch (error) {
        console.log('Failed to load categories', error.message);
        if (isMounted) {
          setChips([]);
        }
      } finally {
        if (isMounted) {
          setChipsLoading(false);
        }
      }
    };

    loadChips();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleChipPress = (chip) => {
    navigation.navigate(
      ROUTES.SHOPPING,
      chip.type === 'gender' ? { gender: chip.value } : { category: chip.value }
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <View style={styles.spacer} />

        <Image
          source={require('../../../assets/images/logo1.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />

        <Pressable style={styles.avatar} onPress={() => navigation.navigate('Account')}>
          <FontAwesomeIcon icon={faUser} size={16} color={colors.textInverse} />
        </Pressable>
      </View>

      <View style={styles.searchBar}>
        <FontAwesomeIcon icon={faMagnifyingGlass} size={16} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearchSubmit}
          placeholder="Search any Product..."
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
        />
        <Pressable hitSlop={8}>
          <FontAwesomeIcon icon={faMicrophone} size={16} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listHeaderTitle}>All Featured</Text>
        <View style={styles.listHeaderActions}>
          <Pressable style={styles.listHeaderAction}>
            <FontAwesomeIcon icon={faSort} size={14} color={colors.text} />
            <Text style={styles.listHeaderActionText}>Sort</Text>
          </Pressable>
          <Pressable style={styles.listHeaderAction}>
            <FontAwesomeIcon icon={faFilter} size={14} color={colors.text} />
            <Text style={styles.listHeaderActionText}>Filter</Text>
          </Pressable>
        </View>
      </View>

      {chipsLoading ? (
        <View style={styles.chipsLoading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : chips.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}>
          {chips.map((chip) => (
            <Pressable key={chip.key} style={styles.chip} onPress={() => handleChipPress(chip)}>
              <View style={[styles.chipCircle, { backgroundColor: chip.color }]}>
                {chip.image ? (
                  <Image source={{ uri: chip.image }} style={styles.chipImage} resizeMode="cover" />
                ) : (
                  <Text style={styles.chipInitial}>{chip.value.charAt(0).toUpperCase()}</Text>
                )}
              </View>
              <Text style={styles.chipLabel} numberOfLines={1}>
                {chip.value}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.content}>
        <Text style={styles.title}>Store</Text>
        <Text style={styles.subtitle}>Coming soon</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  spacer: {
    width: 36,
    height: 36,
  },
  logoImage: {
    width: 110,
    height: 28,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.text,
    padding: 0,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  listHeaderTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  listHeaderActions: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  listHeaderAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  listHeaderActionText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  chipsLoading: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  chip: {
    alignItems: 'center',
    gap: spacing.xs,
    width: 64,
  },
  chipCircle: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  chipImage: {
    width: '100%',
    height: '100%',
  },
  chipInitial: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  chipLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: colors.text,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  title: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.size.sm,
    color: colors.textMuted,
  },
});

export default StoreScreen;
