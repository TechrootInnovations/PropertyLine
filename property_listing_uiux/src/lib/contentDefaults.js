/**
 * Starter content for dynamic pages. Everything here is editable in
 * Admin → Website Pages; saved content always replaces these defaults.
 */
import { useEffect, useState } from 'react';
import { api } from './api';

const IMG = (id, w = 1400) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=75`;

export const CONTENT_DEFAULTS = {
  about_page: {
    banner_image: IMG('photo-1600596542815-ffad4c1539a9', 2000),
    hero_title: 'About Terranexus Properties',
    hero_subtitle: 'We help buyers and renters discover the right home with transparent pricing, verified listings, and guidance that feels personal.',
    story_title: 'Homes with presence.',
    story_text: 'An editorial approach to Indian real estate — calm, curated, and client-first.\n\nFrom the first conversation to the final paperwork, our consultants work as your partners: shortlisting only verified properties, arranging private site visits and negotiating with complete transparency.',
    story_image: IMG('photo-1613490493576-7fde63acd811', 1600),
    stats: [
      { value: '150+', label: 'Curated homes' },
      { value: '28', label: 'Cities covered' },
      { value: '24h', label: 'Average response' },
      { value: '100%', label: 'Verified listings' },
    ],
    mission: 'To make buying, selling and renting property in India simple, transparent and personal.',
    vision: 'To be the most trusted name for curated real estate across Maharashtra and beyond.',
    points: [
      { title: 'Local Expertise', text: 'Deep knowledge of micro-markets and forthcoming projects across India.', image: IMG('photo-1600585154340-be6161a56a0c', 900) },
      { title: 'Verified Listings', text: 'Every property is reviewed before going live — clarity before commitment.', image: IMG('photo-1600596542815-ffad4c1539a9', 900) },
      { title: 'Lead-first Service', text: 'Fast callbacks on phone & WhatsApp for private viewings and shortlists.', image: IMG('photo-1600607687939-ce8a6c25118c', 900) },
    ],
  },
  services_page: {
    banner_image: IMG('photo-1600585154340-be6161a56a0c', 2000),
    intro: 'End-to-end real estate services — whether you are buying your first home, selling an investment or leasing commercial space.',
    items: [
      { title: 'Buy a Home', text: 'Curated shortlists of verified homes matched to your budget, lifestyle and commute.', image: IMG('photo-1600585154340-be6161a56a0c', 900), points: ['Verified listings only', 'Private site visits', 'Price negotiation'] },
      { title: 'Sell Your Property', text: 'Premium presentation, pricing strategy and qualified buyers for a faster, better sale.', image: IMG('photo-1600047509807-ba8f99d2cdde', 900), points: ['Market valuation', 'Professional photos', 'Qualified leads'] },
      { title: 'Rent & Lease', text: 'Furnished and unfurnished homes, offices and shops — with tenant and owner support.', image: IMG('photo-1600607687939-ce8a6c25118c', 900), points: ['Tenant screening', 'Agreement support', 'Move-in assistance'] },
      { title: 'Land & Investment', text: 'Agriculture land, NA plots and development land with title and document checks.', image: IMG('photo-1500382017468-9049fed747ef', 900), points: ['7/12 & title checks', 'NA conversion guidance', 'Investment advice'] },
      { title: 'Commercial Spaces', text: 'Offices, showrooms, warehouses and industrial units for growing businesses.', image: IMG('photo-1497366216548-37526070297c', 900), points: ['Office & retail', 'Industrial & warehousing', 'Lease negotiation'] },
      { title: 'Legal & Documentation', text: 'Agreement drafting, registration and loan coordination handled end to end.', image: IMG('photo-1450101499163-c8848c66ca85', 900), points: ['Agreement drafting', 'Registration support', 'Home-loan assistance'] },
    ],
  },
  team_page: {
    banner_image: IMG('photo-1600880292203-757bb62b4baf', 2000),
    intro: 'Experienced consultants who know every micro-market we work in — and who pick up the phone.',
    members: [],
  },
  blog_posts: [],
  privacy_policy: {
    updated: '',
    content: `## Introduction
Terranexus Properties ("we", "us") respects your privacy. This policy explains what information we collect through this website and how we use it.

## Information we collect
- Contact details you submit through enquiry forms (name, mobile number, email address and message)
- Details of the properties you enquire about
- Basic technical data such as browser type and pages visited

## How we use your information
- To respond to your enquiries and arrange property viewings
- To share relevant property options you have asked about
- To improve our website and services

## Sharing of information
We do not sell your personal information. We may share your details with property owners or developers only to process the enquiry you made, or when required by law.

## Data security
We take reasonable measures to protect your information from unauthorised access, loss or misuse.

## Your choices
You may ask us to update or delete your personal information at any time by contacting us.

## Contact
For any privacy questions, please reach us through the Contact page.`,
  },
  terms_page: {
    updated: '',
    content: `## Use of this website
By using this website you agree to these terms. The website is intended to help you discover properties and contact Terranexus Properties.

## Property information
Property details, prices and images are provided by owners, developers or our team and may change without notice. Please verify all details, documents and approvals independently before making any decision.

## No offer or commitment
Listings on this website are for information only and do not constitute an offer or a contract. Any transaction is subject to a separate written agreement.

## Enquiries
By submitting an enquiry you allow us to contact you by phone, WhatsApp or email about your requirement.

## Intellectual property
Content, design and logos on this website belong to Terranexus Properties or their respective owners and may not be copied without permission.

## Limitation of liability
We are not liable for any loss arising from reliance on information on this website or from transactions between buyers, sellers, landlords and tenants.

## Changes
We may update these terms from time to time. Continued use of the website means you accept the updated terms.`,
  },
};

/** Merges saved content over defaults (objects) or returns saved arrays as-is. */
export function mergeContent(key, saved) {
  const def = CONTENT_DEFAULTS[key];
  if (saved == null || saved === '') return def;
  if (Array.isArray(def)) return Array.isArray(saved) ? saved : def;
  if (typeof saved !== 'object') return def;
  const out = { ...def };
  Object.entries(saved).forEach(([k, v]) => {
    const empty = v == null || v === '' || (Array.isArray(v) && v.length === 0 && k !== 'members');
    if (!empty) out[k] = v;
  });
  return out;
}

/** Loads one dynamic page's content with defaults applied. */
export function useContent(key) {
  const [state, setState] = useState({ data: CONTENT_DEFAULTS[key], loading: true });
  useEffect(() => {
    let alive = true;
    api.getContent(key)
      .then((res) => alive && setState({ data: mergeContent(key, res.data), loading: false }))
      .catch(() => alive && setState({ data: CONTENT_DEFAULTS[key], loading: false }));
    return () => { alive = false; };
  }, [key]);
  return state;
}

export function slugify(text = '') {
  return String(text).toLowerCase().trim().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
