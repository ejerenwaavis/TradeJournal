import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-100">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [recentTrades, setRecentTrades] = useState([]);

  useEffect(() => {
    api.get('/analytics/summary').then(({ data }) => setSummary(data.summary));
    api.get('/trades?limit=5').then(({ data }) => setRecentTrades(data.trades));
  }, []);

  const winPct = summary ? (summary.winRate * 100).toFixed(0) : '—';
  const pnl = summary ? `$${(summary.totalPnlDollars ?? 0).toFixed(2)}` : '—';
  const avgRR = summary ? (summary.avgRR?.toFixed(2) ?? '—') : '—';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <Link
          to="/trades/new"
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + New Trade
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Trades (closed)" value={summary?.totalTrades ?? '—'} />
        <StatCard label="Win Rate" value={`${winPct}%`} sub={`${summary?.wins ?? 0}W / ${summary?.losses ?? 0}L`} />
        <StatCard label="Avg R:R" value={avgRR} />
        <StatCard label="Total P&L" value={pnl} />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
          <h2 className="text-sm font-semibold">Recent Trades</h2>
          <Link to="/trades" className="text-xs text-indigo-400 hover:underline">View all</Link>
        </div>
        <div className="divide-y divide-gray-800">
          {recentTrades.length === 0 && (
            <p className="px-5 py-6 text-sm text-gray-500 text-center">No trades yet — log your first one!</p>
          )}
          {recentTrades.map((t) => (
            <Link
              key={t._id}
              to={`/trades/${t._id}`}
              className="flex items-center justify-between px-5 py-3 hover:bg-gray-800 transition-colors"
            >
              <div>
                <span className="text-sm font-medium text-gray-100">{t.instrument}</span>
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded font-medium ${t.direction === 'long' ? 'bg-emerald-900 text-emerald-300' : 'bg-rose-900 text-rose-300'}`}>
                  {t.direction}
                </span>
                <span className="ml-2 text-xs text-gray-500">{t.setupType || '—'}</span>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold ${t.result === 'win' ? 'text-emerald-400' : t.result === 'loss' ? 'text-rose-400' : 'text-gray-400'}`}>
                  {t.result ? t.result.charAt(0).toUpperCase() + t.result.slice(1) : 'Open'}
                </p>
                <p className="text-xs text-gray-500">{t.entryDate ? new Date(t.entryDate).toLocaleDateString() : ''}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
