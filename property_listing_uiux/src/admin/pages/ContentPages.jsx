import { useEffect, useState } from 'react';
import {
  ArrowDown, ArrowUp, BookOpen, Briefcase, ExternalLink, FileText, ImagePlus, Info, Newspaper, Plus, Save, Scale,
  Trash2, Users,
} from 'lucide-react';
import { api } from '../../lib/api';
import { mergeContent, slugify } from '../../lib/contentDefaults';
import {
  Badge, Button, Card, EmptyState, Field, PageHeader, useToast,
} from '../ui';

const TABS = [
  { key: 'about_page', label: 'About Us', icon: Info, path: '/about' },
  { key: 'services_page', label: 'Services', icon: Briefcase, path: '/services' },
  { key: 'team_page', label: 'Our Team', icon: Users, path: '/team' },
  { key: 'blog_posts', label: 'Blog', icon: Newspaper, path: '/blog' },
  { key: 'privacy_policy', label: 'Privacy Policy', icon: FileText, path: '/privacy-policy' },
  { key: 'terms_page', label: 'Terms & Conditions', icon: Scale, path: '/terms-and-conditions' },
];

const FORMAT_HINT = 'Formatting: blank line = new paragraph · "## " heading · "- " bullet · **bold** · [text](https://link)';

/* ——— Small building blocks ——— */

function ImageField({ label, value, onChange, hint }) {
  const notify = useToast();
  const [busy, setBusy] = useState(false);
  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const res = await api.adminUploadMedia(file);
      onChange(res.data?.url || '');
      notify('Image uploaded');
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Field label={label} hint={hint}>
      <div className="cp-image">
        <span className="cp-image__preview" style={{ backgroundImage: value ? `url(${value})` : undefined }}>
          {!value && <ImagePlus size={20} />}
        </span>
        <div className="cp-image__controls">
          <input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="https://… or upload" />
          <label className={`adm-btn adm-btn--soft adm-btn--sm${busy ? ' is-loading' : ''}`}>
            {busy ? <span className="adm-spinner" /> : <ImagePlus size={14} />}
            <span>{busy ? 'Uploading…' : 'Upload'}</span>
            <input type="file" hidden accept="image/*" disabled={busy} onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
        </div>
      </div>
    </Field>
  );
}

/** Editable list of objects: fields = [{ key, label, type: text|textarea|image|lines, full }] */
function ListEditor({ items = [], onChange, fields, itemLabel, newItem, emptyText }) {
  const update = (i, patch) => onChange(items.map((it, n) => (n === i ? { ...it, ...patch } : it)));
  const remove = (i) => onChange(items.filter((_, n) => n !== i));
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="cp-list">
      {items.length === 0 && <EmptyState title={emptyText || 'Nothing added yet'} />}
      {items.map((item, i) => (
        <div className="cp-list__item" key={i}>
          <div className="cp-list__head">
            <strong>{itemLabel} {i + 1}{item.title || item.name || item.label ? ` · ${item.title || item.name || item.label}` : ''}</strong>
            <span className="cp-list__tools">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} title="Move up"><ArrowUp size={15} /></button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} title="Move down"><ArrowDown size={15} /></button>
              <button type="button" className="is-danger" onClick={() => remove(i)} title="Remove"><Trash2 size={15} /></button>
            </span>
          </div>
          <div className="adm-form-grid">
            {fields.map((f) => {
              if (f.type === 'image') {
                return (
                  <div className="is-full" key={f.key}>
                    <ImageField label={f.label} value={item[f.key]} onChange={(v) => update(i, { [f.key]: v })} />
                  </div>
                );
              }
              if (f.type === 'lines') {
                return (
                  <Field key={f.key} label={f.label} full hint="One per line">
                    <textarea rows={3} value={(item[f.key] || []).join('\n')} onChange={(e) => update(i, { [f.key]: e.target.value.split('\n') })} />
                  </Field>
                );
              }
              return (
                <Field key={f.key} label={f.label} full={f.full || f.type === 'textarea'}>
                  {f.type === 'textarea' ? (
                    <textarea rows={3} value={item[f.key] || ''} onChange={(e) => update(i, { [f.key]: e.target.value })} />
                  ) : (
                    <input value={item[f.key] || ''} onChange={(e) => update(i, { [f.key]: e.target.value })} placeholder={f.placeholder} />
                  )}
                </Field>
              );
            })}
          </div>
        </div>
      ))}
      <Button variant="ghost" icon={Plus} onClick={() => onChange([...items, { ...newItem }])}>Add {itemLabel.toLowerCase()}</Button>
    </div>
  );
}

