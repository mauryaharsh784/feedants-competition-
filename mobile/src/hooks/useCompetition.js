import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchCompetitionDetails,
  registerForCompetition,
  cancelRegistration,
} from '../services/api';

/**
 * Encapsulates all data-fetching and mutation state for the Competition
 * Details screen, so the screen component itself only deals with rendering.
 *
 * Exposes distinct loading flags for the initial load vs. the
 * register/cancel action, because they need different UI treatment
 * (full-screen skeleton vs. a disabled button with an inline spinner).
 */
export function useCompetition(competitionId) {
  const [competition, setCompetition] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Guards against setting state after the component has unmounted
  // (e.g. the user navigates away while a request is in flight).
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadCompetition = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchCompetitionDetails(competitionId);
      if (isMounted.current) setCompetition(data);
    } catch (err) {
      if (isMounted.current) setError(err);
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [competitionId]);

  useEffect(() => {
    loadCompetition();
  }, [loadCompetition]);

  const register = useCallback(async () => {
    setIsActionLoading(true);
    setActionError(null);
    try {
      const data = await registerForCompetition(competitionId);
      if (isMounted.current) setCompetition(data);
      return { success: true };
    } catch (err) {
      if (isMounted.current) setActionError(err);
      // If the backend says the competition became full/live/ended while we
      // were waiting, refresh so the screen reflects the real current state
      // instead of staying stuck showing a now-incorrect UPCOMING view.
      if (['COMPETITION_FULL', 'COMPETITION_LIVE', 'COMPETITION_ENDED', 'ALREADY_REGISTERED'].includes(err.code)) {
        loadCompetition();
      }
      return { success: false, error: err };
    } finally {
      if (isMounted.current) setIsActionLoading(false);
    }
  }, [competitionId, loadCompetition]);

  const cancel = useCallback(async () => {
    setIsActionLoading(true);
    setActionError(null);
    try {
      const data = await cancelRegistration(competitionId);
      if (isMounted.current) setCompetition(data);
      return { success: true };
    } catch (err) {
      if (isMounted.current) setActionError(err);
      return { success: false, error: err };
    } finally {
      if (isMounted.current) setIsActionLoading(false);
    }
  }, [competitionId]);

  return {
    competition,
    isLoading,
    error,
    isActionLoading,
    actionError,
    reload: loadCompetition,
    register,
    cancel,
  };
}
