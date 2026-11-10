/** Formats an hour/minute the way the device locale prefers (e.g. "7:30 AM"). */
export function formatTime(hour: number, minute: number) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
