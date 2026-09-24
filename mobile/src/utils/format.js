export function pad2(n) {
  return String(n).padStart(2, '0');
}

export function formatDate(dateInput) {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

export function formatTime(dateInput) {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function formatCountdown({ days, hours, minutes, seconds }) {
  return `${pad2(days)}d : ${pad2(hours)}h : ${pad2(minutes)}m : ${pad2(seconds)}s`;
}
