import React, { useState, useEffect, useCallback } from 'react';
import OrbitalSpinWheel from '../features/ai/components/OrbitalSpinWheel';
import AIChatPanel from '../features/ai/components/AIChatPanel';
import AIChatHistoryColumn from '../features/ai/components/AIChatHistoryColumn';
import { aiChatService } from '../services/aiChatService';
import { useUser } from '../contexts/UserContext';

const stripLegacyIntroMessages = (msgs) => {
  if (!Array.isArray(msgs)) return [];
  return msgs.filter(m => !(
    m.sender === 'assistant' && 
    (m.text?.includes('SLD AI Legal Neural Engine') || m.text?.includes('162,865') || m.text?.includes('27,500') || m.text?.includes('Welcome to the **SLD AI Legal Core**'))
  ));
};

const createNewSession = (title = 'New Session') => ({
  id: 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
  backendSessionId: null,
  title,
  messages: [],
  lastMatchedCase: null,
  matchType: null,
  activeReferences: [
    'citations', 'case_numbers', 'text_search', 'notifications', 'fbr_secp', 'statutes', 'tribunal_fto', 'pra_srb'
  ],
  focusedNode: null,
  createdAt: new Date().toISOString()
});

const AIAssistantPage = () => {
  const { user } = useUser();
  const currentUserId = user?._id || user?.id || user?.loginId || user?.username || 'anonymous_user';
  const userStorageKey = `sld_ai_chat_sessions_${currentUserId}`;

  // Multi-tab chat sessions state with user-scoped localStorage persistence
  // By default, start with a fresh new session without showing previous chat/records
  const [sessions, setSessions] = useState(() => {
    try {
      const saved = localStorage.getItem(userStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.map(s => ({
            ...s,
            messages: stripLegacyIntroMessages(s.messages)
          }));
          const first = cleaned[0];
          const isFresh = first && (!first.messages || first.messages.length === 0);
          if (isFresh) {
            return cleaned;
          }
          const fresh = createNewSession('New Session');
          return [fresh, ...cleaned];
        }
      }
    } catch (e) {
      console.warn('Failed to load user-scoped local sessions:', e);
    }
    return [createNewSession('New Session')];
  });

  const [activeSessionId, setActiveSessionId] = useState(() => {
    try {
      const saved = localStorage.getItem(userStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = parsed[0];
          const msgs = stripLegacyIntroMessages(first.messages);
          const isFresh = !msgs || msgs.length === 0;
          if (isFresh) return first.id;
        }
      }
    } catch (e) {}
    return '';
  });

  // Switch chat sessions immediately when user changes / logs in
  useEffect(() => {
    try {
      const saved = localStorage.getItem(userStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.map(s => ({
            ...s,
            messages: stripLegacyIntroMessages(s.messages)
          }));
          const first = cleaned[0];
          const isFresh = first && (!first.messages || first.messages.length === 0);
          if (isFresh) {
            setSessions(cleaned);
            setActiveSessionId(first.id);
            return;
          }
          const fresh = createNewSession('New Session');
          setSessions([fresh, ...cleaned]);
          setActiveSessionId(fresh.id);
          return;
        }
      }
    } catch (e) {}
    const fresh = [createNewSession('New Session')];
    setSessions(fresh);
    setActiveSessionId(fresh[0].id);
  }, [userStorageKey]);

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

  const [showHistory, setShowHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('sld_ai_show_history');
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return false;
  });

  const handleToggleHistory = () => {
    setShowHistory(prev => {
      const next = !prev;
      try {
        localStorage.setItem('sld_ai_show_history', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  // Sync sessions to user-scoped localStorage
  useEffect(() => {
    try {
      localStorage.setItem(userStorageKey, JSON.stringify(sessions));
    } catch (e) {}
  }, [sessions, userStorageKey]);

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
        text: (replyData?.text && replyData.text.trim()) 
          ? replyData.text 
          : (replyData?.legalAnalysis?.matchedCase ? '' : 'No authoritative answer could be compiled.'),
        legalAnalysis: replyData?.legalAnalysis || null,
        followUpQuestions: replyData?.followUpQuestions || replyData?.legalAnalysis?.followUpSuggestions || [],
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
      const fresh = createNewSession('New Session');
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
    <div className="flex flex-col h-[calc(100dvh-112px)] w-full animate-fade-in overflow-hidden">
      
      {/* Main Layout: Left Orbital Spin Wheel | Center Chat Dialogue Panel | Right Research History Column */}
      <div className="flex-1 flex flex-col lg:flex-row gap-2.5 min-h-0 overflow-hidden">
        
        {/* LEFT COLUMN: Orbital Spin Wheel (Toggled via Chatbot Header) */}
        {showWheel && (
          <div className={`w-full ${showHistory ? 'lg:w-[28%] xl:w-[26%]' : 'lg:w-[32%] xl:w-[30%]'} shrink-0 bg-white dark:bg-theme-surface border border-theme-border rounded-xl shadow-xs p-2.5 flex flex-col items-center justify-start overflow-y-auto no-scrollbar relative animate-fade-in transition-all`}>
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

        {/* CENTER COLUMN: Legal Dialogue Panel */}
        <div className="flex-1 min-w-0 h-full transition-all duration-300">
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
            showHistory={showHistory}
            onToggleHistory={handleToggleHistory}
          />
        </div>

        {/* RIGHT COLUMN: Dedicated Research & Session History Column */}
        {showHistory && (
          <AIChatHistoryColumn
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onNewSession={handleNewSession}
            onCloseSession={handleCloseSession}
            onToggleHistory={handleToggleHistory}
          />
        )}

      </div>

    </div>
  );
};

export default AIAssistantPage;
