import React from "react";
import { ViewState, UserRole } from "../types";
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Clock,
  BrainCircuit,
  Gamepad2,
  LogOut,
  Flame,
  Globe,
  PanelLeftClose,
  PanelLeftOpen,
  GraduationCap,
  Users,
} from "lucide-react";

interface SidebarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  onLogout: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  userRole?: UserRole;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  onLogout,
  collapsed,
  onToggleCollapse,
  userRole = "student",
}) => {
  // Handle navigation + auto-close mobile drawer
  const handleNav = (view: ViewState) => {
    onNavigate(view);
    if (mobileOpen) onMobileToggle();
  };

  // --- Desktop NavItem (supports collapsed mode) ---
  const DesktopNavItem = ({
    view,
    icon: Icon,
    label,
  }: {
    view: ViewState;
    icon: any;
    label: string;
  }) => {
    const active = currentView === view;
    return (
      <button
        onClick={() => handleNav(view)}
        className={`w-full flex items-center ${collapsed ? "justify-center px-2" : "gap-3 px-4"} py-3 rounded-xl transition-all duration-300 font-medium group relative overflow-hidden flex-1 max-h-16
          ${active
            ? "bg-gradient-to-r from-discord-panel to-discord-panel/80 text-white shadow-lg shadow-discord-accent/20 border border-discord-accent/30"
            : "text-discord-textMuted hover:bg-gradient-to-r hover:from-discord-hover hover:to-discord-hover/80 hover:text-white hover:scale-105"
          }`}
        title={collapsed ? label : undefined}
      >
        {active && (
          <div className="absolute inset-0 bg-gradient-to-r from-discord-accent/10 to-purple-500/10 rounded-xl"></div>
        )}
        <Icon
          size={20}
          className={`transition-all duration-300 relative z-10 flex-shrink-0 ${active
            ? "text-discord-accent drop-shadow-sm"
            : "text-discord-textMuted group-hover:text-white group-hover:scale-110"
            }`}
        />
        {!collapsed && (
          <>
            <span className="relative z-10 group-hover:translate-x-1 transition-transform duration-300">
              {label}
            </span>
            {active && (
              <div className="absolute right-2 w-2 h-2 bg-discord-accent rounded-full animate-pulse"></div>
            )}
          </>
        )}
      </button>
    );
  };

  return (
    <>
      {/* ====== MOBILE OVERLAY (backdrop) ====== */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onMobileToggle}
          aria-hidden="true"
        />
      )}

      {/* ====== MOBILE SLIDE-IN DRAWER ====== */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen w-72
          bg-gradient-to-b from-[#111214] to-[#0a0b0c]
          border-r border-white/10
          flex flex-col
          transition-transform duration-300 ease-in-out
          md:hidden
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-discord-accent to-purple-600 flex items-center justify-center shadow-lg shadow-discord-accent/30">
              <BrainCircuit size={20} className="text-white" />
            </div>
            <button
              onClick={onToggleCollapse}
              className="flex items-center justify-center w-8 h-8 text-discord-textMuted hover:text-white hover:bg-discord-hover rounded-lg transition-all duration-300 group"
              title="Collapse sidebar"
            >
              <BrainCircuit
                className="text-white group-hover:rotate-12 transition-transform duration-300"
                size={24}
              />
            </button>
          </>
        ) : (
          <div className="w-10 h-10 bg-gradient-to-br from-discord-accent to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-discord-accent/30 hover:shadow-discord-accent/50 transition-all duration-300 hover:scale-110 group">
            <BrainCircuit
              className="text-white group-hover:rotate-12 transition-transform duration-300"
              size={24}
            />
          </div>
        )}
      </div>

      {/* Toggle Button (Collapsed Only) */}
      {collapsed && (
        <div className="px-4 pt-4 flex justify-center">
          <button
            onClick={onToggleCollapse}
            className="flex items-center justify-center w-10 h-10 text-discord-textMuted hover:text-white hover:bg-discord-hover rounded-lg transition-all duration-300 group"
            title="Expand sidebar"
          >
            <LogOut
              size={20}
              className="group-hover:rotate-12 transition-transform duration-300 flex-shrink-0"
            />
            {!collapsed && (
              <span className="group-hover:translate-x-1 transition-transform duration-300">
                Log Out
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 flex flex-col justify-evenly gap-1 overflow-y-auto no-scrollbar">
        <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
        
        {userRole === "teacher" ? (
          <>
            <NavItem view="classrooms" icon={GraduationCap} label="My Classrooms" />
            <NavItem view="notes" icon={BookOpen} label="My Notes" />
          </>
        ) : (
          <>
            <NavItem view="summarizer" icon={FileText} label="Summarizer" />
            <NavItem view="notes" icon={BookOpen} label="My Notes" />
            <NavItem view="studentClassrooms" icon={Users} label="Classrooms" />
            <NavItem view="feed" icon={Flame} label="Learning Feed" />
            <NavItem view="quiz" icon={Gamepad2} label="Quiz Arena" />
            <NavItem view="routine" icon={Clock} label="Routine" />
            <NavItem view="focus" icon={BrainCircuit} label="Focus Mode" />
          </>
        )}
      </nav>

      {/* Logout Button */}
      <div
        className={`${collapsed ? "p-3 mb-4" : "p-4 mx-4 mb-4"} border-t border-white/10 mt-auto`}
      >
        <button
          onClick={onLogout}
          className={`w-full flex items-center ${collapsed ? "justify-center px-2" : "gap-3 px-4"} py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all duration-300 font-medium group hover:scale-105 border border-transparent hover:border-red-500/20`}
          title={collapsed ? "Log Out" : undefined}
        >
          <LogOut
            size={20}
            className="group-hover:rotate-12 transition-transform duration-300 flex-shrink-0"
          />
          {!collapsed && (
            <span className="group-hover:translate-x-1 transition-transform duration-300">
              Log Out
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
