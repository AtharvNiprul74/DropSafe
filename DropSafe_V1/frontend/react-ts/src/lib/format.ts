/** Display helpers — terminology stays aligned with the PRD (SNAKE → Title Case for display only). */

export function titleCase(value?: string | null): string {
  if (!value) return '—';
  return value
    .toString()
    .toLowerCase()
    .split('_')
    .map((w) => (w === 'ai' ? 'AI' : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function pct(value?: number | null, digits = 0): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return `${value.toFixed(digits)}%`;
}

export function fmtNumber(value?: number | null): string {
  if (value === undefined || value === null) return '—';
  return value.toLocaleString('en-IN');
}

export function initials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

export function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

export function downloadTextFile(filename: string, contents: string, mime = 'text/csv'): void {
  const blob = new Blob([contents], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
