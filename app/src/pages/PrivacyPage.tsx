import { ArrowLeft } from 'lucide-react';
import { RADIO_CONFIG } from '../constants';
import { PrivacyPolicyContent } from '../components/PrivacyPolicyContent';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-pink-900 text-white">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm text-pink-200 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Back to {RADIO_CONFIG.STATION_NAME}
        </a>

        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Privacy Policy</h1>
          <p className="text-gray-300 mt-2 text-sm sm:text-base">{RADIO_CONFIG.STATION_NAME}</p>
        </header>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 p-5 sm:p-8">
          <PrivacyPolicyContent />
        </div>
      </div>
    </div>
  );
}
