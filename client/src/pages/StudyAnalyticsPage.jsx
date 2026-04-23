import { useState, useEffect, useCallback } from 'react';
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

function relativeTime(ts) {
  if (!ts) return 'never';
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 2) return 'just now';
  if (min < 60) return `${min} minutes ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr > 1 ? 's' : ''} ago`;
  const days = Math.floor(hr / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function isLikelyNoDataError(message) {
  if (!message) return false;
  const m = String(message).toLowerCase();
  return (
    m.includes('cast to objectid') ||
    m.includes('topicid') ||
    m.includes('not found') ||
    m.includes('no setups')
  );
}

function PatternPanel({ title, topicId, threshold, thresholdNote, children, data, loading, onAnalyze, errorMessage }) {
  const newEntries = data ? (data.currentEntryCount - data.entryCountAtComputation) : null;
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
        <div className="flex items-center gap-3">
          {data && (
            <span className="text-xs text-gray-500">
              Last analyzed: {relativeTime(data.computedAt)}
              {newEntries > 0 ? ` — ${newEntries} new entry${newEntries > 1 ? 's' : ''} since` : ''}
            </span>
          )}
          <button onClick={onAnalyze} disabled={loading || !topicId}
            className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg font-medium transition-colors">
            {loading ? 'Analyzing…' : data ? 'Re-analyze' : 'Analyze'}
          </button>
        </div>
      </div>
      {!topicId && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-xs text-gray-500">
          Select a topic above, then click Analyze.
        </div>
      )}
      {loading && <div className="flex items-center justify-center py-8 text-gray-500 text-sm animate-pulse">Computing patterns…</div>}
      {!loading && topicId && errorMessage && (
        <div className="text-center py-6 text-gray-500 text-sm border border-dashed border-gray-700 rounded-lg">
          <p className="font-medium">Not enough data to analyze yet</p>
          <p className="text-xs text-gray-600 mt-1">Add more setups for this topic and try again.</p>
        </div>
      )}
      {!loading && topicId && !data && !errorMessage && (
        <div className="text-center py-8 text-gray-500 text-sm">
          <p className="mb-1">Run analysis to see patterns</p>
          {thresholdNote && <p className="text-xs text-gray-600">{thresholdNote}</p>}
        </div>
      )}
      {!loading && topicId && data?.insufficientData && (
        <div className="text-center py-6 text-gray-500 text-sm border border-dashed border-gray-700 rounded-lg">
          <p className="font-medium">Not enough data yet</p>
          <p className="text-xs text-gray-600 mt-1">{data.entryCount} entries — need {threshold}+ for this analysis</p>
        </div>
      )}
      {!loading && topicId && data && !data.insufficientData && children}
    </div>
  );
}

