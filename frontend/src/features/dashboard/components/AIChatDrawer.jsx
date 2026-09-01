import React, { useState } from 'react';
import { 
  X, MessageSquare, Plus, Send, Sparkles, Clock, 
  Trash2, Search, Settings, User, Bot, BookOpen
} from 'lucide-react';
import Button from '../../../components/ui/Button';

const AIChatDrawer = ({ isOpen, onClose }) => {
  const [input, setInput] = useState('');

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
            <button className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-theme-surface-hover text-left transition-colors bg-gray-200/50 dark:bg-theme-surface-hover">
              <MessageSquare className="w-4 h-4 mt-0.5 text-gray-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">Tax implications of Section 7E</p>
                <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
              </div>
            </button>
            <button className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-theme-surface-hover text-left transition-colors">
              <MessageSquare className="w-4 h-4 mt-0.5 text-gray-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">Draft a legal notice for trademark...</p>
                <p className="text-xs text-gray-500 mt-1">Yesterday</p>
              </div>
            </button>
            <button className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-theme-surface-hover text-left transition-colors">
              <MessageSquare className="w-4 h-4 mt-0.5 text-gray-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">Constitutional amendment summary</p>
                <p className="text-xs text-gray-500 mt-1">Previous Week</p>
              </div>
            </button>
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
            </div>
            <button onClick={onClose} className="hidden sm:flex p-2 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-theme-surface-hover rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Welcome Message */}
            <div className="flex justify-center mb-8">
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

            {/* Example User Message */}
            <div className="flex gap-4 max-w-3xl mx-auto w-full">
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="flex-1 pt-1">
                <p className="text-sm text-gray-900 dark:text-gray-100 font-medium mb-1">You</p>
                <div className="text-sm text-gray-800 dark:text-gray-300 leading-relaxed">
                  Can you explain the tax implications of Section 7E of the Income Tax Ordinance, 2001?
                </div>
              </div>
            </div>

            {/* Example AI Message */}
            <div className="flex gap-4 max-w-3xl mx-auto w-full">
              <div className="w-8 h-8 rounded-full bg-[#f15a24] flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 pt-1">
                <p className="text-sm text-gray-900 dark:text-gray-100 font-medium mb-1">Super Law AI</p>
                <div className="text-sm text-gray-800 dark:text-gray-300 leading-relaxed space-y-4">
                  <p>Section 7E of the Income Tax Ordinance, 2001 introduced a tax on deemed income basis on immovable properties.</p>
                  <p>Here are the key implications:</p>
                  <ul className="list-disc pl-5 space-y-2 text-gray-700 dark:text-gray-400">
                    <li><strong>Deemed Income:</strong> A resident person is treated to have derived an income equal to 5% of the fair market value of capital assets situated in Pakistan.</li>
                    <li><strong>Tax Rate:</strong> The tax is levied at a rate of 20% on the deemed income (which effectively amounts to 1% of the fair market value of the property).</li>
                    <li><strong>Exclusions:</strong> There are several exclusions, including one capital asset owned by the resident person, self-owned business premises, agriculture land (with certain conditions), and properties allotted to war wounded/martyrs.</li>
                  </ul>
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg mt-2 border border-orange-100 dark:border-orange-900/30">
                    <p className="text-xs text-[#f15a24] font-medium flex items-center gap-1.5 mb-1">
                      <BookOpen className="w-3 h-3" /> Related Case Law
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">See <span className="font-semibold cursor-pointer hover:underline text-[#f15a24]">2023 PTD 1450</span> regarding the constitutional validity of Section 7E.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Chat Input Area */}
          <div className="p-4 sm:p-6 bg-white dark:bg-theme-surface shrink-0">
            <div className="max-w-3xl mx-auto relative">
              <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a legal question or request a draft..."
                className="w-full bg-gray-50 dark:bg-[#1A1C23] border border-gray-200 dark:border-theme-border rounded-2xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-[#f15a24]/50 focus:border-[#f15a24] resize-none text-gray-900 dark:text-gray-100"
                rows="3"
              />
              <button 
                className="absolute right-3 bottom-3 p-2 bg-[#f15a24] hover:bg-[#d94e1f] text-white rounded-xl transition-colors disabled:opacity-50"
                disabled={!input.trim()}
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
