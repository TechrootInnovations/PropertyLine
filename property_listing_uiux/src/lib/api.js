import {
  DEMO_HOME,
  DEMO_LOCATIONS,
  DEMO_TYPES,
  DEMO_TESTIMONIALS,
  filterDemoProperties,
  getDemoProperty,
} from './demoData';

const API_URL = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };
  const token = localStorage.getItem('pv_token');
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      body:
        options.body instanceof FormData
          ? options.body
          : options.body
            ? JSON.stringify(options.body)
            : undefined,
    });
  } catch {
    const err = new Error('Unable to reach server');
    err.status = 0;
    throw err;
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const err = new Error(json.message || 'Request failed');
    err.status = res.status;
    err.errors = json.errors;
    throw err;
  }
  return json;
}

/** Demo fallback only on network/server unreachable — not when API returns empty lists. */
function withOfflineFallback(promise, fallback) {
  return promise.catch((err) => {
    if (err?.status === 0) return fallback;
    throw err;
  });
}

export const api = {
  getHome: () =>
    withOfflineFallback(request('/home'), { success: true, data: DEMO_HOME }),
  getSettings: () =>
    withOfflineFallback(request('/settings'), {
      success: true,
      data: {
        brand: { site_name: 'Terranexus Properties', site_tagline: 'Buy · Sell · Rent across India' },
        theme: {
          primary_color: '#1F5C52',
          secondary_color: '#121714',
          accent_color: '#C9A66B',
          surface_color: '#E8ECE9',
          enable_3d: true,
        },
        contact: {
          phone: '+91 73501 96969',
          whatsapp: '917350196969',
          email: 'terranexusproperties@gmail.com',
          address: 'India',
        },
        features: { show_whatsapp_float: true, show_call_float: true, currency_symbol: '₹' },
        homepage: {
          hero_slides: [],
          hero_title: 'Homes with presence — curated across India.',
          hero_subtitle: 'Private viewings, verified listings, and guidance that feels personal.',
        },
      },
    }),
  getProperties: (params = {}) =>
    withOfflineFallback(
      request(
        `/properties?${new URLSearchParams(
          Object.entries(params).filter(([, v]) => v !== '' && v != null)
        )}`
      ),
      filterDemoProperties(params)
    ),
  getProperty: async (slug) => {
    try {
      return await request(`/properties/${slug}`);
    } catch (err) {
      if (err?.status === 0) {
        const data = getDemoProperty(slug);
        if (data) return { success: true, data };
      }
      throw err;
    }
  },
  getCategories: () =>
    withOfflineFallback(request('/categories'), { success: true, data: DEMO_HOME.categories }),
  getTypes: (categoryId) =>
    withOfflineFallback(
      request(`/types${categoryId ? `?category_id=${categoryId}` : ''}`),
      { success: true, data: DEMO_TYPES }
    ),
  getLocations: (popular) =>
    withOfflineFallback(
      request(`/locations${popular ? '?popular=1' : ''}`),
      { success: true, data: DEMO_LOCATIONS }
    ),
  getAmenities: () => withOfflineFallback(request('/amenities'), { success: true, data: [] }),
  submitEnquiry: (body) => request('/enquiries', { method: 'POST', body }),
  getContent: (key) => request(`/content/${key}`),
  getPropertyVideos: () => request('/property-videos').catch(() => ({ data: [] })),

  adminLogin: (body) => request('/admin/login', { method: 'POST', body }),
  adminMe: () => request('/admin/me'),
  adminDashboard: () => request('/admin/dashboard'),
  adminProperties: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/properties${qs ? `?${qs}` : ''}`);
  },
  adminProperty: (id) => request(`/admin/properties/${id}`),
  adminCreateProperty: (body) => request('/admin/properties', { method: 'POST', body }),
  adminUpdateProperty: (id, body) => request(`/admin/properties/${id}`, { method: 'PUT', body }),
  adminDeleteProperty: (id) => request(`/admin/properties/${id}`, { method: 'DELETE' }),
  adminUploadImages: (id, files) => {
    const fd = new FormData();
    [...files].forEach((f) => fd.append('images[]', f));
    return request(`/admin/properties/${id}/images`, { method: 'POST', body: fd });
  },
  adminPatchImage: (propertyId, imageId, body) =>
    request(`/admin/properties/${propertyId}/images/${imageId}`, { method: 'PATCH', body }),
  adminDeleteImage: (propertyId, imageId) =>
    request(`/admin/properties/${propertyId}/images/${imageId}`, { method: 'DELETE' }),
  adminEnquiries: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/enquiries${qs ? `?${qs}` : ''}`);
  },
  adminUpdateEnquiry: (id, body) => request(`/admin/enquiries/${id}`, { method: 'PATCH', body }),
  adminEnquiry: (id) => request(`/admin/enquiries/${id}`),
  adminCreateEnquiry: (body) => request('/admin/enquiries', { method: 'POST', body }),
  adminDeleteEnquiry: (id) => request(`/admin/enquiries/${id}`, { method: 'DELETE' }),
  adminFollowUps: (id) => request(`/admin/enquiries/${id}/followups`),
  adminAddFollowUp: (id, body) =>
    request(`/admin/enquiries/${id}/followups`, { method: 'POST', body }),
  adminSettings: () => request('/admin/settings'),
  adminMailSettings: () => request('/admin/mail-settings'),
  adminSaveMailSettings: (body) => request('/admin/mail-settings', { method: 'PUT', body }),
  adminTestMail: (to) => request('/admin/mail-settings/test', { method: 'POST', body: { to } }),
  adminEmailLogs: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString();
    return request(`/admin/email-logs${qs ? `?${qs}` : ''}`);
  },
  adminEmailLog: (id) => request(`/admin/email-logs/${id}`),
  adminResendEmail: (id) => request(`/admin/email-logs/${id}/resend`, { method: 'POST' }),
  adminUpdateSettings: (settings) =>
    request('/admin/settings', { method: 'PUT', body: { settings } }),
  adminUploadMedia: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request('/admin/media', { method: 'POST', body: fd });
  },
  adminCategories: () => request('/admin/categories'),
  adminCreateCategory: (body) => request('/admin/categories', { method: 'POST', body }),
  adminUpdateCategory: (id, body) => request(`/admin/categories/${id}`, { method: 'PUT', body }),
  adminDeleteCategory: (id) => request(`/admin/categories/${id}`, { method: 'DELETE' }),
  adminTypes: () => request('/admin/types'),
  adminCreateType: (body) => request('/admin/types', { method: 'POST', body }),
  adminUpdateType: (id, body) => request(`/admin/types/${id}`, { method: 'PUT', body }),
  adminDeleteType: (id) => request(`/admin/types/${id}`, { method: 'DELETE' }),
  adminLocations: () => request('/admin/locations'),
  adminCreateLocation: (body) => request('/admin/locations', { method: 'POST', body }),
  adminUpdateLocation: (id, body) => request(`/admin/locations/${id}`, { method: 'PUT', body }),
  adminDeleteLocation: (id) => request(`/admin/locations/${id}`, { method: 'DELETE' }),
  adminAmenities: (typeId) =>
    request(`/admin/amenities${typeId ? `?type_id=${encodeURIComponent(typeId)}` : ''}`),
  adminCreateAmenity: (body) => request('/admin/amenities', { method: 'POST', body }),
  adminUpdateAmenity: (id, body) => request(`/admin/amenities/${id}`, { method: 'PUT', body }),
  adminDeleteAmenity: (id) => request(`/admin/amenities/${id}`, { method: 'DELETE' }),
  adminSellers: () => request('/admin/sellers'),
  adminCreateSeller: (body) => request('/admin/sellers', { method: 'POST', body }),
  adminUpdateSeller: (id, body) => request(`/admin/sellers/${id}`, { method: 'PUT', body }),
  adminDeleteSeller: (id) => request(`/admin/sellers/${id}`, { method: 'DELETE' }),
  getFieldDefinitions: (type) =>
    request(`/field-definitions${type ? `?type=${encodeURIComponent(type)}` : ''}`),
  getOptions: (type) => request(`/options${type ? `?type=${encodeURIComponent(type)}` : ''}`),
  adminOptions: (type) => request(`/admin/options${type ? `?type=${encodeURIComponent(type)}` : ''}`),
  adminCreateOption: (body) => request('/admin/options', { method: 'POST', body }),
  adminUpdateOption: (id, body) => request(`/admin/options/${id}`, { method: 'PUT', body }),
  adminDeleteOption: (id) => request(`/admin/options/${id}`, { method: 'DELETE' }),
  adminContentBlocks: () => request('/admin/content-blocks'),
  adminUpdateBlock: (key, body) => request(`/admin/content-blocks/${key}`, { method: 'PUT', body }),
  adminTestimonials: () => request('/admin/testimonials'),
  adminCreateTestimonial: (body) => request('/admin/testimonials', { method: 'POST', body }),
  adminUpdateTestimonial: (id, body) => request(`/admin/testimonials/${id}`, { method: 'PUT', body }),
  adminDeleteTestimonial: (id) => request(`/admin/testimonials/${id}`, { method: 'DELETE' }),
};

