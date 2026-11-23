// Strict Sri Lankan Healthcare Date Formatting Helper (DD/MM/YYYY)

export function formatDate(input?: string | Date | null): string {
  if (!input) return '-';
  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d.getTime())) {
    // If it's already in DD/MM/YYYY, return directly
    if (typeof input === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(input.trim())) {
      return input.trim();
    }
    return String(input);
  }

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateTime(input?: string | Date | null): string {
  if (!input) return '-';
  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d.getTime())) return String(input);

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${mins}`;
}

export function parseDmyToDate(dmy: string): Date | null {
  if (!dmy) return null;
  const match = dmy.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
}
