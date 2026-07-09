import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme';

function BrandLogo({ size = 96 }) {
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}>
      <Text style={[styles.letter, { fontSize: size * 0.5 }]}>R</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    color: colors.white,
    fontWeight: '700',
    fontStyle: 'italic',
  },
});

export default BrandLogo;
