import { RADIO_CONFIG } from '../constants';
import { CONTACT_EMAIL, STATION_ABOUT_PARAGRAPHS } from '../constants/site';
import { PRIVACY_POLICY_URL } from '../constants/privacy';

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
      </section>

      {STATION_ABOUT_PARAGRAPHS.map((paragraph) => (
        <p key={paragraph.slice(0, 24)}>{paragraph}</p>
      ))}

      <section>
        <h2 className="text-base font-semibold text-pink-300 mb-2">What you can do here</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Listen to our live stream free of charge</li>
          <li>View the weekly programme schedule and set show reminders</li>
          <li>Browse station events and add them to your calendar</li>
          <li>Like tracks and install the app on your phone for quick access</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-pink-300 mb-2">Contact</h2>
        <p>
          Email us at{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=New%20Stars%20Radio%20enquiry`}
            className="text-pink-300 hover:text-pink-200 underline"
          >
            {CONTACT_EMAIL}
          </a>{' '}
          for advertising, event listings, or general questions.
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
