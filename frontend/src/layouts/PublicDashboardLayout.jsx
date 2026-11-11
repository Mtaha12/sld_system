import React from 'react';
import { Link } from 'react-router-dom';
import { LogIn, UserPlus, Sun, Moon } from 'lucide-react';
import sldLogo from '../assets/branding/logo/SLD_Logo.webp';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Clean public landing wrapper rendering the existing Dashboard without
 * sidebar, top navigation bar, profile controls, or private admin/client links.
 */
const PublicDashboardLayout = ({ children }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-theme-base font-sans text-theme-main flex flex-col">
      {/* Compact Public Access Utility Strip (Brand + Sign In / Sign Up entry points only) */}
      <div className="sticky top-0 z-30 bg-theme-surface/95 backdrop-blur-md border-b border-theme-border px-4 md:px-6 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={sldLogo}
            alt="SLD System"
            className="w-8 h-8 object-contain shrink-0"
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
      </div>

      {/* Existing Dashboard Content */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto p-3 sm:p-4 md:p-6">
        {children}
      </main>
    </div>
  );
};

export default PublicDashboardLayout;

