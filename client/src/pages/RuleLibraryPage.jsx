import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
  PlusIcon, PencilIcon, TrashIcon, XMarkIcon, CheckIcon,
  BookOpenIcon, ChevronDownIcon, ChevronUpIcon,
} from '@heroicons/react/24/outline';

// ── constants ─────────────────────────────────────────────────────────────────
const BRANCH_TYPES = ['none', 'single', 'fork'];
const RULE_TYPES   = ['conditional', 'macro'];

const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500';
const selectCls = `${inputCls} cursor-pointer`;
const btnPrimary = 'flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors';
const btnSecondary = 'flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-sm rounded-lg transition-colors';

// ── BLANK form state ──────────────────────────────────────────────────────────
const BLANK = {
  ruleId: '', title: '', description: '',
  ruleType: 'conditional', macroTime: '',
  defaultBranchType: 'none', defaultBranchLabels: ['', ''],
  tags: [],
};

// ── TagInput ──────────────────────────────────────────────────────────────────
function TagInput({ tags, onChange }) {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim().toLowerCase();
    if (!v || tags.includes(v)) { setInput(''); return; }
    onChange([...tags, v]);
    setInput('');
  };
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {tags.map((t) => (
          <span key={t} className="flex items-center gap-1 text-xs bg-indigo-900/60 border border-indigo-700 text-indigo-300 rounded-full px-2.5 py-0.5">
            {t}
            <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))} className="text-indigo-400 hover:text-white">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className={inputCls}
          placeholder="Add tag (e.g. macro, pd-array)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        />
        <button type="button" onClick={add} className={btnSecondary}>Add</button>
      </div>
    </div>
  );
}

