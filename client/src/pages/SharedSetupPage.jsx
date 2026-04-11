import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || '/api';

export default function SharedSetupPage() {
  const { token } = useParams();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    axios.get(`${API}/study/share/${token}`)
      .then(res => { setData(res.data); setLoading(false); })
      .catch(err => {
        setError(err.response?.data?.error || 'Not found');
        setLoading(false);
      });
  }, [token]);

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-400 text-sm animate-pulse">Loading shared setup…</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
      <p className="text-rose-400 text-sm">{error}</p>
      <Link to="/" className="text-indigo-400 hover:underline text-sm">Go to TradeJournal</Link>
    </div>
  );

  const { setup, topic } = data;
  const opps = setup.opportunities?.length
    ? setup.opportunities
    : [{ bias: setup.bias, timeOfTrade: setup.timeOfTrade, outcome: setup.outcome }];
  const first = opps[0] || {};

  const clarityLabel = { 1: 'Choppy', 2: 'Readable', 3: 'Textbook' }[setup.clarityScore];
  const clarityColor = { 1: 'bg-gray-700 text-gray-300', 2: 'bg-amber-800 text-amber-200', 3: 'bg-emerald-800 text-emerald-200' }[setup.clarityScore] || '';

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Shared Study Setup</p>
          <h1 className="text-xl font-bold text-white">{setup.title || 'Untitled Setup'}</h1>
          {topic && (
            <p className="text-sm text-gray-400 mt-1">
              Topic: <span className="text-gray-200">{topic.name}</span>
            </p>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            {first.outcome && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300">{first.outcome}</span>}
            {first.bias   && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300">{first.bias}</span>}
            {setup.session && <span className="text-xs text-gray-500">{setup.session}</span>}
            {setup.clarityScore != null && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${clarityColor}`}>
                Clarity: {clarityLabel} ({setup.clarityScore})
              </span>
            )}
            {setup.completionRate != null && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
                {setup.completionRate}% rules fired
              </span>
            )}
          </div>
        </div>

        {/* Chart images */}
        {(setup.chartImages?.length > 0 || setup.chartImageUrl) && (
          <div className="space-y-2">
            {(setup.chartImages?.length > 0 ? setup.chartImages : [{ url: setup.chartImageUrl, caption: '' }]).map((img, i) => (
              <div key={i}>
                <img src={img.url} alt={img.caption || 'chart'} className="w-full rounded-xl border border-gray-800 object-contain max-h-96" />
                {img.caption && <p className="text-xs text-gray-500 mt-1">{img.caption}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Rules */}
        {setup.setupRules?.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Rules</p>
            <ol className="space-y-2">
              {setup.setupRules.map((r, i) => {
                const rObj = typeof r === 'string' ? { text: r } : r;
                if (!rObj.text) return null;
                return (
                  <li key={i} className="flex gap-2 items-start">
                    <span className={`shrink-0 mt-0.5 text-sm ${rObj.isMasterRule ? (rObj.checked ? 'text-emerald-400' : 'text-gray-600') : 'text-gray-500'}`}>
                      {rObj.isMasterRule ? (rObj.checked ? '✓' : '○') : `${i + 1}.`}
                    </span>
                    <div>
                      <p className={`text-sm ${rObj.isMasterRule && rObj.checked ? 'text-emerald-300' : rObj.isMasterRule && !rObj.checked ? 'text-gray-500' : 'text-gray-300'}`}>
                        {rObj.text}
                      </p>
                      {/* Branch outcomes */}
                      {rObj.branchType && rObj.branchType !== 'none' && rObj.branches?.length > 0 && (
                        <div className="mt-1 space-y-1">
                          {rObj.branches.map((b, bi) => (
                            <p key={bi} className={`text-xs ${b.fired ? 'text-emerald-400' : 'text-gray-600'}`}>
                              {b.fired ? '✓' : '○'} {b.label || `Branch ${String.fromCharCode(65 + bi)}`}
                              {b.fired && b.timestamp ? ` @ ${b.timestamp}` : ''}
                              {b.note ? ` — ${b.note}` : ''}
                            </p>
                          ))}
                          {rObj.neitherFired && <p className="text-xs text-amber-500">Neither branch fired</p>}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {/* Narrative */}
        {setup.narrative && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Narrative</p>
            <p className="text-sm text-gray-300 leading-relaxed">{setup.narrative}</p>
          </div>
        )}

        {/* Notes */}
        {setup.notes && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</p>
            <p className="text-sm text-gray-300 leading-relaxed">{setup.notes}</p>
          </div>
        )}

        <div className="text-center pt-4">
          <Link to="/login" className="text-indigo-400 hover:underline text-xs">Sign in to TradeJournal to keep your own setups</Link>
        </div>
      </div>
    </div>
  );
}
