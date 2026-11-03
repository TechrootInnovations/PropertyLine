import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, CalendarDays, Check, Clock, Linkedin, Mail, Phone, Target, Telescope, UserRound,
} from 'lucide-react';
import { useConfig } from '../lib/config';
import { useContent } from '../lib/contentDefaults';
import { FadeUp, PageHero, Stagger, staggerItem } from '../components/Motion';
import SEOHead, { buildOrganizationJsonLd } from '../components/SEOHead';
import RichText from '../components/RichText';
import './ContentPages.css';

function brandName(settings) {
  return settings.brand?.site_name || 'Terranexus Properties';
}

function withBrand(text, settings) {
  return String(text || '').replace(/Terranexus Properties/g, brandName(settings));
}

function CtaBand({ title = 'Ready to begin?', text = 'Talk to a consultant today.', to = '/contact', label = 'Contact us' }) {
  return (
    <FadeUp>
      <div className="cta-band cta-band-live content-cta">
        <div>
          <h2>{title}</h2>
          <p style={{ margin: '0.7rem 0 0', opacity: 0.9 }}>{text}</p>
        </div>
        <Link to={to} className="btn btn-accent">{label}</Link>
      </div>
    </FadeUp>
  );
}

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function readingTime(text = '') {
  return Math.max(1, Math.round(String(text).split(/\s+/).filter(Boolean).length / 200));
}

/* ——— About ——— */

export function AboutPage() {
  const { settings } = useConfig();
  const { data } = useContent('about_page');
  const name = brandName(settings);
  const team = useContent('team_page').data;
  const members = (team.members || []).slice(0, 4);

  return (
    <div className="container public-page content-page">
      <SEOHead
        title={`About ${name} | Real Estate Experts`}
        description={`Learn about ${name} — verified property listings, transparent pricing, and personal guidance for buyers and renters across India.`}
        keywords={settings.seo?.default_keywords}
        path="/about"
        image={settings.seo?.og_image || data.banner_image}
        jsonLd={buildOrganizationJsonLd(settings)}
      />
      <PageHero eyebrow="Our story" crumb="About" title={withBrand(data.hero_title, settings)} subtitle={withBrand(data.hero_subtitle, settings)} image={data.banner_image} />

      <section className="about-story">
        <motion.img
          className="about-story__media about-story__img"
          src={data.story_image}
          alt={settings.brand?.site_name || 'About us'}
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8 }}
        />
        <FadeUp className="about-story__copy">
          <span className="eyebrow">Who we are</span>
          <h2>{withBrand(data.story_title, settings)}</h2>
          <RichText text={withBrand(data.story_text, settings)} />
        </FadeUp>
      </section>

      {!!data.stats?.length && (
        <Stagger className="about-stats" stagger={0.08}>
          {data.stats.map((s) => (
            <motion.div key={s.label} className="about-stat" variants={staggerItem}>
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </motion.div>
          ))}
        </Stagger>
      )}

      {(data.mission || data.vision) && (
        <div className="about-mv">
          {data.mission && (
            <FadeUp className="about-mv__card">
              <span className="about-mv__icon"><Target size={22} /></span>
              <h3>Our mission</h3>
              <p>{withBrand(data.mission, settings)}</p>
            </FadeUp>
          )}
          {data.vision && (
            <FadeUp className="about-mv__card is-dark" delay={0.1}>
              <span className="about-mv__icon"><Telescope size={22} /></span>
              <h3>Our vision</h3>
              <p>{withBrand(data.vision, settings)}</p>
            </FadeUp>
          )}
        </div>
      )}

      {!!data.points?.length && (
        <>
          <FadeUp className="section-head content-head">
            <div>
              <span className="eyebrow">What sets us apart</span>
              <span className="gold-line" />
              <h2>Why clients choose us</h2>
            </div>
          </FadeUp>
          <Stagger className="about-grid" delay={0.1}>
            {data.points.map((item) => (
              <motion.article key={item.title} className="about-card" variants={staggerItem} whileHover={{ y: -8 }}>
                {item.image && <div className="about-card-media" style={{ backgroundImage: `url(${item.image})` }} />}
                <div className="about-card-body">
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </motion.article>
            ))}
          </Stagger>
        </>
      )}

      {members.length > 0 && (
        <>
          <FadeUp className="section-head content-head">
            <div>
              <span className="eyebrow">People</span>
              <span className="gold-line" />
              <h2>Meet our team</h2>
            </div>
            <Link to="/team" className="btn btn-ghost">Full team <ArrowRight size={16} /></Link>
          </FadeUp>
          <TeamGrid members={members} />
        </>
      )}

      <CtaBand />
    </div>
  );
}

