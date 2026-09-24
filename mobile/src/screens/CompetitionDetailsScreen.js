import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '../constants/colors';
import { useCompetition } from '../hooks/useCompetition';

import CompetitionImage from '../components/CompetitionImage';
import CompetitionHeader from '../components/CompetitionHeader';
import CompetitionInfo from '../components/CompetitionInfo';
import CompetitionStats from '../components/CompetitionStats';
import CountdownTimer from '../components/CountdownTimer';
import CompetitionRules from '../components/CompetitionRules';
import RegistrationButton from '../components/RegistrationButton';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

const STATUS_BANNER = {
  LIVE: { text: 'Competition is Live', color: colors.success, bg: colors.successBg },
  FULL: { text: 'Competition Full', color: colors.danger, bg: colors.dangerBg },
  ENDED: { text: 'Competition Ended', color: colors.textMuted, bg: colors.border },
};

export default function CompetitionDetailsScreen({ route, navigation }) {
  const competitionId = route?.params?.competitionId;
  const { competition, isLoading, error, isActionLoading, actionError, reload, register, cancel } =
    useCompetition(competitionId);

  if (!competitionId) {
    return (
      <ErrorState
        title="No competition selected"
        message="This screen needs a competitionId param. Navigate here with { competitionId: '<id>' }."
      />
    );
  }

  if (isLoading && !competition) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header onBack={() => navigation?.goBack?.()} />
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (error && !competition) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header onBack={() => navigation?.goBack?.()} />
        <ErrorState message={error.message} onRetry={reload} />
      </SafeAreaView>
    );
  }

  // Defensive: no data and no error/loading (shouldn't normally happen).
  if (!competition) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header onBack={() => navigation?.goBack?.()} />
        <ErrorState message="No competition data available." onRetry={reload} />
      </SafeAreaView>
    );
  }

  const banner = STATUS_BANNER[competition.status];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header onBack={() => navigation?.goBack?.()} />
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={reload} tintColor={colors.primary} />}
      >
        <CompetitionImage uri={competition.image} />

        {banner ? (
          <View style={[styles.banner, { backgroundColor: banner.bg }]}>
            <Text style={[styles.bannerText, { color: banner.color }]}>{banner.text}</Text>
          </View>
        ) : null}

        <CompetitionHeader title={competition.title} category={competition.category} isRegistered={competition.isRegistered} />

        <CompetitionInfo
          prize={competition.prize}
          entryFee={competition.entryFee}
          remainingSpots={competition.remainingSpots}
          totalSpots={competition.totalSpots}
        />

        <CountdownTimer status={competition.status} startAt={competition.startAt} endAt={competition.endAt} />

        <CompetitionStats
          registeredCount={competition.registeredCount}
          totalSpots={competition.totalSpots}
          judge={competition.judge}
        />

        <CompetitionRules
          registrationClosesAt={competition.registrationClosesAt}
          submissionStartsAt={competition.submissionStartsAt}
          submissionEndsAt={competition.submissionEndsAt}
          endAt={competition.endAt}
          rules={competition.rules}
        />

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      <RegistrationButton
        status={competition.status}
        isRegistered={competition.isRegistered}
        isActionLoading={isActionLoading}
        actionError={actionError}
        onRegister={register}
        onCancel={cancel}
      />
    </SafeAreaView>
  );
}

function Header({ onBack }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} accessibilityRole="button" style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.card },
  scroll: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
  },
  backButton: { paddingVertical: spacing.xs },
  backText: { fontSize: 14, color: colors.textPrimary, fontWeight: '600' },
  banner: { marginHorizontal: spacing.lg, marginTop: spacing.md, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  bannerText: { fontWeight: '700', fontSize: 12 },
});
