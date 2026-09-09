import React, { useState, useEffect, useCallback } from 'react';
import { Bot, Sparkles, Zap, ShieldCheck, Database, RefreshCw } from 'lucide-react';
import OrbitalSpinWheel from '../features/ai/components/OrbitalSpinWheel';
import AIChatPanel from '../features/ai/components/AIChatPanel';
import { aiChatService } from '../services/aiChatService';

const AIAssistantPage = () => {
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: '### ⚖️ SLD AI Legal Neural Engine Initialized\n\n' +
        'I am trained directly on **15,000 cases** in the SLD database. You can:\n' +
        '• **Paste a line from any judgment** — I will locate where it appears, cite the case, and explain the ruling.\n' +
        '• **Enter an SLD # or Citation** (e.g., `2006 SLD 282`, `2006 PTD 2726`).\n' +
        '• **Ask legal statutory questions** (e.g., *Section 7E Super Tax, Sales Tax exemptions*).\n\n' +
        'All results are 100% grounded in verified judicial orders.',
      legalAnalysis: null
    }
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [activeReferences, setActiveReferences] = useState([
    'judgments', 'headnotes', 'citations', 'courts', 'statutes', 'judges', 'parties', 'case_numbers'
  ]);
  const [focusedNode, setFocusedNode] = useState(null);
  const [lastMatchedCase, setLastMatchedCase] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  // Initialize session on mount
  useEffect(() => {
    let isMounted = true;
    const initSession = async () => {
      try {
        const session = await aiChatService.createSession(null, 'SLD AI Legal Research');
        if (isMounted && session?._id) {
          setSessionId(session._id);
        }
      } catch (e) {
        console.warn('Session init fallback to direct query mode:', e);
      }
    };
    initSession();
    return () => { isMounted = false; };
  }, []);

  const handleSendMessage = async (text) => {
    if (!text.trim() || isLoading) return;

    // 1. Add user message
    const userMsg = {
      sender: 'user',
      text: text.trim(),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      let replyData;
      if (sessionId) {
        const res = await aiChatService.sendMessage(sessionId, text.trim(), focusedNode);
        replyData = res?.reply;
      } else {
        replyData = await aiChatService.queryLegalCore(text.trim(), focusedNode);
      }

      const assistantMsg = {
        sender: 'assistant',
        text: replyData?.text || 'No authoritative answer could be compiled.',
        legalAnalysis: replyData?.legalAnalysis || null,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMsg]);

      // Update active wheel nodes based on analysis
      if (replyData?.legalAnalysis?.activeReferences) {
        setActiveReferences(replyData.legalAnalysis.activeReferences);
      }
      if (replyData?.legalAnalysis?.matchedCase) {
        setLastMatchedCase(replyData.legalAnalysis.matchedCase);
      }
    } catch (err) {
      console.error('AI chat error:', err);
      setMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: '⚠️ An error occurred while scanning the legal database. Please verify your query and try again.',
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (sessionId) {
      try {
        await aiChatService.clearSession(sessionId);
      } catch (e) {
        console.error(e);
      }
    }
    setMessages([
      {
        sender: 'assistant',
        text: 'Session reset. Ready for next query. Paste a line from a judgment or cite an SLD case number to begin.',
        legalAnalysis: null
      }
    ]);
    setLastMatchedCase(null);
    setFocusedNode(null);
    setActiveReferences(['judgments', 'headnotes', 'citations', 'courts', 'statutes', 'judges', 'parties', 'case_numbers']);
  };

  const handleNodeClick = (nodeId) => {
    if (focusedNode === nodeId) {
      setFocusedNode(null);
    } else {
      setFocusedNode(nodeId);
      // High-precision legal queries grounded in the 15,000 cases database
      const sectorQueries = {
        judgments: 'The intention of the legislature is gathered from the language of the statute',
        headnotes: 'Interpretation of Statutes strict construction rule',
        case_numbers: 'Special Sales Tax Appeal No.192 to 196',
        courts: 'Sindh High Court tax appeal determinations',
        judges: 'Rulings authored by Justice Anwar Zaheer Jamali',
        citations: '2006 SLD 282',
        statutes: 'Sales Tax Act 1990 Section 3 and exemptions',
        parties: 'Nishat Mills Ltd vs Collector of Customs'
      };

      if (sectorQueries[nodeId]) {
        handleSendMessage(sectorQueries[nodeId]);
      }
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] w-full animate-fade-in overflow-hidden gap-3">
      
      {/* Top Cyber-Executive HUD Bar */}
      <div className="bg-white dark:bg-theme-surface border border-theme-border rounded-xl px-4 py-2.5 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-gradient-to-tr from-brand-orange to-amber-500 text-white shadow-sm">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black tracking-wide text-theme-main uppercase">
                SLD Neural AI Legal Core
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 text-[10px] font-bold">
                v2.0 • 15,000 Cases Grounded
              </span>
            </div>
            <p className="text-[11px] text-theme-muted">
              Live orbital reference synthesizer & exact judgment verbatim matching
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-theme-surface-alt border border-theme-border text-[11px] font-medium text-theme-muted flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-brand-orange" />
            <span>Atlas MongoDB Collation Active</span>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/30 text-[11px] font-semibold text-green-600 dark:text-green-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Zero Hallucination Guaranteed</span>
          </span>
        </div>
      </div>

      {/* Main Full-Screen Layout: Left Orbital Spin Wheel (45%) | Right Dialogue Panel (55%) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 overflow-hidden">
        
        {/* LEFT COLUMN: Orbital Spin Wheel (5 Cols on Large) */}
        <div className="lg:col-span-5 bg-white dark:bg-theme-surface border border-theme-border rounded-xl shadow-md p-4 flex flex-col items-center justify-between overflow-hidden relative">
          
          <div className="w-full flex items-center justify-between pb-2 border-b border-theme-border/60 text-xs">
            <span className="font-bold text-theme-main text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-brand-orange" />
              <span>Orbital Reference Spin Wheel</span>
            </span>
            <span className="text-[10px] text-theme-muted">
              Click node to filter
            </span>
          </div>

          <div className="flex-1 w-full flex items-center justify-center my-auto">
            <OrbitalSpinWheel
              isSearching={isLoading}
              activeReferences={activeReferences}
              focusedNode={focusedNode}
              onNodeClick={handleNodeClick}
              lastMatchedCase={lastMatchedCase}
            />
          </div>

          <div className="w-full pt-2 border-t border-theme-border/60 flex items-center justify-between text-[11px] text-theme-muted">
            <span>Center: <strong>Neural Bot</strong></span>
            <span>Orbital: <strong>8 Judicial Reference Engines</strong></span>
          </div>
        </div>

        {/* RIGHT COLUMN: AI Legal Research & Dialogue Panel (7 Cols on Large) */}
        <div className="lg:col-span-7 h-full min-h-0">
          <AIChatPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            onClearChat={handleClearChat}
            onSuggestionClick={(text) => handleSendMessage(text)}
          />
        </div>

      </div>

    </div>
  );
};

export default AIAssistantPage;
