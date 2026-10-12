import { PROGRAMME_SHOWS_SECTION } from '../constants/site';

interface AboutProgrammeShowsSectionProps {
  className?: string;
}

export function AboutProgrammeShowsSection({ className = '' }: AboutProgrammeShowsSectionProps) {
  return (
    <section id="programme" className={`scroll-mt-4 ${className}`}>
      <h2 className="text-base font-semibold text-pink-300 mb-2">{PROGRAMME_SHOWS_SECTION.title}</h2>
      <p className="mb-4">{PROGRAMME_SHOWS_SECTION.intro}</p>
      <ul className="space-y-4">
        {PROGRAMME_SHOWS_SECTION.shows.map((show) => (
          <li key={show.name} className="rounded-lg bg-white/5 border border-white/10 p-3 sm:p-4">
            <h3 className="font-semibold text-white text-sm sm:text-base">{show.name}</h3>
            <p className="text-pink-200/90 text-xs sm:text-sm font-mono mt-0.5">{show.time}</p>
            <p className="text-gray-300 text-sm mt-2 leading-relaxed">{show.blurb}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
