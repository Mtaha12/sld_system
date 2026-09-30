import React, { useState, useEffect, useCallback } from 'react';
import OrbitalSpinWheel from '../features/ai/components/OrbitalSpinWheel';
import AIChatPanel from '../features/ai/components/AIChatPanel';
import { aiChatService } from '../services/aiChatService';

const INITIAL_MESSAGE = {
  sender: 'assistant',
  text: '### SLD AI Legal Neural Engine Initialized\n\n' +
    'I am trained directly on **over 162,865 verified judicial cases** in the SLD database. You can:\n' +
    '• **Paste a line from any judgment** — I will locate where it appears, cite the case, and explain the ruling.\n' +
    '• **Enter an SLD # or Citation** (e.g., `2006 SLD 282`, `2006 PTD 2726`).\n' +
    '• **Attach a file or order** to generate statutory appeals & petitions:\n' +
    '   - **Format 1**: High Court Writ Petition under Art. 199 (Complete with Index, Stay u/s 151 CPC, Exemption & Vakalatnama)\n' +
    '   - **Format 2**: Appellate Tribunal Inland Revenue (ATIR) Appeal (Form "B" [Rule 7] under Section 46 STA / FEA)\n' +
    '   - **Format 3**: Commissioner of Income Tax / Wealth Tax (Appeals) (Form of Appeal IT-16)\n' +
    '• **Ask legal statutory questions** (e.g., *Section 7E Super Tax, Sales Tax exemptions*).\n\n' +
    'All legal pleadings follow strict statutory court formats and verified precedent rulings.',
  legalAnalysis: null
};

const createNewSession = (title = 'New Research') => ({
  id: 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
  backendSessionId: null,
  title,
  messages: [INITIAL_MESSAGE],
  lastMatchedCase: null,
  matchType: null,
  activeReferences: [
    'citations', 'case_numbers', 'text_search', 'notifications', 'fbr_secp', 'statutes', 'tribunal_fto', 'pra_srb'
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
  const [showWheel, setShowWheel] = useState(() => {
    try {
      const saved = localStorage.getItem('sld_ai_show_wheel');
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return true;
  });

  const handleToggleWheel = () => {
    setShowWheel(prev => {
      const next = !prev;
      try {
        localStorage.setItem('sld_ai_show_wheel', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

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
    'citations', 'case_numbers', 'text_search', 'notifications', 'fbr_secp', 'statutes', 'tribunal_fto', 'pra_srb'
  ];

  // Robustly derive last matched case & match type (from session state or latest assistant message)
  const lastAssistantWithCase = [...messages].reverse().find(m => m.legalAnalysis?.matchedCase);
  const effectiveMatchedCase = activeSession.lastMatchedCase || lastAssistantWithCase?.legalAnalysis?.matchedCase || null;
  const effectiveMatchType = activeSession.matchType || lastAssistantWithCase?.legalAnalysis?.matchType || null;
  const focusedNode = activeSession.focusedNode || null;

  const handleSendMessage = async (text, attachments = []) => {
    const hasText = Boolean(text && text.trim());
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
    if ((!hasText && !hasAttachments) || isLoading) return;

    const currentSessId = activeSession.id;
    const displayText = hasText ? text.trim() : `Uploaded ${attachments.map(a => a.name).join(', ')}`;
    const userMsg = {
      sender: 'user',
      text: displayText,
      attachments: attachments.map(a => ({ name: a.name, type: a.type, size: a.size })),
      timestamp: new Date()
    };

    // Auto-derive a concise topic title for the tab from first query
    const isDefaultTitle = /^Research Session|^Session \d+|^New Research/i.test(activeSession.title);
    const updatedTitle = isDefaultTitle 
      ? (displayText.length > 22 ? displayText.slice(0, 22) + '...' : displayText)
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
      if (activeSession.backendSessionId) {
        const res = await aiChatService.sendMessage(activeSession.backendSessionId, hasText ? text.trim() : displayText, activeSession.focusedNode, attachments);
        replyData = res?.reply;
      } else {
        replyData = await aiChatService.queryLegalCore(hasText ? text.trim() : displayText, activeSession.focusedNode, attachments);
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
            matchType: replyData?.legalAnalysis?.matchType || s.matchType,
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
        citations: '(2011) 104 TAX 78',
        case_numbers: 'Special Sales Tax Appeal No.192 to 196',
        text_search: 'The intention of the legislature is gathered from the language of the statute',
        notifications: 'S.R.O. 589(I)/2020',
        fbr_secp: 'FBR circular clarification on section 7E',
        statutes: 'Section 7E Income Tax Ordinance 2001',
        tribunal_fto: 'Appellate Tribunal Inland Revenue orders',
        pra_srb: 'PRA sales tax on services withholding rules'
      };

      if (sectorQueries[nodeId]) {
        handleSendMessage(sectorQueries[nodeId]);
      }
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] w-full animate-fade-in overflow-hidden">
      
      {/* Main Layout: Left Orbital Spin Wheel (when shown) | Right Dialogue Panel */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0 overflow-hidden">
        
        {/* LEFT COLUMN: Orbital Spin Wheel (Toggled via Chatbot Header) */}
        {showWheel && (
          <div className="w-full lg:w-[32%] shrink-0 bg-white dark:bg-theme-surface border border-theme-border rounded-xl shadow-sm p-3 flex flex-col items-center justify-start overflow-y-auto no-scrollbar relative animate-fade-in transition-all">
            <OrbitalSpinWheel
              isSearching={isLoading}
              activeReferences={activeReferences}
              focusedNode={focusedNode}
              onNodeClick={handleNodeClick}
              lastMatchedCase={effectiveMatchedCase}
              matchType={effectiveMatchType}
            />
          </div>
        )}

        {/* RIGHT COLUMN: Multi-Session Legal Dialogue Panel (Expands to full width when wheel is hidden) */}
        <div className={`w-full ${showWheel ? 'lg:w-[68%]' : 'lg:w-full'} flex-1 min-w-0 h-full transition-all duration-300`}>
          <AIChatPanel
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onNewSession={handleNewSession}
            onCloseSession={handleCloseSession}
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            showWheel={showWheel}
            onToggleWheel={handleToggleWheel}
          />
        </div>

      </div>

    </div>
  );
};

export default AIAssistantPage;
