import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../constants/colors';

/**
 * Shown for both "competition failed to load" and generic network errors.
 * Always gives the user a way forward (Retry) rather than a dead end.
 */
export default function ErrorState({
  title = 'Unable to load competition',
  message = 'Something went wrong while fetching this competition. Please check your connection and try again.',
  onRetry,
}) {
  return (
    <View style={styles.container} testID="error-state">
      <View style={styles.iconCircle}>
        <Text style={styles.icon}>!</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry} accessibilityRole="button">
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.card,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  icon: { color: colors.danger, fontSize: 26, fontWeight: '700' },
  title: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  message: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },
  retryText: { color: colors.white, fontWeight: '700', fontSize: 14 },
});
