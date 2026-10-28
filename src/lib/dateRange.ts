// Inclusive day-range check for the dashboards' From/To filters. `from`/`to`
// are the Gregorian "YYYY-MM-DD" strings DateRangeFilter hands back (empty =
// open-ended), compared in the viewer's local time.
export function inRange(iso: string, from: string, to: string): boolean {
  if (!from && !to) return true;
  const time = new Date(iso).getTime();
  const fromTime = from ? new Date(`${from}T00:00:00`).getTime() : -Infinity;
  const toTime = to ? new Date(`${to}T23:59:59.999`).getTime() : Infinity;
  return time >= fromTime && time <= toTime;
}
