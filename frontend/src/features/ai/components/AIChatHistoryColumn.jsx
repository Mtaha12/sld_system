import React, { useState, useMemo } from 'react';
import { 
  History, Plus, Trash2, Search, 
  MessageSquare, ChevronRight, X, Gavel,
  Clock, PanelRightClose
} from 'lucide-react';

const AIChatHistoryColumn = ({
  sessions = [],
  activeSessionId,
  onSelectSession,
  onNewSession,
  onCloseSession,
  onToggleHistory
}) => {
  const [searchFilter, setSearchFilter] = useState('');

  const filteredSessions = useMemo(() => {
    if (!searchFilter.trim()) return sessions;
    const q = searchFilter.toLowerCase();
    return sessions.filter(s => (s.title || '').toLowerCase().includes(q));
  }, [sessions, searchFilter]);

  return (
    <div className="w-full lg:w-72 xl:w-80 shrink-0 h-full bg-white dark:bg-[#12151f] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl flex flex-col overflow-hidden animate-fade-in transition-all">
      
      {/* Header */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#161924]/80 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>Research History</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {sessions.length}
              </span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onNewSession}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
            title="Create new research session"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>

          {onToggleHistory && (
            <button
              type="button"
              onClick={onToggleHistory}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Collapse history column"
            >
              <PanelRightClose className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search Filter */}
      <div className="p-2.5 border-b border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#12151f] shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search past research..."
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 dark:bg-[#181c28] border border-slate-200 dark:border-slate-700/80 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-all font-sans"
          />
          {searchFilter && (
            <button
              type="button"
              onClick={() => setSearchFilter('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Session History List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
        {filteredSessions.length === 0 ? (
          <div className="text-center py-8 px-4 text-xs text-slate-400">
            No matching research sessions found.
          </div>
        ) : (
          filteredSessions.map((sess) => {
            const isActive = sess.id === activeSessionId;
            const messageCount = sess.messages?.length || 0;

            return (
              <div
                key={sess.id}
                onClick={() => onSelectSession?.(sess.id)}
                className={`group relative flex items-start gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all border text-left select-none ${
                  isActive
                    ? 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/50 shadow-xs'
                    : 'bg-transparent hover:bg-slate-50 dark:hover:bg-[#181c28] border-transparent hover:border-slate-200 dark:hover:border-slate-800'
                }`}
              >
                <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                  isActive 
                    ? 'bg-amber-600 text-white' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-amber-500'
                }`}>
                  <Gavel className="w-3.5 h-3.5" />
                </div>

                <div className="flex-1 min-w-0 pr-5">
                  <h4 className={`text-xs font-semibold truncate ${
                    isActive
                      ? 'text-amber-700 dark:text-amber-300 font-bold'
                      : 'text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white'
                  }`}>
                    {sess.title || 'Legal Research'}
                  </h4>
                  
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-2.5 h-2.5" />
                      <span>{messageCount} msg{messageCount !== 1 ? 's' : ''}</span>
                    </span>
                    {sess.createdAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{new Date(sess.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete / Close Session Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseSession?.(sess.id, e);
                  }}
                  className={`absolute right-2 top-2.5 p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer ${
                    isActive ? 'opacity-80 hover:opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                  title="Delete session"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Status */}
      <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#161924]/50 flex items-center justify-between text-[11px] text-slate-400 shrink-0 px-3">
        <span>SLD Legal Chambers</span>
        <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400">100% Grounded</span>
      </div>

    </div>
  );
};

export default AIChatHistoryColumn;
