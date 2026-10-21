import { useState, useEffect } from 'react';
import {
  FileText, Calendar, Building2, MapPin, Mail, Phone,
  Info, BookOpen, ArrowRight, Check, Copy, User, Building, Download, Globe, ExternalLink, ShieldCheck, Sparkles,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import whatsappLogo from '../../../assets/branding/dashboard/whatsapp.png';
import youtubeLogo from '../../../assets/branding/dashboard/youtube.png';
import sldBroucher from '../../../assets/branding/dashboard/sld_broucher.png';
import sldEmailWhatsappBanner from '../../../assets/branding/dashboard/sld_email_whatsapp_banner.jpg';
import Modal from '../../../components/ui/Modal';
import AboutUsModal from './AboutUsModal';
import { whatsappService } from '../../whatsapp/services/whatsappService';
import { youtubeService } from '../../youtube/services/youtubeService';
import { updateService } from '../../updates/services/updateService';

const getYoutubeThumbnail = (url, photo) => {
  if (photo && (photo.startsWith('http') || photo.startsWith('data:image'))) {
    return photo;
  }
  if (url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2] && match[2].length === 11) {
      return `https://img.youtube.com/vi/${match[2]}/hqdefault.jpg`;
    }
  }
  return 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=800';
};

const fallbackWhatsappList = [
  { id: 1, heading: '1. Overview of the evolution of corporate law in Pakistan by Mr. Rahat Aziz', dated: '2026-06-17', attachmentName: 'Corporate_Law_Overview.pdf' },
  { id: 2, heading: '2. Ultimate Beneficial Ownership (UBO) requirements by Mr. Kashif Mahmood (SECP)', dated: '2026-06-17', attachmentName: 'UBO_Requirements_SECP.pdf' },
  { id: 3, heading: 'Anomalies & Recommendations By Razi Ahsan dt 17th June 2026', dated: '2026-06-17', attachmentName: 'Recommendations_Razi.pdf' },
  { id: 4, heading: '3. Conversion of physical shares into book-entry form by Mr. Farooq Ahmed (CDC)', dated: '2026-06-17', attachmentName: 'CDC_Share_Conversion.pdf' }
];

const fallbackWebsiteList = [
  { id: 1, heading: 'FBR Portal System Upgrade: Digital Tax Filing Version 4.2', dated: '2026-09-08', url: 'https://iris.fbr.gov.pk' },
  { id: 2, heading: 'Securities and Exchange Commission Online Services Portal Revision', dated: '2026-09-07', url: 'https://eservices.secp.gov.pk' },
  { id: 3, heading: 'Sindh Revenue Board: Electronic Sales Tax Invoicing Guideline', dated: '2026-09-05', url: 'https://srb.gos.pk' },
  { id: 4, heading: 'State Bank of Pakistan Foreign Exchange Manual 2026 Amendment', dated: '2026-09-02', url: 'https://sbp.org.pk' }
];

const fallbackYoutube = {
  caption: 'Lahore Tax Bar Annual Dinner 2026 | Election Result, Asif Rana Team Victory',
  dated: '2026-03-27',
  url: 'https://www.youtube.com/watch?v=T9sAnLmEJFA',
  photo: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=800'
};

const CopyableDetail = ({ icon: Icon, label, value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-theme-surface-hover transition-colors group">
      <div className="mt-0.5 text-[#f15a24]">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-theme-muted font-medium">{label}</p>
        <p className="text-xs text-theme-main font-semibold break-words">{value}</p>
      </div>
      <button
        onClick={handleCopy}
        title="Copy to clipboard"
        className="p-1 rounded-md text-gray-400 hover:text-[#f15a24] hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all opacity-100"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};

const CompactAccountRow = ({ b }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(b.acc);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between gap-2 p-1.5 px-2 rounded-lg bg-white/80 dark:bg-theme-surface/80 border border-orange-100 dark:border-orange-900/30 hover:border-orange-300 dark:hover:border-orange-700/50 transition-all group shadow-2xs">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-6 h-6 rounded-md bg-orange-100/70 dark:bg-orange-950/50 flex items-center justify-center text-[#f15a24] shrink-0">
          <Building2 className="w-3.5 h-3.5" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-bold text-gray-900 dark:text-gray-100 leading-tight truncate font-heading">{b.bank}</span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate leading-none mt-0.5">{b.title}</span>
        </div>
      </div>
      <button
        onClick={handleCopy}
        title="Click to copy account number"
        className="flex items-center gap-1 cursor-pointer bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/40 px-2 py-0.5 rounded text-[11px] font-bold text-emerald-700 dark:text-emerald-300 transition-colors shrink-0 font-mono"
      >
        <span>{b.prefix ? `${b.prefix} ` : ''}{b.acc}</span>
        {copied ? <Check className="w-3 h-3 text-emerald-600 animate-pulse" /> : <Copy className="w-3 h-3 text-emerald-500/70 group-hover:text-emerald-700" />}
      </button>
    </div>
  );
};

