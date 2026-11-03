import { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BellRing, Building2, CalendarClock, CalendarCheck, ChevronDown, CircleCheck, ExternalLink, KeyRound, LogOut, Mail,
  LockKeyhole, Menu, MessageSquareText, Paintbrush, PanelLeftClose, PanelLeftOpen, ShieldCheck, X,
} from 'lucide-react';
import { api } from '../lib/api';
import { useConfig } from '../lib/config';
import SaveButton from '../components/SaveButton';
import { ADMIN_NAV, findNavItem, isNavActive } from './nav';
import { ToastProvider } from './ui';
import { initials } from './format';
import ThemeCustomizer from './ThemeCustomizer';
import {
  AdminThemeContext, applyAdminTheme, cacheTheme, clearAdminTheme, readCachedTheme, themeFromRows,
} from './theme';
import './admin.css';
import './theme.css';
import './responsive.css';

const COLLAPSE_KEY = 'adm_sidebar_collapsed';

function readCollapsed() {
  try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
}

function useAdminAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const token = localStorage.getItem('pv_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .adminMe()
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem('pv_token'))
      .finally(() => setLoading(false));
  }, []);
  return { user, loading, setUser };
}

function Brand() {
  const { settings } = useConfig();
  const name = settings.brand?.site_name || 'Terranexus Properties';
  const logo = settings.brand?.logo_url;
  return (
    <Link to="/admin" className="adm-brand" title={name}>
      <span className="adm-brand__mark">
        {logo ? <img src={logo} alt="" /> : initials(name)}
      </span>
      <span className="adm-brand__text">
        <strong>{name}</strong>
        <small>Admin Console</small>
      </span>
    </Link>
  );
}

