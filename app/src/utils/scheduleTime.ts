/** Parse a clock label like "10:00 AM" into minutes from midnight. */
export function parseScheduleClockTime(timeStr: string): number {
  const [time, period] = timeStr.trim().split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  let totalMinutes = hours * 60 + minutes;

  if (period === 'PM' && hours !== 12) totalMinutes += 12 * 60;
  if (period === 'AM' && hours === 12) totalMinutes = minutes;

  return totalMinutes;
}

export function getScheduleStartTimeLabel(timeRange: string): string {
  return timeRange.split(' - ')[0].trim();
}

/** Next daily occurrence of a show start, strictly after `from`. */
export function getNextShowStartAt(timeRange: string, from: Date = new Date()): Date {
  const minutes = parseScheduleClockTime(getScheduleStartTimeLabel(timeRange));
  const result = new Date(from);
  result.setSeconds(0, 0);
  result.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);

  if (result.getTime() <= from.getTime()) {
    result.setDate(result.getDate() + 1);
  }

  return result;
}

/** Following daily occurrence after a show start that already passed. */
export function getFollowingShowStartAt(timeRange: string, afterStart: Date): Date {
  return getNextShowStartAt(timeRange, new Date(afterStart.getTime() + 1000));
}
