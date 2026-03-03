import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import TagInput from '../components/TagInput';
import SetupTypeInput from '../components/SetupTypeInput';
import { SESSIONS } from '../utils/ictTags';
import { SkeletonDetailCard } from '../components/Skeleton';

const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500';
const selectCls = `${inputCls} cursor-pointer`;

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

function ReadRow({ label, value }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-gray-500 w-36 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-200">{value ?? '—'}</span>
    </div>
  );
}

function SectionHeading({ children }) {
  return <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{children}</p>;
}

export default function TradeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trade, setTrade] = useState(null);
  const [loadingTrade, setLoadingTrade] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [editCharts, setEditCharts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const [reanalyzing, setReanalyzing] = useState(null);
  const fileRef = useRef();
  const [fileChartIdx, setFileChartIdx] = useState(null);

  const blankChart = () => ({ label: 'Entry', tvLink: '', imageUrl: '', aiRaw: null });

  // Keyboard nav for lightbox
  useEffect(() => {
    const onKey = (e) => {
      if (lightboxIdx === null) return;
      if (e.key === 'Escape') { setLightboxIdx(null); return; }
      const validLen = trade?.charts?.filter((c) => c.imageUrl).length ?? 0;
      if (e.key === 'ArrowRight') setLightboxIdx((i) => Math.min(i + 1, validLen - 1));
      if (e.key === 'ArrowLeft')  setLightboxIdx((i) => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIdx, trade]);

  useEffect(() => {
    api.get(`/trades/${id}`)
      .then(({ data }) => {
        setTrade(data.trade);
        setEditCharts(data.trade.charts?.length ? [...data.trade.charts] : [blankChart()]);
        setForm({
          ...data.trade,
          confluences: Array.isArray(data.trade.confluences) ? data.trade.confluences : [],
          entryDate: data.trade.entryDate ? data.trade.entryDate.slice(0, 16) : '',
          exitDate:  data.trade.exitDate  ? data.trade.exitDate.slice(0, 16)  : '',
        });
      })
      .catch(() => toast.error('Trade not found'))
      .finally(() => setLoadingTrade(false));
  }, [id]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const updateEditChart = (i, key, val) =>
    setEditCharts((cs) => cs.map((c, idx) => (idx === i ? { ...c, [key]: val } : c)));

  const reanalyzeChart = async (i) => {
    if (!editCharts[i].tvLink) { toast.error('Paste a TradingView link first'); return; }
    setReanalyzing(i);
    try {
      const { data } = await api.post('/charts/analyze', { tvLink: editCharts[i].tvLink });
      updateEditChart(i, 'imageUrl', data.imageUrl);
      updateEditChart(i, 'aiRaw', data.parsed);
      toast.success('Chart refreshed');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Analysis failed');
    } finally { setReanalyzing(null); }
  };

  const reanalyzeUpload = async (i, file) => {
    if (!file) return;
    setReanalyzing(i);
    try {
      const fd = new FormData();
      fd.append('chart', file);
      const { data } = await api.post('/charts/analyze-upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateEditChart(i, 'imageUrl', data.imageUrl);
      updateEditChart(i, 'aiRaw', data.parsed);
      toast.success('Chart updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally { setReanalyzing(null); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        confluences: Array.isArray(form.confluences) ? form.confluences : [],
        charts: editCharts.filter((c) => c.tvLink || c.imageUrl),
      };
      Object.keys(payload).forEach((k) => { if (payload[k] === '') delete payload[k]; });
      const { data } = await api.patch(`/trades/${id}`, payload);
      setTrade(data.trade);
      setEditCharts(data.trade.charts?.length ? [...data.trade.charts] : [blankChart()]);
      setEditing(false);
      toast.success('Trade updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this trade permanently?')) return;
    await api.delete(`/trades/${id}`);
    toast.success('Trade deleted');
    navigate('/trades');
  };

  if (loadingTrade) return <SkeletonDetailCard />;
  if (!trade) return (
    <div className="flex items-center justify-center h-48 text-gray-500 text-sm">Trade not found.</div>
  );

  const resultColor = { win: 'text-emerald-400', loss: 'text-rose-400', breakeven: 'text-yellow-400' }[trade.result] || 'text-gray-400';
  const fmt = (v) => v != null ? v : '—';
  const validCharts = trade.charts?.filter((c) => c.imageUrl) ?? [];
  const lbChart = lightboxIdx !== null ? validCharts[lightboxIdx] : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">

      {/* â”€â”€ Header â”€â”€ */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/trades" className="text-xs text-gray-500 hover:text-gray-300">← Trade Log</Link>
        <h1 className="text-xl font-bold flex-1">
          {trade.instrument}
          <span className={`ml-2 text-sm font-medium px-2 py-0.5 rounded ${
            trade.direction === 'long' ? 'bg-emerald-900 text-emerald-300' : 'bg-rose-900 text-rose-300'
          }`}>{trade.direction}</span>
          {trade.result && (
            <span className={`ml-2 text-sm font-semibold capitalize ${resultColor}`}>{trade.result}</span>
          )}
          {trade.status === 'open' && !trade.result && (
            <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded bg-yellow-900 text-yellow-300">open</span>
          )}
        </h1>
        <button
          onClick={() => {
            if (editing) setEditCharts(trade.charts?.length ? [...trade.charts] : [blankChart()]);
            setEditing(!editing);
          }}
          className="text-xs border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          {editing ? 'Cancel' : 'Edit'}
        </button>
        <button
          onClick={handleDelete}
          className="text-xs border border-rose-900 hover:border-rose-600 text-rose-500 hover:text-rose-400 px-3 py-1.5 rounded-lg transition-colors"
        >
          Delete
        </button>
      </div>

      {/* â”€â”€ Charts: read mode thumbnails â”€â”€ */}
      {!editing && validCharts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {validCharts.map((c, i) => (
            <div
              key={i}
              className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden cursor-zoom-in hover:border-indigo-600 transition-colors group"
              onClick={() => setLightboxIdx(i)}
            >
              <p className="text-xs text-gray-500 px-3 py-1.5 border-b border-gray-800 flex items-center justify-between">
                <span>{c.label || `Chart ${i + 1}`}</span>
                <span className="opacity-0 group-hover:opacity-100 text-indigo-400 transition-opacity">â¤¢ expand</span>
              </p>
              <div className="relative">
                <img src={c.imageUrl} alt={c.label} className="w-full object-contain max-h-52" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
              </div>
              {c.tvLink && (
                <a
                  href={c.tvLink}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="block text-xs text-center text-indigo-400 hover:underline py-1.5"
                >
                  Open on TradingView ↗
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* â”€â”€ Charts: edit mode â”€â”€ */}
      {editing && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
          <SectionHeading>Charts</SectionHeading>
          {editCharts.map((chart, i) => (
            <div key={i} className="space-y-2 p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Label (e.g. Entry)"
                  value={chart.label || ''}
                  onChange={(e) => updateEditChart(i, 'label', e.target.value)}
                  className="w-32 bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {editCharts.length > 1 && (
                  <button
                    onClick={() => setEditCharts((cs) => cs.filter((_, idx) => idx !== i))}
                    className="text-xs text-rose-500 hover:underline ml-auto"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://www.tradingview.com/x/..."
                  value={chart.tvLink || ''}
                  onChange={(e) => updateEditChart(i, 'tvLink', e.target.value)}
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={() => reanalyzeChart(i)}
                  disabled={reanalyzing === i}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
                >
                  {reanalyzing === i ? 'Loading…' : chart.imageUrl ? 'Re-analyze' : 'Analyze'}
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>or</span>
                <button
                  type="button"
                  onClick={() => { setFileChartIdx(i); fileRef.current?.click(); }}
                  className="text-indigo-400 hover:underline"
                >
                  upload / replace screenshot
                </button>
              </div>
              {chart.imageUrl && (
                <img src={chart.imageUrl} alt="chart preview" className="rounded-lg max-h-44 object-contain border border-gray-700" />
              )}
            </div>
          ))}
          {editCharts.length < 3 && (
            <button
              onClick={() => setEditCharts((cs) => [...cs, { label: '', tvLink: '', imageUrl: '', aiRaw: null }])}
              className="text-xs text-indigo-400 hover:underline"
            >
              + Add chart
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { if (fileChartIdx !== null) reanalyzeUpload(fileChartIdx, e.target.files[0]); }}
          />
        </div>
      )}

      {/* â”€â”€ Read view â”€â”€ */}
      {!editing && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
          <div>
            <SectionHeading>Trade Setup</SectionHeading>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              <ReadRow label="Instrument"    value={trade.instrument} />
              <ReadRow label="HTF Bias"      value={trade.htfBias} />
              <ReadRow label="Asset Class"   value={trade.assetClass} />
              <ReadRow label="Timeframe"     value={trade.timeframe} />
              <ReadRow label="Session"       value={trade.session} />
              <ReadRow label="Entry Price"   value={fmt(trade.entryPrice)} />
              <ReadRow label="Stop Loss"     value={fmt(trade.stopLoss)} />
              <ReadRow label="Take Profit 1" value={fmt(trade.takeProfit1)} />
              <ReadRow label="Take Profit 2" value={fmt(trade.takeProfit2)} />
              <ReadRow label="R:R"           value={fmt(trade.riskReward)} />
              <ReadRow label="Lot Size"      value={fmt(trade.lotSize)} />
              <ReadRow label="Setup Type"    value={trade.setupType} />
              <ReadRow label="Confluences"   value={trade.confluences?.join(', ')} />
            </div>
          </div>
          <div className="border-t border-gray-800 pt-4">
            <SectionHeading>Outcome</SectionHeading>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              <ReadRow label="Status"         value={trade.status} />
              <ReadRow label="Result"         value={trade.result} />
              <ReadRow label="Exit Price"     value={fmt(trade.exitPrice)} />
              <ReadRow label="Points / Handles" value={trade.pnlPips != null ? `${trade.pnlPips > 0 ? '+' : ''}${trade.pnlPips}` : '—'} />
              <ReadRow label="R:R Achieved"   value={fmt(trade.riskReward)} />
            </div>
          </div>
          <div className="border-t border-gray-800 pt-4">
            <SectionHeading>Psychology</SectionHeading>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              <ReadRow label="Pre Emotion"      value={trade.emotionPreTrade} />
              <ReadRow label="Post Emotion"     value={trade.emotionPostTrade} />
              <ReadRow label="Execution Rating" value={trade.executionRating ? `${trade.executionRating}/5` : '—'} />
            </div>
          </div>
          {(trade.preTradeNotes || trade.postTradeNotes) && (
            <div className="border-t border-gray-800 pt-4 space-y-3">
              <SectionHeading>Notes</SectionHeading>
              {trade.preTradeNotes && (
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">Pre-Trade</p>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{trade.preTradeNotes}</p>
                </div>
              )}
              {trade.postTradeNotes && (
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">Post-Trade</p>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{trade.postTradeNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* â”€â”€ Edit view â”€â”€ */}
      {editing && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Instrument">
              <input type="text" value={form.instrument || ''} onChange={set('instrument')} className={inputCls} />
            </Field>
            <Field label="Asset Class">
              <select value={form.assetClass || 'forex'} onChange={set('assetClass')} className={selectCls}>
                <option value="forex">Forex</option>
                <option value="stocks">US Stocks / Futures</option>
                <option value="crypto">Crypto</option>
                <option value="commodities">Commodities</option>
              </select>
            </Field>
            <Field label="Direction">
              <select value={form.direction || 'long'} onChange={set('direction')} className={selectCls}>
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </Field>
            <Field label="Timeframe">
              <select value={form.timeframe || ''} onChange={set('timeframe')} className={selectCls}>
                <option value="">—</option>
                {['1M','3M','5M','15M','1H','4H','D','W'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Entry Price">
              <input type="number" step="any" value={form.entryPrice || ''} onChange={set('entryPrice')} className={inputCls} />
            </Field>
            <Field label="Stop Loss">
              <input type="number" step="any" value={form.stopLoss || ''} onChange={set('stopLoss')} className={inputCls} />
            </Field>
            <Field label="Take Profit 1">
              <input type="number" step="any" value={form.takeProfit1 || ''} onChange={set('takeProfit1')} className={inputCls} />
            </Field>
            <Field label="Take Profit 2">
              <input type="number" step="any" value={form.takeProfit2 || ''} onChange={set('takeProfit2')} className={inputCls} />
            </Field>
            <Field label="Lot Size">
              <input type="number" step="any" value={form.lotSize || ''} onChange={set('lotSize')} className={inputCls} />
            </Field>
            <Field label="Session">
              <select value={form.session || ''} onChange={set('session')} className={selectCls}>
                <option value="">—</option>
                {SESSIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="HTF Bias">
              <select value={form.htfBias || ''} onChange={set('htfBias')} className={selectCls}>
                <option value="">—</option>
                {['Bullish', 'Bearish', 'Neutral'].map((b) => <option key={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="Account">
              <input type="text" value={form.account || ''} onChange={set('account')} placeholder="e.g. Live, Prop, Paper" className={inputCls} />
            </Field>
            <Field label="Setup Type">
              <SetupTypeInput value={form.setupType || ''} onChange={(v) => setForm((f) => ({ ...f, setupType: v }))} />
            </Field>
            <Field label="Confluences">
              <TagInput
                value={form.confluences || []}
                onChange={(tags) => setForm((f) => ({ ...f, confluences: tags }))}
              />
            </Field>
            <Field label="Status">
              <select value={form.status || 'open'} onChange={set('status')} className={selectCls}>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </Field>
            <Field label="Result">
              <select value={form.result || ''} onChange={set('result')} className={selectCls}>
                <option value="">—</option>
                <option value="win">Win</option>
                <option value="loss">Loss</option>
                <option value="breakeven">Breakeven</option>
              </select>
            </Field>
            <Field label="Exit Price">
              <input type="number" step="any" value={form.exitPrice || ''} onChange={set('exitPrice')} className={inputCls} />
            </Field>
            <Field label="Points / Handles">
              <input type="number" step="any" value={form.pnlPips || ''} onChange={set('pnlPips')} placeholder="e.g. 12.5" className={inputCls} />
            </Field>
            <Field label="Entry Date">
              <input type="datetime-local" value={form.entryDate || ''} onChange={set('entryDate')} className={inputCls} />
            </Field>
            <Field label="Exit Date">
              <input type="datetime-local" value={form.exitDate || ''} onChange={set('exitDate')} className={inputCls} />
            </Field>
            <Field label="Pre Emotion">
              <select value={form.emotionPreTrade || ''} onChange={set('emotionPreTrade')} className={selectCls}>
                <option value="">—</option>
                {['Calm','Excited','Fearful','FOMO','Revenge','Confident'].map((e) => <option key={e}>{e}</option>)}
              </select>
            </Field>
            <Field label="Post Emotion">
              <select value={form.emotionPostTrade || ''} onChange={set('emotionPostTrade')} className={selectCls}>
                <option value="">—</option>
                {['Calm','Excited','Fearful','FOMO','Revenge','Confident'].map((e) => <option key={e}>{e}</option>)}
              </select>
            </Field>
            <Field label="Execution Rating (1—5)">
              <input type="number" min={1} max={5} value={form.executionRating || ''} onChange={set('executionRating')} className={inputCls} />
            </Field>
          </div>
          <Field label="Pre-Trade Notes">
            <textarea rows={3} value={form.preTradeNotes || ''} onChange={set('preTradeNotes')} className={`${inputCls} resize-y`} />
          </Field>
          <Field label="Post-Trade Notes">
            <textarea rows={3} value={form.postTradeNotes || ''} onChange={set('postTradeNotes')} className={`${inputCls} resize-y`} />
          </Field>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setEditCharts(trade.charts?.length ? [...trade.charts] : [blankChart()]); setEditing(false); }}
              className="text-sm text-gray-400 hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* â”€â”€ Fullscreen Lightbox â”€â”€ */}
      {lbChart && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxIdx(null)}
        >
          <div
            className="flex flex-col bg-gray-900 rounded-2xl overflow-hidden shadow-2xl"
            style={{ width: '96vw', height: '95vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header bar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800 shrink-0">
              <span className="text-sm font-semibold text-gray-200">
                {lbChart.label || `Chart ${lightboxIdx + 1}`}
                {validCharts.length > 1 && (
                  <span className="ml-2 text-xs text-gray-600">{lightboxIdx + 1} / {validCharts.length}</span>
                )}
              </span>
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-600 hidden md:block">← → navigate · ESC close</span>
                {lbChart.tvLink && (
                  <a href={lbChart.tvLink} target="_blank" rel="noreferrer"
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                    Open on TradingView ↗
                  </a>
                )}
                <button
                  onClick={() => setLightboxIdx(null)}
                  className="text-gray-500 hover:text-white text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800 transition-colors"
                >×</button>
              </div>
            </div>

            {/* Body: prev arrow | chart | next arrow | notes */}
            <div className="flex flex-1 min-h-0">
              {/* Prev */}
              <div className="flex items-center px-1">
                <button
                  onClick={() => setLightboxIdx((i) => Math.max(i - 1, 0))}
                  disabled={lightboxIdx === 0}
                  className="text-gray-600 hover:text-white disabled:opacity-0 text-3xl w-9 h-16 flex items-center justify-center rounded-xl hover:bg-gray-800 transition-colors"
                >‹</button>
              </div>
              {/* Chart — fills remaining space */}
              <div className="flex-1 min-w-0 flex items-center justify-center bg-black">
                <img
                  src={lbChart.imageUrl}
                  alt="chart fullscreen"
                  className="max-w-full max-h-full object-contain select-none"
                  style={{ maxHeight: 'calc(95vh - 52px)' }}
                  draggable={false}
                />
              </div>
              {/* Next */}
              <div className="flex items-center px-1">
                <button
                  onClick={() => setLightboxIdx((i) => Math.min(i + 1, validCharts.length - 1))}
                  disabled={lightboxIdx >= validCharts.length - 1}
                  className="text-gray-600 hover:text-white disabled:opacity-0 text-3xl w-9 h-16 flex items-center justify-center rounded-xl hover:bg-gray-800 transition-colors"
                >›</button>
              </div>
              {/* Notes panel */}
              <div className="w-60 shrink-0 border-l border-gray-800 flex flex-col bg-gray-950">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {trade.result && (
                    <div className={`text-xs font-semibold uppercase text-center py-1.5 rounded-full ${
                      trade.result === 'win' ? 'bg-emerald-900/60 text-emerald-300' :
                      trade.result === 'loss' ? 'bg-rose-900/60 text-rose-300' :
                      'bg-yellow-900/60 text-yellow-300'
                    }`}>{trade.result}</div>
                  )}
                  {/* Prices */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Prices</p>
                    {[['Entry', trade.entryPrice, 'text-gray-200'], ['SL', trade.stopLoss, 'text-rose-400'], ['TP1', trade.takeProfit1, 'text-emerald-400'], ['TP2', trade.takeProfit2, 'text-emerald-400'], ['R:R', trade.riskReward, 'text-indigo-300']].map(([k, v, cls]) =>
                      v != null && <div key={k} className="flex justify-between text-xs"><span className="text-gray-500">{k}</span><span className={`font-mono ${cls}`}>{v}</span></div>
                    )}
                    {trade.pnlDollars != null && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">P&amp;L</span>
                        <span className={`font-mono font-semibold ${trade.pnlDollars > 0 ? 'text-emerald-400' : trade.pnlDollars < 0 ? 'text-rose-400' : 'text-gray-400'}`}>
                          ${trade.pnlDollars}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Setup */}
                  {(trade.setupType || trade.confluences?.length > 0) && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Setup</p>
                      {trade.setupType && <p className="text-xs text-gray-300">{trade.setupType}</p>}
                      <div className="flex flex-wrap gap-1">
                        {trade.confluences?.map((c) => (
                          <span key={c} className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Psychology */}
                  {(trade.emotionPreTrade || trade.executionRating) && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Psychology</p>
                      {trade.emotionPreTrade  && <div className="flex justify-between text-xs"><span className="text-gray-500">Pre</span><span className="text-gray-300">{trade.emotionPreTrade}</span></div>}
                      {trade.emotionPostTrade && <div className="flex justify-between text-xs"><span className="text-gray-500">Post</span><span className="text-gray-300">{trade.emotionPostTrade}</span></div>}
                      {trade.executionRating  && <div className="flex justify-between text-xs"><span className="text-gray-500">Rating</span><span className="text-gray-300">{trade.executionRating}/5</span></div>}
                    </div>
                  )}
                  {/* Notes */}
                  {trade.preTradeNotes && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Pre-Trade Notes</p>
                      <p className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">{trade.preTradeNotes}</p>
                    </div>
                  )}
                  {trade.postTradeNotes && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Post-Trade Notes</p>
                      <p className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">{trade.postTradeNotes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Dot nav */}
            {validCharts.length > 1 && (
              <div className="flex justify-center gap-2 py-2.5 border-t border-gray-800 shrink-0">
                {validCharts.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setLightboxIdx(i)}
                    className={`rounded-full transition-all ${
                      i === lightboxIdx ? 'w-4 h-2 bg-indigo-400' : 'w-2 h-2 bg-gray-600 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
