import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import PrimaryButton from '../../components/Button/PrimaryButton';
import { colors, spacing, typography } from '../../theme';
import { getSession } from '../../services/authSession';
import { ROUTES } from '../../navigation/routes';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

function WelcomeScreen({ navigation }) {
  const session = getSession();

  const handleGetStarted = () => {
    navigation.reset({ index: 0, routes: [{ name: ROUTES.HOME, params: { user: session?.user || null } }] });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Image
        source={require('../../../assets/images/home_image.jpg')}
        style={styles.heroImage}
      />

      {/* Gradient Overlay - Sky Fade, Bottom to Top (mirrors HomeScreen's top-to-bottom skyFade) */}
      <Svg style={styles.gradientOverlay} width="100%" height="100%">
        <Defs>
          <LinearGradient id="skyFadeUp" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor={colors.primary} stopOpacity={0.25} />
            <Stop offset="0.55" stopColor={colors.primary} stopOpacity={0.12} />
            <Stop offset="1" stopColor={colors.primary} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#skyFadeUp)" />
      </Svg>

      <View style={styles.content}>
        <Image
          source={require('../../../assets/images/logo1.png')}
          style={styles.welcomeImage}
        />
        <Text style={styles.tagline}>Premium Streetwear & Lifestyle</Text>
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          label="Let's get started"
          onPress={handleGetStarted}
        />
        <Text
          style={styles.loginLink}
          onPress={() => navigation.navigate(ROUTES.LOGIN)}>
          I already have an account <Text> → </Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heroImage: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.5,
    resizeMode: 'cover',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 420,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  brand: {
    marginTop: spacing.lg,
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.text,
    letterSpacing: 0.5,
  },
  tagline: {
    marginTop: 2,
    fontSize: typography.size.sm,
    color: colors.textMuted,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 50,
    gap: spacing.md,
  },
  loginLink: {
    textAlign: 'center',
    color: colors.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
  welcomeImage: {
    width: 280,
    height: 80,
    resizeMode: 'contain',
  }
});

export default WelcomeScreen;
