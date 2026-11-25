export type Summary = { total: number; completed: number; completionRate: number; averageHours: number };
export type Category = { category: string; total: number; completed: number };
export type Week = { week: string; total: number; completed: number };
export type RequestRow = { id: number; week: string; category: string; status: string; effortHours: number };

export async function loadJson<T>(endpoint: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(endpoint, { signal });
  if (!response.ok) throw new Error(`Report request failed (HTTP ${response.status}).`);
  return response.json() as Promise<T>;
}

export function recordsUrl(week: string, status: string, category = '') {
  const url = new URL(window.location.pathname, window.location.origin);
  if (week) url.searchParams.set('week', week);
  url.searchParams.set('view', 'requests');
  if (status) url.searchParams.set('status', status);
  if (category) url.searchParams.set('category', category);
  url.hash = 'requests';
  return url.href;
}

export function comparison(week: string, s: Summary, weeks: Week[]) {
  const date = new Date(week + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() - 7);
  const priorWeek = date.toISOString().slice(0, 10);
  const prior = weeks.find(w => w.week === priorWeek);
  if (!prior || !prior.total) return `No records for the previous reporting week (${priorWeek}).`;
  if (!s.total) return 'No records for the selected week.';
  const volume = s.total - prior.total;
  const delta = (s.completed / s.total - prior.completed / prior.total) * 100;
  const signed = (n: number, digits: number) => (n > 0 ? '+' : '') + n.toFixed(digits);
  return `Versus ${priorWeek}: ${signed(volume, 0)} requests (${prior.total} → ${s.total}); completion ${signed(delta, 1)} percentage points (${prior.completed}/${prior.total} → ${s.completed}/${s.total}).`;
}

export function weeklyBrief(week: string, s: Summary, weeks: Week[], categories: Category[]) {
  const open = s.total - s.completed;
  const most = Math.max(0, ...categories.map(c => c.total - c.completed));
  const leaders = categories.filter(c => most > 0 && c.total - c.completed === most);
  return [
    `Relay handover · week of ${week}`,
    `${s.completed} of ${s.total} requests completed (${s.completionRate.toFixed(1)}%). ${open} open.`,
    comparison(week, s, weeks),
    ...leaders.map(c => `${c.category}: ${most} open — ${recordsUrl(week, 'Open', c.category)}`),
    `All requests: ${recordsUrl(week, '')}`,
  ].join('\n');
}
