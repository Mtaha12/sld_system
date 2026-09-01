import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { caseService } from '../features/cases/services/caseService';
import { 
  Search, Book, BookOpen, Calendar, Scale, Hash, User, Briefcase, FileText, 
  Quote, RefreshCw, Landmark, Lightbulb, Eye
} from 'lucide-react';
import Input from '../components/ui/Input';
import DatePicker from '../components/ui/DatePicker';
import CaseDocumentModal from '../components/ui/CaseDocumentModal';
import { LAW_OPTIONS } from '../data/laws';

// A simple section icon component since lucide-react doesn't have a specific paragraph/section icon that looks exactly like §
const SectionIcon = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    <path d="M10 9c0-2.8 2.2-5 5-5s5 2.2 5 5-1.1 4-2.5 4.5l-3 1c-1.4.5-2.5 1.7-2.5 4.5 0 2.8 2.2 5 5 5s5-2.2 5-5" />
    <path d="M10 20c0 2.8-2.2 5-5 5s-5-2.2-5-5 1.1-4 2.5-4.5l3-1c1.4-.5 2.5-1.7 2.5-4.5 0-2.8-2.2-5-5-5s-5 2.2-5 5" />
  </svg>
);

const MAGAZINE_OPTIONS = [
  { value: '', label: 'Select Magazine' },
  { value: 'SLD', label: 'SLD' },
  { value: 'PTD', label: 'PTD' },
  { value: 'TAX', label: 'TAX' },
  { value: 'PTCL', label: 'PTCL' },
  { value: 'SCMR', label: 'SCMR' },
  { value: 'CLD', label: 'CLD' },
  { value: 'PLD', label: 'PLD' },
  { value: 'PLC', label: 'PLC' },
  { value: 'PCRLJ', label: 'PCRLJ' },
  { value: 'MLD', label: 'MLD' },
  { value: 'CLC', label: 'CLC' },
  { value: 'PLJ', label: 'PLJ' },
  { value: 'PLJ_CIVIL', label: 'PLJ (CIVIL NOTES)' },
  { value: 'PLJ_CRIM', label: 'PLJ (CRIM NOTES)' },
  { value: 'ITR', label: 'ITR' },
  { value: 'AIR', label: 'AIR' },
  { value: 'SCC', label: 'SCC' },
  { value: 'SLJ', label: 'SLJ' },
  { value: 'PDS', label: 'PDS' },
  { value: 'YLR', label: 'YLR' },
  { value: 'PCTLR', label: 'PCTLR' },
  { value: 'PTR', label: 'PTR' },
  { value: 'SBLR', label: 'SBLR' },
  { value: 'TAXMAN', label: 'TAXMAN' },
  { value: 'LHC', label: 'LHC' },
  { value: 'TAXFORUM', label: 'TAXFORUM' },
  { value: 'NLR', label: 'NLR' },
  { value: 'KLR', label: 'KLR' },
  { value: 'SCAJK', label: 'SCAJK' },
  { value: 'PHC', label: 'PHC' },
  { value: 'SCP', label: 'SCP' },
  { value: 'SCR', label: 'SCR' },
  { value: 'SHC', label: 'SHC' },
  { value: 'IHC', label: 'IHC' },
  { value: 'PSC', label: 'PSC' }
];



