import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles } from 'lucide-react';
import api from '../../services/api.js';

const ChatWidget = ({ isHidden }) => {
  const [isOpen, setIsOpen] = useState(() => {
    return sessionStorage.getItem('sld_chat_open') === 'true';
  });
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatHistory, setChatHistory] = useState(() => {
    const saved = sessionStorage.getItem('sld_chat_history');
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return saved ? JSON.parse(saved) : [
      { sender: 'system', text: 'Hello! How can I help you today with the SLD System?', timestamp: timeStr }
    ];
  });
  const messagesEndRef = useRef(null);

  const suggestions = [
    { label: '🔍 Search Case Law', text: 'How do I search for case law reports on the portal?' },
    { label: '📄 Get Attachments', text: 'How can I download case attachments or PDF files?' },
    { label: '🔑 Reset Password', text: 'How do I reset my password?' },
    { label: '💼 Portal Features', text: 'Can you tell me about the SLD System features?' }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, chatHistory, isTyping]);

  useEffect(() => {
    sessionStorage.setItem('sld_chat_history', JSON.stringify(chatHistory));
  }, [chatHistory]);

  useEffect(() => {
    sessionStorage.setItem('sld_chat_open', isOpen);
  }, [isOpen]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    const userMsg = message.trim();
    if (!userMsg) return;
    
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatHistory(prev => [...prev, { sender: 'user', text: userMsg, timestamp: timeStr }]);
    setMessage('');
    setIsTyping(true);
    
    try {
      const response = await api.post('/api/chat', { message: userMsg });
      const replyTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (response.data.success && response.data.reply) {
        setChatHistory(prev => [...prev, { sender: 'system', text: response.data.reply, timestamp: replyTimeStr }]);
      } else {
        setChatHistory(prev => [...prev, { sender: 'system', text: 'Sorry, I encountered an issue processing your request.', timestamp: replyTimeStr }]);
      }
    } catch (err) {
      console.error('[Chatbot Error]', err);
      const errMsg = err.response?.data?.message || err.message || 'Connection lost. Please try again.';
      const errTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setChatHistory(prev => [...prev, { sender: 'system', text: `Error: ${errMsg}`, timestamp: errTimeStr }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = async (suggestionText) => {
    if (isTyping) return;
    
    const userMsg = suggestionText.trim();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    setChatHistory(prev => [...prev, { sender: 'user', text: userMsg, timestamp: timeStr }]);
    setIsTyping(true);
    
    try {
      const response = await api.post('/api/chat', { message: userMsg });
      const replyTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (response.data.success && response.data.reply) {
        setChatHistory(prev => [...prev, { sender: 'system', text: response.data.reply, timestamp: replyTimeStr }]);
      } else {
        setChatHistory(prev => [...prev, { sender: 'system', text: 'Sorry, I encountered an issue processing your request.', timestamp: replyTimeStr }]);
      }
    } catch (err) {
      console.error('[Chatbot Error]', err);
      const errMsg = err.response?.data?.message || err.message || 'Connection lost. Please try again.';
      const errTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setChatHistory(prev => [...prev, { sender: 'system', text: `Error: ${errMsg}`, timestamp: errTimeStr }]);
    } finally {
      setIsTyping(false);
    }
  };

  const formatMessageText = (text) => {
    if (!text) return '';
    // Bold helper: replace **bold** with <strong>bold</strong>
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Bullet point helper: replace starting asterisk with bullet point
    formatted = formatted.replace(/^\*\s(.*)$/gm, '• $1');
    
    return formatted.split('\n').map((line, idx) => (
      <React.Fragment key={idx}>
        <span dangerouslySetInnerHTML={{ __html: line }} />
        {idx < formatted.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  if (isHidden) return null;

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 z-50 focus:outline-none focus:ring-4 focus:ring-brand-orange/30"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 sm:w-96 bg-theme-surface rounded-2xl shadow-2xl border border-theme-border z-50 flex flex-col overflow-hidden animate-fade-in h-[500px] max-h-[80vh]">
          
          {/* Header */}
          <div className="bg-brand-dark-surface text-white p-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-brand-orange rounded-full flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-sm flex items-center gap-1.5">
                  SLD Support AI <Sparkles className="w-3.5 h-3.5 text-brand-orange animate-pulse" />
                </h3>
                <p className="text-xs text-theme-disabled">Superfast replies in seconds</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-theme-disabled hover:text-white transition-colors p-1 rounded-md hover:bg-theme-surface/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-theme-surface-alt flex flex-col gap-4">
            {chatHistory.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex flex-col max-w-[85%] ${msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'}`}
              >
                <div 
                  className={`px-4 py-2.5 text-sm leading-relaxed ${
                    msg.sender === 'user' 
                      ? 'bg-brand-orange text-white rounded-2xl rounded-tr-sm' 
                      : 'bg-theme-surface text-theme-main border border-theme-border shadow-sm rounded-2xl rounded-tl-sm'
                  }`}
                >
                  {formatMessageText(msg.text)}
                </div>
                <span className="text-[9px] text-theme-disabled mt-1 px-1">
                  {msg.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            {isTyping && (
              <div className="flex flex-col max-w-[85%] self-start items-start">
                <div className="px-4 py-2.5 text-sm bg-theme-surface text-theme-muted border border-theme-border shadow-sm rounded-2xl rounded-tl-sm flex items-center gap-1.5 h-[38px]">
                  <span className="w-1.5 h-1.5 bg-brand-orange rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-brand-orange rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-brand-orange rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          {!isTyping && (
            <div className="px-3 pt-2 bg-theme-surface-alt flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto shrink-0 border-t border-theme-border/20">
              {suggestions.map((sug, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(sug.text)}
                  className="text-xs bg-theme-surface hover:bg-theme-surface-hover text-theme-muted hover:text-brand-orange border border-theme-border/60 hover:border-brand-orange/40 px-2.5 py-1 rounded-full transition-all cursor-pointer select-none active:scale-95 shrink-0"
                >
                  {sug.label}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 bg-theme-surface border-t border-theme-border/50 shrink-0">
            <form onSubmit={handleSend} className="relative flex items-center">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="w-full pl-4 pr-12 py-3 bg-theme-surface-alt border border-theme-border rounded-xl text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all text-theme-main"
              />
              <button 
                type="submit"
                disabled={!message.trim() || isTyping}
                className="absolute right-2 p-2 bg-brand-orange text-white rounded-lg hover:bg-brand-orange-hover transition-colors disabled:opacity-50 disabled:hover:bg-brand-orange"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
          
        </div>
      )}
    </>
  );
};

export default ChatWidget;
