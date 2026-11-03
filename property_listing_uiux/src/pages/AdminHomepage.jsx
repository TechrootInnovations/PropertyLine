import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { DEFAULT_HOMEPAGE, mergeHomepage } from '../lib/homepageDefaults';
import { useConfig } from '../lib/config';
import SaveButton from '../components/SaveButton';

function ImageSlot({ label, image, onChange, onUpload }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setErr('');
    try {
      const res = await api.adminUploadMedia(file);
      const url = res.data?.url;
      if (!url) throw new Error('Upload failed');
      onUpload(url);
    } catch (ex) {
      setErr(ex.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-image-slot">
      <strong className="admin-image-slot__title">{label}</strong>
      <div className="admin-image-slot__preview">
        {image ? (
          <img src={image} alt="" />
        ) : (
          <div className="admin-image-slot__empty">No image yet</div>
        )}
      </div>
      <label className={`btn btn-primary admin-image-slot__upload${busy ? ' is-loading' : ''}`}>
        {busy && <span className="btn-spinner" aria-hidden="true" />}
        <span>{busy ? 'Uploading…' : 'Upload image'}</span>
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden disabled={busy} onChange={pickFile} />
      </label>
      <div className="field">
        <label>Or paste image link</label>
        <input value={image || ''} onChange={(e) => onChange(e.target.value)} placeholder="https://…" />
      </div>
      {err && <p className="admin-image-slot__error">{err}</p>}
    </div>
  );
}

export default function AdminHomepage() {
  const { refresh } = useConfig();
  const [home, setHome] = useState(DEFAULT_HOMEPAGE);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .adminSettings()
      .then((res) => {
        const rows = res.data || [];
        const partial = {};
        rows
          .filter((r) => r.setting_group === 'homepage')
          .forEach((r) => {
            let val = r.setting_value;
            if (r.value_type === 'json') {
              try {
                val = JSON.parse(val);
              } catch {
                /* keep */
              }
            }
            partial[r.setting_key] = val;
          });
        setHome(mergeHomepage(partial));
      })
      .catch(() => setHome(DEFAULT_HOMEPAGE))
      .finally(() => setLoading(false));
  }, []);

  const setSlide = (idx, patch) => {
    setHome((h) => {
      const slides = [...(h.hero_slides || [])];
      while (slides.length < 4) slides.push({ image: '', label: '' });
      slides[idx] = { ...slides[idx], ...patch };
      return { ...h, hero_slides: slides.slice(0, 4) };
    });
  };

  const setService = (idx, patch) => {
    setHome((h) => {
      const services = [...(h.services || [])];
      services[idx] = { ...services[idx], ...patch };
      return { ...h, services };
    });
  };

  const setWhy = (idx, patch) => {
    setHome((h) => {
      const why_items = [...(h.why_items || [])];
      why_items[idx] = { ...why_items[idx], ...patch };
      return { ...h, why_items };
    });
  };

  const addWhy = () => setHome((h) => ({ ...h, why_items: [...(h.why_items || []), { title: '', text: '' }] }));
  const removeWhy = (idx) => setHome((h) => ({ ...h, why_items: (h.why_items || []).filter((_, i) => i !== idx) }));
  const moveWhy = (idx, dir) => setHome((h) => {
    const list = [...(h.why_items || [])];
    const j = idx + dir;
    if (j < 0 || j >= list.length) return h;
    [list[idx], list[j]] = [list[j], list[idx]];
    return { ...h, why_items: list };
  });

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      const settings = [
        {
          setting_group: 'homepage',
          setting_key: 'hero_slides',
          setting_value: JSON.stringify(home.hero_slides || []),
          value_type: 'json',
          is_public: 1,
        },
        {
          setting_group: 'homepage',
          setting_key: 'hero_title',
          setting_value: home.hero_title || '',
          value_type: 'string',
          is_public: 1,
        },
        {
          setting_group: 'homepage',
          setting_key: 'hero_subtitle',
          setting_value: home.hero_subtitle || '',
          value_type: 'string',
          is_public: 1,
        },
        {
          setting_group: 'homepage',
          setting_key: 'services',
          setting_value: JSON.stringify(home.services || []),
          value_type: 'json',
          is_public: 1,
        },
        {
          setting_group: 'homepage',
          setting_key: 'stats',
          setting_value: JSON.stringify(home.stats || {}),
          value_type: 'json',
          is_public: 1,
        },
        {
          setting_group: 'homepage',
          setting_key: 'why_items',
          setting_value: JSON.stringify((home.why_items || []).filter((w) => (w.title || '').trim())),
          value_type: 'json',
          is_public: 1,
        },
      ];
      await api.adminUpdateSettings(settings);
      await refresh();
      setMsg('Homepage saved. Open the website to see changes.');
    } catch (err) {
      setMsg(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading homepage editor…</div>;

  const slides = [...(home.hero_slides || [])];
  while (slides.length < 4) slides.push({ image: '', label: '' });

  return (
    <div className="admin-page admin-homepage">
      <div className="admin-page__header">
        <div>
          <h1>Homepage</h1>
          <p className="admin-page__hint">
            Change the big pictures and text visitors see on the first page.
          </p>
        </div>
        <div className="admin-page__actions">
          <SaveButton type="button" saving={saving} onClick={save}>Save homepage</SaveButton>
        </div>
      </div>
      {msg && <p className="admin-page__hint">{msg}</p>}

      <section className="admin-panel">
        <h2>1. Top slideshow pictures</h2>
        <p className="admin-panel__hint">These rotate behind the main headline.</p>
        <div className="admin-slide-grid">
          {slides.slice(0, 4).map((slide, idx) => (
            <div key={idx} className="admin-slide-card">
              <ImageSlot
                label={`Slide ${idx + 1}`}
                image={slide.image}
                onChange={(image) => setSlide(idx, { image })}
                onUpload={(image) => setSlide(idx, { image })}
              />
              <div className="field">
                <label>Short label (optional)</label>
                <input value={slide.label || ''} onChange={(e) => setSlide(idx, { label: e.target.value })} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-panel">
        <h2>2. Main headline</h2>
        <div className="field">
          <label>Big title</label>
          <input value={home.hero_title || ''} onChange={(e) => setHome({ ...home, hero_title: e.target.value })} />
        </div>
        <div className="field" style={{ marginTop: '0.75rem' }}>
          <label>Supporting sentence</label>
          <textarea
            rows={2}
            value={home.hero_subtitle || ''}
            onChange={(e) => setHome({ ...home, hero_subtitle: e.target.value })}
          />
        </div>
      </section>

      <section className="admin-panel">
        <h2>3. Buy / Sell / Rent cards</h2>
        <div className="admin-service-list">
          {(home.services || []).map((svc, idx) => (
            <div key={idx} className="admin-service-row">
              <ImageSlot
                label={`Card ${idx + 1} image`}
                image={svc.image}
                onChange={(image) => setService(idx, { image })}
                onUpload={(image) => setService(idx, { image })}
              />
              <div className="admin-service-fields">
                <div className="field">
                  <label>Title</label>
                  <input value={svc.title || ''} onChange={(e) => setService(idx, { title: e.target.value })} />
                </div>
                <div className="field">
                  <label>Short text</label>
                  <textarea rows={2} value={svc.text || ''} onChange={(e) => setService(idx, { text: e.target.value })} />
                </div>
                <div className="field">
                  <label>Link when clicked</label>
                  <input value={svc.to || ''} onChange={(e) => setService(idx, { to: e.target.value })} placeholder="/properties" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-panel">
        <h2>4. Numbers strip</h2>
        <div className="admin-stats-grid">
          <div className="field">
            <label>Homes (number)</label>
            <input
              type="number"
              value={home.stats?.homes ?? ''}
              onChange={(e) => setHome({ ...home, stats: { ...home.stats, homes: Number(e.target.value) || 0 } })}
            />
          </div>
          <div className="field">
            <label>Cities (number)</label>
            <input
              type="number"
              value={home.stats?.cities ?? ''}
              onChange={(e) => setHome({ ...home, stats: { ...home.stats, cities: Number(e.target.value) || 0 } })}
            />
          </div>
          <div className="field">
            <label>Response time (hours)</label>
            <input
              value={home.stats?.response ?? ''}
              onChange={(e) => setHome({ ...home, stats: { ...home.stats, response: e.target.value } })}
            />
          </div>
        </div>
      </section>

      <section className="admin-panel">
        <h2>5. Why choose us</h2>
        <p className="admin-panel__hint">Add as many points as you like — all of them show on the home page (empty points are skipped).</p>
        <div className="admin-why-list">
          {(home.why_items || []).map((item, idx) => (
            <div key={idx} className="admin-why-row admin-why-row--edit">
              <span className="admin-why-num">{idx + 1}</span>
              <div className="field">
                <label>Title</label>
                <input value={item.title || ''} onChange={(e) => setWhy(idx, { title: e.target.value })} />
              </div>
              <div className="field">
                <label>Text</label>
                <input value={item.text || ''} onChange={(e) => setWhy(idx, { text: e.target.value })} />
              </div>
              <div className="admin-why-tools">
                <button type="button" onClick={() => moveWhy(idx, -1)} disabled={idx === 0} title="Move up">↑</button>
                <button type="button" onClick={() => moveWhy(idx, 1)} disabled={idx === (home.why_items || []).length - 1} title="Move down">↓</button>
                <button type="button" className="is-danger" onClick={() => removeWhy(idx)} title="Remove">✕</button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-ghost admin-why-add" onClick={addWhy}>+ Add point</button>
      </section>

      <div className="admin-homepage__footer">
        <SaveButton type="button" saving={saving} onClick={save}>Save homepage</SaveButton>
      </div>
    </div>
  );
}
