import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PrimaryButton from '../../components/Button/PrimaryButton';
import { colors, radius, spacing, typography } from '../../theme';

function CameraIcon() {
  return (
    <View style={styles.cameraBody}>
      <View style={styles.cameraTop} />
      <View style={styles.cameraLens} />
    </View>
  );
}

function EyeIcon({ hidden }) {
  return (
    <View style={styles.eyeIcon}>
      <View style={styles.eyeShape}>
        <View style={styles.eyeDot} />
      </View>
      {hidden && <View style={styles.eyeSlash} />}
    </View>
  );
}

function FlagIcon() {
  const chakraSpokes = Array.from({ length: 12 }, (_, index) => (
    <View
      key={index}
      style={[
        styles.flagChakraSpoke,
        { transform: [{ rotate: `${index * 15}deg` }] },
      ]}
    />
  ));

  return (
    <View style={styles.flag}>
      <View style={styles.flagSaffron} />
      <View style={styles.flagWhite}>
        <View style={styles.flagChakra}>
          {chakraSpokes}
          <View style={styles.flagChakraDot} />
        </View>
      </View>
      <View style={styles.flagGreen} />
    </View>
  );
}

function SignUpScreen({ navigation }) {
  const [isPasswordHidden, setIsPasswordHidden] = useState(true);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.topShape} />
      <View style={styles.leftShape} />

      <View style={styles.content}>
        <Image source={require('../../../assets/images/logo1.png')} style={{marginTop: 100}}/>
        <Text style={styles.title}>Create{'\n'}Account</Text>

        {/* <Pressable style={styles.avatarButton}>
          <CameraIcon />
        </Pressable> */}

        <View style={styles.form}>
          <TextInput
            placeholder="Email"
            placeholderTextColor={colors.border}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <View style={styles.inputRow}>
            <TextInput
              placeholder="Password"
              placeholderTextColor={colors.border}
              style={styles.flexInput}
              secureTextEntry={isPasswordHidden}
            />
            <Pressable
              hitSlop={8}
              onPress={() => setIsPasswordHidden(current => !current)}
              style={styles.eyeButton}>
              <EyeIcon hidden={isPasswordHidden} />
            </Pressable>
          </View>

          <View style={styles.inputRow}>
            <FlagIcon />
            {/* <Text style={styles.chevron}>v</Text> */}
            <Text style={{marginLeft: 5}}>+91</Text>
            <View style={styles.divider} />
            <TextInput
              placeholder="Your number"
              placeholderTextColor={colors.border}
              style={styles.flexInput}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          label="Done"
          onPress={() => navigation.navigate('Home')}
          style={styles.doneButton}
        />
        <Text style={styles.cancelText} onPress={() => navigation.goBack()}>
          Cancel
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
  topShape: {
    position: 'absolute',
    top: 82,
    right: -76,
    width: 184,
    height: 244,
    borderBottomLeftRadius: 118,
    borderTopLeftRadius: 92,
    borderBottomRightRadius: 12,
    backgroundColor: colors.primary,
     transform: [
    { rotate: '18deg' },
  ],
  },
  leftShape: {
    position: 'absolute',
    top: -82,
    left: -86,
    width: 184,
    height: 244,
    borderBottomLeftRadius: 118,
    borderTopLeftRadius: 92,
    borderBottomRightRadius: 34,
    backgroundColor: '#F2F5FE',
     transform: [
    { rotate: '18deg' },
  ],
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: 50,
  },
  title: {
    // lineHeight: 34,
    // fontWeight: typography.weight.bold,
    fontWeight: 600,
    color: colors.text,
    // color: 'gray',
    letterSpacing: 0,
    fontSize: 60,
    marginTop: 80,
  },
  avatarButton: {
    width: 54,
    height: 54,
    marginTop: spacing.xl,
    borderWidth: 1.2,
    borderRadius: 27,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  cameraBody: {
    width: 20,
    height: 15,
    borderWidth: 1.2,
    borderRadius: 3,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraTop: {
    position: 'absolute',
    top: -4,
    width: 7,
    height: 4,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    borderWidth: 1.2,
    borderBottomWidth: 0,
    borderColor: colors.primary,
  },
  cameraLens: {
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1.2,
    borderColor: colors.primary,
  },
  form: {
    marginTop: spacing.lg,
    // gap: spacing.sm,
    gap: 15,
  },
  input: {
    height: 'auto',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    // paddingVertical: spacing.xs,
    paddingVertical: 20,
    textAlignVertical: 'center',
    color: colors.text,
    fontSize: 18,
  },
  inputRow: {
    height: 'auto',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  flexInput: {
    flex: 1,
    height: 'auto',
    color: colors.text,
    fontSize: 18,
    paddingVertical: 0,
    paddingHorizontal: 0,
    textAlignVertical: 'center',
  },
  eyeButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeIcon: {
    width: 15,
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeShape: {
    width: 11,
    height: 7,
    borderWidth: 1,
    borderColor: colors.textMuted,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-12deg' }],
  },
  eyeDot: {
    width: 2.5,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
  },
  eyeSlash: {
    position: 'absolute',
    width: 14,
    height: 1,
    backgroundColor: colors.textMuted,
    transform: [{ rotate: '-45deg' }],
  },
  flag: {
    width: 18,
    height: 12,
    borderRadius: 1,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  flagSaffron: {
    height: 4,
    backgroundColor: '#FF9933',
  },
  flagWhite: {
    height: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  flagChakra: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    borderWidth: 0.5,
    borderColor: '#000080',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagChakraSpoke: {
    position: 'absolute',
    width: 0.4,
    height: 4,
    backgroundColor: '#000080',
  },
  flagChakraDot: {
    width: 1,
    height: 1,
    borderRadius: 0.5,
    backgroundColor: '#000080',
  },
  flagGreen: {
    height: 4,
    backgroundColor: '#138808',
  },
  chevron: {
    marginLeft: spacing.xs,
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 12,
  },
  divider: {
    width: 1,
    height: 17,
    marginHorizontal: spacing.sm,
    backgroundColor: colors.border,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    // paddingBottom: spacing.lg,
    paddingBottom: 50,
    gap: spacing.md,
  },
  doneButton: {
    borderRadius: 100,
    backgroundColor: colors.primary
  },
  cancelText: {
    color: colors.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    textAlign: 'center',
  },
});

export default SignUpScreen;
