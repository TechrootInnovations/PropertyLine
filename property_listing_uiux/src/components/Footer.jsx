import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BadgeCheck, Clock3, Facebook, Instagram, Linkedin, Mail, MapPin, MessageCircle, Phone, Twitter, Youtube,
} from 'lucide-react';
import { useConfig } from '../lib/config';
import { FadeUp, Stagger, staggerItem } from './Motion';

const SOCIALS = [
  { key: 'facebook', label: 'Facebook', icon: Facebook },
  { key: 'instagram', label: 'Instagram', icon: Instagram },
  { key: 'youtube', label: 'YouTube', icon: Youtube },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { key: 'twitter', label: 'X (Twitter)', icon: Twitter },
];

function normalizeUrl(url) {
  const s = String(url || '').trim();
  if (!s) return '';
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

export default function Footer() {
  const { settings } = useConfig();
  const brand = settings.brand || {};
  const contact = settings.contact || {};
  const social = settings.social || {};
  const links = SOCIALS.map((s) => ({ ...s, url: normalizeUrl(social[s.key]) })).filter((s) => s.url);
  const rera = brand.rera_number || contact.rera_number;
  const year = new Date().getFullYear();
  const name = brand.site_name || 'Terranexus Properties';

  return (
    <footer className="site-footer">
      <div className="container">
        <FadeUp>
          <Stagger className="footer-grid footer-grid--rich">
            <motion.div variants={staggerItem} className="footer-brand">
              <h4>{name}</h4>
              <p className="footer-tagline">{brand.site_tagline || 'Buy · Sell · Rent across India.'}</p>
              {links.length > 0 && (
                <div className="footer-social" aria-label="Social media">
                  {links.map(({ key, label, icon: Icon, url }) => (
                    <a key={key} href={url} target="_blank" rel="noreferrer" aria-label={label} title={label}>
                      <Icon size={17} />
                    </a>
                  ))}
                  {contact.whatsapp && (
                    <a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noreferrer" aria-label="WhatsApp" title="WhatsApp">
                      <MessageCircle size={17} />
                    </a>
                  )}
                </div>
              )}
              {rera && (
                <span className="footer-rera"><BadgeCheck size={15} /> RERA No: <strong>{rera}</strong></span>
              )}
            </motion.div>
            <motion.div variants={staggerItem}>
              <h4>Explore</h4>
              <p><Link to="/properties?purpose=sale">Property for Sale</Link></p>
              <p><Link to="/properties?purpose=rent">Property for Rent</Link></p>
              <p><Link to="/properties?featured=1">Featured Homes</Link></p>
              <p><Link to="/properties">All Listings</Link></p>
            </motion.div>
            <motion.div variants={staggerItem}>
              <h4>Company</h4>
              <p><Link to="/about">About Us</Link></p>
              <p><Link to="/services">Our Services</Link></p>
              <p><Link to="/team">Our Team</Link></p>
              <p><Link to="/blog">Blog</Link></p>
              <p><Link to="/contact">Contact</Link></p>
            </motion.div>
            <motion.div variants={staggerItem} className="footer-contact">
              <h4>Get in touch</h4>
              {contact.address && <p><MapPin size={15} /> <span>{contact.address}</span></p>}
              {contact.phone && <p><Phone size={15} /> <a href={`tel:${String(contact.phone).replace(/\s/g, '')}`}>{contact.phone}</a></p>}
              {contact.email && <p><Mail size={15} /> <a href={`mailto:${contact.email}`}>{contact.email}</a></p>}
              <p><Clock3 size={15} /> <span>{contact.office_hours || 'Mon–Sat 10:00 AM – 7:00 PM'}</span></p>
            </motion.div>
          </Stagger>
        </FadeUp>
        <div className="footer-bottom footer-bottom--rich">
          <span>© {year} {name}. All rights reserved.</span>
          <span className="footer-legal">
            <Link to="/privacy-policy">Privacy Policy</Link>
            <Link to="/terms-and-conditions">Terms &amp; Conditions</Link>
            <Link to="/admin/login">Agent Login</Link>
          </span>
          <span className="footer-credit">
            Developed by{' '}
            <a href="https://www.kalkidigital.com/" target="_blank" rel="noopener noreferrer">
              <strong>Kalki Digital Information Technologies</strong>
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
