/** Shared admin lookups — single source for labels, tones and status lists. */

export const ENQUIRY_STATUSES = [
  { value: 'new', label: 'New', tone: 'blue' },
  { value: 'in_progress', label: 'Pending', tone: 'amber' },
  { value: 'contacted', label: 'Contacted', tone: 'purple' },
  { value: 'converted', label: 'Converted', tone: 'green' },
  { value: 'closed', label: 'Closed', tone: 'gray' },
  { value: 'spam', label: 'Spam', tone: 'red' },
];

export const LEAD_TYPES = [
  { value: 'normal', label: 'Normal', tone: 'gray' },
  { value: 'hot', label: 'Hot', tone: 'red' },
  { value: 'warm', label: 'Warm', tone: 'amber' },
  { value: 'cold', label: 'Cold', tone: 'blue' },
];

export const CONTACT_MODES = [
  { value: 'call', label: 'Phone call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'visit', label: 'Site visit' },
  { value: 'meeting', label: 'Office meeting' },
  { value: 'email', label: 'Email' },
];

export const ENQUIRY_TABS = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'pending', label: 'Pending' },
  { key: 'followup', label: 'Follow-ups due' },
  { key: 'converted', label: 'Converted' },
  { key: 'closed', label: 'Closed' },
];

export const PROPERTY_STATUS_TONES = {
  published: 'green',
  available: 'green',
  draft: 'gray',
  sold: 'purple',
  rented: 'blue',
  inactive: 'red',
  expired: 'red',
  under_construction: 'amber',
  coming_soon: 'amber',
};

export const PAGE_SIZES = [10, 20, 50];

export function findOption(list, value) {
  return list.find((o) => o.value === value) || null;
}

export function humanize(value) {
  if (value == null || value === '') return '—';
  return String(value).replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
