import { RADIO_CONFIG } from '../constants';
import {
  ADVERTISE_URL,
  BROADCAST_HOURS,
  CONTACT_EMAIL,
  EVENTS_COMING_SOON,
  FAQ_URL,
  LISTEN_GUIDE_URL,
  STATION_ABOUT_STORY_SECTIONS,
} from '../constants/site';
import { PRIVACY_POLICY_URL } from '../constants/privacy';
import { AboutForArtistsSection } from './AboutForArtistsSection';
import { AboutProgrammeShowsSection } from './AboutProgrammeShowsSection';

interface AboutPageContentProps {
  className?: string;
}

export function AboutPageContent({ className = '' }: AboutPageContentProps) {
  return (
    <article className={`space-y-6 text-sm text-gray-300 leading-relaxed ${className}`}>
      <section>
        <h2 className="text-base font-semibold text-pink-300 mb-2">Who we are</h2>
        <p className="text-base sm:text-lg font-bold text-white">{RADIO_CONFIG.STATION_NAME}</p>
        <p className="text-pink-200 mt-1">{RADIO_CONFIG.TAGLINE}</p>
        <p className="mt-3 text-gray-300">
          A Namibia-based online station for people who really love Hip-Hop and R&B — and want to know and hear music
          from up-and-coming artists. Listeners in Namibia and worldwide are welcome.
        </p>
        <p className="mt-3 text-gray-400 text-xs sm:text-sm">
          Not fully launched yet; the stream and site are up while we finish content and ops.
        </p>
      </section>

      {STATION_ABOUT_STORY_SECTIONS.map((section) => (
        <section key={section.title}>
          <h2 className="text-base font-semibold text-pink-300 mb-2">{section.title}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 32)} className="mb-3 last:mb-0">
              {paragraph}
            </p>
          ))}
        </section>
      ))}

      <section>
        <h2 className="text-base font-semibold text-pink-300 mb-2">{BROADCAST_HOURS.title}</h2>
        <p className="mb-3">{BROADCAST_HOURS.intro}</p>
        <ul className="list-disc pl-5 space-y-2">
          {BROADCAST_HOURS.lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <AboutProgrammeShowsSection />

      <AboutForArtistsSection />

      <section>
        <h2 className="text-base font-semibold text-pink-300 mb-2">Events</h2>
        <p>{EVENTS_COMING_SOON}</p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-pink-300 mb-2">What you can do here</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Listen to our live stream free of charge</li>
          <li>View the weekly programme schedule and set show reminders</li>
          <li>Browse station events when listings go live after launch</li>
          <li>Like tracks and install the app on your phone or desktop</li>
        </ul>
        <p className="mt-3">
          See also:{' '}
          <a href={LISTEN_GUIDE_URL} className="text-pink-300 hover:text-pink-200 underline">
            How to listen
          </a>
          ,{' '}
          <a href={FAQ_URL} className="text-pink-300 hover:text-pink-200 underline">
            FAQ
          </a>
          , and{' '}
          <a href={ADVERTISE_URL} className="text-pink-300 hover:text-pink-200 underline">
            Advertise
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-pink-300 mb-2">Contact</h2>
        <p className="mb-2">
          <strong className="text-gray-200">Artists:</strong>{' '}
          <a href="#for-artists" className="text-pink-300 hover:text-pink-200 underline">
            Submit your music
          </a>{' '}
          (see For artists above).
        </p>
        <p>
          <strong className="text-gray-200">Advertising, events, and general enquiries:</strong>{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=New%20Stars%20Radio%20enquiry`}
            className="text-pink-300 hover:text-pink-200 underline"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-pink-300 mb-2">Privacy</h2>
        <p>
          Read how we handle listener data in our{' '}
          <a href={PRIVACY_POLICY_URL} className="text-pink-300 hover:text-pink-200 underline">
            Privacy Policy
          </a>
          .
        </p>
      </section>
    </article>
  );
}
