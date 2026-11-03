/** Website fonts selectable in admin Theme settings → Website. `spec` is the Google Fonts css2 axis string. */
export const SITE_HEADING_FONTS = [
  { name: 'Playfair Display', note: 'Luxury serif', kind: 'serif', spec: 'ital,wght@0,400;0,500;0,600;0,700;1,400;1,500' },
  { name: 'Cormorant Garamond', note: 'Elegant serif', kind: 'serif', spec: 'ital,wght@0,500;0,600;0,700;1,500' },
  { name: 'Lora', note: 'Warm serif', kind: 'serif', spec: 'ital,wght@0,400;0,500;0,600;0,700;1,400;1,500' },
  { name: 'DM Serif Display', note: 'Bold serif', kind: 'serif', spec: 'ital@0;1' },
  { name: 'Libre Baskerville', note: 'Classic serif', kind: 'serif', spec: 'ital,wght@0,400;0,700;1,400' },
  { name: 'Fraunces', note: 'Soft serif', kind: 'serif', spec: 'ital,wght@0,400;0,600;0,700;1,400' },
  { name: 'Merriweather', note: 'Readable serif', kind: 'serif', spec: 'ital,wght@0,400;0,700;1,400' },
  { name: 'Cinzel', note: 'Roman capitals', kind: 'serif', spec: 'wght@400;500;600;700' },
  { name: 'Marcellus', note: 'Refined', kind: 'serif', spec: '' },
  { name: 'Montserrat', note: 'Modern sans', kind: 'sans', spec: 'ital,wght@0,400;0,600;0,700;1,400' },
  { name: 'Poppins', note: 'Geometric sans', kind: 'sans', spec: 'ital,wght@0,400;0,500;0,600;0,700;1,400' },
  { name: 'Outfit', note: 'Clean sans', kind: 'sans', spec: 'wght@400;500;600;700' },
];

export const SITE_BODY_FONTS = [
  { name: 'Outfit', note: 'Clean', kind: 'sans', spec: 'wght@300;400;500;600;700' },
  { name: 'Inter', note: 'Neutral', kind: 'sans', spec: 'wght@300;400;500;600;700' },
  { name: 'Poppins', note: 'Modern', kind: 'sans', spec: 'wght@300;400;500;600;700' },
  { name: 'Manrope', note: 'Friendly', kind: 'sans', spec: 'wght@300;400;500;600;700' },
  { name: 'DM Sans', note: 'Geometric', kind: 'sans', spec: 'wght@300;400;500;600;700' },
  { name: 'Plus Jakarta Sans', note: 'Premium', kind: 'sans', spec: 'wght@300;400;500;600;700' },
  { name: 'Nunito Sans', note: 'Soft', kind: 'sans', spec: 'wght@300;400;500;600;700' },
  { name: 'Open Sans', note: 'Classic', kind: 'sans', spec: 'wght@300;400;500;600;700' },
  { name: 'Roboto', note: 'Standard', kind: 'sans', spec: 'wght@300;400;500;600;700' },
  { name: 'Lato', note: 'Warm', kind: 'sans', spec: 'wght@300;400;700' },
  { name: 'Work Sans', note: 'Balanced', kind: 'sans', spec: 'wght@300;400;500;600;700' },
  { name: 'Mulish', note: 'Minimal', kind: 'sans', spec: 'wght@300;400;500;600;700' },
];

export const DEFAULT_HEADING_FONT = 'Playfair Display';
export const DEFAULT_BODY_FONT = 'Outfit';

const ALL = [...SITE_HEADING_FONTS, ...SITE_BODY_FONTS];

/** Loads a Google font once (Playfair Display + Outfit are already bundled via index.css). */
export function loadSiteFont(name) {
  const font = ALL.find((f) => f.name === name);
  if (!font) return null;
  const id = `pv-font-${name.replace(/\s+/g, '-').toLowerCase()}`;
  if (!document.getElementById(id)) {
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${name.replace(/ /g, '+')}${font.spec ? `:${font.spec}` : ''}&display=swap`;
    document.head.appendChild(link);
  }
  return font;
}

export function fontStack(name, fallbackKind = 'sans') {
  const font = ALL.find((f) => f.name === name);
  const kind = font?.kind || fallbackKind;
  return `'${name}', ${kind === 'serif' ? "Georgia, 'Times New Roman', serif" : 'system-ui, sans-serif'}`;
}
