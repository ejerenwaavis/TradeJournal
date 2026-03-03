import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

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

export default function TradeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trade, setTrade] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setLightboxIdx(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    api.get(`/trades/${id}`)
      .then(({ data }) => {
        setTrade(data.trade);
        setForm({
          ...data.trade,
          confluences: data.trade.confluences?.join(', ') || '',
          entryDate: data.trade.entryDate ? data.trade.entryDate.slice(0, 16) : '',
          exitDate: data.trade.exitDate ? data.trade.exitDate.slice(0, 16) : '',
        });
      })
      .catch(() => toast.error('Trade not found'));
  }, [id]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        confluences: form.confluences ? form.confluences.split(',').map((s) => s.trim()).filter(Boolean) : [],
      };
      Object.keys(payload).forEach((k) => { if (payload[k] === '') delete payload[k]; });
      const { data } = await api.patch(`/trades/${id}`, payload);
      setTrade(data.trade);
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

  if (!trade) return <p className="text-gray-500 text-sm">Loading…</p>;

  const resultColor = { win: 'text-emerald-400', loss: 'text-rose-400', breakeven: 'text-yellow-400' }[trade.result] || 'text-gray-400';
  const fmt = (v) => v != null ? v : '—';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/trades" className="text-xs text-gray-500 hover:text-gray-300">← Trade Log</Link>
        <h1 className="text-xl font-bold flex-1">
          {trade.instrument}
          <span className={`ml-2 text-sm font-medium px-2 py-0.5 rounded ${trade.direction === 'long' ? 'bg-emerald-900 text-emerald-300' : 'bg-rose-900 text-rose-300'}`}>
            {trade.direction}
          </span>
          {trade.result && <span className={`ml-2 text-sm font-semibold capitalize ${resultColor}`}>{trade.result}</span>}
        </h1>
        <button onClick={() => setEditing(!editing)} className="text-xs text-indigo-400 hover:underline">
          {editing ? 'Cancel Edit' : 'Edit'}
        </button>
        <button onClick={handleDelete} className="text-xs text-rose-500 hover:underline">Delete</button>
      </div>

      {/* Charts — click to expand */}
      {trade.charts?.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {trade.charts.map((c, i) => (
            c.imageUrl && (
              <div
                key={i}
                className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden cursor-zoom-in hover:border-indigo-600 transition-colors group"
                onClick={() => setLightboxIdx(i)}
              >
                <p className="text-xs text-gray-500 px-3 py-1.5 border-b border-gray-800 flex items-center justify-between">
                  <span>{c.label || `Chart ${i + 1}`}</span>
                  <span className="opacity-0 group-hover:opacity-100 text-indigo-400 transition-opacity">⤢ expand</span>
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
            )
          ))}
        </div>
      )}

      {!editing ? (
        /* Read view */
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            <ReadRow label="Instrument" value={trade.instrument} />
            <ReadRow label="Asset Class" value={trade.assetClass} />
            <ReadRow label="Timeframe" value={trade.timeframe} />
            <ReadRow label="Session" value={trade.session} />
            <ReadRow label="Entry Price" value={fmt(trade.entryPrice)} />
            <ReadRow label="Stop Loss" value={fmt(trade.stopLoss)} />
            <ReadRow label="Take Profit 1" value={fmt(trade.takeProfit1)} />
            <ReadRow label="Take Profit 2" value={fmt(trade.takeProfit2)} />
            <ReadRow label="R:R" value={fmt(trade.riskReward)} />
            <ReadRow label="Lot Size" value={fmt(trade.lotSize)} />
            <ReadRow label="Setup Type" value={trade.setupType} />
            <ReadRow label="Confluences" value={trade.confluences?.join(', ')} />
            <ReadRow label="Status" value={trade.status} />
            <ReadRow label="Result" value={trade.result} />
            <ReadRow label="Exit Price" value={fmt(trade.exitPrice)} />
            <ReadRow label="P&L Pips" value={fmt(trade.pnlPips)} />
            <ReadRow label="P&L $" value={trade.pnlDollars != null ? `$${trade.pnlDollars}` : '—'} />
            <ReadRow label="Pre Emotion" value={trade.emotionPreTrade} />
            <ReadRow label="Post Emotion" value={trade.emotionPostTrade} />
            <ReadRow label="Execution Rating" value={trade.executionRating ? `${trade.executionRating}/5` : '—'} />
          </div>
          {trade.preTradeNotes && (
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Pre-Trade Notes</p>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{trade.preTradeNotes}</p>
            </div>
          )}
          {trade.postTradeNotes && (
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Post-Trade Notes</p>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{trade.postTradeNotes}</p>
            </div>
          )}
        </div>
      ) : (
        /* Edit view */
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Instrument"><input type="text" value={form.instrument || ''} onChange={set('instrument')} className={inputCls} /></Field>
            <Field label="Asset Class">
              <select value={form.assetClass || 'forex'} onChange={set('assetClass')} className={selectCls}>
                <option value="forex">Forex</option>
                <option value="stocks">US Stocks</option>
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
                {['1M','5M','15M','1H','4H','D','W'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Entry Price"><input type="number" step="any" value={form.entryPrice || ''} onChange={set('entryPrice')} className={inputCls} /></Field>
            <Field label="Stop Loss"><input type="number" step="any" value={form.stopLoss || ''} onChange={set('stopLoss')} className={inputCls} /></Field>
            <Field label="Take Profit 1"><input type="number" step="any" value={form.takeProfit1 || ''} onChange={set('takeProfit1')} className={inputCls} /></Field>
            <Field label="Take Profit 2"><input type="number" step="any" value={form.takeProfit2 || ''} onChange={set('takeProfit2')} className={inputCls} /></Field>
            <Field label="Lot Size"><input type="number" step="any" value={form.lotSize || ''} onChange={set('lotSize')} className={inputCls} /></Field>
            <Field label="Session">
              <select value={form.session || ''} onChange={set('session')} className={selectCls}>
                <option value="">—</option>
                {['London','NY','Asian','London/NY Overlap'].map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Setup Type"><input type="text" value={form.setupType || ''} onChange={set('setupType')} className={inputCls} /></Field>
            <Field label="Confluences"><input type="text" value={form.confluences || ''} onChange={set('confluences')} className={inputCls} /></Field>
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
            <Field label="Exit Price"><input type="number" step="any" value={form.exitPrice || ''} onChange={set('exitPrice')} className={inputCls} /></Field>
            <Field label="P&L Pips"><input type="number" step="any" value={form.pnlPips || ''} onChange={set('pnlPips')} className={inputCls} /></Field>
            <Field label="P&L $"><input type="number" step="any" value={form.pnlDollars || ''} onChange={set('pnlDollars')} className={inputCls} /></Field>
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
            <Field label="Execution Rating">
              <input type="number" min={1} max={5} value={form.executionRating || ''} onChange={set('executionRating')} className={inputCls} />
            </Field>
          </div>
          <Field label="Pre-Trade Notes"><textarea rows={3} value={form.preTradeNotes || ''} onChange={set('preTradeNotes')} className={`${inputCls} resize-none`} /></Field>
          <Field label="Post-Trade Notes"><textarea rows={3} value={form.postTradeNotes || ''} onChange={set('postTradeNotes')} className={`${inputCls} resize-none`} /></Field>
          <div className="flex justify-end gap-3">
            <button onClick={() => setEditing(false)} className="text-sm text-gray-400 hover:text-gray-200">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIdx !== null && trade.charts?.[lightboxIdx]?.imageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-3"
          onClick={() => setLightboxIdx(null)}
        >
          <div
            className="w-full max-w-6xl bg-gray-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            style={{ maxHeight: '94vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800 shrink-0">
              <span className="text-sm font-medium text-gray-200">
                {trade.charts[lightboxIdx].label || `Chart ${lightboxIdx + 1}`}
                <span className="ml-2 text-xs text-gray-500">· ESC or click outside to close</span>
              </span>
              <button onClick={() => setLightboxIdx(null)} className="text-gray-500 hover:text-white text-xl leading-none px-1">✕</button>
            </div>
            {/* Chart + Notes side by side */}
            <div className="flex flex-col md:flex-row flex-1 min-h-0">
              <div className="flex-1 min-h-0 flex items-center justify-center bg-black p-2">
                <img
                  src={trade.charts[lightboxIdx].imageUrl}
                  alt="chart"
                  className="max-w-full max-h-full object-contain"
                  style={{ maxHeight: '78vh' }}
                />
              </div>
              {(trade.preTradeNotes || trade.postTradeNotes) && (
                <div className="w-full md:w-72 shrink-0 border-t md:border-t-0 md:border-l border-gray-800 p-4 overflow-y-auto space-y-5 bg-gray-950">
                  <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Trade Notes</p>
                  {trade.preTradeNotes && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Pre-Trade</p>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{trade.preTradeNotes}</p>
                    </div>
                  )}
                  {trade.postTradeNotes && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Post-Trade</p>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{trade.postTradeNotes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Multi-chart dots */}
            {trade.charts.filter((c) => c.imageUrl).length > 1 && (
              <div className="flex justify-center gap-2 py-2.5 border-t border-gray-800 shrink-0">
                {trade.charts.map((c, i) => c.imageUrl && (
                  <button
                    key={i}
                    onClick={() => setLightboxIdx(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${i === lightboxIdx ? 'bg-indigo-400' : 'bg-gray-600 hover:bg-gray-400'}`}
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
