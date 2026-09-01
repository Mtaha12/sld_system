import React from 'react';
import { Info, Building, ShieldCheck, Users, Target, Briefcase, Award } from 'lucide-react';
import Modal from '../../../components/ui/Modal';

const SectionCard = ({ title, icon: Icon, children }) => (
  <div className="bg-white dark:bg-theme-surface border border-theme-border rounded-xl p-5 shadow-sm">
    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-theme-border">
      <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-[#f15a24] flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h3>
    </div>
    <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
      {children}
    </div>
  </div>
);

const AboutUsModal = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="About SLD System"
      subtitle="Super Law Data System Information & Strategy"
      icon={Info}
      maxWidth="max-w-6xl"
    >
      <div className="p-2 h-[75vh] overflow-y-auto custom-scrollbar pr-2">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column */}
          <div className="space-y-6">
            <SectionCard title="Company Information" icon={Building}>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#f15a24] mt-1.5 shrink-0" />
                  <span className="font-semibold text-gray-900 dark:text-gray-100">Super Law Data System (SLD System).</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#f15a24] mt-1.5 shrink-0" />
                  <span>Head Office: Office # SO-6&7, 2nd Floor, City Centre, Bank Road, Saddar, Rawalpindi.</span>
                </li>
              </ul>
            </SectionCard>

            <SectionCard title="Strategic Partners & Advisors" icon={ShieldCheck}>
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase text-[#f15a24] tracking-wider mb-2">Strategic Partners</h4>
                  <ul className="space-y-1">
                    <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-gray-400"></div>Tauqeer Tansser & Co.</li>
                    <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-gray-400"></div>Naeem Law Associates</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase text-[#f15a24] tracking-wider mb-2">Hon'ble Advisors</h4>
                  <ul className="space-y-1">
                    <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-gray-400"></div>Mr. Tauqeer Bukhari <span className="text-theme-muted">(Advocate Supreme Court)</span></li>
                    <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-gray-400"></div>Mr. Tanseer Bukhari <span className="text-theme-muted">(Advocate Supreme Court)</span></li>
                    <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-gray-400"></div>Mr. Ch. Naeem ul Haq <span className="text-theme-muted">(Advocate Supreme Court)</span></li>
                  </ul>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Our Team" icon={Users}>
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase text-[#f15a24] tracking-wider mb-2">Marketing Executive</h4>
                  <ul className="space-y-1">
                    <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-gray-400"></div>Haroon Ahmad Rafiq</li>
                    <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-gray-400"></div>Muhammad Yasin Aziz</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase text-[#f15a24] tracking-wider mb-2">I.T. Experts</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                    <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-gray-400 shrink-0"></div>Haroon Ahmad Rafiq <span className="text-theme-muted text-[10px] ml-1">(SLD System)</span></li>
                    <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-gray-400 shrink-0"></div>Mr. Shahzad Ahmad <span className="text-theme-muted text-[10px] ml-1">(Genius Core)</span></li>
                    <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-gray-400 shrink-0"></div>Mr. Mehfooz Ahmad <span className="text-theme-muted text-[10px] ml-1">(Giga Solutions)</span></li>
                    <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-gray-400 shrink-0"></div>Madad Hussain Shah</li>
                    <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-gray-400 shrink-0"></div>Tufail Ahmad Khan</li>
                    <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-gray-400 shrink-0"></div>Tahir Mehmood</li>
                    <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-gray-400 shrink-0"></div>Sajjad Ahmad</li>
                    <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-gray-400 shrink-0"></div>Hammad Ahmad</li>
                    <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-gray-400 shrink-0"></div>Ms. Amrozia Arshad</li>
                    <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-gray-400 shrink-0"></div>Ms. Maryam Ehsan</li>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <SectionCard title="Company Strategy" icon={Target}>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#f15a24] mt-1.5 shrink-0" />
                  <p><strong className="text-gray-900 dark:text-gray-100">Purpose:</strong> To be a leader by providing enhanced services, relationship and profitability.</p>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#f15a24] mt-1.5 shrink-0" />
                  <p><strong className="text-gray-900 dark:text-gray-100">Vision:</strong> To provide quality services that exceeds the expectations of our esteemed customers.</p>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#f15a24] mt-1.5 shrink-0" />
                  <p><strong className="text-gray-900 dark:text-gray-100">Mission statement:</strong> To build long term relationships with our customers and clients and provide exceptional customer services by pursuing business through innovation and advanced technology.</p>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#f15a24] mt-1.5 shrink-0" />
                  <p><strong className="text-gray-900 dark:text-gray-100">Core values:</strong> We believe in treating our customers with respect and faith.</p>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#f15a24] mt-1.5 shrink-0" />
                  <p>We grow through creativity, invention and innovation.</p>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#f15a24] mt-1.5 shrink-0" />
                  <p>We integrate honesty, integrity and business ethics into all aspects of our business functioning.</p>
                </li>
              </ul>
            </SectionCard>

            <SectionCard title="Our Esteemed Clients" icon={Award}>
              <p className="font-bold text-[#f15a24] mb-3">
                Above 1,000 nos. throughout Pakistan, some are listed below:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-gray-800 dark:text-gray-200">SUPREME COURT OF PAKISTAN (AGP)</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">FEDERAL BOARD OF REVENUE</span>
                <span>LAHORE HIGH COURT (AGP)</span>
                <span>PUNJAB REVENUE AUTHORITY</span>
                <span>KARACHI HIGH COURT (AGP)</span>
                <span>RAWALPINDI-ISLAMABAD TAX BAR</span>
                <span>PESHAWAR HIGH COURT (AGP)</span>
                <span>KARACHI TAX BAR ASSOCIATION</span>
                
                <span>LTO, ISLAMABAD / LAHORE / KARACHI</span>
                <span>LAHORE TAX BAR ASSOCIATION</span>
                <span>ITAT, ISLAMABAD / LAHORE / KARACHI</span>
                <span>FAISALABAD TAX BAR ASSOCIATION</span>
                <span>RTO, KARACHI / ISLAMABAD / RAWALPINDI</span>
                <span>GUJRANWALA TAX BAR ASSOCIATION</span>
                <span>RTO, PESHAWAR / LAHORE / FAISALABAD</span>
                <span>PESHAWAR TAX BAR ASSOCIATION</span>
                <span>RTO, QUETTA / SIALKOT / HYDERABAD</span>
                
                <span className="col-span-1 sm:col-span-2 border-t border-theme-border my-1"></span>
                
                <span>A.F. FERGUSON (CA)</span>
                <span>AVAIS HYDER LIAQUAT NAUMAN (CA)</span>
                <span>KPMG (CA)</span>
                <span>HORWATH HUSSAIN CHAUDHURY (CA)</span>
                <span>MUNIF ZIA-UD-DIN & CO. (CA)</span>
                <span>AMIR ALAM & CO. (CA)</span>
                <span>UHY (HASSAN NAEEM & CO. (CA)</span>
                <span>FARUQ ALI & CO. (CA)</span>
                <span>E.Y. (EARNST YOUNG) (CA)</span>
                <span>SITARA TEXTILE MILLS</span>
                <span>NAVEED ZAFAR ASHFAQ & JAFFERY (CA)</span>
                <span>PEARL CONTINENTAL HOTEL, Pindi</span>
                <span>DELOITTE YOUSUF ADIL (CA)</span>
                <span>SERENA HOTEL</span>
                <span>ANJUM ASIM SHAHID RAHMAN (CA)</span>
                <span>ATTOCK GEN. LIMITED</span>
                <span>ALL PAKISTAN TEXTILES MILLS ASSOC.</span>
                <span>ZHONG TELECOM, ISLAMABAD</span>
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AboutUsModal;
