import { useEffect, useRef, useState } from 'react';
import { Animated, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuthBackground from '../../components/Background/AuthBackground';
import PrimaryButton from '../../components/Button/PrimaryButton';
import { colors, radius, spacing, typography } from '../../theme';
import { loginUser } from '../../services/api';
import { setSession } from '../../services/authSession';

function getFirstName(name, email) {
  if (name) return name.split(' ')[0];
  if (!email) return 'there';
  const namePart = email.split('@')[0] || 'there';
  return namePart.charAt(0).toUpperCase() + namePart.slice(1);
}

function PasswordScreen({ navigation, route }) {
  const { email, name } = route.params ?? {};
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasError, setHasError] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!hasError) return;

    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [hasError, shakeAnim]);

  const handleNext = async () => {
    if (!password) {
      setHasError(true);
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    setHasError(false);
    setErrorMessage('');

    try {
      const data = await loginUser(email, password);
      setSession({ user: data.user, token: data.token });
      navigation.reset({ index: 0, routes: [{ name: 'Home', params: { user: data.user } }] });
    } catch (error) {
      setHasError(true);
      setErrorMessage(error.message || 'Password is incorrect');
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
            <View style={styles.avatarRing}>
              <View style={styles.avatarInner}>
                <Image
                  source={require('../../../assets/images/logo1.png')}
                  style={styles.avatarImage}
                  resizeMode="contain"
                />
              </View>
            </View>

            <View style={styles.headingBlock}>
              <Text style={styles.title}>Hello, {getFirstName(name, email)}!!</Text>
              <Text style={styles.subtitle}>Type your password</Text>
            </View>

            <View style={styles.form}>
              <Animated.View style={[styles.inputWrapper, hasError && styles.inputWrapperError, { transform: [{ translateX: shakeAnim }] }]}>
                <TextInput
                  placeholder="Password"
                  placeholderTextColor={colors.border}
                  style={[styles.input, hasError && styles.inputError]}
                  secureTextEntry={!isPasswordVisible}
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    if (hasError) {
                      setHasError(false);
                      setErrorMessage('');
                    }
                  }}
                />
                <Pressable
                  style={styles.eyeButton}
                  onPress={() => setIsPasswordVisible((prev) => !prev)}>
                  <Text style={styles.eyeText}>{isPasswordVisible ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </Animated.View>

              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

              <PrimaryButton
                label={loading ? 'Please wait...' : 'Next'}
                onPress={handleNext}
                disabled={loading}
                style={styles.nextButton}
              />
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
    justifyContent: 'center',
    paddingTop: 120,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 120,
  },
  avatarRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#F6C6DE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 72,
    height: 72,
  },
  headingBlock: {
    marginTop: spacing.lg,
    alignItems: 'center',
    gap: 4,
  },
  title: {
    color: colors.text,
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.size.md,
    fontWeight: typography.weight.regular,
  },
  form: {
    alignSelf: 'stretch',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputWrapperError: {
    borderWidth: 1,
    borderColor: '#D64545',
    borderRadius: radius.pill,
  },
  input: {
    height: 'auto',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingRight: 72,
    paddingVertical: 20,
    color: colors.text,
    fontSize: 18,
    textAlignVertical: 'center',
  },
  inputError: {
    borderWidth: 1,
    borderColor: '#D64545',
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  eyeText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: typography.weight.bold,
  },
  errorText: {
    color: '#D64545',
    fontSize: 14,
    marginTop: -4,
    marginLeft: spacing.xs,
  },
  nextButton: {
    borderRadius: 100,
    backgroundColor: colors.primary,
  },
});

export default PasswordScreen;
