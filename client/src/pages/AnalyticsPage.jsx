import { useEffect, useState } from 'react';
import api from '../utils/api';
import { SkeletonSummaryCards, SkeletonChartBlock } from '../components/Skeleton';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function Card({ title, children, className = '' }) {
  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-xl p-5 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-300 mb-4">{title}</h3>
      {children}
    </div>
  );
}

export default function AnalyticsPage() {
  const [summary, setSummary] = useState(null);
  const [bySetup, setBySetup] = useState([]);
  const [bySession, setBySession] = useState([]);
  const [pnlData, setPnlData] = useState([]);
  const [emotionData, setEmotion] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('month');
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const buildParams = () => {
    if (range === 'month') return `month=${month}`;
    if (range === '7days') {
      const from = new Date(); from.setDate(from.getDate() - 7);
      return `from=${from.toISOString().split('T')[0]}`;
    }
    if (range === '30days') {
      const from = new Date(); from.setDate(from.getDate() - 30);
      return `from=${from.toISOString().split('T')[0]}`;
    }
    return '';
  };

  useEffect(() => {
    setLoading(true);
    const q = buildParams();
    Promise.all([
      api.get(`/analytics/summary?${q}`),
      api.get(`/analytics/by-setup?${q}`),
      api.get(`/analytics/by-session?${q}`),
      api.get(`/analytics/pnl-over-time?${q}`),
      api.get(`/analytics/emotion-heatmap?${q}`),
    ]).then(([s, bs, bsess, pnl, em]) => {
      setSummary(s.data.summary);
      setBySetup(bs.data.data);
      setBySession(bsess.data.data);
      setPnlData(pnl.data.data);
      setEmotion(em.data.data);
    }).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, month]);

  const winPct = summary ? (summary.winRate * 100).toFixed(1) : 0;
  const pieData = summary
    ? [
        { name: 'Win', value: summary.wins },
        { name: 'Loss', value: summary.losses },
        { name: 'BE', value: summary.breakevens },
      ].filter((d) => d.value > 0)
    : [];

  const setupChartData = bySetup.map((s) => ({
    name: s._id || 'Unknown',
    winRate: parseFloat((s.winRate * 100).toFixed(1)),
    avgRR: parseFloat((s.avgRR || 0).toFixed(2)),
    trades: s.total,
  }));

  const sessionChartData = bySession.map((s) => ({
    name: s._id || 'Unknown',
    winRate: parseFloat((s.winRate * 100).toFixed(1)),
    trades: s.total,
  }));

  // Build emotion heatmap: group by emotion
  const emotions = [...new Set(emotionData.map((e) => e.emotion))];
  const emotionHeatmap = emotions.map((em) => {
    const rows = emotionData.filter((e) => e.emotion === em);
    const wins = rows.find((r) => r.result === 'win')?.count || 0;
    const losses = rows.find((r) => r.result === 'loss')?.count || 0;
    const total = wins + losses;
    return { emotion: em, wins, losses, winRate: total > 0 ? ((wins / total) * 100).toFixed(0) : 0, total };
  });

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold">Analytics</h1>
        <div className="flex items-center gap-2">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none"
          >
            <option value="month">This Month</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
          {range === 'month' && (
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none"
            />
          )}
        </div>
      </div>

      {/* Best / Worst setup highlight */}
      {bySetup.length > 0 && (() => {
        const qualified = bySetup.filter((s) => s.total >= 2);
        if (!qualified.length) return null;
        const best  = qualified.reduce((a, b) => b.winRate > a.winRate ? b : a);
        const worst = qualified.reduce((a, b) => b.winRate < a.winRate ? b : a);
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-emerald-950 border border-emerald-800 rounded-xl p-4 flex items-center gap-4">
              <div className="text-2xl">🏆</div>
              <div>
                <p className="text-xs text-emerald-500 uppercase tracking-wider mb-0.5">Best Setup</p>
                <p className="text-lg font-bold text-emerald-300">{best._id || 'Unknown'}</p>
                <p className="text-xs text-emerald-600">{(best.winRate * 100).toFixed(0)}% WR · {best.total} trades · Avg R:R {best.avgRR?.toFixed(2) ?? '—'}</p>
              </div>
            </div>
            {worst._id !== best._id && (
              <div className="bg-rose-950 border border-rose-900 rounded-xl p-4 flex items-center gap-4">
                <div className="text-2xl">📊</div>
                <div>
                  <p className="text-xs text-rose-500 uppercase tracking-wider mb-0.5">Needs Work</p>
                  <p className="text-lg font-bold text-rose-300">{worst._id || 'Unknown'}</p>
                  <p className="text-xs text-rose-700">{(worst.winRate * 100).toFixed(0)}% WR · {worst.total} trades · Avg R:R {worst.avgRR?.toFixed(2) ?? '—'}</p>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading && <SkeletonSummaryCards count={4} />}
        {!loading && [{
          label: 'Closed Trades', value: summary?.totalTrades ?? '—' },
          { label: 'Win Rate', value: `${winPct}%`, sub: `${summary?.wins ?? 0}W / ${summary?.losses ?? 0}L` },
          { label: 'Avg R:R',   value: summary?.avgRR != null ? summary.avgRR.toFixed(2) : '—' },
          { label: 'Total Points', value: summary?.totalPnlPips != null ? `${summary.totalPnlPips > 0 ? '+' : ''}${summary.totalPnlPips}` : '—',
            cls: summary?.totalPnlPips > 0 ? 'text-emerald-400' : summary?.totalPnlPips < 0 ? 'text-rose-400' : 'text-gray-100' },
        ].map(({ label, value, sub, cls }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${cls || 'text-gray-100'}`}>{value}</p>
            {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {loading && (
          <>
            <SkeletonChartBlock />
            <SkeletonChartBlock />
            <SkeletonChartBlock />
            <SkeletonChartBlock />
          </>
        )}
        {!loading && (
          <>
        {/* Win rate donut */}
        <Card title="Win / Loss / BE">
          {pieData.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No closed trades in this period</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={['#10b981', '#ef4444', '#f59e0b'][i]} />)}
                </Pie>
                <Tooltip formatter={(v) => [v, 'Trades']} contentStyle={{ background: '#1f2937', border: '1px solid #374151' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Points over time */}
        <Card title="Cumulative Points / Handles">
          {pnlData.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No closed trades in this period</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={pnlData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip formatter={(v) => [`${v}`, 'Cumulative Points']} contentStyle={{ background: '#1f2937', border: '1px solid #374151' }} />
                <Line type="monotone" dataKey="cumulativePnl" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Setup breakdown */}
        <Card title="Win Rate by Setup (%)">
          {setupChartData.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={setupChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} unit="%" />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip formatter={(v) => [`${v}%`, 'Win Rate']} contentStyle={{ background: '#1f2937', border: '1px solid #374151' }} />
                <Bar dataKey="winRate" fill="#6366f1" radius={[0, 4, 4, 0]}>
                  {setupChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Session win rate */}
        <Card title="Win Rate by Session (%)">
          {sessionChartData.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sessionChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} unit="%" />
                <Tooltip formatter={(v) => [`${v}%`, 'Win Rate']} contentStyle={{ background: '#1f2937', border: '1px solid #374151' }} />
                <Bar dataKey="winRate" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
        </>
        )}
      </div>

      {/* Emotion heatmap */}
      <Card title="Emotion vs Result">
        {emotionHeatmap.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No emotion data in this period</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Emotion</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Trades</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Wins</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Losses</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Win Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {emotionHeatmap.map((row) => (
                  <tr key={row.emotion}>
                    <td className="px-3 py-2 text-gray-200">{row.emotion}</td>
                    <td className="px-3 py-2 text-right text-gray-400">{row.total}</td>
                    <td className="px-3 py-2 text-right text-emerald-400">{row.wins}</td>
                    <td className="px-3 py-2 text-right text-rose-400">{row.losses}</td>
                    <td className="px-3 py-2 text-right font-semibold" style={{ color: row.winRate >= 50 ? '#10b981' : '#ef4444' }}>
                      {row.winRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Setup detail table */}
      {bySetup.length > 0 && (
        <Card title="Setup Performance Detail">
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Setup', 'Trades', 'Win Rate', 'Avg R:R', 'Points'].map((h) => (
                    <th key={h} className={`px-3 py-2 text-xs font-medium text-gray-500 ${h === 'Setup' ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {bySetup.map((s) => (
                  <tr key={s._id}>
                    <td className="px-3 py-2 text-gray-200">{s._id || 'Unknown'}</td>
                    <td className="px-3 py-2 text-right text-gray-400">{s.total}</td>
                    <td className="px-3 py-2 text-right font-medium" style={{ color: s.winRate >= 0.5 ? '#10b981' : '#ef4444' }}>
                      {(s.winRate * 100).toFixed(0)}%
                    </td>
                    <td className="px-3 py-2 text-right text-gray-300">{s.avgRR?.toFixed(2) ?? '—'}</td>
                    <td className={`px-3 py-2 text-right font-medium ${s.totalPnl > 0 ? 'text-emerald-400' : s.totalPnl < 0 ? 'text-rose-400' : 'text-gray-400'}`}>
                      {s.totalPnl != null ? `${s.totalPnl > 0 ? '+' : ''}${s.totalPnl.toFixed(1)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
