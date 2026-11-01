import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PdfViewerModal } from '../mail/PdfViewerModal';

export const DashboardLayout = ({ children }) => {
  const [pdfModalState, setPdfModalState] = useState({
    isOpen: false,
    type: 'arrive',
    courrier: null,
  });

  // Sidebar collapse state with localStorage persistence
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('dtf_sidebar_collapsed');
    return saved === 'true';
  });

  // Mobile sidebar state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleToggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('dtf_sidebar_collapsed', String(next));
      return next;
    });
  };

  const handleOpenPdfViewer = (type, courrier) => {
    setPdfModalState({
      isOpen: true,
      type,
      courrier,
    });
  };

  const handleClosePdfViewer = () => {
    setPdfModalState({
      isOpen: false,
      type: 'arrive',
      courrier: null,
    });
  };

  // Close mobile sidebar on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex min-h-screen bg-surface-50 dark:bg-surface-950 transition-colors duration-200">
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebarCollapse}
        isMobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onOpenPdfViewer={handleOpenPdfViewer}
          onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto space-y-6">
          {children}
        </main>
      </div>

      {/* Global Integrated PDF Viewer Modal */}
      <PdfViewerModal
        isOpen={pdfModalState.isOpen}
        onClose={handleClosePdfViewer}
        type={pdfModalState.type}
        courrier={pdfModalState.courrier}
      />
    </div>
  );
};
