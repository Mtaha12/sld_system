import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Token Limiter & Context Truncation Utility
 * Prevents excessive token consumption while preserving critical legal facts.
 */
export const limitContext = (content, maxChars = 10000) => {
  if (!content || typeof content !== 'string') return '';
  const trimmed = content.trim();
  if (trimmed.length <= maxChars) return trimmed;

  // Split and take top 60% and bottom 40% of allowed limit to capture
  // party details/header at top and assessment demand/operative orders at bottom
  const topLimit = Math.floor(maxChars * 0.6);
  const bottomLimit = Math.floor(maxChars * 0.4);

  const topPart = trimmed.slice(0, topLimit);
  const bottomPart = trimmed.slice(trimmed.length - bottomLimit);

  return `${topPart}\n\n[... Note: Middle ledger data condensed for token efficiency ...]\n\n${bottomPart}`;
};

/**
 * Code Generation Refusal Guard
 * Strictly refuses any code/script/programming generation requests.
 */
export const checkIsCodeRequest = (text) => {
  if (!text || typeof text !== 'string') return false;
  const t = text.toLowerCase();

  const codeKeywords = [
    'write code', 'generate code', 'create code', 'give me code', 'show me code',
    'python code', 'javascript code', 'typescript code', 'react code', 'html code',
    'css code', 'sql query', 'c++ code', 'java code', 'php code', 'node.js code',
    'write a script', 'write a function', 'write a program', 'coding for',
    'backend code', 'frontend code', 'write an api in', 'algorithm for'
  ];

  for (const kw of codeKeywords) {
    if (t.includes(kw)) return true;
  }

  // Regex check for programming patterns like "code to ...", "write a python/js script"
  if (/\b(?:write|generate|give\s*me|create)\s+(?:a\s+)?(?:python|javascript|typescript|js|ts|c\+\+|java|php|html|css|sql|bash|powershell)\s+(?:code|script|program|function)\b/i.test(t)) {
    return true;
  }

  if (/\b(?:code|script)\s+(?:to|for)\s+(?:calculate|scrape|parse|build|develop|automate|connect|fetch)\b/i.test(t)) {
    return true;
  }

  return false;
};

/**
 * Detects if the user query or attachment requires drafting/generating
 * a legal document, appeal, or petition.
 */
export const checkIsLegalDraftingRequest = (text, attachments = []) => {
  if (Array.isArray(attachments) && attachments.length > 0) {
    // If a file is attached and text asks to generate/draft/appeal/petition
    const t = (text || '').toLowerCase();
    if (!t || /\b(?:appeal|petition|draft|generate|make|create|prepare|format|file|pleading|wp|writ|notice|reply)\b/i.test(t)) {
      return true;
    }
  }

  if (!text || typeof text !== 'string') return false;
  const t = text.toLowerCase();

  const draftingKeywords = [
    'format 1', 'format 2', 'format 3',
    'writ petition', 'article 199', 'petition under article 199',
    'stay petition', 'stay application', 'cm stay', 'c.m stay',
    'exemption petition', 'application for exemption', 'vakalatnama', 'vakalat nama',
    'form b', 'form "b"', 'section 46', 'sales tax act 1990', 'appellate tribunal inland revenue',
    'atir', 'appeal to appellate tribunal',
    'it-16', 'it 16', 'form of appeal it', 'commissioner of income tax (appeals)',
    'commissioner appeals', 'cit appeals', 'wealth tax appeal',
    'generate petition', 'generate appeal', 'draft petition', 'draft appeal',
    'draft a writ', 'generate writ', 'prepare petition', 'prepare appeal',
    'draft legal notice', 'pleading format', 'draft stay application'
  ];

  return draftingKeywords.some(kw => t.includes(kw));
};

/**
 * Identify target format type:
 * 1 = High Court Writ Petition under Article 199
 * 2 = ATIR Appeal Form "B" (Sales Tax / FEA)
 * 3 = Form of Appeal IT-16 (Commissioner Appeals)
 */
export const determineFormatType = (text, attachments = []) => {
  const combined = `${text || ''} ${attachments.map(a => a.name || '').join(' ')}`.toLowerCase();

  if (combined.includes('format 1') || combined.includes('writ') || combined.includes('article 199') || combined.includes('high court') || combined.includes('psts') || combined.includes('pra') || combined.includes('srb')) {
    return 1;
  }
  if (combined.includes('format 2') || combined.includes('form b') || combined.includes('form "b"') || combined.includes('atir') || combined.includes('appellate tribunal') || combined.includes('section 46') || combined.includes('sales tax act, 1990') || combined.includes('federal excise act, 2005')) {
    return 2;
  }
  if (combined.includes('format 3') || combined.includes('it-16') || combined.includes('it 16') || combined.includes('cit') || combined.includes('commissioner of income tax') || combined.includes('wealth tax')) {
    return 3;
  }

  // Fallback heuristic based on attachment content or text
  if (combined.includes('sales tax') || combined.includes('excise')) {
    return 2;
  }
  if (combined.includes('income tax')) {
    return 3;
  }

  // Default to High Court Writ Petition if broad
  return 1;
};

/**
 * Fast Fact Extractor from user text and attachments
 */
