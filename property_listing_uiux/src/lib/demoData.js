/** Pan-India demo catalogue — production-ready UI when API is offline. */

export const DEMO_TYPES = [
  { id: 1, name: 'Apartment', slug: 'apartment' },
  { id: 2, name: 'Villa', slug: 'villa' },
  { id: 3, name: 'Penthouse', slug: 'penthouse' },
  { id: 4, name: 'Office', slug: 'office' },
  { id: 5, name: 'Shop', slug: 'shop' },
  { id: 6, name: 'Plot', slug: 'residential-plot' },
];

export const DEMO_LOCATIONS = [
  { id: 1, name: 'Bandra West', slug: 'bandra-west', city: 'Mumbai', property_count_cache: 186 },
  { id: 2, name: 'Whitefield', slug: 'whitefield', city: 'Bengaluru', property_count_cache: 214 },
  { id: 3, name: 'Gurgaon Sector 54', slug: 'gurgaon-sec-54', city: 'Gurugram', property_count_cache: 172 },
  { id: 4, name: 'Hitech City', slug: 'hitech-city', city: 'Hyderabad', property_count_cache: 158 },
  { id: 5, name: 'Koregaon Park', slug: 'koregaon-park', city: 'Pune', property_count_cache: 141 },
  { id: 6, name: 'Adyar', slug: 'adyar', city: 'Chennai', property_count_cache: 129 },
  { id: 7, name: 'Salt Lake', slug: 'salt-lake', city: 'Kolkata', property_count_cache: 98 },
  { id: 8, name: 'Kharghar', slug: 'kharghar', city: 'Navi Mumbai', property_count_cache: 112 },
];

const imgs = [
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1400&q=85',
];

function prop(partial, i) {
  return {
    id: i + 1,
    uuid: `demo-${i + 1}`,
    property_code: `PROP-${1001 + i}`,
    is_featured: i < 6,
    status: 'published',
    currency: 'INR',
    area_unit: 'sqft',
    main_image: imgs[i % imgs.length],
    views_count: 220 + i * 31,
    ...partial,
  };
}

