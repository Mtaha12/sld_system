import React, { useState, useEffect, useCallback } from 'react';
import OrbitalSpinWheel from '../features/ai/components/OrbitalSpinWheel';
import AIChatPanel from '../features/ai/components/AIChatPanel';
import { aiChatService } from '../services/aiChatService';

const INITIAL_MESSAGE = {
  sender: 'assistant',
  text: '### SLD AI Legal Neural Engine Initialized\n\n' +
    'I am trained directly on **15,000 cases** in the SLD database. You can:\n' +
    '• **Paste a line from any judgment** — I will locate where it appears, cite the case, and explain the ruling.\n' +
    '• **Enter an SLD # or Citation** (e.g., `2006 SLD 282`, `2006 PTD 2726`).\n' +
    '• **Ask legal statutory questions** (e.g., *Section 7E Super Tax, Sales Tax exemptions*).\n\n' +
    'All results are 100% grounded in verified judicial orders.',
  legalAnalysis: null
};

const createNewSession = (title = 'New Research') => ({
  id: 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
  backendSessionId: null,
  title,
  messages: [INITIAL_MESSAGE],
  lastMatchedCase: null,
  activeReferences: [
    'case_numbers', 'judgments', 'judges', 'petitioners', 'headnotes', 'legal_maxim', 'principle_law', 'citations'
  ],
  focusedNode: null,
  createdAt: new Date().toISOString()
});