// ── BranchTypeFields — shown conditionally ────────────────────────────────────
function BranchTypeFields({ form, onChange }) {
  const { defaultBranchType, defaultBranchLabels } = form;
  const labels = defaultBranchLabels || ['', ''];
  const setLabel = (i, v) => {
    const next = [...labels];
    next[i] = v;
    onChange({ ...form, defaultBranchLabels: next });
  };
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-gray-400 mb-1">Branch Type</label>
        <select
          className={selectCls}
          value={defaultBranchType}
          onChange={(e) => onChange({ ...form, defaultBranchType: e.target.value })}
        >
          <option value="none">None</option>
          <option value="single">Single</option>
          <option value="fork">Fork (A/B)</option>
        </select>
      </div>
      {defaultBranchType === 'single' && (
        <div>
          <label className="block text-xs text-gray-400 mb-1">Branch Label</label>
          <input className={inputCls} placeholder="e.g. Confirmed" value={labels[0]} onChange={(e) => setLabel(0, e.target.value)} />
        </div>
      )}
      {defaultBranchType === 'fork' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Branch A Label</label>
            <input className={inputCls} placeholder="e.g. Reversal" value={labels[0]} onChange={(e) => setLabel(0, e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Branch B Label</label>
            <input className={inputCls} placeholder="e.g. Continuation" value={labels[1]} onChange={(e) => setLabel(1, e.target.value)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── RuleForm ──────────────────────────────────────────────────────────────────
function RuleForm({ initial, onSubmit, onCancel, submitLabel = 'Save Rule' }) {
  const [form, setForm] = useState(initial || BLANK);
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.ruleId.trim()) return toast.error('ruleId is required');
    if (!form.title.trim()) return toast.error('Title is required');
    if (form.ruleType === 'macro' && !form.macroTime?.trim()) return toast.error('macroTime is required for macro rules');
    setSaving(true);
    try {
      const labels = form.defaultBranchLabels.filter((l) => l.trim());
      await onSubmit({ ...form, defaultBranchLabels: labels, macroTime: form.ruleType === 'macro' ? form.macroTime : null });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Rule ID (slug) <span className="text-rose-400">*</span></label>
          <input
            className={inputCls}
            placeholder="e.g. sweep-intent-check"
            value={form.ruleId}
            onChange={(e) => setForm((f) => ({ ...f, ruleId: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
            disabled={initial?.ruleId !== undefined && initial?.ruleId !== ''}
            title={initial?.ruleId ? 'ruleId cannot be changed after creation' : ''}
          />
          <p className="text-xs text-gray-600 mt-1">Lowercase letters, numbers, hyphens only. Cannot be changed.</p>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Title <span className="text-rose-400">*</span></label>
          <input className={inputCls} placeholder="e.g. Sweep Intent Check" value={form.title} onChange={set('title')} />
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Description</label>
        <textarea className={inputCls} rows={3} placeholder="Full rule text — what the trader is watching for…" value={form.description} onChange={set('description')} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Rule Type</label>
          <select className={selectCls} value={form.ruleType} onChange={set('ruleType')}>
            <option value="conditional">Conditional</option>
            <option value="macro">Macro (clock-based)</option>
          </select>
        </div>
        {form.ruleType === 'macro' && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">Macro Time <span className="text-rose-400">*</span></label>
            <input className={inputCls} placeholder="e.g. 10:30" value={form.macroTime || ''} onChange={set('macroTime')} />
          </div>
        )}
      </div>

      <BranchTypeFields form={form} onChange={setForm} />

      <div>
        <label className="block text-xs text-gray-400 mb-1">Tags</label>
        <TagInput tags={form.tags || []} onChange={(t) => setForm((f) => ({ ...f, tags: t }))} />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className={btnPrimary} disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className={btnSecondary} onClick={onCancel}>Cancel</button>
        )}
      </div>
    </form>
  );
}

// ── branchBadge ───────────────────────────────────────────────────────────────
const branchBadgeColor = { none: 'bg-gray-700 text-gray-400', single: 'bg-teal-900/60 text-teal-300 border-teal-700', fork: 'bg-purple-900/60 text-purple-300 border-purple-700' };

// ── RuleCard ──────────────────────────────────────────────────────────────────
function RuleCard({ rule, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleUpdate = async (data) => {
    try {
      const { data: res } = await api.put(`/rules/library/${rule.ruleId}`, data);
      onUpdated(res.rule);
      setEditing(false);
      toast.success('Rule updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    }
  };

  const handleDelete = async () => {
    if (!deleting) { setDeleting(true); return; }
    try {
      await api.delete(`/rules/library/${rule.ruleId}`);
      onDeleted(rule.ruleId);
      toast.success('Rule deleted');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
      setDeleting(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-100 text-sm">{rule.title}</span>
            <span className={`text-[10px] border rounded-full px-2 py-0.5 font-mono ${branchBadgeColor[rule.defaultBranchType]}`}>
              {rule.defaultBranchType}
            </span>
            <span className={`text-[10px] border rounded-full px-2 py-0.5 ${rule.ruleType === 'macro' ? 'bg-amber-900/60 border-amber-700 text-amber-300' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
              {rule.ruleType === 'macro' ? `macro ${rule.macroTime}` : 'conditional'}
            </span>
          </div>
          <p className="text-xs text-gray-500 font-mono mt-0.5">{rule.ruleId}</p>
          {rule.tags?.length > 0 && (
            <div className="flex gap-1 flex-wrap mt-1.5">
              {rule.tags.map((t) => (
                <span key={t} className="text-[10px] bg-indigo-900/40 border border-indigo-800 text-indigo-400 rounded-full px-2 py-0.5">{t}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setExpanded((v) => !v)} className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors">
            {expanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
          </button>
          <button onClick={() => { setEditing((v) => !v); setDeleting(false); }} className="p-1.5 text-gray-500 hover:text-indigo-400 transition-colors">
            <PencilIcon className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            className={`p-1.5 transition-colors ${deleting ? 'text-rose-400 hover:text-rose-300' : 'text-gray-500 hover:text-rose-400'}`}
            title={deleting ? 'Click again to confirm delete' : 'Delete rule'}
          >
            {deleting ? <CheckIcon className="w-4 h-4" /> : <TrashIcon className="w-4 h-4" />}
          </button>
          {deleting && (
            <button onClick={() => setDeleting(false)} className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors">
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded description */}
      {expanded && rule.description && (
        <div className="px-4 pb-3 border-t border-gray-800 pt-2">
          <p className="text-sm text-gray-400 whitespace-pre-wrap">{rule.description}</p>
          {rule.defaultBranchType !== 'none' && rule.defaultBranchLabels?.filter(Boolean).length > 0 && (
            <div className="flex gap-2 mt-2">
              {rule.defaultBranchLabels.filter(Boolean).map((l, i) => (
                <span key={i} className="text-xs bg-gray-800 border border-gray-700 text-gray-300 rounded-full px-3 py-0.5">Branch {String.fromCharCode(65 + i)}: {l}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <div className="px-4 pb-4 border-t border-gray-700 pt-4 bg-gray-900/80">
          <RuleForm
            initial={{
              ...rule,
              defaultBranchLabels: rule.defaultBranchLabels?.length === 2 ? rule.defaultBranchLabels : [...(rule.defaultBranchLabels || []), ''].slice(0, 2),
              macroTime: rule.macroTime || '',
              tags: rule.tags || [],
            }}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(false)}
            submitLabel="Update Rule"
          />
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// RuleLibraryPage
// ════════════════════════════════════════════════════════════════════════════
export default function RuleLibraryPage() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/rules/library')
      .then(({ data }) => setRules(data.rules || []))
      .catch(() => toast.error('Failed to load rule library'))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (data) => {
    try {
      const { data: res } = await api.post('/rules/library', data);
      setRules((prev) => [...prev, res.rule].sort((a, b) => a.title.localeCompare(b.title)));
      setShowCreate(false);
      toast.success('Rule created');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Create failed');
      throw err; // re-throw so RuleForm doesn't clear saving state prematurely
    }
  };

  const handleUpdated = (updated) => {
    setRules((prev) => prev.map((r) => (r.ruleId === updated.ruleId ? updated : r)).sort((a, b) => a.title.localeCompare(b.title)));
  };

  const handleDeleted = (ruleId) => {
    setRules((prev) => prev.filter((r) => r.ruleId !== ruleId));
  };

  const filtered = rules.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.title.toLowerCase().includes(q) || r.ruleId.toLowerCase().includes(q) || r.tags?.some((t) => t.includes(q));
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpenIcon className="w-6 h-6 text-indigo-400" />
          <div>
            <h1 className="text-xl font-bold text-gray-100">Rule Library</h1>
            <p className="text-xs text-gray-500 mt-0.5">Reusable, globally-tracked rules for every study topic</p>
          </div>
        </div>
        <button className={btnPrimary} onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? <XMarkIcon className="w-4 h-4" /> : <PlusIcon className="w-4 h-4" />}
          {showCreate ? 'Cancel' : 'New Rule'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-gray-900 border border-indigo-700 rounded-xl p-5 space-y-1">
          <p className="text-sm font-semibold text-indigo-300 mb-3">Create New Rule</p>
          <RuleForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} submitLabel="Create Rule" />
        </div>
      )}

      {/* Search */}
      {rules.length > 4 && (
        <input
          className={inputCls}
          placeholder="Search rules by title, id, or tag…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      {/* Rule list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          {rules.length === 0 ? (
            <>
              <p className="text-gray-400 font-medium">No rules yet</p>
              <p className="text-sm text-gray-600 mt-1">Create your first reusable rule above to get started.</p>
            </>
          ) : (
            <p className="text-gray-400">No rules match your search.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((rule) => (
            <RuleCard key={rule.ruleId} rule={rule} onUpdated={handleUpdated} onDeleted={handleDeleted} />
          ))}
        </div>
      )}

      {rules.length > 0 && (
        <p className="text-xs text-gray-600 text-center">{rules.length} rule{rules.length !== 1 ? 's' : ''} in library</p>
      )}
    </div>
  );
}
