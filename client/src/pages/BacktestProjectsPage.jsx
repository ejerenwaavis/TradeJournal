import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500';

function StatBadge({ label, value, color = 'text-gray-300' }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value ?? '—'}</p>
    </div>
  );
}

export default function BacktestProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', strategy: '', instrument: '', targetWinRate: '', targetRR: '' });
  const [editId, setEditId] = useState(null);

  const load = () => {
    api.get('/backtest-projects')
      .then(({ data }) => { setProjects(data.projects); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []); // load is stable — defined once above

  const save = async () => {
    if (!form.name.trim()) { toast.error('Project name is required'); return; }
    try {
      const payload = {
        ...form,
        targetWinRate: form.targetWinRate ? parseFloat(form.targetWinRate) / 100 : undefined,
        targetRR: form.targetRR ? parseFloat(form.targetRR) : undefined,
      };
      if (editId) {
        await api.put(`/backtest-projects/${editId}`, payload);
        toast.success('Project updated');
      } else {
        await api.post('/backtest-projects', payload);
        toast.success('Project created');
      }
      setShowForm(false);
      setEditId(null);
      setForm({ name: '', strategy: '', instrument: '', targetWinRate: '', targetRR: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const startEdit = (p) => {
    setForm({
      name: p.name, strategy: p.strategy || '', instrument: p.instrument || '',
      targetWinRate: p.targetWinRate ? (p.targetWinRate * 100).toFixed(0) : '',
      targetRR: p.targetRR ?? '',
    });
    setEditId(p._id);
    setShowForm(true);
  };

  const deleteProject = async (id) => {
    if (!window.confirm('Delete this project? Backtest entries are kept but unlinked.')) return;
    try {
      await api.delete(`/backtest-projects/${id}`);
      setProjects((prev) => prev.filter((p) => p._id !== id));
      toast.success('Project deleted');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Backtest Projects</h1>
          <p className="text-xs text-gray-500 mt-0.5">Group your backtests by strategy or pattern</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/backtests" className="text-sm text-indigo-400 hover:underline">← Backtest Mode</Link>
          <button
            onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', strategy: '', instrument: '', targetWinRate: '', targetRR: '' }); }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + New Project
          </button>
        </div>
      </div>

      {/* New / Edit form */}
      {showForm && (
        <div className="bg-gray-900 border border-indigo-800 rounded-xl p-5 space-y-4">
          <p className="text-sm font-semibold text-indigo-300">{editId ? 'Edit Project' : 'New Project'}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Project Name *</label>
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. MMXM NY Open Study" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Instrument</label>
              <input type="text" value={form.instrument} onChange={(e) => setForm((f) => ({ ...f, instrument: e.target.value }))} placeholder="e.g. MNQ" className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Strategy / Setup</label>
              <input type="text" value={form.strategy} onChange={(e) => setForm((f) => ({ ...f, strategy: e.target.value }))} placeholder="e.g. MMXM, Silver Bullet, Liquidity Sweep" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Target Win Rate %</label>
              <input type="number" min={0} max={100} value={form.targetWinRate} onChange={(e) => setForm((f) => ({ ...f, targetWinRate: e.target.value }))} placeholder="e.g. 60" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Target R:R</label>
              <input type="number" step="0.1" value={form.targetRR} onChange={(e) => setForm((f) => ({ ...f, targetRR: e.target.value }))} placeholder="e.g. 2.0" className={inputCls} />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={save} className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-2 rounded-lg">Save</button>
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="text-sm text-gray-400 hover:text-gray-200 px-3 py-2">Cancel</button>
          </div>
        </div>
      )}

      {/* Project grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse space-y-3">
              <div className="h-4 bg-gray-800 rounded w-2/3" />
              <div className="h-3 bg-gray-800 rounded w-1/3" />
              <div className="grid grid-cols-3 gap-3 pt-2">
                {Array.from({ length: 3 }, (_, j) => <div key={j} className="h-8 bg-gray-800 rounded" />)}
              </div>
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-2xl mb-2">📋</p>
          <p className="text-sm">No projects yet. Create one to start grouping your backtests.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((p) => {
            const s = p.stats || {};
            const wrColor = s.winRate == null ? '' : s.winRate >= (p.targetWinRate || 0.5) ? 'text-emerald-400' : 'text-rose-400';
            const rrColor = s.avgRR == null ? '' : s.avgRR >= (p.targetRR || 2) ? 'text-emerald-400' : 'text-rose-400';
            return (
              <div key={p._id} className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-5 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-100">{p.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      {p.strategy && <span className="text-xs text-indigo-400">{p.strategy}</span>}
                      {p.instrument && <span className="text-xs text-gray-500">{p.instrument}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => startEdit(p)} className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1">Edit</button>
                    <button onClick={() => deleteProject(p._id)} className="text-xs text-gray-600 hover:text-rose-400 px-2 py-1">Del</button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <StatBadge label="Entries" value={s.total ?? 0} />
                  <StatBadge label="Win Rate" value={s.winRate != null ? `${(s.winRate * 100).toFixed(0)}%` : '—'} color={wrColor} />
                  <StatBadge label="Avg R:R" value={s.avgRR ?? '—'} color={rrColor} />
                </div>
                {/* Progress bars toward targets */}
                {(p.targetWinRate || p.targetRR) && s.closed > 0 && (
                  <div className="space-y-2">
                    {p.targetWinRate && s.winRate != null && (
                      <div>
                        <div className="flex justify-between mb-0.5">
                          <span className="text-xs text-gray-500">Win Rate vs target</span>
                          <span className="text-xs text-gray-400">{(s.winRate * 100).toFixed(0)}% / {(p.targetWinRate * 100).toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${s.winRate >= p.targetWinRate ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                            style={{ width: `${Math.min((s.winRate / p.targetWinRate) * 100, 100)}%` }} />
                        </div>
                      </div>
                    )}
                    {p.targetRR && s.avgRR != null && (
                      <div>
                        <div className="flex justify-between mb-0.5">
                          <span className="text-xs text-gray-500">R:R vs target</span>
                          <span className="text-xs text-gray-400">{s.avgRR} / {p.targetRR}</span>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${s.avgRR >= p.targetRR ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                            style={{ width: `${Math.min((s.avgRR / p.targetRR) * 100, 100)}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="mt-4 pt-3 border-t border-gray-800">
                  <Link
                    to={`/backtests?project=${p._id}`}
                    className="text-xs text-indigo-400 hover:underline"
                  >
                    View all entries →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
