export interface WorldClockOption {
  timeZone: string;
  city: string;
  region: string;
  searchText: string;
  utcOffset: string;
  common: boolean;
}

interface CommonTimeZone {
  timeZone: string;
  city: string;
  region: string;
}

const COMMON_TIME_ZONES: CommonTimeZone[] = [
  { timeZone: 'Asia/Manila', city: 'Manila', region: 'Philippines' },
  { timeZone: 'America/New_York', city: 'New York', region: 'United States' },
  { timeZone: 'Europe/London', city: 'London', region: 'United Kingdom' },
  { timeZone: 'Asia/Tokyo', city: 'Tokyo', region: 'Japan' },
  { timeZone: 'America/Los_Angeles', city: 'Los Angeles', region: 'United States' },
  { timeZone: 'Asia/Singapore', city: 'Singapore', region: 'Singapore' },
  { timeZone: 'Australia/Sydney', city: 'Sydney', region: 'Australia' },
  { timeZone: 'Europe/Paris', city: 'Paris', region: 'France' },
  { timeZone: 'Asia/Dubai', city: 'Dubai', region: 'United Arab Emirates' },
  { timeZone: 'Asia/Kolkata', city: 'Kolkata', region: 'India' },
];

const FALLBACK_TIME_ZONES = [
  ...COMMON_TIME_ZONES.map(zone => zone.timeZone),
  'Africa/Cairo',
  'Africa/Johannesburg',
  'America/Chicago',
  'America/Denver',
  'America/Halifax',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'America/Toronto',
  'Asia/Bangkok',
  'Asia/Hong_Kong',
  'Asia/Jakarta',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Asia/Taipei',
  'Asia/Vladivostok',
  'Atlantic/Reykjavik',
  'Europe/Amsterdam',
  'Europe/Athens',
  'Europe/Berlin',
  'Europe/Istanbul',
  'Europe/Madrid',
  'Europe/Moscow',
  'Europe/Rome',
  'Europe/Stockholm',
  'Pacific/Auckland',
  'Pacific/Honolulu',
  'UTC',
];

const COMMON_BY_ID = new Map(COMMON_TIME_ZONES.map(zone => [zone.timeZone, zone]));

type IntlWithSupportedValues = typeof Intl & {
  supportedValuesOf?: (key: 'timeZone') => string[];
};

function humanize(value: string): string {
  return value.replace(/_/g, ' ');
}

function buildOption(timeZone: string, now: Date): WorldClockOption {
  const common = COMMON_BY_ID.get(timeZone);
  const parts = timeZone.split('/');
  const city = common?.city ?? humanize(parts[parts.length - 1] ?? timeZone);
  const region = common?.region ?? (parts.length > 1 ? humanize(parts.slice(0, -1).join(' / ')) : timeZone);

  return {
    timeZone,
    city,
    region,
    searchText: `${city} ${region} ${timeZone}`.toLowerCase(),
    utcOffset: formatUtcOffset(timeZone, now),
    common: Boolean(common),
  };
}

export function isSupportedTimeZone(timeZone: unknown): boolean {
  if (typeof timeZone !== 'string' || timeZone.length === 0) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function getLocalTimeZone(): string {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isSupportedTimeZone(timeZone) ? timeZone : 'UTC';
  } catch {
    return 'UTC';
  }
}

export function getSupportedTimeZones(): string[] {
  const intl = Intl as IntlWithSupportedValues;
  const values = typeof intl.supportedValuesOf === 'function'
    ? intl.supportedValuesOf('timeZone')
    : FALLBACK_TIME_ZONES;

  return [...new Set([...values, 'UTC'])].filter(isSupportedTimeZone);
}

export function formatWorldClockTime(timeZone: string, date = new Date()): string {
  if (!isSupportedTimeZone(timeZone)) return '';
  return date.toLocaleTimeString('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatUtcOffset(timeZone: string, date = new Date()): string {
  if (!isSupportedTimeZone(timeZone)) return '';

  const part = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    timeZoneName: 'longOffset',
  }).formatToParts(date).find(value => value.type === 'timeZoneName');
  const value = part?.value ?? 'GMT';
  if (value === 'GMT' || value === 'UTC') return 'UTC';

  const match = value.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) return value.replace(/^GMT/, 'UTC');

  const [, sign, hours, minutes = '00'] = match;
  return `UTC${sign}${hours.padStart(2, '0')}:${minutes}`;
}

export function getWorldClockOptions(now = new Date()): WorldClockOption[] {
  const priority = new Map(COMMON_TIME_ZONES.map((zone, index) => [zone.timeZone, index]));

  return getSupportedTimeZones()
    .map(timeZone => buildOption(timeZone, now))
    .sort((a, b) => {
      const commonOrder = (priority.get(a.timeZone) ?? Number.MAX_SAFE_INTEGER) - (priority.get(b.timeZone) ?? Number.MAX_SAFE_INTEGER);
      return commonOrder || a.city.localeCompare(b.city) || a.timeZone.localeCompare(b.timeZone);
    });
}

export function getWorldClockOption(timeZone: string, now = new Date()): WorldClockOption | undefined {
  return isSupportedTimeZone(timeZone) ? buildOption(timeZone, now) : undefined;
}

export function normalizeWorldClocks(value: unknown, fallback: readonly string[] = [getLocalTimeZone()]): string[] {
  const source = Array.isArray(value) ? value : fallback;
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const candidate of source) {
    if (typeof candidate !== 'string' || seen.has(candidate) || !isSupportedTimeZone(candidate)) continue;
    seen.add(candidate);
    normalized.push(candidate);
  }

  return normalized;
}

export function reorderWorldClocks(ids: readonly string[], activeId: string, overId: string): string[] {
  const reordered = [...ids];
  const activeIndex = reordered.indexOf(activeId);
  const overIndex = reordered.indexOf(overId);
  if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) return reordered;

  reordered.splice(activeIndex, 1);
  reordered.splice(overIndex, 0, activeId);
  return reordered;
}
