import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

const STEPS = ['Charts & AI', 'Trade Details', 'Notes & Emotion'];

const EMPTY_FORM = {
  instrument: '',
  assetClass: 'forex',
  direction: 'long',
  entryPrice: '',
  stopLoss: '',
  takeProfit1: '',
  takeProfit2: '',
  status: 'open',
  exitPrice: '',
  pnlPips: '',
  pnlDollars: '',
  result: '',
  lotSize: '',
  positionSize: '',
  entryDate: '',
  exitDate: '',
  timeframe: '',
  setupType: '',
  confluences: '',
  session: '',
  emotionPreTrade: '',
  emotionPostTrade: '',
  executionRating: '',
  preTradeNotes: '',
  postTradeNotes: '',
};

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500';
const selectCls = `${inputCls} cursor-pointer`;

export default function NewTradePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);
  const [charts, setCharts] = useState([{ label: 'Entry', tvLink: '', imageUrl: '', aiRaw: null }]);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const updateChart = (i, key, val) =>
    setCharts((cs) => cs.map((c, idx) => (idx === i ? { ...c, [key]: val } : c)));

  const applyAiResult = (result) => {
    if (!result) return;
    setForm((f) => ({
      ...f,
      instrument: result.instrument || f.instrument,
      assetClass: result.assetClass && ['forex', 'stocks'].includes(result.assetClass) ? result.assetClass : f.assetClass,
      direction: result.direction && ['long', 'short'].includes(result.direction) ? result.direction : f.direction,
      timeframe: result.timeframe || f.timeframe,
      entryPrice: result.entryPrice ?? f.entryPrice,
      stopLoss: result.stopLoss ?? f.stopLoss,
      takeProfit1: result.takeProfit1 ?? f.takeProfit1,
      takeProfit2: result.takeProfit2 ?? f.takeProfit2,
      setupType: result.setupType || f.setupType,
      confluences: result.confluences?.join(', ') || f.confluences,
      session: result.session || f.session,
      preTradeNotes: result.notes ? `[AI] ${result.notes}` : f.preTradeNotes,
    }));
  };

  const analyzeLink = async (i) => {
    const { tvLink } = charts[i];
    if (!tvLink) { toast.error('Paste a TradingView link first'); return; }
    setAnalyzing(true);
    try {
      const { data } = await api.post('/charts/analyze', { tvLink });
      updateChart(i, 'imageUrl', data.imageUrl);
      updateChart(i, 'aiRaw', data.parsed);
      if (i === 0) applyAiResult(data.parsed);
      toast.success('Chart analyzed — fields pre-filled');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const analyzeUpload = async (i, file) => {
    if (!file) return;
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('chart', file);
      const { data } = await api.post('/charts/analyze-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateChart(i, 'imageUrl', data.imageUrl);
      updateChart(i, 'aiRaw', data.parsed);
      if (i === 0) applyAiResult(data.parsed);
      toast.success('Chart analyzed — fields pre-filled');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const addChart = () => {
    if (charts.length >= 3) { toast.error('Max 3 charts'); return; }
    setCharts((cs) => [...cs, { label: '', tvLink: '', imageUrl: '', aiRaw: null }]);
  };

  const handleSave = async () => {
    if (!form.instrument || !form.direction || !form.assetClass) {
      toast.error('Instrument, direction and asset class are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        confluences: form.confluences ? form.confluences.split(',').map((s) => s.trim()).filter(Boolean) : [],
        charts: charts.filter((c) => c.tvLink || c.imageUrl),
      };
      // Convert empty strings to undefined so Mongoose ignores them
      Object.keys(payload).forEach((k) => {
        if (payload[k] === '') delete payload[k];
      });
      await api.post('/trades', payload);
      toast.success('Trade saved!');
      navigate('/trades');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-bold">New Trade</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <button
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                i === step ? 'bg-indigo-600 text-white' : i < step ? 'bg-indigo-900 text-indigo-300 cursor-pointer' : 'bg-gray-800 text-gray-500 cursor-default'
              }`}
            >
              <span className="w-4 h-4 rounded-full border flex items-center justify-center text-xs" style={{ borderColor: 'currentColor' }}>{i + 1}</span>
              {s}
            </button>
            {i < STEPS.length - 1 && <div className="w-6 h-px bg-gray-700 mx-1" />}
          </div>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
        {/* STEP 0 — Charts */}
        {step === 0 && (
          <>
            <p className="text-sm text-gray-400">Paste your TradingView snapshot link(s) and click Analyze — AI will pre-fill most fields automatically. Or drag-drop a screenshot.</p>
            {charts.map((chart, i) => (
              <div key={i} className="space-y-2 p-4 bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={`Label (e.g. Entry, Higher TF)`}
                    value={chart.label}
                    onChange={(e) => updateChart(i, 'label', e.target.value)}
                    className="w-32 bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  {charts.length > 1 && (
                    <button onClick={() => setCharts((cs) => cs.filter((_, idx) => idx !== i))} className="text-xs text-rose-500 hover:underline ml-auto">Remove</button>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://www.tradingview.com/x/..."
                    value={chart.tvLink}
                    onChange={(e) => updateChart(i, 'tvLink', e.target.value)}
                    className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => analyzeLink(i)}
                    disabled={analyzing}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
                  >
                    {analyzing ? 'Analyzing…' : 'Analyze'}
                  </button>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>or</span>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="text-indigo-400 hover:underline"
                  >
                    upload screenshot
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => analyzeUpload(i, e.target.files[0])}
                  />
                </div>
                {chart.imageUrl && (
                  <img src={chart.imageUrl} alt="chart" className="rounded-lg max-h-48 object-contain border border-gray-700" />
                )}
              </div>
            ))}
            {charts.length < 3 && (
              <button onClick={addChart} className="text-xs text-indigo-400 hover:underline">+ Add another chart</button>
            )}
            <div className="flex justify-end pt-2">
              <button onClick={() => setStep(1)} className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
                Next: Review Fields →
              </button>
            </div>
          </>
        )}

        {/* STEP 1 — Trade Details */}
        {step === 1 && (
          <>
            {/* AI-filled summary pills */}
            {charts[0]?.aiRaw && (
              <div className="flex flex-wrap gap-1.5 p-3 bg-indigo-950/40 border border-indigo-900/50 rounded-lg">
                <span className="text-xs text-gray-500 self-center mr-1">AI detected:</span>
                {[
                  form.instrument,
                  form.direction,
                  form.timeframe && `${form.timeframe} TF`,
                  form.entryPrice && `Entry ${form.entryPrice}`,
                  form.stopLoss && `SL ${form.stopLoss}`,
                  form.setupType,
                  form.session,
                ].filter(Boolean).map((v) => (
                  <span key={v} className="text-xs bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded-full">{v}</span>
                ))}
              </div>
            )}

            {/* Core fields — just what AI can't fill */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Instrument *">
                <input type="text" value={form.instrument} onChange={set('instrument')} placeholder="EURUSD" className={inputCls} />
              </Field>
              <Field label="Lot Size">
                <input type="number" step="any" value={form.lotSize} onChange={set('lotSize')} placeholder="e.g. 0.5" className={inputCls} />
              </Field>
              <Field label="Direction *">
                <select value={form.direction} onChange={set('direction')} className={selectCls}>
                  <option value="long">Long</option>
                  <option value="short">Short</option>
                </select>
              </Field>
              <Field label="Asset Class *">
                <select value={form.assetClass} onChange={set('assetClass')} className={selectCls}>
                  <option value="forex">Forex</option>
                  <option value="stocks">US Stocks / Futures</option>
                  <option value="crypto">Crypto</option>
                  <option value="commodities">Commodities</option>
                </select>
              </Field>
            </div>

            {/* Outcome */}
            <div className="border-t border-gray-800 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Outcome</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Status">
                  <select value={form.status} onChange={set('status')} className={selectCls}>
                    <option value="open">Open (in progress)</option>
                    <option value="closed">Closed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </Field>
                {form.status === 'closed' && (
                  <>
                    <Field label="Result">
                      <select value={form.result} onChange={set('result')} className={selectCls}>
                        <option value="">—</option>
                        <option value="win">Win ✓</option>
                        <option value="loss">Loss ✗</option>
                        <option value="breakeven">Breakeven</option>
                      </select>
                    </Field>
                    <Field label="Exit Price">
                      <input type="number" step="any" value={form.exitPrice} onChange={set('exitPrice')} className={inputCls} />
                    </Field>
                    <Field label="P&L $">
                      <input type="number" step="any" value={form.pnlDollars} onChange={set('pnlDollars')} className={inputCls} />
                    </Field>
                  </>
                )}
              </div>
            </div>

            {/* Advanced — collapsed, pre-filled by AI */}
            <details className="border-t border-gray-800 pt-3">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300 select-none">▸ Advanced fields (prices, setup, dates — pre-filled by AI)</summary>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <Field label="Timeframe">
                  <select value={form.timeframe} onChange={set('timeframe')} className={selectCls}>
                    <option value="">—</option>
                    {['1M','3M','5M','15M','1H','4H','D','W'].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Session">
                  <select value={form.session} onChange={set('session')} className={selectCls}>
                    <option value="">—</option>
                    {['London','NY','Asian','London/NY Overlap'].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Entry Price">
                  <input type="number" step="any" value={form.entryPrice} onChange={set('entryPrice')} className={inputCls} />
                </Field>
                <Field label="Stop Loss">
                  <input type="number" step="any" value={form.stopLoss} onChange={set('stopLoss')} className={inputCls} />
                </Field>
                <Field label="Take Profit 1">
                  <input type="number" step="any" value={form.takeProfit1} onChange={set('takeProfit1')} className={inputCls} />
                </Field>
                <Field label="Take Profit 2">
                  <input type="number" step="any" value={form.takeProfit2} onChange={set('takeProfit2')} className={inputCls} />
                </Field>
                <Field label="Setup Type">
                  <input type="text" value={form.setupType} onChange={set('setupType')} placeholder="OB, FVG, BOS+MSS…" className={inputCls} />
                </Field>
                <Field label="Confluences (comma-separated)">
                  <input type="text" value={form.confluences} onChange={set('confluences')} placeholder="HTF OB, 0.79 fib, discount" className={inputCls} />
                </Field>
                <Field label="Entry Date">
                  <input type="datetime-local" value={form.entryDate} onChange={set('entryDate')} className={inputCls} />
                </Field>
                <Field label="Exit Date">
                  <input type="datetime-local" value={form.exitDate} onChange={set('exitDate')} className={inputCls} />
                </Field>
                <Field label="P&L Pips">
                  <input type="number" step="any" value={form.pnlPips} onChange={set('pnlPips')} className={inputCls} />
                </Field>
                <Field label="Position Size ($)">
                  <input type="number" step="any" value={form.positionSize} onChange={set('positionSize')} className={inputCls} />
                </Field>
              </div>
            </details>

            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(0)} className="text-sm text-gray-400 hover:text-gray-200">← Back</button>
              <button onClick={() => setStep(2)} className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
                Next: Notes & Emotion →
              </button>
            </div>
          </>
        )}

        {/* STEP 2 — Notes & Emotion */}
        {step === 2 && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Pre-Trade Emotion">
                <select value={form.emotionPreTrade} onChange={set('emotionPreTrade')} className={selectCls}>
                  <option value="">—</option>
                  {['Calm','Excited','Fearful','FOMO','Revenge','Confident'].map((e) => <option key={e}>{e}</option>)}
                </select>
              </Field>
              <Field label="Post-Trade Emotion">
                <select value={form.emotionPostTrade} onChange={set('emotionPostTrade')} className={selectCls}>
                  <option value="">—</option>
                  {['Calm','Excited','Fearful','FOMO','Revenge','Confident'].map((e) => <option key={e}>{e}</option>)}
                </select>
              </Field>
              <Field label="Execution Rating (1–5)">
                <input type="number" min={1} max={5} value={form.executionRating} onChange={set('executionRating')} className={inputCls} />
              </Field>
            </div>
            <Field label="Pre-Trade Notes">
              <textarea rows={3} value={form.preTradeNotes} onChange={set('preTradeNotes')} className={`${inputCls} resize-none`} placeholder="Why are you taking this trade?" />
            </Field>
            <Field label="Post-Trade Notes">
              <textarea rows={3} value={form.postTradeNotes} onChange={set('postTradeNotes')} className={`${inputCls} resize-none`} placeholder="What happened? What did you learn?" />
            </Field>

            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(1)} className="text-sm text-gray-400 hover:text-gray-200">← Back</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors"
              >
                {saving ? 'Saving…' : 'Save Trade'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
