/** A calendar day, `YYYY-MM-DD`, with no time and no zone. */
export type Day = string;

const DAY_MS = 24 * 60 * 60 * 1000;

const formatters = new Map<string, Intl.DateTimeFormat>();

const formatterOf = (timeZone: string): Intl.DateTimeFormat => {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
};

const wallClockOf = (instant: Date, timeZone: string) => {
  const parts: Record<string, number> = {};
  for (const part of formatterOf(timeZone).formatToParts(instant)) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value);
  }
  return parts as Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', number>;
};

const offsetMsAt = (instant: Date, timeZone: string): number => {
  const clock = wallClockOf(instant, timeZone);
  const asUtc = Date.UTC(
    clock.year,
    clock.month - 1,
    clock.day,
    clock.hour,
    clock.minute,
    clock.second,
  );
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
};

/** The clock of the page. A test gives its own. */
export const currentInstant = (): Date => new Date();

const utcDateOf = (day: Day): Date => new Date(`${day}T00:00:00.000Z`);

/** The zone itself when the browser knows it, else `UTC`. */
export const knownTimeZone = (timeZone: string): string => {
  try {
    formatterOf(timeZone);
    return timeZone;
  } catch {
    return 'UTC';
  }
};

/** The day of this instant in the zone. */
export const dayIn = (instant: Date, timeZone: string): Day => {
  const clock = wallClockOf(instant, timeZone);
  return [
    String(clock.year).padStart(4, '0'),
    String(clock.month).padStart(2, '0'),
    String(clock.day).padStart(2, '0'),
  ].join('-');
};

/**
 * The instant at which the day starts in the zone. A change of the clock at midnight makes the
 * day start at 01:00: this is the first instant of the day.
 */
export const startOfDayIn = (day: Day, timeZone: string): Date => {
  const midnightUtc = utcDateOf(day).getTime();
  const first = new Date(midnightUtc - offsetMsAt(new Date(midnightUtc), timeZone));
  const second = new Date(midnightUtc - offsetMsAt(first, timeZone));
  return dayIn(second, timeZone) === day ? second : first;
};

export const addDays = (day: Day, count: number): Day =>
  new Date(utcDateOf(day).getTime() + count * DAY_MS).toISOString().slice(0, 10);

/** The number of days from `from` to `to`, both included. */
export const daysBetween = (from: Day, to: Day): number =>
  Math.round((utcDateOf(to).getTime() - utcDateOf(from).getTime()) / DAY_MS) + 1;

/** The offset of the zone at this instant: `UTC`, `UTC+1`, `UTC+5:30`, `UTC-3`. */
export const utcOffsetLabel = (timeZone: string, at: Date): string => {
  const minutes = Math.round(offsetMsAt(at, timeZone) / 60000);
  if (minutes === 0) return 'UTC';
  const sign = minutes > 0 ? '+' : '-';
  const hours = Math.floor(Math.abs(minutes) / 60);
  const rest = Math.abs(minutes) % 60;
  return `UTC${sign}${hours}${rest ? `:${String(rest).padStart(2, '0')}` : ''}`;
};
