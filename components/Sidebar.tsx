import React from 'react';
import { ViewState } from '../types';
import { LayoutDashboard, FileText, BookOpen, Clock, BrainCircuit, Gamepad2, LogOut, Flame, Globe } from 'lucide-react';

interface SidebarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, onLogout }) => {
  const NavItem = ({ view, icon: Icon, label }: { view: ViewState; icon: any; label: string }) => {
    const active = currentView === view;
    return (
      <button
        onClick={() => onNavigate(view)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 mb-1 font-medium group relative overflow-hidden
          ${active
            ? 'bg-gradient-to-r from-discord-panel to-discord-panel/80 text-white shadow-lg shadow-discord-accent/20 border border-discord-accent/30'
            : 'text-discord-textMuted hover:bg-gradient-to-r hover:from-discord-hover hover:to-discord-hover/80 hover:text-white hover:scale-105'
          }`}
      >
        {active && (
          <div className="absolute inset-0 bg-gradient-to-r from-discord-accent/10 to-purple-500/10 rounded-xl"></div>
        )}
        <Icon size={20} className={`transition-all duration-300 relative z-10 ${active
          ? 'text-discord-accent drop-shadow-sm'
          : 'text-discord-textMuted group-hover:text-white group-hover:scale-110'
          }`} />
        <span className="relative z-10 group-hover:translate-x-1 transition-transform duration-300">{label}</span>
        {active && (
          <div className="absolute right-2 w-2 h-2 bg-discord-accent rounded-full animate-pulse"></div>
        )}
      </button>
    );
  };

  return (
    <div className="w-64 bg-gradient-to-b from-[#111214] to-[#0a0b0c] flex flex-col h-screen fixed left-0 top-0 border-r border-white/10 z-50 backdrop-blur-sm">
      <div className="p-6 flex items-center gap-3 border-b border-white/5">
        <div className="w-10 h-10 bg-gradient-to-br from-discord-accent to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-discord-accent/30 hover:shadow-discord-accent/50 transition-all duration-300 hover:scale-110 group">
          <BrainCircuit className="text-white group-hover:rotate-12 transition-transform duration-300" size={24} />
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight hover:text-discord-accent transition-colors duration-300 cursor-default">Procastify</h1>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
        <NavItem view="summarizer" icon={FileText} label="Summarizer" />
        <NavItem view="notes" icon={BookOpen} label="My Notes" />
        <NavItem view="feed" icon={Flame} label="Learning Feed" />
        <NavItem view="quiz" icon={Gamepad2} label="Quiz Arena" />
        <NavItem view="routine" icon={Clock} label="Routine" />
        <NavItem view="focus" icon={BrainCircuit} label="Focus Mode" />
      </nav>

      <div className="p-4 mx-4 mb-4 border-t border-white/10">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all duration-300 font-medium group hover:scale-105 border border-transparent hover:border-red-500/20"
        >
          <LogOut size={20} className="group-hover:rotate-12 transition-transform duration-300" />
          <span className="group-hover:translate-x-1 transition-transform duration-300">Log Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;