// ── Panel 1: Rules ───────────────────────────────────────────────────────────
function RulesPanel({ data }) {
  return (
    <div className="space-y-5">
      {data.individualRules?.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2 font-medium">Individual Rule Performance</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-gray-600 border-b border-gray-800">
                  <th className="pb-2 pr-3 font-medium">Rule</th>
                  <th className="pb-2 pr-3 font-medium text-right">Fire Rate</th>
                  <th className="pb-2 pr-3 font-medium text-right">Avg R (fired)</th>
                  <th className="pb-2 pr-3 font-medium text-right">Avg R (not)</th>
                  <th className="pb-2 pr-3 font-medium text-right">Avg MAE (fired)</th>
                  <th className="pb-2 pr-3 font-medium text-right">Avg MAE (not)</th>
                  <th className="pb-2 font-medium">Best Branch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {data.individualRules.map((r) => (
                  <tr key={r.ruleId} className="hover:bg-gray-800/40">
                    <td className="py-2 pr-3 text-gray-300 max-w-[180px] truncate" title={r.title}>{r.title}</td>
                    <td className="py-2 pr-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-12 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${r.fireRate}%` }} />
                        </div>
                        <span className="text-gray-400">{r.fireRate}%</span>
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-right font-medium text-gray-300">{r.avgRWhenFired != null ? r.avgRWhenFired.toFixed(2) : '—'}</td>
                    <td className="py-2 pr-3 text-right text-gray-500">{r.avgRWhenNotFired != null ? r.avgRWhenNotFired.toFixed(2) : '—'}</td>
                    <td className="py-2 pr-3 text-right text-rose-400">{r.avgMAEWhenFired != null ? r.avgMAEWhenFired.toFixed(1) : '—'}</td>
                    <td className="py-2 pr-3 text-right text-gray-600">{r.avgMAEWhenNotFired != null ? r.avgMAEWhenNotFired.toFixed(1) : '—'}</td>
                    <td className="py-2">
                      {r.highestRBranch
                        ? <span className="bg-indigo-900/60 text-indigo-300 px-1.5 py-0.5 rounded text-xs truncate max-w-[120px] inline-block" title={r.highestRBranch}>{r.highestRBranch}</span>
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-600 mt-2">MAE = avg adverse excursion — lower is better entry timing</p>
        </div>
      )}
      {data.ruleCombinations?.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2 font-medium">Top Rule Combinations (by avg R)</p>
          <div className="space-y-2">
            {data.ruleCombinations.slice(0, 10).map((c, i) => (
              <div key={i} className="flex items-center gap-2 flex-wrap bg-gray-800/40 rounded-lg px-3 py-2">
                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full truncate max-w-[140px]" title={c.titleA}>{c.titleA}</span>
                <span className="text-xs text-gray-600">+</span>
                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full truncate max-w-[140px]" title={c.titleB}>{c.titleB}</span>
                <div className="ml-auto flex items-center gap-3 shrink-0">
                  <span className="text-xs text-gray-500">{c.coOccurrenceCount}x</span>
                  {c.winRate != null && <span className="text-xs text-indigo-400">{c.winRate}% WR</span>}
                  {c.avgR != null && <span className="text-xs font-medium text-emerald-400">{c.avgR.toFixed(2)}R</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Panel 2: Sequences ───────────────────────────────────────────────────────
function SequencesPanel({ data }) {
  const shown = (data.fullSequences || []).filter(s => s.count >= 3).slice(0, 10);
  return (
    <div className="space-y-5">
      {shown.length > 0 ? (
        <div>
          <p className="text-xs text-gray-500 mb-2 font-medium">Most Common Full Sequences (count 3+)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-gray-600 border-b border-gray-800">
                  <th className="pb-2 pr-3 font-medium">Sequence</th>
                  <th className="pb-2 pr-3 font-medium text-right">Count</th>
                  <th className="pb-2 pr-3 font-medium text-right">Avg R</th>
                  <th className="pb-2 pr-3 font-medium text-right">Win Rate</th>
                  <th className="pb-2 pr-3 font-medium">Direction</th>
                  <th className="pb-2 font-medium">Clarity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {shown.map((s, i) => (
                  <tr key={i} className="hover:bg-gray-800/40">
                    <td className="py-2 pr-3 font-mono text-indigo-300 max-w-[200px] truncate" title={s.sequence}>{s.sequence}</td>
                    <td className="py-2 pr-3 text-right text-gray-300">{s.count}</td>
                    <td className="py-2 pr-3 text-right text-gray-300">{s.avgR != null ? s.avgR.toFixed(2) : '—'}</td>
                    <td className="py-2 pr-3 text-right text-gray-400">{s.winRate != null ? `${s.winRate}%` : '—'}</td>
                    <td className="py-2 pr-3 text-gray-400">{s.commonDirection || '—'}</td>
                    <td className="py-2 text-gray-400">{s.commonClarityScore ? `C${s.commonClarityScore}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : <p className="text-xs text-gray-500">No sequences with 3+ occurrences yet.</p>}
      {data.highValueSubsequences?.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2 font-medium">High-Value Subsequences (top 10, min 3 entries)</p>
          <div className="space-y-1.5">
            {data.highValueSubsequences.map((s, i) => (
              <div key={i} className="flex items-center gap-3 bg-gray-800/40 rounded-lg px-3 py-2">
                <span className="text-xs text-gray-500 shrink-0">Rules {s.startRuleIndex + 1}-{s.endRuleIndex + 1}</span>
                <span className="font-mono text-xs text-indigo-300 flex-1 truncate">{s.sequence}</span>
                <span className="text-xs text-gray-500 shrink-0">{s.count}x</span>
                {s.winRate != null && <span className="text-xs text-gray-400 shrink-0">{s.winRate}% WR</span>}
                {s.avgR != null && <span className="text-xs font-medium text-emerald-400 shrink-0">{s.avgR.toFixed(2)}R</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Panel 3: Narrative (3 R-groups, TF-IDF) ──────────────────────────────────
function SignalList({ signals, color, label }) {
  if (!signals?.length) return <p className="text-xs text-gray-600">No signals found.</p>;
  const maxScore = Math.max(...signals.map(s => Math.abs(s.signalScore)), 0.001);
  return (
    <div>
      <p className={`text-xs font-medium mb-2 ${color}`}>{label}</p>
      <div className="space-y-1.5">
        {signals.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-gray-300 w-28 truncate shrink-0" title={s.phrase}>{s.phrase}</span>
            <div className="flex-1 bg-gray-800 rounded-full h-1.5">
              <div className={`h-1.5 rounded-full ${color.includes('emerald') ? 'bg-emerald-600' : color.includes('amber') ? 'bg-amber-600' : 'bg-rose-600'}`}
                style={{ width: `${(Math.abs(s.signalScore) / maxScore) * 100}%` }} />
            </div>
            <span className="text-xs text-gray-600 shrink-0 w-8 text-right">{s.docFrequency}x</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NarrativePanel({ data }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-amber-400 bg-amber-900/20 border border-amber-800 rounded-lg px-3 py-2">
        Exploratory — TF-IDF frequency signal analysis, not predictive ML. Phrases shown in 3+ sessions only.
      </p>
      {data.minimumEntriesWarning && (
        <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg px-3 py-2 text-xs text-yellow-400">
          Signals are more reliable with 15+ entries per group.
          ({data.totalHighR} high-R ≥2R, {data.totalMidR} mid-R 1-2R, {data.totalLowR} low-R &lt;1R entries)
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SignalList signals={data.highRSignals} color="text-emerald-400" label={`High-R Sessions (≥2R) — ${data.totalHighR} entries`} />
        <SignalList signals={data.midRSignals}  color="text-amber-400"  label={`Mid-R Sessions (1-2R) — ${data.totalMidR} entries`} />
        <SignalList signals={data.lowRSignals}  color="text-rose-400"   label={`Low-R Sessions (<1R) — ${data.totalLowR} entries`} />
      </div>
      <p className="text-xs text-gray-700">Bar = relative signal strength · number = how many sessions contain this phrase</p>
    </div>
  );
}

// ── Panel 4: Macros ──────────────────────────────────────────────────────────
function MacrosPanel({ data }) {
  if (!data.macros?.length) return <p className="text-xs text-gray-500">No macro-type rules found for this topic.</p>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {data.macros.map((m) => (
        <div key={m.macroTime} className="bg-gray-800/60 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-200">{m.macroTime} Macro <span className="text-xs font-normal text-gray-500">({m.total} entries)</span></p>
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Branch Distribution</p>
            <div className="space-y-1">
              {m.branchDistribution.map(b => (
                <div key={b.branch} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-16 shrink-0 truncate" title={b.branch}>{b.branch}</span>
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${b.pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-16 text-right shrink-0">{b.pct}% ({b.count})</span>
                  {b.avgR != null && <span className="text-xs text-gray-600 w-12 text-right shrink-0">{b.avgR.toFixed(2)}R</span>}
                </div>
              ))}
            </div>
          </div>
          {m.dayBreakdown?.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1.5">By Day (dominant branch)</p>
              <div className="grid grid-cols-5 gap-1">
                {['Monday','Tuesday','Wednesday','Thursday','Friday'].map(day => {
                  const entry = m.dayBreakdown.find(d => d.day === day);
                  if (!entry) return <div key={day} className="text-center"><p className="text-xs text-gray-700">{day.slice(0,3)}</p><p className="text-xs text-gray-600">n/a</p></div>;
                  const top = [...entry.branches].sort((a,b) => b.count - a.count)[0];
                  return (
                    <div key={day} className="text-center">
                      <p className="text-xs text-gray-500">{day.slice(0,3)}</p>
                      <p className="text-xs font-medium text-indigo-400 truncate" title={top?.branch}>{top?.branch || '—'}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {m.sweepStyleBreakdown?.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1.5">Opening Rule Correlation</p>
              <div className="space-y-1">
                {m.sweepStyleBreakdown.slice(0, 3).map(sw => {
                  const topBranch = [...sw.branches].sort((a,b) => b.count - a.count)[0];
                  return (
                    <div key={sw.style} className="flex items-center gap-2 text-xs">
                      <span className="text-gray-400 w-24 truncate" title={sw.style}>{sw.style}</span>
                      <span className="text-gray-500">→</span>
                      <span className="text-indigo-400 font-medium truncate" title={topBranch?.branch}>{topBranch?.branch || '—'}</span>
                      <span className="text-gray-600">({topBranch?.count}x)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Panel 5: Correlations ────────────────────────────────────────────────────
function CorrelationsPanel({ data }) {
  const bestCRBand = data.completionVsR?.reduce((best, b) => (b.avgR ?? -Infinity) > (best.avgR ?? -Infinity) ? b : best, {});
  return (
    <div className="space-y-6">
      {data.completionVsR?.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2 font-medium">Completion Rate vs R — do fully-executed sessions produce better trades?</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-gray-600 border-b border-gray-800">
                  <th className="pb-2 pr-3 font-medium">Completion Band</th>
                  <th className="pb-2 pr-3 font-medium text-right">Count</th>
                  <th className="pb-2 pr-3 font-medium text-right">Avg R</th>
                  <th className="pb-2 pr-3 font-medium text-right">Win Rate</th>
                  <th className="pb-2 pr-3 font-medium text-right">Avg MFE</th>
                  <th className="pb-2 font-medium text-right">Avg MAE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {data.completionVsR.map((b) => (
                  <tr key={b.band} className={`hover:bg-gray-800/40 ${b.band === bestCRBand.band ? 'bg-emerald-900/10' : ''}`}>
                    <td className="py-2 pr-3 text-gray-300 font-medium">{b.band}%{b.band === bestCRBand.band ? ' ★' : ''}</td>
                    <td className="py-2 pr-3 text-right text-gray-400">{b.count}</td>
                    <td className="py-2 pr-3 text-right font-medium text-gray-200">{b.avgR != null ? b.avgR.toFixed(2) : '—'}</td>
                    <td className="py-2 pr-3 text-right text-gray-400">{b.winRate != null ? `${b.winRate}%` : '—'}</td>
                    <td className="py-2 pr-3 text-right text-emerald-400">{b.avgMFE != null ? b.avgMFE.toFixed(1) : '—'}</td>
                    <td className="py-2 text-right text-rose-400">{b.avgMAE != null ? b.avgMAE.toFixed(1) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.clarityVsR?.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2 font-medium">Clarity Score vs R — in this topic, do textbook reads outperform choppy sessions?</p>
          <div className="grid grid-cols-3 gap-3">
            {data.clarityVsR.map(c => (
              <div key={c.score} className={`rounded-xl p-4 border ${c.score === 3 ? 'border-emerald-700 bg-emerald-900/20' : c.score === 2 ? 'border-amber-700 bg-amber-900/20' : 'border-gray-600 bg-gray-800'}`}>
                <p className={`text-xs font-medium mb-2 ${c.score === 3 ? 'text-emerald-400' : c.score === 2 ? 'text-amber-400' : 'text-gray-400'}`}>{c.label} (C{c.score})</p>
                <p className="text-xl font-bold text-gray-100">{c.avgR != null ? `${c.avgR.toFixed(2)}R` : '—'}</p>
                <p className="text-xs text-gray-500 mt-1">{c.count} entries</p>
                {c.winRate != null && <p className="text-xs text-gray-400">{c.winRate}% win rate</p>}
                {c.avgCompletionRate != null && <p className="text-xs text-gray-500">{c.avgCompletionRate}% avg completion</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.maeVsEntryTrigger?.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2 font-medium">Entry Timing — avg MAE by trigger rule (lower MAE = better entry)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-gray-600 border-b border-gray-800">
                  <th className="pb-2 pr-3 font-medium">Rule</th>
                  <th className="pb-2 pr-3 font-medium text-right">Count</th>
                  <th className="pb-2 pr-3 font-medium text-right">Avg MAE</th>
                  <th className="pb-2 font-medium text-right">Avg R</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {data.maeVsEntryTrigger.map((t, i) => (
                  <tr key={i} className="hover:bg-gray-800/40">
                    <td className="py-2 pr-3 text-gray-300 max-w-[240px] truncate" title={t.title}>{t.title}</td>
                    <td className="py-2 pr-3 text-right text-gray-500">{t.count}</td>
                    <td className="py-2 pr-3 text-right text-rose-400 font-medium">{t.avgMAE != null ? t.avgMAE.toFixed(1) : '—'}</td>
                    <td className="py-2 text-right text-gray-300">{t.avgR != null ? t.avgR.toFixed(2) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.mfeVsConfluences?.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2 font-medium">Confluence Stacking — does more confluence extend the run?</p>
          <div className="space-y-2">
            {data.mfeVsConfluences.map(c => {
              const maxMFE = Math.max(...data.mfeVsConfluences.map(x => x.avgMFE || 0), 1);
              return (
                <div key={c.confluenceCount} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-20 shrink-0">{c.confluenceCount} confluence{c.confluenceCount !== '1' ? 's' : ''}</span>
                  <div className="flex-1 bg-gray-800 rounded-full h-2">
                    <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${((c.avgMFE || 0) / maxMFE) * 100}%` }} />
                  </div>
                  <span className="text-xs text-emerald-400 shrink-0 w-16 text-right">{c.avgMFE != null ? `${c.avgMFE.toFixed(1)} MFE` : '—'}</span>
                  <span className="text-xs text-gray-500 shrink-0 w-12 text-right">{c.avgR != null ? `${c.avgR.toFixed(2)}R` : ''}</span>
                  <span className="text-xs text-gray-600 shrink-0 w-12 text-right">{c.count} entries</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data.newsImpact && (
        <div>
          <p className="text-xs text-gray-500 mb-2 font-medium">News Impact — does high-severity news hurt your textbook rate?</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-gray-600 border-b border-gray-800">
                  <th className="pb-2 pr-3 font-medium">Severity</th>
                  <th className="pb-2 pr-3 font-medium text-right">Count</th>
                  <th className="pb-2 pr-3 font-medium text-right">Avg R</th>
                  <th className="pb-2 font-medium text-right">Textbook Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {data.newsImpact.map((n) => (
                  <tr key={n.severity} className="hover:bg-gray-800/40">
                    <td className={`py-2 pr-3 font-medium ${n.severity === 'Red' ? 'text-rose-400' : n.severity === 'Orange' ? 'text-orange-400' : 'text-yellow-400'}`}>{n.severity}</td>
                    <td className="py-2 pr-3 text-right text-gray-500">{n.count}</td>
                    <td className="py-2 pr-3 text-right text-gray-300">{n.avgR != null ? n.avgR.toFixed(2) : '—'}</td>
                    <td className="py-2 text-right text-gray-300">{n.textbookRate != null ? `${n.textbookRate}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Patterns Section ──────────────────────────────────────────────────────────
const ALL_PANELS = ['rules', 'sequences', 'narrative', 'macros', 'correlations'];
const THRESHOLDS = { rules: 20, sequences: 30, narrative: 40, macros: 50, correlations: 15 };
const THRESHOLD_NOTES = {
  rules:        'Useful with 20+ entries',
  sequences:    'Useful with 30+ entries',
  narrative:    'Useful with 40+ entries',
  macros:       'Useful with 50+ entries',
  correlations: 'Useful with 15+ entries',
};
const PANEL_TITLES = {
  rules:        'Panel 1 — Rule Performance',
  sequences:    'Panel 2 — Session Sequences',
  narrative:    'Panel 3 — Narrative Signals (Exploratory)',
  macros:       'Panel 4 — Macro Behavior',
  correlations: 'Panel 5 — Correlations',
};
const PANEL_COMPONENTS = { rules: RulesPanel, sequences: SequencesPanel, narrative: NarrativePanel, macros: MacrosPanel, correlations: CorrelationsPanel };

function PatternsSection({ topics, topicsLoading, topicsError, topicId, setTopicId }) {
  const initState = Object.fromEntries(ALL_PANELS.map(p => [p, null]));
  const [panels, setPanels]         = useState(initState);
  const [panelErrors, setPanelErrors] = useState(initState);
  const [loading, setLoading]       = useState(Object.fromEntries(ALL_PANELS.map(p => [p, false])));
  const [progress, setProgress]     = useState(null);

  const analyze = useCallback(async (panel, refresh = true) => {
    if (!topicId) return;
    setLoading(prev => ({ ...prev, [panel]: true }));
    try {
      const { data } = await api.get(`/analytics/patterns/${panel}?topicId=${topicId}${refresh ? '&refresh=true' : ''}`);
      setPanels(prev => ({ ...prev, [panel]: data }));
      setPanelErrors(prev => ({ ...prev, [panel]: null }));
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Pattern request failed';
      setPanelErrors(prev => ({ ...prev, [panel]: msg }));
    } finally {
      setLoading(prev => ({ ...prev, [panel]: false }));
    }
  }, [topicId]);

  useEffect(() => {
    if (!topicId) return;
    ALL_PANELS.forEach(panel => analyze(panel, false));
  }, [topicId, analyze]);

  async function analyzeAll() {
    const labels = { rules: 'rule patterns', sequences: 'sequences', narrative: 'narrative signals', macros: 'macro behavior', correlations: 'correlations' };
    for (const p of ALL_PANELS) {
      setProgress(`Analyzing ${labels[p]}...`);
      setLoading(prev => ({ ...prev, [p]: true }));
      try {
        const { data } = await api.get(`/analytics/patterns/${p}?topicId=${topicId}&refresh=true`);
        setPanels(prev => ({ ...prev, [p]: data }));
        setPanelErrors(prev => ({ ...prev, [p]: null }));
      } catch (err) {
        console.error(p, err);
      } finally {
        setLoading(prev => ({ ...prev, [p]: false }));
      }
    }
    setProgress(null);
  }

  return (
    <div className="space-y-6">
      {topicsLoading && <div className="flex items-center justify-center py-10 text-gray-500 text-sm">Loading topics...</div>}
      {!topicsLoading && topicsError && <div className="flex items-center justify-center py-10 text-gray-500 text-sm">{topicsError}</div>}
      {!topicsLoading && !topicsError && topics.length === 0 && (
        <div className="flex items-center justify-center py-10 text-gray-500 text-sm">
          No study topics yet. Create a topic and add setups to unlock pattern analytics.
        </div>
      )}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={topicId} onChange={e => setTopicId(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">Select topic...</option>
          {topics.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
        </select>
        <button onClick={analyzeAll} disabled={!topicId || Object.values(loading).some(Boolean)}
          className="text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          Analyze All
        </button>
        {progress && <span className="text-xs text-gray-500 animate-pulse">{progress}</span>}
      </div>
      {topicId && <p className="text-xs text-gray-600">Thresholds: correlations 15+ · rules 20+ · sequences 30+ · narrative 40+ · macros 50+</p>}
      {ALL_PANELS.map(panel => {
        const Inner = PANEL_COMPONENTS[panel];
        return (
          <PatternPanel key={panel} title={PANEL_TITLES[panel]} topicId={topicId}
            threshold={THRESHOLDS[panel]} thresholdNote={THRESHOLD_NOTES[panel]}
            data={panels[panel]} loading={loading[panel]}
            errorMessage={panelErrors[panel]}
            onAnalyze={() => analyze(panel, true)}>
            {panels[panel] && !panels[panel].insufficientData && <Inner data={panels[panel]} />}
          </PatternPanel>
        );
      })}
    </div>
  );
}

// ── Trend Section ─────────────────────────────────────────────────────────────
function TrendSection({ topics, topicsLoading, topicId, setTopicId }) {
  const [trendData, setTrendData] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [tooltip, setTooltip]     = useState(null);

  useEffect(() => {
    if (!topicId) return;
    setLoading(true);
    setError(null);
    api.get(`/study/analytics/trend?topicId=${topicId}`)
      .then(({ data }) => setTrendData(data))
      .catch(err => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  }, [topicId]);

  const outcomeColor = (outcome) => {
    if (outcome === 'Textbook') return 'bg-emerald-500';
    if (outcome === 'Partial')  return 'bg-amber-500';
    if (outcome === 'Failed')   return 'bg-rose-500';
    return 'bg-gray-600';
  };

  const delta = trendData?.periodComparison?.delta;

  function DeltaStat({ label, value, unit = '' }) {
    const isPos = value > 0;
    const isNeg = value < 0;
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className={`text-xl font-bold ${isPos ? 'text-emerald-400' : isNeg ? 'text-rose-400' : 'text-gray-400'}`}>
          {value != null ? `${value > 0 ? '+' : ''}${value}${unit}` : '—'}
          {isPos ? ' ↑' : isNeg ? ' ↓' : ''}
        </p>
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
          <span>{trendData.periodComparison.early[label === 'Avg R' ? 'avgR' : label === 'Textbook Rate' ? 'textbookRate' : 'completionRate'] ?? '—'}{unit}</span>
          <span>→</span>
          <span>{trendData.periodComparison.recent[label === 'Avg R' ? 'avgR' : label === 'Textbook Rate' ? 'textbookRate' : 'completionRate'] ?? '—'}{unit}</span>
        </div>
      </div>
    );
  }

  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const reversedEntries = trendData?.entries ? [...trendData.entries].reverse() : [];
  const pageEntries = reversedEntries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const maxR = trendData?.entries?.length ? Math.max(...trendData.entries.map(e => Math.abs(e.rMultiple || 0)), 1) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <select value={topicId} onChange={e => { setTopicId(e.target.value); setPage(0); }}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">Select topic...</option>
          {topics.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
        </select>
      </div>

      {loading && <div className="flex items-center justify-center py-20 text-gray-500 text-sm animate-pulse">Loading trend data...</div>}
      {error && <div className="flex items-center justify-center py-20 text-gray-500 text-sm">{error}</div>}
      {!loading && !error && !topicId && (
        <div className="flex items-center justify-center py-20 text-gray-500 text-sm">Select a topic to view performance trend.</div>
      )}
      {!loading && !error && trendData?.insufficientData && (
        <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
          Not enough data — add at least 5 setups to this topic to see trend analysis.
        </div>
      )}

      {!loading && !error && trendData && !trendData.insufficientData && (
        <>
          <div>
            <SectionHeading>Performance Trajectory — first third vs recent third ({trendData.periodComparison.early.count} entries each)</SectionHeading>
            <div className="grid grid-cols-3 gap-4">
              <DeltaStat label="Avg R" value={delta?.avgR} />
              <DeltaStat label="Textbook Rate" value={delta?.textbookRate} unit="%" />
              <DeltaStat label="Completion Rate" value={delta?.completionRate} unit="%" />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <SectionHeading>Rolling Performance Chart (window: {trendData.windowSize} sessions)</SectionHeading>
            <div className="flex gap-0.5 items-end h-24 relative" onMouseLeave={() => setTooltip(null)}>
              {trendData.entries.map((e, i) => {
                const r = e.rMultiple;
                const height = r != null ? Math.max(4, (Math.abs(r) / maxR) * 80) : 4;
                const isNeg = r != null && r < 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center group relative cursor-pointer"
                    onMouseEnter={() => setTooltip({ i, e })}>
                    <div className={`w-full rounded-t ${outcomeColor(e.outcome)} ${isNeg ? 'opacity-40' : 'opacity-80'} group-hover:opacity-100 transition-opacity`}
                      style={{ height: `${height}px` }} />
                    {tooltip?.i === i && (
                      <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-gray-700 text-xs text-white px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none shadow-lg">
                        <p>{e.date ? new Date(e.date).toLocaleDateString() : `Entry ${i+1}`}</p>
                        <p>R: {r != null ? r.toFixed(2) : '—'} · C{e.clarityScore || '?'}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>Entry 1</span>
              <span>Entry {trendData.totalEntries}</span>
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-600">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-sm inline-block"></span>Textbook</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-500 rounded-sm inline-block"></span>Partial</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-rose-500 rounded-sm inline-block"></span>Failed</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-gray-600 rounded-sm inline-block"></span>Pending</span>
              <span className="ml-2">Bar height = |R|</span>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <SectionHeading>Entry Log (most recent first)</SectionHeading>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-gray-600 border-b border-gray-800">
                    <th className="pb-2 pr-3 font-medium">Date</th>
                    <th className="pb-2 pr-3 font-medium">Direction</th>
                    <th className="pb-2 pr-3 font-medium">Outcome</th>
                    <th className="pb-2 pr-3 font-medium text-right">R</th>
                    <th className="pb-2 pr-3 font-medium text-right">Clarity</th>
                    <th className="pb-2 font-medium text-right">Completion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {pageEntries.map((e, i) => (
                    <tr key={i} className="hover:bg-gray-800/40">
                      <td className="py-2 pr-3 text-gray-400">{e.date ? new Date(e.date).toLocaleDateString() : '—'}</td>
                      <td className="py-2 pr-3 text-gray-400">{e.direction || '—'}</td>
                      <td className={`py-2 pr-3 font-medium ${e.outcome === 'Textbook' ? 'text-emerald-400' : e.outcome === 'Partial' ? 'text-amber-400' : e.outcome === 'Failed' ? 'text-rose-400' : 'text-gray-500'}`}>
                        {e.outcome || '—'}
                      </td>
                      <td className="py-2 pr-3 text-right text-gray-300">{e.rMultiple != null ? e.rMultiple.toFixed(2) : '—'}</td>
                      <td className="py-2 pr-3 text-right text-gray-400">{e.clarityScore ? `C${e.clarityScore}` : '—'}</td>
                      <td className="py-2 text-right text-gray-400">{e.completionRate != null ? `${e.completionRate}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {reversedEntries.length > PAGE_SIZE && (
              <div className="flex items-center justify-between mt-3">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  className="text-xs text-gray-400 hover:text-gray-200 disabled:opacity-30">← Newer</button>
                <span className="text-xs text-gray-600">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, reversedEntries.length)} of {reversedEntries.length}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= reversedEntries.length}
                  className="text-xs text-gray-400 hover:text-gray-200 disabled:opacity-30">Older →</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StudyAnalyticsPage() {
  const [activeTab, setActiveTab]     = useState('overview');
  const [data, setData]               = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError]     = useState(null);

  // Shared topic state across patterns + trend tabs
  const [topics, setTopics]           = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [topicsError, setTopicsError] = useState(null);
  const [topicId, setTopicId]         = useState('');

  useEffect(() => {
    api.get('/study/analytics/global')
      .then(({ data }) => setData(data))
      .catch(err => setOverviewError(err.response?.data?.error || err.message))
      .finally(() => setOverviewLoading(false));

    api.get('/study/topics')
      .then(({ data }) => {
        const list = data.topics || [];
        setTopics(list);
        setTopicId(list[0]?._id || '');
      })
      .catch(() => setTopicsError('Unable to load topics right now.'))
      .finally(() => setTopicsLoading(false));
  }, []);

  const friendlyOverviewNoData = isLikelyNoDataError(overviewError);
  const maxComboCount = data?.topCombos?.[0]?.appearances || 1;
  const maxHour = Math.max(...(data?.timeHeatmap?.map(h => h.count) || [1]));
  const maxDowCount = Math.max(...(data?.dayOfWeekMatrix?.map(d => d.count) || [1]));

  return (
    <div className="max-w-5xl mx-auto pb-16">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Study Analytics</h1>
        {data && !data.empty && <p className="text-sm text-gray-500 mt-1">Cross-topic performance — {data.total} total setups</p>}
      </div>

      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-6 w-fit">
        {['overview', 'patterns', 'trend'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${activeTab === tab ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'patterns' && (
        <PatternsSection topics={topics} topicsLoading={topicsLoading} topicsError={topicsError} topicId={topicId} setTopicId={setTopicId} />
      )}

      {activeTab === 'trend' && (
        <TrendSection topics={topics} topicsLoading={topicsLoading} topicId={topicId} setTopicId={setTopicId} />
      )}

      {activeTab === 'overview' && (
        <>
          {overviewLoading ? (
            <div className="flex items-center justify-center py-20 text-gray-500 text-sm">Loading overview analytics...</div>
          ) : overviewError ? (
            friendlyOverviewNoData ? (
              <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
                Not enough study data yet for overview analytics. Add a few setups across topics and refresh.
              </div>
            ) : (
              <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
                Overview analytics is temporarily unavailable. Please try again in a moment.
              </div>
            )
          ) : (!data || data.empty) ? (
            <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
              No study data yet — add setups in Study Companion to see analytics.
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatBlock label="Total Setups" value={data.total} />
                {data.avgCompletionRate != null && (
                  <StatBlock label="Avg Rule Completion" value={`${data.avgCompletionRate}%`} sub="rules fired per session" />
                )}
                {data.biasAccuracy?.Bullish && (
                  <StatBlock label="Bullish Bias Accuracy"
                    value={data.biasAccuracy.Bullish.textbookRate != null ? `${data.biasAccuracy.Bullish.textbookRate}%` : '—'}
                    sub={`${data.biasAccuracy.Bullish.total} setups`} />
                )}
                {data.biasAccuracy?.Bearish && (
                  <StatBlock label="Bearish Bias Accuracy"
                    value={data.biasAccuracy.Bearish.textbookRate != null ? `${data.biasAccuracy.Bearish.textbookRate}%` : '—'}
                    sub={`${data.biasAccuracy.Bearish.total} setups`} />
                )}
                {data.sessionMatrix?.[0] && (
                  <StatBlock label="Best Session" value={data.sessionMatrix[0].session} sub={`${data.sessionMatrix[0].textbookRate}% textbook`} />
                )}
              </div>

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

              {data.topCombos?.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <SectionHeading>Top Confluence Combinations</SectionHeading>
                  <div className="space-y-2">
                    {data.topCombos.map(c => (
                      <div key={c.combo} className="flex items-center gap-3">
                        <span className="text-sm text-gray-300 w-64 shrink-0 truncate" title={c.combo}>{c.combo}</span>
                        <div className="flex-1 bg-gray-800 rounded-full h-2">
                          <div className="h-2 rounded-full bg-indigo-500 transition-all" style={{ width: `${(c.appearances / maxComboCount) * 100}%` }} />
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

              {data.sessionMatrix?.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <SectionHeading>Session Performance</SectionHeading>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {data.sessionMatrix.map(s => (
                      <div key={s.session} className="bg-gray-800 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500 mb-1">{s.session}</p>
                        <p className="text-lg font-bold text-gray-100">{s.textbookRate}%</p>
                        <p className="text-xs text-gray-500">{s.count} setups{s.avgMaxRun != null ? ` · ${s.avgMaxRun} pts avg` : ''}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.timeHeatmap && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <SectionHeading>Trade Time Heatmap (by hour)</SectionHeading>
                  <div className="flex gap-0.5 items-end h-20">
                    {data.timeHeatmap.map(h => (
                      <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div className="w-full rounded-t transition-all"
                          style={{
                            height: maxHour > 0 ? `${Math.max(4, (h.count / maxHour) * 64)}px` : '4px',
                            backgroundColor: h.count > 0 ? `rgba(99,102,241,${0.3 + (h.textbookRate / 100) * 0.7})` : 'rgb(31,41,55)',
                          }}
                          title={`${h.hour}:00 — ${h.count} setups, ${h.textbookRate}% textbook`}
                        />
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
          )}
        </>
      )}
    </div>
  );
}
