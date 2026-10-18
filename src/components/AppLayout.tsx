import { NavLink, Link, useLocation } from 'react-router-dom';
import { ReactNode, useState } from 'react';
import {
  LayoutDashboard,
  Leaf,
  ScanLine,
  LineChart,
  Bell,
  Settings,
  Sprout,
  Menu,
  X,
  Search,
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import { AlertBellBadge } from './AlertRow';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/plants', label: 'My Plants', icon: Sprout },
  { to: '/analysis', label: 'AI Analysis', icon: ScanLine },
  { to: '/sensors', label: 'Sensor History', icon: LineChart },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { alerts, profile, isDemoData } = useData();
  const unackCount = alerts.filter((a) => !a.acknowledged).length;

  const pageTitle =
    navItems.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)))?.label ??
    'PlantSight';

  return (
    <div className="min-h-screen lg:flex bg-[#f6f8f4]">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-gray-100">
        <SidebarContent unackCount={unackCount} />
      </aside>

      {/* Sidebar — mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-2xl flex flex-col animate-fade-in">
            <button
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 text-gray-500"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent unackCount={unackCount} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="lg:flex-1 lg:ml-64 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-100">
          <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-8 h-16">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-display font-semibold text-gray-900">{pageTitle}</h1>
            <div className="hidden md:flex items-center ml-4 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  className="input pl-9 py-2 bg-gray-50/70"
                  placeholder="Search plants, alerts…"
                  aria-label="Search"
                />
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {isDemoData && (
                <span className="hidden sm:inline-flex badge bg-amber-50 text-amber-700 border border-amber-200">
                  Demo mode
                </span>
              )}
              <Link
                to="/alerts"
                className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                aria-label={`Alerts, ${unackCount} unacknowledged`}
              >
                <Bell className="w-5 h-5" />
                <AlertBellBadge count={unackCount} />
              </Link>
              <Link to="/settings" className="flex items-center gap-2 pl-2">
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-brand-100"
                />
                <div className="hidden sm:block leading-tight">
                  <p className="text-sm font-medium text-gray-800">{profile.name}</p>
                  <p className="text-xs text-gray-400">{profile.email}</p>
                </div>
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  unackCount,
  onNavigate,
}: {
  unackCount: number;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="h-16 flex items-center gap-2 px-6 border-b border-gray-100">
        <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center">
          <Leaf className="w-5 h-5" />
        </div>
        <div>
          <p className="font-display font-bold text-gray-900 leading-tight">PlantSight</p>
          <p className="text-[11px] text-gray-400 leading-tight">Smart Plant Monitoring</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.label === 'Alerts' && unackCount > 0 && (
              <span className="text-[10px] font-semibold bg-danger-500 text-white px-1.5 py-0.5 rounded-full">
                {unackCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="rounded-xl bg-gradient-to-br from-brand-50 to-accent-50 p-4">
          <p className="text-xs font-semibold text-brand-700">PlantSight v0.1</p>
          <p className="text-[11px] text-gray-500 mt-1">
            Connect your Node/Express/MongoDB backend via <code className="font-mono">VITE_API_BASE_URL</code>.
          </p>
        </div>
      </div>
    </>
  );
}
