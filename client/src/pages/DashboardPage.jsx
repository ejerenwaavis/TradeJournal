import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { SkeletonStatCard, SkeletonTradeRow } from '../components/Skeleton';

function StatCard({ label, value, sub, valueClass = 'text-gray-100' }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold ${valueClass}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

// Compute current win/loss streak from an array of closed trades (newest first)
function computeStreak(trades) {
  const closed = trades.filter((t) => t.status === 'closed' && (t.result === 'win' || t.result === 'loss'));
  if (!closed.length) return null;
  const first = closed[0].result;
  let count = 0;
  for (const t of closed) {
    if (t.result !== first) break;
    count++;
  }
  return { type: first, count };
}

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [recentTrades, setRecentTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/summary'),
      api.get('/trades?limit=20'),
    ]).then(([s, t]) => {
      setSummary(s.data.summary);
      setRecentTrades(t.data.trades);
    }).finally(() => setLoading(false));
  }, []);

  const winPct = summary ? (summary.winRate * 100).toFixed(0) : '—';
  const avgRR = summary ? (summary.avgRR?.toFixed(2) ?? '—') : '—';
  const totalPts = summary ? (summary.totalPnlPips != null ? `${summary.totalPnlPips > 0 ? '+' : ''}${summary.totalPnlPips}` : '—') : '—';
  const ptsClass = summary?.totalPnlPips > 0 ? 'text-emerald-400' : summary?.totalPnlPips < 0 ? 'text-rose-400' : 'text-gray-100';
  const streak = computeStreak(recentTrades);

  // Process score: execution rating average across recent closed trades
  const closedWithRating = recentTrades.filter((t) => t.executionRating);
  const avgExec = closedWithRating.length
    ? (closedWithRating.reduce((s, t) => s + t.executionRating, 0) / closedWithRating.length).toFixed(1)
    : '—';

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

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {loading ? (
          Array.from({ length: 5 }, (_, i) => <SkeletonStatCard key={i} />)
        ) : (
          <>
            <StatCard label="Closed Trades"    value={summary?.totalTrades ?? '—'} />
            <StatCard label="Open Trades"      value={summary?.openTrades  ?? '—'} valueClass="text-yellow-300" />
            <StatCard label="Win Rate"          value={`${winPct}%`} sub={`${summary?.wins ?? 0}W / ${summary?.losses ?? 0}L`} />
            <StatCard label="Avg R:R"           value={avgRR} />
            <StatCard label="Points / Handles" value={totalPts} valueClass={ptsClass} />
          </>
        )}
      </div>

      {/* Process score bar */}
      {avgExec !== '—' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-3 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="text-xs text-gray-500">Execution Quality</span>
              <span className="text-xs font-semibold text-indigo-300">{avgExec} / 5</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${(parseFloat(avgExec) / 5) * 100}%` }} />
            </div>
          </div>
          <p className="text-xs text-gray-600 shrink-0 hidden md:block">avg over last 20 trades</p>
        </div>
      )}

      {/* Streak banner */}
      {streak && streak.count >= 2 && (
        <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border ${
          streak.type === 'win'
            ? 'bg-emerald-950 border-emerald-800 text-emerald-300'
            : 'bg-rose-950 border-rose-900 text-rose-300'
        }`}>
          <span className="text-2xl">{streak.type === 'win' ? '🔥' : '⚠️'}</span>
          <div>
            <p className="text-sm font-semibold">{streak.count}-trade {streak.type === 'win' ? 'winning' : 'losing'} streak</p>
            <p className="text-xs opacity-70">{streak.type === 'win' ? 'Keep it disciplined!' : 'Review your process before the next trade.'}</p>
          </div>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
          <h2 className="text-sm font-semibold">Recent Trades</h2>
          <Link to="/trades" className="text-xs text-indigo-400 hover:underline">View all</Link>
        </div>
        <div className="divide-y divide-gray-800">
          {loading && Array.from({ length: 6 }, (_, i) => <SkeletonTradeRow key={i} />)}
          {!loading && recentTrades.length === 0 && (
            <p className="px-5 py-6 text-sm text-gray-500 text-center">No trades yet — log your first one!</p>
          )}
          {recentTrades.slice(0, 8).map((t) => (
            <Link
              key={t._id}
              to={`/trades/${t._id}`}
              className="flex items-center justify-between px-5 py-3 hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium text-gray-100 truncate">{t.instrument}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
                  t.direction === 'long' ? 'bg-emerald-900 text-emerald-300' : 'bg-rose-900 text-rose-300'
                }`}>{t.direction}</span>
                {t.setupType && <span className="text-xs text-gray-600 truncate hidden sm:block">{t.setupType}</span>}
                {t.timeframe && <span className="text-xs text-gray-700 hidden md:block">{t.timeframe}</span>}
              </div>
              <div className="flex items-center gap-4 shrink-0">
                {t.pnlPips != null && (
                  <span className={`text-sm font-medium ${
                    t.pnlPips > 0 ? 'text-emerald-400' : t.pnlPips < 0 ? 'text-rose-400' : 'text-gray-400'
                  }`}>
                    {t.pnlPips > 0 ? '+' : ''}{t.pnlPips} pts
                  </span>
                )}
                <div className="text-right">
                  <p className={`text-sm font-semibold capitalize ${
                    t.result === 'win' ? 'text-emerald-400' : t.result === 'loss' ? 'text-rose-400' : 'text-gray-400'
                  }`}>
                    {t.result || (t.status === 'open' ? <span className="text-yellow-300">Open</span> : 'Cancel')}
                  </p>
                  <p className="text-xs text-gray-600">{t.entryDate ? new Date(t.entryDate).toLocaleDateString() : ''}</p>
                  {t.riskReward && <p className="text-xs text-gray-600">R:R {t.riskReward}</p>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
