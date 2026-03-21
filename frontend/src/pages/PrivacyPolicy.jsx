import { Link } from "react-router-dom";
import { FiShield } from "react-icons/fi";

const PrivacyPolicy = () => {
  return (
    <div className="pt-20 sm:pt-24 pb-16 sm:pb-24 min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-6 sm:mb-8">
          <FiShield className="text-emerald-600 shrink-0" size={24} />
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">Privacy Policy</h1>
        </div>
        <p className="text-slate-600 mb-8">Last updated: {new Date().toLocaleDateString("en-GB")}</p>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 text-slate-700 text-sm sm:text-base">
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">1. Data Controller</h2>
            <p>
              InvParser is operated by Invoice Parser. We are responsible for the processing of your personal data in connection with this service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">2. Data We Collect</h2>
            <p>We collect and process the following data:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Account data: name, email address, password (hashed)</li>
              <li>Profile data: profile picture (if uploaded)</li>
              <li>Invoices: PDF invoices you upload for processing</li>
              <li>Extracted data: information parsed from your invoices (amounts, dates, suppliers, etc.)</li>
              <li>Usage data: login timestamps, invoice processing status</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">3. Purpose and Legal Basis</h2>
            <p>
              We process your data to provide the invoice extraction service, manage your account, and improve our platform. The legal basis is the performance of our contract with you and our legitimate interest in operating the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">4. Retention</h2>
            <p>
              We retain your data for as long as your account is active. You may request deletion of your account and associated data at any time. Backups may be retained for a limited period for operational recovery.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">5. Security</h2>
            <p>
              We implement appropriate technical and organisational measures to protect your data against unauthorised access, loss, or alteration. Data is stored on secure servers and transmitted over encrypted connections.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">6. Your Rights (GDPR)</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Access your personal data</li>
              <li>Rectify inaccurate data</li>
              <li>Request erasure of your data</li>
              <li>Data portability</li>
              <li>Object to processing</li>
              <li>Lodge a complaint with a supervisory authority</li>
            </ul>
            <p className="mt-2">You can exercise these rights from your profile or by contacting us.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">7. Cookies</h2>
            <p>
              We use essential HTTP-only cookies for authentication (short-lived access session and refresh token). They are necessary for the service to function and do not require consent. If we introduce non-essential cookies (e.g. analytics), we will inform you and obtain your consent.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">8. Contact</h2>
            <p>
              For questions about this Privacy Policy or to exercise your rights, contact us at [your-email@example.com].
            </p>
          </section>
        </div>

        <div className="mt-8">
          <Link to="/" className="text-emerald-600 hover:text-emerald-700 font-medium">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
