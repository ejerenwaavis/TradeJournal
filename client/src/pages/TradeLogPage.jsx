import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

const RESULT_COLORS = {
  win: 'text-emerald-400',
  loss: 'text-rose-400',
  breakeven: 'text-yellow-400',
  '': 'text-gray-400',
};

function SortTh({ col, label, sort, onSort }) {
  return (
    <th
      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-300 select-none"
      onClick={() => onSort(col)}
    >
      {label} {sort.key === col ? (sort.dir === -1 ? '↓' : '↑') : ''}
    </th>
  );
}

export default function TradeLogPage() {
  const [trades, setTrades] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ month: '', result: '', setup: '' });
  const [sort, setSort] = useState({ key: 'entryDate', dir: -1 });
  const [loading, setLoading] = useState(false);

  const fetchTrades = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 25 });
      if (filters.month) params.set('month', filters.month);
      if (filters.result) params.set('result', filters.result);
      if (filters.setup) params.set('setup', filters.setup);
      const { data } = await api.get(`/trades?${params}`);
      setTrades(data.trades);
      setTotal(data.total);
    } catch {
      toast.error('Failed to load trades');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchTrades(); }, [fetchTrades]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this trade?')) return;
    try {
      await api.delete(`/trades/${id}`);
      toast.success('Trade deleted');
      fetchTrades();
    } catch { toast.error('Failed to delete'); }
  };

  const sorted = [...trades].sort((a, b) => {
    const av = a[sort.key], bv = b[sort.key];
    if (av == null) return 1; if (bv == null) return -1;
    return av < bv ? -sort.dir : av > bv ? sort.dir : 0;
  });

  const toggleSort = (key) =>
    setSort((s) => ({ key, dir: s.key === key ? -s.dir : -1 }));

  const columns = [
    { col: 'entryDate', label: 'Date' },
    { col: 'instrument', label: 'Instrument' },
    { col: 'direction', label: 'Dir' },
    { col: 'setupType', label: 'Setup' },
    { col: 'timeframe', label: 'TF' },
    { col: 'riskReward', label: 'R:R' },
    { col: 'result', label: 'Result' },
    { col: 'pnlDollars', label: 'P&L $' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Trade Log <span className="text-sm font-normal text-gray-500">({total} trades)</span></h1>
        <Link to="/trades/new" className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + New Trade
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          type="month"
          value={filters.month}
          onChange={(e) => { setFilters((f) => ({ ...f, month: e.target.value })); setPage(1); }}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={filters.result}
          onChange={(e) => { setFilters((f) => ({ ...f, result: e.target.value })); setPage(1); }}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Results</option>
          <option value="win">Win</option>
          <option value="loss">Loss</option>
          <option value="breakeven">Breakeven</option>
        </select>
        <input
          type="text"
          placeholder="Filter by setup…"
          value={filters.setup}
          onChange={(e) => { setFilters((f) => ({ ...f, setup: e.target.value })); setPage(1); }}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-40"
        />
        {(filters.month || filters.result || filters.setup) && (
          <button
            onClick={() => { setFilters({ month: '', result: '', setup: '' }); setPage(1); }}
            className="text-xs text-gray-400 hover:text-gray-200 px-2"
          >
            Clear
          </button>
        )}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-gray-800">
            <tr>
              {columns.map(({ col, label }) => (
                <SortTh key={col} col={col} label={label} sort={sort} onSort={toggleSort} />
              ))}
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading && (
              <tr><td colSpan={9} className="px-3 py-6 text-center text-gray-500">Loading…</td></tr>
            )}
            {!loading && sorted.length === 0 && (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-gray-500">No trades found.</td></tr>
            )}
            {sorted.map((t) => (
              <tr key={t._id} className="hover:bg-gray-800 transition-colors">
                <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">
                  {t.entryDate ? new Date(t.entryDate).toLocaleDateString() : '—'}
                </td>
                <td className="px-3 py-2.5 font-medium text-gray-100">{t.instrument}</td>
                <td className="px-3 py-2.5">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${t.direction === 'long' ? 'bg-emerald-900 text-emerald-300' : 'bg-rose-900 text-rose-300'}`}>
                    {t.direction}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-gray-400">{t.setupType || '—'}</td>
                <td className="px-3 py-2.5 text-gray-400">{t.timeframe || '—'}</td>
                <td className="px-3 py-2.5 text-gray-300">{t.riskReward ?? '—'}</td>
                <td className={`px-3 py-2.5 font-medium capitalize ${RESULT_COLORS[t.result] || 'text-gray-400'}`}>
                  {t.result || 'open'}
                </td>
                <td className={`px-3 py-2.5 font-medium ${t.pnlDollars > 0 ? 'text-emerald-400' : t.pnlDollars < 0 ? 'text-rose-400' : 'text-gray-400'}`}>
                  {t.pnlDollars != null ? `$${t.pnlDollars.toFixed(2)}` : '—'}
                </td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                  <Link to={`/trades/${t._id}`} className="text-xs text-indigo-400 hover:underline mr-3">View</Link>
                  <button onClick={() => handleDelete(t._id)} className="text-xs text-rose-500 hover:underline">Del</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 25 && (
        <div className="flex items-center gap-2 justify-end text-sm">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded bg-gray-800 disabled:opacity-40 hover:bg-gray-700">Prev</button>
          <span className="text-gray-400">Page {page} of {Math.ceil(total / 25)}</span>
          <button disabled={page >= Math.ceil(total / 25)} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded bg-gray-800 disabled:opacity-40 hover:bg-gray-700">Next</button>
        </div>
      )}
    </div>
  );
}
