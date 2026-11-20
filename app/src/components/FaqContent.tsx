import { ABOUT_URL, FAQ_SECTION } from '../constants/site';

interface FaqContentProps {
  className?: string;
}

export function FaqContent({ className = '' }: FaqContentProps) {
  return (
    <article className={`space-y-6 text-sm text-gray-300 leading-relaxed ${className}`}>
      <section>
        <h2 className="text-base font-semibold text-pink-300 mb-2">{FAQ_SECTION.title}</h2>
        <p className="mb-6">{FAQ_SECTION.intro}</p>
        <div className="space-y-5">
          {FAQ_SECTION.items.map((item) => (
            <div key={item.question}>
              <h3 className="text-white font-semibold mb-1">{item.question}</h3>
              <p>{item.answer}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-gray-400 text-xs sm:text-sm">
          More about the station on our{' '}
          <a href={ABOUT_URL} className="text-pink-300 hover:text-pink-200 underline">
            About
          </a>{' '}
          page.
        </p>
      </section>
    </article>
  );
}
