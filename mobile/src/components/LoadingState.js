import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, radius, spacing } from '../constants/colors';

function Shimmer({ style }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[style, { opacity, backgroundColor: colors.border }]} />;
}

/**
 * A professional skeleton loading state that mirrors the real layout
 * (image, title, stats row, button) instead of a plain spinner, so the
 * screen doesn't visually "jump" once data arrives.
 */
export default function LoadingState() {
  return (
    <View style={styles.container} testID="loading-state">
      <Shimmer style={styles.image} />
      <View style={styles.body}>
        <Shimmer style={[styles.line, { width: '70%', height: 20 }]} />
        <Shimmer style={[styles.line, { width: '40%', height: 14, marginTop: spacing.sm }]} />
        <View style={styles.statsRow}>
          <Shimmer style={styles.statBox} />
          <Shimmer style={styles.statBox} />
        </View>
        <Shimmer style={[styles.line, { width: '100%', height: 60, marginTop: spacing.lg, borderRadius: radius.md }]} />
        <Shimmer style={[styles.button]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.card },
  image: { width: '100%', height: 220 },
  body: { padding: spacing.lg },
  line: { borderRadius: radius.sm },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  statBox: { flex: 1, height: 56, borderRadius: radius.md },
  button: { height: 52, borderRadius: radius.pill, marginTop: spacing.xl },
});
