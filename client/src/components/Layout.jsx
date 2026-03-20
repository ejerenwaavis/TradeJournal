import { NavLink, useNavigate } from 'react-router-dom';
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
  ArrowRightStartOnRectangleIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline';

const links = [
  { to: '/dashboard', icon: HomeIcon, label: 'Dashboard' },
  { to: '/trades/new', icon: PlusCircleIcon, label: 'New Trade' },
  { to: '/trades', icon: TableCellsIcon, label: 'Trade Log' },
  { to: '/analytics', icon: ChartBarIcon, label: 'Analytics' },
  { to: '/insights', icon: SparklesIcon, label: 'AI Insights' },
  { to: '/backtests', icon: BeakerIcon, label: 'Backtesting' },
  { to: '/flashcards', icon: RectangleStackIcon, label: 'Flashcards' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
      {/* Sidebar — icon-only at rest, expands on hover */}
      <aside className="group w-14 hover:w-56 transition-[width] duration-200 ease-in-out shrink-0 flex flex-col bg-gray-900 border-r border-gray-800 overflow-hidden z-10">

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
          {links.map(({ to, icon: Icon, label }) => ( // eslint-disable-line no-unused-vars -- Icon used as JSX component
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard' || to === '/trades' || to === '/backtests'}
              title={label}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors overflow-hidden ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
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
          <button
            onClick={toggle}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors overflow-hidden"
          >
            {theme === 'dark' ? <SunIcon className="w-5 h-5 shrink-0" /> : <MoonIcon className="w-5 h-5 shrink-0" />}
            <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </span>
          </button>
          <button
            onClick={handleLogout}
            title="Logout"
            className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors overflow-hidden"
          >
            <ArrowRightStartOnRectangleIcon className="w-5 h-5 shrink-0" />
            <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
