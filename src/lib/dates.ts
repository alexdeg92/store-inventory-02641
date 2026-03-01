/**
 * Get the Monday (start of week) for a given date
 */
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ...
  const diff = day === 0 ? -6 : 1 - day; // adjust to Monday
  d.setDate(d.getDate() + diff);
  return formatDate(d);
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse YYYY-MM-DD to Date object
 */
export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Format week label: "Semaine du 24 fév. 2025"
 */
export function formatWeekLabel(weekStartDate: string): string {
  const date = parseDate(weekStartDate);
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };
  return `Semaine du ${date.toLocaleDateString('fr-CA', options)}`;
}

/**
 * Get array of dates for a week starting from weekStartDate
 */
export function getWeekDates(weekStartDate: string): string[] {
  const start = parseDate(weekStartDate);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return formatDate(d);
  });
}

/**
 * Get previous week's start date
 */
export function getPreviousWeekStart(weekStartDate: string): string {
  const d = parseDate(weekStartDate);
  d.setDate(d.getDate() - 7);
  return formatDate(d);
}

/**
 * Get next week's start date
 */
export function getNextWeekStart(weekStartDate: string): string {
  const d = parseDate(weekStartDate);
  d.setDate(d.getDate() + 7);
  return formatDate(d);
}
