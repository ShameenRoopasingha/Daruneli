/**
 * Strict Sri Lankan Healthcare Date Formatting Helper (DD/MM/YYYY)
 * Mobile App Utilities
 */

/**
 * Formats a date, ISO string, or existing date string strictly into DD/MM/YYYY.
 * Handles existing DD/MM/YYYY strings directly to avoid JavaScript Date locale swap bugs.
 */
export function formatDate(input?: string | Date | null): string {
  if (!input) return '-';

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return '-';

    // If already in DD/MM/YYYY, return directly
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      return trimmed;
    }

    // If in YYYY-MM-DD format (e.g. SQLite date), format directly without timezone shifts
    const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymdMatch) {
      const [, y, m, d] = ymdMatch;
      return `${d}/${m}/${y}`;
    }

    const d = new Date(trimmed);
    if (isNaN(d.getTime())) {
      return trimmed;
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  if (input instanceof Date) {
    if (isNaN(input.getTime())) return '-';
    const day = String(input.getDate()).padStart(2, '0');
    const month = String(input.getMonth() + 1).padStart(2, '0');
    const year = input.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return String(input);
}

/**
 * Formats a date or datetime string into DD/MM/YYYY HH:mm.
 */
export function formatDateTime(input?: string | Date | null): string {
  if (!input) return '-';

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return '-';

    // If already in DD/MM/YYYY HH:mm, return directly
    if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    // If ISO string like YYYY-MM-DDTHH:mm or YYYY-MM-DD HH:mm
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
    if (isoMatch) {
      const [, y, m, d, hh, mm] = isoMatch;
      return `${d}/${m}/${y} ${hh}:${mm}`;
    }

    const d = new Date(trimmed);
    if (isNaN(d.getTime())) {
      return trimmed;
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}`;
  }

  if (input instanceof Date) {
    if (isNaN(input.getTime())) return '-';
    const day = String(input.getDate()).padStart(2, '0');
    const month = String(input.getMonth() + 1).padStart(2, '0');
    const year = input.getFullYear();
    const hours = String(input.getHours()).padStart(2, '0');
    const mins = String(input.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}`;
  }

  return String(input);
}

/**
 * Parses a DD/MM/YYYY string into a Date object or null if invalid.
 */
export function parseDmyToDate(dmy: string): Date | null {
  if (!dmy) return null;
  const match = dmy.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  const day = parseInt(d, 10);
  const month = parseInt(m, 10) - 1;
  const year = parseInt(y, 10);

  const date = new Date(year, month, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

/**
 * Parses a DD/MM/YYYY (or D/M/YYYY) string into ISO YYYY-MM-DD format and Date object.
 */
export function parseDmyToIso(str: string): { iso: string; date: Date } | null {
  if (!str) return null;
  const match = str.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  const dayNum = parseInt(d, 10);
  const monthNum = parseInt(m, 10);
  const yearNum = parseInt(y, 10);

  const date = new Date(yearNum, monthNum - 1, dayNum);
  if (
    date.getFullYear() !== yearNum ||
    date.getMonth() !== monthNum - 1 ||
    date.getDate() !== dayNum
  ) {
    return null;
  }

  const padDay = String(dayNum).padStart(2, '0');
  const padMonth = String(monthNum).padStart(2, '0');
  return {
    iso: `${yearNum}-${padMonth}-${padDay}`,
    date,
  };
}

export const formatDisplayDate = formatDate;
