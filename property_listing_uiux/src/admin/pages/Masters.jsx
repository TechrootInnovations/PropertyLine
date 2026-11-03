import { useEffect, useMemo, useState } from 'react';
import {
  Building2, Compass, Database, Gem, Layers, MapPin, Pencil, Plus, RefreshCw, Ruler, Sofa, Tag, Timer, Trash2,
  UserRound, Wallet, X,
} from 'lucide-react';
import { api } from '../../lib/api';
import {
  Badge, Button, Card, ChipMultiSelect, DataTable, EmptyState, Field, IconAction, PageHeader, SearchInput, useToast,
} from '../ui';

function isTruthyFlag(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function formatMasterCell(field, value, row = {}) {
  if (field.tableRender) return field.tableRender(value, row);
  if (field.type === 'checkbox') {
    const on = isTruthyFlag(value);
    if (field.key === 'is_active') return <Badge tone={on ? 'green' : 'gray'}>{on ? 'Active' : 'Inactive'}</Badge>;
    return on ? <Badge tone="teal">Yes</Badge> : <span className="adm-muted">No</span>;
  }
  if (field.type === 'select' && field.options) {
    const opt = field.options.find((o) => String(o.value) === String(value));
    return opt ? opt.label : String(value ?? '—');
  }
  return value == null || value === '' ? <span className="adm-muted">—</span> : String(value);
}

/**
 * Generic master CRUD — driven entirely by the `fields` config.
 * Field types: text (default), number (inputType), textarea, select, checkbox, multi.
 */
function MasterCrud({ title, icon: Icon, items, fields, onCreate, onUpdate, onDelete, reload, defaults = {}, loading = false }) {
  const notify = useToast();
  const blankForm = () => {
    const next = { ...defaults };
    fields.forEach((f) => {
      if (next[f.key] !== undefined) return;
      if (f.type === 'checkbox') next[f.key] = !!f.defaultChecked;
      else if (f.type === 'multi') next[f.key] = [];
      else next[f.key] = f.defaultValue ?? '';
    });
    return next;
  };
  const [form, setForm] = useState(blankForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => { setForm(blankForm()); setEditId(null); setQ(''); }, [title]); // eslint-disable-line react-hooks/exhaustive-deps

  const startEdit = (row) => {
    setEditId(row.id);
    const next = {};
    fields.forEach((f) => {
      if (f.type === 'checkbox') next[f.key] = isTruthyFlag(row[f.key]);
      else if (f.type === 'multi') next[f.key] = row[f.key] || [];
      else next[f.key] = row[f.key] ?? '';
    });
    setForm(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancel = () => { setEditId(null); setForm(blankForm()); };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      fields.forEach((f) => {
        if (f.type === 'checkbox') payload[f.key] = !!payload[f.key];
        if (f.inputType === 'number' && payload[f.key] !== '' && payload[f.key] != null) {
          payload[f.key] = Number(payload[f.key]);
        }
      });
      if (editId) await onUpdate(editId, payload);
      else await onCreate(payload);
      notify(editId ? 'Record updated' : 'Record added');
      cancel();
      reload();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!confirm(`Delete “${row.name || row.value}”?`)) return;
    try {
      await onDelete(row.id);
      notify('Record deleted');
      reload();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const sortedItems = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...(items || [])]
      .filter((r) => !needle || fields.some((f) => String(r[f.key] ?? '').toLowerCase().includes(needle))
        || String(r.type_names || r.category_name || '').toLowerCase().includes(needle))
      .sort((a, b) => {
        const ao = Number(a.sort_order ?? 0);
        const bo = Number(b.sort_order ?? 0);
        if (ao !== bo) return ao - bo;
        return String(a.name || a.value || '').localeCompare(String(b.name || b.value || ''));
      });
  }, [items, q, fields]);

  const tableFields = fields.filter((f) => f.showInTable !== false);
  const columns = [
    { key: 'sr', header: 'Sr.', width: 56, render: (_r, i) => <span className="adm-muted">{i + 1}</span> },
    ...tableFields.map((f) => ({
      key: f.key,
      header: f.label,
      render: (row) => formatMasterCell(f, row[f.key], row),
    })),
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="adm-actions">
          <IconAction icon={Pencil} label="Edit" tone="amber" onClick={() => startEdit(row)} />
          <IconAction icon={Trash2} label="Delete" tone="red" onClick={() => remove(row)} />
        </div>
      ),
    },
  ];

  return (
    <div className="adm-master">
      <Card
        title={editId ? `Edit ${title.replace(' Master', '')}` : `Add ${title.replace(' Master', '')}`}
        subtitle={editId ? 'Update the record and save.' : 'New records appear immediately in property forms and filters.'}
        actions={editId && <Button variant="ghost" size="sm" icon={X} onClick={cancel}>Cancel edit</Button>}
        className={editId ? 'is-editing' : ''}
      >
        <form onSubmit={submit} className="adm-form-grid adm-form-grid--3">
          {fields.map((f) => (
            <Field key={f.key} label={f.label} required={!!f.required} full={f.fullWidth || f.type === 'multi'} hint={f.hint}>
              {f.type === 'checkbox' ? (
                <label className="adm-switch">
                  <input type="checkbox" checked={!!form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })} />
                  <span className="adm-switch__track" />
                  <span>{f.checkLabel || 'Yes'}</span>
                </label>
              ) : f.type === 'multi' ? (
                <ChipMultiSelect
                  options={f.options || []}
                  value={form[f.key] || []}
                  onChange={(v) => setForm({ ...form, [f.key]: v })}
                  emptyHint={f.emptyHint}
                />
              ) : f.type === 'select' ? (
                <select required={!!f.required} value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                  <option value="">Select</option>
                  {(f.options || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea rows={f.rows || 2} required={!!f.required} value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              ) : (
                <input
                  type={f.inputType || 'text'}
                  required={!!f.required}
                  value={form[f.key] ?? ''}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              )}
            </Field>
          ))}
          <div className="adm-form-actions is-full">
            {editId && <Button variant="ghost" onClick={cancel} disabled={saving}>Cancel</Button>}
            <Button type="submit" loading={saving} icon={editId ? Pencil : Plus}>{editId ? 'Update' : 'Add'}</Button>
          </div>
        </form>
      </Card>

      <Card
        title={title}
        subtitle={`${sortedItems.length} of ${(items || []).length} records`}
        actions={<SearchInput value={q} onChange={setQ} delay={0} placeholder={`Search ${title.replace(' Master', '').toLowerCase()}…`} />}
        flush
      >
        <DataTable
          loading={loading}
          rows={sortedItems}
          columns={columns}
          rowClassName={(r) => (editId === r.id ? 'is-selected' : '')}
          empty={<EmptyState icon={Icon || Database} title="No records yet" text="Add the first one using the form above." />}
        />
      </Card>
    </div>
  );
}

