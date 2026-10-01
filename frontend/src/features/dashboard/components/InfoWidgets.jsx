import { useState, useEffect } from 'react';
import { 
  FileText, Calendar, Building2, MapPin, Mail, Phone, 
  Info, BookOpen, MessageSquare, Video, Play, MessageCircle, ArrowRight, Check, Copy, User, Building, Download, Globe, ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import whatsappLogo from '../../../assets/branding/dashboard/whatsapp.png';
import youtubeLogo from '../../../assets/branding/dashboard/youtube.png';
import sldBroucher from '../../../assets/branding/dashboard/sld_broucher.png';
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
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-theme-surface-hover transition-colors group">
      <div className="mt-0.5 text-[#f15a24]">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-theme-muted font-medium mb-0.5">{label}</p>
        <p className="text-sm text-theme-main font-semibold break-words">{value}</p>
      </div>
      <button 
        onClick={handleCopy}
        title="Copy to clipboard"
        className="p-1.5 rounded-md text-gray-400 hover:text-[#f15a24] hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all opacity-100"
      >
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
};

const AccountRow = ({ b, isLast }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(b.acc);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex items-start justify-between gap-2 group ${!isLast ? 'border-b border-orange-100 dark:border-orange-900/30 pb-4' : ''}`}>
      <div className="flex gap-3">
        <Building2 className="w-4 h-4 text-[#f15a24] mt-1 shrink-0" />
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{b.bank}</span>
          {b.branch && <span className="text-[11px] text-gray-500 leading-tight mt-0.5">{b.branch}</span>}
        </div>
      </div>
      <div className="flex flex-col items-end text-right">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{b.title}</span>
        <button 
          onClick={handleCopy}
          title="Copy Account Number"
          className="flex items-center gap-1.5 mt-0.5 cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-900/20 px-1.5 py-0.5 -mr-1.5 rounded transition-colors focus:outline-none"
        >
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {b.prefix || 'Account #'} {b.acc}
          </span>
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-gray-400 opacity-100" />}
        </button>
      </div>
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

  const latestVideo = youtubeUpdates.length > 0 ? youtubeUpdates[0] : fallbackYoutube;
  const youtubeThumbnail = getYoutubeThumbnail(latestVideo.url, latestVideo.photo);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
      
      {/* Subscription Fee Column */}
      <div className="bg-[#fff7ed] dark:bg-[#fff7ed]/5 border border-orange-100 dark:border-orange-900/30 rounded-xl overflow-hidden flex flex-col shadow-sm">
        <div className="p-5 border-b border-orange-100 dark:border-orange-900/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-[#f15a24]">
            <FileText className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Subscription Fee</h2>
        </div>
        
        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
            <Calendar className="w-4 h-4" />
            31 AUG 2026
          </div>
          
          <div className="bg-orange-100/50 dark:bg-orange-500/10 rounded-lg p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#f15a24] text-white flex items-center justify-center font-bold text-sm shrink-0">
              Rs.
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Rs.30,000<span className="text-base font-normal text-gray-500">/Annually</span>
            </div>
          </div>
          
          <p className="text-sm font-semibold text-[#f15a24] leading-relaxed">
            Pay your subscription fee only in the company's following account, otherwise Company will not be responsible.
          </p>
          
          <div className="flex flex-col gap-4 mt-2">
            {[
              { bank: 'Allied Bank Limited', branch: 'The Mall Road, Saddar, Rawalpindi', title: 'Super Law Data System', acc: '11050010037270730029' },
              { bank: 'MCB Bank Limited', branch: 'Privilege Branch, Rawalpindi Cantt', title: 'Super Law Data System', acc: 'PK84MUCB1123909311000715', prefix: 'IBAN #' },
              { bank: 'United Bank Limited', branch: 'The Mall Road, Saddar, Rawalpindi', title: 'Super Law Data System', acc: '1491-222820349' },
              { bank: 'Jazz Cash / Easy Paisa', branch: '', title: 'Haroon Ahmad Rafiq', acc: '03215390007' }
            ].map((b, i, arr) => (
              <AccountRow key={i} b={b} isLast={i === arr.length - 1} />
            ))}
          </div>
        </div>
        
        <div className="mt-auto border-t border-orange-100 dark:border-orange-900/30">
          <div className="p-4 bg-white/50 dark:bg-theme-surface">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 font-medium">
              <MapPin className="w-4 h-4 shrink-0 text-[#f15a24]" />
              <span className="leading-snug">Head Office: Office # SO-6&7, 2nd Floor, City Centre, Bank Road, Saddar, Rawalpindi</span>
            </div>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-theme-border">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                <Phone className="w-3.5 h-3.5 text-[#f15a24]" />
                051-8315912
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                <FileText className="w-3.5 h-3.5 text-[#f15a24]" />
                0325-8986393
              </div>
            </div>
          </div>
          
          {/* Footer Links */}
          <div className="p-4 flex items-center justify-between">
            <button 
              onClick={() => setIsAboutUsModalOpen(true)}
              className="flex items-center gap-2 text-xs font-bold text-gray-800 dark:text-gray-200 hover:text-blue-600 transition-colors"
            >
              <Info className="w-4 h-4" /> About Us
            </button>
            <button 
              onClick={() => setIsBrochureModalOpen(true)}
              className="flex items-center gap-2 text-xs font-bold text-gray-800 dark:text-gray-200 hover:text-blue-600 transition-colors"
            >
              <BookOpen className="w-4 h-4" /> SLD Brochure
            </button></div>
        </div>
      </div>

      {/* Contact Us Column */}
      <div className="bg-[#eff6ff] dark:bg-[#eff6ff]/5 border border-blue-100 dark:border-blue-900/30 rounded-xl overflow-hidden flex flex-col shadow-sm">
        <div className="p-5 border-b border-blue-100 dark:border-blue-900/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <Phone className="w-5 h-5 fill-current" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Contact Us</h2>
        </div>
        
        <div className="flex flex-col flex-1">
          {/* Contact 1 */}
          <div className="p-5 border-b border-blue-100 dark:border-blue-900/30 flex flex-col gap-4">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold text-gray-900 dark:text-gray-100">Haroon Ahmad Rafiq</span>
                <div className="flex items-start gap-2 mt-2">
                  <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">Head Office # SO-6 & 7, 2nd Floor, City Centre, Bank Road, Saddar-Rawalpindi</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 mt-2">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                <Mail className="w-4 h-4 text-blue-600 fill-current" />
                info@sldsystem.com
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                <Phone className="w-4 h-4 text-blue-600 fill-current" />
                0321-5390007-8, 051-8315912
              </div>
            </div>
          </div>
          
          {/* Contact 2 */}
          <div className="p-5 border-b border-blue-100 dark:border-blue-900/30 flex flex-col gap-4 flex-1">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold text-gray-900 dark:text-gray-100">Abdul Sami Abbasi</span>
                <span className="text-xs font-semibold text-blue-600 mt-0.5">Sales Manager</span>
                <div className="flex items-start gap-2 mt-2">
                  <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">Karachi Branch Office No. 408, 4th Floor, Al-Ayesha Chambers, Sharar-e-Iraq, Near Passport Office, Saddar-Karachi</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-between gap-4 mt-2">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                <Mail className="w-4 h-4 text-blue-600 fill-current" />
                sami@sldsystem.com
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                <Phone className="w-4 h-4 text-blue-600 fill-current" />
                0325-8986393
              </div>
            </div>
          </div>
          
          {/* Footer Links */}
          <div className="p-4 flex items-center justify-between">
            <button 
              onClick={() => setIsAboutUsModalOpen(true)}
              className="flex items-center gap-2 text-xs font-bold text-gray-800 dark:text-gray-200 hover:text-blue-600 transition-colors"
            >
              <Info className="w-4 h-4" /> About Us
            </button>
            <button 
              onClick={() => setIsBrochureModalOpen(true)}
              className="flex items-center gap-2 text-xs font-bold text-gray-800 dark:text-gray-200 hover:text-blue-600 transition-colors"
            >
              <BookOpen className="w-4 h-4" /> SLD Brochure
            </button>
            <button 
              onClick={() => setIsContactModalOpen(true)}
              className="flex flex-col sm:flex-row items-center gap-2 text-xs font-bold text-gray-800 dark:text-gray-200 hover:text-blue-600 text-center sm:text-left leading-tight transition-colors"
            >
              <Mail className="w-4 h-4" /> <span>Emails &<br/>Whatsapp Services</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right Column (Live Updates & Youtube) */}
      <div className="flex flex-col gap-6">
        
        {/* Updates Card (Whatsapp Updates & Manage Updates) */}
        <div className="bg-[#f2fcf5] dark:bg-[#f2fcf5]/5 border border-green-100 dark:border-green-900/30 rounded-xl overflow-hidden shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                {activeUpdatesTab === 'whatsapp' ? (
                  <img src={whatsappLogo} alt="Whatsapp" className="w-7 h-7 object-contain" />
                ) : (
                  <Globe className="w-6 h-6 text-emerald-600" />
                )}
              </div>
              
              {/* Tab Selector: WhatsApp vs Website Updates */}
              <div className="flex items-center bg-white dark:bg-theme-surface border border-gray-200 dark:border-theme-border rounded-lg p-0.5 shadow-xs">
                <button
                  onClick={() => { setActiveUpdatesTab('whatsapp'); setCurrentUpdateIndex(0); }}
                  className={`px-2.5 py-1 text-xs font-bold rounded cursor-pointer transition-colors ${
                    activeUpdatesTab === 'whatsapp'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-gray-600 dark:text-gray-300 hover:text-emerald-600'
                  }`}
                >
                  WhatsApp
                </button>
                <button
                  onClick={() => { setActiveUpdatesTab('website'); setCurrentUpdateIndex(0); }}
                  className={`px-2.5 py-1 text-xs font-bold rounded cursor-pointer transition-colors ${
                    activeUpdatesTab === 'website'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-gray-600 dark:text-gray-300 hover:text-emerald-600'
                  }`}
                >
                  Manage Updates
                </button>
              </div>
            </div>

            <Link 
              to={activeUpdatesTab === 'whatsapp' ? '/whatsapp-updates' : '/manage-updates'}
              className="px-2.5 py-1 bg-white dark:bg-theme-surface border border-gray-200 dark:border-theme-border rounded text-xs font-bold text-green-700 dark:text-green-400 flex items-center gap-1 hover:bg-green-50 transition-colors shrink-0"
            >
              See All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          
          {/* Animated Slider of Live Records */}
          <div className="relative overflow-hidden h-[66px] w-full mt-1">
            {currentList.map((update, idx) => (
              <div 
                key={update.mongoId || update.id || idx}
                className="absolute inset-0 flex items-start gap-3 transition-transform duration-500 ease-in-out w-full"
                style={{ transform: `translateX(${(idx - currentUpdateIndex) * 100}%)` }}
              >
                <div className="w-6 h-6 rounded bg-green-100 dark:bg-green-950/40 flex items-center justify-center text-green-600 shrink-0 mt-0.5">
                  {activeUpdatesTab === 'whatsapp' ? <FileText className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                </div>
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 leading-snug line-clamp-2">
                    {update.heading || update.title || update.caption}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {update.dated || update.date}</span>
                    {update.attachmentName && (
                      <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded text-[10px] font-semibold truncate max-w-[150px]">
                        📎 {update.attachmentName}
                      </span>
                    )}
                    {update.url && (
                      <a 
                        href={update.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 hover:underline inline-flex items-center gap-0.5 text-[10px] font-semibold"
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

        {/* Youtube Channel */}
        <div className="bg-[#fff1f2] dark:bg-[#fff1f2]/5 border border-red-100 dark:border-red-900/30 rounded-xl overflow-hidden shadow-sm flex-1 flex flex-col">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                <img src={youtubeLogo} alt="Youtube" className="w-8 h-8 object-contain" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Youtube Channel</h2>
                {latestVideo.dated && (
                  <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3" /> {latestVideo.dated}
                  </p>
                )}
              </div>
            </div>
            <Link 
              to="/youtube-updates"
              className="px-3 py-1 bg-white dark:bg-theme-surface border border-gray-200 dark:border-theme-border rounded text-xs font-bold text-red-600 flex items-center gap-1 hover:bg-red-50 transition-colors"
            >
              See All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          
          <div className="p-4 pt-0 flex-1 flex flex-col">
            <a 
              href={latestVideo.url || 'https://www.youtube.com'} 
              target="_blank" 
              rel="noreferrer"
              className="relative w-full flex-1 rounded-xl overflow-hidden group cursor-pointer min-h-[180px] block"
              title="Click to watch on YouTube"
            >
              <img 
                src={youtubeThumbnail} 
                alt={latestVideo.caption || "Youtube Thumbnail"} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent flex flex-col justify-end p-4">
                <div className="absolute inset-0 flex items-center justify-center opacity-85 group-hover:opacity-100 group-hover:scale-110 transition-all">
                  <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg">
                    <Play className="w-5 h-5 fill-current ml-1" />
                  </div>
                </div>
                <div className="relative z-10">
                  <p className="text-white font-semibold text-sm leading-snug line-clamp-2 drop-shadow-sm">
                    {latestVideo.caption}
                  </p>
                  <span className="text-[11px] text-gray-300 mt-1 inline-flex items-center gap-1">
                    Watch on YouTube ↗
                  </span>
                </div>
              </div>
            </a>
          </div>
        </div>
        
      </div>

      {/* Contact Services Modal */}
      <Modal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        title="Emails & Whatsapp Services"
        subtitle="Get in touch with us for support and services"
        icon={Mail}
        maxWidth="max-w-4xl"
      >
        <div className="flex flex-col md:flex-row gap-8 p-2">
          {/* Left Side: Contact Details */}
          <div className="flex-1 space-y-2">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5 text-[#f15a24]" />
              Contact Info
            </h3>
            
            <div className="grid grid-cols-1 gap-1 bg-white dark:bg-theme-surface border border-theme-border rounded-xl p-4 shadow-sm">
              <CopyableDetail icon={User} label="Name" value="Haroon Ahmad Rafiq" />
              <div className="h-px bg-theme-border/50 mx-3 my-1"></div>
              
              <CopyableDetail icon={Building} label="Company" value="SLD System (Super Law Data System)" />
              <div className="h-px bg-theme-border/50 mx-3 my-1"></div>
              
              <CopyableDetail icon={MapPin} label="Head Office" value="Head Office # SO-6 & 7, 2nd Floor, City Centre, Bank Road, Saddar-Rawalpindi" />
              <div className="h-px bg-theme-border/50 mx-3 my-1"></div>
              
              <CopyableDetail icon={Phone} label="Cell" value="0321-5390007 & 8" />
              <div className="h-px bg-theme-border/50 mx-3 my-1"></div>
              
              <CopyableDetail icon={Phone} label="Tel" value="051-8315912" />
              <div className="h-px bg-theme-border/50 mx-3 my-1"></div>
              
              <CopyableDetail icon={Mail} label="Email" value="info@sldsystem.com" />
            </div>
          </div>

          {/* Right Side: Message */}
          <div className="md:w-[400px] flex items-center border-t md:border-t-0 md:border-l border-theme-border pt-6 md:pt-0 md:pl-8">
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-xl p-8 relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 p-4 opacity-10 dark:opacity-20 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500">
                <Mail className="w-32 h-32 text-blue-600" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-blue-800 dark:text-blue-400 leading-snug relative z-10">
                To receive updates via email, please provide your email address so we can activate this service for you.
              </h3>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-500 mt-6 relative z-10">
                Thank you!
              </p>
            </div>
          </div>
        </div>
      </Modal>

      {/* About Us Modal */}
      <AboutUsModal isOpen={isAboutUsModalOpen} onClose={() => setIsAboutUsModalOpen(false)} />

      {/* Brochure Modal */}
      <Modal
        isOpen={isBrochureModalOpen}
        onClose={() => setIsBrochureModalOpen(false)}
        title="SLD Brochure"
        subtitle="Super Law Data System Official Brochure"
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
