import { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuthBackground from '../../components/Background/AuthBackground';
import PrimaryButton from '../../components/Button/PrimaryButton';
import { colors, radius, spacing, typography } from '../../theme';
import { checkEmail } from '../../services/api';
import { ROUTES } from '../../navigation/routes';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const data = await checkEmail(normalizedEmail);

      if (!data?.exists) {
        Alert.alert(
          'Account not found',
          "You're not registered with us yet. Please create an account to continue.",
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Register',
              onPress: () => navigation.navigate('SignUp'),
            },
          ],
        );
        return;
      }

      navigation.navigate('Password', { email: normalizedEmail, name: data.name });
    } catch (error) {
      Alert.alert('Something went wrong', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <AuthBackground />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.formBlock}>
              <Image source={require('../../../assets/images/logo1.png')} />
              <View style={styles.headingBlock}>
                <Text style={styles.title}>Login</Text>
                <Text style={styles.subtitle}>Good to see you back! </Text>
              </View>

              <TextInput
                placeholder="Email"
                placeholderTextColor={colors.border}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
              />

              <PrimaryButton
                label={loading ? 'Please wait...' : 'Next'}
                onPress={handleNext}
                disabled={loading}
                style={styles.nextButton}
              />

              <Text
                style={styles.cancelText}
                onPress={() => {
                  if (navigation.canGoBack()) {
                    navigation.goBack();
                  } else {
                    navigation.navigate(ROUTES.WELCOME);
                  }
                }}>
                Cancel
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  formBlock: {
    gap: 30,
    marginBottom: 40,
  },
  headingBlock: {
    gap: 4,
  },
  title: {
    color: colors.text,
    fontSize: 50,
    fontWeight: typography.weight.bold,
    letterSpacing: 0,
  },
  subtitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: typography.weight.regular,
  },
  input: {
    height: 'auto',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 20,
    color: colors.text,
    fontSize: 18,
    textAlignVertical: 'center',
  },
  nextButton: {
    borderRadius: 100,
    backgroundColor: colors.primary,
  },
  cancelText: {
    color: colors.textMuted,
    fontSize: 18,
    fontWeight: typography.weight.regular,
    textAlign: 'center',
  },
});

export default LoginScreen;
