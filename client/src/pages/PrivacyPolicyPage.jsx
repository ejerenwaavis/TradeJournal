import { Link } from 'react-router-dom';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link to="/login" className="text-indigo-400 hover:underline text-sm">← Back to TradeJournal</Link>
        </div>

        <h1 className="text-3xl font-bold text-indigo-400 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: March 3, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">1. Overview</h2>
            <p className="text-gray-400">
              TradeJournal ("we", "our", "the Service") is a personal trading journal application. This Privacy Policy
              explains what information we collect, how we use it, and your rights regarding that information. By
              using TradeJournal, you agree to the practices described here.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">2. Information We Collect</h2>
            <ul className="list-disc list-inside text-gray-400 space-y-2 ml-2">
              <li><strong className="text-gray-300">Account data:</strong> Email address, display name, and a securely hashed password when you register with email.</li>
              <li><strong className="text-gray-300">OAuth data:</strong> If you sign in with Google, we receive your Google account email and display name. We do not receive your Google password.</li>
              <li><strong className="text-gray-300">Trade data:</strong> All trade records you create — including instruments, prices, dates, session notes, emotional state, setup types, and trade outcomes.</li>
              <li><strong className="text-gray-300">Chart images:</strong> Screenshots or images you upload for chart analysis are stored and associated with your trade records.</li>
              <li><strong className="text-gray-300">Usage data:</strong> Basic server logs including timestamps and request paths. We do not use third-party analytics trackers.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside text-gray-400 space-y-2 ml-2">
              <li>To authenticate you and maintain your account session.</li>
              <li>To store and display your trade journal entries.</li>
              <li>To generate AI-powered chart analysis and trading insights using your chart images and trade data.</li>
              <li>To improve the Service (aggregate, anonymized usage patterns only).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">4. Third-Party Services</h2>
            <p className="text-gray-400 mb-3">We use the following third-party services to operate TradeJournal:</p>
            <ul className="list-disc list-inside text-gray-400 space-y-2 ml-2">
              <li><strong className="text-gray-300">MongoDB Atlas (MongoDB, Inc.):</strong> Cloud database hosting for all user and trade data. Data is encrypted at rest and in transit.</li>
              <li><strong className="text-gray-300">Google OAuth (Google LLC):</strong> Optional social sign-in. Governed by Google's Privacy Policy.</li>
              <li><strong className="text-gray-300">OpenAI (OpenAI, L.L.C.):</strong> Chart images and TradingView snapshot URLs you submit for analysis are sent to OpenAI's API. OpenAI may process this data under its own usage policies. We recommend not submitting charts containing personally identifiable financial information beyond what is necessary for analysis.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">5. Data Retention</h2>
            <p className="text-gray-400">
              Your data is retained as long as your account is active. If you delete a trade, it is permanently
              removed from our database. If you wish to delete your entire account and all associated data, please
              contact us at the email below and we will process the deletion within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">6. Data Security</h2>
            <p className="text-gray-400">
              Passwords are hashed using bcrypt and never stored in plaintext. All data transmission is encrypted
              via HTTPS/TLS. JWT tokens are used for session authentication. We implement reasonable technical
              safeguards; however, no internet service can guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">7. Your Rights</h2>
            <ul className="list-disc list-inside text-gray-400 space-y-2 ml-2">
              <li><strong className="text-gray-300">Access:</strong> You can view all your trade data within the application at any time.</li>
              <li><strong className="text-gray-300">Deletion:</strong> You may delete individual trades within the app, or request full account deletion by contacting us.</li>
              <li><strong className="text-gray-300">Portability:</strong> Export functionality is on our roadmap. You may request a data export by contacting us.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">8. Children's Privacy</h2>
            <p className="text-gray-400">
              TradeJournal is not intended for users under the age of 18. We do not knowingly collect data from minors.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">9. Changes to This Policy</h2>
            <p className="text-gray-400">
              We may update this Privacy Policy from time to time. Changes will be posted on this page with an
              updated date. Continued use of the Service after changes constitutes acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">10. Contact</h2>
            <p className="text-gray-400">
              For privacy-related questions or data deletion requests, contact us at:{' '}
              <span className="text-indigo-400">support@tradejournal.app</span>
            </p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-gray-800 flex gap-4 text-xs text-gray-600">
          <Link to="/privacy-policy" className="text-indigo-500 hover:underline">Privacy Policy</Link>
          <Link to="/terms-of-use" className="text-gray-500 hover:underline">Terms of Use</Link>
          <Link to="/login" className="text-gray-500 hover:underline">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
