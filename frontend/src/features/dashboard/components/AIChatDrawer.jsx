import React, { useState, useEffect, useRef } from 'react';
import { 
  X, MessageSquare, Plus, Send, Sparkles, Clock, 
  Trash2, Search, Settings, User, Bot, BookOpen
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import { aiChatService } from '../../../services/aiChatService';
import { caseService } from '../../cases/services/caseService';
import { notificationService } from '../../notifications/services/notificationService';
import { statuteService } from '../../statutes/services/statuteService';

const extractReference = (text) => {
  if (!text) return null;
  // Citation matches: "2011 104 TAX 78", "(2011) 104 TAX 78", "2001 SLD 1", "SLD 2001 1"
  const standardCitationMatch = text.match(/\b([a-z]+)\s+(\d{4})\s+(\d+)\b/i);
  if (standardCitationMatch) {
    return `${standardCitationMatch[1].toUpperCase()} ${standardCitationMatch[2]} ${standardCitationMatch[3]}`;
  }

  const reversedCitationMatch = text.match(/\b(\d{4})\s+([a-z]+)\s+(\d+)\b/i);
  if (reversedCitationMatch) {
    return `${reversedCitationMatch[2].toUpperCase()} ${reversedCitationMatch[1]} ${reversedCitationMatch[3]}`;
  }

  // Explicit CASE / NOTIF / STAT ID: CASE-000001, CASE-1, NOTIF-000001, STAT-000001
  const prefixedMatch = text.match(/\b((?:CASE|NOTIF|STAT)-[A-Za-z0-9_\-]+)\b/i);
  if (prefixedMatch) {
    return prefixedMatch[1].toUpperCase();
  }

  // "case 1629482", "case id: 1", "sld #9862", "case# 123"
  const idWithPrefixMatch = text.match(/\b(?:case|sld|notif|statute)\s*(?:id|no\.?|#)?\s*[:\-]?\s*([A-Za-z0-9_\-]+)\b/i);
  if (idWithPrefixMatch) {
    return idWithPrefixMatch[1].trim();
  }

  // Standard multi-digit or standalone ID
  const idMatch = text.match(/(?:CASE-[A-Za-z0-9_\-]+|\b\d{1,8}\b)/i);
  return idMatch ? idMatch[0].toUpperCase() : null;
};

const AIChatDrawer = ({ isOpen, onClose }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [activeCaseNumber, setActiveCaseNumber] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isOpen]);

  const loadHistory = async () => {
    try {
      const history = await aiChatService.getUserSessions();
      if (Array.isArray(history)) {
        setChatHistory(history);
      }
    } catch (e) {
      console.error("Failed to load chat history:", e);
    }
  };

  const loadSession = async (id, sld) => {
    try {
      setIsLoading(true);
      const sessionData = await aiChatService.getSession(id);
      setSessionId(id);
      setActiveCaseNumber(sld);
      setMessages(sessionData.messages || []);
      setIsLoading(false);
    } catch (e) {
      console.error(e);
      setIsLoading(false);
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setSessionId(null);
    setActiveCaseNumber(null);
    setError(null);
  };

  const formatInline = (text) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-gray-900 dark:text-white">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return <em key={i} className="italic">{part.slice(1, -1)}</em>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const renderMessageContent = (text) => {
    if (!text) return null;
    
    const lines = text.split('\n');
    const blocks = [];
    let currentTable = null;
    let currentText = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        if (currentText.length > 0) {
          blocks.push({ type: 'text', content: currentText.join('\n') });
          currentText = [];
        }
        if (!currentTable) currentTable = [];
        currentTable.push(trimmed);
      } else {
        if (currentTable) {
          blocks.push({ type: 'table', lines: currentTable });
          currentTable = null;
        }
        currentText.push(line);
      }
    });
    
    if (currentText.length > 0) blocks.push({ type: 'text', content: currentText.join('\n') });
    if (currentTable) blocks.push({ type: 'table', lines: currentTable });

    return blocks.map((block, idx) => {
      if (block.type === 'table') {
        if (block.lines.length < 3) {
          return <div key={idx} className="whitespace-pre-wrap">{formatInline(block.lines.join('\n'))}</div>;
        }
        
        const parseRow = (rowStr) => {
          return rowStr.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
        };

        const headers = parseRow(block.lines[0]);
        const bodyLines = block.lines.slice(2);

        return (
          <div key={idx} className="my-4 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700/50 shadow-sm">
            <table className="min-w-full text-sm text-left text-gray-700 dark:text-gray-300">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-800 dark:text-gray-400">
                <tr>
                  {headers.map((h, i) => (
                    <th key={i} className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">{formatInline(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyLines.map((row, i) => {
                  const cells = parseRow(row);
                  return (
                    <tr key={i} className="bg-white border-b dark:bg-theme-surface dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      {cells.map((cell, j) => (
                        <td key={j} className="px-4 py-3">{formatInline(cell)}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      }
      return <div key={idx} className="whitespace-pre-wrap">{formatInline(block.content)}</div>;
    });
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userText = input.trim();
    setInput('');
    
    const newMessage = { role: 'user', content: userText };
    setMessages(prev => [...prev, newMessage]);
    
    try {
      setIsLoading(true);
      setError(null);

      // Extract SLD number / CASE string / Notification ID / Statute ID
      const detectedCaseNumber = extractReference(userText);

      let targetCaseNumber = activeCaseNumber;
      let targetSessionId = sessionId;
      let resolvedReference = null;

      // If a new reference is mentioned, validate it and switch context
      if (detectedCaseNumber && detectedCaseNumber !== activeCaseNumber) {
        let isValid = false;
        
        try {
          const caseData = await caseService.getCaseById(detectedCaseNumber);
          if (caseData && (caseData.caseId || caseData.sldNumber)) {
            isValid = true;
            resolvedReference = caseData.sldNumber || caseData.caseId;
          }
        } catch (error) {
          void error;
        }

        // Citation lookup can match mapYearPage even when it is not a case ID.
        if (!isValid && /\s/.test(detectedCaseNumber)) {
          try {
            const searchResult = await caseService.searchCases({ subject: detectedCaseNumber });
            const matchedCase = Array.isArray(searchResult) ? searchResult[0] : null;
            if (matchedCase && (matchedCase.caseId || matchedCase.sldNumber)) {
              isValid = true;
              resolvedReference = matchedCase.sldNumber || matchedCase.caseId;
            }
          } catch (error) {
            void error;
          }
        }

        if (!isValid) {
          try {
            const notifData = await notificationService.getNotificationById(detectedCaseNumber);
            if (notifData && (notifData.notificationId || notifData.srNumber)) {
              isValid = true;
              resolvedReference = notifData.srNumber || notifData.notificationId;
            }
          } catch (error) {
            void error;
          }
        }

        if (!isValid) {
          try {
            const statData = await statuteService.getStatuteById(detectedCaseNumber);
            if (statData && (statData.statuteId || statData.srNumber)) {
              isValid = true;
              resolvedReference = statData.srNumber || statData.statuteId;
            }
          } catch (error) {
            void error;
          }
        }

        if (isValid) {
          targetCaseNumber = resolvedReference || detectedCaseNumber;
          targetSessionId = null; // We need a new session for this new context
        } else {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `Case ${detectedCaseNumber} could not be found in the available records.` 
          }]);
          setIsLoading(false);
          return;
        }
      }

      // If we don't have a context at all
      if (!targetCaseNumber) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: "Please provide the SLD/case number you want me to analyze." 
        }]);
        setIsLoading(false);
        return;
      }

      // Create a session if we switched contexts or are starting fresh
      let didSwitchContext = false;
      if (!targetSessionId) {
        const session = await aiChatService.createSession(targetCaseNumber);
        targetSessionId = session.id || session._id || session.session_id;
        
        setSessionId(targetSessionId);
        setActiveCaseNumber(targetCaseNumber);
        loadHistory();
        
        // Optionally insert a visual system message indicating context switch
        if (activeCaseNumber && targetCaseNumber !== activeCaseNumber) {
          didSwitchContext = true;
          setMessages(prev => [...prev, {
            role: 'assistant',
            isSystem: true,
            content: `[Switched context to case ${targetCaseNumber}]`
          }]);
        }
      }

      const response = await aiChatService.sendMessage(targetSessionId, userText);
      const answerContent = response?.answer || response?.reply?.text || response?.text || (typeof response === 'string' ? response : '');
      const sourceList = response?.sources || (response?.reply?.legalAnalysis?.matchedCases || []);
      setMessages(prev => [...prev, { role: 'assistant', content: answerContent, sources: sourceList }]);
    } catch (err) {
      setError(err.message || "Failed to send message.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-[100] flex justify-end transition-all duration-300 ${isOpen ? 'visible opacity-100' : 'invisible opacity-0'}`}>
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} 
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={`relative w-full md:w-[60vw] max-w-full h-full bg-white dark:bg-theme-surface shadow-2xl flex flex-col sm:flex-row transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Left Sidebar - Chat History */}
        <div className="w-full sm:w-52 md:w-56 border-r border-gray-200 dark:border-theme-border bg-gray-50 dark:bg-[#1A1C23] flex flex-col shrink-0">
          <div className="p-4 border-b border-gray-200 dark:border-theme-border flex items-center justify-between">
            <Button 
              size="sm"
              onClick={handleNewConversation}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-1.5 bg-[#f15a24] hover:bg-[#d94e1f] text-white whitespace-nowrap px-2 sm:px-3 text-sm rounded-lg"
            >
              <Plus className="w-4 h-4 shrink-0" /> <span className="truncate">New Conversation</span>
            </Button>
            {/* Mobile Close */}
            <button onClick={onClose} className="sm:hidden ml-2 p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-theme-surface-hover rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Recent History
          </div>
          
          <div className="flex-1 overflow-y-auto px-2 space-y-1">
            {chatHistory.length === 0 ? (
              <div className="text-xs text-gray-400 p-2 text-center">
                No history found
              </div>
            ) : (
              chatHistory.map((histSession) => (
                <button
                  key={histSession._id}
                  onClick={() => loadSession(histSession._id, histSession.sld_number)}
                  className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${
                    sessionId === histSession._id
                      ? 'bg-orange-500/10 text-[#f15a24] font-medium'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="truncate flex-1">
                      Ref: {histSession.sld_number}
                    </span>
                    <span className="text-[10px] text-gray-400 ml-2">
                      {new Date(histSession.updated_at || histSession.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Area - Chat Interface */}
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-theme-surface min-w-0">
          
          {/* Chat Header */}
          <div className="h-16 px-6 border-b border-gray-200 dark:border-theme-border flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#f15a24]" />
              </div>
              <span className="font-semibold text-gray-900 dark:text-gray-100">Super Law AI Assistant</span>
              {activeCaseNumber && (
                <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-orange-50 text-orange-600 border border-orange-200 rounded-full dark:bg-orange-900/20 dark:border-orange-900/30">
                  Case: {activeCaseNumber}
                </span>
              )}
            </div>
            <button onClick={onClose} className="hidden sm:flex p-2 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-theme-surface-hover rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {messages.length === 0 && !error && !isLoading && (
              <div className="flex justify-center mb-8 mt-12">
                <div className="text-center">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-6 h-6 text-[#f15a24]" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">How can I help you today?</h3>
                  <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                    I can analyze case laws, draft legal documents, and answer complex legal queries based on the SLD Database.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-center mb-4">
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm border border-red-100 max-w-md w-full">
                  {error}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              msg.role === 'user' ? (
                <div key={idx} className="flex gap-4 max-w-3xl mx-auto w-full">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-sm text-gray-900 dark:text-gray-100 font-medium mb-1">You</p>
                    <div className="text-sm text-gray-800 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                </div>
              ) : msg.isSystem ? (
                <div key={idx} className="flex justify-center my-4">
                  <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs rounded-full">
                    {msg.content}
                  </span>
                </div>
              ) : (
                <div key={idx} className="flex gap-4 max-w-3xl mx-auto w-full">
                  <div className="w-8 h-8 rounded-full bg-[#f15a24] flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-sm text-gray-900 dark:text-gray-100 font-medium mb-1">Super Law AI</p>
                    <div className="text-sm text-gray-800 dark:text-gray-300 leading-relaxed space-y-4">
                      <div>{renderMessageContent(msg.content)}</div>
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg mt-2 border border-orange-100 dark:border-orange-900/30">
                          <p className="text-xs text-[#f15a24] font-medium flex items-center gap-1.5 mb-1">
                            <BookOpen className="w-3 h-3" /> Related References
                          </p>
                          {msg.sources.map((src, sIdx) => (
                            <p key={sIdx} className="text-xs text-gray-600 dark:text-gray-400">
                              {src.sld_number ? <span className="font-semibold cursor-pointer hover:underline text-[#f15a24]">{src.sld_number}</span> : ''} {src.document_type ? `- ${src.document_type.toUpperCase()} (Page ${src.page_number || 1})` : ''} {src.document_id ? `[${src.document_id}]` : ''}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            ))}
            
            {isLoading && (
              <div className="flex gap-4 max-w-3xl mx-auto w-full">
                <div className="w-8 h-8 rounded-full bg-[#f15a24] flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-sm text-gray-900 dark:text-gray-100 font-medium mb-1">Super Law AI</p>
                  <div className="text-sm text-gray-500 italic">Thinking...</div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Area */}
          <div className="p-4 sm:p-6 bg-white dark:bg-theme-surface shrink-0">
            <div className="max-w-3xl mx-auto relative">
              <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask about any case by providing its SLD number..."
                disabled={isLoading}
                className="w-full bg-gray-50 dark:bg-[#1A1C23] border border-gray-200 dark:border-theme-border rounded-2xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-[#f15a24]/50 focus:border-[#f15a24] resize-none text-gray-900 dark:text-gray-100 disabled:opacity-50"
                rows="3"
              />
              <button 
                onClick={handleSendMessage}
                className="absolute right-3 bottom-3 p-2 bg-[#f15a24] hover:bg-[#d94e1f] text-white rounded-xl transition-colors disabled:opacity-50"
                disabled={!input.trim() || isLoading}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-center text-[10px] text-gray-500 mt-3">
              AI can make mistakes. Always verify important legal information with actual case laws and statutes.
            </p>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default AIChatDrawer;
