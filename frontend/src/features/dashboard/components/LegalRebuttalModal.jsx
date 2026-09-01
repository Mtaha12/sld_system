import React from 'react';
import { AlertOctagon, Scale, ShieldAlert, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import Modal from '../../../components/ui/Modal';

const SectionTitle = ({ children, icon: Icon }) => (
  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2 border-b border-theme-border pb-2 mt-6">
    <Icon className="w-5 h-5 text-[#f15a24]" />
    {children}
  </h3>
);

const LegalRebuttalModal = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Legal Rebuttal & Notice of Infringement"
      subtitle="Official Statement from SLD System"
      icon={AlertOctagon}
      maxWidth="max-w-4xl"
    >
      <div className="p-2 h-[75vh] overflow-y-auto custom-scrollbar pr-4 text-sm text-gray-700 dark:text-gray-300 space-y-4">
        
        <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 p-4 rounded-xl">
          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Respected Sir,</p>
          <p className="leading-relaxed">
            This statement is issued in direct response to the fraudulent communications (emails, WhatsApp messages, and marketing) circulated by Shahid Legal Group (comprising Shahid Sharif, Khalil, and Atia Amjad) — led by a former salesman of SLDSystem.com. Since 2025, this group has been engaged in willful misrepresentation and cyber fraud by operating a counterfeit and deceptive duplicate website under the domain <a href="http://www.sldsystempk.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">www.sldsystempk.com</a>.
          </p>
          <p className="leading-relaxed mt-2">
            This fake domain is a deliberate imitation of our established and lawful platform <a href="http://www.sldsystem.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">www.sldsystem.com</a>, which has been in continuous operation since 2015. Their scheme constitutes fraudulent misrepresentation, passing off, trademark infringement, defamation, and unlawful appropriation of intellectual property. This group is further exposed by its lack of any registered company accounts, use of a fake address, and complete absence of a verifiable landline contact number — clear hallmarks of an illegitimate and fraudulent enterprise.
          </p>
        </div>

        <SectionTitle icon={AlertTriangle}>1. Fraudulent Ownership Claims & Passing Off</SectionTitle>
        <p className="leading-relaxed">
          Mr. Shahid Sharif has made false, malicious, and fabricated assertions of ownership over SLDSystem.com without producing a single shred of admissible evidence. Despite his legal background, he has failed to provide:
        </p>
        <ul className="space-y-2 mt-2 ml-2">
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#f15a24] mt-1.5 shrink-0" />
            <span>Any copyright, trademark, or ownership documentation;</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#f15a24] mt-1.5 shrink-0" />
            <span>Any corporate records, financial accounts, or administrative control demonstrating authority over SLDSystem.com;</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#f15a24] mt-1.5 shrink-0" />
            <span>Any contractual or legal rights that would justify his claims.</span>
          </li>
        </ul>
        <p className="leading-relaxed mt-2">
          His past position was limited to sales functions only, with no stake in ownership, management, or operation of SLDSystem.com. Yet, through fraudulent misrepresentation, he is misleading the public by claiming that the genuine domain www.sldsystem.com is “closed” and replaced by his deceptive clone www.sldsystempk.com (differing only by the suffix “pk”). This conduct constitutes passing off and is actionable under intellectual property and cybercrime laws.
        </p>

        <SectionTitle icon={ShieldAlert}>2. Trademark Infringement & Intellectual Property Theft</SectionTitle>
        <p className="leading-relaxed">
          We possess conclusive documentary evidence that Shahid Sharif has engaged in the systematic theft and unlawful duplication of our:
        </p>
        <ul className="space-y-2 mt-2 ml-2">
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#f15a24] mt-1.5 shrink-0" />
            <span>Website design and layout (copyright infringement);</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#f15a24] mt-1.5 shrink-0" />
            <span>Proprietary content and confidential data (intellectual property theft);</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#f15a24] mt-1.5 shrink-0" />
            <span>Daily updates and case law database (ongoing misappropriation).</span>
          </li>
        </ul>
        <p className="leading-relaxed mt-2">
          His counterfeit site is nothing more than a mirror copy of our platform, maintained through continuous infringement and cyber theft. Such conduct not only violates the Copyright Ordinance, 1962 and the Trademarks Ordinance, 2001, but also falls within the ambit of cyber fraud and electronic forgery under the Prevention of Electronic Crimes Act, 2016 (PECA).
        </p>

        <SectionTitle icon={Scale}>3. Breach of Professional Ethics & Legal Misconduct</SectionTitle>
        <p className="leading-relaxed">
          As a licensed lawyer, Shahid Sharif is bound to uphold the highest standards of integrity. Instead, his actions demonstrate:
        </p>
        <ul className="space-y-2 mt-2 ml-2">
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#f15a24] mt-1.5 shrink-0" />
            <span>Fraudulent misrepresentation by asserting ownership without legal proof;</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#f15a24] mt-1.5 shrink-0" />
            <span>Unethical conduct and professional misconduct, in violation of his duties as an officer of the court;</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#f15a24] mt-1.5 shrink-0" />
            <span>Deceptive practices and fraudulent claims, legally meaningless in any judicial or regulatory forum.</span>
          </li>
        </ul>
        <p className="leading-relaxed mt-2">
          His deliberate and persistent infringement constitutes gross professional misconduct, warranting disciplinary action by the Pakistan Bar Council and criminal prosecution under applicable laws.
        </p>

        <SectionTitle icon={FileText}>4. Defamation and Malicious Conduct</SectionTitle>
        <p className="leading-relaxed">
          The communications disseminated by Shahid Sharif via email and WhatsApp are defamatory, malicious, and calculated to harm the reputation of SLD System and its legitimate owner. These actions constitute a deliberate campaign of character assassination carried out without any factual or legal foundation.
        </p>
        <p className="leading-relaxed">
          We urge all clients, stakeholders, and the public to recognize that these claims are entirely baseless and unsupported by any evidence. Legal proceedings against Mr. Sharif and his entity (SLG Group) are already actively underway. To date, he has failed to provide any proof whatsoever for his spurious claims of ownership in the judicial forum.
        </p>
        <p className="leading-relaxed">
          We are confident that the competent authorities will take appropriate measures, including:
        </p>
        <ul className="space-y-2 mt-2 ml-2">
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#f15a24] mt-1.5 shrink-0" />
            <span>The removal of the fraudulent website;</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#f15a24] mt-1.5 shrink-0" />
            <span>Prosecution for defamation, cyber fraud, and intellectual property theft.</span>
          </li>
        </ul>
        <p className="leading-relaxed mt-2 font-medium text-[#f15a24]">
          We strongly advise against any financial or contractual engagement with www.sldsystempk.com, as it is an unauthorized entity built upon stolen intellectual property.
        </p>

        <SectionTitle icon={CheckCircle}>Conclusion</SectionTitle>
        <p className="leading-relaxed font-semibold text-gray-900 dark:text-gray-100">
          We reaffirm that the rightful and legal ownership of the SLD System brand and all its associated intellectual property rests exclusively with its legitimate founders.
        </p>
        <p className="leading-relaxed mt-2">
          We strongly advise everyone to disregard the deceptive and unauthorized communications circulated by Shahid Sharif and to continue accessing our services only through our official domain: <a href="http://www.sldsystem.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">www.sldsystem.com</a>.
        </p>
        <p className="leading-relaxed mt-2">
          Your trust and support remain paramount. We are fully committed to safeguarding the integrity, reliability, and authenticity of the SLD System brand and to delivering genuine, authoritative, and original content to our valued clients.
        </p>

        <div className="mt-8 pt-6 border-t border-theme-border bg-gray-50 dark:bg-theme-surface-hover rounded-xl p-6 flex flex-col sm:flex-row justify-between items-start gap-6">
          <div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">Haroon Ahmad</h4>
            <p className="text-[#f15a24] font-semibold text-sm mb-3">CEO, SLDSystem.com</p>
            
            <div className="space-y-1.5 text-sm">
              <p className="flex items-center gap-2">
                <span className="font-semibold w-16">Cell:</span>
                0321-5390007 & 8
              </p>
              <p className="flex items-center gap-2">
                <span className="font-semibold w-16">Tel:</span>
                051-8315912
              </p>
              <p className="flex items-start gap-2">
                <span className="font-semibold w-16 shrink-0">Address:</span>
                <span className="leading-tight">Head Office # SO-6 & 7, 2nd Floor, City Centre,<br/>Bank Road, Saddar-Rawalpindi</span>
              </p>
              <p className="flex items-start gap-2 pt-1">
                <span className="font-semibold w-16 shrink-0">Email:</span>
                <span className="flex flex-col sm:flex-row sm:gap-2">
                  <a href="mailto:info@sldsystem.com" className="text-blue-600 dark:text-blue-400 hover:underline">info@sldsystem.com</a>
                  <span className="hidden sm:inline">/</span>
                  <a href="mailto:superlawdata@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">superlawdata@gmail.com</a>
                </span>
              </p>
            </div>
          </div>
        </div>

      </div>
    </Modal>
  );
};

export default LegalRebuttalModal;
