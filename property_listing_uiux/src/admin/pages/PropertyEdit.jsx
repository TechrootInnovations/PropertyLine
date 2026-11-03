import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, BadgeCheck, Building2, ChevronDown, ExternalLink, FileText, Film, ImagePlus, IndianRupee, ListChecks, MapPin, Paperclip, Phone, X,
  Save, Search as SearchIcon, Sparkles, Star, Trash2, UserPlus,
} from 'lucide-react';
import { api } from '../../lib/api';
import { applyMapsUrlToForm, toGoogleMapsEmbedUrl } from '../../lib/maps';
import {
  Badge, Button, Card, ChipMultiSelect, EmptyState, Field, Modal, PageHeader, SearchSelect, useToast,
} from '../ui';

const emptyProperty = {
  title: '',
  purpose: 'sale',
  category_id: '',
  type_id: '',
  location_id: '',
  seller_id: '',
  price: '',
  monthly_rent: '',
  bedrooms: 2,
  bathrooms: 2,
  carpet_area: '',
  builtup_area: '',
  plot_area: '',
  area_unit: 'sqft',
  locality: '',
  city: '',
  state: 'Maharashtra',
  address: '',
  landmark: '',
  pincode: '',
  latitude: '',
  longitude: '',
  map_url: '',
  show_exact_location: true,
  status: 'draft',
  short_description: '',
  description: '',
  is_featured: false,
  facing: '',
  furnishing: 'na',
  possession_status: 'na',
  video_url: '',
  youtube_url: '',
  virtual_tour_url: '',
  brochure_url: '',
  floor_plan_url: '',
  rera_number: '',
  seo_title: '',
  seo_description: '',
  amenity_ids: [],
  extra_attributes: {},
};

const OPTION_GROUPS = ['purpose', 'status', 'facing', 'furnishing', 'possession_status', 'area_unit'];

const FALLBACK_OPTIONS = {
  purpose: [{ value: 'sale', name: 'Sale' }, { value: 'rent', name: 'Rent' }],
  status: [
    { value: 'draft', name: 'Draft' },
    { value: 'published', name: 'Published' },
    { value: 'sold', name: 'Sold' },
    { value: 'rented', name: 'Rented' },
  ],
  facing: [],
  furnishing: [
    { value: 'na', name: 'N/A' },
    { value: 'unfurnished', name: 'Unfurnished' },
    { value: 'semi_furnished', name: 'Semi Furnished' },
    { value: 'furnished', name: 'Furnished' },
  ],
  possession_status: [{ value: 'na', name: 'N/A' }],
  area_unit: [{ value: 'sqft', name: 'Sq Ft' }],
};

const SECTIONS = [
  { id: 'basic', label: 'Basic info' },
  { id: 'owner', label: 'Seller / Owner' },
  { id: 'pricing', label: 'Price & specs' },
  { id: 'location', label: 'Location' },
  { id: 'description', label: 'Description' },
  { id: 'extra', label: 'Additional details' },
  { id: 'amenities', label: 'Amenities' },
  { id: 'photos', label: 'Photos' },
  { id: 'media', label: 'Videos & documents' },
  { id: 'seo', label: 'SEO' },
];

/** Uploads one file via the media endpoint and stores its URL. */
function FileUploadField({ label, value, onChange, accept, hint, icon: Icon = Paperclip, placeholder = 'https://… or upload a file' }) {
  const notify = useToast();
  const [busy, setBusy] = useState(false);
  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const res = await api.adminUploadMedia(file);
      onChange(res.data?.url || '');
      notify(`${label} uploaded`);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  const fileName = value ? decodeURIComponent(String(value).split('/').pop() || '').slice(0, 60) : '';
  return (
    <Field label={label} hint={hint}>
      <div className="pe-file">
        <span className={`pe-file__icon${value ? ' is-set' : ''}`}><Icon size={17} /></span>
        <input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        <label className={`adm-btn adm-btn--soft adm-btn--sm${busy ? ' is-loading' : ''}`}>
          {busy ? <span className="adm-spinner" /> : <ImagePlus size={14} />}
          <span>{busy ? 'Uploading…' : 'Upload'}</span>
          <input type="file" hidden accept={accept} disabled={busy} onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
        {value && (
          <>
            <a className="pe-file__open" href={value} target="_blank" rel="noreferrer" title={fileName}><ExternalLink size={15} /></a>
            <button type="button" className="pe-file__clear" onClick={() => onChange('')} title="Remove"><X size={15} /></button>
          </>
        )}
      </div>
    </Field>
  );
}

