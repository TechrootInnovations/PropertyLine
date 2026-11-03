import { motion } from 'framer-motion';
import { MessageCircle, Phone } from 'lucide-react';
import { useConfig } from '../lib/config';

export default function FloatActions() {
  const { settings } = useConfig();
  const features = settings.features || {};
  const contact = settings.contact || {};
  if (!features.show_whatsapp_float && !features.show_call_float) return null;

  return (
    <motion.div
      className="float-actions"
      initial={{ opacity: 0, x: 60, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ delay: 1.1, type: 'spring', stiffness: 260, damping: 20 }}
    >
      {features.show_whatsapp_float && contact.whatsapp && (
        <motion.a
          className="float-btn wa"
          href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent('Hi, I am interested in your properties.')}`}
          target="_blank"
          rel="noreferrer"
          aria-label="WhatsApp"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          whileHover={{ scale: 1.14, rotate: -8 }}
          whileTap={{ scale: 0.92 }}
        >
          <MessageCircle size={22} />
        </motion.a>
      )}
      {features.show_call_float && contact.phone && (
        <motion.a
          className="float-btn call"
          href={`tel:${contact.phone.replace(/\s/g, '')}`}
          aria-label="Call"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
          whileHover={{ scale: 1.14, rotate: 8 }}
          whileTap={{ scale: 0.92 }}
        >
          <Phone size={20} />
        </motion.a>
      )}
    </motion.div>
  );
}
