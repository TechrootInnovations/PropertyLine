import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

/** Full-bleed hero with parallax layers + floating 3D property frames */
export default function HeroScene3D() {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });
  const yOrb = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -80]);

  const frames = [
    {
      src: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=600&q=80',
      className: 'hero-frame f1',
      delay: 0.35,
    },
    {
      src: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=500&q=80',
      className: 'hero-frame f2',
      delay: 0.5,
    },
    {
      src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=480&q=80',
      className: 'hero-frame f3',
      delay: 0.65,
    },
  ];

  return (
    <div className="hero-scene3d" ref={ref} aria-hidden>
      <motion.div className="hero-orb orb-a" style={{ y: yOrb }} />
      <motion.div className="hero-orb orb-b" style={{ y: yOrb }} />
      <div className="hero-grid-fx" />
      {!reduce &&
        frames.map((f) => (
          <motion.div
            key={f.className}
            className={f.className}
            initial={{ opacity: 0, y: 40, rotateY: -18, rotateX: 8 }}
            animate={{
              opacity: 1,
              y: [0, -14, 0],
              rotateY: [-14, -6, -14],
              rotateX: [8, 3, 8],
              rotateZ: [-2, 2, -2],
            }}
            transition={{
              opacity: { delay: f.delay, duration: 0.7 },
              y: { delay: f.delay + 0.7, duration: 5.5, repeat: Infinity, ease: 'easeInOut' },
              rotateY: { delay: f.delay + 0.7, duration: 7, repeat: Infinity, ease: 'easeInOut' },
              rotateX: { delay: f.delay + 0.7, duration: 6, repeat: Infinity, ease: 'easeInOut' },
              rotateZ: { delay: f.delay + 0.7, duration: 8, repeat: Infinity, ease: 'easeInOut' },
            }}
            style={{ transformStyle: 'preserve-3d', transformPerspective: 900 }}
          >
            <img src={f.src} alt="" />
            <span className="frame-glow" />
          </motion.div>
        ))}
    </div>
  );
}
