import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform, animate } from 'framer-motion';
import {
  Building2, Handshake, Home, KeyRound, ShieldCheck, Sparkles, ArrowRight, MapPin, BadgeCheck, Clock3,
  Search, CalendarCheck, FileSignature,
} from 'lucide-react';
import { api, formatPrice, DEMO_TESTIMONIALS, DEMO_HOME } from '../lib/api';
import './HomePage.css';
import SearchPanel from '../components/SearchPanel';
import PropertyVideos from '../components/PropertyVideos';
import {
  HeroBGSlider,
  PropertySlider,
  QuoteSlider,
  LocationSlider,
  DualMarquee,
  ServiceSlider,
} from '../components/AnimatedSliders';
import { FadeUp, Stagger, staggerItem } from '../components/Motion';
import SEOHead, { buildOrganizationJsonLd } from '../components/SEOHead';
import { useConfig } from '../lib/config';
import { mergeHomepage } from '../lib/homepageDefaults';

const SERVICE_ICONS = [Home, KeyRound, Building2];

const HOW_STEPS = [
  { icon: Search, title: 'Discover', text: 'Search verified listings by type, location and budget — or ask us for a shortlist.' },
  { icon: CalendarCheck, title: 'Visit', text: 'Private site visits planned around your schedule, with a consultant beside you.' },
  { icon: FileSignature, title: 'Finalise', text: 'Transparent negotiation, documentation and legal checks handled end to end.' },
  { icon: KeyRound, title: 'Move in', text: 'Collect your keys with confidence — and our support continues after you settle.' },
];

function CountUp({ to, suffix = '' }) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { duration: 1.6 });
  const rounded = useTransform(spring, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(mv, to, { duration: 1.6, ease: 'easeOut' });
    const unsub = rounded.on('change', (v) => setDisplay(v));
    return () => { controls.stop(); unsub(); };
  }, [to]);
  return <>{display}{suffix}</>;
}

