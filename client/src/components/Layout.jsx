import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HomeIcon,
  PlusCircleIcon,
  TableCellsIcon,
  ChartBarIcon,
  SparklesIcon,
  ArrowRightStartOnRectangleIcon,
} from '@heroicons/react/24/outline';

const links = [
  { to: '/', icon: HomeIcon, label: 'Dashboard' },
  { to: '/trades/new', icon: PlusCircleIcon, label: 'New Trade' },
  { to: '/trades', icon: TableCellsIcon, label: 'Trade Log' },
  { to: '/analytics', icon: ChartBarIcon, label: 'Analytics' },
  { to: '/insights', icon: SparklesIcon, label: 'AI Insights' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col bg-gray-900 border-r border-gray-800">
        <div className="px-5 py-4 border-b border-gray-800">
          <span className="text-lg font-bold text-indigo-400">TradeJournal</span>
          {user && <p className="text-xs text-gray-500 mt-0.5 truncate">{user.email}</p>}
        </div>
        <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 px-2">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors"
          >
            <ArrowRightStartOnRectangleIcon className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
