import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Outlet, matchPath } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ConfigProvider, resolveSiteMode, useConfig } from './lib/config';
import Header from './components/Header';
import Footer from './components/Footer';
import FloatActions from './components/FloatActions';
import { PageEnter } from './components/Motion';
import HomePage from './pages/HomePage';
import PropertiesPage from './pages/PropertiesPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import { ContactPage, NotFoundPage } from './pages/StaticPages';
import {
  AboutPage, ServicesPage, TeamPage, BlogPage, BlogPostPage, LegalPage,
} from './pages/ContentPages';
import {
  AdminLogin,
  AdminLayout,
  AdminDashboard,
  AdminProperties,
  AdminPropertyEdit,
  AdminMasters,
  AdminContent,
  AdminEnquiries,
  AdminSettings,
  AdminContentPages,
  AdminEmailSettings,
} from './pages/AdminPages';
import AdminHomepage from './pages/AdminHomepage';

function PublicShell() {
  const location = useLocation();
  const isHome = !!matchPath({ path: '/', end: true }, location.pathname);
  const { settings } = useConfig();
  const siteMode = settings.theme?.site_mode || 'light';

  // Website light/dark mode (public pages only — the admin console has its own theme)
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => { root.dataset.pvMode = resolveSiteMode(siteMode); };
    apply();
    const mq = siteMode === 'system' ? window.matchMedia?.('(prefers-color-scheme: dark)') : null;
    mq?.addEventListener?.('change', apply);
    return () => {
      mq?.removeEventListener?.('change', apply);
      delete root.dataset.pvMode;
    };
  }, [siteMode]);
  return (
    <>
      <Header />
      <main className="site-main">
        <div className={`public-shell${isHome ? '' : ' is-inner'}`}>
          <Outlet />
        </div>
      </main>
      <Footer />
      <FloatActions />
    </>
  );
}

function AnimatedOutlet() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <PageEnter key={location.pathname}>
        <Outlet />
      </PageEnter>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <ConfigProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicShell />}>
            <Route element={<AnimatedOutlet />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/properties" element={<PropertiesPage />} />
              <Route path="/property/:slug" element={<PropertyDetailPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/team" element={<TeamPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/:slug" element={<BlogPostPage />} />
              <Route path="/privacy-policy" element={<LegalPage kind="privacy" />} />
              <Route path="/terms-and-conditions" element={<LegalPage kind="terms" />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="properties" element={<AdminProperties />} />
            <Route path="properties/:id" element={<AdminPropertyEdit />} />
            <Route path="homepage" element={<AdminHomepage />} />
            <Route path="reviews" element={<AdminContent />} />
            <Route path="masters" element={<AdminMasters />} />
            <Route path="lists" element={<AdminMasters />} />
            <Route path="content" element={<AdminContent />} />
            <Route path="enquiries" element={<AdminEnquiries />} />
            <Route path="inquiries" element={<AdminEnquiries />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="pages" element={<AdminContentPages />} />
            <Route path="email" element={<AdminEmailSettings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}
