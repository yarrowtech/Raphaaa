import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faHouse,
  faBagShopping,
  faHeart,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { colors, radius, spacing } from '../theme';

const TAB_ICONS = {
  Home: faHouse,
  Shopping: faBagShopping,
  Favorite: faHeart,
  Account: faUser,
};

function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const [tabWidth, setTabWidth] = useState(0);
  const activeIndicatorX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!tabWidth) return;

    const targetX = state.index * tabWidth + 6;
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
              {
                width: Math.max(46, tabWidth - 16),
                transform: [{ translateX: activeIndicatorX }],
              },
            ]}
          />
        ) : null}

        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const icon = TAB_ICONS[route.name];

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
              <View style={isFocused ? styles.activeIconWrap : styles.iconWrap}>
                <FontAwesomeIcon
                  icon={icon}
                  size={isFocused ? 18 : 19}
                  color={isFocused ? colors.textInverse : colors.textMuted}
                />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 40,
    paddingTop: spacing.sm,
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 100,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
    zIndex: 2,
  },
  activeIndicator: {
    position: 'absolute',
    top: 8,
    height: 38,
    width: 'auto',
    borderRadius: 100,
    backgroundColor: colors.primary,
    zIndex: 1,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 100,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    // marginBottom: 8,
  },
});

export default CustomTabBar;