/* ——— Tab editors ——— */

function AboutEditor({ data, set }) {
  return (
    <>
      <Card title="Page banner & intro">
        <div className="adm-form-grid">
          <Field label="Page title" full><input value={data.hero_title || ''} onChange={(e) => set({ hero_title: e.target.value })} /></Field>
          <Field label="Intro text" full><textarea rows={2} value={data.hero_subtitle || ''} onChange={(e) => set({ hero_subtitle: e.target.value })} /></Field>
          <div className="is-full"><ImageField label="Banner image" value={data.banner_image} onChange={(v) => set({ banner_image: v })} /></div>
        </div>
      </Card>
      <Card title="Our story">
        <div className="adm-form-grid">
          <Field label="Story heading" full><input value={data.story_title || ''} onChange={(e) => set({ story_title: e.target.value })} /></Field>
          <Field label="Story text" full hint={FORMAT_HINT}><textarea rows={7} value={data.story_text || ''} onChange={(e) => set({ story_text: e.target.value })} /></Field>
          <div className="is-full"><ImageField label="Story image" value={data.story_image} onChange={(v) => set({ story_image: v })} /></div>
          <Field label="Our mission" full><textarea rows={2} value={data.mission || ''} onChange={(e) => set({ mission: e.target.value })} /></Field>
          <Field label="Our vision" full><textarea rows={2} value={data.vision || ''} onChange={(e) => set({ vision: e.target.value })} /></Field>
        </div>
      </Card>
      <Card title="Numbers strip" subtitle="Short figures shown in the green band (e.g. 150+ · Curated homes).">
        <ListEditor
          items={data.stats || []}
          onChange={(stats) => set({ stats })}
          itemLabel="Stat"
          newItem={{ value: '', label: '' }}
          fields={[{ key: 'value', label: 'Value', placeholder: '150+' }, { key: 'label', label: 'Label', placeholder: 'Curated homes' }]}
        />
      </Card>
      <Card title="Why clients choose us" subtitle="Highlight cards with image.">
        <ListEditor
          items={data.points || []}
          onChange={(points) => set({ points })}
          itemLabel="Highlight"
          newItem={{ title: '', text: '', image: '' }}
          fields={[{ key: 'title', label: 'Title', full: true }, { key: 'text', label: 'Text', type: 'textarea' }, { key: 'image', label: 'Image', type: 'image' }]}
        />
      </Card>
    </>
  );
}

function ServicesEditor({ data, set }) {
  return (
    <>
      <Card title="Page banner & intro">
        <div className="adm-form-grid">
          <Field label="Intro text" full><textarea rows={2} value={data.intro || ''} onChange={(e) => set({ intro: e.target.value })} /></Field>
          <div className="is-full"><ImageField label="Banner image" value={data.banner_image} onChange={(v) => set({ banner_image: v })} /></div>
        </div>
      </Card>
      <Card title="Services" subtitle="Each service shows as a card with image, description and key points.">
        <ListEditor
          items={data.items || []}
          onChange={(items) => set({ items })}
          itemLabel="Service"
          newItem={{ title: '', text: '', image: '', points: [] }}
          fields={[
            { key: 'title', label: 'Service name', full: true },
            { key: 'text', label: 'Description', type: 'textarea' },
            { key: 'points', label: 'Key points', type: 'lines' },
            { key: 'image', label: 'Image', type: 'image' },
          ]}
        />
      </Card>
    </>
  );
}

function TeamEditor({ data, set }) {
  return (
    <>
      <Card title="Page banner & intro">
        <div className="adm-form-grid">
          <Field label="Intro text" full><textarea rows={2} value={data.intro || ''} onChange={(e) => set({ intro: e.target.value })} /></Field>
          <div className="is-full"><ImageField label="Banner image" value={data.banner_image} onChange={(v) => set({ banner_image: v })} /></div>
        </div>
      </Card>
      <Card title="Team members" subtitle="Shown on the Our Team page (first four also on About Us).">
        <ListEditor
          items={data.members || []}
          onChange={(members) => set({ members })}
          itemLabel="Member"
          emptyText="No team members yet — add the first one."
          newItem={{ name: '', role: '', photo: '', bio: '', phone: '', email: '', linkedin: '' }}
          fields={[
            { key: 'name', label: 'Full name' },
            { key: 'role', label: 'Designation', placeholder: 'Senior Property Consultant' },
            { key: 'bio', label: 'Short bio', type: 'textarea' },
            { key: 'phone', label: 'Phone (optional)' },
            { key: 'email', label: 'Email (optional)' },
            { key: 'linkedin', label: 'LinkedIn link (optional)', full: true },
            { key: 'photo', label: 'Photo', type: 'image' },
          ]}
        />
      </Card>
    </>
  );
}

