import { DateTime } from 'luxon';

/**
 * Timezone utilities for consistent handling of dates and times across the application
 */

/**
 * Convert UTC time to user's local timezone
 */
export const utcToLocal = (utcTime: string | Date, timezone: string): DateTime => {
  const dt = typeof utcTime === 'string' ? DateTime.fromISO(utcTime) : DateTime.fromJSDate(utcTime);
  return dt.setZone(timezone);
};

/**
 * Convert local time to UTC
 */
export const localToUtc = (localTime: string | Date, timezone: string): DateTime => {
  const dt = typeof localTime === 'string' ? DateTime.fromISO(localTime) : DateTime.fromJSDate(localTime);
  return dt.setZone(timezone).toUTC();
};

/**
 * Format time for display in user's timezone
 */
export const formatLocalTime = (time: string | Date, timezone: string, format = 'h:mm a z'): string => {
  return utcToLocal(time, timezone).toFormat(format);
};

/**
 * Check if a time falls within quiet hours
 */
export const isQuietHours = (
  time: string | Date,
  timezone: string,
  quietStart: string,
  quietEnd: string
): boolean => {
  const localTime = utcToLocal(time, timezone);
  const [startHour, startMinute] = quietStart.split(':').map(Number);
  const [endHour, endMinute] = quietEnd.split(':').map(Number);

  const quietStartTime = localTime.set({ hour: startHour, minute: startMinute });
  const quietEndTime = localTime.set({ hour: endHour, minute: endMinute });

  if (quietStartTime <= quietEndTime) {
    // Normal case: quiet hours within same day
    return localTime >= quietStartTime && localTime <= quietEndTime;
  } else {
    // Special case: quiet hours span midnight
    return localTime >= quietStartTime || localTime <= quietEndTime;
  }
};

/**
 * Get user's current timezone if available, fallback to system timezone
 */
export const getUserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (e) {
    return 'UTC';
  }
};

/**
 * Check if two times are within a specified interval of each other
 */
export const areTimesWithinInterval = (
  time1: string | Date,
  time2: string | Date,
  timezone: string,
  intervalMinutes: number
): boolean => {
  const dt1 = utcToLocal(time1, timezone);
  const dt2 = utcToLocal(time2, timezone);
  const diff = Math.abs(dt1.diff(dt2, 'minutes').minutes);
  return diff < intervalMinutes;
};

/**
 * Get the next occurrence of a specific time
 */
export const getNextOccurrence = (timeStr: string, timezone: string): DateTime => {
  const [hour, minute] = timeStr.split(':').map(Number);
  let next = DateTime.now().setZone(timezone).set({ hour, minute, second: 0, millisecond: 0 });
  
  if (next < DateTime.now()) {
    next = next.plus({ days: 1 });
  }
  
  return next;
};

/**
 * Check if current time is in DST for the given timezone
 */
export const isInDST = (timezone: string): boolean => {
  const now = DateTime.now().setZone(timezone);
  return now.isInDST;
};

/**
 * Get the next DST transition for a timezone
 */
export const getNextDSTTransition = (timezone: string): DateTime | null => {
  const now = DateTime.now().setZone(timezone);
  const year = now.year;
  
  // Check for spring forward (usually March)
  let springTransition = DateTime.fromObject({ year, month: 3, day: 8 }, { zone: timezone })
    .set({ hour: 2, minute: 0 });
  while (springTransition.weekday !== 7) { // Sunday
    springTransition = springTransition.plus({ days: 1 });
  }
  
  // Check for fall back (usually November)
  let fallTransition = DateTime.fromObject({ year, month: 11, day: 1 }, { zone: timezone })
    .set({ hour: 2, minute: 0 });
  while (fallTransition.weekday !== 7) { // Sunday
    fallTransition = fallTransition.plus({ days: 1 });
  }
  
  if (now < springTransition) return springTransition;
  if (now < fallTransition) return fallTransition;
  
  // Next transition is spring of next year
  return DateTime.fromObject(
    { year: year + 1, month: 3, day: 8 },
    { zone: timezone }
  ).set({ hour: 2, minute: 0 });
};