/** Currency codes like "INR" render as the symbol so prices read "₹5 Cr", not "INR5 Cr". */
function currencySymbol(symbol) {
  const s = String(symbol ?? '₹').trim();
  if (/^inr$|^rs\.?$/i.test(s)) return '₹';
  return /^[A-Za-z]{2,}$/.test(s) ? `${s} ` : s;
}

/** 1000.00 → "1,000"; 1250.5 → "1,250.5" */
export function formatArea(value) {
  if (value == null || value === '') return '';
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

/** semi_furnished → "Semi Furnished" */
export function titleCase(value) {
  if (value == null || value === '') return value;
  return String(value).replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatPrice(property, rawSymbol = '₹') {
  if (property?.price_formatted) return property.price_formatted;
  const symbol = currencySymbol(rawSymbol);
  const amount = property?.purpose === 'rent' ? property?.monthly_rent : property?.price;
  if (amount == null) return 'Price on request';
  const n = Number(amount);
  if (n >= 10000000) return `${symbol}${(n / 10000000).toFixed(2).replace(/\.00$/, '')} Cr`;
  if (n >= 100000) return `${symbol}${(n / 100000).toFixed(2).replace(/\.00$/, '')} Lakh`;
  return `${symbol}${n.toLocaleString('en-IN')}${property?.purpose === 'rent' ? '/mo' : ''}`;
}

export { DEMO_TESTIMONIALS, DEMO_HOME };
