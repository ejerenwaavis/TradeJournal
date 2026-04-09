import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { ICT_TAGS } from '../utils/ictTags';
import { PlusIcon, TrashIcon, PencilIcon, ChevronDownIcon, ChevronUpIcon, Bars3Icon, LightBulbIcon, PhotoIcon, DocumentDuplicateIcon, LinkIcon, XMarkIcon, BookOpenIcon } from '@heroicons/react/24/outline';

// ── constants ────────────────────────────────────────────────────────────────
const SESSIONS = ['Asia', 'London', 'New York', 'London-NY Overlap'];
const OUTCOMES  = ['Textbook', 'Partial', 'Failed', 'Pending'];
const BIASES    = ['Bullish', 'Bearish', 'Neutral'];
const COLORS = ['#6366f1','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#10b981','#ef4444','#3b82f6','#f97316'];
const MACRO_WINDOWS = ['7:30','7:50','8:10','8:30','8:50'];

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

              {/* Mechanics Stats */}
              {(data.sweepTypeBreakdown || data.targetReachedRate != null || data.returnToPDRate != null || data.mssDirectionBreakdown || data.macroWindowFrequency) && (
                <div>
                  <SectionHeading>Mechanics Stats</SectionHeading>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {data.targetReachedRate != null && <StatBlock label="Target Reached" value={`${data.targetReachedRate}%`} />}
                      {data.returnToPDRate != null && <StatBlock label="Returned to PD" value={`${data.returnToPDRate}%`} />}
                    </div>
                    {data.sweepTypeBreakdown && Object.keys(data.sweepTypeBreakdown).length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1.5">Sweep Type</p>
                        <div className="flex gap-2 flex-wrap">
                          {Object.entries(data.sweepTypeBreakdown).map(([k, v]) => (
                            <span key={k} className="text-xs bg-gray-800 border border-gray-700 rounded-full px-3 py-1 text-gray-300">{k}: <span className="font-semibold">{v}</span></span>
                          ))}
                        </div>
                      </div>
                    )}
                    {data.mssDirectionBreakdown && Object.keys(data.mssDirectionBreakdown).length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1.5">MSS Direction</p>
                        <div className="flex gap-2 flex-wrap">
                          {Object.entries(data.mssDirectionBreakdown).map(([k, v]) => (
                            <span key={k} className={`text-xs bg-gray-800 border border-gray-700 rounded-full px-3 py-1 ${k === 'Bullish MSS' ? 'text-emerald-400' : 'text-rose-400'}`}>{k}: <span className="font-semibold">{v}</span></span>
                          ))}
                        </div>
                      </div>
                    )}
                    {data.macroWindowFrequency && Object.keys(data.macroWindowFrequency).length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1.5">Macro Windows</p>
                        <div className="space-y-1.5">
                          {Object.entries(data.macroWindowFrequency).slice(0, 8).map(([w, { count, pct }]) => (
                            <div key={w} className="flex items-center gap-3">
                              <span className="text-xs text-gray-400 w-36 shrink-0 truncate">{w}</span>
                              <div className="flex-1 bg-gray-800 rounded-full h-2">
                                <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-gray-400 w-12 text-right">{pct}% ({count})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Master Rules Adherence */}
              {data.masterRulesAdherence != null && (
                <div>
                  <SectionHeading>Rule Adherence</SectionHeading>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-400">Setups matching master rules</span>
                      <span className="text-sm font-bold text-gray-100">{data.masterRulesAdherence}%</span>
                    </div>
                    <div className="bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${data.masterRulesAdherence >= 80 ? 'bg-emerald-500' : data.masterRulesAdherence >= 50 ? 'bg-yellow-500' : 'bg-rose-500'}`}
                        style={{ width: `${data.masterRulesAdherence}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Top Discoveries */}
              {data.topDiscoveries?.length > 0 && (
                <div>
                  <SectionHeading>Top Discoveries</SectionHeading>
                  <div className="space-y-1.5">
                    {data.topDiscoveries.slice(0, 5).map(({ text, count }) => (
                      <div key={text} className="flex items-start gap-2 bg-gray-800 rounded-lg px-3 py-2">
                        <span className="text-yellow-400 shrink-0 text-sm mt-0.5">◆</span>
                        <span className="text-xs text-gray-300 flex-1 break-words">{text}</span>
                        <span className="text-xs text-gray-500 shrink-0">{count}×</span>
                      </div>
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
// Per-trade fields (one per opportunity)
const BLANK_OPPORTUNITY = {
  bias: '', timeOfTrade: '', outcome: '', maxRun: '',
  entryTrigger: '', pdArrayLevel: '', returnToPD: false, closeBelowCE: false,
  targetLevel: '', stalledAt: '', reachedTarget: false,
  entryLevel: '', stopLevel: '', rMultiple: '', mfe: '', mae: '',
  confluences: [],
};

const OPP_KEYS = Object.keys(BLANK_OPPORTUNITY);

const BLANK_SETUP = {
  title: '', tvLink: '', chartImageUrl: '', chartImages: [],
  setupRules: [{ text: '', subs: [] }],
  confluences: [], session: '', narrative: '', notes: '', news: '',
  newsEntries: [],
  macroWindows: [],
  liquiditySwept: [], sweepType: '', sweepDirection: '', targetLiquidity: '', liquidityQuality: '',
  pdArray: '', mssDirection: '', mssTime: '', engineeredLiq: false,
  discoveries: [], events: [],
  opportunities: [{ ...BLANK_OPPORTUNITY }],
};

function SetupForm({ topicId, topicMasterRules, topic, initial, onSave, onCancel }) {
  const topicMacroWindows = topic?.macroWindows || [];
  const studyParams = topic?.studyParameters || { showLiquidity: true, showMarketStructure: true, showPDArray: true };

  const baseRules = topicMasterRules?.length
    ? topicMasterRules.map(r => {
        const rObj = typeof r === 'string' ? { text: r, subs: [], scenarios: [] } : r;
        const scenarios = (rObj.scenarios || []).filter(s => s.name?.trim());
        const defaultScenarios = scenarios.length
          ? scenarios.map(s => ({ name: s.name, observations: [{ time: '', note: '' }] }))
          : [{ name: 'Default', observations: [{ time: '', note: '' }] }];
        const subs = (rObj.subs || []).map(sub => {
          const subObj = typeof sub === 'string' ? { text: sub, scenarios: [] } : sub;
          const subScenarios = (subObj.scenarios || []).filter(s => s.name?.trim());
          return {
            text: subObj.text ?? '',
            scenarios: subScenarios.length
              ? subScenarios.map(s => ({ name: s.name, observations: [{ time: '', note: '' }] }))
              : [{ name: 'Default', observations: [{ time: '', note: '' }] }],
          };
        });
        return { text: rObj.text ?? '', subs, isMasterRule: true, checked: false, scenarios: defaultScenarios };
      })
    : [{ text: '', subs: [], isMasterRule: false, checked: false, scenarios: [{ name: 'Default', observations: [{ time: '', note: '' }] }] }];

  // Migrate legacy per-trade fields into opportunities[0] for older setups
  const migrateOpps = (s) => {
    if (s.opportunities?.length) return s.opportunities.map(o => ({ ...BLANK_OPPORTUNITY, ...o, maxRun: o.maxRun ?? '', mfe: o.mfe ?? '', mae: o.mae ?? '', rMultiple: o.rMultiple ?? '', entryLevel: o.entryLevel ?? '', stopLevel: o.stopLevel ?? '' }));
    const opp = {};
    OPP_KEYS.forEach(k => { if (s[k] != null && s[k] !== '' && s[k] !== false) opp[k] = s[k]; });
    return Object.keys(opp).length ? [{ ...BLANK_OPPORTUNITY, ...opp }] : [{ ...BLANK_OPPORTUNITY }];
  };

  const [form, setForm] = useState(initial ? {
    ...initial,
    setupRules: (initial.setupRules?.length
      ? initial.setupRules.map(r => {
          if (typeof r === 'string') return { text: r, subs: [], isMasterRule: false, checked: false, scenarios: [{ name: 'Default', observations: [{ time: '', note: '' }] }] };
          // Migrate legacy observations → scenarios
          const existingScenarios = r.scenarios?.length ? r.scenarios : null;
          const legacyObs = r.observations?.length ? r.observations : (r.playedAt || r.comment) ? [{ time: r.playedAt || '', note: r.comment || '' }] : [{ time: '', note: '' }];
          const scenarios = existingScenarios || [{ name: 'Default', observations: legacyObs }];
          // Migrate subs: strings → objects (only for master rules)
          const subs = (r.subs || []).map(sub => {
            if (!r.isMasterRule) return sub; // keep strings for free rules
            if (typeof sub === 'string') return { text: sub, scenarios: [{ name: 'Default', observations: [{ time: '', note: '' }] }] };
            return {
              text: sub.text ?? '',
              scenarios: sub.scenarios?.length
                ? sub.scenarios.map(s => ({ ...s, observations: s.observations?.length ? s.observations : [{ time: '', note: '' }] }))
                : [{ name: 'Default', observations: [{ time: '', note: '' }] }],
            };
          });
          return { text: r.text ?? '', subs, isMasterRule: r.isMasterRule ?? false, checked: r.checked ?? false, scenarios };
        })
      : baseRules),
    chartImages: initial.chartImages?.length
      ? initial.chartImages
      : (initial.chartImageUrl ? [{ url: initial.chartImageUrl, caption: '' }] : []),
    discoveries: initial.discoveries ?? [],
    events: initial.events ?? [],
    newsEntries: initial.newsEntries?.length ? initial.newsEntries : (initial.news ? [{ time: '', severity: '', description: initial.news }] : []),
    liquidityQuality: initial.liquidityQuality ?? '',
    macroWindows: initial.macroWindows ?? [],
    liquiditySwept: initial.liquiditySwept ?? [],
    sweepType: initial.sweepType ?? '',
    sweepDirection: initial.sweepDirection ?? '',
    targetLiquidity: initial.targetLiquidity ?? '',
    pdArray: initial.pdArray ?? '',
    mssDirection: initial.mssDirection ?? '',
    mssTime: initial.mssTime ?? '',
    engineeredLiq: initial.engineeredLiq ?? false,
    session: initial.session ?? '',
    opportunities: migrateOpps(initial),
  } : { ...BLANK_SETUP, setupRules: baseRules, chartImages: [], newsEntries: [] });
  const [activeOpp, setActiveOpp] = useState(0);
  const [activeScenarios, setActiveScenarios] = useState({}); // { ruleIndex: scenarioIndex }
  const [activeSubScenarios, setActiveSubScenarios] = useState({}); // { 'ri-si': scenarioIndex }
  const [liqInput, setLiqInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [obsUploadingKey, setObsUploadingKey] = useState(null);
  const [obsLinkKey, setObsLinkKey] = useState(null); // which obs has link input open
  const [obsLinkUrls, setObsLinkUrls] = useState({}); // { '${ri}-${oi}': url }
  const fileRef = useRef();
  const obsFileRefs = useRef({});
  const discRefs = useRef({});

  // Opportunity helpers
  const opp = form.opportunities[activeOpp] || BLANK_OPPORTUNITY;
  const setOpp = (field) => (e) => setForm(f => {
    const opps = [...f.opportunities];
    opps[activeOpp] = { ...opps[activeOpp], [field]: e.target.value };
    return { ...f, opportunities: opps };
  });
  const toggleOpp = (field) => () => setForm(f => {
    const opps = [...f.opportunities];
    opps[activeOpp] = { ...opps[activeOpp], [field]: !opps[activeOpp][field] };
    return { ...f, opportunities: opps };
  });
  const setOppField = (field, value) => setForm(f => {
    const opps = [...f.opportunities];
    opps[activeOpp] = { ...opps[activeOpp], [field]: value };
    return { ...f, opportunities: opps };
  });
  const addOpportunity = () => {
    setForm(f => ({ ...f, opportunities: [...f.opportunities, { ...BLANK_OPPORTUNITY }] }));
    setActiveOpp(form.opportunities.length);
  };
  const removeOpportunity = (idx) => {
    if (form.opportunities.length <= 1) return;
    setForm(f => ({ ...f, opportunities: f.opportunities.filter((_, i) => i !== idx) }));
    setActiveOpp(prev => Math.min(prev, form.opportunities.length - 2));
  };

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const toggleConfluence = (c) => setForm((f) => {
    const opps = [...f.opportunities];
    const cur = opps[activeOpp]?.confluences || [];
    opps[activeOpp] = { ...opps[activeOpp], confluences: cur.includes(c) ? cur.filter(x => x !== c) : [...cur, c] };
    return { ...f, opportunities: opps };
  });

  const ruleInputRefs = useRef({});

  const addRule = (afterIndex) => setForm((f) => {
    const r = [...f.setupRules];
    const at = afterIndex !== undefined ? afterIndex + 1 : r.length;
    r.splice(at, 0, { text: '', subs: [], isMasterRule: false, checked: false, comment: '', playedAt: '', observations: [{ time: '', note: '' }] });
    setTimeout(() => ruleInputRefs.current[`r-${at}`]?.focus(), 0);
    return { ...f, setupRules: r };
  });
  const updateRule = (i, fields) => setForm(f => { const r = [...f.setupRules]; r[i] = { ...r[i], ...fields }; return { ...f, setupRules: r }; });
  const setRule = (i, v) => setForm((f) => { const r = [...f.setupRules]; r[i] = { ...r[i], text: v }; return { ...f, setupRules: r }; });
  const addObs = (ri, si) => setForm(f => {
    const rules = [...f.setupRules];
    const scenarios = [...(rules[ri].scenarios || [])];
    const scIdx = si ?? 0;
    scenarios[scIdx] = { ...scenarios[scIdx], observations: [...(scenarios[scIdx]?.observations || []), { time: '', note: '' }] };
    rules[ri] = { ...rules[ri], scenarios };
    return { ...f, setupRules: rules };
  });
  const removeObs = (ri, si, oi) => setForm(f => {
    const rules = [...f.setupRules];
    const scenarios = [...(rules[ri].scenarios || [])];
    const scIdx = si ?? 0;
    const obs = (scenarios[scIdx]?.observations || []).filter((_, idx) => idx !== oi);
    scenarios[scIdx] = { ...scenarios[scIdx], observations: obs.length ? obs : [{ time: '', note: '' }] };
    rules[ri] = { ...rules[ri], scenarios };
    return { ...f, setupRules: rules };
  });
  const updateObs = (ri, si, oi, field, value) => setForm(f => {
    const rules = [...f.setupRules];
    const scenarios = [...(rules[ri].scenarios || [])];
    const scIdx = si ?? 0;
    const obs = [...(scenarios[scIdx]?.observations || [])];
    obs[oi] = { ...obs[oi], [field]: value };
    scenarios[scIdx] = { ...scenarios[scIdx], observations: obs };
    rules[ri] = { ...rules[ri], scenarios };
    return { ...f, setupRules: rules };
  });
  const removeRule = (i) => setForm((f) => {
    if (f.setupRules.length <= 1) return f;
    const r = f.setupRules.filter((_, idx) => idx !== i);
    setTimeout(() => ruleInputRefs.current[`r-${Math.max(0, i - 1)}`]?.focus(), 0);
    return { ...f, setupRules: r };
  });
  const moveRule  = (from, to) => setForm((f) => { const r = [...f.setupRules]; const [m] = r.splice(from, 1); r.splice(to, 0, m); return { ...f, setupRules: r }; });

  const addSub = (ri, afterIdx) => setForm((f) => {
    const rules = [...f.setupRules];
    const subs = [...(rules[ri].subs || [])];
    const at = afterIdx !== undefined ? afterIdx + 1 : subs.length;
    subs.splice(at, 0, '');
    rules[ri] = { ...rules[ri], subs };
    setTimeout(() => ruleInputRefs.current[`s-${ri}-${at}`]?.focus(), 0);
    return { ...f, setupRules: rules };
  });
  const setSub = (ri, si, v) => setForm((f) => {
    const rules = [...f.setupRules]; const subs = [...(rules[ri].subs || [])];
    subs[si] = v; rules[ri] = { ...rules[ri], subs }; return { ...f, setupRules: rules };
  });
  const removeSub = (ri, si) => setForm((f) => {
    const rules = [...f.setupRules];
    const subs = (rules[ri].subs || []).filter((_, idx) => idx !== si);
    rules[ri] = { ...rules[ri], subs };
    setTimeout(() => ruleInputRefs.current[subs.length ? `s-${ri}-${Math.max(0, si - 1)}` : `r-${ri}`]?.focus(), 0);
    return { ...f, setupRules: rules };
  });

  const dragRuleIndex = useRef(null);
  const dragOverRuleIndex = useRef(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  // Obs drag state — keyed per rule index
  const dragObsRuleIndex = useRef(null);
  const dragObsFrom = useRef(null);
  const dragObsOver = useRef(null);
  const [dragObsOverKey, setDragObsOverKey] = useState(null); // `${ri}-${oi}`

  const moveObs = (ri, si, from, to) => setForm(f => {
    const rules = [...f.setupRules];
    const scenarios = [...(rules[ri].scenarios || [])];
    const scIdx = si ?? 0;
    const obs = [...(scenarios[scIdx]?.observations || [])];
    const [m] = obs.splice(from, 1);
    obs.splice(to, 0, m);
    scenarios[scIdx] = { ...scenarios[scIdx], observations: obs };
    rules[ri] = { ...rules[ri], scenarios };
    return { ...f, setupRules: rules };
  });

  const obsNoteRefs = useRef({});

  // Sub-rule observation handlers (ri=ruleIdx, si=subIdx, sci=scenarioIdx, oi=obsIdx)
  const addSubObs = (ri, si, sci) => setForm(f => {
    const rules = [...f.setupRules];
    const subs = [...(rules[ri].subs || [])];
    const sub = { ...subs[si] };
    const scenarios = [...(sub.scenarios || [])];
    const obs = [...(scenarios[sci]?.observations || []), { time: '', note: '' }];
    scenarios[sci] = { ...scenarios[sci], observations: obs };
    subs[si] = { ...sub, scenarios };
    rules[ri] = { ...rules[ri], subs };
    return { ...f, setupRules: rules };
  });
  const removeSubObs = (ri, si, sci, oi) => setForm(f => {
    const rules = [...f.setupRules];
    const subs = [...(rules[ri].subs || [])];
    const sub = { ...subs[si] };
    const scenarios = [...(sub.scenarios || [])];
    const obs = (scenarios[sci]?.observations || []).filter((_, idx) => idx !== oi);
    scenarios[sci] = { ...scenarios[sci], observations: obs.length ? obs : [{ time: '', note: '' }] };
    subs[si] = { ...sub, scenarios };
    rules[ri] = { ...rules[ri], subs };
    return { ...f, setupRules: rules };
  });
  const updateSubObs = (ri, si, sci, oi, field, value) => setForm(f => {
    const rules = [...f.setupRules];
    const subs = [...(rules[ri].subs || [])];
    const sub = { ...subs[si] };
    const scenarios = [...(sub.scenarios || [])];
    const obs = [...(scenarios[sci]?.observations || [])];
    obs[oi] = { ...obs[oi], [field]: value };
    scenarios[sci] = { ...scenarios[sci], observations: obs };
    subs[si] = { ...sub, scenarios };
    rules[ri] = { ...rules[ri], subs };
    return { ...f, setupRules: rules };
  });

  const dragImgFrom = useRef(null);
  const dragImgOver = useRef(null);
  const [dragImgOverIdx, setDragImgOverIdx] = useState(null);
  const moveImg = (from, to) => setForm(f => {
    const imgs = [...f.chartImages];
    const [m] = imgs.splice(from, 1);
    imgs.splice(to, 0, m);
    return { ...f, chartImages: imgs };
  });

  const analyzeLink = async () => {
    if (!form.tvLink.trim()) { toast.error('Paste a TradingView link first'); return; }
    setAnalyzing(true);
    try {
      const { data } = await api.post('/charts/analyze', { tvLink: form.tvLink.trim() });
      if (data.imageUrl) setForm((f) => ({ ...f, chartImages: [...(f.chartImages || []), { url: data.imageUrl, caption: '' }] }));
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
      if (data.imageUrl) setForm((f) => ({ ...f, chartImages: [...(f.chartImages || []), { url: data.imageUrl, caption: '' }] }));
      toast.success('Chart uploaded');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally { setAnalyzing(false); }
  };

  const uploadObsImage = async (ri, si, oi, file) => {
    const key = `${ri}-${si}-${oi}`;
    setObsUploadingKey(key);
    try {
      const fd = new FormData(); fd.append('chart', file);
      const { data } = await api.post('/charts/analyze-upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (data.imageUrl) {
        setForm(f => {
          const rules = [...f.setupRules];
          const scenarios = [...(rules[ri].scenarios || [])];
          const obs = [...(scenarios[si]?.observations || [])];
          const note = obs[oi]?.note || '';
          obs[oi] = { ...obs[oi], imageUrl: data.imageUrl };
          scenarios[si] = { ...scenarios[si], observations: obs };
          rules[ri] = { ...rules[ri], scenarios };
          return { ...f, setupRules: rules, chartImages: [...(f.chartImages || []), { url: data.imageUrl, caption: note }] };
        });
        toast.success('Image added');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally { setObsUploadingKey(null); }
  };

  const loadObsLink = async (ri, si, oi) => {
    const key = `${ri}-${si}-${oi}`;
    const url = (obsLinkUrls[key] || '').trim();
    if (!url) return;
    setObsUploadingKey(key);
    try {
      const { data } = await api.post('/charts/analyze', { tvLink: url });
      if (data.imageUrl) {
        setForm(f => {
          const rules = [...f.setupRules];
          const scenarios = [...(rules[ri].scenarios || [])];
          const obs = [...(scenarios[si]?.observations || [])];
          const note = obs[oi]?.note || '';
          obs[oi] = { ...obs[oi], imageUrl: data.imageUrl };
          scenarios[si] = { ...scenarios[si], observations: obs };
          rules[ri] = { ...rules[ri], scenarios };
          return { ...f, setupRules: rules, chartImages: [...(f.chartImages || []), { url: data.imageUrl, caption: note }] };
        });
        setObsLinkUrls(prev => { const n = { ...prev }; delete n[key]; return n; });
        setObsLinkKey(null);
        toast.success('Image loaded');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load link');
    } finally { setObsUploadingKey(null); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Clean opportunities — cast numbers, drop empties
      const cleanOpps = form.opportunities.map(o => ({
        ...o,
        maxRun: o.maxRun !== '' ? Number(o.maxRun) : undefined,
        mfe: o.mfe !== '' ? Number(o.mfe) : undefined,
        mae: o.mae !== '' ? Number(o.mae) : undefined,
        rMultiple: o.rMultiple !== '' ? Number(o.rMultiple) : undefined,
        entryLevel: o.entryLevel !== '' ? Number(o.entryLevel) : undefined,
        stopLevel: o.stopLevel !== '' ? Number(o.stopLevel) : undefined,
      }));
      // Flatten first opportunity to top-level for backward compat
      const first = cleanOpps[0] || {};
      const payload = {
        ...form,
        topicId,
        setupRules: form.setupRules.filter(r => r.isMasterRule || r.text || r.subs?.some(Boolean)),
        discoveries: (form.discoveries || []).filter(d => d.text?.trim()),
        events: (form.events || []).filter(e => e.type || e.description?.trim()),
        newsEntries: (form.newsEntries || []).filter(e => e.description?.trim()),
        chartImages: (form.chartImages || []).filter(img => img.url?.trim()),
        chartImageUrl: form.chartImages?.[0]?.url || form.chartImageUrl || '',
        opportunities: cleanOpps,
        // Backward-compat: flatten confluences from first opportunity to top-level
        confluences: cleanOpps[0]?.confluences || [],
        // Backward-compat top-level fields from first opportunity
        bias: first.bias, timeOfTrade: first.timeOfTrade, outcome: first.outcome,
        maxRun: first.maxRun, entryTrigger: first.entryTrigger, pdArrayLevel: first.pdArrayLevel,
        returnToPD: first.returnToPD, closeBelowCE: first.closeBelowCE,
        targetLevel: first.targetLevel, stalledAt: first.stalledAt, reachedTarget: first.reachedTarget,
        entryLevel: first.entryLevel, stopLevel: first.stopLevel,
        rMultiple: first.rMultiple, mfe: first.mfe, mae: first.mae,
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

      {/* Chart Images */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-400">Chart Images</label>
        <div className="flex gap-2">
          <input type="url" placeholder="https://www.tradingview.com/x/…" value={form.tvLink} onChange={set('tvLink')} onKeyDown={(e) => e.key === 'Enter' && analyzeLink()} className={`${inputCls} flex-1`} />
          <button onClick={analyzeLink} disabled={analyzing} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap">
            {analyzing ? 'Loading…' : 'Load'}
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>or</span>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={analyzing} className="text-indigo-400 hover:underline">upload screenshot</button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files[0]) analyzeUpload(e.target.files[0]); e.target.value = ''; }} />
          {(form.chartImages?.length > 0) && <span className="ml-auto text-gray-600">{form.chartImages.length} image{form.chartImages.length !== 1 ? 's' : ''}</span>}
        </div>
        {(form.chartImages?.length > 0) && (
          <div className="grid grid-cols-2 gap-2">
            {form.chartImages.map((img, idx) => (
              <div
                key={idx}
                draggable
                onDragStart={() => { dragImgFrom.current = idx; }}
                onDragEnter={() => { dragImgOver.current = idx; setDragImgOverIdx(idx); }}
                onDragOver={(e) => e.preventDefault()}
                onDragEnd={() => {
                  if (dragImgFrom.current !== null && dragImgOver.current !== null && dragImgFrom.current !== dragImgOver.current) {
                    moveImg(dragImgFrom.current, dragImgOver.current);
                  }
                  dragImgFrom.current = null; dragImgOver.current = null; setDragImgOverIdx(null);
                }}
                className={`rounded-lg border overflow-hidden bg-gray-800 transition-colors ${dragImgOverIdx === idx ? 'border-indigo-500' : 'border-gray-700'}`}
              >
                <div className="relative">
                  <img src={img.url} alt={`chart ${idx + 1}`} className="w-full h-28 object-cover" />
                  <div className="absolute top-1.5 left-1.5 bg-black/60 rounded px-1.5 py-0.5 flex items-center gap-1 cursor-grab active:cursor-grabbing">
                    <Bars3Icon className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-400 font-medium">{idx + 1}</span>
                  </div>
                </div>
                <div className="flex gap-2 p-2 items-center border-t border-gray-700">
                  <input
                    type="text"
                    value={img.caption || ''}
                    onChange={(e) => {
                      const imgs = [...form.chartImages];
                      imgs[idx] = { ...imgs[idx], caption: e.target.value };
                      setForm(f => ({ ...f, chartImages: imgs }));
                    }}
                    placeholder="Caption (optional)…"
                    className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button type="button" onClick={() => setForm(f => ({ ...f, chartImages: f.chartImages.filter((_, i) => i !== idx) }))} className="text-gray-600 hover:text-rose-400 transition-colors">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Setup Rules */}
      <div className="space-y-4">

        {/* ── Core Rules Checklist (from master rules, locked text) ─────── */}
        {form.setupRules.some(r => r.isMasterRule) && (
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Core Rules Checklist</label>
            <p className="text-xs text-gray-600 mb-2">Tick each rule that played out. Toggle between scenario tabs to log observations for different outcomes.</p>
            <div className="space-y-2">
              {form.setupRules
                .map((rule, i) => ({ rule, i }))
                .filter(({ rule }) => rule.isMasterRule)
                .map(({ rule, i }, idx) => {
                  const scenarios = rule.scenarios || [{ name: 'Default', observations: [{ time: '', note: '' }] }];
                  const activeSi = activeScenarios[i] ?? 0;
                  const activeScenario = scenarios[activeSi] || scenarios[0];
                  const hasMultipleScenarios = scenarios.length > 1 || (scenarios.length === 1 && scenarios[0].name !== 'Default');

                  return (
                  <div key={i} className={`border rounded-xl p-3 transition-colors ${rule.checked ? 'border-emerald-800 bg-emerald-950/20' : 'border-gray-700 bg-gray-800/40'}`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={rule.checked || false}
                        onChange={(e) => updateRule(i, { checked: e.target.checked })}
                        className="mt-1 w-4 h-4 cursor-pointer accent-emerald-500 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-1.5">
                          <span className="text-xs text-gray-600 shrink-0 mt-0.5">{idx + 1}.</span>
                          <p className={`text-sm leading-snug ${rule.checked ? 'text-emerald-300' : 'text-gray-300'}`}>{rule.text}</p>
                        </div>
                        {(rule.subs || []).filter(sub => typeof sub === 'string' ? sub : sub?.text).map((sub, j) => {
                          const subObj = typeof sub === 'string' ? { text: sub, scenarios: [{ name: 'Default', observations: [{ time: '', note: '' }] }] } : sub;
                          const subScenarios = subObj.scenarios?.length ? subObj.scenarios : [{ name: 'Default', observations: [{ time: '', note: '' }] }];
                          const activeSubSci = activeSubScenarios[`${i}-${j}`] ?? 0;
                          const activeSubScenario = subScenarios[activeSubSci] || subScenarios[0];
                          const hasMultipleSubSc = subScenarios.length > 1 || (subScenarios.length === 1 && subScenarios[0].name !== 'Default');
                          return (
                            <div key={j} className="ml-3 mt-2 border-l-2 border-gray-700/40 pl-2">
                              <div className="flex gap-2 items-baseline">
                                <span className="text-xs text-indigo-500 shrink-0 select-none font-medium">{String.fromCharCode(97 + j)}.</span>
                                <span className="text-xs text-gray-500 leading-relaxed">{subObj.text}</span>
                              </div>
                              {hasMultipleSubSc && (
                                <div className="mt-1 flex gap-1 flex-wrap">
                                  {subScenarios.map((sc, sci) => (
                                    <button key={sci} type="button"
                                      onClick={() => setActiveSubScenarios(prev => ({ ...prev, [`${i}-${j}`]: sci }))}
                                      className={`text-xs px-2 py-0.5 rounded-lg font-medium transition-colors ${activeSubSci === sci ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-gray-200'}`}
                                    >
                                      {sc.name || `Scenario ${sci + 1}`}
                                    </button>
                                  ))}
                                </div>
                              )}
                              <div className="mt-1 space-y-1">
                                {(activeSubScenario.observations || [{ time: '', note: '' }]).map((obs, oi) => (
                                  <div key={oi} className="flex gap-1.5 items-center">
                                    <input type="time" value={obs.time || ''} onChange={(e) => updateSubObs(i, j, activeSubSci, oi, 'time', e.target.value)}
                                      className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 shrink-0" />
                                    <input type="text" value={obs.note || ''} onChange={(e) => updateSubObs(i, j, activeSubSci, oi, 'note', e.target.value)}
                                      placeholder="What happened…" className={`${inputCls} text-xs flex-1`} />
                                    {(activeSubScenario.observations || []).length > 1 && (
                                      <button type="button" onClick={() => removeSubObs(i, j, activeSubSci, oi)} className="text-gray-600 hover:text-rose-400 shrink-0 transition-colors"><TrashIcon className="w-3 h-3" /></button>
                                    )}
                                  </div>
                                ))}
                                <button type="button" onClick={() => addSubObs(i, j, activeSubSci)} className="text-xs text-indigo-400 hover:underline">+ obs</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Scenario tabs */}
                    {hasMultipleScenarios && (
                      <div className="ml-7 mt-2 flex gap-1 flex-wrap">
                        {scenarios.map((sc, si) => (
                          <button
                            key={si}
                            type="button"
                            onClick={() => setActiveScenarios(prev => ({ ...prev, [i]: si }))}
                            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${activeSi === si ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-gray-200'}`}
                          >
                            {sc.name || `Scenario ${si + 1}`}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="ml-7 mt-2 space-y-1">
                      {(activeScenario.observations || [{ time: '', note: '' }]).map((obs, oi) => {
                        const obsKey = `${i}-${activeSi}-${oi}`;
                        const isUploading = obsUploadingKey === obsKey;
                        return (
                          <div key={oi} className="space-y-1">
                            <div
                              draggable
                              onDragStart={() => { dragObsRuleIndex.current = i; dragObsFrom.current = oi; }}
                              onDragEnter={() => { dragObsOver.current = oi; setDragObsOverKey(obsKey); }}
                              onDragOver={(e) => e.preventDefault()}
                              onDragEnd={() => {
                                if (dragObsRuleIndex.current === i && dragObsFrom.current !== null && dragObsOver.current !== null && dragObsFrom.current !== dragObsOver.current) {
                                  moveObs(i, activeSi, dragObsFrom.current, dragObsOver.current);
                                }
                                dragObsRuleIndex.current = null; dragObsFrom.current = null; dragObsOver.current = null; setDragObsOverKey(null);
                              }}
                              className={`flex gap-1.5 items-center rounded-lg transition-colors ${dragObsOverKey === obsKey ? 'bg-indigo-950/60 border border-indigo-700' : 'border border-transparent'}`}
                            >
                              <span className="text-gray-700 cursor-grab active:cursor-grabbing shrink-0 hover:text-gray-500 transition-colors px-0.5">
                                <Bars3Icon className="w-3.5 h-3.5" />
                              </span>
                              <input
                                type="time"
                                value={obs.time || ''}
                                onChange={(e) => updateObs(i, activeSi, oi, 'time', e.target.value)}
                                className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 shrink-0"
                              />
                              <input
                                type="text"
                                value={obs.note || ''}
                                onChange={(e) => updateObs(i, activeSi, oi, 'note', e.target.value)}
                                placeholder="What happened…"
                                className={`${inputCls} text-xs flex-1`}
                                ref={(el) => { if (el) obsNoteRefs.current[obsKey] = el; else delete obsNoteRefs.current[obsKey]; }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addObs(i, activeSi);
                                    setTimeout(() => obsNoteRefs.current[`${i}-${activeSi}-${(activeScenario.observations?.length ?? 1)}`]?.focus(), 0);
                                  }
                                }}
                              />
                              <button
                                type="button"
                                disabled={isUploading}
                                onClick={() => obsFileRefs.current[obsKey]?.click()}
                                className={`shrink-0 transition-colors ${obs.imageUrl ? 'text-indigo-400 hover:text-indigo-300' : 'text-gray-600 hover:text-indigo-400'} disabled:opacity-40`}
                                title={obs.imageUrl ? 'Replace image (upload)' : 'Attach screenshot'}
                              >
                                {isUploading
                                  ? <span className="text-xs text-indigo-400 animate-pulse">…</span>
                                  : <PhotoIcon className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                disabled={isUploading}
                                onClick={() => setObsLinkKey(obsLinkKey === obsKey ? null : obsKey)}
                                className={`shrink-0 transition-colors ${obsLinkKey === obsKey ? 'text-indigo-400' : obs.imageUrl ? 'text-indigo-400 hover:text-indigo-300' : 'text-gray-600 hover:text-indigo-400'} disabled:opacity-40`}
                                title="Load from TradingView link"
                              >
                                <LinkIcon className="w-3.5 h-3.5" />
                              </button>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                ref={(el) => { if (el) obsFileRefs.current[obsKey] = el; else delete obsFileRefs.current[obsKey]; }}
                                onChange={(e) => { if (e.target.files[0]) { uploadObsImage(i, activeSi, oi, e.target.files[0]); e.target.value = ''; } }}
                              />
                              {(activeScenario.observations?.length > 1) && (
                                <button type="button" onClick={() => removeObs(i, activeSi, oi)} className="text-gray-600 hover:text-rose-400 shrink-0 transition-colors" title="Remove observation">
                                  <TrashIcon className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            {obsLinkKey === obsKey && (
                              <div className="ml-6 flex gap-2 items-center">
                                <input
                                  type="url"
                                  value={obsLinkUrls[obsKey] || ''}
                                  onChange={(e) => setObsLinkUrls(prev => ({ ...prev, [obsKey]: e.target.value }))}
                                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); loadObsLink(i, activeSi, oi); } }}
                                  placeholder="https://www.tradingview.com/x/…"
                                  className={`${inputCls} text-xs flex-1`}
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  disabled={isUploading || !obsLinkUrls[obsKey]?.trim()}
                                  onClick={() => loadObsLink(i, activeSi, oi)}
                                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap shrink-0"
                                >
                                  {isUploading ? 'Loading…' : 'Load'}
                                </button>
                                <button type="button" onClick={() => setObsLinkKey(null)} className="text-xs text-gray-500 hover:text-gray-300 shrink-0">✕</button>
                              </div>
                            )}
                            {obs.imageUrl && (
                              <div className="ml-6 flex items-start gap-2">
                                <img
                                  src={obs.imageUrl}
                                  alt="observation screenshot"
                                  className="w-32 h-20 object-cover rounded-lg border border-gray-700 cursor-zoom-in"
                                  onClick={() => window.open(obs.imageUrl, '_blank')}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const urlToRemove = obs.imageUrl;
                                    setForm(f => {
                                      const rules = [...f.setupRules];
                                      const scs = [...(rules[i].scenarios || [])];
                                      const obsArr = [...(scs[activeSi]?.observations || [])];
                                      obsArr[oi] = { ...obsArr[oi], imageUrl: '' };
                                      scs[activeSi] = { ...scs[activeSi], observations: obsArr };
                                      rules[i] = { ...rules[i], scenarios: scs };
                                      return { ...f, setupRules: rules, chartImages: f.chartImages.filter(img => img.url !== urlToRemove) };
                                    });
                                  }}
                                  className="text-xs text-gray-600 hover:text-rose-400 mt-1 transition-colors"
                                  title="Unlink and remove from gallery"
                                >
                                  ×
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => {
                          addObs(i, activeSi);
                          setTimeout(() => obsNoteRefs.current[`${i}-${activeSi}-${(activeScenario.observations?.length ?? 1)}`]?.focus(), 0);
                        }}
                        className="text-xs text-indigo-500 hover:text-indigo-400 transition-colors"
                      >
                        + Add observation
                      </button>
                    </div>
                  </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ── Additional Observations (free-form, editable) ─────────────── */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2">
            {form.setupRules.some(r => r.isMasterRule) ? 'Additional Observations' : 'Setup Rules / Entry Conditions'}
          </label>
          <div className="space-y-2">
            {form.setupRules
              .map((rule, i) => ({ rule, i }))
              .filter(({ rule }) => !rule.isMasterRule)
              .map(({ rule, i }, freeIdx) => (
                <div key={i}>
                  <div
                    draggable
                    onDragStart={() => { dragRuleIndex.current = i; }}
                    onDragEnter={() => { dragOverRuleIndex.current = i; setDragOverIdx(i); }}
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnd={() => {
                      if (dragRuleIndex.current !== null && dragOverRuleIndex.current !== null && dragRuleIndex.current !== dragOverRuleIndex.current) {
                        moveRule(dragRuleIndex.current, dragOverRuleIndex.current);
                      }
                      dragRuleIndex.current = null; dragOverRuleIndex.current = null; setDragOverIdx(null);
                    }}
                    className={`flex gap-2 items-center rounded-lg transition-colors ${
                      dragOverIdx === i ? 'bg-indigo-950/60 border border-indigo-700' : 'border border-transparent'
                    }`}
                  >
                    <span className="text-gray-600 cursor-grab active:cursor-grabbing shrink-0 px-1 py-2 hover:text-gray-400 transition-colors">
                      <Bars3Icon className="w-4 h-4" />
                    </span>
                    <span className="text-xs text-gray-600 w-5 text-right shrink-0">{freeIdx + 1}.</span>
                    <input
                      type="text"
                      value={rule.text}
                      onChange={(e) => setRule(i, e.target.value)}
                      placeholder="Observation…"
                      className={`${inputCls} flex-1`}
                      ref={(el) => { if (el) ruleInputRefs.current[`r-${i}`] = el; else delete ruleInputRefs.current[`r-${i}`]; }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); addRule(i); }
                        if (e.key === 'Backspace' && rule.text === '' && !rule.subs?.length) { e.preventDefault(); removeRule(i); }
                      }}
                    />
                    <button type="button" onClick={() => addSub(i)} className="text-gray-600 hover:text-indigo-400 shrink-0 transition-colors" title="Add sub-note">
                      <PlusIcon className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => removeRule(i)} className="text-rose-500 hover:text-rose-400 shrink-0"><TrashIcon className="w-4 h-4" /></button>
                  </div>
                  {(rule.subs || []).map((sub, j) => (
                    <div key={j} className="flex gap-2 items-center ml-10 mt-1">
                      <span className="text-xs text-indigo-500 shrink-0 select-none font-medium">{String.fromCharCode(97 + j)}.</span>
                      <input
                        type="text"
                        value={sub}
                        onChange={(e) => setSub(i, j, e.target.value)}
                        placeholder="Caveat or expected reaction…"
                        className="w-full bg-gray-800/60 border border-gray-700/60 rounded-md px-3 py-1.5 text-xs text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1"
                        ref={(el) => { if (el) ruleInputRefs.current[`s-${i}-${j}`] = el; else delete ruleInputRefs.current[`s-${i}-${j}`]; }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); addSub(i, j); }
                          if (e.key === 'Backspace' && sub === '') { e.preventDefault(); removeSub(i, j); }
                        }}
                      />
                      <button type="button" onClick={() => removeSub(i, j)} className="text-gray-600 hover:text-rose-400 shrink-0 transition-colors"><TrashIcon className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              ))}
            <button type="button" onClick={() => addRule()} className="text-xs text-indigo-400 hover:underline">+ Add observation</button>
          </div>
        </div>
      </div>

      {/* Discoveries — variable observations unique to this setup */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Discoveries / Variable Observations</label>
        <p className="text-xs text-gray-500 mb-2">What was unique about this setup? Press Enter to add.</p>
        <div className="space-y-1.5">
          {(form.discoveries || []).map((d, i) => (
            <div key={i} className="flex gap-2 items-center">
              <span className="text-yellow-500 shrink-0 text-sm">◆</span>
              <input
                type="text"
                value={d.text || ''}
                onChange={(e) => {
                  const disc = [...form.discoveries];
                  disc[i] = { ...disc[i], text: e.target.value };
                  setForm(f => ({ ...f, discoveries: disc }));
                }}
                placeholder="e.g. FVG was at 50% of the dealing range…"
                className={`${inputCls} flex-1`}
                ref={(el) => { if (el) discRefs.current[i] = el; else delete discRefs.current[i]; }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const disc = [...form.discoveries];
                    disc.splice(i + 1, 0, { text: '', promoted: false });
                    setForm(f => ({ ...f, discoveries: disc }));
                    setTimeout(() => discRefs.current[i + 1]?.focus(), 0);
                  }
                  if (e.key === 'Backspace' && !d.text) {
                    e.preventDefault();
                    setForm(f => ({ ...f, discoveries: f.discoveries.filter((_, idx) => idx !== i) }));
                    setTimeout(() => discRefs.current[Math.max(0, i - 1)]?.focus(), 0);
                  }
                }}
              />
              {d.promoted && <span className="text-xs text-emerald-400 shrink-0">✓ Rule</span>}
              <button type="button" onClick={() => setForm(f => ({ ...f, discoveries: f.discoveries.filter((_, idx) => idx !== i) }))} className="text-gray-600 hover:text-rose-400 shrink-0 transition-colors">
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setForm(f => ({ ...f, discoveries: [...(f.discoveries || []), { text: '', promoted: false }] }))} className="text-xs text-indigo-400 hover:underline">+ Add discovery</button>
        </div>
      </div>

      {/* ── Macro Windows ── */}
      {topicMacroWindows.length > 0 && (
        <div>
          <SectionHeading>Macro Windows Touched</SectionHeading>
          <p className="text-xs text-gray-500 mb-2">Select all macro windows that interacted with price in this setup</p>
          <div className="flex flex-wrap gap-1.5">
            {topicMacroWindows.map((w) => (
              <Chip key={w} label={w} active={form.macroWindows.includes(w)} onClick={() => setForm((f) => ({
                ...f,
                macroWindows: f.macroWindows.includes(w) ? f.macroWindows.filter((x) => x !== w) : [...f.macroWindows, w],
              }))} />
            ))}
          </div>
        </div>
      )}

      {/* ── Liquidity ── */}
      {studyParams.showLiquidity && (
      <div className="space-y-3">
        <SectionHeading>Liquidity</SectionHeading>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Liquidity Swept</label>
          <input
            type="text"
            value={liqInput}
            onChange={(e) => setLiqInput(e.target.value)}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ',') && liqInput.trim()) {
                e.preventDefault();
                const v = liqInput.trim().replace(/,$/, '');
                if (v && !form.liquiditySwept.includes(v)) setForm((f) => ({ ...f, liquiditySwept: [...f.liquiditySwept, v] }));
                setLiqInput('');
              }
            }}
            placeholder="e.g. 7:30 SSL, 2AM SSL — press Enter to add"
            className={inputCls}
          />
          {form.liquiditySwept.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.liquiditySwept.map((tag) => (
                <span key={tag} className="text-xs bg-indigo-950 text-indigo-300 border border-indigo-900 px-2 py-0.5 rounded-full flex items-center gap-1">
                  {tag}
                  <button type="button" onClick={() => setForm((f) => ({ ...f, liquiditySwept: f.liquiditySwept.filter((x) => x !== tag) }))} className="text-indigo-400 hover:text-rose-400 leading-none">×</button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Sweep Type</label>
          <div className="flex gap-2 flex-wrap">
            {['Wick Sweep', 'Body Sweep', 'Both'].map((t) => (
              <Chip key={t} label={t} active={form.sweepType === t} onClick={() => setForm((f) => ({ ...f, sweepType: f.sweepType === t ? '' : t }))} />
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Sweep Direction</label>
          <div className="flex gap-2 flex-wrap">
            {['Sellside Taken', 'Buyside Taken'].map((d) => (
              <Chip key={d} label={d} active={form.sweepDirection === d} onClick={() => setForm((f) => ({ ...f, sweepDirection: f.sweepDirection === d ? '' : d }))} />
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Target Liquidity</label>
          <input type="text" value={form.targetLiquidity} onChange={set('targetLiquidity')} placeholder="e.g. Major BSL / 37.5% OVNR level" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Liquidity Quality</label>
          <div className="flex gap-2 flex-wrap">
            {['Minor', 'Major'].map((q) => (
              <Chip key={q} label={q} active={form.liquidityQuality === q} onClick={() => setForm((f) => ({ ...f, liquidityQuality: f.liquidityQuality === q ? '' : q }))} />
            ))}
          </div>
        </div>
      </div>
      )}

      {/* ── PD Array (shared context) ── */}
      {studyParams.showPDArray && (
      <div>
        <SectionHeading>PD Array</SectionHeading>
        <input type="text" value={form.pdArray} onChange={set('pdArray')} placeholder="e.g. 1st Presented FVG, Breaker OB" className={inputCls} />
      </div>
      )}

      {/* ── Market Structure ── */}
      {studyParams.showMarketStructure && (
      <div className="space-y-3">
        <SectionHeading>Market Structure</SectionHeading>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">MSS Direction</label>
          <div className="flex gap-2 flex-wrap">
            {['Bullish MSS', 'Bearish MSS'].map((d) => (
              <Chip key={d} label={d} active={form.mssDirection === d} onClick={() => setForm((f) => ({ ...f, mssDirection: f.mssDirection === d ? '' : d }))} />
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">MSS Candle Time</label>
          <input type="time" value={form.mssTime} onChange={set('mssTime')} className={inputCls} />
        </div>
        <div>
          <Chip label="Engineered Liquidity Present" active={form.engineeredLiq} onClick={() => setForm((f) => ({ ...f, engineeredLiq: !f.engineeredLiq }))} />
        </div>
      </div>
      )}

      {/* ── Session (shared) ── */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Session</label>
        <select value={form.session} onChange={set('session')} className={selectCls}>
          <option value="">—</option>
          {SESSIONS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* ══ Trade Opportunities ══════════════════════════════════════════ */}
      <div className="space-y-3">
        <SectionHeading>Trade Opportunities</SectionHeading>
        {form.opportunities.length > 1 && (
          <div className="flex gap-1.5 flex-wrap">
            {form.opportunities.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveOpp(idx)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${activeOpp === idx ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}
              >
                Opportunity {idx + 1}
              </button>
            ))}
          </div>
        )}

        {/* Active opportunity fields */}
        <div className="border border-gray-700/60 rounded-xl p-4 space-y-4 bg-gray-800/20">
          {form.opportunities.length > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-indigo-300">Opportunity {activeOpp + 1}</p>
              <button type="button" onClick={() => removeOpportunity(activeOpp)} className="text-xs text-rose-500 hover:text-rose-400">Remove</button>
            </div>
          )}

          {/* Bias + Time + Outcome row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Bias</label>
              <select value={opp.bias} onChange={setOpp('bias')} className={selectCls}>
                <option value="">—</option>
                {BIASES.map((b) => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Time of Trade</label>
              <input type="time" value={opp.timeOfTrade} onChange={setOpp('timeOfTrade')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Max Run (pts)</label>
              <input type="number" step="any" value={opp.maxRun} onChange={setOpp('maxRun')} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-400 mb-1">Outcome</label>
              <div className="flex gap-2 flex-wrap">
                {OUTCOMES.map((o) => (
                  <Chip key={o} label={o} active={opp.outcome === o} onClick={() => setOppField('outcome', opp.outcome === o ? '' : o)} />
                ))}
              </div>
            </div>
          </div>

          {/* Entry / PD */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">PD Array Level</label>
              <input type="text" value={opp.pdArrayLevel} onChange={setOpp('pdArrayLevel')} placeholder="e.g. 12.5 OVNR + 0.25 SD" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Entry Trigger</label>
              <input type="text" value={opp.entryTrigger} onChange={setOpp('entryTrigger')} placeholder="e.g. Body fails to close below CE" className={inputCls} />
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Chip label="Price Returned to PD" active={opp.returnToPD} onClick={toggleOpp('returnToPD')} />
            <Chip label="Closed Below CE" active={opp.closeBelowCE} onClick={toggleOpp('closeBelowCE')} />
          </div>

          {/* Target */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Target Level</label>
              <input type="text" value={opp.targetLevel} onChange={setOpp('targetLevel')} placeholder="e.g. 2.5 SD / Major BSL" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Stalled At</label>
              <input type="text" value={opp.stalledAt} onChange={setOpp('stalledAt')} placeholder="If price stalled short" className={inputCls} />
            </div>
          </div>
          <div>
            <Chip label="Target Reached" active={opp.reachedTarget} onClick={toggleOpp('reachedTarget')} />
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Entry Level</label>
              <input type="number" step="any" value={opp.entryLevel} onChange={setOpp('entryLevel')} placeholder="Price" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Stop Level</label>
              <input type="number" step="any" value={opp.stopLevel} onChange={setOpp('stopLevel')} placeholder="Price" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">R Multiple</label>
              <input type="number" step="any" value={opp.rMultiple} onChange={setOpp('rMultiple')} placeholder="e.g. 2.5" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">MFE (pts)</label>
              <input type="number" step="any" value={opp.mfe} onChange={setOpp('mfe')} placeholder="Max favorable" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">MAE (pts)</label>
              <input type="number" step="any" value={opp.mae} onChange={setOpp('mae')} placeholder="Max adverse" className={inputCls} />
            </div>
          </div>

          {/* Per-opportunity Confluences */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Confluences</label>
            <div className="flex flex-wrap gap-1.5">
              {ICT_TAGS.map((tag) => (
                <Chip key={tag} label={tag} active={(opp.confluences || []).includes(tag)} onClick={() => toggleConfluence(tag)} />
              ))}
            </div>
          </div>
        </div>

        <button type="button" onClick={addOpportunity} className="text-xs text-indigo-400 hover:underline">+ Add another trade opportunity</button>
      </div>

      {/* News Entries */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-400 mb-1">News Events</label>
        {(form.newsEntries || []).map((entry, ni) => (
          <div key={ni} className="flex gap-1.5 items-center">
            <input
              type="time"
              value={entry.time || ''}
              onChange={(e) => setForm(f => {
                const entries = [...(f.newsEntries || [])];
                entries[ni] = { ...entries[ni], time: e.target.value };
                return { ...f, newsEntries: entries };
              })}
              className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 shrink-0"
            />
            <div className="flex gap-1 shrink-0">
              {[
                { val: 'Red', cls: 'bg-rose-600 border-rose-500 text-white', inCls: 'bg-gray-800 border-gray-700 text-rose-400 hover:border-rose-500' },
                { val: 'Orange', cls: 'bg-amber-600 border-amber-500 text-white', inCls: 'bg-gray-800 border-gray-700 text-amber-400 hover:border-amber-500' },
                { val: 'Yellow', cls: 'bg-yellow-500 border-yellow-400 text-gray-900', inCls: 'bg-gray-800 border-gray-700 text-yellow-400 hover:border-yellow-500' },
              ].map(({ val, cls, inCls }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setForm(f => {
                    const entries = [...(f.newsEntries || [])];
                    entries[ni] = { ...entries[ni], severity: entries[ni].severity === val ? '' : val };
                    return { ...f, newsEntries: entries };
                  })}
                  className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${entry.severity === val ? cls : inCls}`}
                >
                  {val}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={entry.description || ''}
              onChange={(e) => setForm(f => {
                const entries = [...(f.newsEntries || [])];
                entries[ni] = { ...entries[ni], description: e.target.value };
                return { ...f, newsEntries: entries };
              })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setForm(f => ({ ...f, newsEntries: [...(f.newsEntries || []), { time: '', severity: '', description: '' }] }));
                }
              }}
              placeholder="What happened…"
              className={`${inputCls} text-xs flex-1`}
            />
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, newsEntries: (f.newsEntries || []).filter((_, idx) => idx !== ni) }))}
              className="text-gray-600 hover:text-rose-400 shrink-0 transition-colors"
            >
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setForm(f => ({ ...f, newsEntries: [...(f.newsEntries || []), { time: '', severity: '', description: '' }] }))}
          className="text-xs text-indigo-400 hover:underline"
        >
          + Add news entry
        </button>
      </div>
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
  const [lightboxIdx, setLightboxIdx] = useState(null);

  // Normalise images — prefer chartImages, fall back to legacy chartImageUrl
  const images = setup.chartImages?.length
    ? setup.chartImages
    : setup.chartImageUrl
    ? [{ url: setup.chartImageUrl, caption: '' }]
    : [];

  // Normalise opportunities — migrate legacy top-level fields
  const opps = setup.opportunities?.length
    ? setup.opportunities
    : [{ bias: setup.bias, timeOfTrade: setup.timeOfTrade, outcome: setup.outcome, maxRun: setup.maxRun, entryTrigger: setup.entryTrigger, pdArrayLevel: setup.pdArrayLevel, returnToPD: setup.returnToPD, closeBelowCE: setup.closeBelowCE, targetLevel: setup.targetLevel, stalledAt: setup.stalledAt, reachedTarget: setup.reachedTarget, entryLevel: setup.entryLevel, stopLevel: setup.stopLevel, rMultiple: setup.rMultiple, mfe: setup.mfe, mae: setup.mae }];

  const first = opps[0] || {};

  const outcomeColor = {
    Textbook: 'bg-emerald-900 text-emerald-300',
    Partial:  'bg-yellow-900 text-yellow-300',
    Failed:   'bg-rose-900 text-rose-300',
    Pending:  'bg-gray-800 text-gray-400',
  }[first.outcome] || 'bg-gray-800 text-gray-500';

  const biasColor = { Bullish: 'text-emerald-400', Bearish: 'text-rose-400', Neutral: 'text-yellow-400' }[first.bias] || 'text-gray-400';



  return (
    <>
      {/* Multi-image lightbox */}
      {lightboxIdx !== null && images.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4" onClick={() => setLightboxIdx(null)}>
          <img src={images[lightboxIdx].url} alt={images[lightboxIdx].caption || 'chart'} className="max-w-full max-h-[78vh] rounded-lg object-contain" />
          {images[lightboxIdx].caption && <p className="text-xs text-gray-400 mt-2">{images[lightboxIdx].caption}</p>}
          {images.length > 1 && (
            <div className="flex gap-3 mt-4" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setLightboxIdx(i => Math.max(0, i - 1))} className="text-gray-300 hover:text-white px-4 py-1.5 bg-gray-800 rounded-lg text-sm">← Prev</button>
              <span className="text-gray-500 text-sm self-center">{lightboxIdx + 1} / {images.length}</span>
              <button onClick={() => setLightboxIdx(i => Math.min(images.length - 1, i + 1))} className="text-gray-300 hover:text-white px-4 py-1.5 bg-gray-800 rounded-lg text-sm">Next →</button>
            </div>
          )}
          <p className="text-xs text-gray-600 mt-3">Click anywhere to close</p>
        </div>
      )}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors">
        <div className="flex gap-3 p-4">
          {/* Chart thumbnail */}
          {images.length > 0 ? (
            <div className="relative shrink-0 w-28 h-20 rounded-lg overflow-hidden cursor-zoom-in border border-gray-800 bg-gray-800" onClick={() => setLightboxIdx(0)}>
              <img src={images[0].url} alt="chart" className="w-full h-full object-cover" />
              {images.length > 1 && (
                <span className="absolute bottom-1 right-1 bg-black/75 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">+{images.length - 1}</span>
              )}
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
                  {first.outcome && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${outcomeColor}`}>{first.outcome}</span>}
                  {first.bias    && <span className={`text-xs font-medium ${biasColor}`}>{first.bias}</span>}
                  {setup.session && <span className="text-xs text-gray-500">{setup.session}</span>}
                  {first.timeOfTrade && <span className="text-xs text-gray-500">{first.timeOfTrade}</span>}
                  {first.maxRun != null && first.maxRun !== '' && <span className="text-xs text-gray-500">Max: {first.maxRun} pts</span>}
                  {opps.length > 1 && <span className="text-xs text-indigo-400 font-medium">{opps.length} opportunities</span>}
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => onEdit(setup)} className="text-gray-500 hover:text-indigo-400 transition-colors"><PencilIcon className="w-4 h-4" /></button>
                <button onClick={() => onDelete(setup._id)} className="text-gray-500 hover:text-rose-400 transition-colors"><TrashIcon className="w-4 h-4" /></button>
              </div>
            </div>

            {(() => {
              const allConf = [...new Set(opps.flatMap(o => o.confluences || []))];
              const conf = allConf.length ? allConf : (setup.confluences || []);
              return conf.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-2">
                  {conf.map((c) => (
                    <span key={c} className="text-xs bg-indigo-950 text-indigo-300 border border-indigo-900 px-2 py-0.5 rounded-full">{c}</span>
                  ))}
                </div>
              ) : null;
            })()}
          </div>
        </div>

        {/* Expandable details */}
        {(setup.setupRules?.some(r => typeof r === 'string' ? r : r?.text || r?.subs?.some(Boolean)) || setup.narrative || setup.notes || setup.news || setup.newsEntries?.length > 0 ||
          setup.sweepType || setup.sweepDirection || opps.some(o => o.entryTrigger) || setup.mssDirection || opps.some(o => o.targetLevel) ||
          setup.discoveries?.some(d => d.text)) && (
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
                {setup.setupRules?.some(r => typeof r === 'string' ? r : r?.text || r?.subs?.some(Boolean)) && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Setup Rules</p>
                    <ol className="space-y-2.5">
                      {setup.setupRules.map((r, i) => {
                        const rObj = typeof r === 'string' ? { text: r, subs: [] } : (r || {});
                        const { text, subs = [], isMasterRule, checked, comment, playedAt } = { subs: [], ...rObj };
                        if (!text && !(subs).filter(Boolean).length) return null;
                        const freeNum = isMasterRule ? null : setup.setupRules.filter((x, xi) => !x?.isMasterRule && xi < i).length + 1;
                        return (
                          <li key={i}>
                            <div className="flex gap-2 items-start">
                              <span className={`shrink-0 mt-0.5 text-sm font-medium ${isMasterRule ? (checked ? 'text-emerald-400' : 'text-gray-600') : 'text-gray-600'}`}>
                                {isMasterRule ? (checked ? '✓' : '○') : `${freeNum}.`}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm leading-snug ${isMasterRule && checked ? 'text-emerald-300' : isMasterRule && !checked ? 'text-gray-500' : 'text-gray-300'}`}>
                                  {text}
                                </p>
                                {(subs).filter(s => typeof s === 'string' ? s : s?.text).map((s, j) => {
                                  const subObj = typeof s === 'string' ? { text: s, scenarios: [] } : s;
                                  const subScWithObs = (subObj.scenarios || []).filter(sc => sc.observations?.some(o => o.time || o.note || o.imageUrl));
                                  return (
                                    <div key={j} className="ml-2 mt-0.5">
                                      <div className="flex gap-1.5">
                                        <span className="text-xs text-indigo-500 shrink-0 select-none font-medium">{String.fromCharCode(97 + j)}.</span>
                                        <span className="text-xs text-gray-500 leading-relaxed">{subObj.text}</span>
                                      </div>
                                      {subScWithObs.map((sc, sci) => (
                                        <div key={sci} className="ml-3 mt-0.5">
                                          {(subScWithObs.length > 1 || sc.name !== 'Default') && (
                                            <p className="text-xs font-medium text-amber-400 mb-0.5">⤷ {sc.name}</p>
                                          )}
                                          {sc.observations.filter(o => o.time || o.note || o.imageUrl).map((o, oi) => (
                                            <p key={oi} className="text-xs text-gray-500">
                                              {o.time ? <span className="text-gray-400 font-mono">@ {o.time}</span> : null}{o.time && o.note ? ' — ' : ''}{o.note}
                                            </p>
                                          ))}
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })}
                                {(() => {
                                  // Scenario-aware display
                                  const scenarios = rObj.scenarios?.filter(s => s.observations?.some(o => o.time || o.note || o.imageUrl));
                                  if (scenarios?.length) return (
                                    <div className="mt-1 space-y-2">
                                      {scenarios.map((sc, si) => (
                                        <div key={si}>
                                          {(scenarios.length > 1 || sc.name !== 'Default') && (
                                            <p className="text-xs font-medium text-amber-400 mb-0.5">⤷ {sc.name}</p>
                                          )}
                                          <div className="space-y-1.5 ml-2">
                                            {sc.observations.filter(o => o.time || o.note || o.imageUrl).map((o, oi) => (
                                              <div key={oi}>
                                                {(o.time || o.note) && (
                                                  <p className="text-xs text-gray-500">
                                                    {o.time ? <span className="text-gray-400 font-mono">@ {o.time}</span> : null}{o.time && o.note ? ' — ' : ''}{o.note}
                                                  </p>
                                                )}
                                                {o.imageUrl && (
                                                  <img src={o.imageUrl} alt="observation screenshot" className="mt-1 w-48 h-28 object-cover rounded-lg border border-gray-700 cursor-zoom-in" onClick={() => window.open(o.imageUrl, '_blank')} />
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                  // Legacy observations fallback
                                  const obs = (rObj.observations || []).filter(o => o.time || o.note || o.imageUrl);
                                  if (obs.length) return (
                                    <div className="mt-1 space-y-1.5">
                                      {obs.map((o, oi) => (
                                        <div key={oi}>
                                          {(o.time || o.note) && (
                                            <p className="text-xs text-gray-500">
                                              {o.time ? <span className="text-gray-400 font-mono">@ {o.time}</span> : null}{o.time && o.note ? ' — ' : ''}{o.note}
                                            </p>
                                          )}
                                          {o.imageUrl && (
                                            <img src={o.imageUrl} alt="observation screenshot" className="mt-1 w-48 h-28 object-cover rounded-lg border border-gray-700 cursor-zoom-in" onClick={() => window.open(o.imageUrl, '_blank')} />
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  );
                                  if (playedAt || comment) return (
                                    <p className="text-xs text-gray-500 mt-1">{playedAt ? `@ ${playedAt}` : ''}{playedAt && comment ? ' — ' : ''}{comment}</p>
                                  );
                                  return null;
                                })()}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                )}
                {(setup.newsEntries?.length > 0 || setup.news) && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">News Events</p>
                    {setup.newsEntries?.length > 0 ? (
                      <div className="space-y-1">
                        {setup.newsEntries.map((ne, ni) => {
                          const sevColor = { Red: 'bg-rose-600 text-white', Orange: 'bg-amber-600 text-white', Yellow: 'bg-yellow-500 text-gray-900' }[ne.severity] || '';
                          return (
                            <div key={ni} className="flex gap-2 items-center text-sm">
                              {ne.time && <span className="text-gray-400 font-mono text-xs shrink-0">{ne.time}</span>}
                              {ne.severity && <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${sevColor}`}>{ne.severity}</span>}
                              <span className="text-gray-300">{ne.description}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : setup.news ? (
                      <p className="text-sm text-yellow-200/80 leading-relaxed">{setup.news}</p>
                    ) : null}
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
                {/* Mechanics — shared context */}
                {(setup.sweepType || setup.sweepDirection || setup.mssDirection) && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Mechanics</p>
                    <div className="space-y-1 text-sm text-gray-300">
                      {(setup.sweepType || setup.sweepDirection) && (
                        <p><span className="text-gray-500">Sweep:</span> {[setup.sweepType, setup.sweepDirection].filter(Boolean).join(' — ')}{setup.liquidityQuality ? <span className="ml-1 text-xs text-yellow-400">({setup.liquidityQuality})</span> : null}</p>
                      )}
                      {setup.mssDirection && (
                        <p><span className="text-gray-500">MSS:</span> {setup.mssDirection}{setup.mssTime ? ` at ${setup.mssTime}` : ''}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Per-opportunity details */}
                {opps.map((o, oi) => {
                  const hasMechanics = o.entryTrigger || o.targetLevel || o.mfe != null || o.mae != null || o.rMultiple != null || o.entryLevel != null || o.stopLevel != null;
                  if (!hasMechanics && !o.bias && !o.outcome) return null;
                  const oOutcome = { Textbook: 'bg-emerald-900 text-emerald-300', Partial: 'bg-yellow-900 text-yellow-300', Failed: 'bg-rose-900 text-rose-300', Pending: 'bg-gray-800 text-gray-400' }[o.outcome] || '';
                  const oBias = { Bullish: 'text-emerald-400', Bearish: 'text-rose-400', Neutral: 'text-yellow-400' }[o.bias] || '';
                  return (
                    <div key={oi} className={opps.length > 1 ? 'border border-gray-700/60 rounded-lg p-3 space-y-1.5' : 'space-y-1.5'}>
                      {opps.length > 1 && (
                        <div className="flex gap-2 items-center mb-1">
                          <span className="text-xs font-semibold text-indigo-300">Opportunity {oi + 1}</span>
                          {o.outcome && <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${oOutcome}`}>{o.outcome}</span>}
                          {o.bias && <span className={`text-xs font-medium ${oBias}`}>{o.bias}</span>}
                          {o.timeOfTrade && <span className="text-xs text-gray-500">{o.timeOfTrade}</span>}
                        </div>
                      )}
                      <div className="space-y-1 text-sm text-gray-300">
                        {o.entryTrigger && (
                          <p><span className="text-gray-500">Entry:</span> {o.entryTrigger}{o.closeBelowCE ? <span className="ml-1 text-xs text-indigo-400">· Closed below CE</span> : null}</p>
                        )}
                        {o.targetLevel && (
                          <p><span className="text-gray-500">Target:</span> {o.targetLevel} — {o.reachedTarget ? '✓ Reached' : o.stalledAt ? `Stalled at ${o.stalledAt}` : 'Not recorded'}</p>
                        )}
                        {(o.mfe != null || o.mae != null || o.rMultiple != null) && (
                          <p className="text-xs text-gray-500">
                            {o.mfe != null && o.mfe !== '' ? `MFE ${o.mfe}pts` : ''}{o.mae != null && o.mae !== '' ? `  MAE ${o.mae}pts` : ''}{o.rMultiple != null && o.rMultiple !== '' ? `  ${o.rMultiple}R` : ''}
                          </p>
                        )}
                        {(o.entryLevel != null && o.entryLevel !== '' || o.stopLevel != null && o.stopLevel !== '') && (
                          <p className="text-xs text-gray-500">
                            {o.entryLevel != null && o.entryLevel !== '' ? `Entry: ${o.entryLevel}` : ''}{o.stopLevel != null && o.stopLevel !== '' ? `  Stop: ${o.stopLevel}` : ''}
                          </p>
                        )}
                        {o.confluences?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {o.confluences.map((c) => (
                              <span key={c} className="text-xs bg-indigo-950 text-indigo-300 border border-indigo-900 px-2 py-0.5 rounded-full">{c}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Discoveries */}
                {setup.discoveries?.some(d => d.text) && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Discoveries</p>
                    <div className="space-y-1">
                      {setup.discoveries.filter(d => d.text).map((d, i) => (
                        <div key={i} className="flex gap-2 items-start">
                          <span className={`shrink-0 text-sm mt-0.5 ${d.promoted ? 'text-emerald-400' : 'text-yellow-500'}`}>◆</span>
                          <p className="text-xs text-gray-300 leading-relaxed">{d.text}</p>
                          {d.promoted && <span className="text-xs text-emerald-500 shrink-0">Rule</span>}
                        </div>
                      ))}
                    </div>
                  </div>
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
  const [form, setForm] = useState({
    name:        initial?.name ?? '',
    description: initial?.description ?? '',
    tags:        initial ? (typeof initial.tags === 'string' ? initial.tags : initial.tags?.join(', ') || '') : '',
    color:       initial?.color ?? '#6366f1',
    masterRules: initial?.masterRules?.length
      ? initial.masterRules.map(r => {
          const rObj = typeof r === 'string' ? { text: r, subs: [], scenarios: [] } : r;
          return {
            text: rObj.text ?? '',
            subs: (rObj.subs || []).map(s => typeof s === 'string' ? { text: s, scenarios: [] } : { text: s.text ?? '', scenarios: s.scenarios ?? [] }),
            scenarios: rObj.scenarios ?? [],
          };
        })
      : [],
    macroWindows: initial?.macroWindows ?? [],
    studyParameters: {
      showLiquidity:       initial?.studyParameters?.showLiquidity ?? true,
      showMarketStructure: initial?.studyParameters?.showMarketStructure ?? true,
      showPDArray:         initial?.studyParameters?.showPDArray ?? true,
    },
  });
  const [saving, setSaving] = useState(false);
  const [macroInput, setMacroInput] = useState('');
  const [dragOverMaster, setDragOverMaster] = useState(null);
  const dragMasterFrom = useRef(null);
  const dragMasterOver = useRef(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const setMasterRule = (i, v) => setForm(f => {
    const r = [...f.masterRules]; r[i] = { ...r[i], text: v }; return { ...f, masterRules: r };
  });
  const addMasterRule = (afterIdx) => setForm(f => {
    const r = [...f.masterRules];
    r.splice(afterIdx + 1, 0, { text: '', subs: [] });
    return { ...f, masterRules: r };
  });
  const removeMasterRule = (i) => setForm(f => ({ ...f, masterRules: f.masterRules.filter((_, idx) => idx !== i) }));
  const moveMasterRule = (from, to) => setForm(f => { const r = [...f.masterRules]; const [m] = r.splice(from, 1); r.splice(to, 0, m); return { ...f, masterRules: r }; });
  const setMasterSub = (ri, si, v) => setForm(f => {
    const r = [...f.masterRules]; const subs = [...(r[ri].subs || [])];
    const existing = subs[si];
    subs[si] = { ...(typeof existing === 'string' ? { text: existing, scenarios: [] } : existing), text: v };
    r[ri] = { ...r[ri], subs }; return { ...f, masterRules: r };
  });
  const addMasterSub = (ri) => setForm(f => {
    const r = [...f.masterRules]; r[ri] = { ...r[ri], subs: [...(r[ri].subs || []), { text: '', scenarios: [] }] }; return { ...f, masterRules: r };
  });
  const removeMasterSub = (ri, si) => setForm(f => {
    const r = [...f.masterRules]; r[ri] = { ...r[ri], subs: (r[ri].subs || []).filter((_, i) => i !== si) }; return { ...f, masterRules: r };
  });
  const addSubScenario = (ri, si) => setForm(f => {
    const r = [...f.masterRules]; const subs = [...(r[ri].subs || [])];
    const s = subs[si]; const subObj = typeof s === 'string' ? { text: s, scenarios: [] } : { ...s };
    subObj.scenarios = [...(subObj.scenarios || []), { name: '' }];
    subs[si] = subObj; r[ri] = { ...r[ri], subs }; return { ...f, masterRules: r };
  });
  const setSubScenarioName = (ri, si, sci, v) => setForm(f => {
    const r = [...f.masterRules]; const subs = [...(r[ri].subs || [])];
    const s = subs[si]; const subObj = { ...(typeof s === 'string' ? { text: s, scenarios: [] } : s) };
    const sc = [...(subObj.scenarios || [])]; sc[sci] = { ...sc[sci], name: v };
    subs[si] = { ...subObj, scenarios: sc }; r[ri] = { ...r[ri], subs }; return { ...f, masterRules: r };
  });
  const removeSubScenario = (ri, si, sci) => setForm(f => {
    const r = [...f.masterRules]; const subs = [...(r[ri].subs || [])];
    const s = subs[si]; const subObj = { ...(typeof s === 'string' ? { text: s, scenarios: [] } : s) };
    subObj.scenarios = (subObj.scenarios || []).filter((_, i) => i !== sci);
    subs[si] = subObj; r[ri] = { ...r[ri], subs }; return { ...f, masterRules: r };
  });

  const addScenario = (ri) => setForm(f => {
    const r = [...f.masterRules]; r[ri] = { ...r[ri], scenarios: [...(r[ri].scenarios || []), { name: '' }] }; return { ...f, masterRules: r };
  });
  const setScenarioName = (ri, si, v) => setForm(f => {
    const r = [...f.masterRules]; const sc = [...(r[ri].scenarios || [])]; sc[si] = { ...sc[si], name: v }; r[ri] = { ...r[ri], scenarios: sc }; return { ...f, masterRules: r };
  });
  const removeScenario = (ri, si) => setForm(f => {
    const r = [...f.masterRules]; r[ri] = { ...r[ri], scenarios: (r[ri].scenarios || []).filter((_, i) => i !== si) }; return { ...f, masterRules: r };
  });

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description,
        color: form.color,
        tags: typeof form.tags === 'string' ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : form.tags,
        masterRules: (form.masterRules || []).filter(r => r.text?.trim()),
        macroWindows: form.macroWindows || [],
        studyParameters: form.studyParameters,
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
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4">
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
          <input type="text" value={form.tags} onChange={set('tags')} className={inputCls} placeholder="e.g. ICT, FVG, Trend" />
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

        {/* Master Rules */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Master Rules</label>
          <p className="text-xs text-gray-500 mb-2">Core conditions every setup in this topic must satisfy. Enter to add next rule, Backspace on empty to delete.</p>
          <div className="space-y-1.5">
            {(form.masterRules || []).map((rule, i) => (
              <div key={i}>
                <div
                  className={`flex gap-2 items-center ${dragOverMaster === i ? 'border-t-2 border-indigo-500' : ''}`}
                  draggable
                  onDragStart={() => { dragMasterFrom.current = i; }}
                  onDragEnter={() => { dragMasterOver.current = i; setDragOverMaster(i); }}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnd={() => {
                    if (dragMasterFrom.current !== null && dragMasterOver.current !== null && dragMasterFrom.current !== dragMasterOver.current) {
                      moveMasterRule(dragMasterFrom.current, dragMasterOver.current);
                    }
                    dragMasterFrom.current = null; dragMasterOver.current = null; setDragOverMaster(null);
                  }}
                >
                  <Bars3Icon className="w-4 h-4 text-gray-600 cursor-grab shrink-0" />
                  <span className="text-xs text-gray-600 w-5 text-right shrink-0">{i + 1}.</span>
                  <input
                    type="text"
                    value={rule.text}
                    onChange={(e) => setMasterRule(i, e.target.value)}
                    placeholder="Rule…"
                    className={`${inputCls} flex-1`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); addMasterRule(i); }
                      if (e.key === 'Backspace' && !rule.text && !rule.subs?.length) { e.preventDefault(); removeMasterRule(i); }
                    }}
                  />
                  <button type="button" onClick={() => addMasterSub(i)} className="text-gray-600 hover:text-indigo-400 shrink-0 transition-colors" title="Add sub-rule">
                    <PlusIcon className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => removeMasterRule(i)} className="text-gray-600 hover:text-rose-400 shrink-0">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
                {(rule.subs || []).map((sub, j) => {
                  const subObj = typeof sub === 'string' ? { text: sub, scenarios: [] } : sub;
                  return (
                    <div key={j} className="ml-7 mt-1 space-y-0.5">
                      <div className="flex gap-2 items-center">
                        <span className="text-xs text-indigo-500 shrink-0 select-none font-medium">{String.fromCharCode(97 + j)}.</span>
                        <input
                          type="text"
                          value={subObj.text}
                          onChange={(e) => setMasterSub(i, j, e.target.value)}
                          placeholder="Sub-rule or caveat…"
                          className="flex-1 bg-gray-800/60 border border-gray-700/60 rounded-md px-3 py-1.5 text-xs text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !subObj.text && !subObj.scenarios?.length) { e.preventDefault(); removeMasterSub(i, j); }
                          }}
                        />
                        <button type="button" onClick={() => addSubScenario(i, j)} className="text-gray-600 hover:text-amber-400 shrink-0 transition-colors" title="Add outcome scenario">
                          <PlusIcon className="w-3 h-3" />
                        </button>
                        <button type="button" onClick={() => removeMasterSub(i, j)} className="text-gray-600 hover:text-rose-400 shrink-0">
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {(subObj.scenarios || []).map((sc, sci) => (
                        <div key={sci} className="flex gap-2 items-center ml-4">
                          <span className="text-xs text-amber-500 shrink-0 select-none">⤷</span>
                          <input
                            type="text"
                            value={sc.name}
                            onChange={(e) => setSubScenarioName(i, j, sci, e.target.value)}
                            placeholder={`e.g. If ${subObj.text || 'sub-rule'} ${sci === 0 ? 'holds' : 'fails'}…`}
                            className="flex-1 bg-gray-800/60 border border-gray-700/60 rounded-md px-3 py-1.5 text-xs text-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                          <button type="button" onClick={() => removeSubScenario(i, j, sci)} className="text-gray-600 hover:text-rose-400 shrink-0"><TrashIcon className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                  );
                })}
                {/* Scenarios per rule */}
                {(rule.scenarios || []).length > 0 && (
                  <div className="ml-7 mt-1.5 space-y-1">
                    <p className="text-xs text-gray-600">Scenarios (expected outcomes):</p>
                    {rule.scenarios.map((sc, si) => (
                      <div key={si} className="flex gap-2 items-center">
                        <span className="text-xs text-amber-500 shrink-0 select-none">⤷</span>
                        <input
                          type="text"
                          value={sc.name}
                          onChange={(e) => setScenarioName(i, si, e.target.value)}
                          placeholder={`e.g. If ${rule.text || 'rule'} ${si === 0 ? 'holds' : 'fails'}…`}
                          className="flex-1 bg-gray-800/60 border border-gray-700/60 rounded-md px-3 py-1.5 text-xs text-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <button type="button" onClick={() => removeScenario(i, si)} className="text-gray-600 hover:text-rose-400 shrink-0"><TrashIcon className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="ml-7 mt-1">
                  <button type="button" onClick={() => addScenario(i)} className="text-xs text-amber-500 hover:text-amber-400 transition-colors">+ Add scenario</button>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setForm(f => ({ ...f, masterRules: [...(f.masterRules || []), { text: '', subs: [], scenarios: [] }] }))} className="text-xs text-indigo-400 hover:underline">+ Add master rule</button>
          </div>
        </div>

        {/* Macro Windows */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Macro Windows</label>
          <p className="text-xs text-gray-500 mb-2">Define the macro timing windows for this study (e.g. 9:30, 9:50, 10:10). These appear as selectable chips in setup forms.</p>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={macroInput}
              onChange={(e) => setMacroInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && macroInput.trim()) {
                  e.preventDefault();
                  const v = macroInput.trim();
                  if (!form.macroWindows.includes(v)) setForm(f => ({ ...f, macroWindows: [...f.macroWindows, v] }));
                  setMacroInput('');
                }
              }}
              placeholder="e.g. 9:30 — press Enter to add"
              className={`${inputCls} flex-1`}
            />
          </div>
          {form.macroWindows.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.macroWindows.map((w) => (
                <span key={w} className="text-xs bg-indigo-950 text-indigo-300 border border-indigo-900 px-2 py-0.5 rounded-full flex items-center gap-1">
                  {w}
                  <button type="button" onClick={() => setForm(f => ({ ...f, macroWindows: f.macroWindows.filter(x => x !== w) }))} className="text-indigo-400 hover:text-rose-400 leading-none">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Study Parameters */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Study Parameters</label>
          <p className="text-xs text-gray-500 mb-2">Choose which ICT mechanics sections appear when logging setups under this topic.</p>
          <div className="space-y-2">
            {[
              { key: 'showLiquidity', label: 'Liquidity Profiling', desc: 'Sweep type, direction, target liquidity, quality' },
              { key: 'showMarketStructure', label: 'Market Structure', desc: 'MSS direction, candle time, engineered liquidity' },
              { key: 'showPDArray', label: 'PD Array', desc: 'Price delivery array input' },
            ].map(({ key, label, desc }) => (
              <label key={key} className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={form.studyParameters[key]}
                  onChange={(e) => setForm(f => ({ ...f, studyParameters: { ...f.studyParameters, [key]: e.target.checked } }))}
                  className="mt-0.5 w-4 h-4 accent-indigo-500 cursor-pointer"
                />
                <div>
                  <span className="text-sm text-gray-300 group-hover:text-gray-100 transition-colors">{label}</span>
                  <p className="text-xs text-gray-600">{desc}</p>
                </div>
              </label>
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
// MasterRulesCard — collapsible display of topic-level master rules
// ════════════════════════════════════════════════════════════════════════════
function MasterRulesCard({ topic, onEdit }) {
  const [open, setOpen] = useState(false);
  const rules = (topic.masterRules || []).filter(r => typeof r === 'string' ? r : r?.text);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-gray-300 hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span>Master Rules</span>
          {rules.length > 0
            ? <span className="text-xs bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded-full">{rules.length}</span>
            : <span className="text-xs text-gray-600">— none yet</span>}
        </div>
        {open ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
      </button>
      {open && (
        <div className="p-5 border-t border-gray-800">
          {rules.length === 0 ? (
            <div className="text-center py-3">
              <p className="text-sm text-gray-500 mb-1">No master rules defined yet.</p>
              <p className="text-xs text-gray-600 mb-3">Master rules are core conditions every setup in this topic must meet — the 1000-kick standard.</p>
              <button onClick={onEdit} className="text-xs text-indigo-400 hover:underline">+ Add master rules</button>
            </div>
          ) : (
            <>
              <ol className="space-y-2.5 mb-4">
                {rules.map((r, i) => {
                  const text = typeof r === 'string' ? r : r.text;
                  const subs = typeof r === 'string' ? [] : (r.subs || []).filter(Boolean);
                  return (
                    <li key={i}>
                      <div className="flex gap-2 text-sm text-gray-200">
                        <span className="text-gray-600 shrink-0 select-none">{i + 1}.</span>
                        <span>{text}</span>
                      </div>
                      {subs.map((s, j) => (
                        <div key={j} className="flex gap-1.5 ml-5 mt-0.5">
                          <span className="text-xs text-indigo-500 shrink-0 select-none font-medium">{String.fromCharCode(97 + j)}.</span>
                          <span className="text-xs text-gray-500 leading-relaxed">{s}</span>
                        </div>
                      ))}
                    </li>
                  );
                })}
              </ol>
              <button onClick={onEdit} className="text-xs text-indigo-400 hover:underline">Edit rules</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ReviewDiscoveriesPanel — aggregates discoveries from all setups, lets you
// promote frequently-seen ones to master rules
// ════════════════════════════════════════════════════════════════════════════
function ReviewDiscoveriesPanel({ topicId, setups, onPromote }) {
  const [open, setOpen] = useState(false);
  const [promoting, setPromoting] = useState(null);

  // Aggregate discoveries client-side
  const discMap = {};
  setups.forEach(s => {
    (s.discoveries || []).forEach(d => {
      const key = d?.text?.trim();
      if (!key) return;
      if (!discMap[key]) discMap[key] = { count: 0, promoted: false };
      discMap[key].count++;
      if (d.promoted) discMap[key].promoted = true;
    });
  });
  const aggregated = Object.entries(discMap).sort((a, b) => b[1].count - a[1].count);

  const handlePromote = async (text) => {
    setPromoting(text);
    try {
      const { data } = await api.post(`/study/topics/${topicId}/promote-discovery`, { text });
      onPromote(data.topic);
      toast.success('Promoted to master rule!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Promote failed');
    } finally { setPromoting(null); }
  };

  if (aggregated.length === 0 && !open) return null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-gray-300 hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <LightBulbIcon className="w-4 h-4 text-yellow-400" />
          <span>Review Discoveries</span>
          {aggregated.length > 0 && <span className="text-xs bg-yellow-900/50 text-yellow-400 px-2 py-0.5 rounded-full">{aggregated.length}</span>}
        </div>
        {open ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
      </button>
      {open && (
        <div className="p-5 border-t border-gray-800">
          {aggregated.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No discoveries logged yet.<br /><span className="text-xs">Add variable observations in your setup forms to track patterns.</span></p>
          ) : (
            <>
              <p className="text-xs text-gray-500 mb-3">Discoveries appearing frequently may deserve promotion to a master rule.</p>
              <div className="space-y-2">
                {aggregated.map(([text, { count, promoted }]) => (
                  <div key={text} className={`flex items-start gap-3 p-3 rounded-lg ${promoted ? 'bg-emerald-950/40 border border-emerald-900/40' : 'bg-gray-800'}`}>
                    <span className="text-yellow-400 shrink-0 mt-0.5 text-sm">◆</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200 break-words">{text}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{count} setup{count !== 1 ? 's' : ''}</p>
                    </div>
                    {promoted ? (
                      <span className="text-xs text-emerald-400 shrink-0 mt-1">✓ Promoted</span>
                    ) : (
                      <button
                        onClick={() => handlePromote(text)}
                        disabled={promoting === text}
                        className="text-xs text-indigo-400 hover:text-indigo-300 shrink-0 mt-1 disabled:opacity-50 transition-colors"
                      >
                        {promoting === text ? 'Promoting…' : '↑ Promote'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
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
  const [reviewBannerDismissed, setReviewBannerDismissed] = useState(false);
  const [topicDrawerOpen, setTopicDrawerOpen] = useState(false);

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
    setReviewBannerDismissed(false);
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

  const handlePromoteDiscovery = (updatedTopic) => {
    setTopics(prev => prev.map(t => t._id === updatedTopic._id ? { ...t, ...updatedTopic } : t));
    setActiveTopic(prev => prev?._id === updatedTopic._id ? { ...prev, ...updatedTopic } : prev);
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

  const handleCloneTopic = async (topicId) => {
    try {
      const res = await api.post(`/study/topics/${topicId}/clone`);
      const cloned = res.data.topic;
      setTopics(prev => [cloned, ...prev]);
      setActiveTopic(cloned);
      toast.success(`Cloned as "${cloned.name}"`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Clone failed');
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
    <div className="-m-3 md:-m-6 flex h-full">

      {/* ── Mobile: topic drawer backdrop ── */}
      {topicDrawerOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setTopicDrawerOpen(false)} />
      )}

      {/* ── Topic sidebar — desktop always visible, mobile slide-over ── */}
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-40 md:z-auto
        w-72 md:w-52 shrink-0
        border-r border-gray-800 flex flex-col bg-gray-900
        overflow-y-auto
        transition-transform duration-300 ease-in-out
        ${topicDrawerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-3 border-b border-gray-800 flex items-center gap-2">
          <button
            onClick={() => { setEditingTopic(null); setShowTopicModal(true); setTopicDrawerOpen(false); }}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg font-medium transition-colors"
          >
            <PlusIcon className="w-3.5 h-3.5" /> New Topic
          </button>
          <button onClick={() => setTopicDrawerOpen(false)} className="md:hidden p-2 text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-lg">
            <XMarkIcon className="w-4 h-4" />
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
                className={`group flex items-center justify-between px-2.5 py-2.5 md:py-2 rounded-lg cursor-pointer transition-colors ${activeTopic?._id === t._id ? 'bg-gray-800' : 'hover:bg-gray-800'}`}
                onClick={() => { setActiveTopic(t); setTopicDrawerOpen(false); }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color || '#6366f1' }} />
                  <span className="text-sm text-gray-300 truncate">{t.name}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs text-gray-600">{t.setupCount || 0}</span>
                  <div className="hidden group-hover:flex gap-0.5">
                    <button onClick={(e) => { e.stopPropagation(); handleCloneTopic(t._id); }} className="text-gray-500 hover:text-emerald-400 p-0.5" title="Clone topic"><DocumentDuplicateIcon className="w-3 h-3" /></button>
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
      <main className="flex-1 overflow-y-auto p-3 md:p-6">
        {!activeTopic ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
            <p className="text-sm">Select or create a topic to get started.</p>
            <button onClick={() => setTopicDrawerOpen(true)}
              className="md:hidden flex items-center gap-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              <BookOpenIcon className="w-4 h-4" /> View Topics
            </button>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-4 md:space-y-5 pb-4">
            {/* Mobile topic header row */}
            <div className="flex items-center gap-2 md:hidden">
              <button onClick={() => setTopicDrawerOpen(true)}
                className="flex items-center gap-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition-colors">
                <Bars3Icon className="w-3.5 h-3.5" />
                Topics
              </button>
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: activeTopic.color || '#6366f1' }} />
                <span className="text-sm font-semibold text-gray-200 truncate">{activeTopic.name}</span>
              </div>
            </div>
            {/* Header — desktop */}
            <div className="hidden md:flex items-center justify-between gap-3 flex-wrap">
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
            {/* Add Setup button — mobile */}
            {!showSetupForm && (
              <button
                onClick={() => { setEditingSetup(null); setShowSetupForm(true); }}
                className="md:hidden flex items-center gap-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition-colors w-full justify-center"
              >
                <PlusIcon className="w-4 h-4" /> Add Setup
              </button>
            )}

            {/* Topic analytics accordion */}
            <TopicAnalytics topicId={activeTopic._id} />

            {/* Master Rules card */}
            <MasterRulesCard
              topic={activeTopic}
              onEdit={() => { setEditingTopic(activeTopic); setShowTopicModal(true); }}
            />

            {/* 25-setup review cadence banner */}
            {!reviewBannerDismissed && setups.length > 0 && setups.length % 25 === 0 && (
              <div className="bg-indigo-950 border border-indigo-800 rounded-xl p-4 flex items-start gap-3">
                <LightBulbIcon className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-indigo-300">Time for a Rule Review</p>
                  <p className="text-xs text-indigo-400 mt-0.5">You've logged {setups.length} setups — a great moment to review your discoveries and sharpen your master rules.</p>
                </div>
                <button onClick={() => setReviewBannerDismissed(true)} className="text-indigo-600 hover:text-indigo-400 text-xs shrink-0">Dismiss</button>
              </div>
            )}

            {/* Setup form */}
            {showSetupForm && (
              <SetupForm
                topicId={activeTopic._id}
                topicMasterRules={activeTopic.masterRules}
                topic={activeTopic}
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

            {/* Review Discoveries panel — appears when setups have discoveries */}
            {!loadingSetups && setups.length > 0 && (
              <ReviewDiscoveriesPanel
                topicId={activeTopic._id}
                setups={setups}
                onPromote={handlePromoteDiscovery}
              />
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
