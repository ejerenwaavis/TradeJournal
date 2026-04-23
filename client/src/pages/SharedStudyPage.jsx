import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';

export default function SharedStudyPage() {
  const { shareToken } = useParams();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    api.get(`/study/${shareToken}`)
      .then(({ data }) => setData(data))
      .catch((err) => setError(err.response?.data?.error || 'Study not found or no longer public'))
      .finally(() => setLoading(false));
  }, [shareToken]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400 text-sm">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 text-center px-4">
        <p className="text-rose-400 text-sm">{error}</p>
        <Link to="/" className="text-indigo-400 hover:underline text-xs">← Back to home</Link>
      </div>
    );
  }

  const { name, description, color, masterRules, entryCount, dateRange } = data;
  const rules = (masterRules || []).filter(r => typeof r === 'string' ? r : r?.text);

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header bar */}
      <div className="border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color || '#6366f1' }} />
          <span className="text-sm font-semibold text-gray-300">{name}</span>
          <span className="text-xs bg-emerald-900 text-emerald-300 px-2 py-0.5 rounded-full">Public Study</span>
        </div>
        <Link to="/login" className="text-xs text-indigo-400 hover:underline">Sign in to TradeJournal →</Link>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Topic header */}
        <div>
          <h1 className="text-2xl font-bold">{name}</h1>
          {description && <p className="text-sm text-gray-400 mt-1">{description}</p>}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Total Entries</p>
            <p className="text-2xl font-bold">{entryCount}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">First Entry</p>
            <p className="text-sm font-semibold">{fmtDate(dateRange?.from)}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Latest Entry</p>
            <p className="text-sm font-semibold">{fmtDate(dateRange?.to)}</p>
          </div>
        </div>

        {/* Master rules */}
        {rules.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Master Rules <span className="text-gray-600 font-normal normal-case">({rules.length})</span>
            </p>
            <ol className="space-y-2.5">
              {rules.map((r, i) => {
                const text = typeof r === 'string' ? r : r.text;
                const subs = typeof r === 'string' ? [] : (r.subs || []).filter(Boolean);
                return (
                  <li key={i}>
                    <div className="flex gap-2 text-sm text-gray-200">
                      <span className="text-gray-600 shrink-0 select-none">{i + 1}.</span>
                      <span>{text}</span>
                    </div>
                    {subs.map((s, j) => (
                      <div key={j} className="flex gap-1.5 ml-5 mt-0.5">
                        <span className="text-xs text-indigo-500 shrink-0 select-none font-medium">{String.fromCharCode(97 + j)}.</span>
                        <span className="text-xs text-gray-500 leading-relaxed">{typeof s === 'string' ? s : s.text}</span>
                      </div>
                    ))}
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {/* API access notice */}
        <div className="bg-indigo-950 border border-indigo-800 rounded-xl p-4">
          <p className="text-sm font-semibold text-indigo-300 mb-1">Full entry data available via API key</p>
          <p className="text-xs text-indigo-400">
            The owner of this study can share an API key that grants access to all {entryCount} entries including
            rule outcomes, narratives, and metrics.
          </p>
          <p className="text-xs text-indigo-500 mt-2 font-mono break-all">
            GET {window.location.origin}/api/study/{shareToken}/entries?apiKey=YOUR_KEY
          </p>
        </div>

        <p className="text-xs text-gray-700 text-center pt-2">
          Powered by{' '}
          <Link to="/" className="text-indigo-500 hover:underline">TradeJournal</Link>
        </p>
      </div>
    </div>
  );
}
