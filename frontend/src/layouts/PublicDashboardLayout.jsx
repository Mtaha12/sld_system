import React, { createContext, useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogIn, UserPlus, Sun, Moon, Menu, Lock, X } from 'lucide-react';
import sldLogo from '../assets/branding/logo/SLD_Logo.webp';
import { useTheme } from '../contexts/ThemeContext';
import PublicSidebar from '../features/dashboard/components/PublicSidebar';

const PublicPreviewContext = createContext(null);

/**
 * Allows public dashboard components to surface the shared subscription preview notice
 * without opening protected routes, external tools, or forms.
 */
export const usePublicPreview = () => useContext(PublicPreviewContext);

/**
 * Public landing layout rendering the existing Dashboard with a read-only
 * subscriber preview sidebar, Sign In / Sign Up buttons, and zero forms or admin controls.
 */
const PublicDashboardLayout = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [previewNotice, setPreviewNotice] = useState(null);

  const handleFeaturePreviewClick = (featureName) => {
    setPreviewNotice(featureName);
  };

  return (
    <div className="min-h-screen bg-theme-base font-sans text-theme-main flex">
      {/* Desktop Fixed Public Subscriber Preview Sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 h-screen z-40 shadow-2xl">
        <PublicSidebar onFeaturePreviewClick={handleFeaturePreviewClick} />
      </div>

      {/* Mobile / Tablet Slide-Over Public Sidebar Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-50 flex h-full animate-fade-in">
            <PublicSidebar
              isMobile
              onClose={() => setIsMobileMenuOpen(false)}
              onFeaturePreviewClick={handleFeaturePreviewClick}
            />
          </div>
        </div>
      )}

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-[260px]">
        {/* Compact Public Access Utility Strip */}
        <header className="sticky top-0 z-30 bg-theme-surface/95 backdrop-blur-md border-b border-theme-border px-3 sm:px-4 md:px-6 h-14 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open subscriber features menu"
              className="lg:hidden p-2 rounded-lg border border-theme-border text-theme-main hover:bg-theme-surface-hover transition-colors cursor-pointer shrink-0"
              title="View Subscriber Features"
            >
              <Menu className="w-4 h-4" />
            </button>

            <img
              src={sldLogo}
              alt="SLD System"
              className="w-8 h-8 object-contain shrink-0 lg:hidden"
              width="32"
              height="32"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-sm sm:text-base font-extrabold tracking-tight text-theme-main truncate leading-none">
                SLD System
              </span>
              <span className="text-[10px] text-theme-muted font-medium truncate mt-0.5 hidden sm:block">
                Super Law Data System — Legal &amp; Tax Intelligence Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-lg border border-theme-border text-theme-muted hover:text-theme-main hover:bg-theme-surface-hover transition-colors cursor-pointer"
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg border border-theme-border bg-white dark:bg-theme-surface hover:border-[#f15a24] text-theme-main hover:text-[#f15a24] text-xs sm:text-sm font-bold transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>

            <Link
              to="/signup"
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg bg-[#f15a24] hover:bg-[#d94816] text-white text-xs sm:text-sm font-bold shadow-xs transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Sign Up</span>
            </Link>
          </div>
        </header>

        {/* Informational Non-Form Notice When Clicking a Locked Preview Feature */}
        {previewNotice && (
          <div
            role="status"
            className="sticky top-14 z-20 mx-3 sm:mx-4 md:mx-6 mt-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/95 border border-amber-300/80 dark:border-amber-700/60 flex flex-wrap items-center justify-between gap-3 shadow-sm animate-fade-in"
          >
            <div className="flex items-center gap-2.5 min-w-0 text-xs sm:text-sm text-amber-950 dark:text-amber-100">
              <Lock className="w-4 h-4 text-[#f15a24] shrink-0" />
              <span className="font-medium">
                <strong className="font-bold">{previewNotice}</strong> is unlocked with an active SLD System subscription. Sign in or subscribe to use this tool.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/login"
                className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-xs font-bold text-theme-main hover:text-[#f15a24] transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="px-3 py-1 rounded-lg bg-[#f15a24] hover:bg-[#d94816] text-white text-xs font-bold transition-colors"
              >
                Sign Up
              </Link>
              <button
                type="button"
                onClick={() => setPreviewNotice(null)}
                aria-label="Dismiss subscription notice"
                className="p-1 rounded-md text-amber-700 dark:text-amber-300 hover:bg-amber-200/50 dark:hover:bg-amber-900/40 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Existing Dashboard Content */}
        <PublicPreviewContext.Provider value={{ triggerFeaturePreview: handleFeaturePreviewClick }}>
          <main className="flex-1 w-full max-w-[1600px] mx-auto p-3 sm:p-4 md:p-6">
            {children}
          </main>
        </PublicPreviewContext.Provider>
      </div>
    </div>
  );
};

export default PublicDashboardLayout;
