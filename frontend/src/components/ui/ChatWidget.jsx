import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';
import api from '../../services/api.js';

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    { sender: 'system', text: 'Hello! How can I help you today?' }
  ]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, chatHistory, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    const userMsg = message.trim();
    if (!userMsg) return;
    
    setChatHistory(prev => [...prev, { sender: 'user', text: userMsg }]);
    setMessage('');
    setIsTyping(true);
    
    try {
      const response = await api.post('/api/chat', { message: userMsg });
      if (response.data.success && response.data.reply) {
        setChatHistory(prev => [...prev, { sender: 'system', text: response.data.reply }]);
      } else {
        setChatHistory(prev => [...prev, { sender: 'system', text: 'Sorry, I encountered an issue processing your request.' }]);
      }
    } catch (err) {
      console.error('[Chatbot Error]', err);
      const errMsg = err.response?.data?.message || err.message || 'Connection lost. Please try again.';
      setChatHistory(prev => [...prev, { sender: 'system', text: `Error: ${errMsg}` }]);
    } finally {
      setIsTyping(false);
    }
  };

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
                <h3 className="font-medium text-sm">SLD Support Chat</h3>
                <p className="text-xs text-theme-disabled">Typically replies in a few minutes</p>
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
                  className={`px-4 py-2.5 text-sm ${
                    msg.sender === 'user' 
                      ? 'bg-brand-orange text-white rounded-2xl rounded-tr-sm' 
                      : 'bg-theme-surface text-theme-main border border-theme-border shadow-sm rounded-2xl rounded-tl-sm'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-theme-disabled mt-1 px-1">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                disabled={!message.trim()}
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
