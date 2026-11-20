import { LISTEN_GUIDE_SECTION } from '../constants/site';

interface ListenGuideContentProps {
  className?: string;
}

export function ListenGuideContent({ className = '' }: ListenGuideContentProps) {
  return (
    <article className={`space-y-6 text-sm text-gray-300 leading-relaxed ${className}`}>
      <section>
        <h2 className="text-base font-semibold text-pink-300 mb-2">{LISTEN_GUIDE_SECTION.title}</h2>
        <p className="mb-4">{LISTEN_GUIDE_SECTION.intro}</p>
        <ol className="list-decimal pl-5 space-y-3">
          {LISTEN_GUIDE_SECTION.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="mt-4 text-gray-400 text-xs sm:text-sm">{LISTEN_GUIDE_SECTION.timezoneNote}</p>
      </section>
    </article>
  );
}
