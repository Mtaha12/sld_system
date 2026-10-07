import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, User, Scale, ExternalLink, 
  Copy, Check, FileText, RefreshCw,
  MessageSquare, Plus, X, Sparkles,
  Paperclip, Image as ImageIcon, FileUp, XCircle,
  PanelLeftClose, PanelLeftOpen, Gavel, BookOpen,
  ShieldCheck, FileCheck, Landmark, ChevronRight,
  HelpCircle, ArrowUpRight
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import LegalMarkdownRenderer from './LegalMarkdownRenderer';

const AIChatPanel = ({
  sessions = [],
  activeSessionId,
  onSelectSession,
  onNewSession,
  onCloseSession,
  messages = [],
  onSendMessage,
  isLoading = false,
  showWheel = true,
  onToggleWheel,
  className = ""
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedCitation, setCopiedCitation] = useState(null);
  const [attachments, setAttachments] = useState([]);   // [{ id, file, previewUrl, type, name, size }]
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const lastMessageRef = useRef(null);
  const prevMessagesCount = useRef(messages.length);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Precision Scroll Management:
  // When assistant gives a response, keep the user at the BEGINNING / TOP of the response
  // so the lawyer starts reading from line 1 and can scroll down easily.
  useEffect(() => {
    if (messages.length === 0) return;

    // Skip on initial mount if only default welcome message
    if (prevMessagesCount.current === 0 && messages.length <= 1) {
      prevMessagesCount.current = messages.length;
      return;
    }

    const lastMsg = messages[messages.length - 1];

    if (lastMsg) {
      if (lastMsg.sender === 'assistant') {
        // Assistant response received: scroll smoothly to the START / TOP of this response!
        setTimeout(() => {
          if (chatContainerRef.current && lastMessageRef.current) {
            const container = chatContainerRef.current;
            const target = lastMessageRef.current;
            const targetPosition = Math.max(0, target.offsetTop - container.offsetTop - 16);
            container.scrollTo({ top: targetPosition, behavior: 'smooth' });
          } else if (lastMessageRef.current) {
            lastMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 80);
      } else if (lastMsg.sender === 'user') {
        // User sent message: scroll down to show user's message
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      }
    }

    prevMessagesCount.current = messages.length;
  }, [messages]);

  // When loading starts, scroll so lawyer sees the scanning indicator
  useEffect(() => {
    if (isLoading) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  }, [isLoading]);

  // Auto-resize textarea as user types or pastes multiple paragraphs
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputText]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if ((!inputText.trim() && attachments.length === 0) || isLoading) return;

    // Process attachments to read text content and/or base64
    const processedAttachments = await Promise.all(attachments.map(async (att) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        const isText = att.file.type.includes('text') || 
          att.name.endsWith('.txt') || 
          att.name.endsWith('.csv') || 
          att.name.endsWith('.json') ||
          att.name.endsWith('.xml');

        if (isText) {
          reader.onload = () => resolve({
            name: att.name,
            type: att.file.type || 'text/plain',
            size: att.size,
            text: String(reader.result || '')
          });
          reader.onerror = () => resolve({ name: att.name, type: att.file.type, size: att.size, text: '' });
          reader.readAsText(att.file);
        } else {
          reader.onload = () => {
            const resultStr = String(reader.result || '');
            const base64Content = resultStr.includes(',') ? resultStr.split(',')[1] : resultStr;
            resolve({
              name: att.name,
              type: att.file.type || 'application/octet-stream',
              size: att.size,
              base64: base64Content
            });
          };
          reader.onerror = () => resolve({ name: att.name, type: att.file.type, size: att.size });
          reader.readAsDataURL(att.file);
        }
      });
    }));

    onSendMessage(inputText.trim(), processedAttachments);
    setInputText('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = '46px';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCopy = (citation, id) => {
    navigator.clipboard.writeText(citation);
    setCopiedCitation(id);
    setTimeout(() => setCopiedCitation(null), 2500);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newItems = files.map(file => {
      const isImage = file.type.startsWith('image/');
      return {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        file,
        name: file.name,
        size: file.size,
        isImage,
        previewUrl: isImage ? URL.createObjectURL(file) : null
      };
    });

    setAttachments(prev => [...prev, ...newItems]);
    e.target.value = '';
  };

  const removeAttachment = (id) => {
    setAttachments(prev => {
      const item = prev.find(a => a.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(a => a.id !== id);
    });
  };

  // Revoke all blob URLs on unmount
  useEffect(() => {
    return () => {
      attachments.forEach(a => { if (a.previewUrl) URL.revokeObjectURL(a.previewUrl); });
    };
  }, []);

  // Quick prompt filler for lawyers
  const setQuickPrompt = (promptText) => {
    setInputText(promptText);
    textareaRef.current?.focus();
  };

  // Check if session has only the default initial message
  const isFreshSession = messages.length === 1 && 
    messages[0].sender === 'assistant' && 
    (messages[0].text?.includes('SLD AI Legal Neural Engine') || messages[0].text?.includes('162,865') || messages[0].text?.includes('27,500'));

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden ${className}`}>
      
      {/* Top Chambers Docket & Tab Registry Bar (Sticky Top Header) */}
      <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-[#141721]/95 backdrop-blur-md flex items-center gap-2 shrink-0 z-20 overflow-x-auto no-scrollbar">
        
        {/* START: Hide/Show Wheel Button */}
        {onToggleWheel && (
          <button
            type="button"
            onClick={onToggleWheel}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs cursor-pointer whitespace-nowrap active:scale-95 shrink-0 ${
              showWheel
                ? 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white font-bold'
            }`}
            title={showWheel ? "Hide Reference Wheel" : "Show Reference Wheel"}
          >
            {showWheel ? (
              <>
                <PanelLeftClose className="w-3.5 h-3.5 text-amber-600" />
                <span>Hide Wheel</span>
              </>
            ) : (
              <>
                <PanelLeftOpen className="w-3.5 h-3.5 text-amber-500" />
                <span>Show Wheel</span>
              </>
            )}
          </button>
        )}

        {/* START: New Session Button */}
        <button
          type="button"
          onClick={onNewSession}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-bold transition-all shadow-xs hover:shadow-sm cursor-pointer whitespace-nowrap active:scale-95 shrink-0"
          title="Open new chat session"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Session</span>
        </button>

        <div className="h-5 w-[1px] bg-slate-300 dark:bg-slate-700 mx-1 shrink-0" />

        {/* Followed by: All Chat Session Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 py-0.5">
          {sessions.map((sess) => {
            const isActive = sess.id === activeSessionId;
            return (
              <div
                key={sess.id}
                onClick={() => onSelectSession?.(sess.id)}
                className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all border shrink-0 select-none ${
                  isActive
                    ? 'bg-white dark:bg-[#0f1117] text-amber-600 dark:text-amber-400 border-amber-500/40 shadow-xs z-10 font-bold'
                    : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/60 border-transparent'
                }`}
                title={sess.title}
              >
                <Gavel className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-amber-500' : 'text-slate-400 group-hover:text-slate-600'}`} />
                <span className="truncate max-w-[130px] sm:max-w-[170px]">
                  {sess.title || 'Legal Brief'}
                </span>
                
                {/* Close Tab Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseSession?.(sess.id, e);
                  }}
                  className={`rounded p-0.5 transition-all text-slate-400 hover:text-red-500 hover:bg-red-500/10 cursor-pointer ${
                    isActive ? 'opacity-80 hover:opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                  title="Close session"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

      </div>

      {/* Messages Scroll Stream */}
      <div ref={chatContainerRef} className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 relative scroll-smooth bg-slate-50/40 dark:bg-transparent">
        
        {/* If fresh session, display the Prestigious Chambers Welcome & Practice Portal */}
        {isFreshSession ? (
          <div className="max-w-4xl mx-auto py-4 space-y-6 animate-fade-in">
            
            {/* Chambers Hero Crest */}
            <div className="text-center space-y-3 pb-4 border-b border-slate-200/80 dark:border-slate-800">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-lg shadow-amber-500/20 mb-1">
                <Scale className="w-8 h-8" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-wide uppercase font-serif">
                Superior Law Digest • AI Legal Chambers
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto font-sans leading-relaxed">
                Autonomous Constitutional & Tax Drafting Suite and Precedent Search Engine designed exclusively for High Court & Supreme Court Advocates.
              </p>
              
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Active Database: 162,865+ Reported Pakistani Judgments & Statutory Orders</span>
              </div>
            </div>

            {/* 3 Core Practice Drafting Hubs */}
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-500" />
                  Prescribed Statutory Pleading Generators
                </span>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  Verified Court Formats
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                
                {/* Format 1: High Court Writ */}
                <div 
                  onClick={() => setQuickPrompt('Please generate High Court Writ Petition (Format 1) under Article 199 based on the attached document / details.')}
                  className="group relative p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131620] hover:border-amber-500/50 hover:shadow-md transition-all cursor-pointer space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      FORMAT 1
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    High Court Writ Petition
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Art. 199 Constitutional Petition with Index, 13-para petition (Nishat Hotels & Al-Hilal ratios), Stay u/s 151 CPC + Affidavit, Exemption & Vakalatnama.
                  </p>
                </div>

                {/* Format 2: ATIR Appeal */}
                <div 
                  onClick={() => setQuickPrompt('Please generate ATIR Appeal Form B (Format 2) under Section 46 of Sales Tax Act 1990 / Section 34 FEA 2005.')}
                  className="group relative p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131620] hover:border-amber-500/50 hover:shadow-md transition-all cursor-pointer space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                      FORMAT 2 • FORM B
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    ATIR Tribunal Appeal
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Appellate Tribunal Inland Revenue statutory Form "B" [Rule 7], Enclosures Table, Grounds of Appeal, and verification on oath.
                  </p>
                </div>

                {/* Format 3: CIT IT-16 */}
                <div 
                  onClick={() => setQuickPrompt('Please generate CIT Appeals Form IT-16 (Format 3) based on the attached assessment order.')}
                  className="group relative p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131620] hover:border-amber-500/50 hover:shadow-md transition-all cursor-pointer space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      FORMAT 3 • IT-16
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    CIT (Appeals) Income Tax
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Form of Appeal IT-16 to Commissioner (Appeals), Tax Assessed Breakdown Table, additions challenge u/s 122(5A), and verification.
                  </p>
                </div>

              </div>
            </div>

            {/* Common Case Law Precedent Queries */}
            <div>
              <div className="mb-2.5 px-1 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                Frequently Cited Precedents & Rulings
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => onSendMessage('Al-Hilal Motors 2004 PTD 868 on tax presumption')}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131620] hover:border-amber-500/40 text-left text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <span className="font-medium">🏛️ Al-Hilal Motors (2004 PTD 868) on presumption as to tax</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => onSendMessage('Nishat Hotels WP 16217 of 2020 Lahore High Court judgment on Section 39 PSTS')}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131620] hover:border-amber-500/40 text-left text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <span className="font-medium">🏛️ Nishat Hotels WP 16217/2020 on Section 39 appointment rules</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => onSendMessage('Section 7E Income Tax Ordinance 2001 deemed income constitutional challenge')}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131620] hover:border-amber-500/40 text-left text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <span className="font-medium">🏛️ Section 7E Deemed Income constitutional challenge & stay</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => onSendMessage('Section 122(5A) requirement of independent tangible evidence and confrontation')}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131620] hover:border-amber-500/40 text-left text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <span className="font-medium">🏛️ Section 122(5A) Requirement of tangible independent material</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>
              </div>
            </div>

          </div>
        ) : (
          messages.map((msg, index) => {
            const isLastMessage = index === messages.length - 1;
            const isUser = msg.sender === 'user';
            const analysis = msg.legalAnalysis;
            const matched = analysis?.matchedCase;
            const quote = analysis?.exactQuote;
            const isMultiCase = analysis?.matchedCases && analysis.matchedCases.length > 1;

            return (
              <div
                key={index}
                ref={isLastMessage ? lastMessageRef : null}
                className={`flex gap-3.5 animate-fade-in ${isUser ? 'justify-end' : 'justify-start'}`}
              >

                <div className={`max-w-[94%] space-y-3 ${isUser ? 'items-end' : 'items-start'}`}>
                  
                  {/* Message Bubble Body */}
                  {isUser ? (
                    <div className="p-4 sm:p-5 rounded-2xl rounded-tr-xs bg-slate-900 dark:bg-slate-800 text-white border border-slate-700/60 shadow-md">
                      
                      {/* Attached files indicator inside lawyer brief bubble */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3 pb-2.5 border-b border-white/15">
                          {msg.attachments.map((att, attIdx) => (
                            <div key={attIdx} className="inline-flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-300 border border-white/10">
                              <Paperclip className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[180px]">{att.name}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="whitespace-pre-line text-sm sm:text-base font-normal leading-relaxed font-sans">
                        {msg.text}
                      </div>

                      <div className="mt-2 pt-1 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/10">
                        <span className="font-semibold text-amber-400">Counsel Briefing</span>
                        <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ) : (
                    <LegalMarkdownRenderer text={msg.text} onCopy={() => setCopiedCitation('active')} />
                  )}

                  {/* Single Case Headnote Card (when case law is matched) */}
                  {!isUser && matched && !isMultiCase && (
                    <div className="bg-white dark:bg-[#131620] border border-amber-500/30 rounded-xl p-4 sm:p-5 shadow-md space-y-3.5 animate-fade-in">
                      
                      {/* Header Strip with SLD Badge & Court */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-2.5">
                          <span className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 text-white font-black text-xs sm:text-sm shadow-xs font-mono">
                            SLD #{matched.sldNumber || matched.id}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                            {matched.court}
                          </span>
                        </div>
                        
                        {analysis.confidence && (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-xs border border-emerald-500/20 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>{analysis.confidence}% Verified Match</span>
                          </span>
                        )}
                      </div>

                      {/* Map Year Page Citations */}
                      {matched.mapYearPage && matched.mapYearPage.length > 0 && (
                        <div className="font-bold text-sm sm:text-base text-amber-600 dark:text-amber-400 font-mono tracking-wide">
                          {matched.mapYearPage.join('  =  ')}
                        </div>
                      )}

                      {/* Parties and Bench */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800">
                        {matched.petitioners && matched.petitioners.length > 0 && (
                          <div>
                            <span className="font-bold text-slate-900 dark:text-slate-200 block">Litigants / Parties:</span>
                            <span className="truncate block mt-0.5">{matched.petitioners.join(' vs ')}</span>
                          </div>
                        )}
                        {matched.judges && matched.judges.length > 0 && (
                          <div>
                            <span className="font-bold text-slate-900 dark:text-slate-200 block">Coram / Bench:</span>
                            <span className="truncate block mt-0.5">{matched.judges.join(', ')}</span>
                          </div>
                        )}
                      </div>

                      {/* Highlighted Exact Judicial Passage */}
                      {quote?.surroundingContext && (
                        <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-l-4 border-amber-500 rounded-r-lg text-xs sm:text-sm leading-relaxed text-amber-950 dark:text-amber-200">
                          <span className="font-bold block text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1 font-sans flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5" />
                            Verbatim Passage from Judgment:
                          </span>
                          <blockquote className="italic font-serif">
                            "{quote.surroundingContext}"
                          </blockquote>
                        </div>
                      )}

                      {/* Action Toolbar */}
                      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                        <a
                          href={`/cases/view/${matched.sldNumber || matched.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer"
                        >
                          <FileText className="w-4 h-4" />
                          <span>View Full Judgment</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        {matched.mapYearPage && matched.mapYearPage.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleCopy(matched.mapYearPage.join(' = '), matched.sldNumber)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm transition-colors cursor-pointer"
                          >
                            {copiedCitation === matched.sldNumber ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-emerald-500 font-medium">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Citation</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                    </div>
                  )}

                  {/* Multi-Case Authority Cards (When multiple cases match, e.g. 236G, 236H, etc.) */}
                  {!isUser && isMultiCase && (
                    <div className="bg-white dark:bg-[#131620] border border-amber-500/30 rounded-xl p-4 sm:p-5 shadow-md space-y-4 animate-fade-in">
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
                        <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                          <Gavel className="w-4 h-4 text-amber-500" />
                          <span>All Matching Case Law Records ({analysis.matchedCases.length} Cases Found)</span>
                        </div>
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold font-mono">
                          Verified in SLD Database
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                        {analysis.matchedCases.map((c, cIdx) => (
                          <div 
                            key={c.id || cIdx}
                            className="p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 hover:border-amber-500/40 transition-all flex flex-col justify-between gap-2"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono">
                                  SLD #{c.sldNumber || c.id}
                                </span>
                                {c.dated && (
                                  <span className="text-[10px] text-slate-400">
                                    {String(c.dated).split('T')[0]}
                                  </span>
                                )}
                              </div>
                              <div className="font-bold text-xs text-slate-800 dark:text-slate-200 line-clamp-1">
                                {Array.isArray(c.citations) && c.citations.length > 0 ? c.citations.join(' = ') : `Case ${cIdx + 1}`}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                                {c.court || 'High Court of Record'}
                              </p>
                            </div>
                            <div className="pt-1 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between">
                              <span className="text-[10px] text-slate-400 font-mono">
                                {Array.isArray(c.caseNumber) ? c.caseNumber[0] : (c.caseNumber || '')}
                              </span>
                              <a
                                href={`/cases/view/${c.sldNumber || c.id || c._id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-500 transition-colors"
                              >
                                <span>View Document</span>
                                <ArrowUpRight className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

              </div>
            );
          })
        )}

        {/* Loading / Searching Indicator */}
        {isLoading && (
          <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 p-4 rounded-xl bg-white dark:bg-[#131620] border border-amber-500/30 shadow-xs animate-pulse">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-slate-200 block text-xs sm:text-sm">
                Scanning Supreme Court, High Court & Tribunal Database...
              </span>
              <span className="text-[11px] text-slate-500">
                Cross-referencing 162,865+ verified judgments, ratio decidendi & statutory rules
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Executive Lawyer Drafting Dock (Bottom Input Bar) */}
      <div className="p-3.5 bg-white dark:bg-[#12141c] border-t border-slate-200 dark:border-slate-800 shrink-0 space-y-2">

        {/* Hidden File Inputs */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.csv"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Queued Attachments Strip */}
        {attachments.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap px-1 pb-1">
            {attachments.map(att => (
              <div
                key={att.id}
                className="relative flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 max-w-[200px] shadow-2xs"
              >
                {att.isImage ? (
                  <img
                    src={att.previewUrl}
                    alt={att.name}
                    className="w-7 h-7 object-cover rounded shrink-0 border border-amber-500/40"
                  />
                ) : (
                  <FileUp className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                )}
                <span className="truncate max-w-[120px] font-medium">{att.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  className="ml-auto shrink-0 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                  title="Remove document"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Quick Statutory Format Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 shrink-0 flex items-center gap-1 uppercase tracking-wider">
            <Scale className="w-3 h-3 text-amber-500" />
            <span>Pleading Format:</span>
          </span>
          
          <button
            type="button"
            onClick={() => setQuickPrompt('Please generate High Court Writ Petition (Format 1) under Article 199 based on the attached document / details.')}
            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-500/10 hover:border-amber-500/40 text-slate-700 dark:text-slate-300 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer"
            title="High Court Writ with Index, Stay u/s 151 CPC, Exemption & Vakalatnama"
          >
            📜 Format 1: High Court Writ (Art. 199)
          </button>

          <button
            type="button"
            onClick={() => setQuickPrompt('Please generate ATIR Appeal Form B (Format 2) under Section 46 of Sales Tax Act 1990 based on the attached document.')}
            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-500/10 hover:border-amber-500/40 text-slate-700 dark:text-slate-300 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer"
            title="Form B Appeal to Appellate Tribunal Inland Revenue"
          >
            ⚖️ Format 2: ATIR Form B (Sec 46)
          </button>

          <button
            type="button"
            onClick={() => setQuickPrompt('Please generate CIT Appeals Form IT-16 (Format 3) based on the attached document / details.')}
            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-500/10 hover:border-amber-500/40 text-slate-700 dark:text-slate-300 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer"
            title="Form of Appeal IT-16 to Commissioner of Income Tax (Appeals)"
          >
            📑 Format 3: CIT IT-16 (Sec 122)
          </button>
        </div>

        {/* Input Bar Form */}
        <form onSubmit={handleSubmit} className="flex items-end gap-2">

          {/* Attach Image Button */}
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={isLoading}
            title="Attach scanned copy / image of order"
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-amber-500 transition-colors cursor-pointer shrink-0 disabled:opacity-40"
          >
            <ImageIcon className="w-4.5 h-4.5" />
          </button>

          {/* Attach Notice / Document Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            title="Attach show cause notice, assessment order, or PDF document"
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-amber-500 transition-colors cursor-pointer shrink-0 disabled:opacity-40"
          >
            <Paperclip className="w-4.5 h-4.5" />
          </button>

          {/* Multiline Expandable Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search 162,865+ case laws, or attach an order to draft Format 1 (Writ), Format 2 (ATIR), Format 3 (CIT)..."
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#161922] border border-slate-300 dark:border-slate-700 rounded-xl text-sm sm:text-base focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 text-slate-900 dark:text-slate-100 transition-all resize-none max-h-44 leading-relaxed font-sans"
              style={{ minHeight: '44px' }}
            />
          </div>

          {/* Send / Draft Button */}
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={(!inputText.trim() && attachments.length === 0) || isLoading}
            className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white h-[44px] px-5 rounded-xl flex items-center gap-2 shadow-sm font-bold text-sm sm:text-base shrink-0 active:scale-95 cursor-pointer"
          >
            <Scale className="w-4 h-4" />
            <span className="hidden sm:inline">Draft & Analyze</span>
            <span className="sm:hidden">Send</span>
          </Button>
        </form>

        {/* Lawyer Footer Helper */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 pt-0.5">
          <span className="flex items-center gap-1">
            <span>Press <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-[10px]">Enter ↵</kbd> to analyze</span>
            <span className="hidden sm:inline">• <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-[10px]">Shift + Enter</kbd> for new line</span>
          </span>
          <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>High Court & Tribunal Rules Compliant</span>
          </span>
        </div>

      </div>

    </div>
  );
};

export default AIChatPanel;
