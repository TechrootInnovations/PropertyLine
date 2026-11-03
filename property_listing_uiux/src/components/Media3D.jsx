import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';

/**
 * Premium 3D media frame — mouse-tilt + layered depth on images.
 */
export default function Media3D({
  src,
  alt = '',
  className = '',
  children,
  aspect = '16/10',
}) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 160, damping: 18, mass: 0.4 });
  const sy = useSpring(my, { stiffness: 160, damping: 18, mass: 0.4 });
  const rotateX = useTransform(sy, [-0.5, 0.5], [12, -12]);
  const rotateY = useTransform(sx, [-0.5, 0.5], [-14, 14]);
  const imgX = useTransform(sx, [-0.5, 0.5], [-14, 14]);
  const imgY = useTransform(sy, [-0.5, 0.5], [-10, 10]);
  const glareX = useTransform(sx, [-0.5, 0.5], [20, 80]);
  const glareY = useTransform(sy, [-0.5, 0.5], [15, 85]);
  const glareBg = useTransform(
    [glareX, glareY],
    ([x, y]) => `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.42), transparent 55%)`
  );

  const onMove = (e) => {
    if (reduce || document.documentElement.dataset.pv3d === 'off') return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <motion.div
      ref={ref}
      className={`media3d ${className}`}
      style={{
        aspectRatio: aspect,
        rotateX: reduce ? 0 : rotateX,
        rotateY: reduce ? 0 : rotateY,
        transformPerspective: 1100,
        transformStyle: 'preserve-3d',
      }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div className="media3d-depth" aria-hidden />
      <motion.img
        src={src}
        alt={alt}
        loading="lazy"
        className="media3d-img"
        style={{ x: reduce ? 0 : imgX, y: reduce ? 0 : imgY, scale: 1.12 }}
      />
      <motion.div className="media3d-glare" aria-hidden style={{ background: glareBg }} />
      <div className="media3d-shine" aria-hidden />
      {children}
    </motion.div>
  );
}
