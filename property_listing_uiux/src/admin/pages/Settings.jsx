import { useEffect, useState } from 'react';
import { ArrowRight, Building, Paintbrush, Phone, Save, Search, Share2, ToggleRight, Upload } from 'lucide-react';
import { api } from '../../lib/api';
import { Button, Card, Field, PageHeader, useToast } from '../ui';
import { useAdminTheme } from '../theme';

const SETTING_GROUPS = [
  { id: 'brand', label: 'Business name', icon: Building, hint: 'Name, tagline, logo and favicon.' },
  { id: 'contact', label: 'Phone & contact', icon: Phone, hint: 'Shown in header, footer and call buttons. Inquiry email alerts are set up under Configuration → Email & Notifications.' },
  { id: 'social', label: 'Social media', icon: Share2, hint: 'Paste your page links — icons appear in the website footer. Leave empty to hide.' },
  { id: 'seo', label: 'Google / SEO', icon: Search, hint: 'Default search titles and share preview.' },
  { id: 'features', label: 'Buttons & options', icon: ToggleRight, hint: 'Floating buttons and extras.' },
];

const SETTING_LABELS = {
  site_name: 'Website name',
  site_tagline: 'Short tagline',
  logo_url: 'Logo image link',
  favicon_url: 'Favicon image link',
  phone: 'Phone number',
  whatsapp: 'WhatsApp number (with country code, no +)',
  email: 'Email',
  address: 'Address',
  office_hours: 'Office hours',
  default_title: 'Google page title',
  default_description: 'Google description',
  default_keywords: 'Keywords',
  site_url: 'Full website URL (https://…)',
  og_image: 'Share image link (Facebook/WhatsApp)',
  primary_color: 'Main color',
  secondary_color: 'Dark color',
  accent_color: 'Accent color',
  surface_color: 'Background color',
  enable_3d: 'Enable 3D effects',
  show_whatsapp_float: 'Show WhatsApp floating button',
  show_call_float: 'Show Call floating button',
  currency_symbol: 'Currency symbol',
  rera_number: 'RERA registration number (shown in footer & property pages)',
  notify_email: 'Inquiry notification email (private — receives every new inquiry)',
  facebook: 'Facebook page link',
  instagram: 'Instagram profile link',
  youtube: 'YouTube channel link',
  linkedin: 'LinkedIn page link',
  twitter: 'X (Twitter) profile link',
};

/** Settings added in v2 — created on first save if the database does not have them yet. */
const EXTRA_SETTING_ROWS = [
  { setting_group: 'brand', setting_key: 'rera_number', setting_value: '', value_type: 'string', is_public: 1 },
  { setting_group: 'social', setting_key: 'facebook', setting_value: '', value_type: 'string', is_public: 1 },
  { setting_group: 'social', setting_key: 'instagram', setting_value: '', value_type: 'string', is_public: 1 },
  { setting_group: 'social', setting_key: 'youtube', setting_value: '', value_type: 'string', is_public: 1 },
  { setting_group: 'social', setting_key: 'linkedin', setting_value: '', value_type: 'string', is_public: 1 },
  { setting_group: 'social', setting_key: 'twitter', setting_value: '', value_type: 'string', is_public: 1 },
];

/** Same palette as the public site (index.css) */
const SITE_COLOR_SWATCHES = [
  { label: 'Main (teal)', hex: '#1F5C52' },
  { label: 'Dark', hex: '#121714' },
  { label: 'Gold accent', hex: '#C9A66B' },
  { label: 'Background', hex: '#E8ECE9' },
  { label: 'Deep teal', hex: '#143F38' },
  { label: 'Soft gold', hex: '#E8D5B0' },
  { label: 'Muted text', hex: '#5C6B66' },
];

function normalizeHex(value, fallback = '#000000') {
  if (!value) return fallback;
  let v = String(value).trim();
  if (!v.startsWith('#')) v = `#${v}`;
  if (/^#[0-9A-Fa-f]{3}$/.test(v)) {
    v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  }
  if (!/^#[0-9A-Fa-f]{6}$/i.test(v)) return fallback;
  return v.toUpperCase();
}

function ColorPickerField({ value, onChange }) {
  const hex = normalizeHex(value, '#000000');
  return (
    <div className="adm-color">
      <label className="adm-color__swatch" style={{ background: hex }} title="Pick a color">
        <input type="color" value={hex} onChange={(e) => onChange(normalizeHex(e.target.value))} aria-label="Color picker" />
      </label>
      <input
        className="adm-color__hex"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onChange(normalizeHex(e.target.value, hex))}
        placeholder="#1F5C52"
        spellCheck={false}
      />
      <div className="adm-color__presets" aria-label="Suggested colors">
        {SITE_COLOR_SWATCHES.map((p) => (
          <button
            key={p.hex}
            type="button"
            className={normalizeHex(value) === p.hex ? 'is-active' : ''}
            style={{ backgroundColor: p.hex }}
            title={`${p.label} (${p.hex})`}
            aria-label={`${p.label} ${p.hex}`}
            onClick={() => onChange(p.hex)}
          />
        ))}
      </div>
    </div>
  );
}

