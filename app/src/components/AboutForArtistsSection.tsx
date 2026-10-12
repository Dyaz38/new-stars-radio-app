import {
  FOR_ARTISTS_SECTION,
  MUSIC_SUBMISSION_EMAIL,
  musicSubmissionMailto,
} from '../constants/site';

interface AboutForArtistsSectionProps {
  className?: string;
}

export function AboutForArtistsSection({ className = '' }: AboutForArtistsSectionProps) {
  return (
    <section id="for-artists" className={`scroll-mt-4 ${className}`}>
      <h2 className="text-base font-semibold text-pink-300 mb-2">{FOR_ARTISTS_SECTION.title}</h2>
      <p className="mb-3">{FOR_ARTISTS_SECTION.intro}</p>
      <p className="mb-3">{FOR_ARTISTS_SECTION.genresNote}</p>
      <p className="mb-3">{FOR_ARTISTS_SECTION.submitViaEmail}</p>
      <p className="mb-2 text-gray-200 font-medium">Include in your email:</p>
      <ul className="list-disc pl-5 space-y-2 mb-4">
        {FOR_ARTISTS_SECTION.includeInEmail.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="mb-3">
        <a
          href={musicSubmissionMailto()}
          className="inline-flex items-center rounded-lg bg-pink-600/90 hover:bg-pink-600 text-white text-sm font-semibold px-4 py-2.5 transition-colors"
        >
          Email {MUSIC_SUBMISSION_EMAIL}
        </a>
      </p>
      <p className="mb-3 text-gray-400 text-xs sm:text-sm">{FOR_ARTISTS_SECTION.afterYouSend}</p>
      <p className="text-gray-400 text-xs sm:text-sm">{FOR_ARTISTS_SECTION.notAcceptedNote}</p>
    </section>
  );
}
