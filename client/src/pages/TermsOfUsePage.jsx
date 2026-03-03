import { Link } from 'react-router-dom';

export default function TermsOfUsePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link to="/login" className="text-indigo-400 hover:underline text-sm">← Back to TradeJournal</Link>
        </div>

        <h1 className="text-3xl font-bold text-indigo-400 mb-2">Terms of Use</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: March 3, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">1. Acceptance of Terms</h2>
            <p className="text-gray-400">
              By accessing or using TradeJournal ("the Service"), you agree to be bound by these Terms of Use.
              If you do not agree, do not use the Service. These Terms apply to all users of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">2. Description of Service</h2>
            <p className="text-gray-400">
              TradeJournal is a personal trading journal tool that allows users to record, track, and reflect on
              their trading activity. The Service includes AI-assisted chart analysis, performance analytics, and
              backtest logging features.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">3. Not Financial Advice</h2>
            <div className="bg-amber-950/40 border border-amber-900/50 rounded-lg p-4">
              <p className="text-amber-200 font-medium mb-2">Important Disclaimer</p>
              <p className="text-amber-300/80">
                TradeJournal is a journaling and analysis tool only. Nothing within the Service — including AI
                chart analysis, setup suggestions, insights, statistics, or any other feature — constitutes
                financial advice, investment advice, or a recommendation to buy or sell any security, currency,
                futures contract, or other financial instrument. All trading involves substantial risk. Past
                performance is not indicative of future results. You are solely responsible for your own
                trading decisions.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">4. Account Responsibilities</h2>
            <ul className="list-disc list-inside text-gray-400 space-y-2 ml-2">
              <li>You must provide accurate registration information and keep it up to date.</li>
              <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
              <li>You are responsible for all activity that occurs under your account.</li>
              <li>You must be at least 18 years old to use the Service.</li>
              <li>Do not share your account with others or attempt to access another user's account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">5. Acceptable Use</h2>
            <p className="text-gray-400 mb-3">You agree not to:</p>
            <ul className="list-disc list-inside text-gray-400 space-y-2 ml-2">
              <li>Use the Service for any unlawful purpose or in violation of applicable laws.</li>
              <li>Attempt to reverse engineer, decompile, or extract the source code of the Service.</li>
              <li>Use automated scripts or bots to access the Service in an abusive manner.</li>
              <li>Upload content that is malicious, harmful, or infringes third-party rights.</li>
              <li>Attempt to gain unauthorized access to any part of the Service or its underlying infrastructure.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">6. Intellectual Property</h2>
            <p className="text-gray-400">
              The Service and its original content, features, and functionality are owned by TradeJournal and
              are protected by copyright and other intellectual property laws. You retain ownership of the trade
              data and notes you create within the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">7. Third-Party Services</h2>
            <p className="text-gray-400">
              The Service integrates with third-party providers including Google (authentication) and OpenAI
              (chart analysis). Your use of these integrations is also subject to their respective terms of
              service and privacy policies. We are not responsible for the practices of these third parties.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">8. Disclaimer of Warranties</h2>
            <p className="text-gray-400">
              The Service is provided "as is" and "as available" without warranties of any kind, either express
              or implied. We do not warrant that the Service will be uninterrupted, error-free, or free of
              harmful components. AI-generated analysis may be inaccurate and should not be relied upon for
              trading decisions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">9. Limitation of Liability</h2>
            <p className="text-gray-400">
              To the fullest extent permitted by law, TradeJournal shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages — including but not limited to trading
              losses, loss of profits, loss of data, or business interruption — arising from your use of or
              inability to use the Service, even if we have been advised of the possibility of such damages.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">10. Termination</h2>
            <p className="text-gray-400">
              We reserve the right to suspend or terminate your account at our sole discretion, without notice,
              for conduct that violates these Terms or is otherwise harmful to other users, third parties, or
              the Service. You may stop using the Service at any time.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">11. Changes to Terms</h2>
            <p className="text-gray-400">
              We may modify these Terms at any time. Changes will be posted on this page with an updated date.
              Continued use of the Service after changes constitutes your acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">12. Governing Law</h2>
            <p className="text-gray-400">
              These Terms are governed by and construed in accordance with applicable law. Any disputes arising
              from these Terms or the Service shall be resolved through good-faith negotiation, or if necessary,
              through binding arbitration.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">13. Contact</h2>
            <p className="text-gray-400">
              Questions about these Terms may be directed to:{' '}
              <span className="text-indigo-400">support@tradejournal.app</span>
            </p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-gray-800 flex gap-4 text-xs text-gray-600">
          <Link to="/privacy-policy" className="text-gray-500 hover:underline">Privacy Policy</Link>
          <Link to="/terms-of-use" className="text-indigo-500 hover:underline">Terms of Use</Link>
          <Link to="/login" className="text-gray-500 hover:underline">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
