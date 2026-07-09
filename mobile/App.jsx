/**
 * Raphaaa
 * @format
 */

import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { CartProvider } from './src/context/CartContext';
import { colors } from './src/theme';
import './src/theme/globalFont';

// The app only has a light theme for now, so the status bar/window are
// forced light regardless of the device's system dark mode setting
// (see android/app/src/main/res/values/styles.xml for the native side).
function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <CartProvider>
          <RootNavigator />
        </CartProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
