import { useState, useRef } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { ArrowDownTrayIcon, ArrowUpTrayIcon, ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

function Section({ title, children }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const importFileRef = useRef();

  const downloadExport = async (type) => {
    try {
      const res = await api.get(`/backup/export/${type}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      const today = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `${type === 'trades' ? 'tradelog' : 'study'}-backup-${today}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Export failed');
    }
  };

  const handleImport = async (file) => {
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const { data } = await api.post('/backup/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImportResult({ ok: true, ...data });
      toast.success(`Imported ${data.imported} records`);
    } catch (err) {
      const msg = err.response?.data?.error || 'Import failed';
      setImportResult({ ok: false, error: msg });
      toast.error(msg);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      <div>
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your data backups and account settings.</p>
      </div>

      {/* ── Export ─────────────────────────────────────────────────────────── */}
      <Section title="Export Data">
        <p className="text-sm text-gray-400">
          Download a signed CSV backup of your data. Each row is HMAC-SHA256 signed — any tampering will be detected on import.
        </p>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => downloadExport('trades')}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Export Trade Logs (CSV)
          </button>
          <button
            onClick={() => downloadExport('study')}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Export Study Data (CSV)
          </button>
        </div>
      </Section>

      {/* ── Import ─────────────────────────────────────────────────────────── */}
      <Section title="Restore from CSV">
        <div className="flex items-start gap-3 bg-amber-950/40 border border-amber-800/40 rounded-lg p-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-300">
            Restoring will <strong>upsert</strong> records (add new, update existing). It will not remove records not in the file.
            Only upload CSV files exported from this app — tampered files will be rejected.
          </p>
        </div>
        <div>
          <input
            ref={importFileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => { if (e.target.files[0]) handleImport(e.target.files[0]); }}
          />
          <button
            onClick={() => importFileRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-200 text-sm font-medium px-4 py-2 rounded-lg border border-gray-700 transition-colors"
          >
            <ArrowUpTrayIcon className="w-4 h-4" />
            {importing ? 'Importing…' : 'Choose CSV to Restore'}
          </button>
        </div>

        {importResult && (
          <div className={`flex items-start gap-3 rounded-lg p-3 ${importResult.ok ? 'bg-emerald-950/40 border border-emerald-800/40' : 'bg-rose-950/40 border border-rose-800/40'}`}>
            {importResult.ok
              ? <ShieldCheckIcon className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              : <ExclamationTriangleIcon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            }
            <div className="text-sm">
              {importResult.ok ? (
                <>
                  <p className="font-semibold text-emerald-300">Restore complete</p>
                  <p className="text-gray-400 mt-0.5">Imported: {importResult.imported} · Skipped: {importResult.skipped}</p>
                  {importResult.errors?.length > 0 && (
                    <ul className="mt-1 text-xs text-gray-500 space-y-0.5">
                      {importResult.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  )}
                </>
              ) : (
                <p className="text-rose-300">{importResult.error}</p>
              )}
            </div>
          </div>
        )}
      </Section>

      {/* ── Future integrations placeholder ────────────────────────────────── */}
      <Section title="Integrations">
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-800">
            <div>
              <p className="text-sm font-medium text-gray-300">Notion Sync</p>
              <p className="text-xs text-gray-500">Mirror your trade log and study data to a Notion workspace.</p>
            </div>
            <span className="text-xs text-gray-600 border border-gray-700 rounded-full px-2.5 py-0.5">Coming soon</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-gray-300">Google Drive Backup</p>
              <p className="text-xs text-gray-500">Automatically back up to Google Drive on a schedule.</p>
            </div>
            <span className="text-xs text-gray-600 border border-gray-700 rounded-full px-2.5 py-0.5">Coming soon</span>
          </div>
        </div>
      </Section>
    </div>
  );
}
