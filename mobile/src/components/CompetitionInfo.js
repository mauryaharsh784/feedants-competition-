import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../constants/colors';

function InfoBlock({ label, value, valueColor }) {
  return (
    <View style={styles.block}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

export default function CompetitionInfo({ prize, entryFee, remainingSpots, totalSpots }) {
  const lowSpots = totalSpots > 0 && remainingSpots / totalSpots <= 0.25;

  return (
    <View style={styles.container}>
      <InfoBlock label="Prize Pool" value={prize} />
      <View style={styles.divider} />
      <InfoBlock label="Entry Fee" value={entryFee} />
      <View style={styles.divider} />
      <InfoBlock
        label="Spots left"
        value={`Only ${remainingSpots} spots left`}
        valueColor={lowSpots ? colors.danger : colors.success}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    justifyContent: 'space-between',
  },
  block: { flex: 1 },
  label: { fontSize: 11, color: colors.textMuted, marginBottom: 2 },
  value: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  divider: { width: 1, backgroundColor: colors.border, marginHorizontal: spacing.sm },
});
