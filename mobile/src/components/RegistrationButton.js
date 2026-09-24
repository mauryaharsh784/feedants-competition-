import React from 'react';
import { TouchableOpacity, Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../constants/colors';

/**
 * Single source of truth for what the CTA looks like and does, driven
 * entirely by backend-provided `status` + `isRegistered` - never guessed
 * on the frontend.
 */
export default function RegistrationButton({ status, isRegistered, isActionLoading, actionError, onRegister, onCancel }) {
  let content = null;

  if (isRegistered) {
    content = (
      <TouchableOpacity
        style={[styles.button, styles.registeredButton]}
        onPress={onCancel}
        disabled={isActionLoading || status === 'LIVE' || status === 'ENDED'}
        accessibilityRole="button"
      >
        {isActionLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text style={styles.registeredText}>
            {status === 'LIVE' || status === 'ENDED' ? "You're Registered" : "You're Registered · Tap to cancel"}
          </Text>
        )}
      </TouchableOpacity>
    );
  } else if (status === 'ENDED') {
    content = (
      <View style={[styles.button, styles.disabledButton]}>
        <Text style={styles.disabledText}>Competition Ended</Text>
      </View>
    );
  } else if (status === 'FULL') {
    content = (
      <View style={[styles.button, styles.disabledButton]}>
        <Text style={styles.disabledText}>Competition Full</Text>
      </View>
    );
  } else if (status === 'LIVE') {
    content = (
      <View style={[styles.button, styles.disabledButton]}>
        <Text style={styles.disabledText}>Competition is Live · Registration Closed</Text>
      </View>
    );
  } else {
    // UPCOMING
    content = (
      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={onRegister}
        disabled={isActionLoading}
        accessibilityRole="button"
      >
        {isActionLoading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>Register Now</Text>}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {content}
      {actionError ? <Text style={styles.errorText}>{actionError.message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg },
  button: {
    height: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: { backgroundColor: colors.primary },
  primaryText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  registeredButton: { backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primary },
  registeredText: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
  disabledButton: { backgroundColor: colors.border },
  disabledText: { color: colors.textMuted, fontWeight: '700', fontSize: 14 },
  errorText: { color: colors.danger, fontSize: 12, textAlign: 'center', marginTop: spacing.sm },
});