export const extractDocumentFacts = (text, attachments = []) => {
  let combined = `${text || ''}\n`;
  for (const att of attachments) {
    if (att.text) combined += `\n${att.text}`;
    if (att.name) combined += `\nFile Name: ${att.name}`;
  }

  // Extract petitioner / taxpayer name
  let petitioner = 'M/s _____________________________________________________';
  const nameMatch = combined.match(/(?:m\/s\.?|taxpayer|petitioner|appellant|name\s*[:\-])\s*([A-Za-z0-9\s.,&'\-]{3,60})/i);
  if (nameMatch) {
    petitioner = nameMatch[1].trim();
  }

  // Extract NTN / CNIC
  let ntn = '_____________';
  const ntnMatch = combined.match(/(?:ntn|pntn|strn)\s*[:\-\/]?\s*([0-9]{7}[\-]?[0-9]?)/i);
  if (ntnMatch) ntn = ntnMatch[1].trim();

  let cnic = '____________________';
  const cnicMatch = combined.match(/(?:cnic|nic)\s*[:\-\/]?\s*([0-9]{5}[\-]?[0-9]{7}[\-]?[0-9])/i);
  if (cnicMatch) cnic = cnicMatch[1].trim();

  // Extract Court / City
  let highCourt = 'LAHORE HIGH COURT, LAHORE';
  if (/islamabad/i.test(combined)) highCourt = 'ISLAMABAD HIGH COURT, ISLAMABAD';
  else if (/sindh|karachi/i.test(combined)) highCourt = 'HIGH COURT OF SINDH, KARACHI';
  else if (/peshawar/i.test(combined)) highCourt = 'PESHAWAR HIGH COURT, PESHAWAR';
  else if (/balochistan|quetta/i.test(combined)) highCourt = 'HIGH COURT OF BALOCHISTAN, QUETTA';
  else if (/rawalpindi/i.test(combined)) highCourt = 'LAHORE HIGH COURT, RAWALPINDI BENCH';

  // Extract Show Cause Notice Date & Section
  let scnDate = '31.10.2023';
  const dateMatch = combined.match(/(?:dated|notice\s*date|order\s*date)\s*[:\-]?\s*([0-9]{1,2}[.\-\/][0-9]{1,2}[.\-\/][0-9]{2,4})/i);
  if (dateMatch) scnDate = dateMatch[1].trim();

  let taxDemand = 'Rs. 208,557,098/-';
  const demandMatch = combined.match(/(?:rs\.?|pkr|liability|demand\s*of)\s*([0-9,]+(?:\.\d+)?)\s*\/?\-?/i);
  if (demandMatch) taxDemand = `Rs. ${demandMatch[1].trim()}/-`;

  let taxYear = '2023';
  const yearMatch = combined.match(/(?:tax\s*year|period)\s*[:\-]?\s*([0-9]{4})/i);
  if (yearMatch) taxYear = yearMatch[1].trim();

  return {
    petitioner,
    ntn,
    cnic,
    highCourt,
    scnDate,
    taxDemand,
    taxYear,
    combinedText: limitContext(combined, 8000)
  };
};

/**
 * EXACT FORMAT TEMPLATES PRESCRIBED BY USER
 */

export const generateFormat1WritPetition = (facts) => {
  const courtName = facts.highCourt.toUpperCase();
  const petitioner = facts.petitioner;
  const ntn = facts.ntn;
  const cnic = facts.cnic;
  const scnDate = facts.scnDate;
  const taxDemand = facts.taxDemand;

  return `### HIGH COURT OF ${courtName}
#### W.P. NO. ____________ / 20____

**M/s ${petitioner}**  
NTN / PNTN: ${ntn}  
*(PETITIONER)*

**VERSUS**

1. **The Province of Punjab**, through Secretary Finance, Government of Punjab, Civil Secretariat, Lahore.  
2. **Punjab Revenue Authority (PRA)**, through its Chairperson, 5-B, Danepur Road, GOR-I, Lahore.  
3. **Commissioner (Appeals)**, Punjab Revenue Authority, Lahore.  
4. **Additional Commissioner**, Punjab Revenue Authority, Enforcement / Zone, Rawalpindi / Lahore.  
*(RESPONDENTS)*

---

### PETITION UNDER ARTICLE 199 OF THE CONSTITUTION OF ISLAMIC REPUBLIC OF PAKISTAN, 1973

---

### INDEX OF DOCUMENTS

| Sr.# | Description of Documents | Annexures | Pages |
| :---: | :--- | :---: | :---: |
| 1. | Court Fees Stamp Paper | — | 1 |
| 2. | Writ Petition along with Affidavit | — | 2 — 15 |
| 3. | Authorization Letter / Board Resolution | **A** | 16 |
| 4. | Impugned Show Cause Notice dated ${scnDate} | **B** | 17 — 22 |
| 5. | Identical Orders / Precedents passed by Superior Courts | **C** | 23 — 28 |
| 6. | C.M. for Stay along with Affidavit | — | 29 — 33 |
| 7. | Application for Exemption with Affidavit | — | 34 — 36 |
| 8. | Vakalatnama duly executed | — | 37 |

PETITIONER
Through Counsel:
Advocate High Court / Supreme Court


HIGH COURT of ${courtName}
		
W. P NO.             /20____
M/s ${petitioner}
NTN: / PNTN: ${ntn}
Petitioners
VS.

1.  The Province of Punjab through Secretary Finance, Government of Punjab, Civil Secretariat, Lahore.
2.  Punjab Revenue Authority (PRA) through its Chairperson, Lahore.
3.  Commissioner (Appeals), Punjab Revenue Authority, Lahore.
4.  Additional Commissioner, Punjab Revenue Authority, Rawalpindi / Lahore.

							Respondents

PETITION UNDER ARTICLE 199 OF THE CONSTITUTION OF ISLAMIC REPUBLIC OF PAKISTAN 1973 AS AMENDED UPTO DATE

Respectfully Sheweth: -

1.	That the addresses of the parties for the purpose of services are the same as given in the heading of the petition.
2.	That this petition is being instituted by the Petitioner Mr. Authorized Representative, bearing CNIC No ${cnic} who is fully conversant with the facts of this case and is competent and able to depose thereto. Copy of authorization letter attached as annexure “A”.	
3.	That the petitioner is an individual / enterprise, and its main business activity is services provider / commercial establishment.
4.	That Respondent No.4 issued show cause u/s 24(2) of the Punjab Sales Tax on Services Act, 2012 dated ${scnDate} and charged with contravention of the provisions of Section 3, 10, 11 and 35 of Punjab Sales Tax on Services Act, 2012 which was accordingly replied (Annex- B). 
5.	That the impugned show cause notice has been issued on mere assumptions and presumptions while the Honourable Karachi High Court in the case of i.e., M/s. Al-Hilal Motors Stores and others v. The Collector, Sales Tax and Central Excise (East) Karachi and others" reported as (2004 PTD 868) has categorically held that:- 
“………An assessee can be subjected to tax under a provision of law, which is unambiguous and, clear. There is no room for any intendment and there is no presumption as to tax. In the absence of any deeming provision the Revenue is required to establish that a transaction falls within the parameters of taxable supplies or in furtherance of any taxable activity, failing which the sales tax imposed on the basis of some assumption or presumption not warranted in law, shall always be struck down. In the present cases it is apparent that except discovering certain cash credits entries in the books of the appellants, the Revenue Officers have not been able to produce any material to show that the said amounts are in any way linked with the taxable supplies or with any taxable activities or present an amount on account of any business activity…..”

6.	That the judgment referred supra settled the ratio that supply of goods or provision of services is a condition precedent for creating sales tax liability against the taxpayer and without establishing any nexus with that of physical delivery of goods or provision of services, no tax authority can be allowed to create liability of sales tax in a castle build in the air and it is mandatory for the revenue authorities to establish that a transaction falls within the parameters of taxable supplies / services or in furtherance of any taxable activity, failing which, the sales tax imposed on the basis of some assumption or presumption not warranted in law. As per settled law there is no room for any intendment and there is no presumption as to tax.

7.	That the show cause notice has been issued without lawful jurisdiction as the officer was not competent to do so under the law.
8.	That section 39 of the PSTS Act, 2012 deals with Appointment of Authorities and their Powers which provides that: - 
“39.    Appointment of authorities.– (1) For purposes of this Act and the rules, the Authority may, in the prescribed manner and by notification in the official Gazette, appoint in relation to any area or cases specified in the notification, any person to be a–
(a)	Commissioner;
(b)	Commissioner (Appeals);
(c)	Additional Commissioner;
(d)	Deputy Commissioner;
(e)	Assistant Commissioner;
(f)	Audit Officer;
[(ff)	Audit-cum-Risk Compliance Officer;] [(fff)	Enforcement Officer ;]
(g)	Inspector ; or
(h)	An officer of the Authority with any other designation.
(2)	The Commissioner (Appeals) and the Commissioner shall be subordinate to the Authority.
(3)	The Additional Commissioners, Deputy Commissioners and the Assistant Commissioners shall be subordinate to the Commissioner and unless otherwise directed by the Authority or the Commissioner, both the Deputy Commissioner and the Assistant Commissioner shall also be subordinate to the Additional Commissioner.
(4)	Risk Compliance Officers, Enforcement Officers, Audit Officers, Inspectors and other officers of equal or lower designations, if any, shall be subordinate to the Deputy Commissioner or, as the case may be, to the Assistant Commissioner or as the Authority may, from time to time, specify.
(5)	The Authority may designate any Deputy Commissioner supervisory incharge of any Assistant Commissioner either by name or by designation in any of its subordinate offices or formations.
(6)	The Authority may distribute the work and related functions amongst the above designations in a manner it deems appropriate and make changes in such work distribution as and when deemed proper.
(7)	The Authority may, by notification in the official Gazette, prescribe uniform including shoulder strips and badges for different classes of the officers or officials of the Authority.
(8)	All jurisdictional and competency issues arising under this Act or the rules shall be decided by the Authority in such manner as it thinks fit.”
 
9.	That the Honorable Lahore High Court, Lahore in its judgment in WP No.16217 of 2020 in the case of M/s. Nishat Hotels & Properties Ltd & another Vs. Province of Punjab & others while referring the words “in the prescribed manner” used in sub-section (1) of section 39 observed that the said term has been defined in section 2(31) of the Act, 2012 which means “prescribed by rules.”. The honorable court in the said judgment while putting serious questions on the competency of the enforcement offices of PRA who have issued show cause notices to the petitioners observed as under: -  
………..
5.	The term ‘prescribed” means prescribed by the rules.
The power to make rules has been conferred by section 76 of the Act, 2012 and the power vests in the Authority which may enact rules with the approval of the government and by notification in the official gazette. Sub-section (2) of section 76 further provides that all rules made under Sub-section (1) during a financial year shall be laid in Provincial Assembly of the Punjab at the time of presentation of the Annual Budget for the next financial year. Thus, appointment of the officers and authorities for the purposes of the Act, 2012 has to be done by the Authority by firstly enacting rules as this is the only prescribed manner in which the appointment can be made. The power vesting in the Authority under Section 39 relates to appointment of officers in relation to any area or cases specified in the notification. It indubitably follows that unless there are rules which have been enacted for the specific purpose of appointment of officers mentioned in section 39 to exercise jurisdiction in relation to certain areas or cases, those officers cannot assume the jurisdiction to exercise powers in terms of section 52 of the Act, 2012 and to issue show cause notice.
6.	Learned counsel for PRA admits to the position regarding absence of the rules in this regard. He, however, invited this Court to hold that the words “in the prescribed manner” is a drafting error on the part of Provincial Assembly and must be ignored. This is a fantastic argument to say the least and cuts across the fundamental rule of interpretation to the effect that redundancy cannot be attributed to the legislature. In my opinion, if the legislature intended the Authority to appoint officers by firstly enacting rules in this regard, then the ineluctable conclusion is that no officer can either be appointed nor can he exercise jurisdiction unless the Authority acts under the rules which have been formulated for the purpose. Since none exists, the act of the Authority in conferring jurisdiction upon the officers to issue show cause notices in respect of cases and areas is ultra vires the powers of the Authority. It is not clear as to how the jurisdiction was conferred on the officers who issued show cause notices to petitioners. Not only that there are no rules in place which lay down the decision-making process but also that, admittedly, the constitution of the Authority took place vide notification dated 01.04.2022 (produced in Court today) and thus no decision could have been made by a truncated Authority with no legal pedigree.”

10.	That the Honorable Lahore High Court, Lahore in the judgement quoted supera while striking down the show cause notices declared that the same have been issued incompetently and are without lawful authority and of no legal effect. 

11.	That the Honorable Lahore High Court, Lahore in WP No.39463/ 2023 in the case of M/s. Nestle Pakistan Ltd etc Vs The Province of Punjab etc dated 09.10.2023 and in WP No.61784/2023 dated 09.10.2023 in the case of M/s. Pak Telecom Mobile Ltd Vs. Province of Punjab etc also decided the writ petitions in the same manner following the judgment of M/s. Nishat Hotels & Properties Ltd in WP No.16217/2020 dated 06.6.2023 and held as under:- 
“……….
4.	Arguments heard. I have gone through the judgment of this Court dated 06.6.2023 in writ petition No.16217/2020 and agree with the reasoning recorded and conclusion drawn therein, which is also on all four to the facts and circumstances of these cases. Merely because the said judgment has been suspended by the Division Bench of this Court cannot be a sole ground not to follow the said judgment for deciding similar matters. It is well settled law that when appeal against Single Bench judgment is filed and the operation of judgment is suspended, such suspension operates only inter parties and not as a judgment in rem, hence does not detract from the binding effect of the judgment as precedent unless the judgment is finally set aside. Reliance in this regard is placed on Maj. Gen. Mian Ghulam Jilani vs. The Federal Government (PLD 1975 Lahore 65), Yousaf A. Mitha etc vs. Aboo Baker ete PLD 1980 Karachi 492), Mst. Meeran Bibi etc vs. Manager, Zaral Taragiati Bank Limited etc (2012 CLD 2029), Facto Belarus Tranctor Limited vs. Government of Pakistan etc (PLD 2005 Supreme Court 605), Trustees of the Port of Karachi vs. Muhammad Saleem (1994 SCMR 2213), Collector of Sales Tax vs. Messrs Wyeth Pakistan Limited (2009 YLR 2096), Muhammad Akhlaq vs. Principal Secretary, Prime Minister etc (2014 PLC (C.S) 288) and M/s Firdous Cloth etc FOP etc (ICA 913/2015).
5.	In view of above discussion, all these writ petitions are allowed in same terms as of judgment dated 06.6.2023 in writ petition No.16217/2020 and consequently impugned notices are struck down.”

12.	That it is apprehended that Respondent No.4 may pass assessment order at any time.

13.	That keeping in view of the ratio settled by the Honorable High Court in its judgments quoted supra the impugned notice is unlawful, without lawful jurisdiction and liable to be set aside on the following grounds: -

	GROUNDS 

a)	That the impugned show cause notice dated ${scnDate} confronting huge sales tax on services liability of ${taxDemand} was issued against the Petitioner without establishing provision of services while as per settled ratio no tax authority can be allowed to create liability of sales tax in a castle built in the air. 
b)	That the respondent failed to establish the transactions falls within the parameters of taxable services or in furtherance of any taxable activity, failing which, the sales tax imposed on the basis of some assumption or presumption not warranted in law. As per settled law there is no room for any intendment and there is no presumption as to tax while the Respondent No.4 issued notice merely taking refuge to presumptions.
c)	That the impugned show cause notice has been issued without lawful jurisdiction and in violation to the provisions of Sales Tax on Services Act 2012. As per ratio settled by the Honourable Lahore High Court in its judgment in WP No.16217 of 2020 dated 06.6.2023, the officer (Respondent No.4) has not been validly appointed through the rules, as required under section 39(1) read with section 76 of the PSTS Act, 2012.
d)	That unless there are rules which have been enacted for the specific purpose of appointment of officers mentioned section 39 to exercise jurisdiction in relation to certain areas of cases, Respondent No.4 cannot assume the jurisdiction to exercise powers in terms of section 24 of the Act, 2012 and to issue show cause notice.
e)	That the show cause notice has been issued incompetently and without lawful authority and of no legal effect warrant to be struck down. 
f)	That it is a settled law that if any action is taken without jurisdiction the whole edifice built upon an illegal assumption of jurisdiction would be illegal. 
g)	That it is imminent that the Respondent No.4 may passed order u/s 24 of the PSTS Act, 2012 without having lawful jurisdiction. Therefore, the Petitioner has no other efficacious remedy except to invoke the extraordinary constitutional jurisdiction of this Honorable Court. hence this constitutional Petition.

PRAYER
It is, therefore, most respectfully prayed in the interests of justice that this Honorable Court may be pleased to: -

I.	Declare that the Show Cause Notice dated ${scnDate} has been issued merely on assumptions and presumptions therefore, illegal and of no legal effects;
II.	Declare that the Show Cause Notice dated ${scnDate} has been issued without jurisdiction, and is without lawful authority and of no legal effects;
III.	Declare that the actions of the Respondents are ultra vires the PSTS Act, 2012 and the Constitution, 1973;
IV.	Pending disposal of this Petition, suspend the Impugned Notice dated ${scnDate};
V.	Prohibit the Respondents from taking any adverse action against the Petitioner on the basis of the Impugned Notice dated ${scnDate};
VI.	Grant any other relief that this Honorable Court may deem just and appropriate in the facts and circumstances of this case;
VII.	Grant costs.   

PETITIONER
Through

Advocate Supreme Court C.C. No. 	Advocate High Court C.C. No. 	Advocate High Court C.C. No. 


Certificate

As per instruction this is the first Writ Petition moved in this Honourable High Court.
As per my knowledge no case is pending/ decided in the Supreme Court of Pakistan.

						PETITIONER
						Through:

Advocate Supreme Court C.C. No. 	Advocate High Court C.C. No. 	Advocate High Court C.C. No. 


HIGH COURT of ${courtName}
		
W. P NO.             /20____
M/s ${petitioner}
NTN: / PNTN: ${ntn}
(PETITIONER)
VS.

1.  The Province of Punjab through Secretary Finance, Government of Punjab, Lahore.
2.  Punjab Revenue Authority (PRA) through its Chairperson, Lahore.
							(RESPONDENTS)

PETITION UNDER ARTICLE 199 OF THE CONSTITUTION OF ISLAMIC REPUBLIC OF PAKISTAN 1973 AS AMENDED UPTO DATE
AFFIDAVIT

I, Mr. Authorized Representative, bearing CNIC No ${cnic}, solemnly affirms and declares as under: -

1.	That the accompanying writ petition has been drafted under my instructions and I adopt its contents as true and correct to the best of my knowledge and belief.
2.	That this affidavit may kindly be read as an integral part of the accompanying writ petition. 

          DEPONENT
Verified on Oath on this ________ day of ________, 20___ that the contents of this affidavit are true and correct to the best of my knowledge and belief. No part of it is false and nothing material has been kept concealed there from.

          DEPONENT


HIGH COURT of ${courtName}
		
W. P NO.             /20____
M/s ${petitioner}
NTN: / PNTN: ${ntn}
(PETITIONER)
VS.

1.  The Province of Punjab through Secretary Finance, Government of Punjab, Lahore.
2.  Punjab Revenue Authority (PRA) through its Chairperson, Lahore.
							(RESPONDENTS)

PETITION UNDER ARTICLE 199 OF THE CONSTITUTION OF ISLAMIC REPUBLIC OF PAKISTAN 1973 AS AMENDED UPTO DATE
PETITION UNDER SECTION 151 OF C.P.C.

Respectfully Sheweth: -
1.	That the Petitioner has filed the above titled Writ Petition before this Honorable Court. The contents of the said Writ Petition may kindly be read as integral part of this petition.
2.	That the petitioner has a good prima-facie case arguable in it’s favoured.
3.	That the balance of convenience also lies in favour of the petitioner.
4.	That the Respondent No.4 can issue Assessment Order under section 24 of the Punjab Sales Tax on Services, 2012 etc. and adopt any other modes of recovery.
5.	That in case the interim stay is not granted/ allowed, and then the petitioner shall suffer irreparable loss.

PRAYERS 
	It is, therefore, respectfully prayed that this petition be accepted and Additional Commissioner Punjab Revenue Authority, Respondent No. 4, be directed to withdraw the show cause notice dated ${scnDate} and to refrain from passing adverse order u/s 24 of Punjab Sales Tax on Services, 2012, till the decision of above titled writ petition. 

                                                                        	        Petitioner
Through

Advocate Supreme Court C.C. No.


HIGH COURT of ${courtName}
		
W. P NO.             /20____
M/s ${petitioner}
NTN: / PNTN: ${ntn}
(PETITIONER)
VS.

1.  The Province of Punjab through Secretary Finance, Government of Punjab, Lahore.
2.  Punjab Revenue Authority (PRA) through its Chairperson, Lahore.
							(RESPONDENTS)

PETITION UNDER SECTION 151 OF C.P.C.
AFFIDAVIT

I, Mr. Authorized Representative, bearing CNIC No ${cnic}, solemnly affirms and declares as under: -

1.	That the accompanying petition has been drafted under my instructions and I adopt its contents as true and correct to the best of my knowledge and belief.
2.	That this affidavit may kindly be read as an integral part of the accompanying Petition.

DEPONENT
Verified on oath that the contents of this affidavit are true and correct to the best of my knowledge and belief. No part of it is false and nothing material has been kept concealed there from.

DEPONENT


HIGH COURT of ${courtName}
		
W. P NO.             /20____
M/s ${petitioner}
NTN: / PNTN: ${ntn}
(PETITIONER)
VS.

1.  The Province of Punjab through Secretary Finance, Government of Punjab, Lahore.
2.  Punjab Revenue Authority (PRA) through its Chairperson, Lahore.
							(RESPONDENTS)

PETITION UNDER SECTION 151 C.P.C. FOR EXEMPTION 
OF FILING OF CERTIFIED COPIES/DOCUMENTS

RESPECTFULLY SHEWETH: -

1.	That the petitioner has filed the above captioned petition before this Honourable Court.
2.	That the petitioner is not in possession of certified copies of certain Documents and is filing photocopies thereof with the petition.
3.	That it will be in the interest of justice that filing of certified copies thereof is dispensed with and permission to file the photocopies thereof may graciously be granted.
It is therefore, respectfully prayed that filing of certified copies of certain documents may kindly be dispensed with and permission to file photocopies thereof may kindly be granted.

                                                                  			Petitioner
Through

Advocate Supreme Court C.C. No.


HIGH COURT of ${courtName}
		
W. P NO.             /20____
M/s ${petitioner}
NTN: / PNTN: ${ntn}
(PETITIONER)
VS.

1.  The Province of Punjab through Secretary Finance, Government of Punjab, Lahore.
2.  Punjab Revenue Authority (PRA) through its Chairperson, Lahore.
							(RESPONDENTS)

EXEMPTION PETITION
AFFIDAVIT

I, Authorized Representative, bearing CNIC No ${cnic}, solemnly affirms and declares as under: -
 
1.	That the accompanying petition under section 151 C.P.C. for exemption to file certified copies of documents has been drafted under my instructions and I adopt its contents as true and correct as to my knowledge and belief.
2.	That this affidavit may kindly be read as an integral part of the accompanying petition.

DEPONENT
Verified on oath that the contents of the affidavit are true and correct to the best of my knowledge and belief and nothing has been concealed there from.

DEPONENT


					VAKALAT NAMA
IN THE ${courtName}

M/s ${petitioner}
NTN: ${ntn}

Petitioner
VERSUS

The Province of Punjab & Others
Respondents

KNOW ALL to whom these presents shall come that I/We the undersigned do hereby appoint and authorize Advocate High Court, CC No.______ 

(Hereinafter called the Advocates) to be the Advocates for the correspondence in the above-mentioned cause to do all the following acts. Deeds and things or any of them, that is to say:-

1.	To appear, plead and act in the above-mentioned cause in this Court.
2.	To withdraw or compromise the said cause or submit to arbitration any difference or dispute that shall arise touching or in any manner relating to the said cause.
3.	To employ/appoint, nominate any other Advocate/Pleader or substitute on his/their behalf authorizing him to exercise the same powers and authorities hereby conferred on the Advocate as he/they may think fit to do.
4.	And I/We hereby agree that in the event of the whole or any part of the fee agreed by me/us to be paid to the Advocate remaining unpaid; he/they shall be entitled to withdraw from the prosecution of the said cause.

IN WITNESS WHEREOF I/We have hereunto set my/our hands to these presents the contents of which have been explained to and understood by me/us on this _____ Day of ________ 20___

RECEIVED by us on: 
From: ${petitioner}
ACCEPTED subject to the terms mentioned above.

Client’s Signature (s)
`;
};

export const generateFormat2ATIRAppeal = (facts) => {
  const petitioner = facts.petitioner;
  const ntn = facts.ntn;
  const taxYear = facts.taxYear;
  const scnDate = facts.scnDate;

  return `### APPELLATE TRIBUNAL INLAND REVENUE
#### FORM “B” [See Rule 7]
**FORM OF APPEAL TO THE APPELLATE TRIBUNAL INLAND REVENUE UNDER SECTION 46 OF THE SALES TAX ACT, 1990 / SECTION 34 OF THE FEDERAL EXCISE ACT, 2005**

**BEFORE THE APPELLATE TRIBUNAL INLAND REVENUE, BENCH AT LAHORE / KARACHI / ISLAMABAD**  
Appeal / Application No. ________________________ / 20___

- **Type of Appeal:** [Sales Tax] / Federal Excise / Income Tax
- **Nature of Proceeding:** [Main Appeal] / Stay Application / Early Hearing
- **Appellant:** **M/s ${petitioner}** | NTN: **${ntn}**
- **Address:** Industrial / Commercial Area, Pakistan
- **Advocate / Representative:** Advocate High Court / Supreme Court
- **Respondents:**
  1. The Commissioner Inland Revenue, Appeals, Regional Tax Office / LTO.
  2. The Officer Inland Revenue, Audit / Enforcement Zone.
- **Inland Revenue Office:** Large Taxpayers Office (LTO) / RTO
- **Tax Year / Period:** Tax Year **${taxYear}**
- **Section of Act:** Sections 11(2) / 25 / 46 of Sales Tax Act, 1990
- **Impugned Order Date:** **${scnDate}**

---

### VERIFICATION

I, Authorized Representative S/o ____________________, do hereby declare that what is stated above is true to the best of my knowledge and belief.  
Verified today, the _____ day of ________, 20___

**Signature of Appellant** &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **Signature of Authorized Representative**

---

### LIST OF ENCLOSURES

| Sr.# | Description of Enclosure | Attached |
| :---: | :--- | :---: |
| 1. | Memorandum of Appeal in Triplicate | **Yes** |
| 2. | Index of Documents | **Yes** |
| 3. | Power of Attorney / Vakalatnama | **Yes** |
| 4. | Affidavit on Stamp Paper | **Yes** |
| 5. | Certified Copy of Impugned Order | **Yes** |
| 6. | Copy of Show Cause Notice dated ${scnDate} | **Yes** |
| 7. | Order-in-Original & Order-in-Appeal | **Yes** |
| 8. | Tribunal Appeal Fee Paid Challan / CPR | **Yes** |

*(For Official Use Only)*  
Received against Diary No. _________________ on _________________  
**Assistant Registrar, Appellate Tribunal Inland Revenue**
`;
};

export const generateFormat3IT16Appeal = (facts) => {
  const petitioner = facts.petitioner;
  const ntn = facts.ntn;
  const cnic = facts.cnic;
  const taxYear = facts.taxYear;
  const scnDate = facts.scnDate;
  const taxDemand = facts.taxDemand;

  return `### COMMISSIONER OF INCOME TAX (APPEALS)
#### FORM OF APPEAL: IT - 16
*(Under the Income Tax Ordinance, 2001 / Wealth Tax Act)*

**BEFORE THE COMMISSIONER OF INCOME TAX (APPEALS), ZONE: ISLAMABAD / LAHORE / KARACHI**  
Appeal No. _______________ / 20___

- **Appellant:** **M/s ${petitioner}**
- **CNIC / NTN:** **${ntn}** / **${cnic}**
- **Tax Year / Assessment Year:** **${taxYear}**
- **Circle / Zone:** Circle-01, Enforcement Zone, LTO / RTO
- **Name of Taxation Officer:** Deputy Commissioner Inland Revenue
- **Date of Service of Impugned Order:** **${scnDate}**
- **Appeal Fee Paid:** Rs. 5,000/- (CPR Attached)

---

### TAX ASSESSED BREAKDOWN

| Sr.# | Head of Assessment | Assessed / Disputed Demand |
| :---: | :--- | :--- |
| a. | Income Tax | ${taxDemand} |
| b. | Sales Tax | Nil |
| c. | Wealth Tax | Nil |
| d. | Additional Tax / Default Surcharge u/s 205 | Subject to Final Calculation |
| e. | Penalty u/s 182 | Disputed |
| f. | Surcharge / Others | Nil |
| — | **Total Disputed Tax Demand** | **${taxDemand}** |

**Admitted Tax Liability:** Paid in full as per original declaration  
**Disputed Tax Demand:** **${taxDemand}**

---

### GROUNDS OF APPEAL

1. **Lack of Jurisdiction:** That the impugned assessment order passed under section 122(5A) is unlawful, arbitrary, and without lawful jurisdiction.
2. **Arbitrary Additions:** That the learned Officer Inland Revenue erred in making arbitrary additions on mere conjectures without confronting tangible independent evidence.
3. **Denial of Natural Justice:** That the statutory notice was served in violation of procedural due process and mandatory provisions of section 122(9) of the Income Tax Ordinance, 2001.
4. **Rejection of Audited Accounts:** That the appellant's declared audited accounts and verified expense vouchers were arbitrarily rejected without specific discrepancy.
5. **Illegal Default Surcharge:** That no notice of demand or default surcharge could legally be sustained when the primary assessment itself is devoid of jurisdiction.

---

### RELIEF CLAIMED IN APPEAL

It is most respectfully prayed that the impugned assessment order be annulled and vacated, or modified by deleting the arbitrary additions, and interim stay against recovery of disputed demand may graciously be granted.

---

### VERIFICATION

I, Authorized Representative S/O ________________, the proprietor/managing director of **M/s ${petitioner}**, the appellant, do hereby declare that whatever is stated above is true to the best of my knowledge and belief.

**Appellant / Authorized Representative**  
Dated: _________________
`;
};

/**
 * Call Gemini API with Token Limitizer & Fallback
 */
export const callGeminiWithTokenControl = async (systemInstruction, userPrompt, inlineParts = []) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  // Fast, officially supported Gemini models with timeout guard
  const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const models = [primaryModel, 'gemini-3.5-flash-lite', 'gemini-3.5-flash'].filter((v, i, a) => a.indexOf(v) === i);
  let lastError = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const contents = [
        {
          role: 'user',
          parts: [
            ...inlineParts,
            { text: `${systemInstruction}\n\nUSER PROMPT:\n${userPrompt}` }
          ]
        }
      ];

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(7000), // 7-second timeout provides generous time for Gemini generation while staying fast
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.15,
            maxOutputTokens: 2500, // Token limitizer prevents excessive generation
            topP: 0.95
          }
        })
      });

      const data = await res.json();
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }

      if (data.error) {
        logger.warn(`Gemini model ${model} returned error: ${data.error.message || data.error.code}`);
        lastError = new Error(data.error.message || `API error ${data.error.code}`);
      }
    } catch (err) {
      logger.warn(`Gemini model ${model} call error: ${err.message}`);
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini models exhausted');
};