export const DEMO_PROPERTIES = [
  prop({
    title: 'Sea-Facing 3 BHK at Bandra West',
    slug: 'sea-facing-3bhk-bandra-west',
    purpose: 'sale',
    price: 48500000,
    price_formatted: '₹4.85 Cr',
    bedrooms: 3,
    bathrooms: 3,
    carpet_area: 1650,
    locality: 'Bandra West',
    location_name: 'Bandra West',
    city: 'Mumbai',
    state: 'Maharashtra',
    type_name: 'Apartment',
    category_name: 'Residential',
    furnishing: 'semi_furnished',
    short_description: 'Premium tower residence with Arabian Sea views.',
  }, 0),
  prop({
    title: 'Smart Villa in Whitefield Tech Park Belt',
    slug: 'smart-villa-whitefield',
    purpose: 'sale',
    price: 32000000,
    price_formatted: '₹3.20 Cr',
    bedrooms: 4,
    bathrooms: 4,
    carpet_area: 3100,
    locality: 'Whitefield',
    location_name: 'Whitefield',
    city: 'Bengaluru',
    state: 'Karnataka',
    type_name: 'Villa',
    category_name: 'Residential',
    furnishing: 'furnished',
    short_description: 'Gated villa with home automation & private lawn.',
  }, 1),
  prop({
    title: 'Sky Penthouse · Golf Course Road',
    slug: 'sky-penthouse-gurgaon',
    purpose: 'sale',
    price: 72000000,
    price_formatted: '₹7.20 Cr',
    bedrooms: 4,
    bathrooms: 5,
    carpet_area: 4200,
    locality: 'Sector 54',
    location_name: 'Gurgaon Sector 54',
    city: 'Gurugram',
    state: 'Haryana',
    type_name: 'Penthouse',
    category_name: 'Residential',
    furnishing: 'furnished',
    short_description: 'Duplex penthouse overlooking the golf greens.',
  }, 2),
  prop({
    title: 'Cyber Pearl Serviced Apartment',
    slug: 'cyber-pearl-hitech-city',
    purpose: 'rent',
    monthly_rent: 65000,
    price_formatted: '₹65,000/mo',
    bedrooms: 2,
    bathrooms: 2,
    carpet_area: 1180,
    locality: 'Hitech City',
    location_name: 'Hitech City',
    city: 'Hyderabad',
    state: 'Telangana',
    type_name: 'Apartment',
    category_name: 'Residential',
    furnishing: 'furnished',
    short_description: 'IT corridor rental — fully furnished, ready to move.',
  }, 3),
  prop({
    title: 'Heritage Bungalow · Koregaon Park',
    slug: 'heritage-bungalow-koregaon-park',
    purpose: 'sale',
    price: 27500000,
    price_formatted: '₹2.75 Cr',
    bedrooms: 5,
    bathrooms: 4,
    carpet_area: 3800,
    locality: 'Koregaon Park',
    location_name: 'Koregaon Park',
    city: 'Pune',
    state: 'Maharashtra',
    type_name: 'Villa',
    category_name: 'Residential',
    furnishing: 'semi_furnished',
    short_description: 'Colonial charm meets modern interiors.',
  }, 4),
  prop({
    title: 'Beachside 2 BHK in Adyar',
    slug: 'beachside-2bhk-adyar',
    purpose: 'sale',
    price: 16800000,
    price_formatted: '₹1.68 Cr',
    bedrooms: 2,
    bathrooms: 2,
    carpet_area: 1120,
    locality: 'Adyar',
    location_name: 'Adyar',
    city: 'Chennai',
    state: 'Tamil Nadu',
    type_name: 'Apartment',
    category_name: 'Residential',
    furnishing: 'semi_furnished',
    short_description: 'Minutes from Elliot’s Beach with clubhouse access.',
  }, 5),
  prop({
    title: 'Lake View Flat · Salt Lake Sector V',
    slug: 'lake-view-salt-lake',
    purpose: 'rent',
    monthly_rent: 32000,
    price_formatted: '₹32,000/mo',
    bedrooms: 3,
    bathrooms: 2,
    carpet_area: 1350,
    locality: 'Salt Lake',
    location_name: 'Salt Lake',
    city: 'Kolkata',
    state: 'West Bengal',
    type_name: 'Apartment',
    category_name: 'Residential',
    furnishing: 'furnished',
    short_description: 'Spacious family rental near IT & metro.',
  }, 6),
  prop({
    title: 'Skyline Residences — Kharghar Hills',
    slug: 'skyline-residences-kharghar',
    purpose: 'sale',
    price: 14500000,
    price_formatted: '₹1.45 Cr',
    bedrooms: 3,
    bathrooms: 3,
    carpet_area: 1480,
    locality: 'Kharghar',
    location_name: 'Kharghar',
    city: 'Navi Mumbai',
    state: 'Maharashtra',
    type_name: 'Apartment',
    category_name: 'Residential',
    furnishing: 'semi_furnished',
    short_description: 'Corner unit with hill & creek views.',
  }, 7),
  prop({
    title: 'Grade-A Office · BKC Fringe',
    slug: 'grade-a-office-bkc',
    purpose: 'rent',
    monthly_rent: 450000,
    price_formatted: '₹4.50 Lakh/mo',
    bedrooms: null,
    bathrooms: 4,
    carpet_area: 5200,
    locality: 'Bandra Kurla Complex',
    location_name: 'Bandra West',
    city: 'Mumbai',
    state: 'Maharashtra',
    type_name: 'Office',
    category_name: 'Commercial',
    furnishing: 'furnished',
    short_description: 'Plug-and-play corporate floorplate.',
  }, 8),
  prop({
    title: 'NA Plot near Outer Ring Road',
    slug: 'na-plot-orr-bengaluru',
    purpose: 'sale',
    price: 9800000,
    price_formatted: '₹98 Lakh',
    bedrooms: null,
    bathrooms: null,
    plot_area: 2400,
    carpet_area: null,
    locality: 'Whitefield',
    location_name: 'Whitefield',
    city: 'Bengaluru',
    state: 'Karnataka',
    type_name: 'Plot',
    category_name: 'Land / Plot',
    furnishing: 'na',
    short_description: 'Clear-title investment plot with road access.',
  }, 9),
];