export default function HomePage() {
  const { settings } = useConfig();
  const [data, setData] = useState(null);
  const [demoMode, setDemoMode] = useState(false);
  const homepage = mergeHomepage(settings.homepage || {});

  useEffect(() => {
    api
      .getHome()
      .then((res) => {
        setData(res.data);
        const offlineDemo = !!res.data?.featured?.some((p) => String(p.uuid || '').startsWith('demo-'));
        setDemoMode(offlineDemo);
      })
      .catch(() => {
        setData(DEMO_HOME);
        setDemoMode(true);
      });
  }, []);

  const cta = data?.blocks?.find((b) => b.block_key === 'cta');
  const whyItems = homepage.why_items;
  const icons = [ShieldCheck, Sparkles, Handshake];
  const useDemo = demoMode;
  const locs = (data?.locations?.length ? data.locations : useDemo ? DEMO_HOME.locations : []) || [];
  const featured = (data?.featured?.length ? data.featured : useDemo ? DEMO_HOME.featured : []) || [];
  const latest = (data?.latest?.length ? data.latest : useDemo ? DEMO_HOME.latest : []) || [];
  const testimonials = data?.testimonials?.length
    ? data.testimonials
    : useDemo
      ? DEMO_TESTIMONIALS
      : [];
  const marqueeItems = locs.length
    ? [...locs.map((l) => l.name), 'Verified Listings', 'Private Viewings', 'Expert Guidance']
    : [
      'Mumbai', 'Thane', 'Vashi', 'Panvel', 'Pune', 'Kalyan', 'Karjat', 'Khopoli',
      'Verified Listings', 'Private Viewings', 'Expert Guidance',
    ];

  const services = (homepage.services || []).map((s, i) => ({
    ...s,
    img: s.image || s.img,
    icon: SERVICE_ICONS[i % SERVICE_ICONS.length],
  }));

  const siteName = settings.brand?.site_name || 'Terranexus Properties';
  const brandParts = String(siteName).split(/\s+/);
  const brandMain = brandParts[0] || 'Terranexus';
  const brandRest = brandParts.slice(1).join(' ') || 'Properties';
  const siteUrl = (settings.seo?.site_url || '').replace(/\/$/, '');
  const stats = homepage.stats || {};
  const homeJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      buildOrganizationJsonLd(settings),
      {
        '@type': 'WebSite',
        name: siteName,
        url: siteUrl || undefined,
        ...(siteUrl
          ? {
              potentialAction: {
                '@type': 'SearchAction',
                target: `${siteUrl}/properties?q={search_term_string}`,
                'query-input': 'required name=search_term_string',
              },
            }
          : {}),
      },
    ],
  };

  return (
    <>
      <SEOHead
        title={settings.seo?.default_title || `${siteName} | Find Your Dream Home`}
        description={settings.seo?.default_description}
        keywords={settings.seo?.default_keywords}
        path="/"
        image={settings.seo?.og_image || homepage.hero_slides?.[0]?.image}
        jsonLd={homeJsonLd}
      />
      <section className="hero hero-cinematic">
        <HeroBGSlider slides={homepage.hero_slides} />
        <div className="hero-atmosphere" aria-hidden>
          <span className="hero-orb orb-a" />
          <span className="hero-orb orb-b" />
          <span className="hero-grain" />
        </div>
        <div className="container hero-inner">
          <div className="hero-content">
            <motion.span
              className="hero-kicker"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              <span className="hero-kicker__dot" /> Buy · Sell · Rent across India
            </motion.span>
            <h2 className="hero-brand" aria-label={`${brandMain} ${brandRest}`}>
              <span className="hero-word">
                <motion.span
                  initial={{ y: '110%' }}
                  animate={{ y: 0 }}
                  transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
                >
                  {brandMain}
                </motion.span>
              </span>
              <em className="hero-word">
                <motion.span
                  initial={{ y: '110%' }}
                  animate={{ y: 0 }}
                  transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
                >
                  {brandRest}
                </motion.span>
              </em>
            </h2>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              {homepage.hero_title}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35 }}
            >
              {homepage.hero_subtitle}
            </motion.p>
            <motion.div
              className="hero-actions"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.48 }}
            >
              <Link to="/properties?purpose=sale" className="btn btn-accent">
                Explore homes
              </Link>
              <Link to="/contact" className="btn btn-ghost">
                Book a viewing
              </Link>
            </motion.div>
          </div>

          <div className="hero-showcase">
            {featured[0] && (
              <motion.div
                className="hero-showcase__card"
                initial={{ opacity: 0, y: 50, rotate: 3 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ duration: 1, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link to={`/property/${featured[0].slug}`} className="hero-showcase__link">
                  <span className="hero-showcase__img" style={{ backgroundImage: `url(${featured[0].main_image || homepage.hero_slides?.[0]?.image})` }}>
                    <span className="hero-showcase__tag">Featured</span>
                  </span>
                  <span className="hero-showcase__body">
                    <strong>{featured[0].title}</strong>
                    <small><MapPin size={12} /> {[featured[0].locality, featured[0].city].filter(Boolean).join(', ') || featured[0].location_name}</small>
                    <span className="hero-showcase__price">
                      {formatPrice(featured[0], settings.features?.currency_symbol || '₹')}
                      <ArrowRight size={16} />
                    </span>
                  </span>
                </Link>
              </motion.div>
            )}
            <motion.div
              className="hero-chip hero-chip--a"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9, duration: 0.8 }}
            >
              <span className="hero-chip__icon"><BadgeCheck size={18} /></span>
              <span><strong>Verified listings</strong><small>Checked before going live</small></span>
            </motion.div>
            <motion.div
              className="hero-chip hero-chip--b"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.1, duration: 0.8 }}
            >
              <span className="hero-chip__icon is-gold"><Clock3 size={18} /></span>
              <span><strong>{stats.response || 24}h response</strong><small>Call or WhatsApp</small></span>
            </motion.div>
          </div>
        </div>
        <a href="#home-search" className="hero-scroll" aria-label="Scroll to search">
          <span className="hero-scroll__mouse"><span /></span>
          <small>Scroll</small>
        </a>
      </section>

      <div className="container search-stage" id="home-search">
        <SearchPanel types={data?.types || []} locations={locs} />
      </div>

      <section className="stats-strip">
        <div className="container">
          <FadeUp className="hero-stats-band stats-strip-inner">
            <div><strong><CountUp to={Number(stats.homes) || 150} suffix="+" /></strong><span>Curated homes</span></div>
            <div><strong><CountUp to={Number(stats.cities) || 28} /></strong><span>Cities covered</span></div>
            <div><strong><CountUp to={Number(stats.response) || 24} suffix="h" /></strong><span>Avg. response</span></div>
          </FadeUp>
        </div>
      </section>

      <DualMarquee items={marqueeItems} />

      <section className="section section-slider">
        <div className="container">
          <ServiceSlider services={services} />
        </div>
      </section>

      <section className="section home-steps" style={{ paddingTop: 0 }}>
        <div className="sec-orbs" aria-hidden><span /><span /></div>
        <div className="container">
          <FadeUp className="section-head section-head--center">
            <div>
              <span className="eyebrow">How it works</span>
              <span className="gold-line" />
              <h2>Your journey, simplified</h2>
              <p>From the first search to the day you get the keys — we walk every step with you.</p>
            </div>
          </FadeUp>
          <div className="steps-track">
            <motion.span
              className="steps-line"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
            />
            <Stagger className="steps-grid" stagger={0.18}>
              {HOW_STEPS.map((step, i) => {
                const StepIcon = step.icon;
                return (
                  <motion.div key={step.title} className="step-card" variants={staggerItem} whileHover={{ y: -8 }}>
                    <span className="step-card__num">0{i + 1}</span>
                    <span className="step-card__icon"><StepIcon size={24} /></span>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </motion.div>
                );
              })}
            </Stagger>
          </div>
        </div>
      </section>

      <section className="section section-slider" style={{ paddingTop: 0 }}>
        <div className="container">
          <PropertySlider
            properties={featured.slice(0, 8)}
            eyebrow="Handpicked"
            title="Featured Properties"
            subtitle="Residences selected for finish, location, and lasting value."
            action={
              <Link to="/properties?featured=1" className="btn btn-ghost">
                View All <ArrowRight size={16} />
              </Link>
            }
          />
        </div>
      </section>

      <section className="section section-slider" style={{ paddingTop: 0 }}>
        <div className="container">
          <LocationSlider locations={locs} />
        </div>
      </section>

      <section className="section home-why" style={{ paddingTop: 0 }}>
        <div className="sec-orbs sec-orbs--alt" aria-hidden><span /><span /></div>
        <div className="container why-split">
          <div className="why-visual">
            <motion.div
              className="why-visual__main"
              style={{ backgroundImage: `url(${services[0]?.img || homepage.hero_slides?.[1]?.image})` }}
              initial={{ opacity: 0, x: -50, scale: 0.96 }}
              whileInView={{ opacity: 1, x: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
            <motion.div
              className="why-visual__small"
              style={{ backgroundImage: `url(${services[2]?.img || homepage.hero_slides?.[2]?.image})` }}
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            />
            <motion.div
              className="why-visual__badge"
              initial={{ opacity: 0, scale: 0.6 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 220, damping: 16, delay: 0.45 }}
            >
              <strong><CountUp to={Number(stats.homes) || 150} suffix="+" /></strong>
              <span>Curated homes</span>
            </motion.div>
          </div>
          <div className="why-content">
            <FadeUp className="section-head">
              <div>
                <span className="eyebrow">The difference</span>
                <span className="gold-line" />
                <h2>Why Choose Us</h2>
                <p>A refined buying & renting experience built on trust.</p>
              </div>
            </FadeUp>
            <Stagger className="why-list" stagger={0.14}>
              {whyItems.map((item, i) => {
                const Icon = icons[i % icons.length];
                return (
                  <motion.div
                    key={item.title}
                    className="why-row"
                    variants={staggerItem}
                    whileHover={{ x: 8 }}
                  >
                    <div className="why-icon"><Icon size={22} /></div>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                    </div>
                  </motion.div>
                );
              })}
            </Stagger>
            <FadeUp delay={0.2}>
              <Link to="/about" className="btn btn-primary why-cta">
                About us <ArrowRight size={16} />
              </Link>
            </FadeUp>
          </div>
        </div>
      </section>

      <section className="section section-slider" style={{ paddingTop: 0 }}>
        <div className="container">
          <PropertySlider
            properties={latest.slice(0, 8)}
            eyebrow="Just listed"
            title="Latest Properties"
            subtitle="Fresh opportunities for sale and rent — auto-sliding for you."
            action={<Link to="/properties" className="btn btn-ghost">Browse all</Link>}
          />
        </div>
      </section>

      <PropertyVideos />

      <section className="section section-quotes" style={{ paddingTop: 0 }}>
        <div className="container">
          <FadeUp className="section-head">
            <div>
              <span className="eyebrow">Loved by clients</span>
              <span className="gold-line" />
              <h2>What people say</h2>
              <p>Stories that glide — not static review cards.</p>
            </div>
          </FadeUp>
          <div className="quotes-split">
            <motion.div
              className="quotes-visual"
              style={{ backgroundImage: `url(${homepage.hero_slides?.[3]?.image || services[1]?.img})` }}
              initial={{ opacity: 0, scale: 0.94 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="quotes-visual__card">
                <span className="quotes-visual__stars">★★★★★</span>
                <strong>{testimonials.length ? `${testimonials.length} happy client ${testimonials.length === 1 ? 'story' : 'stories'}` : 'Client stories'}</strong>
                <small>Families who found their home with us</small>
              </div>
            </motion.div>
            <FadeUp delay={0.1}>
              <QuoteSlider items={testimonials} />
            </FadeUp>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0, paddingBottom: '4rem' }}>
        <div className="container">
          <FadeUp>
            <motion.div
              className="cta-band cta-band-live"
              whileHover={{ scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            >
              <div>
                <h2>{cta?.title || 'Ready to find your next property?'}</h2>
                <p style={{ margin: '0.7rem 0 0', opacity: 0.9 }}>
                  {cta?.subtitle || 'Private consultations, site visits, and curated shortlists.'}
                </p>
              </div>
              <Link to="/contact" className="btn btn-accent btn-pulse">
                {cta?.cta_label || 'Enquire Now'}
              </Link>
            </motion.div>
          </FadeUp>
        </div>
      </section>

      {demoMode && (
        <div className="demo-banner">Preview mode · Start MySQL API for live admin data</div>
      )}
    </>
  );
}
