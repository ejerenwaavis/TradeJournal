import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon, MinusCircleIcon } from '@heroicons/react/24/solid';

// ── helpers ─────────────────────────────────────────────────────────────────

function stars(n) {
  const count = Math.round(n || 0);
  return Array.from({ length: 5 }, (_, i) => (
    <span key={i} className={i < count ? 'text-yellow-400' : 'text-gray-700'}>★</span>
  ));
}

const RESULT_CONFIG = {
  win:       { label: 'Win',       Icon: CheckCircleIcon,  color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/40' },
  loss:      { label: 'Loss',      Icon: XCircleIcon,      color: 'text-red-400',     bg: 'bg-red-500/15 border-red-500/40' },
  breakeven: { label: 'Breakeven', Icon: MinusCircleIcon,  color: 'text-yellow-400',  bg: 'bg-yellow-500/15 border-yellow-500/40' },
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── FlashcardsPage ───────────────────────────────────────────────────────────

export default function FlashcardsPage() {
  // remote data
  const [allTrades, setAllTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // deck (filtered + optionally shuffled)
  const [deck, setDeck] = useState([]);

  // ui state
  const [cardIdx, setCardIdx] = useState(0);
  const [imgIdx, setImgIdx]   = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [mode, setMode] = useState('quiz'); // 'quiz' | 'review'
  const [guess, setGuess] = useState(null); // user's guess before reveal

  // score
  const [score, setScore] = useState({ correct: 0, answered: 0 });

  // filters
  const [filterSetup,  setFilterSetup]  = useState('');
  const [filterResult, setFilterResult] = useState('all');
  const [filterRating, setFilterRating] = useState(0);
  const [isShuffled,   setIsShuffled]   = useState(false);

  // ── fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    axios
      .get('/api/trades?hasCharts=true&sortBy=executionRating&limit=200')
      .then(({ data }) => {
        setAllTrades(data.trades || []);
      })
      .catch((err) => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  }, []);

  // ── rebuild deck whenever filters / shuffle / allTrades change ─────────────
  useEffect(() => {
    let filtered = allTrades.filter((t) => {
      if (filterSetup  && !t.setupType?.toLowerCase().includes(filterSetup.toLowerCase())) return false;
      if (filterResult !== 'all' && t.result !== filterResult) return false;
      if (filterRating > 0 && (t.executionRating || 0) < filterRating) return false;
      return true;
    });
    if (isShuffled) filtered = shuffle(filtered);
    setDeck(filtered);
    setCardIdx(0);
    setImgIdx(0);
    setRevealed(false);
    setGuess(null);
    setScore({ correct: 0, answered: 0 });
  }, [allTrades, filterSetup, filterResult, filterRating, isShuffled]);

  // ── navigation helpers ────────────────────────────────────────────────────
  const gotoCard = useCallback((idx) => {
    setCardIdx(idx);
    setImgIdx(0);
    setRevealed(false);
    setGuess(null);
  }, []);

  const prevCard = useCallback(() => {
    if (cardIdx > 0) gotoCard(cardIdx - 1);
  }, [cardIdx, gotoCard]);

  const nextCard = useCallback(() => {
    if (cardIdx < deck.length - 1) gotoCard(cardIdx + 1);
  }, [cardIdx, deck.length, gotoCard]);

  const reveal = useCallback(() => setRevealed(true), []);

  const handleGuess = useCallback((g) => {
    if (revealed) return;
    const trade = deck[cardIdx];
    const correct = g === (trade?.result || '');
    setGuess(g);
    setRevealed(true);
    setScore((s) => ({ correct: s.correct + (correct ? 1 : 0), answered: s.answered + 1 }));
  }, [revealed, deck, cardIdx]);

  // ── keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.key === 'ArrowRight') { nextCard(); return; }
      if (e.key === 'ArrowLeft')  { prevCard(); return; }
      if ((e.key === ' ' || e.key === 'Enter') && !revealed) { e.preventDefault(); reveal(); return; }
      if (mode === 'quiz' && !revealed) {
        if (e.key === '1') handleGuess('win');
        if (e.key === '2') handleGuess('loss');
        if (e.key === '3') handleGuess('breakeven');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nextCard, prevCard, revealed, reveal, mode, handleGuess]);

  // ── derived ───────────────────────────────────────────────────────────────
  const trade  = deck[cardIdx] || null;
  const charts = trade?.charts || [];
  const chart  = charts[imgIdx] || null;
  const result = trade?.result ? RESULT_CONFIG[trade.result] || null : null;

  // unique setup types for filter dropdown
  const setupTypes = [...new Set(allTrades.map((t) => t.setupType).filter(Boolean))].sort();

  // ── render helpers ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        Loading flashcards…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-red-400">
        Error: {error}
      </div>
    );
  }

  // ── main render ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-100 overflow-hidden">

      {/* ── Top control bar ─────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 py-3 border-b border-gray-800 bg-gray-900 flex flex-wrap items-center gap-3">

        {/* Mode toggle */}
        <div className="flex rounded-lg overflow-hidden border border-gray-700 text-sm shrink-0">
          {['quiz', 'review'].map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setRevealed(m === 'review'); setGuess(null); }}
              className={`px-3 py-1.5 capitalize transition-colors ${
                mode === m ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Setup filter */}
        <select
          value={filterSetup}
          onChange={(e) => setFilterSetup(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-sm rounded-lg px-2 py-1.5 text-gray-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All setups</option>
          {setupTypes.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Result filter */}
        <select
          value={filterResult}
          onChange={(e) => setFilterResult(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-sm rounded-lg px-2 py-1.5 text-gray-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="all">All results</option>
          <option value="win">Win</option>
          <option value="loss">Loss</option>
          <option value="breakeven">Breakeven</option>
        </select>

        {/* Min rating */}
        <div className="flex items-center gap-1.5 text-sm text-gray-400 shrink-0">
          <span>Min ★</span>
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setFilterRating(n)}
              className={`w-6 h-6 rounded text-xs font-medium transition-colors border ${
                filterRating === n
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'border-gray-700 text-gray-500 hover:bg-gray-800'
              }`}
            >
              {n === 0 ? '—' : n}
            </button>
          ))}
        </div>

        {/* Shuffle */}
        <button
          onClick={() => setIsShuffled((s) => !s)}
          title="Shuffle deck"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors shrink-0 ${
            isShuffled
              ? 'bg-indigo-600 border-indigo-500 text-white'
              : 'border-gray-700 text-gray-400 hover:bg-gray-800'
          }`}
        >
          <ArrowPathIcon className="w-4 h-4" />
          Shuffle
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Score (quiz mode) */}
        {mode === 'quiz' && (
          <div className="text-sm text-gray-400 shrink-0">
            <span className="text-emerald-400 font-semibold">{score.correct}</span>
            <span className="mx-1">/</span>
            <span>{score.answered}</span>
            <span className="ml-1">correct</span>
            {score.answered > 0 && (
              <span className="ml-2 text-gray-500">
                ({Math.round((score.correct / score.answered) * 100)}%)
              </span>
            )}
          </div>
        )}

        {/* Card count */}
        <span className="text-sm text-gray-500 shrink-0">
          {deck.length === 0 ? '0 cards' : `${cardIdx + 1} / ${deck.length}`}
        </span>
      </div>

      {/* ── Progress bar ─────────────────────────────────────────────────── */}
      {deck.length > 0 && (
        <div className="h-1 bg-gray-800 shrink-0">
          <div
            className="h-1 bg-indigo-600 transition-all duration-300"
            style={{ width: `${((cardIdx + 1) / deck.length) * 100}%` }}
          />
        </div>
      )}

      {/* ── Main area ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto flex items-start justify-center py-6 px-4">

        {deck.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center gap-4 text-center max-w-md mt-20">
            <div className="text-5xl">📈</div>
            <h2 className="text-xl font-semibold text-gray-300">No flashcards yet</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              {allTrades.length === 0
                ? 'Add chart images and execution ratings to your trades to start training.'
                : 'No trades match your current filters. Try loosening the setup, result, or rating filters.'}
            </p>
            {allTrades.length === 0 && (
              <Link to="/trades/new" className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm">
                Log a trade
              </Link>
            )}
          </div>

        ) : (

          /* Card */
          <div className="w-full max-w-3xl flex flex-col gap-4">

            {/* Chart image area */}
            <div className="relative rounded-xl overflow-hidden bg-gray-900 border border-gray-800 aspect-video flex items-center justify-center">
              {chart?.imageUrl ? (
                <img
                  src={chart.imageUrl}
                  alt={chart.label || 'Chart'}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-gray-600 text-sm">No image</div>
              )}

              {/* Multi-chart prev/next within card */}
              {charts.length > 1 && (
                <>
                  <button
                    onClick={() => setImgIdx((i) => Math.max(0, i - 1))}
                    disabled={imgIdx === 0}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-gray-900/80 border border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setImgIdx((i) => Math.min(charts.length - 1, i + 1))}
                    disabled={imgIdx === charts.length - 1}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-gray-900/80 border border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-30 transition-colors"
                  >
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                  {/* Image counter */}
                  <div className="absolute bottom-2 right-3 text-xs text-gray-400 bg-gray-900/80 px-2 py-0.5 rounded-full">
                    {imgIdx + 1} / {charts.length}
                  </div>
                </>
              )}

              {/* Chart label */}
              {chart?.label && (
                <div className="absolute top-2 left-3 text-xs text-gray-400 bg-gray-900/80 px-2 py-0.5 rounded-full">
                  {chart.label}
                </div>
              )}
            </div>

            {/* Context row — always visible */}
            <div className="flex flex-wrap gap-2">
              {trade.instrument && (
                <span className="px-2.5 py-1 rounded-lg bg-gray-800 border border-gray-700 text-sm font-semibold text-indigo-300">
                  {trade.instrument}
                </span>
              )}
              {trade.direction && (
                <span className={`px-2.5 py-1 rounded-lg border text-sm font-medium ${
                  trade.direction === 'long'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}>
                  {trade.direction.toUpperCase()}
                </span>
              )}
              {trade.timeframe && (
                <span className="px-2.5 py-1 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-300">
                  {trade.timeframe}
                </span>
              )}
              {trade.session && (
                <span className="px-2.5 py-1 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-300">
                  {trade.session}
                </span>
              )}
            </div>

            {/* ── Quiz mode: guess buttons ─────────────────────────── */}
            {mode === 'quiz' && !revealed && (
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-gray-500">What was the outcome of this setup?</p>
                <div className="flex gap-3">
                  {['win', 'loss', 'breakeven'].map((opt, i) => {
                    const cfg = RESULT_CONFIG[opt];
                    return (
                      <button
                        key={opt}
                        onClick={() => handleGuess(opt)}
                        className={`px-5 py-2.5 rounded-lg border text-sm font-medium transition-colors ${cfg.bg} ${cfg.color} hover:opacity-90`}
                      >
                        <span className="opacity-40 text-xs mr-1.5">[{i + 1}]</span>
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Review mode or quiz before guess: reveal button ──── */}
            {mode === 'review' && !revealed && (
              <div className="flex justify-center">
                <button
                  onClick={reveal}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <EyeIcon className="w-4 h-4" />
                  Reveal outcome <span className="opacity-50 text-xs ml-1">[Space]</span>
                </button>
              </div>
            )}

            {/* ── Reveal section ──────────────────────────────────── */}
            {revealed && (
              <div className="rounded-xl border border-gray-800 bg-gray-900 divide-y divide-gray-800">

                {/* Result row */}
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-gray-500">Result</span>
                  {result ? (
                    <div className="flex items-center gap-2">
                      {/* Quiz feedback */}
                      {mode === 'quiz' && guess && (
                        <span className={`text-xs font-medium ${guess === trade.result ? 'text-emerald-400' : 'text-red-400'}`}>
                          {guess === trade.result ? '✓ Correct' : `✗ You guessed ${RESULT_CONFIG[guess]?.label}`}
                        </span>
                      )}
                      <span className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-sm font-semibold ${result.bg} ${result.color}`}>
                        <result.Icon className="w-4 h-4" />
                        {result.label}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-600 text-sm">–</span>
                  )}
                </div>

                {/* Stats row */}
                <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs mb-0.5">R:R</p>
                    <p className="text-gray-200 font-medium">{trade.riskReward ? `${trade.riskReward}R` : '–'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-0.5">PnL (pips)</p>
                    <p className={`font-medium ${(trade.pnlPips || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {trade.pnlPips != null ? (trade.pnlPips >= 0 ? '+' : '') + trade.pnlPips : '–'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-0.5">Setup</p>
                    <p className="text-gray-200 font-medium">{trade.setupType || '–'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-0.5">Execution</p>
                    <p className="text-base leading-none">{stars(trade.executionRating)}</p>
                  </div>
                </div>

                {/* Post-trade notes */}
                {trade.postTradeNotes && (
                  <div className="px-4 py-3">
                    <p className="text-xs text-gray-500 mb-1">Post-trade notes</p>
                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{trade.postTradeNotes}</p>
                  </div>
                )}

                {/* Link to full trade */}
                <div className="px-4 py-2.5 flex justify-end">
                  <Link
                    to={`/trades/${trade._id}`}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    View full trade →
                  </Link>
                </div>
              </div>
            )}

            {/* ── Card navigation ───────────────────────────────────── */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={prevCard}
                disabled={cardIdx === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-700 text-sm text-gray-400 hover:bg-gray-800 disabled:opacity-30 transition-colors"
              >
                <ChevronLeftIcon className="w-4 h-4" />
                Prev <span className="opacity-40 text-xs ml-0.5">[←]</span>
              </button>

              {/* Dot indicators (max 12 shown) */}
              {deck.length <= 12 && (
                <div className="flex gap-1">
                  {deck.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => gotoCard(i)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        i === cardIdx ? 'bg-indigo-500' : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
              )}

              <button
                onClick={nextCard}
                disabled={cardIdx === deck.length - 1}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-700 text-sm text-gray-400 hover:bg-gray-800 disabled:opacity-30 transition-colors"
              >
                Next <span className="opacity-40 text-xs mr-0.5">[→]</span>
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
