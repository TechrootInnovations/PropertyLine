import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Building2, CalendarClock, CheckCircle2, CircleDashed, FileText, Inbox, MessageSquareText,
  Plus, Sparkles, Star, TrendingUp,
} from 'lucide-react';
import { api, formatPrice } from '../../lib/api';
import {
  Badge, Button, Card, DataTable, EmptyState, OptionBadge, PageHeader, StatCard,
} from '../ui';
import { ENQUIRY_STATUSES, PROPERTY_STATUS_TONES, humanize } from '../constants';
import { dueState, formatDate, inqCode } from '../format';

const TYPE_TONES = ['teal', 'blue', 'amber', 'purple', 'green', 'rose', 'indigo', 'orange'];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.adminDashboard().then((res) => setStats(res.data)).catch((err) => setError(err.message));
  }, []);

  if (error) return <EmptyState title="Could not load dashboard" text={error} />;

  const p = stats?.properties || {};
  const e = stats?.enquiries || {};
  const byType = stats?.byType || [];
  const loading = !stats;

  return (
    <div className="adm-page">
      <PageHeader
        eyebrow={new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        title={`${greeting()} 👋`}
        subtitle="Here is what is happening with your listings and inquiries today."
        actions={(
          <>
            <Button variant="ghost" icon={MessageSquareText} to="/admin/enquiries">Inquiries</Button>
            <Button icon={Plus} to="/admin/properties/new">Add Property</Button>
          </>
        )}
      />

      <div className="adm-stat-grid">
        <StatCard icon={Building2} tone="teal" label="Total Properties" value={loading ? '…' : p.total_properties} hint={`${p.active_properties || 0} live on website`} to="/admin/properties" />
        <StatCard icon={FileText} tone="gray" label="Draft Listings" value={loading ? '…' : p.draft_properties} hint="Not yet published" to="/admin/properties?status=draft" />
        <StatCard icon={Star} tone="amber" label="Featured" value={loading ? '…' : p.featured_properties} hint="Shown on home page" />
        <StatCard icon={TrendingUp} tone="purple" label="Sold / Rented" value={loading ? '…' : (p.sold_properties || 0) + (p.rented_properties || 0)} hint={`${p.sold_properties || 0} sold · ${p.rented_properties || 0} rented`} />
      </div>

      <Card
        title="Properties by type"
        subtitle="Live count for every property type — click a tile to see its listings."
        actions={<Link className="adm-link" to="/admin/masters">Manage types <ArrowRight size={14} /></Link>}
      >
        {loading ? (
          <div className="adm-type-grid">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="adm-type-tile is-skeleton"><span className="adm-shimmer" /></div>)}
          </div>
        ) : byType.length ? (
          <div className="adm-type-grid">
            {byType.map((t, i) => (
              <Link key={t.id} to={`/admin/properties?type_id=${t.id}`} className={`adm-type-tile tone-${TYPE_TONES[i % TYPE_TONES.length]}`}>
                <div className="adm-type-tile__top">
                  <span className="adm-type-tile__icon"><Building2 size={18} /></span>
                  <span className="adm-type-tile__cat">{t.category_name || 'Type'}</span>
                </div>
                <strong className="adm-type-tile__count">{t.total}</strong>
                <span className="adm-type-tile__name">{t.name}</span>
                <div className="adm-type-tile__meta">
                  <span>{t.published} live</span>
                  <span>{t.draft} draft</span>
                  {t.rent > 0 && <span>{t.rent} rent</span>}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="No property types yet" text="Add property types in Masters to see counts here." />
        )}
      </Card>

      <div className="adm-stat-grid">
        <StatCard icon={Inbox} tone="blue" label="Today's Inquiries" value={loading ? '…' : e.today_enquiries} hint={`${e.enquiries_last_7_days || 0} in last 7 days`} to="/admin/enquiries?tab=today" />
        <StatCard icon={CircleDashed} tone="amber" label="Pending" value={loading ? '…' : e.pending_enquiries} hint={`${e.new_enquiries || 0} new, not contacted`} to="/admin/enquiries?tab=pending" />
        <StatCard icon={CalendarClock} tone="rose" label="Follow-ups Due" value={loading ? '…' : e.followups_due} hint="Today or overdue" to="/admin/enquiries?tab=followup" />
        <StatCard icon={CheckCircle2} tone="green" label="Converted" value={loading ? '…' : e.converted_enquiries} hint={`${e.closed_enquiries || 0} closed · ${e.total_enquiries || 0} total`} to="/admin/enquiries?tab=converted" />
      </div>

      <div className="adm-grid-2">
        <Card
          title="Recent inquiries"
          actions={<Link className="adm-link" to="/admin/enquiries">View all <ArrowRight size={14} /></Link>}
          flush
        >
          <DataTable
            loading={loading}
            skeletonRows={5}
            rows={stats?.recentEnquiries || []}
            empty={<EmptyState title="No inquiries yet" />}
            columns={[
              { key: 'id', header: 'Inq ID', render: (r) => <Badge tone="green">{inqCode(r.id)}</Badge> },
              {
                key: 'name',
                header: 'Customer',
                render: (r) => (
                  <div className="adm-cell-stack">
                    <strong>{r.name}</strong>
                    <small>{r.mobile}</small>
                  </div>
                ),
              },
              { key: 'property_title', header: 'Property', render: (r) => <span className="adm-truncate">{r.property_title || 'General'}</span> },
              { key: 'status', header: 'Status', render: (r) => <OptionBadge list={ENQUIRY_STATUSES} value={r.status} /> },
              { key: 'created_at', header: 'Date', render: (r) => <span className="adm-muted">{formatDate(r.created_at)}</span> },
            ]}
          />
        </Card>

        <Card
          title="Upcoming follow-ups"
          actions={<Link className="adm-link" to="/admin/enquiries?tab=followup">Due list <ArrowRight size={14} /></Link>}
        >
          {loading ? <span className="adm-shimmer" /> : (stats.upcomingFollowUps || []).length ? (
            <ul className="adm-timeline-list">
              {stats.upcomingFollowUps.map((f) => {
                const due = dueState(f.follow_up_date);
                return (
                  <li key={f.id}>
                    <span className={`adm-dot tone-${due === 'overdue' ? 'red' : due === 'today' ? 'amber' : 'blue'}`} />
                    <div>
                      <strong>{f.name}</strong>
                      <small>{f.property_title || 'General inquiry'} · {f.mobile}</small>
                    </div>
                    <Badge tone={due === 'overdue' ? 'red' : due === 'today' ? 'amber' : 'blue'}>
                      {due === 'today' ? 'Today' : formatDate(f.follow_up_date)}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={Sparkles} title="All caught up" text="No follow-ups scheduled." />
          )}
        </Card>
      </div>

      <Card
        title="Recently added properties"
        actions={<Link className="adm-link" to="/admin/properties">All properties <ArrowRight size={14} /></Link>}
        flush
      >
        <DataTable
          loading={loading}
          skeletonRows={4}
          rows={stats?.recentProperties || []}
          columns={[
            {
              key: 'title',
              header: 'Property',
              render: (r) => (
                <div className="adm-prop-cell">
                  {r.main_image ? <img src={r.main_image} alt="" /> : <span className="adm-prop-cell__ph"><Building2 size={16} /></span>}
                  <Link to={`/admin/properties/${r.id}`}><strong>{r.title}</strong></Link>
                </div>
              ),
            },
            { key: 'purpose', header: 'Purpose', render: (r) => humanize(r.purpose) },
            { key: 'price', header: 'Price', render: (r) => <strong>{formatPrice(r)}</strong> },
            { key: 'status', header: 'Status', render: (r) => <Badge tone={PROPERTY_STATUS_TONES[r.status] || 'gray'}>{humanize(r.status)}</Badge> },
            { key: 'created_at', header: 'Added', render: (r) => <span className="adm-muted">{formatDate(r.created_at)}</span> },
          ]}
        />
      </Card>
    </div>
  );
}
