import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
  {
    icon: '📈',
    title: 'AI Chart Analysis',
    desc: 'Paste any TradingView snapshot link or upload a screenshot. GPT-4o reads your chart and pre-fills entry, stop, targets, setup type, and confluences instantly.',
  },
  {
    icon: '🧠',
    title: 'ICT / SMC Native',
    desc: 'Built around ICT concepts — Order Blocks, FVGs, MMXM, Liquidity Sweeps, CISD + Displacement. Tag setups with chips designed for the methodology.',
  },
  {
    icon: '⚡',
    title: 'Rapid Backtest Mode',
    desc: 'Capture backtest trades at speed. Instrument, bias, and session stay sticky between entries so you can log dozens of setups in minutes.',
  },
  {
    icon: '📊',
    title: 'Performance Analytics',
    desc: 'Win rate, average R:R, P&L curves, session breakdowns, emotion heatmaps. Know exactly where your edge lives and where it leaks.',
  },
  {
    icon: '✨',
    title: 'AI Trading Insights',
    desc: 'Your journal feeds an AI coach that surfaces patterns in your data — what sessions you perform best in, which setups are dragging your stats, and more.',
  },
  {
    icon: '🗂️',
    title: 'Backtest Projects',
    desc: 'Group backtests by strategy with target win rate and R:R goals. Track progress per project with live stat cards and progress bars.',
  },
];

const STEPS = [
  { num: '01', title: 'Log your trade', desc: 'Paste a TradingView link — AI pre-fills the form. Or fill it manually in seconds.' },
  { num: '02', title: 'Review & reflect', desc: 'Add pre/post-trade notes, emotion, execution rating, and confluences.' },
  { num: '03', title: 'Let data guide you', desc: 'Analytics and AI insights reveal your real edge from your own historical data.' },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users straight to dashboard
  useEffect(() => {
    if (!loading && user) navigate('/dashboard', { replace: true });
  }, [loading, user, navigate]);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">

      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 border-b border-gray-800/60 bg-gray-950/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">TJ</div>
            <span className="font-bold text-indigo-400 text-sm tracking-wide">TradeJournal</span>
          </div>
          <nav className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-gray-400 hover:text-gray-100 transition-colors px-3 py-1.5">
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-1.5 rounded-lg transition-colors"
            >
              Get Started Free
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="max-w-4xl mx-auto px-5 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-950/60 border border-indigo-900/50 text-indigo-300 text-xs font-medium px-3 py-1 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          Built for ICT &amp; SMC traders
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight mb-6">
          The trading journal that{' '}
          <span className="text-indigo-400">thinks like you do</span>
        </h1>

        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Log trades with AI chart analysis, track your ICT setups, run backtests at speed, and let your own
          data tell you where your edge lives.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/register"
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-7 py-3 rounded-xl transition-colors text-sm"
          >
            Start journaling free →
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white font-medium px-7 py-3 rounded-xl transition-colors text-sm"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* ── Mock dashboard screenshot strip ── */}
      <div className="max-w-5xl mx-auto px-5 pb-20">
        <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden shadow-2xl">
          {/* Fake browser bar */}
          <div className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-800/80 border-b border-gray-700">
            <span className="w-3 h-3 rounded-full bg-rose-500/60" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/60" />
            <span className="ml-3 text-xs text-gray-600 bg-gray-900 rounded px-3 py-0.5">tradejournal.app/dashboard</span>
          </div>
          {/* Simulated dashboard content */}
          <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-gray-800">
            {[
              { label: 'Total Trades', val: '142' },
              { label: 'Win Rate', val: '63%' },
              { label: 'Avg R:R', val: '2.4' },
              { label: 'Best Session', val: 'NY Open' },
            ].map(({ label, val }) => (
              <div key={label} className="bg-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className="text-2xl font-bold text-indigo-300">{val}</p>
              </div>
            ))}
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { badge: 'WIN', pair: 'NQ / 15M', setup: 'MMXM', rr: '+3.2R', color: 'emerald' },
              { badge: 'LOSS', pair: 'ES / 5M', setup: 'Liquidity Sweep', rr: '−1.0R', color: 'rose' },
              { badge: 'WIN', pair: 'NQ / 1H', setup: 'CISD + FVG', rr: '+2.8R', color: 'emerald' },
            ].map(({ badge, pair, setup, rr, color }) => (
              <div key={pair} className="flex items-center gap-3 bg-gray-800 rounded-xl p-3">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${color === 'emerald' ? 'bg-emerald-900 text-emerald-300' : 'bg-rose-900 text-rose-300'}`}>{badge}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">{pair}</p>
                  <p className="text-xs text-gray-500">{setup}</p>
                </div>
                <span className={`text-sm font-semibold ${color === 'emerald' ? 'text-emerald-400' : 'text-rose-400'}`}>{rr}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Features ── */}
      <section className="max-w-5xl mx-auto px-5 pb-24">
        <h2 className="text-2xl font-bold text-center mb-3">Everything you need to trade with data</h2>
        <p className="text-gray-500 text-center text-sm mb-12">No fluff. Built specifically for discretionary ICT traders.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon, title, desc }) => (
            <div key={title} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-indigo-900 transition-colors">
              <div className="text-2xl mb-3">{icon}</div>
              <h3 className="font-semibold text-gray-100 mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="bg-gray-900/50 border-y border-gray-800 py-20 px-5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {STEPS.map(({ num, title, desc }) => (
              <div key={num} className="text-center">
                <div className="text-4xl font-black text-indigo-900 mb-3">{num}</div>
                <h3 className="font-semibold text-gray-100 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-2xl mx-auto px-5 py-24 text-center">
        <h2 className="text-3xl font-extrabold mb-4">Ready to trade with purpose?</h2>
        <p className="text-gray-500 text-sm mb-8">Free to use. No credit card required.</p>
        <Link
          to="/register"
          className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors text-sm"
        >
          Create your free account →
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-800 py-8 px-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-indigo-700 flex items-center justify-center text-white font-bold text-[10px]">TJ</div>
            <span>TradeJournal © {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-5">
            <Link to="/privacy-policy" className="hover:text-gray-400 transition-colors">Privacy Policy</Link>
            <Link to="/terms-of-use" className="hover:text-gray-400 transition-colors">Terms of Use</Link>
            <Link to="/login" className="hover:text-gray-400 transition-colors">Sign In</Link>
            <Link to="/register" className="hover:text-gray-400 transition-colors">Register</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
