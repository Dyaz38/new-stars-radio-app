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

/** True when `now` falls inside a daily schedule slot (handles overnight ranges). */
export function isScheduleSlotCurrent(timeRange: string, now: Date = new Date()): boolean {
  const parts = timeRange.split(' - ').map((s) => s.trim());
  if (parts.length < 2) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = parseScheduleClockTime(parts[0]);
  const endMinutes = parseScheduleClockTime(parts[1]);

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

/** Mark which schedule row is on air right now (for hero card + schedule modal). */
export function applyCurrentScheduleFlags<T extends { time: string; current?: boolean }>(
  slots: T[],
  now: Date = new Date(),
): T[] {
  return slots.map((slot) => ({
    ...slot,
    current: isScheduleSlotCurrent(slot.time, now),
  }));
}
