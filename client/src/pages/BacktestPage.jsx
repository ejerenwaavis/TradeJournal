import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import SetupTypeInput from '../components/SetupTypeInput';
import TagInput from '../components/TagInput';
import { SESSIONS } from '../utils/ictTags';

const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500';
const selectCls = `${inputCls} cursor-pointer`;

function Chip({ label, active, onClick, color = 'indigo' }) {
  const colors = {
    indigo: active ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-indigo-500',
    emerald: active ? 'bg-emerald-700 border-emerald-600 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-emerald-600',
    rose:    active ? 'bg-rose-700 border-rose-600 text-white'       : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-rose-600',
    amber:   active ? 'bg-amber-600 border-amber-500 text-white'     : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-amber-600',
  };
  return (
    <button type="button" onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${colors[color]}`}>
      {label}
    </button>
  );
}

const toLocalISO = () => {
  const now = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}T${p(now.getHours())}:${p(now.getMinutes())}`;
};

const BLANK = {
  instrument: '', assetClass: 'stocks', direction: 'long',
  htfBias: '', session: '', timeframe: '', setupType: '', confluences: [],
  entryPrice: '', stopLoss: '', takeProfit1: '', takeProfit2: '',
  pnlPips: '', riskReward: '', result: '', exitPrice: '',
  entryDate: '', exitDate: '', preTradeNotes: '', postTradeNotes: '',
  riskPercent: '', durationMins: '', account: '',
};

export default function BacktestPage() {
  const [projects, setProjects]     = useState([]);
  const [projectId, setProjectId]   = useState('');
  const [showNewProj, setShowNewProj] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjStrategy, setNewProjStrategy] = useState('');
  const [newProjInstrument, setNewProjInstrument] = useState('');

  const [form, setForm]       = useState({ ...BLANK, entryDate: toLocalISO(), exitDate: toLocalISO() });
  const [tvLink, setTvLink]   = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [aiPreview, setAiPreview] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [recentBTs, setRecentBTs] = useState([]);
  const fileRef = useRef();

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  // Load projects and recent backtests
  useEffect(() => {
    api.get('/backtest-projects').then(({ data }) => {
      setProjects(data.projects);
      if (data.projects.length > 0) setProjectId(data.projects[0]._id);
    });
    loadRecent();
  }, []);

  const loadRecent = () => {
    api.get('/trades?tradeType=backtest&limit=20').then(({ data }) => setRecentBTs(data.trades));
  };

  const createProject = async () => {
    if (!newProjName.trim()) { toast.error('Enter a project name'); return; }
    try {
      const { data } = await api.post('/backtest-projects', {
        name: newProjName.trim(), strategy: newProjStrategy, instrument: newProjInstrument,
      });
      setProjects((p) => [data.project, ...p]);
      setProjectId(data.project._id);
      setShowNewProj(false);
      setNewProjName(''); setNewProjStrategy(''); setNewProjInstrument('');
      toast.success('Project created');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create project');
    }
  };

  const analyzeLink = async () => {
    if (!tvLink.trim()) { toast.error('Paste a TradingView link first'); return; }
    setAnalyzing(true);
    try {
      const { data } = await api.post('/charts/analyze', { tvLink: tvLink.trim() });
      const r = data.parsed;
      if (r) {
        setAiPreview(r);
        const ok = (v) => v && v !== 'null' ? v : null;
        setForm((f) => ({
          ...f,
          instrument:  ok(r.instrument)  ?? f.instrument,
          assetClass:  ['forex','stocks'].includes(r.assetClass) ? r.assetClass : f.assetClass,
          direction:   ['long','short'].includes(r.direction) ? r.direction : f.direction,
          timeframe:   ok(r.timeframe)   ?? f.timeframe,
          entryPrice:  r.entryPrice      ?? f.entryPrice,
          stopLoss:    r.stopLoss        ?? f.stopLoss,
          takeProfit1: r.takeProfit1     ?? f.takeProfit1,
          takeProfit2: r.takeProfit2     ?? f.takeProfit2,
          pnlPips:     r.pnlPips         ?? f.pnlPips,
          riskReward:  r.riskReward      ?? f.riskReward,
          setupType:   ok(r.setupType)   ?? f.setupType,
          confluences: r.confluences?.length ? [...new Set([...f.confluences, ...r.confluences.filter(ok)])] : f.confluences,
          session:     ok(r.session)     ?? f.session,
          preTradeNotes: r.notes ? `[AI] ${r.notes}` : f.preTradeNotes,
        }));
      }
      toast.success('Chart analyzed');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Analysis failed');
    } finally { setAnalyzing(false); }
  };

  const analyzeUpload = async (file) => {
    setAnalyzing(true);
    try {
      const fd = new FormData(); fd.append('chart', file);
      const { data } = await api.post('/charts/analyze-upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const r = data.parsed;
      if (r) {
        setAiPreview(r);
        const ok = (v) => v && v !== 'null' ? v : null;
        setForm((f) => ({
          ...f,
          instrument:  ok(r.instrument) ?? f.instrument,
          direction:   ['long','short'].includes(r.direction) ? r.direction : f.direction,
          entryPrice:  r.entryPrice ?? f.entryPrice,
          stopLoss:    r.stopLoss ?? f.stopLoss,
          takeProfit1: r.takeProfit1 ?? f.takeProfit1,
          pnlPips:     r.pnlPips ?? f.pnlPips,
          riskReward:  r.riskReward ?? f.riskReward,
          setupType:   ok(r.setupType) ?? f.setupType,
          confluences: r.confluences?.length ? r.confluences.filter(ok) : f.confluences,
        }));
      }
      toast.success('Chart analyzed');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally { setAnalyzing(false); }
  };

  const save = async () => {
    if (!form.instrument) { toast.error('Instrument is required'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        tradeType: 'backtest',
        status: form.result ? 'closed' : 'open',
        ...(projectId ? { projectId } : {}),
        ...(tvLink ? { charts: [{ label: 'Entry', tvLink, imageUrl: aiPreview ? '' : '', aiRaw: aiPreview }] } : {}),
      };
      // Strip empty strings
      Object.keys(payload).forEach((k) => { if (payload[k] === '') delete payload[k]; });
      await api.post('/trades', payload);
      toast.success('Backtest saved!');
      // Keep instrument, session, htfBias, timeframe for rapid successive entries
      const keepFields = { instrument: form.instrument, session: form.session, htfBias: form.htfBias, timeframe: form.timeframe, account: form.account };
      setForm({ ...BLANK, ...keepFields, entryDate: toLocalISO(), exitDate: toLocalISO() });
      setTvLink('');
      setAiPreview(null);
      loadRecent();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  };

  const currentProject = projects.find((p) => p._id === projectId);

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Backtesting</h1>
          <p className="text-xs text-gray-500 mt-0.5">Rapid-capture mode — paste chart link, get instant analysis, save in seconds</p>
        </div>
        <Link to="/backtests/projects" className="text-sm text-indigo-400 hover:underline">Manage Projects →</Link>
      </div>

      {/* Project selector */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-xs font-medium text-gray-400 shrink-0">Project</label>
          {projects.length === 0 ? (
            <p className="text-sm text-gray-500">No projects yet.</p>
          ) : (
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 focus:outline-none flex-1 min-w-0"
            >
              <option value="">— No project —</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>{p.name}{p.strategy ? ` · ${p.strategy}` : ''}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => setShowNewProj((v) => !v)}
            className="text-xs bg-gray-800 border border-gray-700 hover:border-indigo-500 text-gray-300 px-3 py-1.5 rounded-lg transition-colors shrink-0"
          >
            + New Project
          </button>
        </div>
        {showNewProj && (
          <div className="mt-3 grid grid-cols-3 gap-3 pt-3 border-t border-gray-800">
            <input type="text" value={newProjName} onChange={(e) => setNewProjName(e.target.value)}
              placeholder="Project name *" className={inputCls} />
            <input type="text" value={newProjStrategy} onChange={(e) => setNewProjStrategy(e.target.value)}
              placeholder="Strategy (e.g. MMXM)" className={inputCls} />
            <input type="text" value={newProjInstrument} onChange={(e) => setNewProjInstrument(e.target.value)}
              placeholder="Instrument (e.g. MNQ)" className={inputCls} />
            <div className="col-span-3 flex gap-2">
              <button onClick={createProject} className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg">Create</button>
              <button onClick={() => setShowNewProj(false)} className="text-sm text-gray-400 hover:text-gray-200 px-3 py-2">Cancel</button>
            </div>
          </div>
        )}
        {currentProject && (
          <div className="mt-2 flex gap-4">
            {currentProject.stats && (
              <>
                <span className="text-xs text-gray-500">{currentProject.stats.total} entries</span>
                {currentProject.stats.closed > 0 && (
                  <>
                    <span className="text-xs text-gray-500">Win Rate: <span className="text-gray-300 font-medium">{(currentProject.stats.winRate * 100).toFixed(0)}%</span></span>
                    <span className="text-xs text-gray-500">Avg R:R: <span className="text-gray-300 font-medium">{currentProject.stats.avgRR ?? '—'}</span></span>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* === LEFT — Rapid capture form === */}
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Chart Analysis</p>

            {/* Chart link + upload */}
            <div className="flex gap-2">
              <input
                type="url"
                value={tvLink}
                onChange={(e) => setTvLink(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && analyzeLink()}
                placeholder="https://www.tradingview.com/x/…"
                className={`${inputCls} flex-1`}
              />
              <button
                onClick={analyzeLink}
                disabled={analyzing}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg whitespace-nowrap transition-colors"
              >
                {analyzing ? 'Analyzing…' : 'Analyze'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">or</span>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={analyzing}
                className="text-xs text-indigo-400 hover:underline"
              >
                Upload screenshot
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { if (e.target.files[0]) analyzeUpload(e.target.files[0]); }} />
            </div>

            {/* AI preview pills */}
            {aiPreview && (
              <div className="flex flex-wrap gap-1.5 p-3 bg-indigo-950/40 border border-indigo-900/50 rounded-lg">
                <span className="text-xs text-gray-500 self-center mr-1">AI extracted:</span>
                {[
                  aiPreview.instrument,
                  aiPreview.direction,
                  aiPreview.entryPrice && `Entry ${aiPreview.entryPrice}`,
                  aiPreview.stopLoss && `SL ${aiPreview.stopLoss}`,
                  aiPreview.takeProfit1 && `TP ${aiPreview.takeProfit1}`,
                  aiPreview.pnlPips != null && `${aiPreview.pnlPips > 0 ? '+' : ''}${aiPreview.pnlPips} pts`,
                  aiPreview.setupType,
                  aiPreview.session,
                ].filter(Boolean).map((v) => (
                  <span key={v} className="text-xs bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded-full">{v}</span>
                ))}
              </div>
            )}
          </div>

          {/* Quick toggles */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Quick Setup</p>

            <div>
              <p className="text-xs text-gray-400 mb-2">Direction</p>
              <div className="flex gap-2">
                <Chip label="Long" active={form.direction === 'long'} onClick={() => setForm((f) => ({ ...f, direction: 'long' }))} color="emerald" />
                <Chip label="Short" active={form.direction === 'short'} onClick={() => setForm((f) => ({ ...f, direction: 'short' }))} color="rose" />
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-2">HTF Bias</p>
              <div className="flex gap-2">
                {['Bullish', 'Bearish', 'Neutral'].map((b) => (
                  <Chip key={b} label={b}
                    active={form.htfBias === b}
                    onClick={() => setForm((f) => ({ ...f, htfBias: form.htfBias === b ? '' : b }))}
                    color={b === 'Bullish' ? 'emerald' : b === 'Bearish' ? 'rose' : 'amber'}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-2">Session</p>
              <div className="flex flex-wrap gap-1.5">
                {SESSIONS.map(({ value }) => (
                  <Chip key={value} label={value}
                    active={form.session === value}
                    onClick={() => setForm((f) => ({ ...f, session: form.session === value ? '' : value }))}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Instrument</label>
                <input type="text" value={form.instrument} onChange={set('instrument')} placeholder="MNQH2026" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Timeframe</label>
                <select value={form.timeframe} onChange={set('timeframe')} className={selectCls}>
                  <option value="">—</option>
                  {['1M','3M','5M','15M','1H','4H','D','W'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* === RIGHT — Details + save === */}
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Price Levels</p>
            <div className="grid grid-cols-2 gap-3">
              {[['Entry', 'entryPrice'], ['Stop Loss', 'stopLoss'], ['Take Profit 1', 'takeProfit1'], ['Take Profit 2', 'takeProfit2']].map(([lbl, key]) => (
                <div key={key}>
                  <label className="block text-xs text-gray-400 mb-1">{lbl}</label>
                  <input type="number" step="any" value={form[key]} onChange={set(key)} className={inputCls} />
                </div>
              ))}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Points / Handles</label>
                <input type="number" step="any" value={form.pnlPips} onChange={set('pnlPips')} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">R:R</label>
                <input type="number" step="any" value={form.riskReward} onChange={set('riskReward')} className={inputCls} />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Setup</p>
            <div>
              <label className="block text-xs text-gray-400 mb-2">Setup Type</label>
              <SetupTypeInput value={form.setupType} onChange={(v) => setForm((f) => ({ ...f, setupType: v }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2">Confluences</label>
              <TagInput value={form.confluences} onChange={(tags) => setForm((f) => ({ ...f, confluences: tags }))} />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Outcome (optional — fill later)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Result</label>
                <select value={form.result} onChange={set('result')} className={selectCls}>
                  <option value="">— Leave open —</option>
                  <option value="win">Win</option>
                  <option value="loss">Loss</option>
                  <option value="breakeven">Breakeven</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Risk %</label>
                <input type="number" step="0.1" value={form.riskPercent} onChange={set('riskPercent')} placeholder="e.g. 0.5" className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Key Notes</label>
              <textarea rows={2} value={form.preTradeNotes} onChange={set('preTradeNotes')} className={`${inputCls} resize-none`} placeholder="Key context for this setup…" />
            </div>
          </div>

          <button
            onClick={save}
            disabled={saving || !form.instrument}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            {saving ? 'Saving…' : '⚡ Save Backtest Entry'}
          </button>
          <p className="text-xs text-gray-600 text-center">Instrument, session &amp; HTF bias are kept for the next entry</p>
        </div>
      </div>

      {/* Recent backtests */}
      {recentBTs.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
            <h2 className="text-sm font-semibold">Recent Backtest Entries</h2>
          </div>
          <div className="divide-y divide-gray-800">
            {recentBTs.map((t) => (
              <Link key={t._id} to={`/trades/${t._id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-800 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-gray-100">{t.instrument}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${t.direction === 'long' ? 'bg-emerald-900 text-emerald-300' : 'bg-rose-900 text-rose-300'}`}>{t.direction}</span>
                  {t.setupType && <span className="text-xs text-gray-600 truncate hidden sm:block">{t.setupType}</span>}
                  {t.session && <span className="text-xs text-gray-700">{t.session}</span>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {t.pnlPips != null && (
                    <span className={`text-sm font-medium ${t.pnlPips > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {t.pnlPips > 0 ? '+' : ''}{t.pnlPips} pts
                    </span>
                  )}
                  <span className={`text-sm font-semibold capitalize ${
                    t.result === 'win' ? 'text-emerald-400' : t.result === 'loss' ? 'text-rose-400' : 'text-yellow-300'
                  }`}>{t.result || 'Open'}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
