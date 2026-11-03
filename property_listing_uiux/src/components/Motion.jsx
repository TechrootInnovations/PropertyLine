import { Link } from 'react-router-dom';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1];

export function FadeUp({ children, delay = 0, className, y = 36, ...rest }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y, filter: 'blur(8px)' }}
      animate={reduce ? { opacity: 1, y: 0 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, amount: 0.08, margin: '0px 0px -80px 0px' }}
      transition={{ duration: 0.75, delay, ease }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function FadeIn({ children, delay = 0, className, ...rest }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, scale: 0.96 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.65, delay, ease }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function SlideIn({ children, from = 'left', delay = 0, className }) {
  const reduce = useReducedMotion();
  const x = from === 'left' ? -56 : from === 'right' ? 56 : 0;
  const y = from === 'up' ? 48 : from === 'down' ? -48 : 0;
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, x, y }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.8, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

export function ScaleReveal({ children, delay = 0, className }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, scale: 0.88, rotateX: 12 }}
      whileInView={{ opacity: 1, scale: 1, rotateX: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.8, delay, ease }}
      style={{ transformPerspective: 900 }}
    >
      {children}
    </motion.div>
  );
}

export function Stagger({ children, className, delay = 0, stagger = 0.1 }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.1 }}
      variants={{
        hidden: {},
        show: {
          transition: { staggerChildren: reduce ? 0 : stagger, delayChildren: delay },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export const staggerItem = {
  hidden: { opacity: 0, y: 36, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.65, ease },
  },
};

export const staggerItemSoft = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease },
  },
};

export function PageEnter({ children, className = 'page-enter' }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 28, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -18, filter: 'blur(6px)' }}
      transition={{ duration: 0.5, ease }}
    >
      {children}
    </motion.div>
  );
}

export function MagneticButton({ children, className, ...props }) {
  return (
    <motion.button
      className={className}
      whileHover={{ scale: 1.04, y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}

export function TextReveal({ text, className = '', as: Tag = 'span', delay = 0 }) {
  const reduce = useReducedMotion();
  const words = String(text || '').split(' ');
  return (
    <Tag className={className}>
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          style={{ display: 'inline-block', marginRight: '0.28em' }}
          initial={reduce ? false : { opacity: 0, y: 28, rotateX: 40 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.55, delay: delay + i * 0.06, ease }}
        >
          {word}
        </motion.span>
      ))}
    </Tag>
  );
}

const DEFAULT_BANNER =
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=2000&q=75';

/** Full-width photo banner used at the top of inner pages. */
export function PageHero({ eyebrow, title, subtitle, children, image = DEFAULT_BANNER, crumb }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="page-hero page-banner"
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease }}
    >
      <div className="page-banner__bg" style={{ backgroundImage: `url(${image})` }} aria-hidden />
      <div className="page-banner__veil" aria-hidden />
      <span className="page-banner__orb page-banner__orb--a" aria-hidden />
      <span className="page-banner__orb page-banner__orb--b" aria-hidden />
      <div className="page-banner__inner">
        <motion.nav
          className="page-banner__crumbs"
          aria-label="Breadcrumb"
          initial={reduce ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Link to="/">Home</Link>
          <span>/</span>
          <strong>{crumb || title}</strong>
        </motion.nav>
        {eyebrow && (
          <motion.span
            className="eyebrow"
            initial={reduce ? false : { opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            {eyebrow}
          </motion.span>
        )}
        <span className="page-banner__title-mask">
          <motion.h1
            initial={reduce ? false : { y: '105%' }}
            animate={{ y: 0 }}
            transition={{ duration: 0.9, delay: 0.2, ease }}
          >
            {title}
          </motion.h1>
        </span>
        {subtitle && (
          <motion.p
            className="page-hero-lead"
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.4, ease }}
          >
            {subtitle}
          </motion.p>
        )}
        {children}
      </div>
    </motion.div>
  );
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden>
      <div className="skeleton-media shimmer" />
      <div className="skeleton-line shimmer" style={{ width: '40%' }} />
      <div className="skeleton-line shimmer" style={{ width: '80%' }} />
      <div className="skeleton-line shimmer" style={{ width: '55%' }} />
    </div>
  );
}

export function AnimatedCount({ value }) {
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={value}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3 }}
      >
        {value}
      </motion.span>
    </AnimatePresence>
  );
}
