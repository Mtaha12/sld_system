import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
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
  }, [isOpen, chatHistory]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    setChatHistory([...chatHistory, { sender: 'user', text: message }]);
    setMessage('');
    
    // Simulate auto-reply
    setTimeout(() => {
      setChatHistory(prev => [...prev, { sender: 'system', text: 'Thank you for reaching out! Our support team will get back to you shortly.' }]);
    }, 1000);
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-brand-orange hover:bg-[#D44E35] text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 z-50 focus:outline-none focus:ring-4 focus:ring-brand-orange/30"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden animate-fade-in h-[500px] max-h-[80vh]">
          
          {/* Header */}
          <div className="bg-[#14151A] text-white p-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-brand-orange rounded-full flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-sm">SLD Support Chat</h3>
                <p className="text-xs text-gray-400">Typically replies in a few minutes</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col gap-4">
            {chatHistory.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex flex-col max-w-[85%] ${msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'}`}
              >
                <div 
                  className={`px-4 py-2.5 text-sm ${
                    msg.sender === 'user' 
                      ? 'bg-brand-orange text-white rounded-2xl rounded-tr-sm' 
                      : 'bg-white text-gray-800 border border-gray-200 shadow-sm rounded-2xl rounded-tl-sm'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-gray-400 mt-1 px-1">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-gray-100 shrink-0">
            <form onSubmit={handleSend} className="relative flex items-center">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all text-gray-800"
              />
              <button 
                type="submit"
                disabled={!message.trim()}
                className="absolute right-2 p-2 bg-brand-orange text-white rounded-lg hover:bg-[#D44E35] transition-colors disabled:opacity-50 disabled:hover:bg-brand-orange"
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