export const DEMO_TESTIMONIALS = [
  {
    id: 1,
    name: 'Ananya Mehta',
    role: 'Home Buyer · Mumbai',
    rating: 5,
    message: 'Found our Bandra apartment in under 10 days. The virtual tours and site coordination were world-class.',
    avatar_url: 'https://i.pravatar.cc/120?img=5',
  },
  {
    id: 2,
    name: 'Rahul Iyer',
    role: 'Tech Professional · Bengaluru',
    rating: 5,
    message: 'Relocated from Hyderabad seamlessly. Transparent pricing and same-day WhatsApp responses.',
    avatar_url: 'https://i.pravatar.cc/120?img=12',
  },
  {
    id: 3,
    name: 'Neha Kapoor',
    role: 'Investor · Gurugram',
    rating: 5,
    message: 'Best-in-class shortlist for Golf Course Road. Documentation support felt truly premium.',
    avatar_url: 'https://i.pravatar.cc/120?img=9',
  },
];

export const DEMO_HOME = {
  featured: DEMO_PROPERTIES.filter((p) => p.is_featured),
  latest: DEMO_PROPERTIES,
  locations: DEMO_LOCATIONS,
  types: DEMO_TYPES,
  categories: [
    { id: 1, name: 'Residential', slug: 'residential' },
    { id: 2, name: 'Commercial', slug: 'commercial' },
    { id: 3, name: 'Land / Plot', slug: 'land-plot' },
  ],
  testimonials: DEMO_TESTIMONIALS,
  blocks: [],
};

export function filterDemoProperties(params = {}) {
  let items = [...DEMO_PROPERTIES];
  if (params.purpose) items = items.filter((p) => p.purpose === params.purpose);
  if (params.type) {
    const t = String(params.type).replace(/-/g, ' ').toLowerCase();
    items = items.filter((p) => (p.type_name || '').toLowerCase().includes(t));
  }
  if (params.location) {
    const loc = String(params.location).toLowerCase().replace(/-/g, ' ');
    items = items.filter(
      (p) =>
        (p.locality || '').toLowerCase().includes(loc) ||
        (p.location_name || '').toLowerCase().includes(loc) ||
        (p.city || '').toLowerCase().includes(loc)
    );
  }
  if (params.featured === '1' || params.featured === 'true') {
    items = items.filter((p) => p.is_featured);
  }
  if (params.bedrooms) {
    const beds = String(params.bedrooms);
    if (beds.endsWith('+')) {
      const n = Number(beds.replace('+', ''));
      items = items.filter((p) => (p.bedrooms || 0) >= n);
    } else {
      items = items.filter((p) => p.bedrooms === Number(beds));
    }
  }
  if (params.q) {
    const q = String(params.q).toLowerCase();
    items = items.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.locality || '').toLowerCase().includes(q) ||
        (p.city || '').toLowerCase().includes(q)
    );
  }
  if (params.sort === 'price_asc') {
    items.sort((a, b) => (a.price || a.monthly_rent || 0) - (b.price || b.monthly_rent || 0));
  } else if (params.sort === 'price_desc') {
    items.sort((a, b) => (b.price || b.monthly_rent || 0) - (a.price || a.monthly_rent || 0));
  }
  const page = Number(params.page || 1);
  const limit = Number(params.limit || 12);
  const start = (page - 1) * limit;
  const slice = items.slice(start, start + limit);
  return {
    data: slice,
    meta: { page, limit, total: items.length, totalPages: Math.ceil(items.length / limit) || 1 },
  };
}

export function getDemoProperty(slug) {
  const base = DEMO_PROPERTIES.find((p) => p.slug === slug || String(p.id) === String(slug));
  if (!base) return null;
  const idx = DEMO_PROPERTIES.indexOf(base);
  return {
    ...base,
    description:
      (base.short_description || '') +
      ' Verified listing across India’s top micro-markets — schedule a private 3D walkthrough or site visit today.',
    amenities: [
      { id: 1, name: 'Lift' },
      { id: 2, name: 'Parking' },
      { id: 3, name: 'Security' },
      { id: 4, name: 'Power Backup' },
      { id: 5, name: 'Gym' },
      { id: 6, name: 'Club House' },
    ],
    images: [
      { id: 1, image_url: base.main_image, is_primary: 1 },
      { id: 2, image_url: imgs[(idx + 1) % imgs.length] },
      { id: 3, image_url: imgs[(idx + 2) % imgs.length] },
      { id: 4, image_url: imgs[(idx + 3) % imgs.length] },
    ],
    related: DEMO_PROPERTIES.filter((p) => p.id !== base.id).slice(0, 3),
    address: `${base.locality}, ${base.city}, ${base.state}`,
    possession_status: 'ready_to_move',
    latitude: 19.04,
    longitude: 73.06,
  };
}