/* ——— Services ——— */

export function ServicesPage() {
  const { settings } = useConfig();
  const { data } = useContent('services_page');
  const name = brandName(settings);
  return (
    <div className="container public-page content-page">
      <SEOHead
        title={`Our Services | ${name}`}
        description={data.intro || `Real estate services by ${name}: buying, selling, renting, land and commercial spaces.`}
        path="/services"
        image={data.banner_image}
      />
      <PageHero eyebrow="What we do" crumb="Services" title="Our Services" subtitle={data.intro} image={data.banner_image} />
      <Stagger className="services-grid" stagger={0.1}>
        {(data.items || []).map((s, i) => (
          <motion.article key={s.title + i} className="service-tile" variants={staggerItem} whileHover={{ y: -10 }}>
            <div className="service-tile__media" style={{ backgroundImage: s.image ? `url(${s.image})` : undefined }}>
              <span className="service-tile__num">{String(i + 1).padStart(2, '0')}</span>
            </div>
            <div className="service-tile__body">
              <h3>{s.title}</h3>
              <p>{s.text}</p>
              {!!s.points?.length && (
                <ul>
                  {s.points.filter(Boolean).map((p) => (
                    <li key={p}><span><Check size={12} strokeWidth={3} /></span>{p}</li>
                  ))}
                </ul>
              )}
              <Link to="/contact" className="service-tile__link">Enquire about this <ArrowRight size={15} /></Link>
            </div>
          </motion.article>
        ))}
      </Stagger>
      <CtaBand title="Not sure where to start?" text="Tell us what you need — we will guide you to the right service." />
    </div>
  );
}

/* ——— Team ——— */

