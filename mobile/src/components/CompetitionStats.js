import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../constants/colors';

export default function CompetitionStats({ registeredCount, totalSpots, judge }) {
  const progress = totalSpots > 0 ? Math.min(registeredCount / totalSpots, 1) : 0;

  return (
    <View style={styles.container}>
      {judge ? (
        <View style={styles.judgeRow}>
          {judge.avatar ? <Image source={{ uri: judge.avatar }} style={styles.avatar} /> : null}
          <View style={styles.judgeInfo}>
            <Text style={styles.judgeLabel}>Judge</Text>
            <Text style={styles.judgeName}>{judge.name}</Text>
            <Text style={styles.judgeTitle} numberOfLines={2}>
              {judge.title}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressLabel}>
          {registeredCount} / {totalSpots} Booked
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  judgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: spacing.md, backgroundColor: colors.border },
  judgeInfo: { flex: 1 },
  judgeLabel: { fontSize: 10, color: colors.textMuted },
  judgeName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  judgeTitle: { fontSize: 11, color: colors.textSecondary },
  progressRow: { marginTop: spacing.md, marginBottom: spacing.sm },
  progressTrack: { height: 6, borderRadius: radius.pill, backgroundColor: colors.border, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: colors.primary, borderRadius: radius.pill },
  progressLabel: { fontSize: 11, color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'right' },
});
