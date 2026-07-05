import { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';

// ── Style constants (matching StudyCompanionPage conventions) ─────────────────
const inputCls =
  'w-full bg-gray-800/60 border border-gray-700/60 rounded-lg px-3 py-2 text-sm text-gray-100 ' +
  'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 placeholder-gray-500 transition-all';
const selectCls = `${inputCls} cursor-pointer`;
const labelCls = 'block text-xs font-medium text-gray-400 mb-1';

/**
 * MLParametersPanel — Dynamic form rendered from the server-side rule registry.
 *
 * Props:
 *   values     {Object}    Current mlParameters values (keyed by mlKey)
 *   onChange   {Function}  (mlKey, value) => void — called when any value changes
 *   errors     {Object}    Optional — { mlKey: errorString } for inline validation
 *   collapsed  {boolean}   Whether the panel starts collapsed
 */
export default function MLParametersPanel({ values = {}, onChange, errors = {}, collapsed: initialCollapsed = true }) {
  const [registry, setRegistry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [fetchError, setFetchError] = useState(null);

  // Fetch the rule definitions from the server once on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/api/study/rules-registry');
        if (!cancelled) {
          setRegistry(data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setFetchError(err.response?.data?.error || err.message);
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Count how many parameters have values
  const filledCount = useMemo(() => {
    if (!registry || !registry.rules) return 0;
    return registry.rules.filter(r => {
      const v = values[r.mlKey];
      return v !== null && v !== undefined && v !== '';
    }).length;
  }, [registry, values]);

  if (loading) {
    return (
      <div className="bg-gray-800/30 border border-gray-700/40 rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-gray-700/50 rounded w-40" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-4">
        <p className="text-xs text-red-400">Failed to load ML parameter definitions: {fetchError}</p>
      </div>
    );
  }

  if (!registry || !registry.rules?.length) return null;

  return (
    <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-xl overflow-hidden">
      {/* Header / Toggle */}
      <button
        type="button"
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-700/20 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-sm font-semibold text-gray-200">ML Parameters</span>
          <span className="text-[10px] text-gray-500 bg-gray-800/60 px-2 py-0.5 rounded-full">
            v{registry.schemaVersion}
          </span>
          {filledCount > 0 && (
            <span className="text-[10px] text-indigo-400 bg-indigo-900/40 px-2 py-0.5 rounded-full">
              {filledCount}/{registry.rules.length} filled
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${collapsed ? '' : 'rotate-180'}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Collapsible body */}
      {!collapsed && (
        <div className="px-4 pb-4 pt-1">
          <p className="text-[10px] text-gray-500 mb-3">
            Validated at save time. Values here feed directly into ML export columns.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {registry.rules.map(rule => (
              <ParameterField
                key={rule.id}
                rule={rule}
                value={values[rule.mlKey] ?? ''}
                error={errors[rule.mlKey]}
                onChange={v => onChange(rule.mlKey, v)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Individual parameter field — renders based on rule.dataType ───────────────
function ParameterField({ rule, value, error, onChange }) {
  const { uiLabel, mlKey, dataType, allowedValues, uiMapping, description, required } = rule;

  // For boolean/categorical with uiMapping, render a dropdown
  if (uiMapping && Object.keys(uiMapping).length > 0) {
    // Find the display label for the current value (reverse lookup)
    const reverseMap = {};
    Object.entries(uiMapping).forEach(([label, mlVal]) => {
      // Multiple labels can map to the same value; only pick the first for display
      if (reverseMap[mlVal] === undefined) reverseMap[mlVal] = label;
    });

    return (
      <div>
        <label className={labelCls} title={description}>
          {uiLabel} {required && <span className="text-red-400">*</span>}
        </label>
        <select
          className={selectCls}
          value={value ?? ''}
          onChange={e => {
            const selected = e.target.value;
            if (selected === '') return onChange('');
            // Map display label → ML value
            const mlVal = uiMapping[selected];
            onChange(mlVal !== undefined ? mlVal : selected);
          }}
        >
          <option value="">—</option>
          {Object.keys(uiMapping).map(label => (
            <option key={label} value={label}>{label}</option>
          ))}
        </select>
        {description && <p className="text-[10px] text-gray-600 mt-0.5">{description}</p>}
        {error && <p className="text-[10px] text-red-400 mt-0.5">{error}</p>}
      </div>
    );
  }

  // For categorical with allowedValues (no uiMapping), render a dropdown of raw values
  if (dataType === 'categorical' && allowedValues) {
    return (
      <div>
        <label className={labelCls} title={description}>
          {uiLabel} {required && <span className="text-red-400">*</span>}
        </label>
        <select
          className={selectCls}
          value={value ?? ''}
          onChange={e => {
            const v = e.target.value;
            if (v === '') return onChange('');
            // Try to parse as number if the allowed values are numeric
            const num = parseFloat(v);
            onChange(!isNaN(num) ? num : v);
          }}
        >
          <option value="">—</option>
          {allowedValues.map(v => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
        {description && <p className="text-[10px] text-gray-600 mt-0.5">{description}</p>}
        {error && <p className="text-[10px] text-red-400 mt-0.5">{error}</p>}
      </div>
    );
  }

  // For numeric
  if (dataType === 'numeric') {
    return (
      <div>
        <label className={labelCls} title={description}>
          {uiLabel} {required && <span className="text-red-400">*</span>}
        </label>
        <input
          type="number"
          step="any"
          className={inputCls}
          placeholder={description || mlKey}
          value={value ?? ''}
          onChange={e => {
            const raw = e.target.value;
            if (raw === '') return onChange('');
            const num = parseFloat(raw);
            onChange(!isNaN(num) ? num : raw);
          }}
        />
        {error && <p className="text-[10px] text-red-400 mt-0.5">{error}</p>}
      </div>
    );
  }

  // For time
  if (dataType === 'time') {
    return (
      <div>
        <label className={labelCls} title={description}>
          {uiLabel} {required && <span className="text-red-400">*</span>}
        </label>
        <input
          type="time"
          className={inputCls}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        />
        {description && <p className="text-[10px] text-gray-600 mt-0.5">{description}</p>}
        {error && <p className="text-[10px] text-red-400 mt-0.5">{error}</p>}
      </div>
    );
  }

  // For boolean without uiMapping
  if (dataType === 'boolean') {
    return (
      <div>
        <label className={labelCls} title={description}>
          {uiLabel} {required && <span className="text-red-400">*</span>}
        </label>
        <select
          className={selectCls}
          value={value ?? ''}
          onChange={e => {
            const v = e.target.value;
            if (v === '') return onChange('');
            onChange(parseInt(v, 10));
          }}
        >
          <option value="">—</option>
          <option value="1">Yes (1)</option>
          <option value="0">No (0)</option>
        </select>
        {description && <p className="text-[10px] text-gray-600 mt-0.5">{description}</p>}
        {error && <p className="text-[10px] text-red-400 mt-0.5">{error}</p>}
      </div>
    );
  }

  // Fallback: free text / categorical without constraints
  return (
    <div>
      <label className={labelCls} title={description}>
        {uiLabel} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type="text"
        className={inputCls}
        placeholder={description || mlKey}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
      />
      {error && <p className="text-[10px] text-red-400 mt-0.5">{error}</p>}
    </div>
  );
}
