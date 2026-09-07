import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { RADIO_CONFIG } from '../constants';
import { SiteFooter } from './SiteFooter';

interface StaticPageShellProps {
  title: string;
  children: ReactNode;
}

export function StaticPageShell({ title, children }: StaticPageShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-pink-900 text-white flex flex-col">
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:py-12">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm text-pink-200 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Back to {RADIO_CONFIG.STATION_NAME}
        </a>

        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
          <p className="text-gray-300 mt-2 text-sm sm:text-base">{RADIO_CONFIG.STATION_NAME}</p>
        </header>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 p-5 sm:p-8">
          {children}
        </div>
      </div>
      <SiteFooter className="mt-auto border-t border-white/10 bg-black/20" />
    </div>
  );
}