function TeamGrid({ members }) {
  return (
    <Stagger className="team-grid" stagger={0.08}>
      {members.map((m, i) => (
        <motion.article key={(m.name || '') + i} className="team-card" variants={staggerItem} whileHover={{ y: -8 }}>
          <div className="team-card__photo">
            {m.photo ? <img src={m.photo} alt={m.name} loading="lazy" /> : (
              <span className="team-card__initials">
                {String(m.name || '?').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
              </span>
            )}
            <div className="team-card__social">
              {m.phone && <a href={`tel:${String(m.phone).replace(/\s/g, '')}`} aria-label="Call"><Phone size={15} /></a>}
              {m.email && <a href={`mailto:${m.email}`} aria-label="Email"><Mail size={15} /></a>}
              {m.linkedin && <a href={m.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn"><Linkedin size={15} /></a>}
            </div>
          </div>
          <div className="team-card__body">
            <h3>{m.name}</h3>
            {m.role && <span className="team-card__role">{m.role}</span>}
            {m.bio && <p>{m.bio}</p>}
          </div>
        </motion.article>
      ))}
    </Stagger>
  );
}

export function TeamPage() {
  const { settings } = useConfig();
  const { data, loading } = useContent('team_page');
  const name = brandName(settings);
  const members = data.members || [];
  return (
    <div className="container public-page content-page">
      <SEOHead title={`Our Team | ${name}`} description={data.intro || `Meet the property consultants at ${name}.`} path="/team" image={data.banner_image} />
      <PageHero eyebrow="People" crumb="Our Team" title="Our Team" subtitle={data.intro} image={data.banner_image} />
      {members.length ? <TeamGrid members={members} /> : !loading && (
        <div className="content-empty">
          <UserRound size={28} />
          <h3>Our team profiles are coming soon</h3>
          <p>Meanwhile, our consultants are a call or WhatsApp away.</p>
          <Link to="/contact" className="btn btn-primary">Contact us</Link>
        </div>
      )}
      <CtaBand title="Want to work with us?" text="Speak to a consultant about buying, selling or renting." />
    </div>
  );
}

/* ——— Blog ——— */

function usePosts() {
  const { data, loading } = useContent('blog_posts');
  const posts = (Array.isArray(data) ? data : [])
    .filter((p) => p && p.title && p.published !== false)
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  return { posts, loading };
}

export function BlogPage() {
  const { settings } = useConfig();
  const { posts, loading } = usePosts();
  const name = brandName(settings);
  const [lead, ...rest] = posts;
  return (
    <div className="container public-page content-page">
      <SEOHead title={`Blog | ${name}`} description={`Property tips, market insights and buying guides from ${name}.`} path="/blog" />
      <PageHero
        eyebrow="Insights"
        crumb="Blog"
        title="Blog & Insights"
        subtitle="Market updates, buying guides and practical tips for property owners and buyers."
        image="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=2000&q=75"
      />
      {loading ? <div className="content-empty"><p>Loading articles…</p></div> : posts.length === 0 ? (
        <div className="content-empty">
          <CalendarDays size={28} />
          <h3>Articles are on the way</h3>
          <p>We are preparing guides on buying, selling and investing in property. Check back soon.</p>
          <Link to="/properties" className="btn btn-primary">Browse properties</Link>
        </div>
      ) : (
        <>
          <FadeUp>
            <Link to={`/blog/${lead.slug}`} className="blog-lead">
              <span className="blog-lead__media" style={{ backgroundImage: lead.cover ? `url(${lead.cover})` : undefined }} />
              <span className="blog-lead__body">
                <span className="blog-meta">
                  {lead.category && <em>{lead.category}</em>}
                  {formatDate(lead.date)} · {readingTime(lead.content)} min read
                </span>
                <strong>{lead.title}</strong>
                {lead.excerpt && <span className="blog-lead__excerpt">{lead.excerpt}</span>}
                <span className="blog-read">Read article <ArrowRight size={16} /></span>
              </span>
            </Link>
          </FadeUp>
          {rest.length > 0 && (
            <Stagger className="blog-grid" stagger={0.08}>
              {rest.map((p) => (
                <motion.div key={p.slug} variants={staggerItem} whileHover={{ y: -8 }}>
                  <Link to={`/blog/${p.slug}`} className="blog-card">
                    <span className="blog-card__media" style={{ backgroundImage: p.cover ? `url(${p.cover})` : undefined }} />
                    <span className="blog-card__body">
                      <span className="blog-meta">
                        {p.category && <em>{p.category}</em>}
                        {formatDate(p.date)}
                      </span>
                      <strong>{p.title}</strong>
                      {p.excerpt && <span className="blog-card__excerpt">{p.excerpt}</span>}
                      <span className="blog-read">Read more <ArrowRight size={15} /></span>
                    </span>
                  </Link>
                </motion.div>
              ))}
            </Stagger>
          )}
        </>
      )}
    </div>
  );
}

export function BlogPostPage() {
  const { slug } = useParams();
  const { settings } = useConfig();
  const { posts, loading } = usePosts();
  const post = posts.find((p) => p.slug === slug);
  const name = brandName(settings);
  const more = posts.filter((p) => p.slug !== slug).slice(0, 3);

  if (loading) return <div className="container public-page content-page"><div className="content-empty" style={{ marginTop: '8rem' }}><p>Loading…</p></div></div>;
  if (!post) {
    return (
      <div className="container public-page content-page">
        <SEOHead title="Article not found" description="This article is unavailable." path={`/blog/${slug}`} noindex />
        <PageHero eyebrow="Blog" crumb="Blog" title="Article not found" subtitle="It may have been moved or unpublished." />
        <Link to="/blog" className="btn btn-primary">All articles</Link>
      </div>
    );
  }
  return (
    <div className="container public-page content-page">
      <SEOHead title={`${post.title} | ${name}`} description={post.excerpt || post.title} path={`/blog/${post.slug}`} image={post.cover} />
      <PageHero eyebrow={post.category || 'Blog'} crumb={post.title} title={post.title} subtitle={post.excerpt} image={post.cover || undefined}>
        <div className="blog-hero-meta">
          {post.author && <span><UserRound size={14} /> {post.author}</span>}
          {post.date && <span><CalendarDays size={14} /> {formatDate(post.date)}</span>}
          <span><Clock size={14} /> {readingTime(post.content)} min read</span>
        </div>
      </PageHero>
      <article className="blog-article">
        <FadeUp>
          <RichText text={post.content} className="blog-article__body" />
        </FadeUp>
        {!!post.tags?.length && (
          <div className="blog-tags">{post.tags.map((t) => <span key={t}>#{t}</span>)}</div>
        )}
      </article>
      {more.length > 0 && (
        <>
          <FadeUp className="section-head content-head">
            <div>
              <span className="eyebrow">Keep reading</span>
              <span className="gold-line" />
              <h2>More articles</h2>
            </div>
            <Link to="/blog" className="btn btn-ghost">All articles <ArrowRight size={16} /></Link>
          </FadeUp>
          <Stagger className="blog-grid" stagger={0.08}>
            {more.map((p) => (
              <motion.div key={p.slug} variants={staggerItem} whileHover={{ y: -8 }}>
                <Link to={`/blog/${p.slug}`} className="blog-card">
                  <span className="blog-card__media" style={{ backgroundImage: p.cover ? `url(${p.cover})` : undefined }} />
                  <span className="blog-card__body">
                    <span className="blog-meta">{formatDate(p.date)}</span>
                    <strong>{p.title}</strong>
                    <span className="blog-read">Read more <ArrowRight size={15} /></span>
                  </span>
                </Link>
              </motion.div>
            ))}
          </Stagger>
        </>
      )}
    </div>
  );
}

/* ——— Privacy & Terms ——— */

export function LegalPage({ kind }) {
  const { settings } = useConfig();
  const key = kind === 'terms' ? 'terms_page' : 'privacy_policy';
  const { data } = useContent(key);
  const title = kind === 'terms' ? 'Terms & Conditions' : 'Privacy Policy';
  const path = kind === 'terms' ? '/terms-and-conditions' : '/privacy-policy';
  return (
    <div className="container public-page content-page">
      <SEOHead title={`${title} | ${brandName(settings)}`} description={`${title} of ${brandName(settings)}.`} path={path} />
      <PageHero
        eyebrow="Legal"
        crumb={title}
        title={title}
        subtitle={data.updated ? `Last updated ${formatDate(data.updated)}` : undefined}
        image="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=2000&q=75"
      />
      <article className="legal-article">
        <FadeUp>
          <RichText text={withBrand(data.content, settings)} className="blog-article__body" />
        </FadeUp>
        <div className="legal-links">
          <Link to={kind === 'terms' ? '/privacy-policy' : '/terms-and-conditions'}>
            {kind === 'terms' ? 'Read our Privacy Policy' : 'Read our Terms & Conditions'} <ArrowRight size={15} />
          </Link>
          <Link to="/contact">Questions? Contact us <ArrowRight size={15} /></Link>
        </div>
      </article>
    </div>
  );
}
