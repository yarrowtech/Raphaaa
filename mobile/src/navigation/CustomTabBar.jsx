import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faHouse,
  faHeart,
  faCartShopping,
  faMagnifyingGlass,
  faGear,
} from '@fortawesome/free-solid-svg-icons';
import { Text } from 'react-native';
import { colors, spacing } from '../theme';

const TAB_ICONS = {
  Home: faHouse,
  Favorite: faHeart,
  Shopping: faCartShopping,
  Store: faMagnifyingGlass,
  Account: faGear,
};

function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const [tabWidth, setTabWidth] = useState(0);
  const activeIndicatorX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!tabWidth) return;

    const targetX = state.index * tabWidth + (tabWidth - 42) / 2;
    Animated.spring(activeIndicatorX, {
      toValue: targetX,
      useNativeDriver: true,
      tension: 70,
      friction: 10,
    }).start();
  }, [activeIndicatorX, state.index, tabWidth]);

  const handleBarLayout = (event) => {
    const totalWidth = event.nativeEvent.layout.width;
    if (totalWidth > 0) {
      setTabWidth(totalWidth / state.routes.length);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, spacing.sm) },
      ]}>
      <View style={styles.bar} onLayout={handleBarLayout}>
        {tabWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.activeIndicator,
              { transform: [{ translateX: activeIndicatorX }] },
            ]}
          />
        ) : null}

        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const icon = TAB_ICONS[route.name];
          const tabBarLabel = descriptors[route.key]?.options?.tabBarLabel;
          const label =
            typeof tabBarLabel === 'string'
              ? tabBarLabel
              : descriptors[route.key]?.options?.title || route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable key={route.key} onPress={onPress} style={styles.tab}>
              <View style={[styles.iconWrap, isFocused && styles.iconWrapActive]}>
                <FontAwesomeIcon
                  icon={icon}
                  size={20}
                  color={isFocused ? colors.textInverse : colors.textMuted}
                />
              </View>
              <Text style={[styles.label, isFocused && styles.labelActive]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: 1,
    backgroundColor: 'white',
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderRadius: 999,
    paddingVertical: 8,
    position: 'relative',
  },
  tab: {
    flex: 1,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    zIndex: 2,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
  label: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  labelActive: {
    color: colors.primary,
  },
  activeIndicator: {
    position: 'absolute',
    top: 8,
    left: 0,
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: colors.primary,
    zIndex: 1,
  },
});

export default CustomTabBar;
