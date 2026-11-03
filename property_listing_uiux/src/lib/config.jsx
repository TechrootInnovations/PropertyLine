import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';
import { DEFAULT_HOMEPAGE, mergeHomepage } from './homepageDefaults';
import { DEFAULT_BODY_FONT, DEFAULT_HEADING_FONT, fontStack, loadSiteFont } from './siteFonts';

const ConfigContext = createContext({
  settings: {},
  loading: true,
  refresh: async () => {},
});

const defaults = {
  brand: {
    site_name: 'Terranexus Properties',
    site_tagline: 'Buy · Sell · Rent across India',
    logo_url: '',
    favicon_url: '',
  },
  theme: {
    primary_color: '#1F5C52',
    secondary_color: '#121714',
    accent_color: '#C9A66B',
    surface_color: '#E8ECE9',
    enable_3d: true,
    site_mode: 'light',
    site_font_heading: DEFAULT_HEADING_FONT,
    site_font_body: DEFAULT_BODY_FONT,
  },
  contact: {
    phone: '+91 73501 96969',
    whatsapp: '917350196969',
    email: 'terranexusproperties@gmail.com',
    address: 'India',
    office_hours: 'Mon–Sat 10:00 AM – 7:00 PM',
  },
  features: {
    show_whatsapp_float: true,
    show_call_float: true,
    currency_symbol: '₹',
  },
  seo: {
    default_title: 'Terranexus Properties | Find Your Dream Home',
    default_description:
      'Browse sale & rent properties across India with Terranexus Properties — verified listings and expert guidance.',
    site_url: '',
    default_keywords:
      'property for sale, property for rent, real estate India, Terranexus Properties, buy home, rent home',
    og_image: '',
  },
  homepage: DEFAULT_HOMEPAGE,
};

function applyDefaultSeo(seo = {}) {
  const title = seo.default_title || defaults.seo.default_title;
  const description = seo.default_description || defaults.seo.default_description;
  const keywords = seo.default_keywords || defaults.seo.default_keywords;

  document.title = title;

  const setMeta = (attr, key, content) => {
    if (!content) return;
    let el = document.head.querySelector(`meta[${attr}="${key}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  setMeta('name', 'description', description);
  setMeta('name', 'keywords', keywords);
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', description);
  if (seo.og_image) setMeta('property', 'og:image', seo.og_image);
  if (seo.site_url) {
    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', `${String(seo.site_url).replace(/\/$/, '')}/`);
  }
}

function applyFavicon(url) {
  if (!url) return;
  let link = document.head.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'icon');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

function hexToRgb(hex) {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function applyTheme(theme = {}) {
  const root = document.documentElement;
  const primary = theme.primary_color || defaults.theme.primary_color;
  const secondary = theme.secondary_color || defaults.theme.secondary_color;
  const accent = theme.accent_color || defaults.theme.accent_color;
  const surface = theme.surface_color || defaults.theme.surface_color;

  root.style.setProperty('--pv-primary', primary);
  root.style.setProperty('--pv-secondary', secondary);
  root.style.setProperty('--pv-accent', accent);
  root.style.setProperty('--pv-surface', surface);
  root.style.setProperty('--pv-ink', secondary);
  root.style.setProperty('--pv-card', '#ffffff');

  const p = hexToRgb(primary);
  const a = hexToRgb(accent);
  if (p) {
    root.style.setProperty('--pv-primary-deep', `rgb(${Math.max(0, p.r - 30)}, ${Math.max(0, p.g - 25)}, ${Math.max(0, p.b - 15)})`);
    root.style.setProperty('--pv-line', `rgba(${p.r}, ${p.g}, ${p.b}, 0.12)`);
  }
  if (a) {
    root.style.setProperty(
      '--pv-accent-soft',
      `rgb(${Math.min(255, a.r + 40)}, ${Math.min(255, a.g + 40)}, ${Math.min(255, a.b + 50)})`
    );
  }

  root.dataset.pv3d = theme.enable_3d === false ? 'off' : 'on';

  // Website fonts (defaults are bundled; others load from Google Fonts on demand)
  const heading = theme.site_font_heading || DEFAULT_HEADING_FONT;
  const body = theme.site_font_body || DEFAULT_BODY_FONT;
  if (heading !== DEFAULT_HEADING_FONT && loadSiteFont(heading)) root.style.setProperty('--pv-font-display', fontStack(heading, 'serif'));
  else root.style.removeProperty('--pv-font-display');
  if (body !== DEFAULT_BODY_FONT && loadSiteFont(body)) root.style.setProperty('--pv-font-body', fontStack(body));
  else root.style.removeProperty('--pv-font-body');
}

/** Website light/dark mode chosen in admin Theme settings (light | dark | system). */
export function resolveSiteMode(mode) {
  if (mode === 'system') {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode === 'dark' ? 'dark' : 'light';
}

export function ConfigProvider({ children }) {
  const [settings, setSettings] = useState(defaults);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const res = await api.getSettings();
      const merged = {
        brand: { ...defaults.brand, ...(res.data?.brand || {}) },
        theme: { ...defaults.theme, ...(res.data?.theme || {}) },
        contact: { ...defaults.contact, ...(res.data?.contact || {}) },
        features: { ...defaults.features, ...(res.data?.features || {}) },
        seo: { ...defaults.seo, ...(res.data?.seo || {}) },
        homepage: mergeHomepage(res.data?.homepage || {}),
        social: res.data?.social || {},
      };
      setSettings(merged);
      applyTheme(merged.theme);
      applyDefaultSeo(merged.seo);
      applyFavicon(merged.brand?.favicon_url);
    } catch {
      applyTheme(defaults.theme);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <ConfigContext.Provider value={{ settings, loading, refresh }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  return useContext(ConfigContext);
}
