import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  animate,
  useReducedMotion,
} from 'framer-motion';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import PropertyCard from './PropertyCard';

const HERO_SLIDES = [
  {
    id: 1,
    image:
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=2200&q=80',
    label: 'Luxury villas',
  },
  {
    id: 2,
    image:
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2200&q=80',
    label: 'Modern apartments',
  },
  {
    id: 3,
    image:
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2200&q=80',
    label: 'Premium estates',
  },
  {
    id: 4,
    image:
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=2200&q=80',
    label: 'City residences',
  },
];

/** Full-bleed hero background crossfade + Ken Burns zoom */
export function HeroBGSlider({ interval = 5500, slides }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const progress = useMotionValue(0);

  const slideList = (Array.isArray(slides) && slides.length
    ? slides.map((s, i) => ({
        id: s.id || i + 1,
        image: s.image,
        label: s.label || `Slide ${i + 1}`,
      }))
    : HERO_SLIDES
  ).filter((s) => s.image);

  const total = Math.max(slideList.length, 1);

  const go = useCallback(
    (next) => {
      setIndex((i) => {
        const n = typeof next === 'number' ? next : (i + 1) % total;
        return ((n % total) + total) % total;
      });
      progress.set(0);
    },
    [progress, total]
  );

  useEffect(() => {
    setIndex(0);
  }, [total]);

  useEffect(() => {
    if (reduce || paused || total < 2) return undefined;
    const controls = animate(progress, 1, {
      duration: interval / 1000,
      ease: 'linear',
      onComplete: () => go(),
    });
    return () => controls.stop();
  }, [index, paused, reduce, interval, progress, go, total]);

  return (
    <div className="hero-bg-slider" aria-hidden>
      <AnimatePresence mode="sync">
        {slideList.map((slide, i) =>
          i === index ? (
            <motion.div
              key={`${slide.id}-${slide.image}`}
              className="hero-bg-slide"
              style={{ backgroundImage: `url(${slide.image})` }}
              initial={{ opacity: 0, scale: 1.08 }}
              animate={{ opacity: 1, scale: 1.18 }}
              exit={{ opacity: 0 }}
              transition={{
                opacity: { duration: 1.1, ease: [0.22, 1, 0.36, 1] },
                scale: { duration: interval / 1000, ease: 'linear' },
              }}
            />
          ) : null
        )}
      </AnimatePresence>
      <div className="hero-bg-veil" />
      <div className="hero-slider-chrome">
        <div className="hero-slide-dots">
          {slideList.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`hero-dot ${i === index ? 'is-active' : ''}`}
              aria-label={`Slide ${i + 1}`}
              onClick={() => go(i)}
            >
              {i === index && (
                <motion.span
                  className="hero-dot-fill"
                  style={{ scaleX: progress }}
                />
              )}
            </button>
          ))}
          <button
            type="button"
            className="hero-pause"
            aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? <Play size={12} /> : <Pause size={12} />}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Auto-advancing horizontal carousel with drag */
export function SnapCarousel({
  children,
  title,
  eyebrow,
  subtitle,
  action,
  autoPlay = true,
  interval = 4200,
}) {
  const reduce = useReducedMotion();
  const scrollerRef = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  const [paused, setPaused] = useState(false);
  const [onScreen, setOnScreen] = useState(false);

  // Auto-slide only while the carousel is visible, so it never moves the page.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  const scrollByCard = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector('.snap-slide');
    const step = card ? card.offsetWidth + 20 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;
    updateArrows();
    el.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      window.removeEventListener('resize', updateArrows);
    };
  }, [updateArrows, children]);

  useEffect(() => {
    if (reduce || !autoPlay || paused || !onScreen) return undefined;
    const id = setInterval(() => {
      const el = scrollerRef.current;
      if (!el) return;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 12) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        scrollByCard(1);
      }
    }, interval);
    return () => clearInterval(id);
  }, [autoPlay, paused, onScreen, reduce, interval, children]);

  return (
    <div
      className="snap-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="section-head snap-head">
        <div>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          {eyebrow && <span className="gold-line" />}
          {title && <h2>{title}</h2>}
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="snap-controls">
          {action}
          <button
            type="button"
            className="snap-btn"
            disabled={!canPrev}
            aria-label="Previous"
            onClick={() => scrollByCard(-1)}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="snap-btn"
            disabled={!canNext}
            aria-label="Next"
            onClick={() => scrollByCard(1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div className="snap-scroller" ref={scrollerRef}>
        {children}
      </div>
    </div>
  );
}

const revealSlide = (i) => ({
  initial: { opacity: 0, y: 56, scale: 0.94, rotateX: 10, filter: 'blur(6px)' },
  whileInView: { opacity: 1, y: 0, scale: 1, rotateX: 0, filter: 'blur(0px)' },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.75, delay: Math.min(i, 5) * 0.11, ease: [0.22, 1, 0.36, 1] },
  style: { transformPerspective: 1000 },
});