const COURT_OPTIONS = [
  { value: '1st Labour Appellate Tribunal, Punjab', label: '1st Labour Appellate Tribunal, Punjab' },
  { value: '1st Labour Appellate Tribunal, Sindh', label: '1st Labour Appellate Tribunal, Sindh' },
  { value: '5th Labour Appellate Tribunal, Sindh', label: '5th Labour Appellate Tribunal, Sindh' },
  { value: 'Administrative Tribunal, Punjab', label: 'Administrative Tribunal, Punjab' },
  { value: 'Allahabad High Court', label: 'Allahabad High Court' },
  { value: 'Andhra Pradesh High Court', label: 'Andhra Pradesh High Court' },
  { value: 'Anti-Corruption Committee, Pb.B.C. Lahore', label: 'Anti-Corruption Committee, Pb.B.C. Lahore' },
  { value: 'ANTI-DUMPING APPELLATE TRIBUNAL', label: 'ANTI-DUMPING APPELLATE TRIBUNAL' },
  { value: 'Appellate Tribunal Inland Revenue', label: 'Appellate Tribunal Inland Revenue' },
  { value: 'Appellate Tribunal Inland Revenue, Azad Jammu & Kashmir Muzaffarabad (A.K.)', label: 'Appellate Tribunal Inland Revenue, Azad Jammu & Kashmir Muzaffarabad (A.K.)' },
  { value: 'Appellate Tribunal Inland Revenue, Division Bench-I, Islamabad', label: 'Appellate Tribunal Inland Revenue, Division Bench-I, Islamabad' },
  { value: 'Appellate Tribunal Inland Revenue, Islamabad', label: 'Appellate Tribunal Inland Revenue, Islamabad' },
  { value: 'Appellate Tribunal Inland Revenue, Karachi', label: 'Appellate Tribunal Inland Revenue, Karachi' },
  { value: 'Appellate Tribunal Inland Revenue, Lahore', label: 'Appellate Tribunal Inland Revenue, Lahore' },
  { value: 'Appellate Tribunal Inland Revenue, Lahore (Camp at Multan)', label: 'Appellate Tribunal Inland Revenue, Lahore (Camp at Multan)' },
  { value: 'Appellate Tribunal Inland Revenue, Multan Bench', label: 'Appellate Tribunal Inland Revenue, Multan Bench' },
  { value: 'Appellate Tribunal Inland Revenue, Peshawar', label: 'Appellate Tribunal Inland Revenue, Peshawar' },
  { value: 'Appellate Tribunal of Punjab Revenue Authority, Lahore (Bench-I)', label: 'Appellate Tribunal of Punjab Revenue Authority, Lahore (Bench-I)' },
  { value: 'Appellate Tribunal of Punjab Revenue Authority, Lahore (Bench-II)', label: 'Appellate Tribunal of Punjab Revenue Authority, Lahore (Bench-II)' },
  { value: 'Appellate Tribunal, Sindh Revenue Board', label: 'Appellate Tribunal, Sindh Revenue Board' },
  { value: 'Appellate Tribunal Sindh Revenue Board, Karachi', label: 'Appellate Tribunal Sindh Revenue Board, Karachi' },
  { value: 'Assam High Court', label: 'Assam High Court' },
  { value: 'Authority for Advance Rulings, New Delhi', label: 'Authority for Advance Rulings, New Delhi' },
  { value: 'Authority under payment of Wages Act, 1936', label: 'Authority under payment of Wages Act, 1936' },
  { value: 'Baghdad ul Jadid', label: 'Baghdad ul Jadid' },
  { value: 'Bahawalpur High Court', label: 'Bahawalpur High Court' },
  { value: 'BAKING COURT NO. V, KARACHI', label: 'BAKING COURT NO. V, KARACHI' },
  { value: 'Balochistan High Court', label: 'Balochistan High Court' },
  { value: 'Balochistan High Court, Sibi Bench', label: 'Balochistan High Court, Sibi Bench' },
  { value: 'Balochistan High Court, Turbat Bench', label: 'Balochistan High Court, Turbat Bench' },
  { value: 'Balochistan Sales Tax on Services Appellate Tribunal, Quetta', label: 'Balochistan Sales Tax on Services Appellate Tribunal, Quetta' },
  { value: 'Bangladesh High Court', label: 'Bangladesh High Court' },
  { value: 'Banking Court', label: 'Banking Court' },
  { value: 'Bar Council Election Tribunal, Quetta', label: 'Bar Council Election Tribunal, Quetta' },
  { value: 'Bar Council Tribunal, N.W.F.P', label: 'Bar Council Tribunal, N.W.F.P' },
  { value: 'Bar Council Tribunal, Pakistan', label: 'Bar Council Tribunal, Pakistan' },
  { value: 'Bar Council Tribunal, Peshawar', label: 'Bar Council Tribunal, Peshawar' },
  { value: 'Bar Council Tribunal, Punjab', label: 'Bar Council Tribunal, Punjab' },
  { value: 'Board of Revenue, N.W.F.P', label: 'Board of Revenue, N.W.F.P' },
  { value: 'Board of Revenue, Punjab', label: 'Board of Revenue, Punjab' },
  { value: 'Board of Revenue, Sindh', label: 'Board of Revenue, Sindh' },
  { value: 'Board of Trustees Employees Old-Age Benefits Institution', label: 'Board of Trustees Employees Old-Age Benefits Institution' },
  { value: 'Bombay High Court', label: 'Bombay High Court' },
  { value: 'Calcutta High Court', label: 'Calcutta High Court' },
  { value: 'Central Services Tribunal', label: 'Central Services Tribunal' },
  { value: 'Chancery Division', label: 'Chancery Division' },
  { value: 'Chhattisgarh High Court', label: 'Chhattisgarh High Court' },
  { value: 'CHIEF COURT OF OUDH', label: 'CHIEF COURT OF OUDH' },
  { value: 'Chief Land Commissioner', label: 'Chief Land Commissioner' },
  { value: 'Cochin High Court', label: 'Cochin High Court' },
  { value: 'Commissioner Appeals, Punjab Revenue Authority, Lahore', label: 'Commissioner Appeals, Punjab Revenue Authority, Lahore' },
  { value: 'Commissioner for Workmens Compensation and Authority', label: 'Commissioner for Workmens Compensation and Authority' },
  { value: 'Commissioner Inland Revenue, (Appeals II), Islamabad', label: 'Commissioner Inland Revenue, (Appeals II), Islamabad' },
  { value: 'Commissioner Inland Revenue (Appeals), Karachi', label: 'Commissioner Inland Revenue (Appeals), Karachi' },
  { value: 'COMMISSIONER OF INCOME TAX, SPECIAL ZONE, LAHORE', label: 'COMMISSIONER OF INCOME TAX, SPECIAL ZONE, LAHORE' },
  { value: 'Competition Appellate Tribunal, Islamabad', label: 'Competition Appellate Tribunal, Islamabad' },
  { value: 'Competition Commission of Pakistan', label: 'Competition Commission of Pakistan' },
  { value: 'Constitutional Court of South Africa', label: 'Constitutional Court of South Africa' },
  { value: 'Court of Appeal', label: 'Court of Appeal' },
  { value: 'COURT OF SPECIAL JUDGE (CUSTOMS, TAXATION & ANTI-SMUGGLING-I) KARACHI', label: 'COURT OF SPECIAL JUDGE (CUSTOMS, TAXATION & ANTI-SMUGGLING-I) KARACHI' },
  { value: 'Court of Special Judge, Karachi', label: 'Court of Special Judge, Karachi' },
  { value: 'Customs and Excise Appellate Tribunal', label: 'Customs and Excise Appellate Tribunal' },
  { value: 'Customs Appellate Tribunal', label: 'Customs Appellate Tribunal' },
  { value: 'Customs Appellate Tribunal, Bench-II, Lahore', label: 'Customs Appellate Tribunal, Bench-II, Lahore' },
  { value: 'Customs Appellate Tribunal, Islamabad (Larger Bench)', label: 'Customs Appellate Tribunal, Islamabad (Larger Bench)' },
  { value: 'Customs Appellate Tribunal, Karachi', label: 'Customs Appellate Tribunal, Karachi' },
  { value: 'Customs Appellate Tribunal, Peshawar', label: 'Customs Appellate Tribunal, Peshawar' },
  { value: 'Customs Appellate Tribunal, Quetta Bench', label: 'Customs Appellate Tribunal, Quetta Bench' },
  { value: 'CUSTOMS APPELLATE TRIBUNAL, QUETTA BENCH, 3RD FLOOR JAMIL CHAMBER, SADDAR, KARACHI (CAMP OFFICE AT KARACHI)', label: 'CUSTOMS APPELLATE TRIBUNAL, QUETTA BENCH, 3RD FLOOR JAMIL CHAMBER, SADDAR, KARACHI (CAMP OFFICE AT KARACHI)' },
  { value: 'CUSTOMS APPELLATE TRIBUNAL QUETTA BENCH (Camp Office), 2ND FLOOR JAMIL CHAMBER, CO-OPERATIVE MARKET, SADDAR, KARACHI.', label: 'CUSTOMS APPELLATE TRIBUNAL QUETTA BENCH (Camp Office), 2ND FLOOR JAMIL CHAMBER, CO-OPERATIVE MARKET, SADDAR, KARACHI.' },
  { value: 'Customs Appellate Tribunal, Quetta Bench (Camp Office at Karachi / Lahore)', label: 'Customs Appellate Tribunal, Quetta Bench (Camp Office at Karachi / Lahore)' },
  { value: 'Customs Appellate Tribunal, Quetta Bench (Camp Office at Lahore)', label: 'Customs Appellate Tribunal, Quetta Bench (Camp Office at Lahore)' },
  { value: 'Customs, Excise and Sales Tax Appellate Tribunal, Karachi', label: 'Customs, Excise and Sales Tax Appellate Tribunal, Karachi' },
  { value: 'Customs, Excise and Sales Tax Appellate Tribunal, Lahore', label: 'Customs, Excise and Sales Tax Appellate Tribunal, Lahore' },
  { value: 'Dacca High Court', label: 'Dacca High Court' },
  { value: 'Delhi High Court', label: 'Delhi High Court' },
  { value: 'East Punjab High Court', label: 'East Punjab High Court' },
  { value: 'Election Commission of Pakistan', label: 'Election Commission of Pakistan' },
  { value: 'Election Tribunal (AJ&K)', label: 'Election Tribunal (AJ&K)' },
  { value: 'Election Tribunal, Balochistan', label: 'Election Tribunal, Balochistan' },
  { value: 'Election Tribunal, Lahore', label: 'Election Tribunal, Lahore' },
  { value: 'Election Tribunal, N.W.F.P', label: 'Election Tribunal, N.W.F.P' },
  { value: 'Election Tribunal, Pakistan', label: 'Election Tribunal, Pakistan' },
  { value: 'Election Tribunal, Peshawar', label: 'Election Tribunal, Peshawar' },
  { value: 'Election Tribunal, Punjab', label: 'Election Tribunal, Punjab' },
  { value: 'Election Tribunal, Quetta', label: 'Election Tribunal, Quetta' },
  { value: 'Election Tribunal, Sindh', label: 'Election Tribunal, Sindh' },
  { value: 'Employees Old-Age Benefits Institution Sindh', label: 'Employees Old-Age Benefits Institution Sindh' },
  { value: 'Employees Social Security Institution, Punjab', label: 'Employees Social Security Institution, Punjab' },
  { value: 'Environmental Protection Tribunal, Karachi', label: 'Environmental Protection Tribunal, Karachi' },
  { value: 'Environmental Tribunal, Lahore', label: 'Environmental Tribunal, Lahore' },
  { value: 'Federal Constitutional Court of Pakistan', label: 'Federal Constitutional Court of Pakistan' },
  { value: 'Federal Court, Pakistan', label: 'Federal Court, Pakistan' },
  { value: 'Federal Service Tribunal, Islamabad', label: 'Federal Service Tribunal, Islamabad' },
  { value: 'Federal Service Tribunal, Karachi', label: 'Federal Service Tribunal, Karachi' },
  { value: 'Federal Service Tribunal, Lahore', label: 'Federal Service Tribunal, Lahore' },
  { value: 'Federal Shariat Court', label: 'Federal Shariat Court' },
  { value: 'Federal Tax Ombudsman', label: 'Federal Tax Ombudsman' },
  { value: 'Foreign Exchange Appellate Board', label: 'Foreign Exchange Appellate Board' },
  { value: 'Gauhati High Court', label: 'Gauhati High Court' },
  { value: 'Gilgit Baltistan Chief Court', label: 'Gilgit Baltistan Chief Court' },
  { value: 'Gilgit Baltistan Service Tribunal', label: 'Gilgit Baltistan Service Tribunal' },
  { value: 'Gujarat High Court', label: 'Gujarat High Court' },
  { value: 'High Court (AJ&K)', label: 'High Court (AJ&K)' },
  { value: 'HIGH COURT OF APPEAL', label: 'HIGH COURT OF APPEAL' },
  { value: 'High Court of Australia', label: 'High Court of Australia' },
  { value: 'High Court of Himachal Pradesh', label: 'High Court of Himachal Pradesh' },
  { value: 'Himachal Pradesh High Court', label: 'Himachal Pradesh High Court' },
  { value: 'House of Lord', label: 'House of Lord' },
  { value: 'Hyderabad High Court', label: 'Hyderabad High Court' },
  { value: 'IIIrd Labour Appellate Tribunal, Punjab', label: 'IIIrd Labour Appellate Tribunal, Punjab' },
  { value: 'IIIrd Labour Appellate Tribunal, Sindh', label: 'IIIrd Labour Appellate Tribunal, Sindh' },
  { value: 'IInd Labour Appellate Tribunal, Punjab', label: 'IInd Labour Appellate Tribunal, Punjab' },
  { value: 'Implementation Tribunal For Newspaper Employees', label: 'Implementation Tribunal For Newspaper Employees' },
  { value: 'Implementation Tribunal, Punjab', label: 'Implementation Tribunal, Punjab' },
  { value: 'Implementation Tribunal, Quetta', label: 'Implementation Tribunal, Quetta' },
  { value: 'Income Tax Appellate Tribunal', label: 'Income Tax Appellate Tribunal' },
  { value: 'Income Tax Appellate Tribunal, Ahmedabad', label: 'Income Tax Appellate Tribunal, Ahmedabad' },
  { value: 'Income Tax Appellate Tribunal, Bangalore', label: 'Income Tax Appellate Tribunal, Bangalore' },
  { value: 'Income Tax Appellate Tribunal, Bangladesh', label: 'Income Tax Appellate Tribunal, Bangladesh' },
  { value: 'Income Tax Appellate Tribunal, Dacca', label: 'Income Tax Appellate Tribunal, Dacca' },
  { value: 'Income Tax Appellate Tribunal, Islamabad', label: 'Income Tax Appellate Tribunal, Islamabad' },
  { value: 'Income Tax Appellate Tribunal, Islamabad', label: 'Income Tax Appellate Tribunal, Islamabad' },
  { value: 'Income Tax Appellate Tribunal, Jaipur', label: 'Income Tax Appellate Tribunal, Jaipur' },
  { value: 'Income Tax Appellate Tribunal, Karachi', label: 'Income Tax Appellate Tribunal, Karachi' },
  { value: 'Income Tax Appellate Tribunal, Lahore', label: 'Income Tax Appellate Tribunal, Lahore' },
  { value: 'Income Tax Appellate Tribunal Pakistan', label: 'Income Tax Appellate Tribunal Pakistan' },
  { value: 'Income Tax Appellate Tribunal, Peshawar', label: 'Income Tax Appellate Tribunal, Peshawar' },
  { value: 'Income-tax Settlement Commission (Special Bench)', label: 'Income-tax Settlement Commission (Special Bench)' },
  { value: 'Insurance Appellate Tribunal Punjab', label: 'Insurance Appellate Tribunal Punjab' },
  { value: 'Insurance Tribunal, Lahore', label: 'Insurance Tribunal, Lahore' },
  { value: 'Insurance Tribunal, Multan', label: 'Insurance Tribunal, Multan' },
  { value: 'Intellectual Property Tribunal', label: 'Intellectual Property Tribunal' },
  { value: 'Islamabad High Court', label: 'Islamabad High Court' },
  { value: 'IVth Labour Appellate Tribunal, Punjab', label: 'IVth Labour Appellate Tribunal, Punjab' },
  { value: 'Jharkhand High Court', label: 'Jharkhand High Court' },
  { value: 'Judiciary COMMISSIONERS COURT OF NAGPUR', label: 'Judiciary COMMISSIONERS COURT OF NAGPUR' },
  { value: 'Judiciary COMMISSIONERS COURT OF PESHAWAR', label: 'Judiciary COMMISSIONERS COURT OF PESHAWAR' },
  { value: 'Judiciary Commissioners Court of Sindh', label: 'Judiciary Commissioners Court of Sindh' },
  { value: 'Karnataka High Court', label: 'Karnataka High Court' },
  { value: 'Kerala High Court', label: 'Kerala High Court' },
  { value: 'KINGS BENCH DIVISION', label: 'KINGS BENCH DIVISION' },
  { value: 'KPK Service Tribunal', label: 'KPK Service Tribunal' },
  { value: 'Labour Appellate Tribunal', label: 'Labour Appellate Tribunal' },
  { value: 'Labour Appellate Tribunal, Balochistan', label: 'Labour Appellate Tribunal, Balochistan' },
  { value: 'Labour Appellate Tribunal, Multan', label: 'Labour Appellate Tribunal, Multan' },
  { value: 'Labour Appellate Tribunal, N.W.F.P.', label: 'Labour Appellate Tribunal, N.W.F.P.' },
  { value: 'Labour Appellate Tribunal, Peshawar', label: 'Labour Appellate Tribunal, Peshawar' },
  { value: 'Labour Appellate Tribunal, Punjab', label: 'Labour Appellate Tribunal, Punjab' },
  { value: 'Labour Appellate Tribunal, Quetta', label: 'Labour Appellate Tribunal, Quetta' },
  { value: 'Labour Appellate Tribunal, Sindh', label: 'Labour Appellate Tribunal, Sindh' },
  { value: 'Labour Appellate Tribunal, Sindh', label: 'Labour Appellate Tribunal, Sindh' },
  { value: 'Lahore High Court', label: 'Lahore High Court' },
  { value: 'Lahore High Court, Bahawalpur Bench, Bahalwalpur', label: 'Lahore High Court, Bahawalpur Bench, Bahalwalpur' },
  { value: 'Lahore High Court, Multan Bench, Multan', label: 'Lahore High Court, Multan Bench, Multan' },
  { value: 'Lahore High Court, Rawalpindi Bench, Rawalpindi', label: 'Lahore High Court, Rawalpindi Bench, Rawalpindi' },
  { value: 'Madhya Pradesh High Court', label: 'Madhya Pradesh High Court' },
  { value: 'Madras High Court', label: 'Madras High Court' },
  { value: 'Maharashtra High Court', label: 'Maharashtra High Court' },
  { value: 'Monopoly Control Authority', label: 'Monopoly Control Authority' },
  { value: 'Mumbai High Court', label: 'Mumbai High Court' },
  { value: 'Mysore High Court', label: 'Mysore High Court' },
  { value: 'Nagpur High Court', label: 'Nagpur High Court' },
  { value: 'National Industrial Relations Commission', label: 'National Industrial Relations Commission' },
  { value: 'Northern Areas Chief Court', label: 'Northern Areas Chief Court' },
  { value: 'Northern Areas Court of Appeals', label: 'Northern Areas Court of Appeals' },
  { value: 'Orissa High Court', label: 'Orissa High Court' },
  { value: 'Oudh High Court', label: 'Oudh High Court' },
  { value: 'Pakistan Bar Council', label: 'Pakistan Bar Council' },
  { value: 'Pakistan Labour Court', label: 'Pakistan Labour Court' },
  { value: 'Patna High Court', label: 'Patna High Court' },
  { value: 'Peshawar High Court', label: 'Peshawar High Court' },
  { value: 'Peshawar High Court, Abbottabad Bench', label: 'Peshawar High Court, Abbottabad Bench' },
  { value: 'Peshawar High Court, Bannu Bench', label: 'Peshawar High Court, Bannu Bench' },
  { value: 'Peshawar High Court, D.I. Khan Bench', label: 'Peshawar High Court, D.I. Khan Bench' },
  { value: 'Peshawar High Court, Mingora Bench', label: 'Peshawar High Court, Mingora Bench' },
  { value: 'PRESIDENTS SECRETARIAT (PUBLIC) AIWAN-E-SADR, ISLAMABAD', label: 'PRESIDENTS SECRETARIAT (PUBLIC) AIWAN-E-SADR, ISLAMABAD' },
  { value: 'Privy Council', label: 'Privy Council' },
  { value: 'Punjab and Haryana High Court', label: 'Punjab and Haryana High Court' },
  { value: 'Punjab Environmental Tribunal, Lahore', label: 'Punjab Environmental Tribunal, Lahore' },
  { value: 'Punjab High Court', label: 'Punjab High Court' },
  { value: 'Punjab Labour Appellate Tribunal', label: 'Punjab Labour Appellate Tribunal' },
  { value: 'Punjab Revenue Appellate Tribunal', label: 'Punjab Revenue Appellate Tribunal' },
  { value: 'Punjab Revenue Authority, Lahore', label: 'Punjab Revenue Authority, Lahore' },
  { value: 'Punjab service tribunal, Lahore', label: 'Punjab service tribunal, Lahore' },
  { value: 'Punjab Subordinate Judiciary Service Tribunal', label: 'Punjab Subordinate Judiciary Service Tribunal' },
  { value: 'Quetta High Court', label: 'Quetta High Court' },
  { value: 'Quetta Service Tribunal', label: 'Quetta Service Tribunal' },
  { value: 'Rajasthan High Court', label: 'Rajasthan High Court' },
  { value: 'Rangoon High Court', label: 'Rangoon High Court' },
  { value: 'Securities and Exchange Commission of Pakistan', label: 'Securities and Exchange Commission of Pakistan' },
  { value: 'Seed Corporation Employees Union, Sindh', label: 'Seed Corporation Employees Union, Sindh' },
  { value: 'Service Tribunal (AJ&K)', label: 'Service Tribunal (AJ&K)' },
  { value: 'Service Tribunal, Balochistan', label: 'Service Tribunal, Balochistan' },
  { value: 'Service Tribunal, Islamabad', label: 'Service Tribunal, Islamabad' },
  { value: 'Service Tribunal, KPK', label: 'Service Tribunal, KPK' },
  { value: 'Service Tribunal, N.W.F.P.', label: 'Service Tribunal, N.W.F.P.' },
  { value: 'Service Tribunal, Pakistan', label: 'Service Tribunal, Pakistan' },
  { value: 'Service Tribunal Punjab', label: 'Service Tribunal Punjab' },
  { value: 'Service Tribunal, Punjab', label: 'Service Tribunal, Punjab' },
  { value: 'Service Tribunal, Quetta', label: 'Service Tribunal, Quetta' },
  { value: 'Service Tribunal, Sindh', label: 'Service Tribunal, Sindh' },
  { value: 'Shariat Appellate Bench', label: 'Shariat Appellate Bench' },
  { value: 'Shariat Court (AJ&K)', label: 'Shariat Court (AJ&K)' },
  { value: 'Sikkim High Court', label: 'Sikkim High Court' },
  { value: 'Sindh Chief Court', label: 'Sindh Chief Court' },
  { value: 'Sindh High Court', label: 'Sindh High Court' },
  { value: 'Sindh High Court, Hyderabad Bench', label: 'Sindh High Court, Hyderabad Bench' },
  { value: 'Sindh High Court, Larkana Bench', label: 'Sindh High Court, Larkana Bench' },
  { value: 'Sindh High Court, Sukkur Bench', label: 'Sindh High Court, Sukkur Bench' },
  { value: 'Sindh Labour Appellate Tribunal', label: 'Sindh Labour Appellate Tribunal' },
  { value: 'Sindh Revenue Board', label: 'Sindh Revenue Board' },
  { value: 'Special Court Islamabad', label: 'Special Court Islamabad' },
  { value: 'Special Court of Offences in Banks', label: 'Special Court of Offences in Banks' },
  { value: 'Special Judge Customs, Taxation & Anti-Smuggling Court, Balochistan, Quetta', label: 'Special Judge Customs, Taxation & Anti-Smuggling Court, Balochistan, Quetta' },
  { value: 'Subordinate Judiciary Service Tribunal, KPK', label: 'Subordinate Judiciary Service Tribunal, KPK' },
  { value: 'Subordinate Judiciary Service Tribunal, N.W.F.P.', label: 'Subordinate Judiciary Service Tribunal, N.W.F.P.' },
  { value: 'Subordinate Judiciary Service Tribunal, Punjab', label: 'Subordinate Judiciary Service Tribunal, Punjab' },
  { value: 'Subordinate Judiciary Service Tribunal, Punjab', label: 'Subordinate Judiciary Service Tribunal, Punjab' },
  { value: 'Subordinate Judiciary Service Tribunal, Sindh', label: 'Subordinate Judiciary Service Tribunal, Sindh' },
  { value: 'Supreme Appellate Court Gilgit-Baltistan', label: 'Supreme Appellate Court Gilgit-Baltistan' },
  { value: 'Supreme Appellate Court, Northern Areas', label: 'Supreme Appellate Court, Northern Areas' },
  { value: 'Supreme Appellate Court, Pakistan', label: 'Supreme Appellate Court, Pakistan' },
  { value: 'Supreme Court (AJ&K)', label: 'Supreme Court (AJ&K)' },
  { value: 'Supreme Court of Bangladesh', label: 'Supreme Court of Bangladesh' },
  { value: 'Supreme Court of Canada', label: 'Supreme Court of Canada' },
  { value: 'Supreme Court of Cyprus', label: 'Supreme Court of Cyprus' },
  { value: 'Supreme Court of India', label: 'Supreme Court of India' },
  { value: 'Supreme Court of New Zealand', label: 'Supreme Court of New Zealand' },
  { value: 'Supreme Court of Pakistan', label: 'Supreme Court of Pakistan' },
  { value: 'Supreme Court of the United States', label: 'Supreme Court of the United States' },
  { value: 'Supreme Court of UK', label: 'Supreme Court of UK' },
  { value: 'TELANGANA AND ANDHRA PRADESH HIGH COURT', label: 'TELANGANA AND ANDHRA PRADESH HIGH COURT' },
  { value: 'TRAVANCORE, Cochin High Court', label: 'TRAVANCORE, Cochin High Court' },
  { value: 'Tripura High Court', label: 'Tripura High Court' },
  { value: 'Uttarakhand High Court', label: 'Uttarakhand High Court' },
  { value: 'Uttaranchal High Court', label: 'Uttaranchal High Court' },
  { value: 'West Pakistan', label: 'West Pakistan' },
  { value: 'WEST PAKISTAN, KARACHI', label: 'WEST PAKISTAN, KARACHI' },
  { value: 'West Pakistan Lahore', label: 'West Pakistan Lahore' },
  { value: 'West Punjab', label: 'West Punjab' }
];


