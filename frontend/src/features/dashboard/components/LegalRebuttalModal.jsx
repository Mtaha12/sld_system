import React from 'react';
import { 
  AlertOctagon, Scale, ShieldAlert, AlertTriangle, 
  CheckCircle, FileText, Landmark, ShieldCheck, 
  Database, UserCheck, Building2 
} from 'lucide-react';
import Modal from '../../../components/ui/Modal';

const SectionHeader = ({ number, title, icon: Icon = FileText }) => (
  <div className="pt-4 pb-2 border-b border-theme-border/70 flex items-center gap-2.5">
    <span className="w-6 h-6 rounded-lg bg-[#f15a24]/10 text-[#f15a24] font-black text-xs flex items-center justify-center shrink-0 border border-[#f15a24]/20 font-mono">
      {number}
    </span>
    <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
      <Icon className="w-4 h-4 text-[#f15a24] shrink-0" />
      <span>{title}</span>
    </h3>
  </div>
);

const LegalRebuttalModal = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="LEGAL REBUTTAL & NOTICE OF INFRINGEMENT"
      subtitle="Rebuttal to False Ownership Claims, Unauthorized Use of SLD Identity, Intellectual Property Infringement, Misleading Representations and Serious Database Accuracy Concerns"
      icon={AlertOctagon}
      maxWidth="max-w-4xl"
    >
      <div className="p-2 h-[75vh] overflow-y-auto custom-scrollbar pr-3 sm:pr-4 text-xs sm:text-sm text-gray-700 dark:text-gray-300 space-y-4 select-text leading-relaxed">
        
        {/* Subject & Opening Salutation */}
        <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 p-4 sm:p-5 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-[#f15a24] font-bold text-xs uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Subject: Rebuttal to False Ownership Claims, Unauthorized Use of SLD Identity, Intellectual Property Infringement, Misleading Representations and Serious Database Accuracy Concerns</span>
          </div>
          <p className="font-bold text-gray-950 dark:text-gray-50 text-sm">Respected Sir,</p>
          <p>
            This statement is issued in direct response to the communications, emails, WhatsApp messages, advertisements, and marketing representations being circulated by Shahid Legal Group (SLG), including Shahid Sharif, Khalil, and Atia Amjad, concerning the ownership, authenticity, and operation of the SLD System.
          </p>
          <p>
            We categorically reject and dispute any representation suggesting that SLDSystem.com has been closed, transferred, replaced, or taken over by Shahid Legal Group or any other person or entity.
          </p>
          <p>
            The genuine SLD System (Super Law Data) has been continuously operating through <a href="http://www.sldsystem.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 font-bold underline">www.sldsystem.com</a> since 2015. The subsequent operation of <a href="http://www.sldsystempk.com" target="_blank" rel="noopener noreferrer" className="text-red-600 dark:text-red-400 font-bold underline">www.sldsystempk.com</a>, together with the reproduction and use of SLD-related material, has resulted in serious disputes concerning ownership, intellectual property, unauthorized copying, passing off, and misleading representations. These matters are now before the competent forums.
          </p>
        </div>

        {/* 1. PENDING PROCEEDINGS BEFORE THE COMPETENT FORUMS */}
        <SectionHeader number="1" title="PENDING PROCEEDINGS BEFORE THE COMPETENT FORUMS" icon={Landmark} />
        <p>
          The dispute is not merely a disagreement based upon competing statements or marketing claims. The matter has already been placed before the competent legal forums.
        </p>
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-stone-900 dark:text-stone-100 font-mono text-xs sm:text-sm font-bold flex items-center gap-2">
          <Scale className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Proceedings concerning the disputed rights and ownership claims are pending before the Islamabad IPO Court in Suit No. 29/2026 dated 10-06-2026.</span>
        </div>
        <p>
          The competent forum is therefore the appropriate place for determination of the disputed rights. No person can establish ownership merely by repeatedly making assertions through emails, WhatsApp messages, advertisements, or a website.
        </p>

        {/* 2. FAILURE TO PROVE OWNERSHIP */}
        <SectionHeader number="2" title="FAILURE TO PROVE OWNERSHIP" icon={AlertTriangle} />
        <p>
          Despite making claims concerning ownership and control of SLD System, no satisfactory documentary evidence establishing lawful ownership or transfer of the SLD System has been produced.
        </p>
        <p>In particular, no valid documentary evidence has been produced demonstrating:</p>
        <ul className="list-disc pl-5 space-y-1 text-gray-800 dark:text-gray-200">
          <li>lawful transfer of ownership of SLD System;</li>
          <li>assignment of the relevant copyright or intellectual-property rights;</li>
          <li>transfer of the SLD trademark or brand;</li>
          <li>acquisition of the SLD business;</li>
          <li>lawful transfer of control over the SLD database;</li>
          <li>ownership of SLDSystem.com; or</li>
          <li>any contractual instrument conferring ownership of SLD System.</li>
        </ul>
        <p>
          A previous employment or sales relationship with SLD System does not, by itself, create ownership rights in the business, website, database, software, copyright, trademark, or proprietary material.
        </p>
        <p className="font-semibold text-gray-900 dark:text-gray-100">
          A claim of ownership is not evidence of ownership. Ownership must be established through legally admissible and verifiable evidence before the competent forum.
        </p>

        {/* 3. COURT-DIRECTED WRITTEN STATEMENT REMAINS PENDING */}
        <SectionHeader number="3" title="COURT-DIRECTED WRITTEN STATEMENT REMAINS PENDING" icon={FileText} />
        <p>
          The Court has required the filing of a Written Statement in the pending proceedings. However, the Written Statement remains pending.
        </p>
        <p>
          Instead of establishing the claimed position through the proper judicial process, the matter has continued to be delayed through procedural means.
        </p>
        <p>
          Any delay in filing the required Written Statement cannot be converted into evidence of ownership. Nor can repeated statements made outside the Court substitute for the documentary evidence and legal position required before the Court.
        </p>
        <p className="font-semibold text-gray-900 dark:text-gray-100">
          The appropriate forum for establishing ownership is the Court—not WhatsApp, email, advertising material, or a modified website.
        </p>

        {/* 4. CHANGE IN THE OWNERSHIP POSITION AND USE OF “SLG” WITH “SLD” */}
        <SectionHeader number="4" title="CHANGE IN THE OWNERSHIP POSITION AND USE OF “SLG” WITH “SLD”" icon={AlertOctagon} />
        <p>
          It is particularly significant that, after failing to establish the alleged ownership of SLD System, the presentation of the competing platform now appears to be shifting toward the use of “SLG” together with “SLD” and SLD-related identifiers, accompanied by certain changes in website presentation, content, and branding.
        </p>
        <p className="font-semibold text-gray-900 dark:text-gray-100">
          Such superficial changes do not establish ownership.
        </p>
        <p>
          Changing a name, adding “SLG,” modifying the design, rearranging pages, changing the appearance of content, or making other minor alterations does not create ownership in material belonging to another party.
        </p>
        <p>
          The relevant question is whether the overall presentation and use of SLD-related identifiers creates confusion or an impression of association with the established SLD System.
        </p>
        <p>
          The original SLD System has been operating since 2015, and its identity, goodwill, database, content, and associated intellectual property have been developed over many years.
        </p>

        {/* 5. UNAUTHORIZED COPYING AND USE OF SLD SYSTEM MATERIAL */}
        <SectionHeader number="5" title="UNAUTHORIZED COPYING AND USE OF SLD SYSTEM MATERIAL" icon={ShieldAlert} />
        <p>
          SLD System has invested substantial time, resources, expertise, and professional effort in developing and maintaining its legal-information platform.
        </p>
        <p>This includes, among other things:</p>
        <ul className="list-disc pl-5 space-y-1 text-gray-800 dark:text-gray-200">
          <li>website structure and presentation;</li>
          <li>legal research material;</li>
          <li>case-law database;</li>
          <li>daily legal updates;</li>
          <li>indexing and classification;</li>
          <li>case references and compilations;</li>
          <li>original drafting and editorial work;</li>
          <li>database organization and maintenance; and</li>
          <li>other proprietary material developed through years of continuous work.</li>
        </ul>
        <p>
          The unauthorized reproduction, mirroring, extraction, adaptation, or commercial use of such material is a serious intellectual-property matter.
        </p>
        <p className="font-semibold text-gray-900 dark:text-gray-100">
          Having access to a copied database does not create ownership of the original database or the intellectual effort invested in creating and maintaining it.
        </p>

        {/* 6. DATA IS APPROXIMATELY TWO MONTHS BEHIND SLD SYSTEM */}
        <SectionHeader number="6" title="DATA IS APPROXIMATELY TWO MONTHS BEHIND SLD SYSTEM" icon={Database} />
        <p>
          There is also a significant and demonstrable concern regarding the freshness of the competing database.
        </p>
        <p>
          Based on our comparison of the available material, the data appearing on the competing platform is approximately two months behind the updates maintained by SLD System.
        </p>
        <p className="font-semibold text-gray-900 dark:text-gray-100">
          This is a serious deficiency in a professional legal research service.
        </p>
        <p>
          Legal professionals depend upon timely case-law updates and current legal information. A database that remains substantially behind the current updates of the original system cannot reasonably provide the same level of reliability expected from a continuously maintained legal research platform.
        </p>
        <p>
          SLD System continues to undertake daily updating, verification, indexing, correction, and maintenance of its database.
        </p>

        {/* 7. INCORRECT DATA ENTRIES AND POOR DRAFTING OF NEW CASES */}
        <SectionHeader number="7" title="INCORRECT DATA ENTRIES AND POOR DRAFTING OF NEW CASES" icon={AlertTriangle} />
        <p>
          The problem is not limited to delayed updates.
        </p>
        <p>
          We have also observed incorrect data entries, mistakes in case references, and deficiencies in the drafting and preparation of newly added cases on the competing platform.
        </p>
        <p>
          The quality of newly prepared material appears substantially below the professional standard maintained by SLD System.
        </p>
        <p className="font-semibold text-gray-900 dark:text-gray-100">
          This raises an important issue for every lawyer and legal researcher:
        </p>
        <p>
          A large database is of little practical value if the information contained in it is outdated, incorrectly entered, improperly indexed, or poorly drafted.
        </p>
        <p>
          Legal research requires accuracy. Incorrect case numbers, citations, dates, titles, references, or summaries can mislead users and may adversely affect legal research, pleadings, opinions, and professional advice.
        </p>

        {/* 8. COPYING A LARGE DATABASE DOES NOT CREATE THE ABILITY TO MAINTAIN IT */}
        <SectionHeader number="8" title="COPYING A LARGE DATABASE DOES NOT CREATE THE ABILITY TO MAINTAIN IT" icon={ShieldAlert} />
        <p>
          The present circumstances demonstrate the fundamental difference between possessing a large quantity of copied data and having the professional capability to maintain a reliable legal database.
        </p>
        <p>A legal research system requires continuous:</p>
        <ul className="list-disc pl-5 space-y-1 text-gray-800 dark:text-gray-200">
          <li>updating;</li>
          <li>verification;</li>
          <li>proofreading;</li>
          <li>correction;</li>
          <li>indexing;</li>
          <li>classification;</li>
          <li>professional drafting;</li>
          <li>quality control; and</li>
          <li>incorporation of new judgments and legal developments.</li>
        </ul>
        <p>
          When a large volume of material is copied or transferred without the underlying system and expertise required for its continued maintenance, errors and outdated material can quickly accumulate.
        </p>
        <p className="font-semibold text-gray-900 dark:text-gray-100">
          The apparent delay in updates and the errors observed in newly prepared material raise serious questions concerning the ability of the competing platform to maintain the database independently and accurately.
        </p>

        {/* 9. PROFESSIONAL STATUS DOES NOT ESTABLISH OWNERSHIP */}
        <SectionHeader number="9" title="PROFESSIONAL STATUS DOES NOT ESTABLISH OWNERSHIP" icon={UserCheck} />
        <p>
          Being a lawyer does not confer ownership over another person's business, website, trademark, copyright, database, or intellectual property.
        </p>
        <p>
          Likewise, professional status does not substitute for documentary evidence of ownership.
        </p>
        <p>
          Clients and members of the legal profession place their trust in legal professionals and legal research services. That trust carries a corresponding responsibility to provide accurate information and truthful representations.
        </p>
        <p className="font-semibold text-gray-900 dark:text-gray-100">
          A professional title cannot be used as a substitute for proof of ownership, nor should it be used to persuade clients to accept an ownership claim that remains disputed before the competent forum.
        </p>

        {/* 10. CONCERNS REGARDING MISLEADING COMMUNICATIONS */}
        <SectionHeader number="10" title="CONCERNS REGARDING MISLEADING COMMUNICATIONS" icon={AlertOctagon} />
        <p>
          We have serious concerns regarding communications and marketing representations suggesting, directly or indirectly, that:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-gray-800 dark:text-gray-200">
          <li>SLDSystem.com has been closed;</li>
          <li>SLD System has been replaced;</li>
          <li>another person has acquired SLD System;</li>
          <li>clients should stop using the original SLD System;</li>
          <li>the competing platform is the continuation or successor of SLD System; or</li>
          <li>the competing platform possesses ownership rights in SLD System.</li>
        </ul>
        <p className="font-semibold text-gray-900 dark:text-gray-100">
          These representations are categorically disputed.
        </p>
        <p>
          Clients should not accept such statements merely because they are repeated through WhatsApp, email, telephone calls, advertisements, or websites.
        </p>
        <p>
          The ownership dispute is already before the competent forums, and the proper determination will be made through the legal process.
        </p>

        {/* 11. CORPORATE IDENTITY, BANKING TRANSPARENCY AND ACCOUNTABILITY */}
        <SectionHeader number="11" title="CORPORATE IDENTITY, BANKING TRANSPARENCY AND ACCOUNTABILITY" icon={Building2} />
        <p>
          Another matter of serious concern is the apparent lack of transparent corporate and financial arrangements of the entity presently representing itself to clients as Shahid Legal Group (SLG).
        </p>
        <p>
          If SLG is genuinely operating as an independent and properly established business entity, it should have no difficulty demonstrating its legal identity, corporate status, ownership structure, authorized representatives, and proper business banking arrangements.
        </p>
        <p>
          It is therefore a legitimate question why a business claiming to operate as a separate organization would need to conduct its commercial affairs or receive subscription payments through personal bank accounts, rather than through an appropriately identified account of the business or corporate entity it claims to represent.
        </p>
        <p>This is not a trivial matter. Clients who pay subscription fees for a professional legal-information service are entitled to know:</p>
        <ul className="list-disc pl-5 space-y-1 text-gray-800 dark:text-gray-200">
          <li>Who legally owns the business;</li>
          <li>Which legal entity is receiving their money;</li>
          <li>Who is authorized to receive and manage subscription payments;</li>
          <li>Whether the claimed business entity actually exists in the form represented to clients;</li>
          <li>Whether the business has proper corporate and financial records; and</li>
          <li>Whether the person receiving payments has lawful authority to do so on behalf of the claimed entity.</li>
        </ul>
        <p>
          The contrast is particularly significant in the present circumstances. On the one hand, claims are being made concerning ownership and control of the established SLD System; on the other hand, the claimed competing organization has apparently not provided comparable transparent documentary evidence establishing its own corporate identity, ownership, and business arrangements.
        </p>
        <p>
          If there is a genuine and lawful business behind these representations, there should be nothing to conceal and no difficulty in demonstrating its legal and financial identity through proper documentation.
        </p>
        <p>
          Professional status, including being a lawyer, does not exempt any person or organization from the ordinary requirements of transparency, accountability, and truthful representation to clients.
        </p>
        <p>
          Nor does merely placing the initials “SLG” alongside “SLD”, changing a website presentation, or operating through personal arrangements establish a separate lawful ownership of the SLD System or its intellectual property.
        </p>
        <p className="font-semibold text-gray-900 dark:text-gray-100">
          The legal and commercial questions are therefore straightforward: Who owns the alleged business? Who owns its intellectual property? Who is legally receiving the clients' subscription payments? Under what legal authority? And where is the documentary evidence supporting these representations?
        </p>
        <p>
          Until these questions are properly answered with verifiable documentary evidence, clients should exercise appropriate caution before treating representations concerning ownership, succession, or authority as established facts.
        </p>
        <p>
          SLD System has operated transparently since 2015 and stands behind its established business identity, official domain, professional database, and intellectual property.
        </p>
        <p>
          We have no objection to lawful competition. However, competition must be based upon original work, transparent business arrangements, lawful ownership, accurate information, and honest representations—not upon copied material, disputed ownership claims, or attempts to create confusion among clients.
        </p>
        <p>
          Ultimately, clients are capable of judging the difference between an established and continuously maintained professional service and a platform attempting to operate by relying upon another organization's accumulated work.
        </p>

        {/* 12. SLD SYSTEM'S POSITION */}
        <SectionHeader number="12" title="SLD SYSTEM'S POSITION" icon={CheckCircle} />
        <p>
          SLD System categorically maintains that its established rights in its brand, platform, original content, database, intellectual property, and associated business interests are being defended through the appropriate legal channels.
        </p>
        <p>
          The pending proceedings, including Suit No. 29/2026 dated 10-06-2026, provide the proper forum for determination of the disputed rights.
        </p>
        <p>
          Until such determination is made, no person should present a disputed ownership claim as an established fact or attempt to create public confusion through changes in branding or website presentation.
        </p>

        {/* 13. OUR COMMITMENT TO QUALITY AND ACCURACY */}
        <SectionHeader number="13" title="OUR COMMITMENT TO QUALITY AND ACCURACY" icon={ShieldCheck} />
        <p>
          SLD System's reputation has been built since 2015 through continuous work, daily updates, legal research, professional drafting, database maintenance, and quality control.
        </p>
        <p>
          Our value does not depend merely upon the volume of information contained in the database.
        </p>
        <p>
          It depends upon our ability to provide current, accurate, properly indexed, professionally prepared, and continuously maintained legal information to our clients.
        </p>
        <p className="font-semibold text-gray-900 dark:text-gray-100">
          A database may be copied in a short period of time, but the expertise, system, professional standards, continuous maintenance, and years of work required to build and sustain a reliable legal research service cannot simply be copied.
        </p>

        {/* CONCLUSION */}
        <div className="mt-6 pt-4 border-t-2 border-[#f15a24]/30 space-y-3">
          <h3 className="text-base font-bold text-gray-950 dark:text-gray-50 uppercase tracking-wide flex items-center gap-2">
            <Scale className="w-5 h-5 text-[#f15a24]" />
            <span>CONCLUSION</span>
          </h3>
          <p>
            We therefore categorically reject all unsupported claims concerning ownership, control, replacement, or succession of the genuine SLD System.
          </p>
          <p>
            The relevant ownership and intellectual-property issues are already before the competent forums, including the IPO, Islamabad, and the Islamabad Court in Suit No. 29/2026 dated 10-06-2026.
          </p>
          <p>
            The continued use of SLD-related identifiers, reproduction of SLD material, disputed ownership claims, and presentation of modified or copied material in a manner capable of confusing clients and subscribers will be contested through lawful channels.
          </p>
          <p>
            We further caution all users that outdated information, incorrect data entries, inaccurate case references, and poorly drafted newly added cases can seriously affect the reliability of a legal research service. Users should therefore carefully verify the accuracy and currency of legal material before relying upon it professionally.
          </p>
          <p>
            Being a lawyer does not make a person the owner of another person's work, and possession of copied data does not make a person the creator or lawful owner of that data. Ultimately, the reliability of a legal research service is determined by its accuracy, originality, continuous updating, professional quality, and the trust it earns from its users.
          </p>
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            SLD System remains committed to protecting its intellectual property, maintaining the accuracy and integrity of its database, and providing its clients with genuine, authoritative, current, and professionally maintained legal research material.
          </p>
          <p className="font-bold text-stone-900 dark:text-stone-100 pt-2">
            All rights are reserved.
          </p>
        </div>

        {/* Official Signatory Box */}
        <div className="mt-6 border border-theme-border bg-gray-50 dark:bg-theme-surface-hover rounded-xl p-5 sm:p-6 flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="space-y-3">
            <div>
              <h4 className="text-lg font-serif font-black text-gray-950 dark:text-gray-50">
                Haroon Ahmad Rafiq
              </h4>
              <p className="text-[#f15a24] font-bold text-sm">
                CEO — SLD System (SMC-PVT) Limited
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Official Law Reporting Agency since 2015
              </p>
            </div>

            <div className="space-y-1.5 text-xs sm:text-sm text-stone-700 dark:text-stone-300">
              <p className="flex items-center gap-2">
                <span className="font-bold w-20 text-stone-900 dark:text-stone-100">Website:</span>
                <a href="http://www.sldsystem.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">
                  www.sldsystem.com
                </a>
              </p>
              <p className="flex items-center gap-2">
                <span className="font-bold w-20 text-stone-900 dark:text-stone-100">Cell:</span>
                <span className="font-mono">0321-5390007 & 8</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="font-bold w-20 text-stone-900 dark:text-stone-100">Tel:</span>
                <span className="font-mono">051-8315912</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="font-bold w-20 text-stone-900 dark:text-stone-100 shrink-0">Head Office:</span>
                <span className="leading-relaxed">
                  # SO-6 & 7, 2nd Floor, City Centre, Bank Road, Saddar, Rawalpindi
                </span>
              </p>
              <p className="flex items-center gap-2">
                <span className="font-bold w-20 text-stone-900 dark:text-stone-100">Email:</span>
                <span className="space-x-2">
                  <a href="mailto:info@sldsystem.com" className="text-blue-600 dark:text-blue-400 hover:underline">info@sldsystem.com</a>
                  <span>/</span>
                  <a href="mailto:superlawdata@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">superlawdata@gmail.com</a>
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-center w-full md:w-56 shrink-0 shadow-xs">
            <ShieldCheck className="w-10 h-10 text-emerald-600 mb-2" />
            <span className="font-serif font-black text-xs text-stone-900 dark:text-stone-100">
              Verified Legal Publisher
            </span>
            <span className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
              Islamabad & Rawalpindi Jurisdiction
            </span>
            <span className="mt-2 text-[10px] font-mono uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
              Est. 2015
            </span>
          </div>
        </div>

      </div>
    </Modal>
  );
};

export default LegalRebuttalModal;
