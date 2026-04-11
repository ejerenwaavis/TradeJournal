import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  HomeIcon,
  PlusCircleIcon,
  TableCellsIcon,
  ChartBarIcon,
  SparklesIcon,
  BeakerIcon,
  RectangleStackIcon,
  BookOpenIcon,
  Cog6ToothIcon,
  ArrowRightStartOnRectangleIcon,
  SunIcon,
  MoonIcon,
  Bars3Icon,
  XMarkIcon,
  BuildingLibraryIcon,
} from '@heroicons/react/24/outline';

const links = [
  { to: '/dashboard', icon: HomeIcon, label: 'Dashboard' },
  { to: '/trades/new', icon: PlusCircleIcon, label: 'New Trade' },
  { to: '/trades', icon: TableCellsIcon, label: 'Trade Log' },
  { to: '/analytics', icon: ChartBarIcon, label: 'Analytics' },
  { to: '/insights', icon: SparklesIcon, label: 'AI Insights' },
  { to: '/backtests', icon: BeakerIcon, label: 'Backtesting' },
  { to: '/flashcards', icon: RectangleStackIcon, label: 'Flashcards' },
  { to: '/study', icon: BookOpenIcon, label: 'Study' },
  { to: '/rules', icon: BuildingLibraryIcon, label: 'Rule Library' },
  { to: '/settings', icon: Cog6ToothIcon, label: 'Settings' },
];

// Bottom nav shows only the 5 most-used links on mobile
const bottomLinks = [
  { to: '/dashboard', icon: HomeIcon, label: 'Home' },
  { to: '/trades', icon: TableCellsIcon, label: 'Trades' },
  { to: '/trades/new', icon: PlusCircleIcon, label: 'New' },
  { to: '/study', icon: BookOpenIcon, label: 'Study' },
  { to: '/analytics', icon: ChartBarIcon, label: 'Analytics' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggle } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">

      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <aside className="hidden md:flex group w-14 hover:w-56 transition-[width] duration-200 ease-in-out shrink-0 flex-col bg-gray-900 border-r border-gray-800 overflow-hidden z-10">
        {/* Logo */}
        <div className="h-14 px-3 flex items-center gap-3 border-b border-gray-800 shrink-0 overflow-hidden">
          <div className="w-8 h-8 shrink-0 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm select-none">TJ</div>
          <div className="overflow-hidden whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <p className="text-sm font-bold text-indigo-400 leading-tight">TradeJournal</p>
            {user && <p className="text-xs text-gray-500 truncate">{user.email}</p>}
          </div>
        </div>
        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-1.5">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard' || to === '/trades' || to === '/backtests'}
              title={label}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors overflow-hidden ${
                  isActive
                    ? 'bg-indigo-600 text-white !text-white border border-indigo-500'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150">{label}</span>
            </NavLink>
          ))}
        </nav>
        {/* Bottom actions */}
        <div className="p-1.5 border-t border-gray-800 space-y-0.5">
          <button onClick={toggle} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors overflow-hidden">
            {theme === 'dark' ? <SunIcon className="w-5 h-5 shrink-0" /> : <MoonIcon className="w-5 h-5 shrink-0" />}
            <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>
          <button onClick={handleLogout} title="Logout"
            className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors overflow-hidden">
            <ArrowRightStartOnRectangleIcon className="w-5 h-5 shrink-0" />
            <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150">Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile: full layout column ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 h-14 bg-gray-900 border-b border-gray-800 shrink-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm select-none">TJ</div>
            <span className="text-sm font-bold text-indigo-400">TradeJournal</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggle} className="p-2 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors">
              {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>
            <button onClick={() => setDrawerOpen(true)} className="p-2 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors">
              <Bars3Icon className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Main content — padding-bottom for mobile bottom nav */}
        <main className="flex-1 overflow-y-auto p-3 md:p-6 pb-20 md:pb-6">{children}</main>

        {/* Mobile bottom navigation bar */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-gray-900 border-t border-gray-800 flex items-stretch z-20 safe-area-inset-bottom">
          {bottomLinks.map(({ to, icon: Icon, label }) => {
            const isActive = to === '/dashboard'
              ? location.pathname === '/dashboard'
              : to === '/trades'
              ? location.pathname === '/trades'
              : location.pathname.startsWith(to);
            return (
              <NavLink key={to} to={to}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                  isActive ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-400' : ''}`} />
                {label}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* ── Mobile full-screen drawer (hamburger menu) ── */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setDrawerOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-gray-900 border-r border-gray-800 flex flex-col z-40 md:hidden">
            <div className="h-14 px-4 flex items-center justify-between border-b border-gray-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">TJ</div>
                <div>
                  <p className="text-sm font-bold text-indigo-400">TradeJournal</p>
                  {user && <p className="text-xs text-gray-500 truncate max-w-[160px]">{user.email}</p>}
                </div>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
              {links.map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to}
                  end={to === '/dashboard' || to === '/trades' || to === '/backtests'}
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive ? 'bg-indigo-600 text-white border border-indigo-500' : 'text-gray-300 hover:bg-gray-800 hover:text-gray-100'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="p-2 border-t border-gray-800 space-y-0.5">
              <button onClick={() => { toggle(); setDrawerOpen(false); }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:bg-gray-800 transition-colors">
                {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </button>
              <button onClick={handleLogout}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:bg-gray-800 transition-colors">
                <ArrowRightStartOnRectangleIcon className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
