import React, { useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Video, 
  Library, 
  Settings, 
  Menu, 
  X, 
  Bell, 
  User,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const SidebarItem = ({ icon, label, to, active, collapsed, onClick }: { icon: React.ReactNode, label: string, to?: string, active: boolean, collapsed: boolean, onClick?: () => void }) => {
  const content = (
    <>
      <div className="shrink-0">{icon}</div>
      {!collapsed && <span className="font-medium whitespace-nowrap">{label}</span>}
      {active && !collapsed && <ChevronRight size={16} className="ml-auto" />}
    </>
  );

  const className = `flex items-center gap-3 px-4 py-3 rounded-xl transition-all group w-full ${
    active 
      ? 'bg-indigo-600 text-white' 
      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
  }`;

  if (onClick) {
    return (
      <button onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return (
    <Link to={to || '#'} className={className}>
      {content}
    </Link>
  );
};

const DashboardLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', to: '/dashboard' },
    { icon: <Video size={20} />, label: 'Create Video', to: '/dashboard/create' },
    { icon: <Library size={20} />, label: 'My Videos', to: '/dashboard/library' },
    { icon: <Settings size={20} />, label: 'Settings', to: '/dashboard/settings' },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Mobile Sidebar Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed lg:static inset-y-0 left-0 z-50 bg-slate-900 border-r border-slate-800 transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex flex-col h-full p-4">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 mb-10 h-10">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
              <Video className="text-white w-5 h-5" />
            </div>
            {!collapsed && <span className="text-lg font-bold tracking-tight">TalkHuman</span>}
            <button 
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex ml-auto text-slate-500 hover:text-white transition-colors"
            >
              {collapsed ? <Menu size={20} /> : <X size={20} />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {navItems.map((item) => (
              <SidebarItem 
                key={item.to}
                {...item}
                active={location.pathname === item.to}
                collapsed={collapsed}
              />
            ))}
          </nav>

          {/* Footer Navigation */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <SidebarItem 
              icon={<LogOut size={20} />} 
              label="Logout" 
              onClick={handleLogout}
              active={false}
              collapsed={collapsed}
            />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 shrink-0 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur-sm">
          <button 
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <Menu size={24} />
          </button>

          <div className="flex items-center gap-4 ml-auto">
            <button className="text-slate-400 hover:text-white transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-0 right-0 w-2 h-2 bg-indigo-500 rounded-full border-2 border-slate-900"></span>
            </button>
            <div className="w-px h-6 bg-slate-800 mx-2"></div>
            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">{user?.name || user?.email.split('@')[0]}</p>
                <p className="text-xs text-slate-500">Free Account</p>
              </div>
              <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
                <User size={20} className="text-slate-400" />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
