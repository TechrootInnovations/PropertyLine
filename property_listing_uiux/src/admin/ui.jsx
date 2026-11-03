/* Reusable admin UI kit — every admin screen is composed from these pieces. */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  Check, ChevronDown, ChevronLeft, ChevronRight, Inbox, Plus, Search, X,
} from 'lucide-react';
import { PAGE_SIZES } from './constants';

/* ——— Layout primitives ——— */

export function PageHeader({ title, subtitle, actions, eyebrow }) {
  return (
    <div className="adm-page-head">
      <div className="adm-page-head__text">
        {eyebrow && <span className="adm-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="adm-page-head__actions">{actions}</div>}
    </div>
  );
}

export function Card({ id, title, subtitle, actions, children, className = '', bodyClassName = '', flush = false }) {
  return (
    <section id={id} className={`adm-card ${className}`}>
      {(title || actions) && (
        <header className="adm-card__head">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions && <div className="adm-card__actions">{actions}</div>}
        </header>
      )}
      <div className={`${flush ? 'adm-card__body--flush' : 'adm-card__body'} ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function StatCard({ icon: Icon, label, value, hint, tone = 'teal', to, active = false, onClick }) {
  const body = (
    <>
      {Icon && (
        <span className={`adm-stat__icon tone-${tone}`}>
          <Icon size={20} strokeWidth={2} />
        </span>
      )}
      <div className="adm-stat__text">
        <span className="adm-stat__label">{label}</span>
        <strong className="adm-stat__value">{value ?? 0}</strong>
        {hint && <span className="adm-stat__hint">{hint}</span>}
      </div>
    </>
  );
  const cls = `adm-stat${active ? ' is-active' : ''}${to || onClick ? ' is-link' : ''}`;
  if (to) return <Link to={to} className={cls}>{body}</Link>;
  if (onClick) return <button type="button" className={cls} onClick={onClick}>{body}</button>;
  return <div className={cls}>{body}</div>;
}

export function Badge({ tone = 'gray', children, icon: Icon, className = '' }) {
  return (
    <span className={`adm-badge tone-${tone} ${className}`}>
      {Icon && <Icon size={12} strokeWidth={2.4} />}
      {children}
    </span>
  );
}

export function OptionBadge({ list, value, fallbackTone = 'gray' }) {
  const opt = list.find((o) => o.value === value);
  return <Badge tone={opt?.tone || fallbackTone}>{opt?.label || value || '—'}</Badge>;
}

export function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', text, action }) {
  return (
    <div className="adm-empty">
      <span className="adm-empty__icon"><Icon size={26} /></span>
      <strong>{title}</strong>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function Field({ label, required, hint, error, full, children, className = '' }) {
  return (
    <div className={`adm-field${full ? ' is-full' : ''} ${className}`}>
      {label && (
        <label>
          {label}
          {required && <span className="adm-req"> *</span>}
        </label>
      )}
      {children}
      {hint && !error && <small className="adm-field__hint">{hint}</small>}
      {error && <small className="adm-field__error">{error}</small>}
    </div>
  );
}

export function Button({
  variant = 'primary', size = 'md', icon: Icon, children, loading = false, className = '', to, href, ...props
}) {
  const cls = `adm-btn adm-btn--${variant} adm-btn--${size}${loading ? ' is-loading' : ''} ${className}`;
  const inner = (
    <>
      {loading ? <span className="adm-spinner" aria-hidden="true" /> : Icon && <Icon size={size === 'sm' ? 15 : 17} />}
      {children && <span>{children}</span>}
    </>
  );
  if (to) return <Link to={to} className={cls} {...props}>{inner}</Link>;
  if (href) return <a href={href} className={cls} {...props}>{inner}</a>;
  return (
    <button type="button" {...props} className={cls} disabled={loading || props.disabled}>
      {inner}
    </button>
  );
}

export function IconAction({ icon: Icon, label, tone = 'gray', onClick, to, href, target }) {
  const cls = `adm-icon-action tone-${tone}`;
  const inner = <Icon size={17} strokeWidth={2} />;
  if (to) return <Link to={to} className={cls} title={label} aria-label={label} target={target}>{inner}</Link>;
  if (href) {
    return (
      <a href={href} className={cls} title={label} aria-label={label} target={target} rel={target ? 'noreferrer' : undefined}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" className={cls} title={label} aria-label={label} onClick={onClick}>
      {inner}
    </button>
  );
}

/* ——— Search & filters ——— */

export function SearchInput({ value, onChange, placeholder = 'Search…', delay = 350, className = '' }) {
  const [text, setText] = useState(value || '');
  const first = useRef(true);
  useEffect(() => { setText(value || ''); }, [value]);
  useEffect(() => {
    if (first.current) { first.current = false; return undefined; }
    if ((value || '') === text) return undefined;
    const t = setTimeout(() => onChange(text), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  return (
    <div className={`adm-search ${className}`}>
      <Search size={17} />
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} />
      {text && (
        <button type="button" aria-label="Clear search" onClick={() => { setText(''); onChange(''); }}>
          <X size={15} />
        </button>
      )}
    </div>
  );
}

export function FilterTabs({ items, value, onChange }) {
  return (
    <div className="adm-pills" role="tablist">
      {items.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={value === t.key}
          className={`adm-pill${value === t.key ? ' is-active' : ''}`}
          onClick={() => onChange(t.key)}
        >
          {t.label}
          {t.count != null && <span className="adm-pill__count">({t.count})</span>}
        </button>
      ))}
    </div>
  );
}

export function Toolbar({ children }) {
  return <div className="adm-toolbar">{children}</div>;
}

export function Select({ value, onChange, options, placeholder, className = '', ...props }) {
  return (
    <select
      className={`adm-select ${className}`}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      {...props}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

/* ——— Data table & pagination ——— */

export function DataTable({
  columns, rows, loading = false, rowKey = 'id', empty, skeletonRows = 6, onRowClick, rowClassName,
}) {
  return (
    <div className="adm-table-wrap">
      <table className="adm-table adm-table--cards">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ width: c.width, textAlign: c.align }} className={c.className}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && Array.from({ length: skeletonRows }).map((_, i) => (
            <tr key={`sk-${i}`} className="adm-table__skeleton">
              {columns.map((c) => <td key={c.key}><span className="adm-shimmer" /></td>)}
            </tr>
          ))}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="adm-table__empty">
                {empty || <EmptyState title="No records found" text="Try changing the search or filters." />}
              </td>
            </tr>
          )}
          {!loading && rows.map((row, index) => (
            <tr
              key={row[rowKey] ?? index}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`${onRowClick ? 'is-clickable' : ''} ${rowClassName ? rowClassName(row) : ''}`}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  style={{ textAlign: c.align }}
                  className={c.className}
                  data-label={typeof c.header === 'string' ? c.header : ''}
                >
                  {c.render ? c.render(row, index) : (row[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function pageWindow(page, totalPages) {
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const list = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out = [];
  list.forEach((p, i) => {
    if (i && p - list[i - 1] > 1) out.push(`gap-${p}`);
    out.push(p);
  });
  return out;
}

export function Pagination({ meta = {}, onPage, onLimit, sizes = PAGE_SIZES }) {
  const page = Number(meta.page) || 1;
  const limit = Number(meta.limit) || sizes[0];
  const total = Number(meta.total) || 0;
  const totalPages = Math.max(1, Number(meta.totalPages) || 1);
  const from = total ? (page - 1) * limit + 1 : 0;
  const to = Math.min(total, page * limit);

  return (
    <div className="adm-pager">
      <div className="adm-pager__info">
        Showing <strong>{from}</strong>–<strong>{to}</strong> of <strong>{total}</strong>
        {onLimit && (
          <label className="adm-pager__size">
            Rows
            <select value={limit} onChange={(e) => onLimit(Number(e.target.value))}>
              {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        )}
      </div>
      <div className="adm-pager__pages">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft size={16} />
        </button>
        {pageWindow(page, totalPages).map((p) => (typeof p === 'string'
          ? <span key={p} className="adm-pager__gap">…</span>
          : (
            <button
              key={p}
              type="button"
              className={p === page ? 'is-active' : ''}
              onClick={() => onPage(p)}
            >
              {p}
            </button>
          )))}
        <button type="button" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

/* ——— Modal ——— */

export function Modal({ open, onClose, title, subtitle, size = 'md', children, footer, bodyClassName = '' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="adm adm-modal-root">
      <div className="adm-modal__backdrop" onMouseDown={onClose} />
      <div className={`adm-modal adm-modal--${size}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="adm-modal__head">
          <div>
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="adm-modal__close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>
        <div className={`adm-modal__body ${bodyClassName}`}>{children}</div>
        {footer && <footer className="adm-modal__foot">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}

/* ——— Searchable select (combobox) ——— */

/**
 * options: [{ value, label, sub }]. Provide `loadOptions(q)` for server-side search.
 * `onCreate(text)` adds an inline "+ Add new" row.
 */
export function SearchSelect({
  value, onChange, options = [], loadOptions, placeholder = 'Select…', onCreate, createLabel = 'Add new',
  disabled = false, clearable = true, selectedLabel,
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [remote, setRemote] = useState(null);
  const [busy, setBusy] = useState(false);
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  useEffect(() => {
    if (!open || !loadOptions) return undefined;
    setBusy(true);
    const t = setTimeout(() => {
      Promise.resolve(loadOptions(q))
        .then((list) => setRemote(list || []))
        .catch(() => setRemote([]))
        .finally(() => setBusy(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q, open, loadOptions]);

  const list = useMemo(() => {
    if (loadOptions) return remote || [];
    const needle = q.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((o) => `${o.label} ${o.sub || ''}`.toLowerCase().includes(needle));
  }, [options, remote, q, loadOptions]);

  const current = [...options, ...(remote || [])].find((o) => String(o.value) === String(value));
  const label = current?.label || selectedLabel || '';

  const pick = (o) => {
    onChange(o ? o.value : '', o || null);
    setOpen(false);
    setQ('');
  };

  return (
    <div className={`adm-combo${open ? ' is-open' : ''}${disabled ? ' is-disabled' : ''}`} ref={boxRef}>
      <button
        type="button"
        className="adm-combo__control"
        disabled={disabled}
        onClick={() => { setOpen((o) => !o); setTimeout(() => inputRef.current?.focus(), 10); }}
      >
        <span className={label ? '' : 'is-placeholder'}>{label || placeholder}</span>
        {clearable && value ? (
          <span
            role="button"
            tabIndex={-1}
            className="adm-combo__clear"
            onClick={(e) => { e.stopPropagation(); pick(null); }}
            aria-label="Clear"
          >
            <X size={14} />
          </span>
        ) : null}
        <ChevronDown size={16} className="adm-combo__chev" />
      </button>
      {open && (
        <div className="adm-combo__menu">
          <div className="adm-combo__search">
            <Search size={15} />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Type to search…"
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); if (list[0]) pick(list[0]); }
                if (e.key === 'Escape') setOpen(false);
              }}
            />
          </div>
          <ul>
            {busy && <li className="adm-combo__note">Searching…</li>}
            {!busy && list.length === 0 && <li className="adm-combo__note">No matches</li>}
            {!busy && list.map((o) => (
              <li key={o.value}>
                <button type="button" onClick={() => pick(o)} className={String(o.value) === String(value) ? 'is-selected' : ''}>
                  <span>
                    <strong>{o.label}</strong>
                    {o.sub && <small>{o.sub}</small>}
                  </span>
                  {String(o.value) === String(value) && <Check size={15} />}
                </button>
              </li>
            ))}
          </ul>
          {onCreate && (
            <button
              type="button"
              className="adm-combo__create"
              onClick={() => { setOpen(false); onCreate(q.trim()); setQ(''); }}
            >
              <Plus size={15} /> {createLabel}{q.trim() ? `: “${q.trim()}”` : ''}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ——— Multi-select chips (for small lists) ——— */

export function ChipMultiSelect({ options, value = [], onChange, emptyHint }) {
  const selected = new Set((value || []).map(String));
  const toggle = (v) => {
    const next = new Set(selected);
    if (next.has(String(v))) next.delete(String(v));
    else next.add(String(v));
    onChange([...next].map((x) => (Number.isNaN(Number(x)) ? x : Number(x))));
  };
  if (!options.length) return <small className="adm-field__hint">{emptyHint || 'No options available'}</small>;
  return (
    <div className="adm-chips">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`adm-chip${selected.has(String(o.value)) ? ' is-on' : ''}`}
          onClick={() => toggle(o.value)}
        >
          {selected.has(String(o.value)) && <Check size={13} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ——— Toasts ——— */

const ToastContext = createContext({ notify: () => {} });

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const notify = useCallback((message, tone = 'success') => {
    const id = Date.now() + Math.random();
    setItems((list) => [...list, { id, message, tone }]);
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 3200);
  }, []);
  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="adm-toasts" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`adm-toast tone-${t.tone}`}>{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext).notify;
}

/* ——— Hooks ——— */

/** Keeps list-screen state (page, limit, search, filters) in one object. */
export function useListState(initial) {
  const [state, setState] = useState({ page: 1, limit: 20, q: '', ...initial });
  const set = useCallback((patch) => {
    setState((s) => ({ ...s, ...patch, page: patch.page ?? 1 }));
  }, []);
  return [state, set];
}

export function cleanParams(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== '' && v != null && v !== 'all')
  );
}
