/** Return the Monday (YYYY-MM-DD) of the week containing `date` */
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toYMD(d);
}

export function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function fromYMD(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function prevWeek(weekStart: string): string {
  const d = fromYMD(weekStart);
  d.setDate(d.getDate() - 7);
  return toYMD(d);
}

export function nextWeek(weekStart: string): string {
  const d = fromYMD(weekStart);
  d.setDate(d.getDate() + 7);
  return toYMD(d);
}

/** "Semaine du 24 fév. 2025" */
export function weekLabel(weekStart: string): string {
  const d = fromYMD(weekStart);
  return `Semaine du ${d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

/** Today's day index within the current week (0=Mon … 6=Sun), or -1 if different week */
export function todayDayIndex(weekStart: string): number {
  const now = toYMD(new Date());
  const start = fromYMD(weekStart);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    if (toYMD(d) === now) return i;
  }
  return -1;
}