const InfoWidgets = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isAboutUsModalOpen, setIsAboutUsModalOpen] = useState(false);
  const [isBrochureModalOpen, setIsBrochureModalOpen] = useState(false);

  // Live data states
  const [whatsappUpdates, setWhatsappUpdates] = useState([]);
  const [youtubeUpdates, setYoutubeUpdates] = useState([]);
  const [websiteUpdates, setWebsiteUpdates] = useState([]);
  const [activeUpdatesTab, setActiveUpdatesTab] = useState('whatsapp'); // 'whatsapp' | 'website'
  const [currentUpdateIndex, setCurrentUpdateIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const loadDashboardData = async () => {
      try {
        const [waRes, ytRes, webRes] = await Promise.allSettled([
          whatsappService.getUpdates({ limit: 6 }),
          youtubeService.getYoutubeUpdates(),
          updateService.getUpdates({ limit: 6 })
        ]);
        if (!isMounted) return;
        if (waRes.status === 'fulfilled' && Array.isArray(waRes.value) && waRes.value.length > 0) {
          setWhatsappUpdates(waRes.value);
        }
        if (ytRes.status === 'fulfilled' && Array.isArray(ytRes.value) && ytRes.value.length > 0) {
          setYoutubeUpdates(ytRes.value);
        }
        if (webRes.status === 'fulfilled' && Array.isArray(webRes.value) && webRes.value.length > 0) {
          setWebsiteUpdates(webRes.value);
        }
      } catch (err) {
        console.error('[InfoWidgets] Error loading updates:', err);
      }
    };
    loadDashboardData();
    return () => { isMounted = false; };
  }, []);

  const currentList = activeUpdatesTab === 'whatsapp'
    ? (whatsappUpdates.length > 0 ? whatsappUpdates : fallbackWhatsappList)
    : (websiteUpdates.length > 0 ? websiteUpdates : fallbackWebsiteList);

  useEffect(() => {
    if (currentList.length === 0) return;
    const timer = setInterval(() => {
      setCurrentUpdateIndex((prev) => (prev + 1) % currentList.length);
    }, 3800);
    return () => clearInterval(timer);
  }, [currentList.length]);

  const [currentYoutubeIndex, setCurrentYoutubeIndex] = useState(0);
  const [isYoutubeHovered, setIsYoutubeHovered] = useState(false);

  const activeYoutubeList = youtubeUpdates.length > 0 ? youtubeUpdates : [fallbackYoutube];

  useEffect(() => {
    if (activeYoutubeList.length <= 1 || isYoutubeHovered) return;
    const timer = setInterval(() => {
      setCurrentYoutubeIndex((prev) => (prev + 1) % activeYoutubeList.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [activeYoutubeList.length, isYoutubeHovered]);

  const handlePrevYoutube = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentYoutubeIndex((prev) => (prev - 1 + activeYoutubeList.length) % activeYoutubeList.length);
  };

  const handleNextYoutube = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentYoutubeIndex((prev) => (prev + 1) % activeYoutubeList.length);
  };

  const currentVideo = activeYoutubeList[currentYoutubeIndex % activeYoutubeList.length];
  const youtubeThumbnail = getYoutubeThumbnail(currentVideo.url, currentVideo.photo);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-6 items-stretch">

      {/* 1. Subscription Fee Column - Compact, Executive & Zero Waste Space */}
      <div className="bg-gradient-to-b from-[#fffaf4] to-[#fff3e7] dark:from-[#1b1511] dark:to-[#14100c] border border-orange-200/80 dark:border-orange-900/40 rounded-2xl overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md transition-all">

        {/* Header */}
        <div className="px-4 py-3 border-b border-orange-200/70 dark:border-orange-900/40 flex items-center justify-between bg-white/60 dark:bg-theme-surface/50 backdrop-blur-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#f15a24] to-amber-500 flex items-center justify-center text-white shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900 dark:text-gray-100 font-heading tracking-tight leading-tight">Subscription Fee</h2>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium leading-none">SLD Official Annual Membership</p>
            </div>
          </div>
          <span className="flex items-center gap-1 text-[11px] font-bold text-orange-900 dark:text-orange-200 bg-orange-100/90 dark:bg-orange-950/60 border border-orange-200/70 px-2 py-0.5 rounded-full shadow-2xs font-mono">
            <Calendar className="w-3 h-3 text-[#f15a24]" />
            {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
          </span>
        </div>

        {/* Content */}
        <div className="p-3.5 flex flex-col gap-2.5 flex-1 justify-between">

          {/* Refined Compact Price Row */}
          <div className="py-2 px-3 rounded-xl bg-orange-500/10 dark:bg-orange-500/15 border border-orange-200/80 dark:border-orange-800/40 flex items-center justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#f15a24]">Fee:</span>
              <span className="text-lg font-black font-heading text-gray-950 dark:text-white tracking-tight">Rs. 30,000</span>
              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">/ Annually</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-950/60 border border-emerald-200/80 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
              <Check className="w-2.5 h-2.5" /> Official Rate
            </span>
          </div>

          {/* Warning Alert */}
          <div className="flex items-start gap-2 text-[11px] font-semibold text-amber-950 dark:text-amber-200 bg-orange-500/10 dark:bg-orange-500/15 border border-orange-200/80 dark:border-orange-800/40 p-2.5 rounded-xl leading-snug">
            <ShieldCheck className="w-4 h-4 text-[#f15a24] shrink-0 mt-0.5" />
            <span>Pay subscription fee <strong>only</strong> in company accounts below. Otherwise Company is not responsible.</span>
          </div>

          {/* Bank Accounts Grid/List */}
          <div className="flex flex-col gap-1.5">
            {[
              { bank: 'Allied Bank Limited', title: 'SLD System', acc: '11050010037270730029' },
              { bank: 'MCB Bank Limited', title: 'SLD System', acc: 'PK84MUCB1123909311000715', prefix: 'IBAN' },
              { bank: 'United Bank Limited', title: 'SLD System', acc: '1491-222820349' },
              { bank: 'Jazz Cash / Easy Paisa', title: 'Haroon Ahmad Rafiq', acc: '03215390007' }
            ].map((b, i) => (
              <CompactAccountRow key={i} b={b} />
            ))}
          </div>
        </div>

        {/* Footer Info Strip */}
        <div className="border-t border-orange-200/70 dark:border-orange-900/40 bg-white/70 dark:bg-theme-surface/70 px-3.5 py-2 flex items-center justify-between text-[11px] text-gray-700 dark:text-gray-300">
          <div className="flex items-center gap-1 truncate max-w-[58%]">
            <MapPin className="w-3.5 h-3.5 text-[#f15a24] shrink-0" />
            <span className="truncate font-medium">Head Office: City Centre, Saddar, Rawalpindi</span>
          </div>
          <div className="flex items-center gap-2 font-bold text-gray-800 dark:text-gray-200 font-mono shrink-0">
            <Phone className="w-3 h-3 text-[#f15a24]" />
            <span>051-8315912</span>
          </div>
        </div>
      </div>

      {/* 2. Contact Us Column - Full Representation Details */}
      <div className="bg-gradient-to-b from-[#f5f9ff] to-[#eaf3ff] dark:from-[#111827] dark:to-[#0f172a] border border-blue-200/80 dark:border-blue-900/40 rounded-2xl overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md transition-all">

        {/* Header */}
        <div className="px-4 py-3 border-b border-blue-200/70 dark:border-blue-900/40 flex items-center justify-between bg-white/60 dark:bg-theme-surface/50 backdrop-blur-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-xs">
              <Phone className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900 dark:text-gray-100 font-heading tracking-tight leading-tight">Contact Us</h2>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium leading-none">SLD System Official Help & Representation</p>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-100/90 dark:bg-blue-950/70 border border-blue-200/80 px-2 py-0.5 rounded-full shadow-2xs font-mono">
            Helpline
          </span>
        </div>

        {/* Content */}
        <div className="p-3.5 flex flex-col gap-2.5 flex-1 justify-between">

          {/* Executive 1: Haroon Ahmad Rafiq */}
          <div className="p-3 rounded-xl bg-white/80 dark:bg-theme-surface/80 border border-blue-100 dark:border-blue-900/30 shadow-2xs hover:border-blue-300 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 shrink-0 font-black text-xs mt-0.5">
                  HR
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs sm:text-sm font-black text-gray-900 dark:text-gray-100 font-heading leading-tight">Haroon Ahmad Rafiq</h3>
                  <p className="text-[10.5px] text-gray-600 dark:text-gray-400 leading-snug mt-1">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Head Office:</span> # SO-6 & 7, 2nd Floor, City Centre, Bank Road, Saddar-Rawalpindi
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 mt-2.5 pt-2 border-t border-blue-100/60 dark:border-blue-900/30">
              <a href="mailto:info@sldsystem.com" className="flex-1 min-w-0 flex items-center justify-center gap-1 px-2 py-1 rounded-md bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-100/80 dark:border-blue-900/50 text-[10.5px] font-bold text-blue-900 dark:text-blue-200 transition-colors whitespace-nowrap">
                <Mail className="w-3 h-3 text-blue-600 shrink-0" />
                <span>info@sldsystem.com</span>
              </a>
              <a href="tel:03215390007" className="flex-1 min-w-0 flex items-center justify-center gap-1 px-2 py-1 rounded-md bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-100/80 dark:border-blue-900/50 text-[10.5px] font-bold text-blue-900 dark:text-blue-200 transition-colors font-mono whitespace-nowrap">
                <Phone className="w-3 h-3 text-blue-600 shrink-0" />
                <span>0321-5390007-8</span>
              </a>
            </div>
          </div>

          {/* Central Helpline Bar */}
          <div className="px-3 py-1.5 rounded-lg bg-blue-100/50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-blue-950 dark:text-blue-200 font-bold truncate">
              <Building className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">Helpline (Mon - Sat: 9am-6pm)</span>
            </div>
            <div className="flex items-center gap-3 font-semibold text-gray-700 dark:text-gray-300 shrink-0">
              <span className="flex items-center gap-1 font-mono text-xs font-bold text-blue-800 dark:text-blue-300">
                <Phone className="w-3 h-3 text-blue-600" /> 051-8315912
              </span>
            </div>
          </div>

          {/* Executive 2: Abdul Sami Abbasi */}
          <div className="p-3 rounded-xl bg-white/80 dark:bg-theme-surface/80 border border-blue-100 dark:border-blue-900/30 shadow-2xs hover:border-blue-300 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 shrink-0 font-black text-xs mt-0.5">
                  SA
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-black text-gray-900 dark:text-gray-100 font-heading leading-tight">Abdul Sami Abbasi</h3>
                    <span className="text-[9px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 px-1.5 py-0.5 rounded shrink-0">
                      Sales Manager
                    </span>
                  </div>
                  <p className="text-[10.5px] text-gray-600 dark:text-gray-400 leading-snug mt-1">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Karachi Branch:</span> Office No. 408, 4th Floor, Al-Ayesha Chambers, Sharar-e-Iraq, Near Passport Office, Saddar-Karachi
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 mt-2.5 pt-2 border-t border-blue-100/60 dark:border-blue-900/30">
              <a href="mailto:sami@sldsystem.com" className="flex-1 min-w-0 flex items-center justify-center gap-1 px-2 py-1 rounded-md bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-100/80 dark:border-blue-900/50 text-[10.5px] font-bold text-blue-900 dark:text-blue-200 transition-colors whitespace-nowrap">
                <Mail className="w-3 h-3 text-blue-600 shrink-0" />
                <span>sami@sldsystem.com</span>
              </a>
              <a href="tel:03258986393" className="flex-1 min-w-0 flex items-center justify-center gap-1 px-2 py-1 rounded-md bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-100/80 dark:border-blue-900/50 text-[10.5px] font-bold text-blue-900 dark:text-blue-200 transition-colors font-mono whitespace-nowrap">
                <Phone className="w-3 h-3 text-blue-600 shrink-0" />
                <span>0325-8986393</span>
              </a>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="border-t border-blue-200/70 dark:border-blue-900/40 bg-white/70 dark:bg-theme-surface/70 px-3 py-2 flex items-center justify-between gap-1 text-[11px] font-extrabold">
          <button
            onClick={() => setIsAboutUsModalOpen(true)}
            className="flex items-center gap-1 text-gray-800 dark:text-gray-200 hover:text-blue-600 transition-colors cursor-pointer px-1 py-0.5 rounded"
          >
            <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" /> <span>About Us</span>
          </button>
          <span className="text-gray-300 dark:text-gray-700">•</span>
          <button
            onClick={() => setIsBrochureModalOpen(true)}
            className="flex items-center gap-1 text-gray-800 dark:text-gray-200 hover:text-blue-600 transition-colors cursor-pointer px-1 py-0.5 rounded"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" /> <span>SLD Brochure</span>
          </button>
          <span className="text-gray-300 dark:text-gray-700">•</span>
          <button
            onClick={() => setIsContactModalOpen(true)}
            className="flex items-center gap-1 text-gray-800 dark:text-gray-200 hover:text-blue-600 transition-colors cursor-pointer px-1 py-0.5 rounded"
          >
            <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" /> <span>Emails & WhatsApp</span>
          </button>
        </div>
      </div>

      {/* 3. Right Column: Live Updates & Youtube Video - Balanced Height */}
      <div className="flex flex-col gap-4 justify-between">

        {/* Updates Card (Whatsapp Updates & Legal Updates) */}
        <div className="bg-gradient-to-b from-[#f2fcf5] to-[#e7f8ec] dark:from-[#0d1f14] dark:to-[#0a1810] border border-green-200/80 dark:border-green-900/40 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all p-3.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0">
                {activeUpdatesTab === 'whatsapp' ? (
                  <img src={whatsappLogo} alt="Whatsapp" className="w-6 h-6 object-contain" />
                ) : (
                  <Globe className="w-5 h-5 text-emerald-600" />
                )}
              </div>

              {/* Tab Selector: WhatsApp vs Legal Updates */}
              <div className="flex items-center bg-white/90 dark:bg-theme-surface border border-gray-200 dark:border-theme-border rounded-lg p-0.5 shadow-2xs">
                <button
                  onClick={() => { setActiveUpdatesTab('whatsapp'); setCurrentUpdateIndex(0); }}
                  className={`px-2 py-0.5 text-[11px] font-bold rounded cursor-pointer transition-colors ${activeUpdatesTab === 'whatsapp'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-gray-600 dark:text-gray-300 hover:text-emerald-600'
                    }`}
                >
                  WhatsApp
                </button>
                <button
                  onClick={() => { setActiveUpdatesTab('website'); setCurrentUpdateIndex(0); }}
                  className={`px-2 py-0.5 text-[11px] font-bold rounded cursor-pointer transition-colors ${activeUpdatesTab === 'website'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-gray-600 dark:text-gray-300 hover:text-emerald-600'
                    }`}
                >
                  Legal Updates
                </button>
              </div>
            </div>

            <Link
              to={activeUpdatesTab === 'whatsapp' ? '/whatsapp-updates' : '/updates'}
              className="px-2 py-0.5 bg-white/90 dark:bg-theme-surface border border-emerald-200 dark:border-emerald-800/40 rounded text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1 hover:bg-emerald-50 transition-colors shrink-0"
            >
              See All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Animated Slider of Live Records */}
          <div className="relative overflow-hidden h-[54px] w-full mt-1">
            {currentList.map((update, idx) => (
              <div
                key={update.mongoId || update.id || idx}
                className="absolute inset-0 flex items-start gap-2.5 transition-transform duration-500 ease-in-out w-full"
                style={{ transform: `translateX(${(idx - currentUpdateIndex) * 100}%)` }}
              >
                <div className="w-5 h-5 rounded bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                  {activeUpdatesTab === 'whatsapp' ? <FileText className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                </div>
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-snug line-clamp-2">
                    {update.heading || update.title || update.caption}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1 font-mono"><Calendar className="w-2.5 h-2.5" /> {update.dated || update.date}</span>
                    {update.attachmentName && (
                      <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.2 rounded text-[9px] font-bold truncate max-w-[140px]">
                        📎 {update.attachmentName}
                      </span>
                    )}
                    {update.url && (
                      <a
                        href={update.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 hover:underline inline-flex items-center gap-0.5 text-[9px] font-bold"
                      >
                        Visit Link ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Youtube Channel - Attractive Executive Studio Card with Auto & Manual Rotation */}
        <div 
          className="bg-gradient-to-b from-[#fff1f2] to-[#ffe4e6] dark:from-[#210c10] dark:to-[#17080a] border border-red-200/80 dark:border-red-900/40 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between flex-1"
          onMouseEnter={() => setIsYoutubeHovered(true)}
          onMouseLeave={() => setIsYoutubeHovered(false)}
        >
          <div className="px-3.5 py-2.5 border-b border-red-100 dark:border-red-900/30 flex items-center justify-between bg-white/70 dark:bg-theme-surface/50 backdrop-blur-xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shrink-0 shadow-xs">
                <img src={youtubeLogo} alt="Youtube" className="w-5 h-5 object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-black text-gray-900 dark:text-gray-100 font-heading leading-tight">YouTube Channel</h2>
                  <span className="flex h-1.5 w-1.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                  </span>
                </div>
                {currentVideo.dated ? (
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1 leading-none font-mono mt-0.5">
                    <Calendar className="w-2.5 h-2.5" /> {currentVideo.dated}
                  </p>
                ) : (
                  <p className="text-[10px] text-gray-500 font-medium leading-none mt-0.5">SLD Official Broadcasts</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {activeYoutubeList.length > 1 && (
                <div className="flex items-center gap-1 bg-white/90 dark:bg-theme-surface border border-red-200/80 dark:border-red-900/40 rounded-md px-1 py-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={handlePrevYoutube}
                    title="Previous Video"
                    className="p-0.5 hover:bg-red-50 dark:hover:bg-red-950/40 rounded text-gray-600 dark:text-gray-300 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <span className="text-[10px] font-mono font-bold text-gray-600 dark:text-gray-300 px-0.5 select-none">
                    {(currentYoutubeIndex % activeYoutubeList.length) + 1}/{activeYoutubeList.length}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextYoutube}
                    title="Next Video"
                    className="p-0.5 hover:bg-red-50 dark:hover:bg-red-950/40 rounded text-gray-600 dark:text-gray-300 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}
              <Link
                to="/youtube-updates"
                className="px-2 py-0.5 bg-white/90 dark:bg-theme-surface border border-red-200 dark:border-red-800/40 rounded text-[11px] font-bold text-red-600 dark:text-red-400 flex items-center gap-1 hover:bg-red-50 hover:border-red-300 transition-colors shadow-2xs"
              >
                See All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          <div className="p-3 pt-2 flex-1 flex flex-col justify-between">
            <a
              href={currentVideo.url || 'https://www.youtube.com'}
              target="_blank"
              rel="noreferrer"
              className="group block cursor-pointer"
              title="Click to watch on YouTube"
            >
              {/* 16:9 Uncut Video Player Frame */}
              <div className="relative w-full aspect-[16/9] bg-black rounded-xl overflow-hidden border border-red-200/70 dark:border-red-950 shadow-sm">
                <img
                  key={currentVideo.url || currentVideo.caption}
                  src={youtubeThumbnail}
                  alt={currentVideo.caption || "Youtube Thumbnail"}
                  className="w-full h-full object-contain bg-black transition-all duration-500 group-hover:scale-102"
                />

                {/* Badges on Top */}
                <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
                  <span className="px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-md text-white font-mono text-[9px] font-bold uppercase border border-white/20">
                    HD Video
                  </span>
                </div>
                <div className="absolute top-2 right-2 z-10">
                  <span className="px-1.5 py-0.5 rounded bg-red-600 text-white font-mono text-[9px] font-bold shadow-xs">
                    YouTube
                  </span>
                </div>

                {/* Center Play Button Overlay */}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/35 transition-colors flex items-center justify-center">
                  <div className="w-11 h-11 bg-red-600 rounded-full flex items-center justify-center text-white shadow-xl group-hover:scale-110 group-hover:bg-red-500 transition-all border-2 border-white/90">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current ml-0.5"><path d="M8 5v14l11-7z" /></svg>
                  </div>
                </div>

                {/* Bottom Segment Progress Bar */}
                {activeYoutubeList.length > 1 && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50 flex z-10">
                    {activeYoutubeList.map((_, i) => (
                      <div
                        key={i}
                        className={`h-full flex-1 transition-all duration-300 ${
                          i === (currentYoutubeIndex % activeYoutubeList.length) ? 'bg-red-500' : 'bg-white/20'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Dedicated Clear & Highly Readable Title Container */}
              <div className="mt-2.5 px-0.5 flex flex-col gap-1">
                <p
                  className="text-xs sm:text-[13px] font-heading font-extrabold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors min-h-[2.4em]"
                  title={currentVideo.caption}
                >
                  {currentVideo.caption}
                </p>
                <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 pt-0.5">
                  <span className="font-medium">SLD System Channel</span>
                  <span className="text-red-600 dark:text-red-400 font-bold group-hover:underline inline-flex items-center gap-0.5">
                    Watch on YouTube ↗
                  </span>
                </div>
              </div>
            </a>
          </div>
        </div>

      </div>

      {/* Contact Services Modal - Attached Picture */}
      <Modal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        title="Emails & WhatsApp Services"
        subtitle="SLD System Updating Service Through Email & WhatsApp"
        icon={Mail}
        maxWidth="max-w-4xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-theme-muted font-medium">
              Official Email & WhatsApp Service Announcement
            </span>
            <a
              href={sldEmailWhatsappBanner}
              download="SLD_Email_WhatsApp_Service.jpg"
              className="flex items-center gap-1.5 px-4 py-2 bg-[#f15a24] hover:bg-[#d44e35] text-white rounded-lg transition-colors font-bold text-xs shadow-sm"
            >
              <Download className="w-3.5 h-3.5" /> Download Announcement
            </a>
          </div>
        }
      >
        <div className="p-2 sm:p-3 bg-gray-50 dark:bg-black/20 flex flex-col items-center justify-center">
          <img
            src={sldEmailWhatsappBanner}
            alt="SLD System Updating Service Through Email & WhatsApp"
            className="w-full max-h-[75vh] object-contain rounded-xl border border-theme-border shadow-sm"
          />
        </div>
      </Modal>

      {/* About Us Modal */}
      <AboutUsModal isOpen={isAboutUsModalOpen} onClose={() => setIsAboutUsModalOpen(false)} />

      {/* Brochure Modal */}
      <Modal
        isOpen={isBrochureModalOpen}
        onClose={() => setIsBrochureModalOpen(false)}
        title="SLD Brochure"
        subtitle="SLD System Official Brochure"
        icon={BookOpen}
        maxWidth="max-w-4xl"
        footer={
          <a
            href={sldBroucher}
            download="SLD_Brochure.png"
            className="flex items-center gap-2 px-4 py-2 bg-[#f15a24] text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm"
          >
            <Download className="w-4 h-4" /> Download Brochure
          </a>
        }
      >
        <div className="p-4 bg-gray-50 dark:bg-black/20 flex justify-center items-center min-h-[50vh]">
          <img
            src={sldBroucher}
            alt="SLD Brochure"
            className="max-w-full max-h-[70vh] object-contain rounded border border-gray-200 dark:border-theme-border shadow-sm"
          />
        </div>
      </Modal>
    </div>
  );
};

export default InfoWidgets;
