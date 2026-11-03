import { useEffect } from 'react';
import { useConfig } from '../lib/config';

function upsertMeta(attr, key, content) {
  if (content == null || content === '') return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', String(content));
}

function upsertLink(rel, href) {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function upsertJsonLd(id, data) {
  if (!data) return;
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function absoluteUrl(base, url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const root = String(base || '').replace(/\/$/, '');
  return `${root}${url.startsWith('/') ? url : `/${url}`}`;
}

/**
 * Per-page SEO: title, description, canonical, Open Graph, Twitter, JSON-LD.
 */
export default function SEOHead({
  title,
  description,
  keywords,
  path = '/',
  image,
  type = 'website',
  noindex = false,
  jsonLd,
}) {
  const { settings } = useConfig();
  const siteName = settings.brand?.site_name || 'Terranexus Properties';
  const siteUrl = (settings.seo?.site_url || (typeof window !== 'undefined' ? window.location.origin : '')).replace(
    /\/$/,
    ''
  );
  const pageTitle = title || settings.seo?.default_title || `${siteName} | Find Your Dream Home`;
  const pageDesc =
    description ||
    settings.seo?.default_description ||
    'Browse sale & rent properties across India with Terranexus Properties — verified listings and expert guidance.';
  const pageKeywords = keywords || settings.seo?.default_keywords || '';
  const ogImage = absoluteUrl(siteUrl, image || settings.seo?.og_image || '');
  const canonicalPath = path.startsWith('/') ? path : `/${path}`;
  const canonical = siteUrl ? `${siteUrl}${canonicalPath}` : canonicalPath;
  const jsonLdKey = jsonLd ? JSON.stringify(jsonLd) : '';

  useEffect(() => {
    document.title = pageTitle;
    upsertMeta('name', 'description', pageDesc);
    if (pageKeywords) upsertMeta('name', 'keywords', pageKeywords);
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');

    upsertLink('canonical', canonical);

    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:site_name', siteName);
    upsertMeta('property', 'og:title', pageTitle);
    upsertMeta('property', 'og:description', pageDesc);
    upsertMeta('property', 'og:url', canonical);
    if (ogImage) upsertMeta('property', 'og:image', ogImage);

    upsertMeta('name', 'twitter:card', ogImage ? 'summary_large_image' : 'summary');
    upsertMeta('name', 'twitter:title', pageTitle);
    upsertMeta('name', 'twitter:description', pageDesc);
    if (ogImage) upsertMeta('name', 'twitter:image', ogImage);

    if (jsonLd) upsertJsonLd('seo-jsonld', jsonLd);

    return () => {
      const script = document.getElementById('seo-jsonld');
      if (script) script.remove();
    };
  }, [pageTitle, pageDesc, pageKeywords, canonical, ogImage, type, noindex, siteName, jsonLd, jsonLdKey]);

  return null;
}

export function buildPropertySeo(property, settings = {}) {
  const siteName = settings.brand?.site_name || 'Terranexus Properties';
  const siteUrl = (settings.seo?.site_url || (typeof window !== 'undefined' ? window.location.origin : '')).replace(
    /\/$/,
    ''
  );
  const purposeLabel = property.purpose === 'rent' ? 'Rent' : 'Sale';
  const location = [property.locality, property.city]
    .filter((v) => v && !/^(na|n\/a|-)$/i.test(String(v).trim())).join(', ');
  const bhk = property.bedrooms != null ? `${property.bedrooms} BHK ` : '';
  const typeName = property.type_name ? `${property.type_name} ` : '';

  const title =
    property.seo_title ||
    `${property.title} for ${purposeLabel}${location ? ` in ${location}` : ''} | ${siteName}`;

  const autoDesc = [
    `${bhk}${typeName}for ${purposeLabel.toLowerCase()}${location ? ` in ${location}` : ''}.`,
    property.price_formatted ? `Price: ${property.price_formatted}.` : null,
    property.description ? String(property.description).replace(/\s+/g, ' ').trim().slice(0, 140) : null,
    `View details at ${siteName}.`,
  ]
    .filter(Boolean)
    .join(' ');

  const description = property.seo_description || autoDesc;
  const keywords =
    property.seo_keywords ||
    [property.title, bhk.trim(), typeName.trim(), purposeLabel, location, siteName]
      .filter(Boolean)
      .join(', ');

  const images = property.images?.length
    ? property.images.map((i) => i.image_url)
    : [property.main_image].filter(Boolean);
  const image = images[0] || settings.seo?.og_image || '';

  const path = `/property/${property.slug}`;
  const url = siteUrl ? `${siteUrl}${path}` : path;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: property.title,
    description: description.slice(0, 500),
    url,
    datePosted: property.published_at || property.created_at || undefined,
    image: images.length ? images.map((src) => absoluteUrl(siteUrl, src)) : undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price:
        property.purpose === 'rent'
          ? property.monthly_rent ?? undefined
          : property.price ?? undefined,
      availability: 'https://schema.org/InStock',
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: property.address || undefined,
      addressLocality: property.city || property.locality || undefined,
      addressRegion: property.state || undefined,
      postalCode: property.pincode || undefined,
      addressCountry: 'IN',
    },
  };

  return { title, description, keywords, path, image, type: 'article', jsonLd };
}

export function buildOrganizationJsonLd(settings = {}) {
  const siteName = settings.brand?.site_name || 'Terranexus Properties';
  const siteUrl = (settings.seo?.site_url || (typeof window !== 'undefined' ? window.location.origin : '')).replace(
    /\/$/,
    ''
  );
  const contact = settings.contact || {};
  const social = settings.social || {};
  const sameAs = [social.facebook, social.instagram, social.youtube].filter(Boolean);

  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: siteName,
    url: siteUrl || undefined,
    description: settings.seo?.default_description || undefined,
    logo: absoluteUrl(siteUrl, settings.brand?.logo_url),
    telephone: contact.phone || undefined,
    email: contact.email || undefined,
    address: contact.address
      ? { '@type': 'PostalAddress', streetAddress: contact.address, addressCountry: 'IN' }
      : undefined,
    sameAs: sameAs.length ? sameAs : undefined,
  };
}
