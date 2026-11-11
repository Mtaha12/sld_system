import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Lock,
  Moon,
  Network,
  Sun,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '../../../assets/branding/logo/SLD_Logo.webp';
import { useTheme } from '../../../contexts/ThemeContext';
import { TOP_NAV_ITEMS, USER_MENU_ITEMS, QUICK_LINKS } from '../constants/navigationConfig';

/**
 * Read-only subscriber feature preview sidebar for the Public Dashboard.
 * Displays the tools available after subscription without opening any protected forms or routes.
 */
const PublicSidebar = ({
  className = '',
  isMobile = false,
  onClose,
  onFeaturePreviewClick
}) => {
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [isQuickLinksOpen, setIsQuickLinksOpen] = useState(true);
  const [highlightedFeature, setHighlightedFeature] = useState('Dashboard');

  const handleFeatureSelect = (item) => {
    if (item.path === '/dashboard') {
      setHighlightedFeature('Dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (isMobile && onClose) onClose();
      return;
    }

    setHighlightedFeature(item.label);
    if (onFeaturePreviewClick) {
      onFeaturePreviewClick(item.label);
    }
    if (isMobile && onClose) {
      onClose();
    }
  };

  return (
    <aside
      aria-label="Subscriber features preview sidebar"
      className={`bg-brand-dark-surface text-gray-300 flex flex-col h-full border-r border-brand-dark-border w-[260px] select-none ${className}`}
    >
      {/* Logo & Mobile Close Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-brand-dark-border shrink-0 w-full">
        <button
          type="button"
          onClick={() => handleFeatureSelect({ label: 'Dashboard', path: '/dashboard' })}
          className="flex items-center gap-2.5 text-left cursor-pointer"
        >
          <img
            src={logo}
            alt="SLD System"
            className="h-9 object-contain shrink-0"
            width="36"
            height="36"
          />
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-extrabold text-white tracking-tight">SLD System</span>
            <span className="text-[10px] font-medium text-brand-orange">Subscriber Features</span>
          </div>
        </button>

        {isMobile && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-brand-dark-border transition-colors cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Scrollable Preview Navigation List (Strictly Non-Form / Read-Only Preview) */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-3 space-y-1 scrollbar-hide w-[260px]">
        <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
          Included With Subscription
        </div>

        {TOP_NAV_ITEMS.map((item) => {
          const isDashboard = item.path === '/dashboard';
          const isActive = isDashboard && highlightedFeature === 'Dashboard';
          const isSelectedPreview = !isDashboard && highlightedFeature === item.label;

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => handleFeatureSelect(item)}
              title={isDashboard ? 'Public Dashboard Overview' : `${item.label} (Available after subscription)`}
              className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-all text-left cursor-pointer ${
                isActive
                  ? 'bg-brand-orange text-white shadow-sm'
                  : isSelectedPreview
                    ? 'bg-brand-dark-border/80 text-white border border-brand-orange/40'
                    : 'hover:bg-brand-dark-border hover:text-white text-gray-300'
              }`}
            >
              <item.icon
                className={`w-4.5 h-4.5 shrink-0 transition-colors ${
                  isActive ? 'text-white' : item.isHighlight ? 'text-brand-orange' : 'text-gray-400'
                }`}
              />
              <span className="text-xs font-semibold whitespace-nowrap overflow-hidden ml-3 inline-flex items-center flex-1 min-w-0">
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <span className="ml-1.5 font-serif italic text-gray-200 text-xs font-normal tracking-wide shrink-0">
                    {item.badge}
                  </span>
                )}
              </span>
              {!isDashboard && (
                <Lock className="w-3 h-3 text-gray-500 ml-2 shrink-0" aria-hidden="true" />
              )}
            </button>
          );
        })}

        {/* Separator */}
        <div className="pt-1 border-t border-brand-dark-border/60 my-1.5" />

        {/* Subscriber Tools Menu */}
        {USER_MENU_ITEMS.map((item) => {
          const isSelectedPreview = highlightedFeature === item.label;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => handleFeatureSelect(item)}
              title={`${item.label} (Available after subscription)`}
              className={`w-full flex items-center px-3 py-2 rounded-xl transition-all text-left cursor-pointer ${
                isSelectedPreview
                  ? 'bg-brand-dark-border/80 text-white border border-brand-orange/40'
                  : 'text-gray-300 hover:bg-brand-dark-border hover:text-white'
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0 text-blue-400/90" />
              <span className="text-xs font-medium whitespace-nowrap overflow-hidden ml-3 flex-1 truncate">
                {item.label}
              </span>
              <Lock className="w-3 h-3 text-gray-500 ml-2 shrink-0" aria-hidden="true" />
            </button>
          );
        })}

        {/* Quick Links Accordion (Public Official Government / Court Links) */}
        <div className="flex flex-col pt-1">
          <button
            type="button"
            onClick={() => setIsQuickLinksOpen((prev) => !prev)}
            title="Official Court & Authority Quick Links"
            className="flex items-center w-full px-3 py-2 rounded-xl text-gray-300 hover:bg-brand-dark-border hover:text-white transition-all select-none cursor-pointer"
          >
            <Network className="w-4 h-4 shrink-0 text-blue-400/90" />
            <span className="text-xs font-semibold whitespace-nowrap overflow-hidden ml-3 text-left max-w-[160px]">
              Quick Links
            </span>
            <span className="ml-auto shrink-0">
              {isQuickLinksOpen ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </span>
          </button>

          {isQuickLinksOpen && (
            <div className="flex flex-col space-y-0.5 mt-1 pl-3 border-l border-brand-dark-border/70 ml-5 animate-fade-in">
              {QUICK_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-2 py-1.5 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-brand-dark-border/50 transition-colors gap-2"
                >
                  <span className="text-gray-500 font-mono text-sm leading-none">-</span>
                  <span className="truncate">{link.label}</span>
                  <ExternalLink className="w-3 h-3 text-gray-500 ml-auto shrink-0" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Theme Toggle & Subscription Action */}
      <div className="px-3 pb-4 mt-auto shrink-0 w-[260px] flex flex-col gap-2 border-t border-brand-dark-border/60 pt-3">
        <button
          type="button"
          onClick={toggleTheme}
          title="Toggle Theme"
          className="flex items-center px-3 py-2 rounded-xl transition-colors hover:bg-brand-dark-border hover:text-white text-left w-full cursor-pointer"
        >
          {isDarkMode ? (
            <Moon className="w-4 h-4 shrink-0 text-gray-400" />
          ) : (
            <Sun className="w-4 h-4 shrink-0 text-gray-400" />
          )}
          <span className="text-xs font-semibold ml-3">
            {isDarkMode ? 'Dark Mode' : 'Light Mode'}
          </span>
        </button>

        <Link
          to="/signup"
          className="w-full py-2 px-3 rounded-xl bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-bold text-center shadow-xs transition-colors"
        >
          Subscribe / Sign Up
        </Link>
      </div>
    </aside>
  );
};

export default PublicSidebar;

