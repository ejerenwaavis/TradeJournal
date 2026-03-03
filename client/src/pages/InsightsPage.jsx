import { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

export default function InsightsPage() {
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchLatest = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/insights/latest');
      setInsight(data.insight);
    } catch {
      toast.error('Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLatest(); }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data } = await api.post('/insights/generate');
      setInsight(data.insight);
      toast.success('Insights generated!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">AI Insights</h1>
          <p className="text-sm text-gray-500 mt-0.5">GPT-4o analyzes your last 30 days of trades</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {generating ? 'Generating…' : '✨ Generate Insights'}
        </button>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading…</p>}

      {!loading && !insight && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-500 text-sm">No insights yet. Click "Generate Insights" to analyze your trades.</p>
          <p className="text-gray-600 text-xs mt-2">You need at least some trades logged in the past 30 days.</p>
        </div>
      )}

      {insight && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-800">
            <div>
              <p className="text-xs text-gray-500">{insight.periodLabel}</p>
              <p className="text-xs text-gray-600 mt-0.5">
                Based on {insight.tradeCount} trade{insight.tradeCount !== 1 ? 's' : ''} ·{' '}
                Generated {new Date(insight.generatedAt).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="prose prose-invert prose-sm max-w-none text-gray-300 leading-relaxed">
            <ReactMarkdown
              components={{
                h2: ({ children }) => <h2 className="text-base font-semibold text-indigo-300 mt-5 mb-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold text-gray-200 mt-3 mb-1">{children}</h3>,
                p: ({ children }) => <p className="text-sm text-gray-300 mb-2">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 text-sm text-gray-300">{children}</ul>,
                li: ({ children }) => <li>{children}</li>,
                strong: ({ children }) => <strong className="text-gray-100 font-semibold">{children}</strong>,
              }}
            >
              {insight.content}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
