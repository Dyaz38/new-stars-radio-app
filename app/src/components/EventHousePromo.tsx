import { CalendarHeart, Mail } from 'lucide-react';
import { HOUSE_EVENT } from '../constants/houseEvent';

/** Always-visible promo for event listings — compact banner like the house ad strip. */
export function EventHousePromo() {
  return (
    <article
      className="rounded-xl border border-pink-500/30 bg-gradient-to-r from-purple-800/80 via-pink-700/70 to-purple-900/80 p-3 sm:p-4 shadow-md"
      data-house-event-promo="true"
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg bg-white/10 border border-white/10">
          <CalendarHeart className="h-6 w-6 sm:h-7 sm:w-7 text-pink-100" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base sm:text-lg font-bold text-white leading-snug">{HOUSE_EVENT.TITLE}</p>
          <p className="text-xs sm:text-sm text-pink-100 mt-0.5">{HOUSE_EVENT.TAGLINE}</p>
          <p className="text-xs sm:text-sm text-purple-100/90 mt-1.5 leading-snug">{HOUSE_EVENT.DESCRIPTION}</p>
        </div>
      </div>
      <a
        href={HOUSE_EVENT.CLICK_URL}
        className="mt-3 flex items-center justify-center gap-2 w-full rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 text-white text-sm font-semibold px-4 py-2 transition-colors"
      >
        <Mail className="w-4 h-4 shrink-0" aria-hidden />
        {HOUSE_EVENT.CTA_LABEL}
      </a>
    </article>
  );
}
