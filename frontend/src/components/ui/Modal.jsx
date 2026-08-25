import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  subtitle, 
  icon: Icon, 
  children, 
  footer, 
  maxWidth = 'max-w-2xl',
  className = ''
}) => {
  useEffect(() => {
    if (!isOpen) return;

    // Handle Escape key to close modal
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Full Viewport Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Box */}
      <div 
        className={`relative w-full ${maxWidth} bg-theme-surface rounded-2xl shadow-2xl border border-theme-border flex flex-col max-h-[88vh] z-10 animate-fade-in overflow-hidden ${className}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        {(title || Icon) && (
          <div className="px-6 py-4 border-b border-theme-border flex items-center justify-between bg-theme-surface-alt/40 shrink-0">
            <div className="flex items-center gap-3">
              {Icon && (
                <div className="p-2 rounded-lg bg-brand-orange/10 text-brand-orange border border-brand-orange/20">
                  <Icon className="w-5 h-5" />
                </div>
              )}
              <div>
                {title && <h3 className="text-base font-bold text-theme-main">{title}</h3>}
                {subtitle && <p className="text-xs text-theme-muted">{subtitle}</p>}
              </div>
            </div>
            {onClose && (
              <button 
                onClick={onClose}
                className="p-1.5 rounded-lg text-theme-muted hover:text-theme-main hover:bg-theme-surface-hover transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 text-sm">
          {children}
        </div>

        {/* Footer Actions */}
        {footer && (
          <div className="px-6 py-4 border-t border-theme-border bg-theme-surface flex items-center justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
