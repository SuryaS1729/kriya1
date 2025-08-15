// lib/date.ts
export const MS_DAY = 86400000;

export function startOfTodayMs(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}
export function isToday(ms: number) {
  const start = startOfTodayMs();
  return ms >= start && ms < start + MS_DAY;
}
export function daysSinceEpoch(d = new Date()) {
  return Math.floor(d.getTime() / MS_DAY);
}