const MASTER_TABS = [
  { key: 'categories', label: 'Categories', icon: Layers },
  { key: 'types', label: 'Property Types', icon: Building2 },
  { key: 'locations', label: 'Locations', icon: MapPin },
  { key: 'sellers', label: 'Sellers / Owners', icon: UserRound },
  { key: 'amenities', label: 'Amenities', icon: Gem },
  { key: 'purpose', label: 'Purpose', icon: Tag },
  { key: 'status', label: 'Status', icon: Timer },
  { key: 'facing', label: 'Facing', icon: Compass },
  { key: 'furnishing', label: 'Furnishing', icon: Sofa },
  { key: 'possession_status', label: 'Possession', icon: Timer },
  { key: 'area_unit', label: 'Area Unit', icon: Ruler },
  { key: 'price_type', label: 'Price Type', icon: Wallet },
];

const OPTION_TABS = ['purpose', 'status', 'facing', 'furnishing', 'possession_status', 'area_unit', 'price_type'];

export default function Masters() {
  const [tab, setTab] = useState('categories');
  const [categories, setCategories] = useState([]);
  const [types, setTypes] = useState([]);
  const [locations, setLocations] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = async () => {
    setLoading(true);
    setError('');
    try {
      const [c, t, l, s, a, opts] = await Promise.all([
        api.adminCategories(),
        api.adminTypes(),
        api.adminLocations(),
        api.adminSellers().catch(() => ({ data: [] })),
        api.adminAmenities(),
        api.adminOptions(),
      ]);
      setCategories(c.data || []);
      setTypes(t.data || []);
      setLocations(l.data || []);
      setSellers(s.data || []);
      setAmenities(a.data || []);
      setOptions(opts.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load masters');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); }, []);

  const optionItems = options.filter((o) => o.master_type === tab);
  const optionFields = [
    { key: 'name', label: 'Name', required: true },
    { key: 'value', label: 'Value / Code', required: true },
    { key: 'sort_order', label: 'Order', inputType: 'number', defaultValue: 0 },
    { key: 'is_active', label: 'Status', type: 'checkbox', defaultChecked: true, checkLabel: 'Active' },
  ];
  const saveOption = (body) => api.adminCreateOption({ ...body, master_type: tab });
  const updateOption = (id, body) => api.adminUpdateOption(id, { ...body, master_type: tab });
  const activeCategories = categories.filter((c) => isTruthyFlag(c.is_active));
  const activeTypes = types.filter((t) => isTruthyFlag(t.is_active));

  const countFor = (key) => ({
    categories: categories.length,
    types: types.length,
    locations: locations.length,
    sellers: sellers.length,
    amenities: amenities.length,
  }[key] ?? options.filter((o) => o.master_type === key).length);

  const current = MASTER_TABS.find((t) => t.key === tab);

  return (
    <div className="adm-page adm-page--wide">
      <PageHeader
        title="Masters"
        subtitle="Categories, property types, locations, sellers, amenities and dropdown options used across forms and website filters."
        actions={<Button variant="ghost" icon={RefreshCw} loading={loading} onClick={reload}>Refresh</Button>}
      />
      {error && <div className="adm-alert tone-red">{error}</div>}

      <div className="adm-master-layout">
        <nav className="adm-master-nav" aria-label="Master data groups">
          {MASTER_TABS.map((t) => {
            const TabIcon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                className={tab === t.key ? 'is-active' : ''}
                onClick={() => setTab(t.key)}
              >
                <TabIcon size={17} />
                <span>{t.label}</span>
                <em>{countFor(t.key)}</em>
              </button>
            );
          })}
        </nav>

        <div className="adm-master-content">
          {tab === 'categories' && (
            <MasterCrud
              title="Category Master"
              icon={current.icon}
              items={categories}
              loading={loading}
              defaults={{ is_active: true, sort_order: 0 }}
              fields={[
                { key: 'name', label: 'Name', required: true },
                { key: 'slug', label: 'Slug', hint: 'Auto-generated if empty' },
                { key: 'icon', label: 'Icon', showInTable: false },
                { key: 'description', label: 'Description', type: 'textarea', showInTable: false, fullWidth: true },
                { key: 'sort_order', label: 'Order', inputType: 'number', defaultValue: 0 },
                { key: 'is_active', label: 'Status', type: 'checkbox', defaultChecked: true, checkLabel: 'Active' },
              ]}
              onCreate={api.adminCreateCategory}
              onUpdate={api.adminUpdateCategory}
              onDelete={api.adminDeleteCategory}
              reload={reload}
            />
          )}

          {tab === 'types' && (
            <MasterCrud
              title="Property Type Master"
              icon={current.icon}
              items={types}
              loading={loading}
              defaults={{ is_active: true, sort_order: 0 }}
              fields={[
                { key: 'name', label: 'Name', required: true },
                {
                  key: 'category_id',
                  label: 'Category',
                  type: 'select',
                  options: activeCategories.map((c) => ({ value: c.id, label: c.name })),
                  required: true,
                  tableRender: (_v, row) => row.category_name || activeCategories.find((c) => Number(c.id) === Number(row.category_id))?.name || '—',
                },
                { key: 'slug', label: 'Slug', hint: 'Auto-generated if empty' },
                { key: 'icon', label: 'Icon', showInTable: false },
                { key: 'sort_order', label: 'Order', inputType: 'number', defaultValue: 0 },
                { key: 'is_active', label: 'Status', type: 'checkbox', defaultChecked: true, checkLabel: 'Active' },
              ]}
              onCreate={api.adminCreateType}
              onUpdate={api.adminUpdateType}
              onDelete={api.adminDeleteType}
              reload={reload}
            />
          )}

          {tab === 'locations' && (
            <MasterCrud
              title="Location Master"
              icon={current.icon}
              items={locations}
              loading={loading}
              defaults={{ is_active: true, is_popular: true, sort_order: 0, city: '', state: 'Maharashtra', country: 'India' }}
              fields={[
                { key: 'name', label: 'Name', required: true },
                { key: 'slug', label: 'Slug', showInTable: false },
                { key: 'city', label: 'City' },
                { key: 'state', label: 'State', defaultValue: 'Maharashtra', showInTable: false },
                { key: 'country', label: 'Country', defaultValue: 'India', showInTable: false },
                { key: 'pincode', label: 'Pincode', showInTable: false },
                { key: 'latitude', label: 'Latitude', showInTable: false },
                { key: 'longitude', label: 'Longitude', showInTable: false },
                { key: 'image_url', label: 'Image URL', showInTable: false },
                { key: 'is_popular', label: 'Home', type: 'checkbox', defaultChecked: true, checkLabel: 'Show on home' },
                { key: 'sort_order', label: 'Order', inputType: 'number', defaultValue: 0 },
                { key: 'is_active', label: 'Status', type: 'checkbox', defaultChecked: true, checkLabel: 'Active' },
              ]}
              onCreate={api.adminCreateLocation}
              onUpdate={api.adminUpdateLocation}
              onDelete={api.adminDeleteLocation}
              reload={reload}
            />
          )}

          {tab === 'sellers' && (
            <MasterCrud
              title="Seller / Owner Master"
              icon={current.icon}
              items={sellers}
              loading={loading}
              defaults={{ is_active: true, sort_order: 0 }}
              fields={[
                { key: 'name', label: 'Seller / owner name', required: true },
                { key: 'company_name', label: 'Company' },
                { key: 'phone', label: 'Mobile' },
                { key: 'whatsapp', label: 'WhatsApp', showInTable: false },
                { key: 'email', label: 'Email' },
                { key: 'rera_number', label: 'RERA number', showInTable: false },
                { key: 'address', label: 'Address', showInTable: false, fullWidth: true },
                { key: 'notes', label: 'Notes', type: 'textarea', showInTable: false, fullWidth: true },
                { key: 'sort_order', label: 'Order', inputType: 'number', defaultValue: 0, showInTable: false },
                { key: 'is_active', label: 'Status', type: 'checkbox', defaultChecked: true, checkLabel: 'Active' },
              ]}
              onCreate={api.adminCreateSeller}
              onUpdate={api.adminUpdateSeller}
              onDelete={api.adminDeleteSeller}
              reload={reload}
            />
          )}

          {tab === 'amenities' && (
            <MasterCrud
              title="Amenity Master"
              icon={current.icon}
              items={amenities}
              loading={loading}
              defaults={{ is_active: true, sort_order: 0, amenity_group: 'general', type_ids: [] }}
              fields={[
                { key: 'name', label: 'Name', required: true },
                {
                  key: 'type_ids',
                  label: 'Property types',
                  type: 'multi',
                  options: activeTypes.map((t) => ({ value: Number(t.id), label: t.name })),
                  hint: 'Select the property types this amenity applies to. Leave empty to show it for all types.',
                  emptyHint: 'Add property types first.',
                  tableRender: (_v, row) => (row.type_ids?.length ? (
                    <div className="adm-tag-list">
                      {row.type_ids.map((tid) => {
                        const t = types.find((x) => Number(x.id) === Number(tid));
                        return t ? <span key={tid} className="adm-tag">{t.name}</span> : null;
                      })}
                    </div>
                  ) : <Badge tone="blue">All types</Badge>),
                },
                { key: 'slug', label: 'Slug', showInTable: false },
                { key: 'icon', label: 'Icon', showInTable: false },
                { key: 'amenity_group', label: 'Group', defaultValue: 'general' },
                { key: 'sort_order', label: 'Order', inputType: 'number', defaultValue: 0 },
                { key: 'is_active', label: 'Status', type: 'checkbox', defaultChecked: true, checkLabel: 'Active' },
              ]}
              onCreate={api.adminCreateAmenity}
              onUpdate={api.adminUpdateAmenity}
              onDelete={api.adminDeleteAmenity}
              reload={reload}
            />
          )}

          {OPTION_TABS.includes(tab) && (
            <MasterCrud
              title={`${current?.label || 'Option'} Master`}
              icon={current?.icon}
              items={optionItems}
              loading={loading}
              defaults={{ is_active: true, sort_order: 0, master_type: tab }}
              fields={optionFields}
              onCreate={saveOption}
              onUpdate={updateOption}
              onDelete={api.adminDeleteOption}
              reload={reload}
            />
          )}
        </div>
      </div>
    </div>
  );
}