/** Additional-detail input chosen by the field type from the property catalog. */
function ExtraFieldInput({ field, value, onChange }) {
  const type = field.field_type || 'text';
  const options = Array.isArray(field.options) ? field.options : [];
  if (type === 'yesno') {
    return (
      <div className="pe-yesno" role="group" aria-label={field.field_name}>
        {['Yes', 'No'].map((opt) => (
          <button key={opt} type="button" className={value === opt ? 'is-on' : ''} onClick={() => onChange(value === opt ? '' : opt)}>
            {opt}
          </button>
        ))}
      </div>
    );
  }
  if (type === 'select' && options.length) {
    const list = value && !options.includes(value) ? [value, ...options] : options;
    return (
      <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select</option>
        {list.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (type === 'number') {
    return <input type="text" inputMode="decimal" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="0" />;
  }
  return <input value={value || ''} onChange={(e) => onChange(e.target.value)} />;
}

function OptionSelect({ value, onChange, list, placeholder }) {
  return (
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {list.map((o) => <option key={o.value} value={o.value}>{o.name}</option>)}
    </select>
  );
}

function QuickSellerModal({ open, initialName, onClose, onCreated }) {
  const notify = useToast();
  const [form, setForm] = useState({ name: '', phone: '', company_name: '', email: '' });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) setForm({ name: initialName || '', phone: '', company_name: '', email: '' });
  }, [open, initialName]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.adminCreateSeller({ ...form, whatsapp: form.phone, is_active: true });
      notify('Seller added');
      onCreated(res.data);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add seller / owner"
      subtitle="Saved to the Seller master and selected for this property."
      size="sm"
    >
      <form className="adm-form-grid" onSubmit={save}>
        <Field label="Seller / owner name" required full>
          <input required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Mobile">
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="Company">
          <input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
        </Field>
        <Field label="Email" full>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <div className="adm-form-actions is-full">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" icon={UserPlus} loading={saving}>Save seller</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function PropertyEdit() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const notify = useToast();
  const [form, setForm] = useState(emptyProperty);
  const [loaded, setLoaded] = useState(isNew);
  const [images, setImages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [types, setTypes] = useState([]);
  const [locations, setLocations] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [amenitiesLoaded, setAmenitiesLoaded] = useState(false);
  const [typeFields, setTypeFields] = useState([]);
  const [optionMaps, setOptionMaps] = useState(FALLBACK_OPTIONS);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingImages, setPendingImages] = useState([]);
  const [sellerModal, setSellerModal] = useState({ open: false, name: '' });
  const [fieldFilter, setFieldFilter] = useState('');
  const [openSections, setOpenSections] = useState({});

  useEffect(() => {
    Promise.all([
      api.getCategories().catch(() => api.adminCategories()),
      api.adminTypes().catch(() => api.getTypes()),
      api.adminLocations().catch(() => api.getLocations()),
      api.adminSellers().catch(() => ({ data: [] })),
      api.adminOptions().catch(() => api.getOptions()),
    ]).then(([c, t, l, s, opts]) => {
      setCategories(c.data || []);
      setTypes(t.data || []);
      setLocations(l.data || []);
      setSellers(s.data || []);
      const grouped = Object.fromEntries(OPTION_GROUPS.map((g) => [g, []]));
      (opts.data || []).forEach((row) => {
        if (grouped[row.master_type] && Number(row.is_active ?? 1)) grouped[row.master_type].push(row);
      });
      setOptionMaps(Object.fromEntries(
        OPTION_GROUPS.map((g) => [g, grouped[g].length ? grouped[g] : FALLBACK_OPTIONS[g]])
      ));
    });
  }, []);

  useEffect(() => {
    if (isNew) {
      setForm(emptyProperty);
      setImages([]);
      setLoaded(true);
      return;
    }
    setLoaded(false);
    api.adminProperty(id).then((res) => {
      const p = res.data || {};
      let extras = p.extra_attributes || {};
      if (typeof extras === 'string') {
        try { extras = JSON.parse(extras); } catch { extras = {}; }
      }
      setForm({
        ...emptyProperty,
        ...p,
        category_id: p.category_id ?? '',
        type_id: p.type_id ?? '',
        location_id: p.location_id ?? '',
        seller_id: p.seller_id ?? '',
        price: p.price ?? '',
        monthly_rent: p.monthly_rent ?? '',
        carpet_area: p.carpet_area ?? '',
        builtup_area: p.builtup_area ?? '',
        plot_area: p.plot_area ?? '',
        latitude: p.latitude ?? '',
        longitude: p.longitude ?? '',
        map_url: p.map_url ?? '',
        show_exact_location: p.show_exact_location !== 0 && p.show_exact_location !== false,
        is_featured: !!p.is_featured,
        amenity_ids: p.amenity_ids || (p.amenities || []).map((a) => a.id),
        extra_attributes: extras || {},
      });
      setImages(p.images || []);
      setLoaded(true);
    }).catch((err) => notify(err.message, 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isNew]);

  const selectedType = types.find((t) => Number(t.id) === Number(form.type_id));

  // Additional-details fields for the selected type
  useEffect(() => {
    if (!selectedType?.name) {
      setTypeFields([]);
      return;
    }
    api.getFieldDefinitions(selectedType.name)
      .then((res) => setTypeFields(res.data || []))
      .catch(() => setTypeFields([]));
  }, [selectedType?.name]);

  // Amenities valid for the selected type
  useEffect(() => {
    setAmenitiesLoaded(false);
    api.adminAmenities(form.type_id || undefined)
      .then((res) => setAmenities((res.data || []).filter((a) => Number(a.is_active ?? 1))))
      .catch(() => api.getAmenities().then((res) => setAmenities(res.data || [])).catch(() => setAmenities([])))
      .finally(() => setAmenitiesLoaded(true));
  }, [form.type_id]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setExtra = (key, value) => setForm((f) => ({
    ...f,
    extra_attributes: { ...(f.extra_attributes || {}), [key]: value },
  }));

  const filteredTypes = types.filter(
    (t) => !form.category_id || Number(t.category_id) === Number(form.category_id)
  );

  const sellerOptions = useMemo(() => sellers.map((s) => ({
    value: s.id,
    label: s.name,
    sub: [s.company_name, s.phone].filter(Boolean).join(' · '),
  })), [sellers]);
  const selectedSeller = sellers.find((s) => Number(s.id) === Number(form.seller_id)) || form.seller;

  const groupedFields = useMemo(() => {
    const needle = fieldFilter.trim().toLowerCase();
    const groups = new Map();
    typeFields
      .filter((f) => !needle || f.field_name.toLowerCase().includes(needle) || (f.section || '').toLowerCase().includes(needle))
      .forEach((f) => {
        const key = f.section || 'Details';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(f);
      });
    return [...groups.entries()];
  }, [typeFields, fieldFilter]);

  const filledExtras = typeFields.filter((f) => String(form.extra_attributes?.[f.field_key] ?? '').trim()).length;

  const mapPreviewSrc = useMemo(
    () => toGoogleMapsEmbedUrl({ mapUrl: form.map_url, latitude: form.latitude, longitude: form.longitude }),
    [form.map_url, form.latitude, form.longitude]
  );

  const onMapUrlChange = (value) => {
    const next = applyMapsUrlToForm(value, form);
    setForm((f) => ({ ...f, ...next }));
  };

  const save = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const visibleAmenityIds = new Set(amenities.map((a) => Number(a.id)));
      const amenityIds = (form.amenity_ids || [])
        .map(Number)
        .filter((aid) => !amenitiesLoaded || visibleAmenityIds.has(aid));
      const payload = {
        ...form,
        category_id: Number(form.category_id) || 1,
        type_id: Number(form.type_id) || 1,
        location_id: form.location_id ? Number(form.location_id) : null,
        seller_id: form.seller_id ? Number(form.seller_id) : null,
        price: form.purpose === 'sale' ? Number(form.price || 0) || null : null,
        monthly_rent: form.purpose === 'rent' ? Number(form.monthly_rent || 0) || null : null,
        carpet_area: form.carpet_area ? Number(form.carpet_area) : null,
        builtup_area: form.builtup_area ? Number(form.builtup_area) : null,
        plot_area: form.plot_area ? Number(form.plot_area) : null,
        bedrooms: form.bedrooms !== '' && form.bedrooms != null ? Number(form.bedrooms) : null,
        bathrooms: form.bathrooms !== '' && form.bathrooms != null ? Number(form.bathrooms) : null,
        latitude: form.latitude !== '' ? Number(form.latitude) : null,
        longitude: form.longitude !== '' ? Number(form.longitude) : null,
        map_url: mapPreviewSrc || form.map_url || null,
        show_exact_location: !!form.show_exact_location,
        is_featured: !!form.is_featured,
        amenity_ids: amenityIds,
        extra_attributes: form.extra_attributes || {},
      };
      if (isNew) {
        const res = await api.adminCreateProperty(payload);
        if (pendingImages.length) {
          try {
            await api.adminUploadImages(res.data.id, pendingImages.map((p) => p.file));
            notify(`Property created with ${pendingImages.length} photo${pendingImages.length > 1 ? 's' : ''}`);
          } catch (err) {
            notify(`Property created, but photo upload failed: ${err.message}`, 'error');
          }
          pendingImages.forEach((p) => URL.revokeObjectURL(p.preview));
          setPendingImages([]);
        } else {
          notify('Property created — you can add photos below');
        }
        navigate(`/admin/properties/${res.data.id}`, { replace: true });
      } else {
        const res = await api.adminUpdateProperty(id, payload);
        setForm((f) => ({ ...f, ...res.data, amenity_ids: res.data.amenity_ids || amenityIds }));
        setImages(res.data.images || []);
        notify('Property saved');
      }
    } catch (err) {
      const detail = err.errors?.map((x) => `${x.field}: ${x.message}`).join(', ');
      notify(detail || err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const onUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    if (isNew) {
      const next = [...files].filter((f) => /^image\//.test(f.type)).map((file) => ({ file, preview: URL.createObjectURL(file) }));
      setPendingImages((list) => [...list, ...next]);
      e.target.value = '';
      return;
    }
    setUploading(true);
    try {
      const res = await api.adminUploadImages(id, files);
      setImages(res.data?.images || res.data?.property?.images || []);
      notify('Images uploaded');
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const setPrimary = async (imageId) => {
    try {
      const res = await api.adminPatchImage(id, imageId, { is_primary: true });
      setImages(res.data.images || []);
      notify('Main photo updated');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const removeImage = async (imageId) => {
    if (!confirm('Remove this image?')) return;
    try {
      const res = await api.adminDeleteImage(id, imageId);
      setImages(res.data.images || []);
      notify('Image removed');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const toggleSection = (name) => setOpenSections((s) => ({ ...s, [name]: !s[name] }));

  if (!loaded) {
    return (
      <div className="adm-page">
        <PageHeader title="Edit Property" subtitle="Loading listing…" />
        <Card><span className="adm-shimmer" /><span className="adm-shimmer" /><span className="adm-shimmer" /></Card>
      </div>
    );
  }

  const isRent = form.purpose === 'rent';

  return (
    <div className="adm-page">
      <PageHeader
        eyebrow={isNew ? 'New listing' : form.property_code}
        title={isNew ? 'Add Property' : form.title || 'Edit Property'}
        subtitle={isNew ? 'Fill in the details and save — photos can be added right after.' : 'Update details, photos and visibility of this listing.'}
        actions={(
          <>
            <Button variant="ghost" icon={ArrowLeft} to="/admin/properties">Back</Button>
            {!isNew && form.status === 'published' && form.slug && (
              <Button variant="ghost" icon={ExternalLink} href={`/property/${form.slug}`} target="_blank" rel="noreferrer">
                View live
              </Button>
            )}
            <Button icon={Save} loading={saving} onClick={save}>Save Property</Button>
          </>
        )}
      />

      <div className="adm-form-layout">
        <nav className="adm-form-nav">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#sec-${s.id}`}>{s.label}</a>
          ))}
        </nav>

        <form className="adm-form-stack" onSubmit={save}>
          <Card id="sec-basic" title="Basic information" subtitle="What is listed and whether it shows on the website." bodyClassName="adm-form-grid">
            <Field label="Property title" required full>
              <input required minLength={5} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Premium 2 BHK in Kharghar" />
            </Field>
            <Field label="Purpose">
              <OptionSelect value={form.purpose} onChange={(v) => set('purpose', v)} list={optionMaps.purpose} />
            </Field>
            <Field label="Show on website?" hint="Only “Published” listings are visible publicly.">
              <OptionSelect value={form.status} onChange={(v) => set('status', v)} list={optionMaps.status} />
            </Field>
            <Field label="Category" required>
              <select
                required
                value={form.category_id}
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value, type_id: '' }))}
              >
                <option value="">Select category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Property type" required hint="Decides the amenities and additional detail fields.">
              <select required value={form.type_id} onChange={(e) => set('type_id', e.target.value)}>
                <option value="">Select type</option>
                {filteredTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <label className="adm-switch is-full">
              <input type="checkbox" checked={!!form.is_featured} onChange={(e) => set('is_featured', e.target.checked)} />
              <span className="adm-switch__track" />
              <span><Star size={14} /> Featured — show this property on the home page</span>
            </label>
          </Card>

          <Card id="sec-owner" title="Seller / Owner" subtitle="Choose who owns or is selling this property." bodyClassName="adm-form-grid">
            <Field label="Seller / owner name" full hint="Search by name, company or phone. Not shown on the public website.">
              <SearchSelect
                value={form.seller_id}
                onChange={(v) => set('seller_id', v)}
                options={sellerOptions}
                placeholder="Search & select seller / owner…"
                onCreate={(text) => setSellerModal({ open: true, name: text })}
                createLabel="Add new seller"
                selectedLabel={selectedSeller?.name}
              />
            </Field>
            {selectedSeller && (
              <div className="adm-seller-card is-full">
                <span className="adm-avatar">{String(selectedSeller.name || '?')[0]}</span>
                <div>
                  <strong>{selectedSeller.name}</strong>
                  <small>{[selectedSeller.company_name, selectedSeller.email].filter(Boolean).join(' · ') || 'No company / email'}</small>
                </div>
                {selectedSeller.phone && (
                  <a className="adm-btn adm-btn--ghost adm-btn--sm" href={`tel:${selectedSeller.phone}`}>
                    <Phone size={14} /> {selectedSeller.phone}
                  </a>
                )}
              </div>
            )}
          </Card>

          <Card id="sec-pricing" title="Price & specifications" bodyClassName="adm-form-grid adm-form-grid--3">
            <Field label={isRent ? 'Monthly rent (₹)' : 'Price (₹)'}>
              <div className="adm-input-icon">
                <IndianRupee size={15} />
                <input
                  type="number"
                  min="0"
                  value={isRent ? form.monthly_rent : form.price}
                  onChange={(e) => set(isRent ? 'monthly_rent' : 'price', e.target.value)}
                />
              </div>
            </Field>
            <Field label="Bedrooms">
              <input type="number" min="0" value={form.bedrooms ?? ''} onChange={(e) => set('bedrooms', e.target.value)} />
            </Field>
            <Field label="Bathrooms">
              <input type="number" min="0" value={form.bathrooms ?? ''} onChange={(e) => set('bathrooms', e.target.value)} />
            </Field>
            <Field label="Carpet area">
              <input type="number" min="0" value={form.carpet_area} onChange={(e) => set('carpet_area', e.target.value)} />
            </Field>
            <Field label="Built-up area">
              <input type="number" min="0" value={form.builtup_area} onChange={(e) => set('builtup_area', e.target.value)} />
            </Field>
            <Field label="Plot area">
              <input type="number" min="0" value={form.plot_area || ''} onChange={(e) => set('plot_area', e.target.value)} />
            </Field>
            <Field label="Area unit">
              <OptionSelect value={form.area_unit || 'sqft'} onChange={(v) => set('area_unit', v)} list={optionMaps.area_unit} />
            </Field>
            <Field label="Facing">
              <OptionSelect value={form.facing || ''} onChange={(v) => set('facing', v)} list={optionMaps.facing} placeholder="Select" />
            </Field>
            <Field label="Possession">
              <OptionSelect value={form.possession_status || 'na'} onChange={(v) => set('possession_status', v)} list={optionMaps.possession_status} />
            </Field>
            <Field label="Furnishing">
              <OptionSelect value={form.furnishing || 'na'} onChange={(v) => set('furnishing', v)} list={optionMaps.furnishing} />
            </Field>
          </Card>

          <Card id="sec-location" title="Location" bodyClassName="adm-form-grid">
            <Field label="Location">
              <select
                value={form.location_id}
                onChange={(e) => {
                  const loc = locations.find((x) => Number(x.id) === Number(e.target.value));
                  setForm((f) => ({
                    ...f,
                    location_id: e.target.value,
                    city: loc?.city || f.city,
                    latitude: loc?.latitude ?? f.latitude,
                    longitude: loc?.longitude ?? f.longitude,
                  }));
                }}
              >
                <option value="">Select location</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </Field>
            <Field label="Locality">
              <input value={form.locality || ''} onChange={(e) => set('locality', e.target.value)} />
            </Field>
            <Field label="City">
              <input value={form.city || ''} onChange={(e) => set('city', e.target.value)} />
            </Field>
            <Field label="PIN code">
              <input value={form.pincode || ''} onChange={(e) => set('pincode', e.target.value)} />
            </Field>
            <Field label="Address" full>
              <input value={form.address || ''} onChange={(e) => set('address', e.target.value)} />
            </Field>
            <Field label="Landmark" full>
              <input value={form.landmark || ''} onChange={(e) => set('landmark', e.target.value)} />
            </Field>

            <div className="adm-map-box is-full">
              <div className="adm-map-box__head">
                <MapPin size={16} />
                <div>
                  <strong>Google Map location</strong>
                  <small>Paste a Google Maps link (Share → Copy link). Lat/Lng fill automatically when possible.</small>
                </div>
              </div>
              <Field label="Google Maps link" full>
                <input
                  value={form.map_url || ''}
                  onChange={(e) => onMapUrlChange(e.target.value)}
                  placeholder="https://maps.app.goo.gl/... or https://www.google.com/maps/place/..."
                />
              </Field>
              <div className="adm-form-grid">
                <Field label="Latitude">
                  <input value={form.latitude || ''} onChange={(e) => set('latitude', e.target.value)} placeholder="19.0760" />
                </Field>
                <Field label="Longitude">
                  <input value={form.longitude || ''} onChange={(e) => set('longitude', e.target.value)} placeholder="72.8777" />
                </Field>
              </div>
              <label className="adm-switch">
                <input type="checkbox" checked={!!form.show_exact_location} onChange={(e) => set('show_exact_location', e.target.checked)} />
                <span className="adm-switch__track" />
                <span>Show map on property page</span>
              </label>
              {mapPreviewSrc ? (
                <iframe title="Map preview" className="adm-map-preview" src={mapPreviewSrc} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              ) : (
                <small className="adm-field__hint">Map preview appears after you paste a Google Maps link or enter lat/lng.</small>
              )}
            </div>
          </Card>

          <Card id="sec-description" title="Description" bodyClassName="adm-form-grid">
            <Field label="Short description" full hint={`${(form.short_description || '').length}/500 — shown on listing cards.`}>
              <textarea rows={2} maxLength={500} value={form.short_description || ''} onChange={(e) => set('short_description', e.target.value)} />
            </Field>
            <Field label="Full description" full>
              <textarea rows={6} value={form.description || ''} onChange={(e) => set('description', e.target.value)} />
            </Field>
          </Card>

          <Card
            id="sec-extra"
            title="Additional details"
            subtitle={selectedType ? `Fields for ${selectedType.name} — filled values appear on the property page.` : 'Select a property type to see its detail fields.'}
            actions={typeFields.length > 0 && <Badge tone="teal">{filledExtras}/{typeFields.length} filled</Badge>}
          >
            {!selectedType ? (
              <EmptyState icon={ListChecks} title="No property type selected" text="Choose a property type in Basic information." />
            ) : typeFields.length === 0 ? (
              <EmptyState icon={ListChecks} title="No extra fields for this type" />
            ) : (
              <>
                <div className="adm-search adm-search--sm">
                  <SearchIcon size={15} />
                  <input value={fieldFilter} onChange={(e) => setFieldFilter(e.target.value)} placeholder="Find a field…" />
                </div>
                <div className="adm-accordion">
                  {groupedFields.map(([section, fields], idx) => {
                    const isOpen = fieldFilter ? true : openSections[section] ?? idx === 0;
                    const filled = fields.filter((f) => String(form.extra_attributes?.[f.field_key] ?? '').trim()).length;
                    return (
                      <div key={section} className={`adm-accordion__item${isOpen ? ' is-open' : ''}`}>
                        <button type="button" className="adm-accordion__head" onClick={() => toggleSection(section)}>
                          <span>{section}</span>
                          <span className="adm-accordion__meta">
                            {filled}/{fields.length}
                            <ChevronDown size={16} />
                          </span>
                        </button>
                        {isOpen && (
                          <div className="adm-accordion__body adm-form-grid adm-form-grid--3">
                            {fields.map((field) => (
                              field.field_type === 'upload' ? (
                                <FileUploadField
                                  key={field.field_key}
                                  label={field.field_name}
                                  value={form.extra_attributes?.[field.field_key] ?? ''}
                                  onChange={(v) => setExtra(field.field_key, v)}
                                  accept="application/pdf,image/*"
                                  icon={FileText}
                                  hint="Private document — the website only shows that it is available."
                                />
                              ) : (
                                <Field key={field.field_key} label={field.field_name} required={!!field.is_required}>
                                  <ExtraFieldInput
                                    field={field}
                                    value={form.extra_attributes?.[field.field_key] ?? ''}
                                    onChange={(v) => setExtra(field.field_key, v)}
                                  />
                                </Field>
                              )
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </Card>

          <Card
            id="sec-amenities"
            title="Amenities"
            subtitle={selectedType ? `Showing amenities available for ${selectedType.name}.` : 'Select a property type to filter amenities.'}
            actions={<Badge tone="teal">{(form.amenity_ids || []).filter((aid) => amenities.some((a) => Number(a.id) === Number(aid))).length} selected</Badge>}
          >
            <ChipMultiSelect
              options={amenities.map((a) => ({ value: Number(a.id), label: a.name }))}
              value={(form.amenity_ids || []).map(Number)}
              onChange={(ids) => set('amenity_ids', ids)}
              emptyHint="No amenities configured for this type. Add them in Masters → Amenities."
            />
          </Card>

          {(
            <Card
              id="sec-photos"
              title="Photos"
              subtitle={isNew
                ? 'Choose photos now — they upload automatically when you save. The first photo becomes the main photo.'
                : 'The main photo is used on listing cards and sharing previews.'}
              actions={(
                <label className={`adm-btn adm-btn--soft adm-btn--sm${uploading ? ' is-loading' : ''}`}>
                  {uploading ? <span className="adm-spinner" /> : <ImagePlus size={15} />}
                  <span>{uploading ? 'Uploading…' : 'Upload photos'}</span>
                  <input type="file" hidden accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={onUpload} disabled={uploading} />
                </label>
              )}
            >
              {isNew ? (pendingImages.length ? (
                <div className="adm-photo-grid">
                  {pendingImages.map((p, i) => (
                    <figure key={p.preview} className={`adm-photo${i === 0 ? ' is-primary' : ''}`}>
                      <img src={p.preview} alt="" />
                      {i === 0 ? <Badge tone="green" className="adm-photo__tag">Main photo</Badge> : <Badge tone="gray" className="adm-photo__tag">Ready to upload</Badge>}
                      <figcaption>
                        <button
                          type="button"
                          className="is-danger"
                          onClick={() => {
                            URL.revokeObjectURL(p.preview);
                            setPendingImages((list) => list.filter((x) => x !== p));
                          }}
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <EmptyState icon={ImagePlus} title="No photos selected" text="Click “Upload photos” to choose JPG, PNG or WEBP images." />
              )) : images.length ? (
                <div className="adm-photo-grid">
                  {images.map((img) => (
                    <figure key={img.id} className={`adm-photo${img.is_primary ? ' is-primary' : ''}`}>
                      <img src={img.image_url} alt="" />
                      {img.is_primary ? <Badge tone="green" className="adm-photo__tag">Main photo</Badge> : null}
                      <figcaption>
                        {!img.is_primary && (
                          <button type="button" onClick={() => setPrimary(img.id)}>
                            <Sparkles size={14} /> Use as main
                          </button>
                        )}
                        <button type="button" className="is-danger" onClick={() => removeImage(img.id)}>
                          <Trash2 size={14} /> Delete
                        </button>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <EmptyState icon={ImagePlus} title="No photos yet" text="Upload JPG, PNG or WEBP images (first upload becomes the main photo)." />
              )}
            </Card>
          )}

          <Card
            id="sec-media"
            title="Videos, brochure & documents"
            subtitle="Videos show on the property page and in the home page video section. Brochure appears as a download button."
            bodyClassName="adm-form-grid"
          >
            <FileUploadField
              label="Property video"
              value={form.youtube_url || form.video_url || ''}
              onChange={(v) => setForm((f) => ({ ...f, youtube_url: /youtu\.?be|vimeo/i.test(v) ? v : '', video_url: /youtu\.?be|vimeo/i.test(v) ? '' : v }))}
              accept="video/mp4,video/webm,video/quicktime"
              icon={Film}
              placeholder="YouTube / Vimeo link, or upload an MP4"
              hint="Tip: YouTube links load fastest. Uploads are limited by your hosting plan's file size limit."
            />
            <Field label="Virtual tour link" hint="Matterport / 360° tour URL (optional)">
              <input value={form.virtual_tour_url || ''} onChange={(e) => set('virtual_tour_url', e.target.value)} placeholder="https://…" />
            </Field>
            <FileUploadField
              label="Brochure (PDF)"
              value={form.brochure_url || ''}
              onChange={(v) => set('brochure_url', v)}
              accept="application/pdf"
              icon={FileText}
              placeholder="Upload the project brochure PDF"
            />
            <FileUploadField
              label="Floor plan"
              value={form.floor_plan_url || ''}
              onChange={(v) => set('floor_plan_url', v)}
              accept="application/pdf,image/*"
              icon={ImagePlus}
              placeholder="Image or PDF"
            />
            <Field label="RERA registration number" hint="Shown on the property page with a verified badge.">
              <div className="adm-input-icon">
                <BadgeCheck size={15} />
                <input value={form.rera_number || ''} onChange={(e) => set('rera_number', e.target.value)} placeholder="e.g. P51700012345" />
              </div>
            </Field>
          </Card>

          <Card id="sec-seo" title="Google / SEO" subtitle="Optional — overrides the auto-generated search title and description." bodyClassName="adm-form-grid">
            <Field label="SEO title" full hint={`${(form.seo_title || '').length}/200`}>
              <input maxLength={200} value={form.seo_title || ''} onChange={(e) => set('seo_title', e.target.value)} />
            </Field>
            <Field label="SEO description" full hint={`${(form.seo_description || '').length}/320`}>
              <textarea rows={2} maxLength={320} value={form.seo_description || ''} onChange={(e) => set('seo_description', e.target.value)} />
            </Field>
          </Card>

          {isNew && (
            <div className="adm-alert tone-blue">
              <Building2 size={16} /> Steps: 1) Fill details & choose photos → 2) Save → 3) Pick the main photo → 4) Set “Show on website” to Published.
            </div>
          )}

          <div className="adm-savebar">
            <span className="adm-muted">
              {isNew ? 'New property — not saved yet' : <>Editing <strong>{form.property_code}</strong></>}
            </span>
            <div className="adm-savebar__actions">
              <Link to="/admin/properties" className="adm-btn adm-btn--ghost">Cancel</Link>
              <Button type="submit" icon={Save} loading={saving}>Save Property</Button>
            </div>
          </div>
        </form>
      </div>

      <QuickSellerModal
        open={sellerModal.open}
        initialName={sellerModal.name}
        onClose={() => setSellerModal({ open: false, name: '' })}
        onCreated={(seller) => {
          setSellers((list) => [...list, seller]);
          set('seller_id', seller.id);
          setSellerModal({ open: false, name: '' });
        }}
      />
    </div>
  );
}

