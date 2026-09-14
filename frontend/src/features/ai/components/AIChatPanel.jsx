import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Bot, User, Sparkles, Scale, ExternalLink, 
  Copy, Check, FileText, AlertCircle, RefreshCw, Layers
} from 'lucide-react';
import Button from '../../../components/ui/Button';

const AIChatPanel = ({
  messages = [],
  onSendMessage,
  isLoading = false,
  onClearChat,
  onSuggestionClick,
  className = ""
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedCitation, setCopiedCitation] = useState(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const lastMessageRef = useRef(null);
  const prevMessagesCount = useRef(messages.length);

  // Precision Scroll Management:
  // When assistant gives a response, keep the user at the BEGINNING / TOP of the response
  // so the user starts reading from line 1 and can scroll down easily.
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
        // Assistant response received: scroll to the START / TOP of this response!
        setTimeout(() => {
          if (chatContainerRef.current && lastMessageRef.current) {
            const container = chatContainerRef.current;
            const target = lastMessageRef.current;
            const targetPosition = Math.max(0, target.offsetTop - container.offsetTop - 12);
            container.scrollTo({ top: targetPosition, behavior: 'smooth' });
          } else if (lastMessageRef.current) {
            lastMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 60);
      } else if (lastMsg.sender === 'user') {
        // User sent message: scroll down to show user's message
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      }
    }

    prevMessagesCount.current = messages.length;
  }, [messages]);

  // When loading starts, scroll so user sees the progress indicator
  useEffect(() => {
    if (isLoading) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  }, [isLoading]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleCopy = (citation, id) => {
    navigator.clipboard.writeText(citation);
    setCopiedCitation(id);
    setTimeout(() => setCopiedCitation(null), 2500);
  };

  const suggestions = [
    { label: 'Parallel Citation (2 Cases)', text: '(2011) 104 TAX 78' },
    { label: 'Refund Time-Bar Rule', text: 'refund is cannot be time barred' },
    { label: 'Exact Judgment Quote', text: 'The intention of the legislature is gathered from the language of the statute' },
    { label: 'SLD Citation', text: '2006 SLD 282' },
    { label: 'Statute Query', text: 'Section 7E Capital Value Tax rulings' }
  ];

  const renderFormattedText = (text) => {
    if (!text) return null;
    const lines = text.split('\n');

    return (
      <div className="space-y-2.5">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={idx} className="h-1.5" />;
          }

          // Horizontal Divider
          if (trimmed === '---') {
            return <hr key={idx} className="my-4 border-theme-border/70" />;
          }

          // Major Heading (### Case 1: ...)
          if (trimmed.startsWith('### ')) {
            // Strip markdown prefix and any duplicate leading emojis/symbols so only one icon appears
            const heading = trimmed
              .replace(/^###\s+/, '')
              .replace(/^[\p{Extended_Pictographic}\p{Emoji}\u200d\uFE0F\s]+/u, '')
              .trim();
            return (
              <h3 key={idx} className="text-lg sm:text-xl font-black text-brand-orange mt-5 mb-2.5 flex items-center gap-2">
                <Scale className="w-5 h-5 text-brand-orange shrink-0" />
                <span>{heading}</span>
              </h3>
            );
          }

          // Sub Heading (#### Overview & Significance)
          if (trimmed.startsWith('#### ')) {
            const subHeading = trimmed.replace(/^####\s+/, '');
            return (
              <h4 key={idx} className="text-sm sm:text-base font-bold text-theme-main uppercase tracking-wider mt-4 mb-1.5">
                {subHeading}
              </h4>
            );
          }

          // Blockquote (> "...")
          if (trimmed.startsWith('> ')) {
            const quoteText = trimmed.replace(/^>\s+/, '').replace(/^["']|["']$/g, '');
            return (
              <div key={idx} className="my-3 p-4 bg-amber-50/80 dark:bg-amber-950/30 border-l-4 border-brand-orange rounded-r-xl text-amber-950 dark:text-amber-200 text-sm sm:text-base italic font-serif leading-relaxed shadow-sm">
                "{quoteText}"
              </div>
            );
          }

          // Standalone Markdown Action Button [View Full Case Document ↗](...)
          const linkMatch = trimmed.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
          if (linkMatch) {
            const label = linkMatch[1];
            const href = linkMatch[2];
            return (
              <div key={idx} className="pt-2.5 pb-1.5">
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-orange hover:bg-brand-orange-hover text-white text-sm sm:text-base font-bold shadow-sm transition-all hover:shadow-md cursor-pointer no-underline"
                >
                  <FileText className="w-4 h-4" />
                  <span>{label}</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                </a>
              </div>
            );
          }

          // Format bold and inline links
          let html = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-brand-orange hover:underline font-bold">$1</a>');

          return (
            <p
              key={idx}
              className="text-sm sm:text-base leading-relaxed text-theme-main"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-theme-surface border border-theme-border rounded-xl shadow-lg overflow-hidden ${className}`}>
      
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-theme-border flex items-center justify-between bg-gray-50/70 dark:bg-theme-surface-alt/40 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-brand-orange/10 text-brand-orange border border-brand-orange/20">
            <Sparkles className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-theme-main leading-tight">
              SLD Legal Research Dialogue
            </h2>
            <span className="text-xs text-theme-muted mt-0.5 block">
              Grounded in 15,000 cases • Exact Line Search & Verification
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onClearChat && (
            <button
              type="button"
              onClick={onClearChat}
              className="px-3 py-1.5 rounded-lg text-theme-muted hover:text-theme-main hover:bg-theme-surface-alt transition-colors text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer font-medium"
              title="Clear Session"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Stream */}
      <div ref={chatContainerRef} className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-5 relative scroll-smooth">
        {messages.map((msg, index) => {
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
              {!isUser && (
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-brand-orange to-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <Bot className="w-5 h-5" />
                </div>
              )}

              <div className={`max-w-[92%] space-y-3 ${isUser ? 'items-end' : 'items-start'}`}>
                
                {/* Message Bubble Body with Rich Formatted Markdown */}
                <div className={`p-4 sm:p-5 rounded-2xl text-sm sm:text-base leading-relaxed ${
                  isUser
                    ? 'bg-brand-orange text-white rounded-br-none shadow-md font-medium'
                    : 'bg-theme-surface-alt/70 dark:bg-theme-surface-alt/50 text-theme-main border border-theme-border rounded-bl-none shadow-sm'
                }`}>
                  {isUser ? (
                    <div className="whitespace-pre-line text-sm sm:text-base font-medium leading-relaxed">{msg.text}</div>
                  ) : (
                    renderFormattedText(msg.text)
                  )}
                </div>

                {/* Single Case Card (only if not already listed as multi-case) */}
                {!isUser && matched && !isMultiCase && (
                  <div className="bg-white dark:bg-[#15171e] border border-brand-orange/30 rounded-xl p-4 shadow-md space-y-3.5 animate-fade-in">
                    
                    {/* Header Strip with SLD Badge & Confidence */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-theme-border/60">
                      <div className="flex items-center gap-2.5">
                        <span className="px-3 py-1 rounded-md bg-brand-orange text-white font-bold text-xs sm:text-sm shadow-sm">
                          SLD #{matched.sldNumber || matched.id}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-theme-main uppercase">
                          {matched.court}
                        </span>
                      </div>
                      
                      {analysis.confidence && (
                        <span className="px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 font-semibold text-xs border border-green-500/20">
                          {analysis.confidence}% Confidence Match
                        </span>
                      )}
                    </div>

                    {/* Citations */}
                    {matched.mapYearPage && matched.mapYearPage.length > 0 && (
                      <div className="font-bold text-sm sm:text-base text-brand-orange font-mono">
                        {matched.mapYearPage.join('  =  ')}
                      </div>
                    )}

                    {/* Parties and Bench */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm text-theme-muted bg-theme-surface-alt/40 p-3 rounded-lg border border-theme-border/40">
                      {matched.petitioners && matched.petitioners.length > 0 && (
                        <div>
                          <span className="font-bold text-theme-main block">Parties / Litigants:</span>
                          <span className="truncate block mt-0.5">{matched.petitioners.join(' vs ')}</span>
                        </div>
                      )}
                      {matched.judges && matched.judges.length > 0 && (
                        <div>
                          <span className="font-bold text-theme-main block">Bench / Judges:</span>
                          <span className="truncate block mt-0.5">{matched.judges.join(', ')}</span>
                        </div>
                      )}
                    </div>

                    {/* Highlighted Exact Quote Box */}
                    {quote?.surroundingContext && (
                      <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/20 border-l-4 border-brand-orange rounded-r-lg text-xs sm:text-sm leading-relaxed text-amber-900 dark:text-amber-200">
                        <span className="font-bold block text-xs uppercase tracking-wider text-brand-orange mb-1">
                          📜 Exact Passage from Original Order:
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
                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-colors cursor-pointer"
                      >
                        <FileText className="w-4 h-4" />
                        <span>View Full Judgment in New Tab</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      {matched.mapYearPage && matched.mapYearPage.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleCopy(matched.mapYearPage.join(' = '), matched.sldNumber)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-theme-border bg-theme-surface hover:bg-theme-surface-alt text-theme-main text-xs sm:text-sm transition-colors cursor-pointer"
                        >
                          {copiedCitation === matched.sldNumber ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-green-500" />
                              <span className="text-green-500 font-medium">Copied!</span>
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

              </div>

              {isUser && (
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-theme-surface-alt border border-theme-border text-theme-main flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <User className="w-5 h-5" />
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-3 text-sm text-theme-muted p-2.5 animate-pulse">
            <div className="w-7 h-7 rounded-full bg-brand-orange/20 text-brand-orange flex items-center justify-center">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <span>Deep scanning 15,000 cases, judgment texts, and citations...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions Strip */}
      <div className="px-4 py-2.5 bg-gray-50/50 dark:bg-theme-surface-alt/20 border-t border-theme-border flex flex-wrap items-center gap-2 shrink-0">
        <span className="text-xs text-theme-muted font-bold uppercase tracking-wider mr-1">
          Try:
        </span>
        {suggestions.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              if (onSuggestionClick) onSuggestionClick(s.text);
              else setInputText(s.text);
            }}
            className="px-3 py-1 rounded-full bg-theme-surface hover:bg-brand-orange/10 hover:border-brand-orange/40 hover:text-brand-orange border border-theme-border text-xs sm:text-sm text-theme-main font-medium transition-colors cursor-pointer truncate max-w-[240px]"
            title={s.text}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSubmit} className="p-3.5 bg-white dark:bg-theme-surface border-t border-theme-border flex items-center gap-2.5 shrink-0">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste a line from judgment, citation (e.g. 2006 SLD 282), case number, judge, or legal issue..."
          disabled={isLoading}
          className="flex-1 px-4 py-3 bg-theme-surface border border-theme-border rounded-xl text-sm sm:text-base focus:outline-none focus:border-brand-orange text-theme-main shadow-inner transition-colors"
        />

        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!inputText.trim() || isLoading}
          className="bg-brand-orange hover:bg-brand-orange-hover text-white h-[46px] px-5 rounded-xl flex items-center gap-2 shadow-sm font-bold text-sm sm:text-base"
        >
          <Send className="w-4 h-4" />
          <span>Analyze</span>
        </Button>
      </form>

    </div>
  );
};

export default AIChatPanel;
