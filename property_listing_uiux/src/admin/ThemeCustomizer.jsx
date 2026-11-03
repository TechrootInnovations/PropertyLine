import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check, ChevronDown, Globe, LayoutDashboard, Monitor, Moon, Paintbrush, PanelLeft, Palette, RotateCcw, Save,
  Search, Sparkles, Sun, Type, X,
} from 'lucide-react';
import { api } from '../lib/api';
import { useConfig } from '../lib/config';
import { useToast } from './ui';
import {
  ADMIN_ACCENTS, ADMIN_FONTS, ADMIN_THEME_DEFAULTS, SITE_PALETTES, applyAdminTheme, isHex, loadFont, themeToRows,
} from './theme';
import {
  DEFAULT_BODY_FONT, DEFAULT_HEADING_FONT, SITE_BODY_FONTS, SITE_HEADING_FONTS, fontStack, loadSiteFont,
} from '../lib/siteFonts';

const SITE_DEFAULTS = {
  ...SITE_PALETTES[0], enable_3d: true, site_mode: 'light', site_font_heading: DEFAULT_HEADING_FONT, site_font_body: DEFAULT_BODY_FONT,
};
const SITE_COLOR_FIELDS = [
  { key: 'primary_color', label: 'Main color', hint: 'Header, buttons and highlights' },
  { key: 'accent_color', label: 'Accent color', hint: 'Gold touches, badges and prices' },
  { key: 'secondary_color', label: 'Dark color', hint: 'Footer, dark sections and text' },
  { key: 'surface_color', label: 'Background color', hint: 'Soft page background' },
];

const MODES = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
];
const SIDEBARS = [
  { id: 'dark', label: 'Midnight' },
  { id: 'brand', label: 'Brand color' },
  { id: 'light', label: 'Light' },
];

const toBool = (v) => !(v === false || v === 'false' || v === 0 || v === '0');
const sameSite = (a, b) => SITE_COLOR_FIELDS.every(({ key }) => String(a[key]).toUpperCase() === String(b[key]).toUpperCase());

