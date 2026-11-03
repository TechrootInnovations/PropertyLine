import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bath, BedDouble, Building2, Check, ChevronLeft, ChevronRight, Compass, FileText, Home, Images, LayoutGrid,
  ListChecks, MapPin, Maximize, MessageCircle, Phone, Share2, Sofa, Sparkles, Map as MapIcon,
  ArrowRight, BadgeCheck, CalendarCheck, ClipboardList, FileSignature, Download, Film, LayoutPanelTop, Orbit, Wallet,
} from 'lucide-react';
import { resolveVideo } from '../lib/media';
import { api, formatArea, formatPrice, titleCase } from '../lib/api';
import { useConfig } from '../lib/config';
import EnquiryForm from '../components/EnquiryForm';
import PropertyCard from '../components/PropertyCard';
import { FadeUp, Stagger, SlideIn, ScaleReveal, PageHero, staggerItem } from '../components/Motion';
import SEOHead, { buildPropertySeo } from '../components/SEOHead';
import { toGoogleMapsEmbedUrl } from '../lib/maps';
import './PropertyDetailPage.css';

const TRUST_POINTS = [
  { icon: BadgeCheck, title: 'Verified listing', text: 'Details checked before going live' },
  { icon: CalendarCheck, title: 'Private site visits', text: 'Scheduled around your time' },
  { icon: FileSignature, title: 'Paperwork handled', text: 'Documentation support end to end' },
];

const FALLBACK_IMG ='https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1400';

function DetailCard({ icon: Icon, title, children, className = '' }) {
  return (
    <FadeUp className={`detail-card ${className}`}>
      <h2 className="detail-card__title">
        <span className="detail-card__icon"><Icon size={18} /></span>
        {title}
      </h2>
      {children}
    </FadeUp>
  );
}