/**
 * Main Drafting Orchestrator
 */
export const generatePleadingDocument = async (queryText, attachments = []) => {
  // 1. Extract extracted facts from text & attachments
  const facts = extractDocumentFacts(queryText, attachments);
  const formatType = determineFormatType(queryText, attachments);

  // 2. Prepare inline parts for any base64 files (PDFs/Images)
  const inlineParts = [];
  for (const att of attachments) {
    if (att.base64 && att.type) {
      // Limit attachment payload to prevent huge base64 transfers
      if (att.base64.length < 5000000) {
        inlineParts.push({
          inlineData: {
            mimeType: att.type,
            data: att.base64
          }
        });
      }
    }
  }

  // 3. Try LLM Generation with strict system instruction
  try {
    const systemInstruction = `You are the Senior Pakistani Constitutional & Tax Drafting Specialist at the Superior Law Digest (SLD).
STRICT RULES:
1. NEVER generate software code (no Python, Javascript, HTML, SQL). Only generate authoritative legal pleadings.
2. NEVER invent fake citations or imaginary facts. Strictly ground the document in the provided details or document.
3. You must follow STRICTLY one of the user's three prescribed formats:
   - FORMAT 1: HIGH COURT WRIT PETITION UNDER ARTICLE 199 OF THE CONSTITUTION (Includes Court Heading, W.P. No., Index with 8 items, Main Petition with paras 1-13 citing Al-Hilal Motors 2004 PTD 868 and Nishat Hotels WP 16217/2020 on Section 39 "in the prescribed manner", Grounds a-g, Prayer I-VII, Certificate, Affidavit, C.M Stay u/s 151 CPC + Affidavit, Exemption Application u/s 151 CPC + Affidavit, Vakalatnama).
   - FORMAT 2: FORM "B" [see rule 7] FORM OF APPEAL TO THE APPELLATE TRIBUNAL INLAND REVENUE (ATIR) UNDER SECTION 46 OF THE SALES TAX ACT, 1990 OR SECTION 34 OF THE FEDERAL EXCISE ACT, 2005.
   - FORMAT 3: FORM OF APPEAL IT - 16 (TO THE COMMISSIONER OF INCOME TAX / WEALTH TAX (APPEALS)).
4. PRESENTATION & TYPOGRAPHY RULES:
   - FORMAT ALL TABLES (e.g. INDEX OF DOCUMENTS, LIST OF ENCLOSURES, TAX ASSESSED BREAKDOWN) using standard Markdown pipe tables:
     | Sr.# | Description of Documents | Annexures | Pages |
     | :---: | :--- | :---: | :---: |
   - Use clean Markdown headers (### INDEX OF DOCUMENTS, ### WRIT PETITION, ### GROUNDS, ### PRAYER, ### AFFIDAVIT, ### C.M. FOR STAY, ### APPLICATION FOR EXEMPTION, ### VAKALATNAMA).
   - DO NOT wrap the output in code fences like \`\`\`text or \`\`\`markdown. Output clean formatted markdown directly.
   - DO NOT output unneeded asterisks or bold markers (**). NEVER wrap party names or signatures in ** (use plain PETITIONER, RESPONDENTS, Advocate High Court).
   - DO NOT leave trailing asterisks or raw emojis in headings (e.g. NEVER output "⚖️ INDEX**" or "INDEX**").
   - DO NOT output multiple blank lines or duplicate underline characters. Keep spacing clean, compact, and professional.
   - DO NOT provide download buttons or links.
5. TOKEN LIMITIZER: Keep the response dense, strictly formatted, complete, and avoid conversational chatter before or after the document.
Selected Target Format: FORMAT ${formatType}`;

    const userPrompt = `Generate the complete statutory legal pleading for FORMAT ${formatType} using the following extracted facts and instructions:
${facts.combinedText}

Make sure all blanks that have matching facts from the document are accurately filled in. If a field is unknown, format as clean placeholder line (e.g. "_________").`;

    const generated = await callGeminiWithTokenControl(systemInstruction, userPrompt, inlineParts);
    if (generated && generated.length > 200) {
      // For Format 1, ensure stay and vakalatnama are included in the output
      if (formatType === 1 && (!generated.includes('151') || !generated.toUpperCase().includes('VAKALAT'))) {
        return {
          text: generateFormat1WritPetition(facts),
          formatType,
          facts
        };
      }
      return {
        text: generated,
        formatType,
        facts
      };
    }
  } catch (err) {
    logger.warn(`AI LLM generation fallback triggered: ${err.message}`);
  }

  // 4. Guaranteed deterministic fallback if LLM is unavailable
  let deterministicText = '';
  if (formatType === 1) {
    deterministicText = generateFormat1WritPetition(facts);
  } else if (formatType === 2) {
    deterministicText = generateFormat2ATIRAppeal(facts);
  } else {
    deterministicText = generateFormat3IT16Appeal(facts);
  }

  return {
    text: deterministicText,
    formatType,
    facts
  };
};
