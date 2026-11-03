import { useEffect, useState } from 'react';
import { Plus, Quote, Star, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import {
  Button, Card, DataTable, EmptyState, Field, IconAction, PageHeader, useToast,
} from '../ui';

const blank = { name: '', role: '', rating: 5, message: '', sort_order: 0 };

function Stars({ value }) {
  return (
    <span className="adm-stars" aria-label={`${value} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={14} className={i < Number(value) ? 'is-on' : ''} />
      ))}
    </span>
  );
}

export default function Reviews() {
  const notify = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  const reload = () => {
    setLoading(true);
    api.adminTestimonials()
      .then((r) => setItems(r.data || []))
      .catch((err) => notify(err.message, 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { reload(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.adminCreateTestimonial(form);
      setForm(blank);
      notify('Review added');
      reload();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!confirm('Delete this review?')) return;
    await api.adminDeleteTestimonial(row.id);
    notify('Review deleted');
    reload();
  };

  return (
    <div className="adm-page">
      <PageHeader title="Reviews" subtitle="Customer quotes shown on the home page." />

      <Card title="Add a review" subtitle="Short, genuine quotes work best.">
        <form className="adm-form-grid" onSubmit={submit}>
          <Field label="Customer name" required>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Who they are (optional)">
            <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Home Buyer, Kharghar" />
          </Field>
          <Field label="Rating">
            <select value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}>
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}
            </select>
          </Field>
          <Field label="Display order">
            <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
          </Field>
          <Field label="What they said" required full>
            <textarea required rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          </Field>
          <div className="adm-form-actions is-full">
            <Button type="submit" icon={Plus} loading={saving}>Add review</Button>
          </div>
        </form>
      </Card>

      <Card title="All reviews" subtitle={`${items.length} reviews`} flush>
        <DataTable
          loading={loading}
          rows={items}
          empty={<EmptyState icon={Quote} title="No reviews yet" />}
          columns={[
            { key: 'sr', header: 'Sr.', width: 56, render: (_r, i) => <span className="adm-muted">{i + 1}</span> },
            {
              key: 'name',
              header: 'Customer',
              render: (r) => (
                <div className="adm-cell-stack">
                  <strong>{r.name}</strong>
                  <small>{r.role || '—'}</small>
                </div>
              ),
            },
            { key: 'rating', header: 'Rating', render: (r) => <Stars value={r.rating} /> },
            { key: 'message', header: 'Message', render: (r) => <span className="adm-clamp">{r.message}</span> },
            {
              key: 'actions',
              header: 'Actions',
              align: 'right',
              render: (r) => <IconAction icon={Trash2} label="Delete" tone="red" onClick={() => remove(r)} />,
            },
          ]}
        />
      </Card>
    </div>
  );
}
