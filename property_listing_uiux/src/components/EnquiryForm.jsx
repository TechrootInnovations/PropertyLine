import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';

export default function EnquiryForm({ property, onDone }) {
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    email: '',
    preferred_contact: 'whatsapp',
    message: property ? `Interested in ${property.title}` : '',
  });
  const [status, setStatus] = useState({ loading: false, ok: null, error: '' });
  const [focused, setFocused] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, ok: null, error: '' });
    try {
      await api.submitEnquiry({
        ...form,
        property_id: property?.id,
        property_slug: property?.slug,
        enquiry_type: property ? 'property' : 'contact',
      });
      setStatus({ loading: false, ok: true, error: '' });
      setForm({ name: '', mobile: '', email: '', preferred_contact: 'whatsapp', message: '' });
      onDone?.();
    } catch (err) {
      setStatus({ loading: false, ok: false, error: err.message || 'Failed to submit' });
    }
  };

  const fields = [
    { key: 'name', label: 'Name *', required: true, placeholder: 'Your name' },
    { key: 'mobile', label: 'Mobile *', required: true, placeholder: '10-digit mobile', maxLength: 10 },
    { key: 'email', label: 'Email', type: 'email', placeholder: 'Optional' },
  ];

  return (
    <motion.form
      onSubmit={submit}
      className="side-card enquiry-form"
      id="enquire"
      style={{ position: 'static', boxShadow: 'none' }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <h3 style={{ marginTop: 0, fontFamily: 'var(--pv-font-display)', fontWeight: 400 }}>
        {property ? 'Interested in this property?' : 'Send an enquiry'}
      </h3>
      {property && (
        <p style={{ color: 'var(--pv-muted)', marginTop: 0 }}>
          {property.property_code} · {property.title}
        </p>
      )}
      {fields.map((f, i) => (
        <motion.div
          key={f.key}
          className={`field ${focused === f.key ? 'is-focused' : ''}`}
          style={{ marginBottom: '0.75rem' }}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.08 * i, duration: 0.4 }}
        >
          <label>{f.label}</label>
          <input
            required={f.required}
            type={f.type || 'text'}
            value={form[f.key]}
            onChange={set(f.key)}
            placeholder={f.placeholder}
            maxLength={f.maxLength}
            onFocus={() => setFocused(f.key)}
            onBlur={() => setFocused('')}
          />
        </motion.div>
      ))}
      <motion.div
        className="field"
        style={{ marginBottom: '0.75rem' }}
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.28, duration: 0.4 }}
      >
        <label>Preferred contact</label>
        <select value={form.preferred_contact} onChange={set('preferred_contact')}>
          <option value="whatsapp">WhatsApp</option>
          <option value="call">Call</option>
          <option value="email">Email</option>
          <option value="any">Any</option>
        </select>
      </motion.div>
      <motion.div
        className="field"
        style={{ marginBottom: '0.85rem' }}
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.34, duration: 0.4 }}
      >
        <label>Message</label>
        <textarea rows={3} value={form.message} onChange={set('message')} />
      </motion.div>
      <motion.button
        className={`btn btn-primary${status.loading ? ' is-loading' : ''}`}
        style={{ width: '100%' }}
        disabled={status.loading}
        aria-busy={status.loading}
        whileHover={status.loading ? undefined : { scale: 1.02, y: -2 }}
        whileTap={status.loading ? undefined : { scale: 0.97 }}
      >
        {status.loading && <span className="btn-spinner" aria-hidden="true" />}
        <span>{status.loading ? 'Sending…' : 'Send Enquiry'}</span>
      </motion.button>
      <AnimatePresence>
        {status.ok && (
          <motion.p
            style={{ color: 'var(--pv-primary)' }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            Thanks! We will contact you shortly.
          </motion.p>
        )}
        {status.error && (
          <motion.p
            style={{ color: '#b42318' }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {status.error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.form>
  );
}
