import { CalendarHeart, Mail } from 'lucide-react';
import { HOUSE_EVENT } from '../constants/houseEvent';

export function EventHousePromo() {
  return (
    <article
      className="bg-gradient-to-br from-purple-900/40 via-pink-900/30 to-indigo-900/40 rounded-xl p-3 sm:p-4 border border-pink-500/30"
      data-house-event-promo="true"
    >
      <div className="mb-3 flex w-full max-w-xs mx-auto aspect-[4/3] sm:aspect-[3/2] max-h-[180px] sm:max-h-[220px] flex-col items-center justify-center rounded-lg border border-white/10 bg-gradient-to-br from-purple-600/40 via-pink-600/30 to-indigo-700/40 px-4 text-center shadow-inner">
        <CalendarHeart className="w-10 h-10 sm:w-12 sm:h-12 text-pink-200 mb-2 sm:mb-3" aria-hidden />
        <p className="text-base sm:text-lg font-bold text-white leading-snug">{HOUSE_EVENT.TITLE}</p>
        <p className="text-xs sm:text-sm text-pink-100 mt-1">{HOUSE_EVENT.TAGLINE}</p>
      </div>
      <p className="text-xs sm:text-sm text-gray-300 text-center mb-4 px-1">{HOUSE_EVENT.DESCRIPTION}</p>
      <a
        href={HOUSE_EVENT.CLICK_URL}
        className="flex items-center justify-center gap-2 w-full rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white text-sm sm:text-base font-semibold px-4 py-2.5 transition-colors"
      >
        <Mail className="w-4 h-4 shrink-0" aria-hidden />
        {HOUSE_EVENT.CTA_LABEL}
      </a>
    </article>
  );
}
