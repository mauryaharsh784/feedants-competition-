import axios from 'axios';
import { API_BASE_URL, MOCK_USER_ID } from '../constants/config';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'x-user-id': MOCK_USER_ID,
  },
});

/**
 * Normalizes any axios error into a small, predictable shape the UI can
 * render directly, so components never need to know about axios internals.
 */
function normalizeError(error) {
  if (error.response) {
    // Server responded with an error status - use the backend's message.
    const message = error.response.data?.error?.message || 'Something went wrong. Please try again.';
    const code = error.response.data?.error?.code || 'UNKNOWN_ERROR';
    return { message, code, status: error.response.status };
  }
  if (error.request) {
    // Request was made but no response received (network issue / timeout).
    return { message: 'Unable to reach the server. Check your connection and try again.', code: 'NETWORK_ERROR', status: 0 };
  }
  return { message: error.message || 'Unexpected error occurred.', code: 'UNKNOWN_ERROR', status: 0 };
}

export async function fetchCompetitionDetails(competitionId) {
  try {
    const res = await api.get(`/competitions/${competitionId}`);
    return res.data.data;
  } catch (error) {
    throw normalizeError(error);
  }
}

export async function registerForCompetition(competitionId) {
  try {
    const res = await api.post(`/competitions/${competitionId}/register`);
    return res.data.data;
  } catch (error) {
    throw normalizeError(error);
  }
}

export async function cancelRegistration(competitionId) {
  try {
    const res = await api.delete(`/competitions/${competitionId}/register`);
    return res.data.data;
  } catch (error) {
    throw normalizeError(error);
  }
}

export default api;
