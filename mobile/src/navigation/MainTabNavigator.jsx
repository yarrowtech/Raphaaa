import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/Home/HomeScreen';
import ShoppingScreen from '../screens/Shopping/ShoppingScreen';
import FavoriteScreen from '../screens/Favorite/FavoriteScreen';
import AccountScreen from '../screens/Account/AccountScreen';
import CustomTabBar from './CustomTabBar';
import { ROUTES } from './routes';
import { clearSession, getSession } from '../services/authSession';

const Tab = createBottomTabNavigator();

function renderTabBar(props) {
  return <CustomTabBar {...props} />;
}

function MainTabNavigator({ navigation, route }) {
  const sessionUser = route?.params?.user || getSession()?.user;

  const handleLogout = () => {
    clearSession();
    navigation.reset({
      index: 0,
      routes: [{ name: ROUTES.WELCOME }],
    });
  };

  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={renderTabBar}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Shopping" component={ShoppingScreen} />
      <Tab.Screen name="Favorite" component={FavoriteScreen} />
      <Tab.Screen name="Account">
        {(props) => <AccountScreen {...props} user={sessionUser} onLogout={handleLogout} navigation={navigation} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default MainTabNavigator;
