import {
  Building2, Database, FileStack, Home, LayoutDashboard, MailCheck, MessageSquareText, PlusCircle, Settings, Star,
} from 'lucide-react';

/**
 * Sidebar menu definition. Add a screen here and it appears in the sidebar,
 * topbar title and mobile drawer automatically.
 */
export const ADMIN_NAV = [
  {
    section: 'Overview',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true, title: 'Dashboard' },
    ],
  },
  {
    section: 'Listings',
    items: [
      { to: '/admin/properties', label: 'Properties', icon: Building2, title: 'Properties', match: /^\/admin\/properties(?!\/new)/ },
      { to: '/admin/properties/new', label: 'Add Property', icon: PlusCircle, end: true, title: 'Add Property' },
    ],
  },
  {
    section: 'Leads',
    items: [
      { to: '/admin/enquiries', label: 'Inquiries', icon: MessageSquareText, title: 'Inquiries', badgeKey: 'followups', match: /^\/admin\/(enquiries|inquiries)/ },
    ],
  },
  {
    section: 'Website',
    items: [
      { to: '/admin/homepage', label: 'Homepage', icon: Home, title: 'Homepage' },
      { to: '/admin/pages', label: 'Website Pages', icon: FileStack, title: 'Website Pages' },
      { to: '/admin/reviews', label: 'Reviews', icon: Star, title: 'Reviews' },
      { to: '/admin/settings', label: 'Website Info', icon: Settings, title: 'Website Info' },
    ],
  },
  {
    section: 'Configuration',
    items: [
      { to: '/admin/masters', label: 'Masters', icon: Database, title: 'Masters' },
      { to: '/admin/email', label: 'Email & Notifications', icon: MailCheck, title: 'Email & Notifications' },
    ],
  },
];

const FLAT = ADMIN_NAV.flatMap((g) => g.items);

export function findNavItem(pathname) {
  const exact = FLAT.find((i) => i.to === pathname);
  if (exact) return exact;
  return FLAT.find((i) => (i.match ? i.match.test(pathname) : !i.end && pathname.startsWith(i.to))) || null;
}

export function isNavActive(item, pathname) {
  if (item.match) return item.match.test(pathname);
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}
