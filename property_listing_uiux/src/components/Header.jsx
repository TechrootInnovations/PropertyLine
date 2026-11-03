import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import { Home, Menu, Phone, X } from 'lucide-react';
import { useConfig } from '../lib/config';

export default function Header() {
  const { settings } = useConfig();
  const brand = settings.brand || {};
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const lastY = useRef(0);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.2 });

  useEffect(() => {
    setOpen(false);
    setHidden(false);
    lastY.current = 0;
    window.scrollTo(0, 0);
    // Inner pages always use solid header (readable on light backgrounds)
    setScrolled(location.pathname !== '/');
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const onHome = location.pathname === '/';
      setScrolled(y > 24 || !onHome);
      if (y < 48) {
        setHidden(false);
      } else if (y > lastY.current + 8) {
        setHidden(true);
        setOpen(false);
      } else if (y < lastY.current - 8) {
        setHidden(false);
      }
      lastY.current = y;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [location.pathname]);

  const links = [
    ['/', 'Home'],
    ['/properties', 'Properties'],
    ['/services', 'Services'],
    ['/about', 'About'],
    ['/blog', 'Blog'],
    ['/contact', 'Contact'],
  ];

  const onHero = location.pathname === '/' && !scrolled;

  return (
    <>
      <motion.header
        className={`site-header ${scrolled ? 'is-scrolled' : 'is-over-hero'} ${hidden ? 'is-hidden' : ''}`}
        initial={{ y: -80, opacity: 0 }}
        animate={{
          y: hidden ? -100 : 0,
          opacity: 1,
        }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
      >
        <motion.div className="scroll-progress" style={{ scaleX: progress }} />
        <div className="container nav-row">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link to="/" className="brand" onClick={() => setOpen(false)}>
              {brand.logo_url ? (
                <img
                  className="brand-logo brand-logo--solo"
                  src={brand.logo_url}
                  alt={brand.site_name || 'Terranexus Properties'}
                />
              ) : (
                <motion.div
                  className="brand-mark"
                  animate={{ rotate: [0, -8, 0, 8, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Home size={20} />
                </motion.div>
              )}
              {!brand.logo_url && (
                <div className="brand-text">
                  <strong>{brand.site_name || 'Terranexus Properties'}</strong>
                  <span>{brand.site_tagline || 'Buy · Sell · Rent across India'}</span>
                </div>
              )}
            </Link>
          </motion.div>
          <nav className="nav-links">
            {links.map(([to, label], i) => (
              <motion.div
                key={to}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * i, duration: 0.4 }}
              >
                <NavLink to={to} end={to === '/'}>{label}</NavLink>
              </motion.div>
            ))}
            <motion.a
              href={`tel:${(settings.contact?.phone || '').replace(/\s/g, '')}`}
              className="btn btn-primary"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.96 }}
            >
              <Phone size={16} /> Call
            </motion.a>
          </nav>
          <motion.button
            className="menu-toggle"
            aria-label="Menu"
            onClick={() => {
              setOpen((v) => {
                const next = !v;
                if (next) setHidden(false);
                return next;
              });
            }}
            style={{ color: onHero ? '#fff' : 'var(--pv-secondary)' }}
            whileTap={{ scale: 0.9 }}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </motion.button>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="mobile-drawer open"
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
          >
            {links.map(([to, label], i) => (
              <motion.div
                key={to}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
              >
                <Link to={to} onClick={() => setOpen(false)}>{label}</Link>
              </motion.div>
            ))}
            <a
              href={`tel:${(settings.contact?.phone || '').replace(/\s/g, '')}`}
              className="btn btn-primary"
              onClick={() => setOpen(false)}
            >
              Call
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
