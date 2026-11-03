import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock3, Mail, MapPin, Phone } from 'lucide-react';
import { useConfig } from '../lib/config';
import EnquiryForm from '../components/EnquiryForm';
import {
  FadeUp, Stagger, PageHero, ScaleReveal, SlideIn, staggerItem,
} from '../components/Motion';
import SEOHead, { buildOrganizationJsonLd } from '../components/SEOHead';

const ABOUT_POINTS = [
  {
    title: 'Local Expertise',
    text: 'Deep knowledge of micro-markets and forthcoming projects across India.',
    img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80',
  },
  {
    title: 'Verified Listings',
    text: 'Every property is reviewed before going live — clarity before commitment.',
    img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=900&q=80',
  },
  {
    title: 'Lead-first Service',
    text: 'Fast callbacks on phone & WhatsApp for private viewings and shortlists.',
    img: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80',
  },
];

export default function AboutPage() {
  const { settings } = useConfig();
  const name = settings.brand?.site_name || 'Terranexus Properties';

  return (
    <div className="container public-page">
      <SEOHead
        title={`About ${name} | Real Estate Experts`}
        description={`Learn about ${name} — verified property listings, transparent pricing, and personal guidance for buyers and renters across India.`}
        keywords={settings.seo?.default_keywords}
        path="/about"
        image={settings.seo?.og_image}
        jsonLd={buildOrganizationJsonLd(settings)}
      />
      <PageHero
        eyebrow="Our story"
        image="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2000&q=75"
        crumb="About"
        title={`About ${name}`}
        subtitle="We help buyers and renters discover the right home with transparent pricing, verified listings, and guidance that feels personal."
      />

      <ScaleReveal>
        <div
          className="about-hero-band"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1600&q=80)',
          }}
        >
          <motion.div
            className="about-hero-copy"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <h2>Homes with presence.</h2>
            <p>An editorial approach to Indian real estate — calm, curated, and client-first.</p>
          </motion.div>
        </div>
      </ScaleReveal>

      <Stagger className="about-grid" delay={0.1}>
        {ABOUT_POINTS.map((item) => (
          <motion.article
            key={item.title}
            className="about-card"
            variants={staggerItem}
            whileHover={{ y: -8 }}
          >
            <div className="about-card-media" style={{ backgroundImage: `url(${item.img})` }} />
            <div className="about-card-body">
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
          </motion.article>
        ))}
      </Stagger>

      <FadeUp>
        <div className="cta-band cta-band-live" style={{ marginTop: '2.5rem' }}>
          <div>
            <h2>Ready to begin?</h2>
            <p style={{ margin: '0.7rem 0 0', opacity: 0.9 }}>Talk to a consultant today.</p>
          </div>
          <Link to="/contact" className="btn btn-accent">Contact us</Link>
        </div>
      </FadeUp>
    </div>
  );
}

export function ContactPage() {
  const { settings } = useConfig();
  const c = settings.contact || {};
  const name = settings.brand?.site_name || 'Terranexus Properties';
  return (
    <div className="container public-page">
      <SEOHead
        title={`Contact ${name} | Property Consultants`}
        description={`Contact ${name} for sale, rent, or investment advice. Phone, WhatsApp, and enquiry form available.`}
        keywords={settings.seo?.default_keywords}
        path="/contact"
        image={settings.seo?.og_image}
        jsonLd={buildOrganizationJsonLd(settings)}
      />
      <PageHero
        eyebrow="Concierge"
        image="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=2000&q=75"
        title="Contact Us"
        subtitle="Reach our property consultants for sale, rent, or investment advice."
      />
      <div className="detail-layout">
        <SlideIn from="left">
          <motion.div className="why-card contact-info-card" whileHover={{ y: -4 }}>
            <h3>Office</h3>
            <ul className="contact-lines">
              {c.address && <li><span className="contact-lines__icon"><MapPin size={17} /></span><span><small>Address</small>{c.address}</span></li>}
              {c.phone && <li><span className="contact-lines__icon"><Phone size={17} /></span><span><small>Phone</small>{c.phone}</span></li>}
              {c.email && <li><span className="contact-lines__icon"><Mail size={17} /></span><span><small>Email</small>{c.email}</span></li>}
              <li><span className="contact-lines__icon"><Clock3 size={17} /></span><span><small>Hours</small>{c.office_hours || 'Mon–Sat 10AM–7PM'}</span></li>
            </ul>
            <div className="contact-actions">
              {c.phone && (
                <motion.a className="btn btn-secondary" href={`tel:${String(c.phone).replace(/\s/g, '')}`} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  Call now
                </motion.a>
              )}
              {c.whatsapp && (
                <motion.a
                  className="btn btn-primary"
                  href={`https://wa.me/${c.whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  WhatsApp
                </motion.a>
              )}
            </div>
          </motion.div>
          <motion.div
            className="contact-visit"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            <div className="contact-visit__copy">
              <span className="eyebrow">Private viewings</span>
              <h3>Visit homes with a consultant beside you</h3>
              <p>Tell us what you are looking for — we shortlist, schedule site visits and handle the paperwork end to end.</p>
              <div className="contact-visit__stats">
                <span><strong>Same-day</strong><small>WhatsApp replies</small></span>
                <span><strong>Verified</strong><small>Listings only</small></span>
                <span><strong>End-to-end</strong><small>Documentation</small></span>
              </div>
            </div>
          </motion.div>
        </SlideIn>
        <SlideIn from="right" delay={0.1}>
          <EnquiryForm />
        </SlideIn>
      </div>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="container public-page">
      <SEOHead title="Page not found" description="The page you requested does not exist." path="/404" noindex />
      <PageHero
        eyebrow="404"
        title="Page not found"
        subtitle="The page or property you are looking for does not exist or may have been removed."
      />
      <FadeUp>
        <div className="contact-actions" style={{ justifyContent: 'center' }}>
          <Link to="/" className="btn btn-primary">Go home</Link>
          <Link to="/properties" className="btn btn-ghost">Browse properties</Link>
          <Link to="/contact" className="btn btn-ghost">Contact us</Link>
        </div>
      </FadeUp>
    </div>
  );
}
