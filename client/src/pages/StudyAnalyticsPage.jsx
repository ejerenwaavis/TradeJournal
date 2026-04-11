import { useState, useEffect } from 'react';
import api from '../utils/api';

function SectionHeading({ children }) {
  return <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{children}</p>;
}

function StatBlock({ label, value, sub }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-100">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function StudyAnalyticsPage() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    api.get('/study/analytics/global')
      .then(({ data }) => setData(data))
      .catch((err) => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full text-gray-500">Loading analytics…</div>;
  if (error)   return <div className="flex items-center justify-center h-full text-red-400">Error: {error}</div>;
  if (!data || data.empty) return (
    <div className="flex items-center justify-center h-full text-gray-500 text-sm">
      No study data yet — add setups in Study Companion to see cross-topic analytics.
    </div>
  );

  const maxComboCount = data.topCombos?.[0]?.appearances || 1;
  const maxHour = Math.max(...(data.timeHeatmap?.map((h) => h.count) || [1]));
  const maxDowCount = Math.max(...(data.dayOfWeekMatrix?.map(d => d.count) || [1]));

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      <div>
        <h1 className="text-xl font-bold">Study Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Cross-topic confluence performance — based on {data.total} total setups</p>
      </div>

      {/* ── Summary stats ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatBlock label="Total Setups" value={data.total} />
        {data.avgCompletionRate != null && (
          <StatBlock label="Avg Rule Completion" value={`${data.avgCompletionRate}%`} sub="rules fired per session" />
        )}
        {data.biasAccuracy?.Bullish && (
          <StatBlock
            label="Bullish Bias Accuracy"
            value={data.biasAccuracy.Bullish.textbookRate != null ? `${data.biasAccuracy.Bullish.textbookRate}%` : '—'}
            sub={`${data.biasAccuracy.Bullish.total} setups`}
          />
        )}
        {data.biasAccuracy?.Bearish && (
          <StatBlock
            label="Bearish Bias Accuracy"
            value={data.biasAccuracy.Bearish.textbookRate != null ? `${data.biasAccuracy.Bearish.textbookRate}%` : '—'}
            sub={`${data.biasAccuracy.Bearish.total} setups`}
          />
        )}
        {data.sessionMatrix?.[0] && (
          <StatBlock
            label="Best Session"
            value={data.sessionMatrix[0].session}
            sub={`${data.sessionMatrix[0].textbookRate}% textbook`}
          />
        )}
      </div>

      {/* ── Clarity Score Distribution (Phase 5) ───────────────────────────── */}
      {data.clarityDist?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <SectionHeading>Session Clarity Distribution</SectionHeading>
          <div className="grid grid-cols-3 gap-3">
            {data.clarityDist.map(c => (
              <div key={c.score} className={`rounded-xl p-4 text-center border ${c.score === 3 ? 'border-emerald-700 bg-emerald-900/20' : c.score === 2 ? 'border-amber-700 bg-amber-900/20' : 'border-gray-600 bg-gray-800'}`}>
                <p className={`text-xs font-medium mb-1 ${c.score === 3 ? 'text-emerald-400' : c.score === 2 ? 'text-amber-400' : 'text-gray-400'}`}>{c.label} (C{c.score})</p>
                <p className="text-2xl font-bold text-gray-100">{c.count}</p>
                {c.textbookRate != null && <p className="text-xs text-gray-500 mt-1">{c.textbookRate}% textbook</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Day-of-Week Matrix (Phase 5) ─────────────────────────────────────── */}
      {data.dayOfWeekMatrix?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <SectionHeading>Day-of-Week Performance</SectionHeading>
          <div className="grid grid-cols-5 gap-2">
            {data.dayOfWeekMatrix.map(d => (
              <div key={d.day} className="bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">{d.day}</p>
                <p className="text-lg font-bold text-gray-100">{d.textbookRate}%</p>
                <p className="text-xs text-gray-500">{d.count} setups</p>
                <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(d.count / maxDowCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Direction Matrix (Phase 5) ───────────────────────────────────────── */}
      {data.directionMatrix?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <SectionHeading>Market Direction Performance</SectionHeading>
          <div className="grid grid-cols-3 gap-3">
            {data.directionMatrix.map(d => (
              <div key={d.direction} className={`rounded-xl p-4 text-center border ${d.direction === 'Bullish' ? 'border-emerald-800 bg-emerald-900/10' : d.direction === 'Bearish' ? 'border-rose-800 bg-rose-900/10' : 'border-yellow-800 bg-yellow-900/10'}`}>
                <p className={`text-xs font-medium mb-1 ${d.direction === 'Bullish' ? 'text-emerald-400' : d.direction === 'Bearish' ? 'text-rose-400' : 'text-yellow-400'}`}>{d.direction}</p>
                <p className="text-2xl font-bold text-gray-100">{d.textbookRate}%</p>
                <p className="text-xs text-gray-500 mt-1">{d.count} setups</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Top confluence combinations ──────────────────────────────────────── */}
      {data.topCombos?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <SectionHeading>Top Confluence Combinations</SectionHeading>
          <div className="space-y-2">
            {data.topCombos.map((c) => (
              <div key={c.combo} className="flex items-center gap-3">
                <span className="text-sm text-gray-300 w-64 shrink-0 truncate" title={c.combo}>{c.combo}</span>
                <div className="flex-1 bg-gray-800 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-indigo-500 transition-all"
                    style={{ width: `${(c.appearances / maxComboCount) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-emerald-400 w-12 text-right font-semibold">{c.textbookRate}%</span>
                <span className="text-xs text-gray-500 w-16 text-right">{c.appearances} setups</span>
                {c.avgMaxRun != null && <span className="text-xs text-gray-500 w-20 text-right">run: {c.avgMaxRun} pts</span>}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-3">% = textbook outcome rate · bar = relative frequency</p>
        </div>
      )}

      {/* ── Session performance matrix ───────────────────────────────────────── */}
      {data.sessionMatrix?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <SectionHeading>Session Performance</SectionHeading>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {data.sessionMatrix.map((s) => (
              <div key={s.session} className="bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">{s.session}</p>
                <p className="text-lg font-bold text-gray-100">{s.textbookRate}%</p>
                <p className="text-xs text-gray-500">{s.count} setups{s.avgMaxRun != null ? ` · ${s.avgMaxRun} pts avg` : ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Time-of-day heatmap ──────────────────────────────────────────────── */}
      {data.timeHeatmap && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <SectionHeading>Trade Time Heatmap (by hour)</SectionHeading>
          <div className="flex gap-0.5 items-end h-20">
            {data.timeHeatmap.map((h) => (
              <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div
                  className="w-full rounded-t transition-all"
                  style={{
                    height: maxHour > 0 ? `${Math.max(4, (h.count / maxHour) * 64)}px` : '4px',
                    backgroundColor: h.count > 0 ? `rgba(99,102,241,${0.3 + (h.textbookRate / 100) * 0.7})` : 'rgb(31,41,55)',
                  }}
                  title={`${h.hour}:00 — ${h.count} setups, ${h.textbookRate}% textbook`}
                />
                {/* tooltip */}
                {h.count > 0 && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-700 text-xs text-white px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    {h.hour}:00 · {h.count} · {h.textbookRate}%
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-600 mt-1 px-0.5">
            <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
          </div>
          <p className="text-xs text-gray-600 mt-2">Bar height = frequency · Color intensity = textbook rate</p>
        </div>
      )}
    </div>
  );
}