export function PropertySlider({ properties = [], ...head }) {
  const items = properties.length ? properties : [];
  if (!items.length) return null;

  // A single listing: one large spotlight card fills the row; 2+ listings use the slider
  if (items.length === 1) {
    return (
      <div className="snap-carousel">
        <div className="section-head snap-head">
          <div>
            {head.eyebrow && <span className="eyebrow">{head.eyebrow}</span>}
            {head.eyebrow && <span className="gold-line" />}
            {head.title && <h2>{head.title}</h2>}
            {head.subtitle && <p>{head.subtitle}</p>}
          </div>
          {head.action && <div className="snap-controls">{head.action}</div>}
        </div>
        <div className={`spotlight-grid is-${items.length}`}>
          {items.map((p, i) => (
            <motion.div key={p.id} className="spotlight-item" {...revealSlide(i)}>
              <PropertyCard property={p} variant="spotlight" />
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <SnapCarousel {...head}>
      {items.map((p, i) => (
        <motion.div key={p.id} className="snap-slide snap-slide--reveal" {...revealSlide(i)}>
          <PropertyCard property={p} />
        </motion.div>
      ))}
    </SnapCarousel>
  );
}

/** Animated testimonial quote slider */
export function QuoteSlider({ items = [] }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const list = items.length ? items : [];

  useEffect(() => {
    if (reduce || list.length < 2) return undefined;
    const id = setInterval(() => setIndex((i) => (i + 1) % list.length), 5000);
    return () => clearInterval(id);
  }, [list.length, reduce]);

  if (!list.length) return null;
  const t = list[index];

  return (
    <div className="quote-slider">
      <AnimatePresence mode="wait">
        <motion.blockquote
          key={t.id || index}
          className="quote-slide"
          initial={{ opacity: 0, x: 60, filter: 'blur(8px)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, x: -40, filter: 'blur(6px)' }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="quote-mark">“</div>
          <div className="testi-stars">{'★'.repeat(t.rating || 5)}</div>
          <p>{t.message}</p>
          <footer className="testi-user">
            {t.avatar_url ? (
              <img src={t.avatar_url} alt="" />
            ) : (
              <span className="testi-initials" aria-hidden>
                {String(t.name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
              </span>
            )}
            <div>
              <strong>{t.name}</strong>
              <span>{t.role}</span>
            </div>
          </footer>
        </motion.blockquote>
      </AnimatePresence>
      <div className="quote-nav">
        {list.map((item, i) => (
          <button
            key={item.id || i}
            type="button"
            className={`quote-dot ${i === index ? 'is-active' : ''}`}
            aria-label={`Review ${i + 1}`}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </div>
  );
}

/** Location cards as animated horizontal slider */
export function LocationSlider({ locations = [] }) {
  const imgs = [
    '1600585154340-be6161a56a0c',
    '1600047509807-ba8f99d2cdde',
    '1600607687939-ce8a6c25118c',
    '1600566753190-17f0baa2a6c3',
    '1600573472550-8090b5e0745e',
    '1600585154526-990dced4db0d',
    '1512917774080-9991f1c4c750',
  ];
  if (!locations.length) return null;
  return (
    <SnapCarousel
      eyebrow="Neighbourhoods"
      title="Popular Locations"
      subtitle="Swipe through India’s most sought-after pockets."
      interval={3800}
    >
      {locations.map((loc, i) => (
        <Link
          key={loc.id}
          to={`/properties?location=${loc.slug}`}
          className="snap-slide loc-slide"
        >
          <motion.div
            className="loc-card loc-card-3d"
            whileHover={{ y: -8, scale: 1.02 }}
            style={{
              backgroundImage: `url(https://images.unsplash.com/photo-${imgs[i % imgs.length]}?auto=format&fit=crop&w=900&q=80)`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="inner">
              <strong>{loc.name}</strong>
              <div style={{ opacity: 0.85 }}>{loc.city}</div>
              <span className="loc-count">{loc.property_count_cache || 20}+ Properties</span>
            </div>
          </motion.div>
        </Link>
      ))}
    </SnapCarousel>
  );
}

/** Single infinite scrolling location ticker */
export function DualMarquee({ items = [] }) {
  const row = [...items, ...items];
  return (
    <div className="marquee-wrap" aria-hidden>
      <div className="marquee-track">
        {row.map((item, i) => (
          <span key={`${item}-${i}`}>{item}</span>
        ))}
      </div>
    </div>
  );
}

/** Service cards as cinematic horizontal slider */
export function ServiceSlider({ services = [] }) {
  return (
    <SnapCarousel
      eyebrow="What we do"
      title="Your path to the perfect property"
      subtitle="Whether buying, selling, or renting — every step feels effortless."
      interval={4500}
    >
      {services.map((s) => {
        const Icon = s.icon;
        return (
          <Link
            key={s.title}
            to={s.to}
            className="snap-slide service-slide"
            style={{
              backgroundImage: `url(${s.img})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <motion.div
              className="service-slide-inner"
              whileHover={{ y: -4 }}
            >
              <Icon size={28} />
              <h3>{s.title}</h3>
              <p>{s.text}</p>
              <span className="btn btn-ghost" style={{ padding: '0.55rem 1rem' }}>
                Learn more
              </span>
            </motion.div>
          </Link>
        );
      })}
    </SnapCarousel>
  );
}
