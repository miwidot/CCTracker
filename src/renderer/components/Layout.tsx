import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
  onNavigate: (page: string) => void;
  currentPage: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, onNavigate, currentPage }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden bg-[var(--bg-primary)] theme-transition">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        onNavigate={onNavigate}
        currentPage={currentPage}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-primary)] theme-transition">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-y-auto bg-[var(--bg-primary)] p-6 theme-transition">
          <div className="max-w-7xl mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};