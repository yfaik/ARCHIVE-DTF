import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-2xl',
  footer,
  bodyClassName = 'px-6 py-5 max-h-[70vh] overflow-y-auto',
}) => {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
      setTimeout(() => modalRef.current?.focus(), 100);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-surface-950/70 dark:bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Dialog */}
          <motion.div
            ref={modalRef}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={`relative w-full ${maxWidth} bg-white dark:bg-surface-800 rounded-lg shadow-elevation-4 dark:shadow-dark-elevation-4 border border-surface-300 dark:border-surface-700 z-10 my-8 overflow-hidden`}
          >
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-900/50">
              <div>
                <h3
                  id="modal-title"
                  className="text-base sm:text-lg font-bold text-surface-900 dark:text-surface-50 font-display"
                >
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-xs sm:text-sm text-surface-600 dark:text-surface-300 mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1.5 -mr-1.5 -mt-0.5 rounded-md text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-200/60 dark:hover:bg-surface-700 transition-colors duration-150"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className={`${bodyClassName} text-surface-800 dark:text-surface-100`}>
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="px-6 py-4 border-t border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/40">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
