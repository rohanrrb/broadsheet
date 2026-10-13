/** Date and time formatting pinned to a time zone, so the paper tells local time. */

/** "4:05 PM EDT" */
export function formatClock(date: Date, timeZone: string): string {
  return date.toLocaleTimeString("en-US", { timeZone, hour: "numeric", minute: "2-digit", timeZoneName: "short" });
}

/** "Friday" */
export function formatWeekday(date: Date, timeZone: string): string {
  return date.toLocaleDateString("en-US", { timeZone, weekday: "long" });
}

/** Whether two instants fall on the same calendar day in `timeZone`. */
export function sameDay(a: Date, b: Date, timeZone: string): boolean {
  const day = (d: Date) => d.toLocaleDateString("en-US", { timeZone });
  return day(a) === day(b);
}