const AIAssistantPage = () => {
  // Multi-tab chat sessions state with localStorage persistence
  const [sessions, setSessions] = useState(() => {
    try {
      const saved = localStorage.getItem('sld_ai_chat_sessions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load local sessions:', e);
    }
    return [createNewSession('Research Session 1')];
  });

  const [activeSessionId, setActiveSessionId] = useState(() => {
    try {
      const saved = localStorage.getItem('sld_ai_chat_sessions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed[0].id;
        }
      }
    } catch (e) {}
    return 'sess_default';
  });

  const [isLoading, setIsLoading] = useState(false);

  // Sync sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sld_ai_chat_sessions', JSON.stringify(sessions));
    } catch (e) {}
  }, [sessions]);

  // Ensure valid activeSessionId
  useEffect(() => {
    if (!sessions.some(s => s.id === activeSessionId) && sessions.length > 0) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  // Current active session
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0] || createNewSession('Research Session 1');
  const messages = activeSession.messages || [INITIAL_MESSAGE];
  const activeReferences = activeSession.activeReferences || [
    'case_numbers', 'judgments', 'judges', 'petitioners', 'headnotes', 'legal_maxim', 'principle_law', 'citations'
  ];
  const lastMatchedCase = activeSession.lastMatchedCase || null;
  const focusedNode = activeSession.focusedNode || null;

  const handleSendMessage = async (text) => {
    if (!text.trim() || isLoading) return;

    const currentSessId = activeSession.id;
    const userMsg = {
      sender: 'user',
      text: text.trim(),
      timestamp: new Date()
    };

    // Auto-derive a concise topic title for the tab from first query
    const isDefaultTitle = /^Research Session|^Session \d+|^New Research/i.test(activeSession.title);
    const updatedTitle = isDefaultTitle 
      ? (text.trim().length > 22 ? text.trim().slice(0, 22) + '...' : text.trim())
      : activeSession.title;

    // Optimistically append user message
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessId) {
        return {
          ...s,
          title: updatedTitle,
          messages: [...(s.messages || []), userMsg]
        };
      }
      return s;
    }));
    setIsLoading(true);

    try {
      let replyData;
      if (activeSession.backendSessionId && /^[0-9a-fA-F]{24}$/.test(activeSession.backendSessionId)) {
        try {
          const res = await aiChatService.sendMessage(activeSession.backendSessionId, text.trim(), activeSession.focusedNode);
          replyData = res?.reply || res;
        } catch (sendErr) {
          console.warn('Session sendMessage fallback to direct query:', sendErr);
          replyData = await aiChatService.queryLegalCore(text.trim(), activeSession.focusedNode);
        }
      } else {
        replyData = await aiChatService.queryLegalCore(text.trim(), activeSession.focusedNode);
      }

      const assistantMsg = {
        sender: 'assistant',
        text: replyData?.text || 'No authoritative answer could be compiled.',
        legalAnalysis: replyData?.legalAnalysis || null,
        timestamp: new Date()
      };

      setSessions(prev => prev.map(s => {
        if (s.id === currentSessId) {
          return {
            ...s,
            messages: [...(s.messages || []), assistantMsg],
            lastMatchedCase: replyData?.legalAnalysis?.matchedCase || s.lastMatchedCase,
            activeReferences: replyData?.legalAnalysis?.activeReferences || s.activeReferences
          };
        }
        return s;
      }));
    } catch (err) {
      console.error('AI chat error:', err);
      const errMsg = {
        sender: 'assistant',
        text: '⚠️ An error occurred while scanning the legal database. Please verify your query and try again.',
        timestamp: new Date()
      };
      setSessions(prev => prev.map(s => {
        if (s.id === currentSessId) {
          return {
            ...s,
            messages: [...(s.messages || []), errMsg]
          };
        }
        return s;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Open a brand new chat tab
  const handleNewSession = async () => {
    const nextNumber = sessions.length + 1;
    const newSess = createNewSession(`Session ${nextNumber}`);

    // Try creating backend session in background
    try {
      const res = await aiChatService.createSession(null, newSess.title);
      if (res?._id) {
        newSess.backendSessionId = res._id;
      }
    } catch (e) {
      console.warn('Backend session fallback:', e);
    }

    setSessions(prev => [...prev, newSess]);
    setActiveSessionId(newSess.id);
  };

  // Switch to selected session tab
  const handleSelectSession = (sessionId) => {
    setActiveSessionId(sessionId);
  };

  // Close a session tab
  const handleCloseSession = (sessionIdToClose, e) => {
    e?.stopPropagation();
    if (sessions.length <= 1) {
      // Reset if closing the last remaining tab
      const fresh = createNewSession('Research Session 1');
      setSessions([fresh]);
      setActiveSessionId(fresh.id);
      return;
    }

    const remaining = sessions.filter(s => s.id !== sessionIdToClose);
    setSessions(remaining);

    // If closing active tab, switch smoothly
    if (activeSessionId === sessionIdToClose) {
      const idx = sessions.findIndex(s => s.id === sessionIdToClose);
      const nextActive = remaining[Math.max(0, idx - 1)] || remaining[0];
      setActiveSessionId(nextActive.id);
    }
  };

  const handleNodeClick = (nodeId) => {
    const currentFocused = activeSession.focusedNode;
    const nextFocused = currentFocused === nodeId ? null : nodeId;

    setSessions(prev => prev.map(s => {
      if (s.id === activeSession.id) {
        return { ...s, focusedNode: nextFocused };
      }
      return s;
    }));

    if (nextFocused) {
      const sectorQueries = {
        case_numbers: 'Special Sales Tax Appeal No.192 to 196',
        judgments: 'The intention of the legislature is gathered from the language of the statute',
        judges: 'Shahid Jamil Khan Judicial Member',
        petitioners: 'Messrs Nishat Mills Ltd',
        headnotes: 'Sales tax penalty generic non speaking order invalid',
        legal_maxim: 'Lex non cogit ad impossibilia',
        principle_law: 'Refund is an Amanah and cannot be refused on grounds of limitation',
        citations: '(2011) 104 TAX 78'
      };

      if (sectorQueries[nodeId]) {
        handleSendMessage(sectorQueries[nodeId]);
      }
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] w-full animate-fade-in overflow-hidden">
      
      {/* Main Layout: Left Orbital Spin Wheel (32%) | Right Dialogue Panel (68%) */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0 overflow-hidden">
        
        {/* LEFT COLUMN: Orbital Spin Wheel */}
        <div className="w-full lg:w-[32%] shrink-0 bg-white dark:bg-theme-surface border border-theme-border rounded-xl shadow-sm p-3.5 flex flex-col items-center justify-between overflow-hidden relative">
          
          {/* Executive Sub-Header Bar */}
          <div className="w-full flex items-center justify-between pb-2 border-b border-theme-border/60 text-xs shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
              <span className="font-extrabold text-theme-main text-xs uppercase tracking-wider">
                Orbital Law Core
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-brand-orange/10 text-brand-orange border border-brand-orange/20 text-[10px] font-bold">
              8 Case Law Fields
            </span>
          </div>

          {/* Wheel Graphic */}
          <div className="flex-1 w-full flex items-center justify-center my-auto min-h-0 overflow-hidden">
            <OrbitalSpinWheel
              isSearching={isLoading}
              activeReferences={activeReferences}
              focusedNode={focusedNode}
              onNodeClick={handleNodeClick}
              lastMatchedCase={lastMatchedCase}
            />
          </div>

        </div>

        {/* RIGHT COLUMN: Multi-Session Legal Dialogue Panel */}
        <div className="w-full lg:w-[68%] flex-1 min-w-0 h-full">
          <AIChatPanel
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onNewSession={handleNewSession}
            onCloseSession={handleCloseSession}
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </div>

      </div>

    </div>
  );
};

export default AIAssistantPage;
