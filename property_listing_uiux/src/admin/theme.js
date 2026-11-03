import { createContext, useContext } from 'react';

/** Admin console appearance — saved in site_settings (group admin_theme, private) and cached locally. */
export const ADMIN_THEME_DEFAULTS = { mode: 'light', accent: '', font: 'Inter', sidebar: 'dark', site_sync: 'true' };

export const ADMIN_ACCENTS = [
  { label: 'Website color', hex: '' },
  { label: 'Emerald', hex: '#0F8A5F' },
  { label: 'Ocean', hex: '#0E7490' },
  { label: 'Royal blue', hex: '#2563EB' },
  { label: 'Indigo', hex: '#4F46E5' },
  { label: 'Violet', hex: '#7C3AED' },
  { label: 'Rose', hex: '#E11D48' },
  { label: 'Sunset', hex: '#EA580C' },
  { label: 'Bronze', hex: '#B7791F' },
  { label: 'Graphite', hex: '#334155' },
];

export const ADMIN_FONTS = [
  { name: 'Inter', note: 'Clean' },
  { name: 'Poppins', note: 'Modern' },
  { name: 'Plus Jakarta Sans', note: 'Premium' },
  { name: 'Manrope', note: 'Friendly' },
  { name: 'DM Sans', note: 'Geometric' },
  { name: 'Outfit', note: 'Contemporary' },
  { name: 'Montserrat', note: 'Elegant' },
  { name: 'Roboto', note: 'Standard' },
  { name: 'Open Sans', note: 'Classic' },
  { name: 'Nunito Sans', note: 'Soft' },
  { name: 'Public Sans', note: 'Neutral' },
  { name: 'Work Sans', note: 'Balanced' },
];

/** Website brand palettes (public site colors). */
export const SITE_PALETTES = [
  { name: 'Emerald & Gold', primary_color: '#1F5C52', secondary_color: '#121714', accent_color: '#C9A66B', surface_color: '#E8ECE9' },
  { name: 'Midnight Navy', primary_color: '#1E3A5F', secondary_color: '#0E1726', accent_color: '#D4A857', surface_color: '#E9EDF3' },
  { name: 'Royal Plum', primary_color: '#4B2E5C', secondary_color: '#1A1220', accent_color: '#D9A86C', surface_color: '#EFEAF1' },
  { name: 'Terracotta', primary_color: '#9A4A32', secondary_color: '#1F1714', accent_color: '#E0B47A', surface_color: '#F2ECE6' },
  { name: 'Ocean Teal', primary_color: '#0F6E7A', secondary_color: '#0C1A1E', accent_color: '#F0B65A', surface_color: '#E6F0F1' },
  { name: 'Charcoal & Copper', primary_color: '#2F3A40', secondary_color: '#111518', accent_color: '#C47F4F', surface_color: '#ECEDEE' },
];

const KEYS = Object.keys(ADMIN_THEME_DEFAULTS);
const CACHE_KEY = 'adm_theme';

export function readCachedTheme() {
  try {
    return { ...ADMIN_THEME_DEFAULTS, ...JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') };
  } catch {
    return { ...ADMIN_THEME_DEFAULTS };
  }
}

export function cacheTheme(theme) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(theme)); } catch { /* ignore */ }
}

export function themeFromRows(rows = []) {
  const theme = { ...ADMIN_THEME_DEFAULTS };
  rows.forEach((r) => {
    if (r.setting_group !== 'admin_theme') return;
    const key = String(r.setting_key).replace(/^admin_theme_/, '');
    if (KEYS.includes(key) && r.setting_value != null) theme[key] = String(r.setting_value);
  });
  return theme;
}

export function themeToRows(theme) {
  return KEYS.map((k) => ({
    setting_group: 'admin_theme',
    setting_key: `admin_theme_${k}`,
    setting_value: theme[k] ?? '',
    value_type: 'string',
    is_public: 0,
  }));
}

export function isHex(v) {
  return /^#[0-9a-f]{6}$/i.test(String(v || ''));
}

function darken(hex, amount = 0.22) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.round(c * (1 - amount)));
  return `rgb(${f((n >> 16) & 255)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
}

export function fontHref(name) {
  return `https://fonts.googleapis.com/css2?family=${String(name).replace(/ /g, '+')}:wght@400;500;600;700&display=swap`;
}

export function loadFont(name) {
  if (!name || name === 'Inter') return;
  const id = `adm-font-${name.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = fontHref(name);
  document.head.appendChild(link);
}

export function resolveMode(mode) {
  if (mode === 'system') {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode === 'dark' ? 'dark' : 'light';
}

export function applyAdminTheme(theme) {
  const t = { ...ADMIN_THEME_DEFAULTS, ...theme };
  const root = document.documentElement;
  root.dataset.admMode = resolveMode(t.mode);
  root.dataset.admSidebar = t.sidebar || 'dark';
  if (isHex(t.accent)) {
    root.style.setProperty('--adm-primary', t.accent);
    root.style.setProperty('--adm-primary-deep', darken(t.accent));
  } else {
    root.style.removeProperty('--adm-primary');
    root.style.removeProperty('--adm-primary-deep');
  }
  if (t.font && t.font !== 'Inter') {
    loadFont(t.font);
    root.style.setProperty('--adm-font', `'${t.font}'`);
  } else {
    root.style.removeProperty('--adm-font');
  }
}

export function clearAdminTheme() {
  const root = document.documentElement;
  delete root.dataset.admMode;
  delete root.dataset.admSidebar;
  ['--adm-primary', '--adm-primary-deep', '--adm-font'].forEach((p) => root.style.removeProperty(p));
}

export const AdminThemeContext = createContext({ openTheme: () => {} });
export const useAdminTheme = () => useContext(AdminThemeContext);
