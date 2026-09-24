import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../constants/colors';

export default function CompetitionHeader({ title, category, isRegistered }) {
  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {isRegistered ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>✓ Registered</Text>
          </View>
        ) : null}
      </View>
      {category ? <Text style={styles.category}>{category}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { flex: 1, fontSize: 19, fontWeight: '700', color: colors.textPrimary, marginRight: spacing.sm },
  category: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.xs },
  badge: {
    backgroundColor: colors.successBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeText: { color: colors.success, fontSize: 11, fontWeight: '700' },
});
