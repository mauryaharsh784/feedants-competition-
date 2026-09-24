import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../constants/colors';
import { formatDate, formatTime } from '../utils/format';

function DateItem({ label, date }) {
  return (
    <View style={styles.dateItem}>
      <Text style={styles.dateLabel}>{label}</Text>
      <Text style={styles.dateValue}>{formatDate(date)}</Text>
      <Text style={styles.timeValue}>{formatTime(date)}</Text>
    </View>
  );
}

export default function CompetitionRules({ registrationClosesAt, submissionStartsAt, submissionEndsAt, endAt, rules }) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Important Dates</Text>
      <View style={styles.dateGrid}>
        <DateItem label="Register Before" date={registrationClosesAt} />
        <DateItem label="Submission Starts" date={submissionStartsAt} />
        <DateItem label="Submission Ends" date={submissionEndsAt} />
        <DateItem label="Result Date" date={endAt} />
      </View>

      <Text style={styles.sectionTitle}>About Competition & Rules</Text>
      <Text style={styles.rulesText}>{rules}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  dateGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.lg },
  dateItem: {
    width: '50%',
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  dateLabel: { fontSize: 10, color: colors.textMuted },
  dateValue: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginTop: 2 },
  timeValue: { fontSize: 11, color: colors.textSecondary },
  rulesText: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
});