function normalizeHex(value, fallback) {
  let v = String(value || '').trim();
  if (!v.startsWith('#')) v = `#${v}`;
  if (/^#[0-9a-f]{3}$/i.test(v)) v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  return isHex(v) ? v.toUpperCase() : fallback;
}

function HexInput({ value, onChange, fallback }) {
  const [text, setText] = useState(value || '');
  useEffect(() => { setText(value || ''); }, [value]);
  return (
    <div className="thm-hex">
      <label className="thm-hex__swatch" style={{ background: isHex(value) ? value : fallback }}>
        <input
          type="color"
          value={isHex(value) ? value : fallback}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          aria-label="Pick a color"
        />
      </label>
      <span className="thm-hex__label">Hex</span>
      <input
        className="thm-hex__input"
        value={text}
        spellCheck={false}
        placeholder={fallback}
        onChange={(e) => {
          setText(e.target.value);
          const v = normalizeHex(e.target.value, '');
          if (v) onChange(v);
        }}
        onBlur={() => setText(value || '')}
      />
    </div>
  );
}

function FontPicker({
  value, onChange, fonts = ADMIN_FONTS, defaultFont = 'Inter', load = loadFont, sample = 'Aa',
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    fonts.forEach((f) => load(f.name));
    const onDoc = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(value); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const current = fonts.find((f) => f.name === value) || fonts[0];
  const list = fonts.filter((f) => `${f.name} ${f.note}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className={`thm-font${open ? ' is-open' : ''}`} ref={ref}>
      <button type="button" className="thm-font__control" onClick={() => setOpen((o) => !o)}>
        <span className="thm-font__aa" style={{ fontFamily: `'${current.name}', sans-serif` }}>{sample}</span>
        <span className="thm-font__name" style={{ fontFamily: `'${current.name}', sans-serif` }}>
          {current.name} <small>({current.note})</small>
        </span>
        {value !== defaultFont && (
          <span
            role="button"
            tabIndex={0}
            className="thm-font__clear"
            title="Back to default"
            onClick={(e) => { e.stopPropagation(); onChange(defaultFont); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onChange(defaultFont); } }}
          >
            <X size={14} />
          </span>
        )}
        <ChevronDown size={16} className="thm-font__chev" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="thm-font__menu"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
          >
            <div className="thm-font__search">
              <Search size={15} />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search fonts…" />
            </div>
            <div className="thm-font__list">
              {list.map((f) => (
                <button
                  key={f.name}
                  type="button"
                  className={f.name === value ? 'is-on' : ''}
                  onClick={() => { onChange(f.name); setOpen(false); setQ(''); }}
                >
                  <span style={{ fontFamily: `'${f.name}', sans-serif` }}>{f.name}</span>
                  <small>{f.note}</small>
                  {f.name === value && <Check size={15} />}
                </button>
              ))}
              {!list.length && <p className="thm-font__empty">No font matches “{q}”.</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ModePreview({ mode }) {
  return (
    <span className={`thm-mini thm-mini--${mode}`} aria-hidden>
      <span className="thm-mini__side" />
      <span className="thm-mini__main">
        <span className="thm-mini__bar" />
        <span className="thm-mini__cards"><i /><i /><i /></span>
        <span className="thm-mini__line" />
      </span>
    </span>
  );
}

function SitePreview({ site }) {
  return (
    <div
      className={`thm-site${site.site_mode === 'dark' ? ' is-dark' : ''}`}
      style={{
        '--sp': site.primary_color,
        '--sa': site.accent_color,
        '--sd': site.secondary_color,
        '--ss': site.surface_color,
        fontFamily: fontStack(site.site_font_body),
      }}
    >
      <div className="thm-site__hero">
        <div className="thm-site__nav">
          <span className="thm-site__logo" />
          <span className="thm-site__links"><i /><i /><i /></span>
          <span className="thm-site__cta">Call</span>
        </div>
        <div className="thm-site__copy">
          <span className="thm-site__eyebrow">Buy · Sell · Rent</span>
          <strong style={{ fontFamily: fontStack(site.site_font_heading, 'serif') }}>Homes with <em>presence</em></strong>
          <span className="thm-site__btns"><b>Explore homes</b><i>Book a viewing</i></span>
        </div>
      </div>
      <div className="thm-site__body">
        {[0, 1].map((i) => (
          <div className="thm-site__card" key={i}>
            <span className="thm-site__img" />
            <span className="thm-site__price">₹{i ? '85 Lakh' : '1.2 Cr'}</span>
            <span className="thm-site__txt" />
          </div>
        ))}
      </div>
      <div className="thm-site__foot" />
    </div>
  );
}

export default function ThemeCustomizer({ open, initialTab = 'admin', saved, onClose, onSaved }) {
  const notify = useToast();
  const { settings, refresh } = useConfig();
  const [tab, setTab] = useState(initialTab);
  const [draft, setDraft] = useState(saved);
  const [site, setSite] = useState(SITE_DEFAULTS);
  const [saving, setSaving] = useState(false);

  const savedSite = useMemo(() => ({
    primary_color: normalizeHex(settings.theme?.primary_color, SITE_DEFAULTS.primary_color),
    secondary_color: normalizeHex(settings.theme?.secondary_color, SITE_DEFAULTS.secondary_color),
    accent_color: normalizeHex(settings.theme?.accent_color, SITE_DEFAULTS.accent_color),
    surface_color: normalizeHex(settings.theme?.surface_color, SITE_DEFAULTS.surface_color),
    enable_3d: toBool(settings.theme?.enable_3d),
    site_mode: ['light', 'dark', 'system'].includes(settings.theme?.site_mode) ? settings.theme.site_mode : 'light',
    site_font_heading: settings.theme?.site_font_heading || DEFAULT_HEADING_FONT,
    site_font_body: settings.theme?.site_font_body || DEFAULT_BODY_FONT,
  }), [settings.theme]);

  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
    setDraft(saved);
    setSite(saved.site_sync !== 'false' ? { ...savedSite, site_mode: saved.mode } : savedSite);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Admin changes preview live; Cancel restores the saved look.
  useEffect(() => { if (open) applyAdminTheme(draft); }, [draft, open]);

  const cancel = () => {
    applyAdminTheme(saved);
    onClose();
  };

  const cancelRef = useRef(cancel);
  cancelRef.current = cancel;
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') cancelRef.current(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const syncSite = draft.site_sync !== 'false';
  const setMode = (mode) => {
    set({ mode });
    if (syncSite) setSite((s) => ({ ...s, site_mode: mode }));
  };
  const setSiteKey = (patch) => setSite((s) => ({ ...s, ...patch }));

  const reset = () => {
    if (tab === 'admin') setDraft({ ...ADMIN_THEME_DEFAULTS });
    else setSite({ ...SITE_DEFAULTS });
  };

  const save = async () => {
    setSaving(true);
    try {
      const siteRows = [
        ...SITE_COLOR_FIELDS.map(({ key }) => ({
          setting_group: 'theme', setting_key: key, setting_value: site[key], value_type: 'color', is_public: 1,
        })),
        { setting_group: 'theme', setting_key: 'enable_3d', setting_value: site.enable_3d ? 'true' : 'false', value_type: 'boolean', is_public: 1 },
        { setting_group: 'theme', setting_key: 'site_mode', setting_value: site.site_mode, value_type: 'string', is_public: 1 },
        { setting_group: 'theme', setting_key: 'site_font_heading', setting_value: site.site_font_heading, value_type: 'string', is_public: 1 },
        { setting_group: 'theme', setting_key: 'site_font_body', setting_value: site.site_font_body, value_type: 'string', is_public: 1 },
      ];
      await api.adminUpdateSettings([...themeToRows(draft), ...siteRows]);
      onSaved(draft);
      await refresh();
      notify('Theme saved — admin and website colors updated.');
      onClose();
    } catch (err) {
      notify(err.message || 'Could not save theme', 'error');
    } finally {
      setSaving(false);
    }
  };

  const websiteColor = savedSite.primary_color;
  const activePalette = SITE_PALETTES.find((p) => sameSite(p, site));

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="adm thm-root">
          <motion.div
            className="thm-backdrop"
            onMouseDown={cancel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className="thm-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Theme settings"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="thm-head">
              <span className="thm-head__icon"><Paintbrush size={20} /></span>
              <div className="thm-head__text">
                <h3>Theme settings</h3>
                <p>Personalise the admin console and your public website.</p>
              </div>
              <button type="button" className="thm-head__close" onClick={cancel} aria-label="Close"><X size={18} /></button>
            </header>

            <div className="thm-tabs" role="tablist">
              {[
                { id: 'admin', label: 'Admin panel', icon: LayoutDashboard },
                { id: 'website', label: 'Website', icon: Globe },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  className={tab === t.id ? 'is-on' : ''}
                  onClick={() => setTab(t.id)}
                >
                  {tab === t.id && <motion.span layoutId="thm-tab-pill" className="thm-tabs__pill" />}
                  <t.icon size={16} /> <span>{t.label}</span>
                </button>
              ))}
            </div>

            <div className="thm-body">
              {tab === 'admin' ? (
                <motion.div key="admin" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
                  <section className="thm-sec">
                    <h4><Sun size={15} /> Theme mode</h4>
                    <div className="thm-modes">
                      {MODES.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          className={`thm-mode${draft.mode === m.id ? ' is-on' : ''}`}
                          onClick={() => setMode(m.id)}
                        >
                          <ModePreview mode={m.id} />
                          <span className="thm-mode__label">
                            <span className={`thm-mode__icon thm-mode__icon--${m.id}`}><m.icon size={15} /></span>
                            {m.label}
                            {draft.mode === m.id && <span className="thm-check"><Check size={12} strokeWidth={3} /></span>}
                          </span>
                        </button>
                      ))}
                    </div>
                    <label className="thm-toggle thm-toggle--compact">
                      <span>
                        <strong>Also apply to website</strong>
                        <small>Visitors see the website in the same mode ({syncSite ? (MODES.find((m) => m.id === draft.mode)?.label || 'Light') : 'off'}).</small>
                      </span>
                      <input
                        type="checkbox"
                        checked={syncSite}
                        onChange={(e) => {
                          set({ site_sync: e.target.checked ? 'true' : 'false' });
                          if (e.target.checked) setSite((s) => ({ ...s, site_mode: draft.mode }));
                        }}
                      />
                      <i aria-hidden />
                    </label>
                  </section>

                  <section className="thm-sec">
                    <h4><Palette size={15} /> Accent color</h4>
                    <div className="thm-swatches">
                      {ADMIN_ACCENTS.map((a) => {
                        const on = (draft.accent || '').toUpperCase() === a.hex;
                        return (
                          <button
                            key={a.label}
                            type="button"
                            className={`thm-swatch${on ? ' is-on' : ''}${a.hex ? '' : ' thm-swatch--site'}`}
                            style={{ '--sw': a.hex || websiteColor }}
                            title={a.hex ? `${a.label} ${a.hex}` : `${a.label} (matches your website)`}
                            aria-label={a.label}
                            onClick={() => set({ accent: a.hex })}
                          >
                            {on && <Check size={15} strokeWidth={3} />}
                          </button>
                        );
                      })}
                    </div>
                    <div className="thm-row">
                      <HexInput
                        value={draft.accent}
                        fallback={websiteColor}
                        onChange={(v) => set({ accent: v })}
                      />
                      <span className="thm-note">
                        {draft.accent ? 'Custom accent for the admin console.' : 'Following your website main color.'}
                      </span>
                    </div>
                  </section>

                  <section className="thm-sec">
                    <h4><Type size={15} /> Font style</h4>
                    <FontPicker value={draft.font} onChange={(font) => set({ font })} />
                  </section>

                  <section className="thm-sec">
                    <h4><PanelLeft size={15} /> Sidebar style</h4>
                    <div className="thm-sidebars">
                      {SIDEBARS.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className={`thm-sb${draft.sidebar === s.id ? ' is-on' : ''}`}
                          onClick={() => set({ sidebar: s.id })}
                        >
                          <span className={`thm-sb__art thm-sb__art--${s.id}`} aria-hidden><i /><i /><i /><i /></span>
                          <span>{s.label}</span>
                          {draft.sidebar === s.id && <span className="thm-check"><Check size={12} strokeWidth={3} /></span>}
                        </button>
                      ))}
                    </div>
                  </section>
                </motion.div>
              ) : (
                <motion.div key="website" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
                  <section className="thm-sec">
                    <h4><Sun size={15} /> Website mode</h4>
                    <div className="thm-modes thm-modes--compact">
                      {MODES.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          className={`thm-mode${site.site_mode === m.id ? ' is-on' : ''}`}
                          onClick={() => {
                            setSiteKey({ site_mode: m.id });
                            if (m.id !== draft.mode) set({ site_sync: 'false' });
                          }}
                        >
                          <span className="thm-mode__label">
                            <span className={`thm-mode__icon thm-mode__icon--${m.id}`}><m.icon size={15} /></span>
                            {m.label}
                            {site.site_mode === m.id && <span className="thm-check"><Check size={12} strokeWidth={3} /></span>}
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="thm-sec">
                    <h4><Sparkles size={15} /> Live preview</h4>
                    <SitePreview site={site} />
                  </section>

                  <section className="thm-sec">
                    <h4><Palette size={15} /> Ready-made palettes</h4>
                    <div className="thm-palettes">
                      {SITE_PALETTES.map((p) => (
                        <button
                          key={p.name}
                          type="button"
                          className={`thm-pal${activePalette?.name === p.name ? ' is-on' : ''}`}
                          onClick={() => setSiteKey({
                            primary_color: p.primary_color,
                            secondary_color: p.secondary_color,
                            accent_color: p.accent_color,
                            surface_color: p.surface_color,
                          })}
                        >
                          <span className="thm-pal__strip">
                            <i style={{ background: p.primary_color }} />
                            <i style={{ background: p.accent_color }} />
                            <i style={{ background: p.secondary_color }} />
                            <i style={{ background: p.surface_color }} />
                          </span>
                          <span className="thm-pal__name">{p.name}</span>
                          {activePalette?.name === p.name && <span className="thm-check"><Check size={12} strokeWidth={3} /></span>}
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="thm-sec">
                    <h4><Paintbrush size={15} /> Brand colors</h4>
                    <div className="thm-colors">
                      {SITE_COLOR_FIELDS.map((f) => (
                        <div className="thm-color" key={f.key}>
                          <div className="thm-color__text">
                            <strong>{f.label}</strong>
                            <small>{f.hint}</small>
                          </div>
                          <HexInput value={site[f.key]} fallback={SITE_DEFAULTS[f.key]} onChange={(v) => setSiteKey({ [f.key]: v })} />
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="thm-sec">
                    <h4><Type size={15} /> Website fonts</h4>
                    <div className="thm-fonts">
                      <div>
                        <span className="thm-fonts__label">Headings</span>
                        <FontPicker
                          value={site.site_font_heading}
                          onChange={(v) => setSiteKey({ site_font_heading: v })}
                          fonts={SITE_HEADING_FONTS}
                          defaultFont={DEFAULT_HEADING_FONT}
                          load={loadSiteFont}
                          sample="Ag"
                        />
                      </div>
                      <div>
                        <span className="thm-fonts__label">Body text</span>
                        <FontPicker
                          value={site.site_font_body}
                          onChange={(v) => setSiteKey({ site_font_body: v })}
                          fonts={SITE_BODY_FONTS}
                          defaultFont={DEFAULT_BODY_FONT}
                          load={loadSiteFont}
                        />
                      </div>
                    </div>
                  </section>

                  <section className="thm-sec">
                    <label className="thm-toggle">
                      <span>
                        <strong>3D effects & motion</strong>
                        <small>Tilt, depth and parallax on property cards and hero.</small>
                      </span>
                      <input
                        type="checkbox"
                        checked={site.enable_3d}
                        onChange={(e) => setSiteKey({ enable_3d: e.target.checked })}
                      />
                      <i aria-hidden />
                    </label>
                  </section>
                </motion.div>
              )}
            </div>

            <footer className="thm-foot">
              <button type="button" className="thm-btn thm-btn--ghost" onClick={reset}>
                <RotateCcw size={15} /> Reset {tab === 'admin' ? 'admin' : 'website'}
              </button>
              <div className="thm-foot__right">
                <button type="button" className="thm-btn thm-btn--dark" onClick={cancel}><X size={15} /> Cancel</button>
                <button type="button" className="thm-btn thm-btn--primary" onClick={save} disabled={saving}>
                  {saving ? <span className="adm-spinner" /> : <Save size={15} />} {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
