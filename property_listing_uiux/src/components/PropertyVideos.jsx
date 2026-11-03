import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, MapPin, Play, X } from 'lucide-react';
import { api, formatPrice } from '../lib/api';
import { resolveVideo } from '../lib/media';
import { useConfig } from '../lib/config';
import { FadeUp, Stagger, staggerItem } from './Motion';

/** Home page section: published properties that have a video (hidden when there are none). */
export default function PropertyVideos() {
  const { settings } = useConfig();
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(null);
  const symbol = settings.features?.currency_symbol || '₹';

  useEffect(() => {
    api.getPropertyVideos().then((res) => {
      const list = (res.data || [])
        .map((p) => ({ ...p, video: resolveVideo(p.youtube_url, p.video_url) }))
        .filter((p) => p.video);
      setItems(list);
    });
  }, []);

  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setActive(null); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [active]);

  if (!items.length) return null;
  const [lead, ...rest] = items;

  const Card = ({ p, big = false }) => (
    <motion.button
      type="button"
      className={`video-card${big ? ' is-big' : ''}`}
      variants={staggerItem}
      whileHover={{ y: -8 }}
      onClick={() => setActive(p)}
    >
      <span className="video-card__thumb" style={{ backgroundImage: `url(${p.video.thumb || p.main_image || ''})` }}>
        <span className="video-card__play"><Play size={big ? 28 : 22} fill="currentColor" /></span>
        <span className="video-card__shade" />
        <span className="video-card__info">
          <strong>{p.title}</strong>
          <small>
            <MapPin size={12} /> {[p.locality, p.city].filter(Boolean).join(', ') || p.location_name}
            {(p.price || p.monthly_rent || p.price_display) && <em>{formatPrice(p, symbol)}</em>}
          </small>
        </span>
      </span>
    </motion.button>
  );

  return (
    <section className="section home-videos" style={{ paddingTop: 0 }}>
      <div className="container">
        <FadeUp className="section-head">
          <div>
            <span className="eyebrow">Video tours</span>
            <span className="gold-line" />
            <h2>Walk through before you visit</h2>
            <p>Watch property video tours from the comfort of your home.</p>
          </div>
          <Link to="/properties" className="btn btn-ghost">All properties <ArrowRight size={16} /></Link>
        </FadeUp>
        <Stagger className={`video-grid${rest.length ? '' : ' is-single'}`} stagger={0.1}>
          <Card p={lead} big />
          {rest.length > 0 && (
            <div className="video-grid__side">
              {rest.slice(0, 3).map((p) => <Card key={p.id} p={p} />)}
            </div>
          )}
        </Stagger>
      </div>

      {createPortal(
        <AnimatePresence>
          {active && (
            <motion.div className="video-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setActive(null)}>
              <motion.div
                className="video-modal__box"
                initial={{ scale: 0.92, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <button type="button" className="video-modal__close" onClick={() => setActive(null)} aria-label="Close video"><X size={20} /></button>
                <div className="video-modal__frame">
                  {active.video.kind === 'file' ? (
                    <video src={active.video.src} controls autoPlay playsInline />
                  ) : (
                    <iframe
                      src={`${active.video.src}${active.video.src.includes('?') ? '&' : '?'}autoplay=1`}
                      title={active.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  )}
                </div>
                <div className="video-modal__foot">
                  <strong>{active.title}</strong>
                  <Link to={`/property/${active.slug}`} className="btn btn-primary" onClick={() => setActive(null)}>
                    View property <ArrowRight size={16} />
                  </Link>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </section>
  );
}
