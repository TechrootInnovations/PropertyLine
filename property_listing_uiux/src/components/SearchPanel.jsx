import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Search, Sparkles } from 'lucide-react';

const ease = [0.22, 1, 0.36, 1];

const fieldVariants = {
  hidden: { opacity: 0, y: 18 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.35 + i * 0.08, duration: 0.5, ease },
  }),
};

export default function SearchPanel({ types = [], locations = [], initial = {} }) {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [purpose, setPurpose] = useState(initial.purpose || 'sale');
  const [type, setType] = useState(initial.type || '');
  const [location, setLocation] = useState(initial.location || '');
  const [q, setQ] = useState(initial.q || '');
  const [focused, setFocused] = useState(false);
  const [ready, setReady] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (purpose) params.set('purpose', purpose);
    if (type) params.set('type', type);
    if (location) params.set('location', location);
    if (q) params.set('q', q);
    navigate(`/properties?${params.toString()}`);
  };

  return (
    <motion.div
      className={`search-float-wrap ${ready && !reduce ? 'is-floating' : ''}`}
      initial={reduce ? false : { opacity: 0, y: 64, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.75, delay: 0.15, ease }}
      onAnimationComplete={() => setReady(true)}
    >
      <motion.form
        className={`search-panel ${focused ? 'is-focused' : ''}`}
        onSubmit={submit}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
        }}
        whileHover={reduce ? undefined : { y: -4 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      >
        <div className="search-glow" aria-hidden />

        <motion.div
          className="search-tabs"
          initial={reduce ? false : { opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.32, duration: 0.45 }}
        >
          {['rent', 'sale'].map((key) => (
            <button
              key={key}
              type="button"
              className={purpose === key ? 'active' : ''}
              onClick={() => setPurpose(key)}
            >
              <span className="tab-label">{key === 'rent' ? 'For Rent' : 'For Sale'}</span>
              {purpose === key && (
                <motion.span
                  className="tab-ink"
                  layoutId="purposeTab"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
            </button>
          ))}
        </motion.div>

        <div className="search-grid">
          <motion.div className="field" custom={0} variants={fieldVariants} initial="hidden" animate="show">
            <label>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">All</option>
              {types.map((t) => (
                <option key={t.id} value={t.slug}>{t.name}</option>
              ))}
            </select>
          </motion.div>
          <motion.div className="field" custom={1} variants={fieldVariants} initial="hidden" animate="show">
            <label>Location</label>
            <select value={location} onChange={(e) => setLocation(e.target.value)}>
              <option value="">All locations</option>
              {locations.map((l) => (
                <option key={l.id} value={l.slug}>{l.name}</option>
              ))}
            </select>
          </motion.div>
          <motion.div className="field" custom={2} variants={fieldVariants} initial="hidden" animate="show">
            <label>Keyword</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Villa, Apartment, Plot…"
            />
          </motion.div>
          <motion.div
            className="field search-submit"
            custom={3}
            variants={fieldVariants}
            initial="hidden"
            animate="show"
          >
            <span className="sr-only">Search</span>
            <motion.button
              className="btn btn-primary search-btn"
              type="submit"
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            >
              <Search size={16} />
              Search
              <Sparkles size={14} className="search-spark" />
            </motion.button>
          </motion.div>
        </div>
      </motion.form>
    </motion.div>
  );
}