export default function PropertyDetailPage() {
  const { slug } = useParams();
  const { settings } = useConfig();
  const [property, setProperty] = useState(null);
  const [activeImg, setActiveImg] = useState(0);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setError('');
    setProperty(null);
    api
      .getProperty(slug)
      .then((res) => {
        setProperty(res.data);
        setActiveImg(0);
      })
      .catch(() => setError('Property not found.'));
  }, [slug]);

  if (error) {
    return (
      <div className="container public-page">
        <SEOHead title="Property not found" description="This listing is unavailable." path={`/property/${slug}`} noindex />
        <PageHero eyebrow="Listing" title={error} subtitle="Try browsing the collection or contact us for help." />
        <Link className="btn btn-primary" to="/properties">Browse properties</Link>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="container public-page">
        <div className="detail-skeleton">
          <div className="skeleton-line shimmer" style={{ width: '45%', marginTop: '1rem' }} />
          <div className="skeleton-media shimmer" style={{ height: 460, borderRadius: 22, marginTop: '1rem' }} />
          <div className="skeleton-line shimmer" style={{ width: '70%', marginTop: '1rem' }} />
          <div className="skeleton-line shimmer" style={{ width: '40%' }} />
        </div>
      </div>
    );
  }

  const images = property.images?.length
    ? property.images.map((i) => i.image_url)
    : [property.main_image].filter(Boolean);
  const total = Math.max(images.length, 1);
  const symbol = settings.features?.currency_symbol || '₹';
  const whatsapp = settings.contact?.whatsapp;
  const phone = settings.contact?.phone;
  const siteName = settings.brand?.site_name || 'Terranexus Properties';
  const location = property.address || [property.locality, property.city].filter(Boolean).join(', ');

  const share = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const go = (dir) => setActiveImg((i) => (i + dir + total) % total);

  const seo = buildPropertySeo(property, settings);
  const video = resolveVideo(property.youtube_url, property.video_url);
  const area = property.carpet_area || property.builtup_area || property.plot_area;
  const isOn = (v) => v === true || v === 1 || v === '1';
  const money = (v) => {
    const n = Number(v);
    if (v == null || v === '' || !Number.isFinite(n) || n <= 0) return null;
    return `${/^inr$/i.test(String(symbol).trim()) ? '₹' : symbol}${n.toLocaleString('en-IN')}`;
  };

  // Every price-related value the admin saves
  const pricing = [
    [property.purpose === 'rent' ? 'Monthly rent' : 'Asking price', formatPrice(property, symbol)],
    property.purpose !== 'rent' && ['Monthly rent', money(property.monthly_rent)],
    ['Price type', property.price_type && property.price_type !== 'na' && titleCase(property.price_type)],
    ['Negotiable', isOn(property.price_negotiable) ? 'Yes' : null],
    ['Maintenance charges', money(property.maintenance_charges)],
    ['Security deposit', money(property.security_deposit)],
    ['Other charges', money(property.other_charges) || (Number.isNaN(Number(property.other_charges)) ? property.other_charges : null)],
  ].filter(Boolean).filter(([, v]) => v != null && v !== '' && v !== false);

  const floorText = property.floor_number != null && property.floor_number !== ''
    ? (property.total_floors ? `${property.floor_number} of ${property.total_floors}` : property.floor_number)
    : null;

  const facts = [
    { icon: BedDouble, label: 'Bedrooms', value: property.bedrooms },
    { icon: Bath, label: 'Bathrooms', value: property.bathrooms },
    { icon: Maximize, label: 'Area', value: area && `${formatArea(area)} ${property.area_unit || 'sqft'}` },
    { icon: Building2, label: 'Type', value: property.type_name },
    { icon: Sofa, label: 'Furnishing', value: property.furnishing !== 'na' && titleCase(property.furnishing) },
    { icon: Compass, label: 'Facing', value: titleCase(property.facing) },
  ].filter((f) => f.value != null && f.value !== '' && f.value !== false);

  const specs = [
    ['Type', property.type_name],
    ['Category', property.category_name],
    ['Bedrooms', property.bedrooms],
    ['Bathrooms', property.bathrooms],
    ['Carpet Area', property.carpet_area && `${formatArea(property.carpet_area)} ${property.area_unit}`],
    ['Built-up', property.builtup_area && `${formatArea(property.builtup_area)} ${property.area_unit}`],
    ['Plot Area', property.plot_area && `${formatArea(property.plot_area)} ${property.area_unit}`],
    ['Furnishing', property.furnishing !== 'na' && titleCase(property.furnishing)],
    ['Possession', property.possession_status !== 'na' && titleCase(property.possession_status)],
    ['Facing', titleCase(property.facing)],
    ['Balconies', Number(property.balconies) > 0 && property.balconies],
    ['Parking', property.parking],
    ['Floor', floorText],
    ['Total floors', !floorText && Number(property.total_floors) > 0 && property.total_floors],
    ['Age', property.property_age],
  ].filter(([, v]) => v != null && v !== '' && v !== false && v !== 'na');

  const extraGroups = Object.entries(
    (property.extra_details || []).reduce((acc, row) => {
      (acc[row.section] = acc[row.section] || []).push(row);
      return acc;
    }, {})
  );

  const listedOn = property.published_at || property.created_at;
  const glance = [
    ['Property ID', property.property_code],
    ['RERA No.', property.rera_number],
    ['Listing for', property.purpose === 'rent' ? 'Rent' : property.purpose === 'sale' ? 'Sale' : titleCase(property.purpose)],
    ['Property type', [property.category_name, property.type_name].filter(Boolean).join(' · ')],
    ['Location', property.location_name || property.city],
    ['Possession', property.possession_status !== 'na' && titleCase(property.possession_status)],
    ['Listed on', listedOn && !Number.isNaN(new Date(String(listedOn).replace(' ', 'T')).getTime())
      && new Date(String(listedOn).replace(' ', 'T')).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })],
    ['Views', Number(property.views_count) > 0 && Number(property.views_count).toLocaleString('en-IN')],
  ].filter(([, v]) => v != null && v !== '' && v !== false);

  const showMap = property.show_exact_location !== 0
    && property.show_exact_location !== false
    && property.show_exact_location !== '0';
  const areaAddress = [property.locality, property.city, property.district, property.state, property.pincode]
    .filter((v, i, arr) => v && !/^(na|n\/a|-)$/i.test(String(v).trim()) && arr.indexOf(v) === i).join(', ');
  const fullAddress = [
    property.address,
    property.landmark && `Near ${property.landmark}`,
    areaAddress,
  ].filter(Boolean).join(', ');
  const embedSrc = showMap
    ? toGoogleMapsEmbedUrl({ mapUrl: property.map_url, latitude: property.latitude, longitude: property.longitude })
    : '';

  return (
    <div className="container public-page property-detail">
      <SEOHead {...seo} />

      <motion.nav
        className="detail-crumbs"
        aria-label="Breadcrumb"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Link to="/"><Home size={14} /> Home</Link>
        <ChevronRight size={14} />
        <Link to="/properties">Properties</Link>
        <ChevronRight size={14} />
        <span>{property.title}</span>
      </motion.nav>

      <header className="detail-head">
        <div className="detail-head__main">
          <motion.div
            className="badges"
            style={{ position: 'static', marginBottom: '0.85rem' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {property.is_featured && <span className="badge featured">Featured</span>}
            {isOn(property.is_verified) && <span className="badge verified"><BadgeCheck size={12} /> Verified</span>}
            <span className={`badge ${property.purpose}`}>
              {property.purpose === 'sale' ? 'For Sale' : 'For Rent'}
            </span>
            <span className="badge">{property.property_code}</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            {property.title}
          </motion.h1>
          {property.rera_number && (
            <span className="detail-rera"><BadgeCheck size={15} /> RERA Reg. No: <strong>{property.rera_number}</strong></span>
          )}
          {location && (
            <motion.p
              className="detail-head__loc"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <MapPin size={16} /> {location}
            </motion.p>
          )}
        </div>
        <motion.div
          className="detail-price-card"
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 240, damping: 22 }}
        >
          <span>{property.purpose === 'rent' ? 'Monthly rent' : 'Asking price'}</span>
          <p className="price detail-price">{formatPrice(property, symbol)}</p>
          {property.price_negotiable ? <small>Negotiable</small> : <small>{property.category_name || 'Property'} · {property.type_name}</small>}
        </motion.div>
      </header>

      {facts.length > 0 && (
        <Stagger className="detail-facts" stagger={0.06}>
          {facts.map(({ icon: Icon, label, value }) => (
            <motion.div key={label} className="detail-fact" variants={staggerItem} whileHover={{ y: -4 }}>
              <span className="detail-fact__icon"><Icon size={19} /></span>
              <div>
                <strong>{value}</strong>
                <small>{label}</small>
              </div>
            </motion.div>
          ))}
        </Stagger>
      )}

      <div className="detail-layout">
        <div className="detail-main">
          <ScaleReveal>
            <div className="gallery detail-gallery">
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeImg}
                  src={images[activeImg] || FALLBACK_IMG}
                  alt={property.title}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.5 }}
                />
              </AnimatePresence>
              <div className="detail-gallery__shade" />
              <span className="detail-gallery__count"><Images size={14} /> {activeImg + 1} / {total}</span>
              {total > 1 && (
                <>
                  <button type="button" className="detail-gallery__nav is-prev" onClick={() => go(-1)} aria-label="Previous photo">
                    <ChevronLeft size={22} />
                  </button>
                  <button type="button" className="detail-gallery__nav is-next" onClick={() => go(1)} aria-label="Next photo">
                    <ChevronRight size={22} />
                  </button>
                </>
              )}
            </div>
          </ScaleReveal>
          {images.length > 1 && (
            <Stagger className="thumbs detail-thumbs" stagger={0.05}>
              {images.slice(0, 8).map((src, i) => (
                <motion.button
                  key={src + i}
                  className={i === activeImg ? 'active' : ''}
                  onClick={() => setActiveImg(i)}
                  variants={staggerItem}
                  whileHover={{ y: -3, scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <img src={src} alt="" />
                </motion.button>
              ))}
            </Stagger>
          )}

          {video && (
            <DetailCard icon={Film} title="Video tour">
              <div className="detail-video">
                {video.kind === 'file' ? (
                  <video src={video.src} controls preload="metadata" playsInline poster={property.main_image || undefined} />
                ) : (
                  <iframe
                    src={video.src}
                    title={`${property.title} video`}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
              </div>
            </DetailCard>
          )}

          {(property.short_description || property.description) && (
            <DetailCard icon={FileText} title="Overview">
              {property.short_description && <p className="detail-lead">{property.short_description}</p>}
              {property.description && <p className="detail-desc">{property.description}</p>}
            </DetailCard>
          )}

          {pricing.length > 1 && (
            <DetailCard icon={Wallet} title="Pricing & charges">
              <Stagger className="spec-grid" stagger={0.04}>
                {pricing.map(([label, value]) => (
                  <motion.div className="spec" key={label} variants={staggerItem} whileHover={{ y: -3 }}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </motion.div>
                ))}
              </Stagger>
            </DetailCard>
          )}

          {specs.length > 0 && (
            <DetailCard icon={LayoutGrid} title="Specifications">
              <Stagger className="spec-grid" stagger={0.04}>
                {specs.map(([label, value]) => (
                  <motion.div className="spec" key={label} variants={staggerItem} whileHover={{ y: -3 }}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </motion.div>
                ))}
              </Stagger>
            </DetailCard>
          )}

          {extraGroups.length > 0 && (
            <DetailCard icon={ListChecks} title="Additional Details" className="extra-details">
              {extraGroups.map(([section, rows]) => (
                <div className="extra-details__group" key={section}>
                  {extraGroups.length > 1 && <h3 className="extra-details__title">{section}</h3>}
                  {rows.some((r) => r.type !== 'yesno') && (
                    <Stagger className="spec-grid" stagger={0.03}>
                      {rows.filter((r) => r.type !== 'yesno').map((row) => (
                        <motion.div className={`spec${row.type === 'upload' ? ' spec--doc' : ''}`} key={row.key} variants={staggerItem} whileHover={{ y: -3 }}>
                          <span>{row.label}</span>
                          <strong>{row.type === 'upload' ? <><Check size={14} /> Available on request</> : row.value}</strong>
                        </motion.div>
                      ))}
                    </Stagger>
                  )}
                  {rows.some((r) => r.type === 'yesno') && (
                    <Stagger className="amenity-list detail-amenities detail-features" stagger={0.03}>
                      {rows.filter((r) => r.type === 'yesno').map((row) => (
                        <motion.span className="amenity-chip" key={row.key} variants={staggerItem} whileHover={{ scale: 1.05, y: -2 }}>
                          <span className="amenity-chip__tick"><Check size={12} strokeWidth={3} /></span>
                          {row.label}
                        </motion.span>
                      ))}
                    </Stagger>
                  )}
                </div>
              ))}
            </DetailCard>
          )}

          {!!property.amenities?.length && (
            <DetailCard icon={Sparkles} title="Amenities">
              <Stagger className="amenity-list detail-amenities" stagger={0.04}>
                {property.amenities.map((a) => (
                  <motion.span className="amenity-chip" key={a.id} variants={staggerItem} whileHover={{ scale: 1.05, y: -2 }}>
                    <span className="amenity-chip__tick"><Check size={12} strokeWidth={3} /></span>
                    {a.name}
                  </motion.span>
                ))}
              </Stagger>
            </DetailCard>
          )}

          {!embedSrc && areaAddress && (
            <DetailCard icon={MapIcon} title="Location">
              <p className="muted detail-map-loc"><MapPin size={14} /> {areaAddress}</p>
            </DetailCard>
          )}

          {embedSrc && (
            <DetailCard icon={MapIcon} title="Location on map">
              {fullAddress && (
                <p className="muted detail-map-loc">
                  <MapPin size={14} /> {fullAddress}
                </p>
              )}
              <iframe
                title="Property location map"
                className="property-map"
                src={embedSrc}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
              <a
                className="btn btn-ghost"
                style={{ marginTop: '0.85rem' }}
                href={
                  property.latitude && property.longitude
                    ? `https://www.google.com/maps?q=${property.latitude},${property.longitude}`
                    : (property.map_url || embedSrc)
                }
                target="_blank"
                rel="noreferrer"
              >
                <MapPin size={15} /> Open in Google Maps
              </a>
            </DetailCard>
          )}
        </div>

        <aside className="detail-aside">
          <SlideIn from="right" delay={0.12}>
            <motion.div
              className="side-card detail-contact"
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            >
              <div className="detail-contact__agent">
                <span className="detail-contact__avatar">{siteName.slice(0, 1)}</span>
                <div>
                  <strong>{siteName}</strong>
                  <small>Property consultant · replies within the day</small>
                </div>
              </div>
              <div className="detail-contact__actions">
                {phone && (
                  <motion.a className="btn btn-secondary" href={`tel:${phone.replace(/\s/g, '')}`} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    <Phone size={16} /> Call Agent
                  </motion.a>
                )}
                {whatsapp && (
                  <motion.a
                    className="btn btn-primary"
                    href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hi, interested in ${property.title} (${property.property_code})`)}`}
                    target="_blank"
                    rel="noreferrer"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <MessageCircle size={16} /> WhatsApp
                  </motion.a>
                )}
                {property.brochure_url && (
                  <motion.a className="btn btn-accent" href={property.brochure_url} target="_blank" rel="noreferrer" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    <Download size={16} /> Download brochure
                  </motion.a>
                )}
                {(property.floor_plan_url || property.virtual_tour_url) && (
                  <div className="detail-contact__row">
                    {property.floor_plan_url && (
                      <a className="btn btn-ghost" href={property.floor_plan_url} target="_blank" rel="noreferrer">
                        <LayoutPanelTop size={16} /> Floor plan
                      </a>
                    )}
                    {property.virtual_tour_url && (
                      <a className="btn btn-ghost" href={property.virtual_tour_url} target="_blank" rel="noreferrer">
                        <Orbit size={16} /> Virtual tour
                      </a>
                    )}
                  </div>
                )}
                <motion.button className="btn btn-ghost" onClick={share} type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  {copied ? <><Check size={16} /> Link copied</> : <><Share2 size={16} /> Share</>}
                </motion.button>
              </div>
            </motion.div>
            <EnquiryForm property={property} />
          </SlideIn>

          <FadeUp className="side-card detail-glance">
            <h3 className="detail-side-title"><ClipboardList size={17} /> At a glance</h3>
            <dl>
              {glance.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </FadeUp>

          <div className="detail-trust">
            <span className="detail-trust__ring" aria-hidden />
            <span className="eyebrow">Why {siteName}</span>
            <h3>Buy with complete confidence</h3>
            <ul>
              {TRUST_POINTS.map(({ icon: Icon, title, text }) => (
                <li key={title}>
                  <span className="detail-trust__icon"><Icon size={17} /></span>
                  <span><strong>{title}</strong><small>{text}</small></span>
                </li>
              ))}
            </ul>
            <Link to="/properties" className="btn btn-accent detail-trust__cta">
              Explore more homes <ArrowRight size={16} />
            </Link>
          </div>
        </aside>
      </div>

      {!!property.related?.length && (
        <section className="detail-related">
          <FadeUp className="section-head">
            <div>
              <span className="eyebrow">You may also like</span>
              <span className="gold-line" />
              <h2>Similar Properties</h2>
            </div>
          </FadeUp>
          <Stagger className="card-grid">
            {property.related.map((p) => <PropertyCard key={p.id} property={p} />)}
          </Stagger>
        </section>
      )}
    </div>
  );
}
