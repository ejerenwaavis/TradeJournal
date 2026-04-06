import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { ICT_TAGS } from '../utils/ictTags';
import { PlusIcon, TrashIcon, PencilIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

// ── constants ────────────────────────────────────────────────────────────────
const SESSIONS = ['Asia', 'London', 'New York', 'London-NY Overlap'];
const OUTCOMES  = ['Textbook', 'Partial', 'Failed', 'Pending'];
const BIASES    = ['Bullish', 'Bearish', 'Neutral'];
const COLORS = ['#6366f1','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#10b981','#ef4444','#3b82f6','#f97316'];

const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500';
const selectCls = `${inputCls} cursor-pointer`;

// ── small helpers ─────────────────────────────────────────────────────────────
function Chip({ label, active, onClick }) {
  return (
    <button
      type="button" onClick={onClick}
      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
        active ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-indigo-500'
      }`}
    >{label}</button>
  );
}

function SectionHeading({ children }) {
  return <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{children}</p>;
}

function StatBlock({ label, value, sub }) {
  return (
    <div className="bg-gray-800 rounded-lg p-3 text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-100">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TopicAnalytics
// ════════════════════════════════════════════════════════════════════════════
function TopicAnalytics({ topicId }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!topicId || !open) return;
    api.get(`/study/analytics/${topicId}`)
      .then(({ data }) => setData(data))
      .catch(() => {});
  }, [topicId, open]);

  if (!topicId) return null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-gray-300 hover:bg-gray-800 transition-colors"
      >
        <span>Topic Analytics</span>
        {open ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
      </button>

      {open && (
        <div className="p-5 space-y-5 border-t border-gray-800">
          {!data ? (
            <p className="text-sm text-gray-500 text-center py-4">Loading…</p>
          ) : data.empty ? (
            <p className="text-sm text-gray-500 text-center py-4">No setups yet — add some to see analytics.</p>
          ) : (
            <>
              {/* Key stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatBlock label="Total setups" value={data.total} />
                <StatBlock label="Avg max run" value={data.avgMaxRun != null ? `${data.avgMaxRun} pts` : '—'} />
                <StatBlock label="Bullish accuracy" value={data.biasWinRate?.Bullish != null ? `${data.biasWinRate.Bullish}%` : '—'} />
                <StatBlock label="Bearish accuracy" value={data.biasWinRate?.Bearish != null ? `${data.biasWinRate.Bearish}%` : '—'} />
              </div>

              {/* Outcome breakdown */}
              <div>
                <SectionHeading>Outcome Breakdown</SectionHeading>
                <div className="flex gap-3 flex-wrap">
                  {Object.entries(data.outcomeBreakdown || {}).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-1.5">
                      <span className={`w-2 h-2 rounded-full ${k === 'Textbook' ? 'bg-emerald-500' : k === 'Partial' ? 'bg-yellow-500' : k === 'Failed' ? 'bg-rose-500' : 'bg-gray-500'}`} />
                      <span className="text-xs text-gray-300">{k}: <span className="font-semibold">{v}</span></span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Confluence hit rate */}
              {data.confluenceHitRate && Object.keys(data.confluenceHitRate).length > 0 && (
                <div>
                  <SectionHeading>Confluence Hit Rate</SectionHeading>
                  <div className="space-y-1.5">
                    {Object.entries(data.confluenceHitRate).slice(0, 8).map(([c, { count, pct }]) => (
                      <div key={c} className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 w-40 shrink-0 truncate">{c}</span>
                        <div className="flex-1 bg-gray-800 rounded-full h-2">
                          <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 w-12 text-right">{pct}% ({count})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Best session */}
              {data.bestSession?.length > 0 && (
                <div>
                  <SectionHeading>Best Session</SectionHeading>
                  <div className="flex gap-2 flex-wrap">
                    {data.bestSession.map(({ session, count }) => (
                      <span key={session} className="text-xs bg-gray-800 border border-gray-700 rounded-full px-3 py-1 text-gray-300">
                        {session} · <span className="font-semibold">{count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Most common times */}
              {data.mostCommonTime?.length > 0 && (
                <div>
                  <SectionHeading>Most Common Trade Time</SectionHeading>
                  <div className="flex gap-2">
                    {data.mostCommonTime.map(({ time, count }) => (
                      <span key={time} className="text-xs bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-300">
                        {time} · <span className="font-semibold">{count}×</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SetupForm (create / edit)
// ════════════════════════════════════════════════════════════════════════════
const BLANK_SETUP = {
  title: '', tvLink: '', chartImageUrl: '', setupRules: [''],
  confluences: [], bias: '', session: '', timeOfTrade: '',
  maxRun: '', outcome: '', narrative: '', notes: '',
};

function SetupForm({ topicId, initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ? {
    ...initial,
    setupRules: initial.setupRules?.length ? initial.setupRules : [''],
    maxRun: initial.maxRun ?? '',
  } : { ...BLANK_SETUP });
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const fileRef = useRef();

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const toggleConfluence = (c) => setForm((f) => ({
    ...f,
    confluences: f.confluences.includes(c)
      ? f.confluences.filter((x) => x !== c)
      : [...f.confluences, c],
  }));

  const addRule   = () => setForm((f) => ({ ...f, setupRules: [...f.setupRules, ''] }));
  const setRule   = (i, v) => setForm((f) => { const r = [...f.setupRules]; r[i] = v; return { ...f, setupRules: r }; });
  const removeRule = (i) => setForm((f) => ({ ...f, setupRules: f.setupRules.filter((_, idx) => idx !== i) }));

  const analyzeLink = async () => {
    if (!form.tvLink.trim()) { toast.error('Paste a TradingView link first'); return; }
    setAnalyzing(true);
    try {
      const { data } = await api.post('/charts/analyze', { tvLink: form.tvLink.trim() });
      setForm((f) => ({ ...f, chartImageUrl: data.imageUrl || f.chartImageUrl }));
      toast.success('Chart loaded');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to analyze link');
    } finally { setAnalyzing(false); }
  };

  const analyzeUpload = async (file) => {
    setAnalyzing(true);
    try {
      const fd = new FormData(); fd.append('chart', file);
      const { data } = await api.post('/charts/analyze-upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm((f) => ({ ...f, chartImageUrl: data.imageUrl || f.chartImageUrl }));
      toast.success('Chart uploaded');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally { setAnalyzing(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        topicId,
        setupRules: form.setupRules.filter(Boolean),
        maxRun: form.maxRun !== '' ? Number(form.maxRun) : undefined,
      };
      let result;
      if (initial?._id) {
        result = await api.put(`/study/setups/${initial._id}`, payload);
      } else {
        result = await api.post('/study/setups', payload);
      }
      onSave(result.data.setup);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-gray-900 border border-indigo-800 rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-indigo-300">{initial ? 'Edit Setup' : 'New Setup'}</p>
        <button onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-300">Cancel</button>
      </div>

      {/* Title */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Title</label>
        <input type="text" value={form.title} onChange={set('title')} placeholder="e.g. FVG into OB — London session" className={inputCls} />
      </div>

      {/* Chart */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-400">Chart Image</label>
        <div className="flex gap-2">
          <input type="url" placeholder="https://www.tradingview.com/x/…" value={form.tvLink} onChange={set('tvLink')} onKeyDown={(e) => e.key === 'Enter' && analyzeLink()} className={`${inputCls} flex-1`} />
          <button onClick={analyzeLink} disabled={analyzing} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap">
            {analyzing ? 'Loading…' : 'Load'}
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>or</span>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={analyzing} className="text-indigo-400 hover:underline">upload screenshot</button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files[0]) analyzeUpload(e.target.files[0]); }} />
        </div>
        {form.chartImageUrl && (
          <img src={form.chartImageUrl} alt="chart" className="rounded-lg max-h-52 object-contain border border-gray-700 w-full" />
        )}
      </div>

      {/* Setup Rules */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-2">Setup Rules / Entry Conditions</label>
        <div className="space-y-2">
          {form.setupRules.map((rule, i) => (
            <div key={i} className="flex gap-2 items-center">
              <span className="text-xs text-gray-600 w-5 text-right">{i + 1}.</span>
              <input type="text" value={rule} onChange={(e) => setRule(i, e.target.value)} placeholder="Rule…" className={`${inputCls} flex-1`} />
              {form.setupRules.length > 1 && (
                <button onClick={() => removeRule(i)} className="text-rose-500 hover:text-rose-400 shrink-0"><TrashIcon className="w-4 h-4" /></button>
              )}
            </div>
          ))}
          <button onClick={addRule} className="text-xs text-indigo-400 hover:underline">+ Add rule</button>
        </div>
      </div>

      {/* Confluences */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-2">Confluences</label>
        <div className="flex flex-wrap gap-1.5">
          {ICT_TAGS.map((tag) => (
            <Chip key={tag} label={tag} active={form.confluences.includes(tag)} onClick={() => toggleConfluence(tag)} />
          ))}
        </div>
      </div>

      {/* Bias + Session + Time + Max Run + Outcome */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Bias</label>
          <select value={form.bias} onChange={set('bias')} className={selectCls}>
            <option value="">—</option>
            {BIASES.map((b) => <option key={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Session</label>
          <select value={form.session} onChange={set('session')} className={selectCls}>
            <option value="">—</option>
            {SESSIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Time of Trade</label>
          <input type="time" value={form.timeOfTrade} onChange={set('timeOfTrade')} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Max Run (pts)</label>
          <input type="number" step="any" value={form.maxRun} onChange={set('maxRun')} className={inputCls} />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-400 mb-1">Outcome</label>
          <div className="flex gap-2 flex-wrap">
            {OUTCOMES.map((o) => (
              <Chip key={o} label={o} active={form.outcome === o} onClick={() => setForm((f) => ({ ...f, outcome: f.outcome === o ? '' : o }))} />
            ))}
          </div>
        </div>
      </div>

      {/* Narrative + Notes */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Narrative</label>
        <textarea rows={3} value={form.narrative} onChange={set('narrative')} placeholder="What is the story behind this setup?" className={`${inputCls} resize-none`} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Notes</label>
        <textarea rows={2} value={form.notes} onChange={set('notes')} placeholder="Additional notes…" className={`${inputCls} resize-none`} />
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg">
          {saving ? 'Saving…' : initial ? 'Save Changes' : 'Add Setup'}
        </button>
        <button onClick={onCancel} className="text-sm text-gray-400 hover:text-gray-200 px-3 py-2">Cancel</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SetupCard
// ════════════════════════════════════════════════════════════════════════════
function SetupCard({ setup, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  const outcomeColor = {
    Textbook: 'bg-emerald-900 text-emerald-300',
    Partial:  'bg-yellow-900 text-yellow-300',
    Failed:   'bg-rose-900 text-rose-300',
    Pending:  'bg-gray-800 text-gray-400',
  }[setup.outcome] || 'bg-gray-800 text-gray-500';

  const biasColor = { Bullish: 'text-emerald-400', Bearish: 'text-rose-400', Neutral: 'text-yellow-400' }[setup.bias] || 'text-gray-400';

  return (
    <>
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(false)}>
          <img src={setup.chartImageUrl} alt="chart" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors">
        <div className="flex gap-3 p-4">
          {/* Chart thumbnail */}
          {setup.chartImageUrl ? (
            <div className="shrink-0 w-28 h-20 rounded-lg overflow-hidden cursor-zoom-in border border-gray-800 bg-gray-800" onClick={() => setLightbox(true)}>
              <img src={setup.chartImageUrl} alt="chart" className="w-full h-full object-cover" />
            </div>
          ) : setup.tvLink ? (
            <a href={setup.tvLink} target="_blank" rel="noreferrer"
              className="shrink-0 w-28 h-20 rounded-lg border border-gray-700 bg-gray-800 flex items-center justify-center text-xs text-indigo-400 hover:underline">
              View chart ↗
            </a>
          ) : (
            <div className="shrink-0 w-28 h-20 rounded-lg border border-gray-700 bg-gray-800 flex items-center justify-center text-xs text-gray-600">No chart</div>
          )}

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {setup.title && <p className="text-sm font-semibold text-gray-100 truncate">{setup.title}</p>}
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {setup.outcome && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${outcomeColor}`}>{setup.outcome}</span>}
                  {setup.bias    && <span className={`text-xs font-medium ${biasColor}`}>{setup.bias}</span>}
                  {setup.session && <span className="text-xs text-gray-500">{setup.session}</span>}
                  {setup.timeOfTrade && <span className="text-xs text-gray-500">{setup.timeOfTrade}</span>}
                  {setup.maxRun != null && <span className="text-xs text-gray-500">Max: {setup.maxRun} pts</span>}
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => onEdit(setup)} className="text-gray-500 hover:text-indigo-400 transition-colors"><PencilIcon className="w-4 h-4" /></button>
                <button onClick={() => onDelete(setup._id)} className="text-gray-500 hover:text-rose-400 transition-colors"><TrashIcon className="w-4 h-4" /></button>
              </div>
            </div>

            {setup.confluences?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {setup.confluences.map((c) => (
                  <span key={c} className="text-xs bg-indigo-950 text-indigo-300 border border-indigo-900 px-2 py-0.5 rounded-full">{c}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Expandable details */}
        {(setup.setupRules?.filter(Boolean).length > 0 || setup.narrative || setup.notes) && (
          <div className="border-t border-gray-800">
            <button
              onClick={() => setExpanded(v => !v)}
              className="w-full flex items-center gap-1 px-4 py-2 text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
            >
              {expanded ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />}
              {expanded ? 'Hide details' : 'Show rules & narrative'}
            </button>
            {expanded && (
              <div className="px-4 pb-4 space-y-3">
                {setup.setupRules?.filter(Boolean).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Setup Rules</p>
                    <ol className="space-y-1">
                      {setup.setupRules.filter(Boolean).map((r, i) => (
                        <li key={i} className="flex gap-2 text-sm text-gray-300"><span className="text-gray-600 shrink-0">{i + 1}.</span>{r}</li>
                      ))}
                    </ol>
                  </div>
                )}
                {setup.narrative && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Narrative</p>
                    <p className="text-sm text-gray-300 leading-relaxed">{setup.narrative}</p>
                  </div>
                )}
                {setup.notes && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Notes</p>
                    <p className="text-sm text-gray-400 leading-relaxed">{setup.notes}</p>
                  </div>
                )}
                {setup.tvLink && (
                  <a href={setup.tvLink} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:underline">Open on TradingView ↗</a>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TopicModal (create / edit topic)
// ════════════════════════════════════════════════════════════════════════════
function TopicModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || { name: '', description: '', tags: '', color: '#6366f1' });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description,
        color: form.color,
        tags: typeof form.tags === 'string' ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : form.tags,
      };
      let result;
      if (initial?._id) {
        result = await api.put(`/study/topics/${initial._id}`, payload);
      } else {
        result = await api.post('/study/topics', payload);
      }
      onSave(result.data.topic);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-4">
        <p className="text-sm font-bold text-gray-100">{initial ? 'Edit Topic' : 'New Study Topic'}</p>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Name *</label>
          <input type="text" value={form.name} onChange={set('name')} className={inputCls} placeholder="e.g. FVG + BOS" autoFocus />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
          <input type="text" value={form.description} onChange={set('description')} className={inputCls} placeholder="Optional summary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Tags (comma-separated)</label>
          <input type="text" value={typeof form.tags === 'string' ? form.tags : form.tags?.join(', ')} onChange={set('tags')} className={inputCls} placeholder="e.g. ICT, FVG, Trend" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2">Color</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setForm((f) => ({ ...f, color: c }))}
                className={`w-6 h-6 rounded-full transition-transform ${form.color === c ? 'ring-2 ring-white scale-110' : ''}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-200 px-3 py-2">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Main StudyCompanionPage
// ════════════════════════════════════════════════════════════════════════════
export default function StudyCompanionPage() {
  const [topics, setTopics]     = useState([]);
  const [activeTopic, setActiveTopic] = useState(null);
  const [setups, setSetups]     = useState([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [loadingSetups, setLoadingSetups] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [editingTopic, setEditingTopic]   = useState(null);
  const [showSetupForm, setShowSetupForm] = useState(false);
  const [editingSetup, setEditingSetup]   = useState(null);

  // ── Load topics ───────────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/study/topics')
      .then(({ data }) => {
        const topicList = data.topics || [];
        setTopics(topicList);
        setActiveTopic((prev) => prev ?? (topicList[0] || null));
      })
      .catch(() => toast.error('Failed to load topics'))
      .finally(() => setLoadingTopics(false));
  }, []);

  // ── Load setups when active topic changes ─────────────────────────────────
  useEffect(() => {
    const id = activeTopic?._id;
    if (!id) return;
    setLoadingSetups(true);
    api.get(`/study/setups?topicId=${id}`)
      .then(({ data }) => setSetups(data.setups))
      .catch(() => toast.error('Failed to load setups'))
      .finally(() => setLoadingSetups(false));
  }, [activeTopic?._id]);

  const handleTopicSaved = (topic) => {
    setTopics((prev) => {
      const idx = prev.findIndex((t) => t._id === topic._id);
      if (idx !== -1) { const updated = [...prev]; updated[idx] = topic; return updated; }
      return [topic, ...prev];
    });
    setActiveTopic(topic);
    setShowTopicModal(false);
    setEditingTopic(null);
  };

  const handleDeleteTopic = async (topicId) => {
    if (!window.confirm('Delete this topic and ALL its setups permanently?')) return;
    try {
      await api.delete(`/study/topics/${topicId}`);
      const next = topics.filter((t) => t._id !== topicId);
      setTopics(next);
      if (activeTopic?._id === topicId) setActiveTopic(next[0] || null);
      toast.success('Topic deleted');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    }
  };

  const handleSetupSaved = (setup) => {
    setSetups((prev) => {
      const idx = prev.findIndex((s) => s._id === setup._id);
      if (idx !== -1) { const updated = [...prev]; updated[idx] = setup; return updated; }
      return [setup, ...prev];
    });
    // Bump setupCount on the topic
    setTopics((prev) => prev.map((t) => t._id === activeTopic?._id ? { ...t, setupCount: (t.setupCount || 0) + (editingSetup ? 0 : 1) } : t));
    setShowSetupForm(false);
    setEditingSetup(null);
    toast.success(editingSetup ? 'Setup updated' : 'Setup added');
  };

  const handleDeleteSetup = async (setupId) => {
    if (!window.confirm('Delete this setup?')) return;
    try {
      await api.delete(`/study/setups/${setupId}`);
      setSetups((prev) => prev.filter((s) => s._id !== setupId));
      setTopics((prev) => prev.map((t) => t._id === activeTopic?._id ? { ...t, setupCount: Math.max(0, (t.setupCount || 1) - 1) } : t));
      toast.success('Setup deleted');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    }
  };

  const openEditSetup = (setup) => {
    setEditingSetup(setup);
    setShowSetupForm(true);
  };

  return (
    <div className="-m-6 flex h-full">
      {/* ── Topic sidebar ── */}
      <aside className="w-52 shrink-0 border-r border-gray-800 flex flex-col bg-gray-900 overflow-y-auto">
        <div className="p-3 border-b border-gray-800">
          <button
            onClick={() => { setEditingTopic(null); setShowTopicModal(true); }}
            className="w-full flex items-center justify-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg font-medium transition-colors"
          >
            <PlusIcon className="w-3.5 h-3.5" /> New Topic
          </button>
        </div>

        {loadingTopics ? (
          <p className="text-xs text-gray-500 text-center py-6">Loading…</p>
        ) : topics.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-6 px-3">No topics yet.<br />Create your first topic.</p>
        ) : (
          <nav className="py-2 space-y-0.5 px-1.5">
            {topics.map((t) => (
              <div
                key={t._id}
                className={`group flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${activeTopic?._id === t._id ? 'bg-gray-800' : 'hover:bg-gray-800'}`}
                onClick={() => setActiveTopic(t)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color || '#6366f1' }} />
                  <span className="text-sm text-gray-300 truncate">{t.name}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs text-gray-600">{t.setupCount || 0}</span>
                  <div className="hidden group-hover:flex gap-0.5">
                    <button onClick={(e) => { e.stopPropagation(); setEditingTopic(t); setShowTopicModal(true); }} className="text-gray-500 hover:text-indigo-400 p-0.5"><PencilIcon className="w-3 h-3" /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteTopic(t._id); }} className="text-gray-500 hover:text-rose-400 p-0.5"><TrashIcon className="w-3 h-3" /></button>
                  </div>
                </div>
              </div>
            ))}
          </nav>
        )}
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto p-6">
        {!activeTopic ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            Select or create a topic to get started.
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-5 pb-16">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: activeTopic.color || '#6366f1' }} />
                <div>
                  <h1 className="text-xl font-bold">{activeTopic.name}</h1>
                  {activeTopic.description && <p className="text-sm text-gray-500 mt-0.5">{activeTopic.description}</p>}
                </div>
              </div>
              {!showSetupForm && (
                <button
                  onClick={() => { setEditingSetup(null); setShowSetupForm(true); }}
                  className="flex items-center gap-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <PlusIcon className="w-4 h-4" /> Add Setup
                </button>
              )}
            </div>

            {/* Topic analytics accordion */}
            <TopicAnalytics topicId={activeTopic._id} />

            {/* Setup form */}
            {showSetupForm && (
              <SetupForm
                topicId={activeTopic._id}
                initial={editingSetup}
                onSave={handleSetupSaved}
                onCancel={() => { setShowSetupForm(false); setEditingSetup(null); }}
              />
            )}

            {/* Setups list */}
            {loadingSetups ? (
              <p className="text-sm text-gray-500 text-center py-8">Loading setups…</p>
            ) : setups.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-sm">No setups yet for this topic.</p>
                <button onClick={() => { setEditingSetup(null); setShowSetupForm(true); }} className="mt-2 text-xs text-indigo-400 hover:underline">Add your first setup</button>
              </div>
            ) : (
              <div className="space-y-3">
                {setups.map((s) => (
                  <SetupCard key={s._id} setup={s} onEdit={openEditSetup} onDelete={handleDeleteSetup} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Topic modal */}
      {showTopicModal && (
        <TopicModal
          initial={editingTopic}
          onSave={handleTopicSaved}
          onClose={() => { setShowTopicModal(false); setEditingTopic(null); }}
        />
      )}
    </div>
  );
}
