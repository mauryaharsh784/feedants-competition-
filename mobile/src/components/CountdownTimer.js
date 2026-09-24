import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../constants/colors';
import { useCountdown } from '../hooks/useCountdown';
import { formatCountdown } from '../utils/format';

/**
 * Renders a live countdown toward `targetDate`. The label and target switch
 * automatically based on competition `status`:
 * - UPCOMING -> counts down to the competition/registration start
 * - LIVE     -> counts down to the end date
 * - ENDED    -> no countdown, just an "ended" message
 *
 * All values come from `useCountdown`, which computes everything from real
 * Date objects - nothing here is a hardcoded string.
 */
export default function CountdownTimer({ status, startAt, endAt }) {
  const targetDate = status === 'LIVE' ? endAt : startAt;
  const countdown = useCountdown(status === 'ENDED' ? null : targetDate);

  if (status === 'ENDED') {
    return (
      <View style={[styles.container, styles.endedContainer]}>
        <Text style={styles.endedText}>This competition has ended</Text>
      </View>
    );
  }

  const isUrgent = countdown.days === 0 && countdown.hours < 6;
  const label = status === 'LIVE' ? 'Competition ends in' : 'Registration closes in';

  return (
    <View style={[styles.container, isUrgent && styles.urgentContainer]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, isUrgent && styles.urgentValue]}>{formatCountdown(countdown)}</Text>
      </View>
      {isUrgent ? <Text style={styles.hurryTag}>Hurry up!</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  urgentContainer: { backgroundColor: colors.accentAmberBg },
  label: { fontSize: 11, color: colors.textSecondary },
  value: { fontSize: 15, fontWeight: '700', color: colors.primaryDark, marginTop: 2, letterSpacing: 0.5 },
  urgentValue: { color: colors.accentAmber },
  hurryTag: { fontSize: 12, fontWeight: '700', color: colors.accentAmber },
  endedContainer: { backgroundColor: colors.border, justifyContent: 'center' },
  endedText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, textAlign: 'center', flex: 1 },
});
