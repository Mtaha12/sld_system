import {
  LayoutDashboard,
  Scale,
  Bell,
  FileText,
  Settings,
  Search,
  Sparkles,
  Newspaper,
  MessageSquare,
  Globe,
  Download,
  Video,
  Building2,
  BookOpen,
  Library,
  Users,
  Activity,
  BellRing,
  FileSpreadsheet,
  ShieldCheck,
  ShieldBan,
  BookMarked,
  Gavel,
  Replace,
  CreditCard,
  BookA,
  Mail,
  Layers,
  Receipt,
  Folder,
  Briefcase,
  Gauge,
  Bookmark,
  Type,
  Hash
} from 'lucide-react';

// Standalone top navigation items visible to subscribers
export const TOP_NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Search Case Law', path: '/search-case-law', icon: Search },
  { label: 'Search with AI', badge: '(Free)', path: '/ai-assistant', icon: Sparkles, isHighlight: true },
  { label: 'Statute Search', path: '/statute-search', icon: FileText },
  { label: 'Notification Search', path: '/notification-search', icon: Bell },
];

// User Portal Navigation Items
export const USER_MENU_ITEMS = [
  { label: 'Updated Laws', path: '/downloads?category=Updated+Law', icon: Gauge },
  { label: 'Dictionary', path: '/manage-dictionary', icon: Gauge },
  { label: 'News', path: '/news', icon: Gauge },
  { label: 'Finance Act', path: '/manage-tax-cards?category=finance-act', icon: Gauge },
  { label: 'Custom Tariff', path: '/manage-custom-tariffs', icon: Gauge },
  { label: 'Email Digests', path: '/emails', icon: Gauge },
  { label: 'Whatsapp', path: '/whatsapp-updates', icon: Gauge },
  { label: 'Youtube Channel', path: '/youtube-updates', icon: Gauge },
  { label: 'Tax Rates', path: '/manage-tax-cards?category=tax-rates', icon: Gauge },
  { label: 'Tax Returns', path: '/downloads?category=Tax+Return', icon: Gauge },
  { label: 'Live Chat', path: '/ai-assistant', icon: Gauge },
];

export const QUICK_LINKS = [
  { label: 'FBR', url: 'https://fbr.gov.pk/' },
  { label: 'SECP', url: 'https://www.secp.gov.pk/' },
  { label: 'Supreme Court of Pakistan', url: 'https://www.supremecourt.gov.pk/' },
  { label: 'Islamabad High Court', url: 'https://ihc.gov.pk/' },
  { label: 'Lahore High Court', url: 'https://lhc.gov.pk/' },
  { label: 'Sindh High Court', url: 'https://sindhhighcourt.gov.pk/' },
  { label: 'Balochistan High Court', url: 'https://bhc.gov.pk/' },
  { label: 'AJK High Court', url: 'https://ajkhighcourt.gok.pk/' },
  { label: 'Punjab Revenue Authority', url: 'https://pra.punjab.gov.pk/' },
  { label: 'Sindh Revenue Authority', url: 'https://www.srb.gos.pk/srb/' },
  { label: 'KPK Revenue Authority', url: 'https://kpra.gov.pk/' },
  { label: 'Balochistan Revenue Authority', url: 'https://bra.gob.pk/' },
];

// Dropdown Folder Categories for Administrators
export const FOLDER_GROUPS = [
  {
    id: 'main-pages',
    label: 'Main Pages',
    icon: Folder,
    items: [
      { label: 'Manage Case Law', path: '/manage-cases', icon: Scale },
      { label: 'Manage Notification', path: '/manage-notifications', icon: Bell },
      { label: 'Manage Statute', path: '/manage-statutes', icon: FileText },
      { label: 'Manage Other Case Law', path: '/other-caselaws', icon: Scale },
    ]
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    items: [
      { label: 'Manage Users', path: '/manage-users', icon: Users },
      { label: 'Manage Admins', path: '/manage-admins', icon: ShieldCheck },
      { label: 'Batch Replacement', path: '/replacement', icon: Replace },
      { label: 'Case Activity', path: '/activity/cases', icon: Activity },
      { label: 'Notification Activity', path: '/activity/notifications', icon: BellRing },
      { label: 'Statute Activity', path: '/activity/statutes', icon: FileSpreadsheet },
      { label: 'Manage Magazines', path: '/setting/magazines', icon: BookMarked },
      { label: 'Manage Courts', path: '/setting/courts', icon: Gavel },
      { label: 'Manage IP Block List', path: '/setting/ip-blocks', icon: ShieldBan },
      { label: 'WhatsApp Updates', path: '/whatsapp-updates', icon: MessageSquare },
      { label: 'Manage Updates', path: '/manage-updates', icon: Globe },
      { label: 'YouTube Updates', path: '/youtube-updates', icon: Video },
      { label: 'Manage Cities', path: '/setting/cities', icon: Building2 },
      { label: 'Manage Principle of Law', path: '/setting/principles', icon: BookOpen },
      { label: 'Manage Legal Maxim', path: '/setting/legal-maxims', icon: Scale },
      { label: 'Manage Articles', path: '/setting/articles', icon: BookOpen },
      { label: 'Manage Topics', path: '/setting/topics', icon: Layers },
      { label: 'Manage Words & Phrases', path: '/setting/words-phrases', icon: Type },
      { label: 'Manage Legal Terms', path: '/setting/legal-terms', icon: Bookmark },
      { label: 'Manage Laws / Statute', path: '/setting/laws', icon: Library },
      { label: 'Manage Sections', path: '/setting/sections', icon: Hash },
    ]
  },
  {
    id: 'other-services',
    label: 'Other Services',
    icon: Briefcase,
    items: [
      { label: 'Manage News', path: '/news', icon: Newspaper },
      { label: 'Manage Downloads', path: '/manage-downloads', icon: Download },
      { label: 'Manage Tax Cards', path: '/manage-tax-cards', icon: CreditCard },
      { label: 'Manage Finance Act', path: '/manage-tax-cards?category=finance-act', icon: CreditCard },
      { label: 'Dictionary', path: '/manage-dictionary', icon: BookA },
      { label: 'Manage Emails', path: '/manage-emails', icon: Mail },
      { label: 'Manage Custom Tariffs', path: '/manage-custom-tariffs', icon: Layers },
      { label: 'Manage Invoices', path: '/manage-invoices', icon: Receipt },
    ]
  }
];

