import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import PropertyCard from '../components/PropertyCard';
import {
  FadeUp, Stagger, PageHero, SkeletonCard, AnimatedCount, staggerItemSoft,
} from '../components/Motion';
import SEOHead from '../components/SEOHead';
import { useConfig } from '../lib/config';

export default function PropertiesPage() {
  const { settings } = useConfig();
  const [params, setParams] = useSearchParams();
  const [types, setTypes] = useState([]);
  const [locations, setLocations] = useState([]);
  const [purposes, setPurposes] = useState([]);
  const [result, setResult] = useState({ items: [], meta: {} });
  const [loading, setLoading] = useState(true);

  const filters = {
    purpose: params.get('purpose') || '',
    type: params.get('type') || '',
    location: params.get('location') || '',
    q: params.get('q') || '',
    bedrooms: params.get('bedrooms') || '',
    min_price: params.get('min_price') || '',
    max_price: params.get('max_price') || '',
    featured: params.get('featured') || '',
    sort: params.get('sort') || 'newest',
    page: params.get('page') || '1',
  };

  useEffect(() => {
    Promise.all([api.getTypes(), api.getLocations(), api.getOptions('purpose').catch(() => ({ data: [] }))])
      .then(([t, l, p]) => {
        setTypes(t.data || []);
        setLocations(l.data || []);
        setPurposes((p.data || []).filter((o) => o.master_type === 'purpose' || !o.master_type));
      })
      .catch(() => {
        setTypes([]);
        setLocations([]);
        setPurposes([]);
      });
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .getProperties(filters)
      .then((res) => setResult({ items: res.data || [], meta: res.meta || {} }))
      .catch(() => setResult({ items: [], meta: {} }))
      .finally(() => setLoading(false));
  }, [params.toString()]);

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value) next.delete(key);
    else next.set(key, value);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  const siteName = settings.brand?.site_name || 'Terranexus Properties';
  const purposePart = filters.purpose === 'sale' ? ' for Sale' : filters.purpose === 'rent' ? ' for Rent' : '';

  return (
    <div className="container public-page">
      <SEOHead
        title={`Properties${purposePart} | ${siteName}`}
        description={`Browse verified properties${purposePart.toLowerCase()} across India. Filter by type, location, and budget with ${siteName}.`}
        keywords={settings.seo?.default_keywords || `properties${purposePart}, real estate, ${siteName}`}
        path="/properties"
        image={settings.seo?.og_image}
      />
      <PageHero
        eyebrow="Collection"
        image="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=75"
        title="Properties"
        subtitle="Search and filter sale & rent listings curated across India."
      />

      <FadeUp delay={0.12}>
        <motion.div
          className="filters-bar"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.15 }}
        >
          <div className="field">
            <label>Purpose</label>
            <select value={filters.purpose} onChange={(e) => update('purpose', e.target.value)}>
              <option value="">Any</option>
              {(purposes.length ? purposes : [
                { value: 'sale', name: 'Sale' },
                { value: 'rent', name: 'Rent' },
              ]).map((o) => (
                <option key={o.value} value={o.value}>{o.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Type</label>
            <select value={filters.type} onChange={(e) => update('type', e.target.value)}>
              <option value="">All</option>
              {types.map((t) => <option key={t.id} value={t.slug}>{t.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Location</label>
            <select value={filters.location} onChange={(e) => update('location', e.target.value)}>
              <option value="">All</option>
              {locations.map((l) => <option key={l.id} value={l.slug}>{l.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Beds</label>
            <select value={filters.bedrooms} onChange={(e) => update('bedrooms', e.target.value)}>
              <option value="">Any</option>
              {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} BHK</option>)}
              <option value="5+">5+ BHK</option>
            </select>
          </div>
          <div className="field">
            <label>Min Price</label>
            <input value={filters.min_price} onChange={(e) => update('min_price', e.target.value)} placeholder="e.g. 5000000" />
          </div>
          <div className="field">
            <label>Sort</label>
            <select value={filters.sort} onChange={(e) => update('sort', e.target.value)}>
              <option value="newest">Newest</option>
              <option value="price_asc">Price ↑</option>
              <option value="price_desc">Price ↓</option>
              <option value="featured">Featured</option>
            </select>
          </div>
        </motion.div>
      </FadeUp>

      <div className="results-meta">
        {loading ? (
          <span className="muted">Curating properties…</span>
        ) : (
          <p className="muted">
            <AnimatedCount value={result.meta.total ?? result.items.length} />{' '}
            {(result.meta.total ?? result.items.length) === 1 ? 'property' : 'properties'} found
          </p>
        )}
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skel"
            className="card-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </motion.div>
        ) : result.items.length ? (
          <motion.div
            key={params.toString()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {result.items.length === 1 ? (
              <Stagger className={`spotlight-grid is-${result.items.length}`} stagger={0.12}>
                {result.items.map((p) => <PropertyCard key={p.id} property={p} variant="spotlight" />)}
              </Stagger>
            ) : (
              <Stagger className="card-grid" stagger={0.08}>
                {result.items.map((p) => <PropertyCard key={p.id} property={p} />)}
              </Stagger>
            )}
            {result.meta.totalPages > 1 && (
              <Stagger className="pager" delay={0.2}>
                {Array.from({ length: result.meta.totalPages }, (_, i) => i + 1).map((page) => (
                  <motion.button
                    key={page}
                    variants={staggerItemSoft}
                    className={`btn ${String(page) === String(filters.page) ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => update('page', String(page))}
                    whileHover={{ y: -2, scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    {page}
                  </motion.button>
                ))}
              </Stagger>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            className="empty"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            No properties match your filters.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