const SearchCaseLawPage = () => {
  const [searchParams, setSearchParams] = useState({
    yearVolume: '',
    magazine: '',
    page: '',
    selectLaw: '',
    section: '',
    section2: '',
    court: '',
    caseNumber: '',
    date: null,
    keywords: '',
    keywords2: '',
    phrase: '',
    judges: '',
    lawyers: '',
    petitioner: '',
    principleLaw: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [viewCaseId, setViewCaseId] = useState(null);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  const handleInputChange = (field) => (e) => {
    // Check if it's an event (from Input) or direct value (from DatePicker)
    const value = e && e.target !== undefined ? e.target.value : e;
    setSearchParams(prev => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setSearchParams({
      yearVolume: '',
      magazine: '',
      page: '',
      selectLaw: '',
      section: '',
      section2: '',
      court: '',
      caseNumber: '',
      date: null,
      keywords: '',
      keywords2: '',
      phrase: '',
      judges: '',
      lawyers: '',
      petitioner: '',
      principleLaw: ''
    });
    setResults(null);
    setError(null);
  };

  const handleSearch = async () => {
    setError(null);
    setResults(null);
    
    // Format date properly if it exists
    const filtersToSubmit = { ...searchParams };
    if (filtersToSubmit.date) {
      filtersToSubmit.date = filtersToSubmit.date.toISOString().split('T')[0];
    }
    
    // Check if at least one filter is applied
    const hasFilter = Object.values(filtersToSubmit).some(val => val && val.toString().trim() !== '');
    if (!hasFilter) {
      setError('Please provide at least one search criteria.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await caseService.searchCases(filtersToSubmit);
      setResults(data);
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred during the search. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full animate-fade-in space-y-6 pb-12 w-full">
      <div className="bg-white dark:bg-theme-surface border border-theme-border rounded-xl shadow-sm overflow-hidden flex flex-col p-6">
        
        {/* Form Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#f15a24] text-white flex items-center justify-center shrink-0">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Select single or multiple blocks</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Fill any combination of fields to find relevant case laws</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 border border-orange-200 text-[#f15a24] text-sm font-semibold rounded-lg hover:bg-orange-50 transition-colors">
              <RefreshCw className="w-4 h-4" /> Reset All
            </button>
            <button 
              onClick={handleSearch}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[#f15a24] text-white text-sm font-semibold rounded-lg hover:bg-orange-600 shadow-sm transition-colors disabled:opacity-50">
              <Search className="w-4 h-4" /> Quick Search
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">
            {error}
          </div>
        )}

        {/* Form Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
          
          {/* Row 1 */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Year / Volume</label>
            <Input icon={Calendar} placeholder="e.g. 2026 or Vol. 78" value={searchParams.yearVolume} onChange={handleInputChange('yearVolume')} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Magazine</label>
            <Input type="select" icon={Book} options={MAGAZINE_OPTIONS} value={searchParams.magazine} onChange={handleInputChange('magazine')} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Page</label>
            <Input icon={BookOpen} placeholder="Enter page number" value={searchParams.page} onChange={handleInputChange('page')} />
          </div>

          {/* Row 2 */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Select Law</label>
            <Input type="select" icon={Scale} options={LAW_OPTIONS} value={searchParams.selectLaw} onChange={handleInputChange('selectLaw')} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Enter Section</label>
            <Input icon={() => <span className="font-serif text-lg leading-none">A </span>} placeholder="e.g. 302" value={searchParams.section} onChange={handleInputChange('section')} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Enter Section 2</label>
            <Input icon={() => <span className="font-serif text-lg leading-none">A </span>} placeholder="e.g. (b)" value={searchParams.section2} onChange={handleInputChange('section2')} />
          </div>

          {/* Row 3 */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Select Court</label>
            <Input type="select" icon={Landmark} options={[{value: '', label: 'Choose a court'}, ...COURT_OPTIONS]} value={searchParams.court} onChange={handleInputChange('court')} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Enter Case #</label>
            <Input icon={Hash} placeholder="e.g. PLD 2026 SC 123" value={searchParams.caseNumber} onChange={handleInputChange('caseNumber')} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Enter Date</label>
            <DatePicker selectedDate={searchParams.date} onChange={handleInputChange('date')} placeholder="DD/MM/YYYY" />
          </div>

          {/* Row 4 */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Enter Text</label>
            <Input icon={FileText} placeholder="Enter keywords" value={searchParams.keywords} onChange={handleInputChange('keywords')} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Enter Text 2</label>
            <Input icon={FileText} placeholder="Enter additional keywords" value={searchParams.keywords2} onChange={handleInputChange('keywords2')} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Phrase Search</label>
            <Input icon={Quote} placeholder="Enter exact phrase" value={searchParams.phrase} onChange={handleInputChange('phrase')} />
          </div>

          {/* Row 5 */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Judges</label>
            <Input icon={User} placeholder="e.g. Justice A.B. Khan" value={searchParams.judges} onChange={handleInputChange('judges')} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Lawyers</label>
            <Input icon={Briefcase} placeholder="e.g. Barrister XYZ" value={searchParams.lawyers} onChange={handleInputChange('lawyers')} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Petitioner</label>
            <Input icon={User} placeholder="e.g. ABC Company" value={searchParams.petitioner} onChange={handleInputChange('petitioner')} />
          </div>

          {/* Row 6 - Full Width */}
          <div className="md:col-span-2 lg:col-span-3 border-t border-gray-100 dark:border-theme-border pt-5 mt-2">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Select Principle Law</label>
            <Input type="select" icon={Scale} options={[{value: '', label: 'Choose principle law'}, ...LAW_OPTIONS.filter(o => o.value !== '')]} value={searchParams.principleLaw} onChange={handleInputChange('principleLaw')} />
          </div>

        </div>

        {/* Main Search Button */}
        <div className="flex justify-center mt-8">
          <button 
            onClick={handleSearch}
            disabled={isLoading}
            className="flex items-center gap-2 px-12 py-3 bg-[#f15a24] text-white font-bold rounded-lg hover:bg-orange-600 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f15a24] disabled:opacity-50">
            {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />} 
            {isLoading ? 'Searching...' : 'Search Case Laws'}
          </button>
        </div>
      </div>

      {/* Results Section */}
      {results && (
        <div className="bg-white dark:bg-theme-surface border border-theme-border rounded-xl shadow-sm p-6 animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Search Results</h2>
            <span className="px-3 py-1 bg-orange-100 text-brand-orange rounded-full text-sm font-semibold">
              {results.length} case{results.length !== 1 && 's'} found
            </span>
          </div>

          {results.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Search className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p>No cases found matching your criteria.</p>
              <button onClick={handleReset} className="mt-4 text-[#f15a24] hover:underline font-medium">Clear filters and try again</button>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((caseItem, idx) => (
                <div key={caseItem.id || idx} className="p-4 border border-theme-border rounded-xl hover:border-[#f15a24] transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-gray-100 dark:bg-theme-surface-alt rounded text-xs font-semibold text-gray-600 dark:text-gray-400">
                          {caseItem.department}
                        </span>
                        {caseItem.mapYearPage && caseItem.mapYearPage.map((citation, i) => (
                          <span key={i} className="text-[#f15a24] font-bold text-sm bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                            {citation}
                          </span>
                        ))}
                      </div>
                      <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-1">{caseItem.court}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {caseItem.headNote || 'No summary available.'}
                      </p>
                    </div>
                    {/* View Button */}
                    <button onClick={() => setViewCaseId(caseItem.id || caseItem.case_id)} className="shrink-0 flex items-center gap-2 px-4 py-2 text-white bg-gray-900 hover:bg-[#f15a24] rounded-lg shadow-sm transition-all text-sm font-semibold">
                      <Eye className="w-4 h-4" /> View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pro Tip */}
      <div className="bg-[#fff7ed] dark:bg-[#fff7ed]/5 border border-orange-100 dark:border-orange-900/30 rounded-xl p-4 flex items-start gap-4 shadow-sm relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#f15a24]"></div>
        <div className="w-10 h-10 rounded-lg bg-white dark:bg-theme-surface flex items-center justify-center shrink-0 border border-orange-100 dark:border-theme-border">
          <Lightbulb className="w-5 h-5 text-[#f15a24]" />
        </div>
        <div className="flex flex-col pt-0.5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Pro Tip</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Use more specific keywords and filters to get more accurate results.</p>
        </div>
      </div>
      <CaseDocumentModal caseId={viewCaseId} onClose={() => setViewCaseId(null)} />
    </div>
  );
};

export default SearchCaseLawPage;



