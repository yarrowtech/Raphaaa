import { View, StyleSheet } from 'react-native';
import { colors } from '../../theme';

function AuthBackground() {
  return (
    <>
      <View style={styles.topBlueShape} />
      <View style={styles.topSoftShape} />
      <View style={styles.rightBlueShape} />
      <View style={styles.bottomSoftShape} />
    </>
  );
}

const styles = StyleSheet.create({
  topBlueShape: {
    position: 'absolute',
    top: -155,
    left: -124,
    width: 265,
    height: 292,
    borderBottomLeftRadius: 138,
    borderBottomRightRadius: 138,
    borderTopRightRadius: 40,
    backgroundColor: colors.primary,
  },
  topSoftShape: {
    position: 'absolute',
    top: 250,
    left: -20,
    width: 137,
    height: 231,
    borderBottomLeftRadius: 78,
    borderBottomRightRadius: 58,
    borderTopRightRadius: 80,
    backgroundColor: '#DCE5FF',
    transform: [{ rotate: '240deg' }],
  },
  rightBlueShape: {
    position: 'absolute',
    top: 129,
    right: -46,
    width: 78,
    height: 82,
    borderTopLeftRadius: 56,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 20,
    backgroundColor: colors.primary,
    transform: [{ rotate: '-13deg' }],
  },
  bottomSoftShape: {
    position: 'absolute',
    right: -32,
    bottom: -34,
    width: 137,
    height: 231,
    borderTopLeftRadius: 96,
    borderTopRightRadius: 72,
    backgroundColor: '#F4F6FF',
    transform: [{ rotate: '240deg' }],
  },
});

export default AuthBackground;