const blankPost = () => ({
  id: Date.now(),
  title: '',
  slug: '',
  category: '',
  excerpt: '',
  content: '',
  cover: '',
  author: '',
  date: new Date().toISOString().slice(0, 10),
  tags: [],
  published: true,
});

function BlogEditor({ posts, setPosts }) {
  const [open, setOpen] = useState(null);
  const update = (i, patch) => setPosts(posts.map((p, n) => (n === i ? { ...p, ...patch } : p)));
  const add = () => {
    setPosts([blankPost(), ...posts]);
    setOpen(0);
  };
  return (
    <Card
      title="Blog posts"
      subtitle={`${posts.length} article${posts.length === 1 ? '' : 's'} · newest date appears first on the website.`}
      actions={<Button icon={Plus} onClick={add}>New article</Button>}
    >
      {posts.length === 0 && <EmptyState icon={BookOpen} title="No articles yet" text="Write your first article — buying guides and market updates work well." />}
      <div className="cp-list">
        {posts.map((p, i) => (
          <div className={`cp-post${open === i ? ' is-open' : ''}`} key={p.id || i}>
            <button type="button" className="cp-post__head" onClick={() => setOpen(open === i ? null : i)}>
              <span className="cp-post__thumb" style={{ backgroundImage: p.cover ? `url(${p.cover})` : undefined }} />
              <span className="cp-post__title">
                <strong>{p.title || 'Untitled article'}</strong>
                <small>{p.date || 'No date'}{p.category ? ` · ${p.category}` : ''}</small>
              </span>
              <Badge tone={p.published !== false ? 'green' : 'gray'}>{p.published !== false ? 'Published' : 'Draft'}</Badge>
            </button>
            {open === i && (
              <div className="cp-post__body adm-form-grid">
                <Field label="Title" full>
                  <input
                    value={p.title}
                    onChange={(e) => update(i, { title: e.target.value, slug: p.slugTouched ? p.slug : slugify(e.target.value) })}
                  />
                </Field>
                <Field label="URL slug" hint={`Page address: /blog/${p.slug || '…'}`}>
                  <input value={p.slug} onChange={(e) => update(i, { slug: slugify(e.target.value), slugTouched: true })} />
                </Field>
                <Field label="Category"><input value={p.category || ''} onChange={(e) => update(i, { category: e.target.value })} placeholder="Buying guide" /></Field>
                <Field label="Author"><input value={p.author || ''} onChange={(e) => update(i, { author: e.target.value })} /></Field>
                <Field label="Publish date"><input type="date" value={p.date || ''} onChange={(e) => update(i, { date: e.target.value })} /></Field>
                <Field label="Short summary" full hint="Shown on blog cards and Google results.">
                  <textarea rows={2} value={p.excerpt || ''} onChange={(e) => update(i, { excerpt: e.target.value })} />
                </Field>
                <Field label="Article content" full hint={FORMAT_HINT}>
                  <textarea rows={12} value={p.content || ''} onChange={(e) => update(i, { content: e.target.value })} />
                </Field>
                <div className="is-full"><ImageField label="Cover image" value={p.cover} onChange={(v) => update(i, { cover: v })} /></div>
                <Field label="Tags" hint="Comma separated">
                  <input value={(p.tags || []).join(', ')} onChange={(e) => update(i, { tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })} />
                </Field>
                <label className="adm-switch">
                  <input type="checkbox" checked={p.published !== false} onChange={(e) => update(i, { published: e.target.checked })} />
                  <span className="adm-switch__track" />
                  <span>Published (visible on website)</span>
                </label>
                <div className="adm-form-actions is-full">
                  {p.slug && <Button variant="ghost" icon={ExternalLink} href={`/blog/${p.slug}`} target="_blank" rel="noreferrer">Preview</Button>}
                  <Button variant="ghost" icon={Trash2} onClick={() => { if (confirm('Delete this article?')) { setPosts(posts.filter((_, n) => n !== i)); setOpen(null); } }}>Delete</Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function LegalEditor({ data, set, title }) {
  return (
    <Card title={title} subtitle="Starter text is provided — please review it with your advisor and edit to match your business.">
      <div className="adm-form-grid">
        <Field label="Last updated"><input type="date" value={data.updated || ''} onChange={(e) => set({ updated: e.target.value })} /></Field>
        <Field label="Content" full hint={FORMAT_HINT}>
          <textarea rows={22} value={data.content || ''} onChange={(e) => set({ content: e.target.value })} />
        </Field>
      </div>
    </Card>
  );
}

/* ——— Page ——— */

export default function ContentPages() {
  const notify = useToast();
  const [tab, setTab] = useState('about_page');
  const [content, setContent] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.adminSettings()
      .then((res) => {
        const rows = res.data || [];
        const next = {};
        TABS.forEach(({ key }) => {
          const row = rows.find((r) => r.setting_key === key);
          let saved = null;
          if (row?.setting_value) {
            try { saved = JSON.parse(row.setting_value); } catch { saved = null; }
          }
          next[key] = mergeContent(key, saved);
        });
        setContent(next);
      })
      .catch((err) => notify(err.message, 'error'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch) => setContent((c) => ({ ...c, [tab]: { ...c[tab], ...patch } }));

  const save = async () => {
    setSaving(true);
    try {
      let value = content[tab];
      if (tab === 'blog_posts') {
        const seen = new Set();
        value = value
          .filter((p) => p.title)
          .map((p) => {
            let slug = slugify(p.slug || p.title) || `post-${p.id}`;
            while (seen.has(slug)) slug = `${slug}-2`;
            seen.add(slug);
            const { slugTouched, ...rest } = p; // eslint-disable-line no-unused-vars
            return { ...rest, slug };
          });
        setContent((c) => ({ ...c, blog_posts: value }));
      }
      await api.adminUpdateSettings([{
        setting_group: 'pages',
        setting_key: tab,
        setting_value: JSON.stringify(value),
        value_type: 'json',
        is_public: 0,
      }]);
      notify(`${TABS.find((t) => t.key === tab).label} saved — live on the website`);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const current = TABS.find((t) => t.key === tab);

  return (
    <div className="adm-page adm-page--wide">
      <PageHeader
        title="Website Pages"
        subtitle="Edit About Us, Services, Team, Blog, Privacy Policy and Terms — changes go live as soon as you save."
        actions={(
          <>
            <Button variant="ghost" icon={ExternalLink} href={current.path} target="_blank" rel="noreferrer">View page</Button>
            <Button icon={Save} loading={saving} onClick={save} disabled={!content}>Save {current.label}</Button>
          </>
        )}
      />
      <div className="adm-master-layout">
        <nav className="adm-master-nav" aria-label="Pages">
          {TABS.map((t) => {
            const Icon = t.icon;
            const count = t.key === 'blog_posts' ? content?.blog_posts?.length
              : t.key === 'team_page' ? content?.team_page?.members?.length
                : t.key === 'services_page' ? content?.services_page?.items?.length : null;
            return (
              <button key={t.key} type="button" className={tab === t.key ? 'is-active' : ''} onClick={() => setTab(t.key)}>
                <Icon size={17} />
                <span>{t.label}</span>
                {count != null && <em>{count}</em>}
              </button>
            );
          })}
        </nav>
        <div className="adm-master-content cp-stack">
          {!content ? <Card><span className="adm-shimmer" /><span className="adm-shimmer" /></Card> : (
            <>
              {tab === 'about_page' && <AboutEditor data={content.about_page} set={set} />}
              {tab === 'services_page' && <ServicesEditor data={content.services_page} set={set} />}
              {tab === 'team_page' && <TeamEditor data={content.team_page} set={set} />}
              {tab === 'blog_posts' && (
                <BlogEditor posts={content.blog_posts || []} setPosts={(blog_posts) => setContent((c) => ({ ...c, blog_posts }))} />
              )}
              {tab === 'privacy_policy' && <LegalEditor data={content.privacy_policy} set={set} title="Privacy Policy" />}
              {tab === 'terms_page' && <LegalEditor data={content.terms_page} set={set} title="Terms & Conditions" />}
              <div className="adm-savebar">
                <span className="adm-muted">Editing <strong>{current.label}</strong></span>
                <Button icon={Save} loading={saving} onClick={save}>Save {current.label}</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