export default function Settings() {
  const notify = useToast();
  const { openTheme } = useAdminTheme();
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');

  useEffect(() => {
    api.adminSettings().then((res) => {
      // Colors live in Theme settings; mail/SMTP settings live on the Email & Notifications screen (never shown here)
      let list = (res.data || []).filter((r) => !['homepage', 'pages', 'mail', 'theme', 'admin_theme'].includes(r.setting_group) && r.setting_key !== 'notify_email');
      EXTRA_SETTING_ROWS.forEach((row) => {
        if (!list.some((r) => r.setting_key === row.setting_key)) list = [...list, row];
      });
      if (!list.some((r) => r.setting_key === 'favicon_url')) {
        list = [...list, { setting_group: 'brand', setting_key: 'favicon_url', setting_value: '/favicon.svg', value_type: 'string', is_public: 1 }];
      }
      if (!list.some((r) => r.setting_key === 'logo_url')) {
        list = [...list, { setting_group: 'brand', setting_key: 'logo_url', setting_value: '', value_type: 'string', is_public: 1 }];
      }
      setRows(list);
    }).catch((err) => notify(err.message, 'error'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setSaving(true);
    try {
      await api.adminUpdateSettings(rows);
      notify('Saved. Refresh the public website to see changes.');
    } catch (err) {
      notify(err.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateRow = (key, value) => {
    setRows((prev) => prev.map((r) => (r.setting_key === key ? { ...r, setting_value: value } : r)));
  };

  const uploadBrandAsset = async (key, file) => {
    if (!file) return;
    setUploading(key);
    try {
      const res = await api.adminUploadMedia(file);
      const url = res.data?.url;
      if (!url) throw new Error('Upload failed');
      updateRow(key, url);
      notify(`${key === 'logo_url' ? 'Logo' : 'Favicon'} uploaded — click Save to apply`);
    } catch (err) {
      notify(err.message || 'Upload failed', 'error');
    } finally {
      setUploading('');
    }
  };

  return (
    <div className="adm-page">
      <PageHeader
        title="Website Info"
        subtitle="Business name, logo, favicon, phone, WhatsApp, and Google text. Homepage pictures are under Homepage."
        actions={<Button icon={Save} loading={saving} onClick={save}>Save website info</Button>}
      />
      <button type="button" className="adm-theme-link" onClick={() => openTheme('website')}>
        <span className="adm-theme-link__icon"><Paintbrush size={20} /></span>
        <span className="adm-theme-link__text">
          <strong>Colors & appearance moved to Theme settings</strong>
          <small>Website brand colors, ready-made palettes, 3D effects, plus admin dark mode, accent and font.</small>
        </span>
        <span className="adm-theme-link__dots" aria-hidden><i /><i /><i /><i /></span>
        <ArrowRight size={18} className="adm-theme-link__go" />
      </button>
      {SETTING_GROUPS.map((g) => {
        const groupRows = rows.filter((r) => r.setting_group === g.id);
        if (!groupRows.length) return null;
        const Icon = g.icon;
        return (
          <Card key={g.id} title={<span className="adm-card-title-icon"><Icon size={18} /> {g.label}</span>} subtitle={g.hint} bodyClassName="adm-form-grid">
            {groupRows.map((row) => (
              <Field
                key={row.setting_key}
                label={SETTING_LABELS[row.setting_key] || row.setting_key}
                full={['default_description', 'address', 'default_keywords'].includes(row.setting_key) || row.value_type === 'color'}
              >
                {row.value_type === 'boolean' ? (
                  <select value={row.setting_value} onChange={(e) => updateRow(row.setting_key, e.target.value)}>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : row.value_type === 'color' ? (
                  <ColorPickerField value={row.setting_value} onChange={(v) => updateRow(row.setting_key, v)} />
                ) : (
                  <>
                    <input value={row.setting_value || ''} onChange={(e) => updateRow(row.setting_key, e.target.value)} />
                    {(row.setting_key === 'logo_url' || row.setting_key === 'favicon_url') && (
                      <div className="adm-upload-row">
                        <label className={`adm-btn adm-btn--soft adm-btn--sm${uploading === row.setting_key ? ' is-loading' : ''}`}>
                          {uploading === row.setting_key ? <span className="adm-spinner" /> : <Upload size={14} />}
                          <span>{uploading === row.setting_key ? 'Uploading…' : 'Upload file'}</span>
                          <input
                            type="file"
                            accept={row.setting_key === 'favicon_url'
                              ? 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/x-icon,.ico'
                              : 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml'}
                            hidden
                            disabled={!!uploading}
                            onChange={(e) => uploadBrandAsset(row.setting_key, e.target.files?.[0])}
                          />
                        </label>
                        {row.setting_value ? <img src={row.setting_value} alt="" className="adm-upload-row__preview" /> : null}
                      </div>
                    )}
                  </>
                )}
              </Field>
            ))}
          </Card>
        );
      })}
      <div className="adm-savebar">
        <span className="adm-muted">Changes apply to the public website after saving.</span>
        <Button icon={Save} loading={saving} onClick={save}>Save website info</Button>
      </div>
    </div>
  );
}
