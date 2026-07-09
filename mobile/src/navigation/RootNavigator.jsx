import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen from '../screens/Onboarding/WelcomeScreen';
import LoginScreen from '../screens/Auth/LoginScreen';
import PasswordScreen from '../screens/Auth/PasswordScreen';
import SignUpScreen from '../screens/Auth/SignUpScreen';
import MainTabNavigator from './MainTabNavigator';
import ProductDetailsScreen from '../screens/Product/ProductDetailsScreen';
import { ROUTES } from './routes';
import { colors } from '../theme';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={ROUTES.WELCOME}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name={ROUTES.WELCOME} component={WelcomeScreen} />
        <Stack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
        <Stack.Screen name={ROUTES.PASSWORD} component={PasswordScreen} />
        <Stack.Screen name={ROUTES.SIGN_UP} component={SignUpScreen} />
        <Stack.Screen name={ROUTES.HOME} component={MainTabNavigator} />
        <Stack.Screen name={ROUTES.PRODUCT_DETAILS} component={ProductDetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default RootNavigator;
