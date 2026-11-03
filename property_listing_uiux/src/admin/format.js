/** Date & id formatting helpers for admin screens (Indian locale). */

/** Parses API dates. Plain 'YYYY-MM-DD' strings are treated as local calendar dates. */
export function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const s = String(value);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  // MySQL DATETIME ('YYYY-MM-DD HH:MM:SS', PHP API) → local time, works in Safari too
  const sql = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  const d = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : sql
      ? new Date(Number(sql[1]), Number(sql[2]) - 1, Number(sql[3]), Number(sql[4]), Number(sql[5]), Number(sql[6] || 0))
      : new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 5/10/2026 */
export function formatDate(value) {
  const d = parseDate(value);
  return d ? `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}` : '—';
}

/** 22 Sept 2026, 8:22 am */
export function formatDateTime(value) {
  const d = parseDate(value);
  if (!d) return '—';
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** yyyy-mm-dd for <input type="date"> */
export function toInputDate(value) {
  const d = parseDate(value);
  if (!d) return '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function todayInputDate() {
  return toInputDate(new Date());
}

/** 'overdue' | 'today' | 'upcoming' | null */
export function dueState(value) {
  const d = parseDate(value);
  if (!d) return null;
  const today = parseDate(todayInputDate());
  if (d < today) return 'overdue';
  if (d.getTime() === today.getTime()) return 'today';
  return 'upcoming';
}

export function inqCode(id) {
  return `INQ${String(id ?? '').padStart(6, '0')}`;
}

export function initials(name = '') {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'A';
}

export function telHref(phone) {
  return `tel:${String(phone || '').replace(/[^\d+]/g, '')}`;
}

export function compactNumber(n) {
  return Number(n || 0).toLocaleString('en-IN');
}