function SidebarNav({ collapsed, badges, onNavigate }) {
  const { pathname } = useLocation();
  return (
    <nav className="adm-nav">
      {ADMIN_NAV.map((group) => (
        <div className="adm-nav__group" key={group.section}>
          <span className="adm-nav__section">{group.section}</span>
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(item, pathname);
            const badge = item.badgeKey ? badges[item.badgeKey] : 0;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={`adm-nav__link${active ? ' is-active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={19} strokeWidth={1.9} />
                <span className="adm-nav__label">{item.label}</span>
                {badge > 0 && <span className="adm-nav__badge">{badge > 99 ? '99+' : badge}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function AdminLayout() {
  const { user, loading } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);
  const [badges, setBadges] = useState({});
  const [theme, setTheme] = useState(readCachedTheme);
  const [themeOpen, setThemeOpen] = useState(false);
  const [themeTab, setThemeTab] = useState('admin');

  // Admin appearance: cached copy applies instantly, saved copy from the server wins.
  useEffect(() => {
    applyAdminTheme(theme);
    if (theme.mode !== 'system' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyAdminTheme(theme);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, [theme]);
  useEffect(() => () => clearAdminTheme(), []);
  useEffect(() => {
    if (!user) return;
    api.adminSettings()
      .then((res) => {
        const rows = res.data || [];
        if (!rows.some((r) => r.setting_group === 'admin_theme')) return;
        const next = themeFromRows(rows);
        cacheTheme(next);
        setTheme(next);
      })
      .catch(() => {});
  }, [user]);

  const openTheme = (tab = 'admin') => {
    setThemeTab(tab);
    setMenu(false);
    setThemeOpen(true);
  };
  const onThemeSaved = (next) => {
    cacheTheme(next);
    setTheme(next);
  };

  useEffect(() => {
    if (!user) return undefined;
    const load = () => api.adminEnquiries({ tab: 'followup', limit: 1 })
      .then((res) => setBadges({ followups: res.meta?.counts?.followup || 0 }))
      .catch(() => {});
    load();
    const t = setInterval(load, 120000);
    return () => clearInterval(t);
  }, [user, location.pathname]);

  useEffect(() => { setDrawer(false); setMenu(false); }, [location.pathname]);

  // Browser tab title per admin screen
  const { settings: siteSettings } = useConfig();
  useEffect(() => {
    const nav = findNavItem(location.pathname);
    const screen = /^\/admin\/properties\/\d+/.test(location.pathname) ? 'Edit Property' : nav?.title || 'Admin';
    document.title = `${screen} · Admin | ${siteSettings.brand?.site_name || 'Terranexus Properties'}`;
  }, [location.pathname, siteSettings]);

  if (loading) {
    return (
      <div className="adm adm-boot">
        <span className="adm-spinner adm-spinner--lg" />
        <p>Loading admin console…</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/admin/login" replace />;

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try { localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1'); } catch { /* ignore */ }
      return !c;
    });
  };

  const logout = () => {
    localStorage.removeItem('pv_token');
    navigate('/admin/login');
  };

  const current = findNavItem(location.pathname);
  const isEditProperty = /^\/admin\/properties\/\d+/.test(location.pathname);
  const pageTitle = isEditProperty ? 'Edit Property' : current?.title || 'Admin';


  return (
    <ToastProvider>
      <AdminThemeContext.Provider value={{ openTheme }}>
      <div className={`adm adm-shell${collapsed ? ' is-collapsed' : ''}${drawer ? ' is-drawer-open' : ''}`}>
        <aside className="adm-side">
          <div className="adm-side__top">
            <Brand />
            <button type="button" className="adm-side__close" onClick={() => setDrawer(false)} aria-label="Close menu">
              <X size={20} />
            </button>
          </div>
          <SidebarNav collapsed={collapsed} badges={badges} onNavigate={() => setDrawer(false)} />
          <div className="adm-side__foot">
            <a className="adm-nav__link" href="/" target="_blank" rel="noreferrer" title="View website">
              <ExternalLink size={19} strokeWidth={1.9} />
              <span className="adm-nav__label">View Website</span>
            </a>
            <button type="button" className="adm-nav__link" onClick={logout} title="Logout">
              <LogOut size={19} strokeWidth={1.9} />
              <span className="adm-nav__label">Logout</span>
            </button>
          </div>
        </aside>
        <div className="adm-scrim" onClick={() => setDrawer(false)} />

        <div className="adm-body">
          <header className="adm-topbar">
            <div className="adm-topbar__left">
              <button type="button" className="adm-topbar__icon adm-only-mobile" onClick={() => setDrawer(true)} aria-label="Open menu">
                <Menu size={20} />
              </button>
              <button
                type="button"
                className="adm-topbar__icon adm-only-desktop"
                onClick={toggleCollapsed}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
              </button>
              <div className="adm-crumbs">
                <span>Admin</span>
                <span className="adm-crumbs__sep">/</span>
                <strong>{pageTitle}</strong>
              </div>
            </div>
            <div className="adm-topbar__right">
              <button
                type="button"
                className="adm-topbar__icon adm-theme-btn"
                onClick={() => openTheme('admin')}
                aria-label="Theme settings"
                title="Theme settings"
              >
                <Paintbrush size={18} />
              </button>
              <a className="adm-btn adm-btn--ghost adm-btn--sm adm-only-desktop" href="/" target="_blank" rel="noreferrer">
                <ExternalLink size={15} /> <span>View Website</span>
              </a>
              <div className="adm-user">
                <button type="button" className="adm-user__btn" onClick={() => setMenu((m) => !m)}>
                  <span className="adm-avatar">{initials(user.name)}</span>
                  <span className="adm-user__meta adm-only-desktop">
                    <strong>{user.name}</strong>
                    <small>{String(user.role || 'admin').replace('_', ' ')}</small>
                  </span>
                  <ChevronDown size={16} />
                </button>
                {menu && (
                  <>
                    <div className="adm-user__backdrop" onClick={() => setMenu(false)} />
                    <div className="adm-user__menu">
                      <div className="adm-user__head">
                        <span className="adm-avatar adm-avatar--lg">{initials(user.name)}</span>
                        <div>
                          <strong>{user.name}</strong>
                          <small className="adm-user__email" title={user.email}><Mail size={12} /> <span>{String(user.email || '').toLowerCase()}</span></small>
                          <small className="adm-user__role"><ShieldCheck size={12} /> {String(user.role || 'admin').replace('_', ' ')}</small>
                        </div>
                      </div>
                      <button type="button" onClick={() => openTheme('admin')}><Paintbrush size={16} /> Theme settings</button>
                      <Link to="/admin/settings"><KeyRound size={16} /> Website settings</Link>
                      <a href="/" target="_blank" rel="noreferrer"><ExternalLink size={16} /> View website</a>
                      <button type="button" onClick={logout}><LogOut size={16} /> Logout</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>
          <main className="adm-main">
            <Outlet />
          </main>
        </div>
      </div>
      <ThemeCustomizer
        open={themeOpen}
        initialTab={themeTab}
        saved={theme}
        onClose={() => setThemeOpen(false)}
        onSaved={onThemeSaved}
      />
      </AdminThemeContext.Provider>
    </ToastProvider>
  );
}

const LOGIN_SLIDE_FALLBACK = [
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1800&q=75',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1800&q=75',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1800&q=75',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1800&q=75',
];

/* Crossfading property photos with a slow zoom behind the login art panel */
function LoginSlides() {
  const { settings } = useConfig();
  const slides = (settings.homepage?.hero_slides || []).map((s) => s.image).filter(Boolean);
  const list = slides.length ? slides : LOGIN_SLIDE_FALLBACK;
  const [i, setI] = useState(0);
  useEffect(() => {
    if (list.length < 2) return undefined;
    const t = setInterval(() => setI((n) => (n + 1) % list.length), 6000);
    return () => clearInterval(t);
  }, [list.length]);
  return (
    <div className="adm-login__slides" aria-hidden>
      <AnimatePresence>
        <motion.div
          key={list[i]}
          className="adm-login__slide"
          style={{ backgroundImage: `url(${list[i]})` }}
          initial={{ opacity: 0, scale: 1.12 }}
          animate={{ opacity: 1, scale: 1.02 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 1.4 }, scale: { duration: 7, ease: 'linear' } }}
        />
      </AnimatePresence>
      <div className="adm-login__slides-veil" />
    </div>
  );
}

/* Decorative "live console" preview on the login art panel (sample messages, not real data) */
const LOGIN_FEED = [
  { icon: MessageSquareText, tone: 'green', title: 'New inquiry received', text: '3 BHK apartment · Thane' },
  { icon: CalendarClock, tone: 'gold', title: 'Follow-up due today', text: '2 clients waiting for a call back' },
  { icon: CircleCheck, tone: 'teal', title: 'Property published', text: 'Now live on the website' },
  { icon: CalendarCheck, tone: 'blue', title: 'Site visit booked', text: 'Saturday · 11:00 AM' },
];

function LoginFloaters() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % LOGIN_FEED.length), 2800);
    return () => clearInterval(t);
  }, []);
  const item = LOGIN_FEED[i];
  const Icon = item.icon;
  return (
    <div className="adm-login__floaters" aria-hidden>
      <div className="adm-login__feed">
        <span className="adm-login__feed-label"><BellRing size={13} /> Live activity</span>
        <div className="adm-login__feed-stage">
        <AnimatePresence initial={false}>
          <motion.div
            key={item.title}
            className="adm-login__feed-card"
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.97 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className={`adm-login__feed-icon is-${item.tone}`}><Icon size={18} /></span>
            <span>
              <strong>{item.title}</strong>
              <small>{item.text}</small>
            </span>
          </motion.div>
        </AnimatePresence>
        </div>
        <div className="adm-login__feed-dots">
          {LOGIN_FEED.map((f, n) => <span key={f.title} className={n === i ? 'is-on' : ''} />)}
        </div>
      </div>
      <motion.div
        className="adm-login__chip adm-login__chip--a"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.8, duration: 0.7 }}
      >
        <Building2 size={16} /> Listings
      </motion.div>
      <motion.div
        className="adm-login__chip adm-login__chip--b"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1, duration: 0.7 }}
      >
        <MessageSquareText size={16} /> Inquiries
      </motion.div>
      <motion.div
        className="adm-login__chip adm-login__chip--c"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.2, duration: 0.7 }}
      >
        <CalendarClock size={16} /> Follow-ups
      </motion.div>
    </div>
  );
}

export function AdminLogin() {
  const navigate = useNavigate();
  const { settings } = useConfig();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const name = settings.brand?.site_name || 'Terranexus Properties';
  useEffect(() => {
    const t = setTimeout(() => { document.title = `Admin login | ${name}`; }, 0);
    return () => clearTimeout(t);
  }, [name, settings]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await api.adminLogin({ email, password });
      localStorage.setItem('pv_token', res.data.token);
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="adm adm-login">
      <div className="adm-login__art">
        <LoginSlides />
        <div className="adm-login__glow adm-login__glow--a" aria-hidden />
        <div className="adm-login__glow adm-login__glow--b" aria-hidden />
        <LoginFloaters />
        <div className="adm-login__art-inner">
          <motion.span
            className="adm-login__mark"
            initial={{ opacity: 0, scale: 0.6, rotate: -12 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 14 }}
          >
            <span className="adm-brand__mark adm-brand__mark--lg">{initials(name)}</span>
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            {name}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
          >
            Manage listings, track every inquiry and follow-up, and keep your website fresh — all from one console.
          </motion.p>
          <ul>
            {['Property listings & media', 'Inquiry CRM with follow-up history', 'Homepage, reviews & SEO controls'].map((t, i) => (
              <motion.li
                key={t}
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + i * 0.12, duration: 0.6 }}
              >
                {t}
              </motion.li>
            ))}
          </ul>
        </div>
        <svg className="adm-login__skyline" viewBox="0 0 1200 160" preserveAspectRatio="none" aria-hidden>
          <path d="M0 160 V120 H60 V90 H110 V120 H150 V60 H200 V40 H230 V60 H260 V120 H310 V80 H360 V120 H400 V30 H430 V10 H450 V30 H480 V120 H530 V95 H580 V70 H620 V120 H670 V50 H720 V120 H760 V85 H800 V120 H850 V45 H880 V25 H905 V45 H930 V120 H980 V75 H1030 V120 H1070 V95 H1120 V60 H1160 V120 H1200 V160" />
        </svg>
      </div>
      <div className="adm-login__panel">
        <span className="adm-login__panel-orb" aria-hidden />
        <motion.form
          className="adm-login__card"
          onSubmit={submit}
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        >
          <div className="adm-login__card-brand">
            <span className="adm-brand__mark">{initials(name)}</span>
            <span>
              <strong>{name}</strong>
              <small>Admin Console</small>
            </span>
          </div>
          <h1>Welcome back</h1>
          <p className="adm-muted">Sign in to continue to your dashboard.</p>
          <div className="adm-field">
            <label>Email</label>
            <div className="adm-login__input">
              <Mail size={17} />
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required autoComplete="username" placeholder="you@company.com" />
            </div>
          </div>
          <div className="adm-field">
            <label>Password</label>
            <div className="adm-login__input">
              <LockKeyhole size={17} />
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required autoComplete="current-password" placeholder="Your password" />
            </div>
          </div>
          {error && <p className="adm-alert tone-red">{error}</p>}
          <SaveButton type="submit" saving={saving} loadingLabel="Signing in…" className="adm-btn adm-btn--primary adm-btn--lg adm-btn--block">
            Sign in
          </SaveButton>
          <div className="adm-login__secure"><ShieldCheck size={14} /> Secure admin access</div>
          <a className="adm-login__back" href="/" target="_blank" rel="noreferrer">
            <ExternalLink size={14} /> Open website
          </a>
        </motion.form>
      </div>
    </div>
  );
}
