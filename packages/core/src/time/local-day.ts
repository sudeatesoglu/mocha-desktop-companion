/**
 * The local calendar day containing `timestamp`, as [start, end) in ms.
 * Built from calendar dates, not by adding 24 hours, so days with a
 * daylight saving change get their real 23 or 25 hours.
 */
export function localDay(timestamp: number): { start: number; end: number } {
  const date = new Date(timestamp);
  const [year, month, day] = [date.getFullYear(), date.getMonth(), date.getDate()];
  return {
    start: new Date(year, month, day).getTime(),
    end: new Date(year, month, day + 1).getTime(),
  };
}
