import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';

function PrimaryButton({ label, onPress, style, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: colors.primaryDark,
  },
  disabled: {
    opacity: 0.6,
  },
  label: {
    color: colors.textInverse,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
});

export default PrimaryButton;
