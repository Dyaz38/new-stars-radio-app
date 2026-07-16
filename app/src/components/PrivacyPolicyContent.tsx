import { RADIO_CONFIG } from '../constants';
import { PRIVACY_CONTACT_EMAIL, PRIVACY_POLICY_LAST_UPDATED } from '../constants/privacy';

interface PrivacyPolicyContentProps {
  className?: string;
}

export function PrivacyPolicyContent({ className = '' }: PrivacyPolicyContentProps) {
  return (
    <article className={`space-y-6 text-sm text-gray-300 leading-relaxed ${className}`}>
      <header>
        <p className="text-xs text-gray-500">Last updated: {PRIVACY_POLICY_LAST_UPDATED}</p>
        <p className="mt-3">
          This Privacy Policy describes how <strong className="text-white">{RADIO_CONFIG.STATION_NAME}</strong>{' '}
          (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) handles information when you use our listener web app at{' '}
          <strong className="text-white">newstarsradio.com</strong> (the &quot;Service&quot;). The Service lets you
          listen to our live radio stream, view the schedule and station events, like tracks, and see advertisements.
        </p>
      </header>

      <section>
        <h2 className="text-base font-semibold text-pink-300 mb-2">Who we are</h2>
        <p>
          {RADIO_CONFIG.STATION_NAME} operates an online radio station focused on Hip-Hop, R&amp;B, and Smooth Jazz.
          For privacy questions or requests, contact us at{' '}
          <a
            href={`mailto:${PRIVACY_CONTACT_EMAIL}?subject=Privacy%20request`}
            className="text-pink-300 hover:text-pink-200 underline"
          >
            {PRIVACY_CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-pink-300 mb-2">Information we collect</h2>
        <p className="mb-3">
          You can listen without creating an account. We do not ask for your name, email, or password in the listener
          app.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-gray-200">Approximate location.</strong> Our servers infer country and sometimes
            city or region from your IP address to show relevant ads and filter station events. This is used when you
            load ads, events, or our geo lookup endpoint.
          </li>
          <li>
            <strong className="text-gray-200">Anonymous identifiers.</strong> We assign random IDs in your browser
            (stored locally) to deliver ads, count impressions and clicks, and sync song likes with our server. These
            IDs are not linked to your real identity by us.
          </li>
          <li>
            <strong className="text-gray-200">Song likes.</strong> If you tap like on a track, we store the artist and
            title on your device and send an anonymous like record to our server for station analytics.
          </li>
          <li>
            <strong className="text-gray-200">Reminders and preferences.</strong> If you enable show or event
            reminders, set a volume level, choose &quot;reduce motion&quot;, filter events by location, or install the
            app, those choices are saved in your browser (local or session storage).
          </li>
          <li>
            <strong className="text-gray-200">Notifications.</strong> If you allow browser notifications, your device
            may show alerts for reminders you set. We do not receive your push subscription on our servers for these
            local reminders.
          </li>
          <li>
            <strong className="text-gray-200">Ad interaction data.</strong> When a paid advertisement is shown, our ad
            server logs impressions and clicks tied to the anonymous user ID and approximate location.
          </li>
          <li>
            <strong className="text-gray-200">Technical logs.</strong> Our hosting providers may log IP addresses,
            request times, and browser type for security and reliability. We use these logs only for operating the
            Service.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-pink-300 mb-2">Information stored on your device</h2>
        <p>
          The app uses browser storage (localStorage and sessionStorage) for items such as: cached schedule and events,
          liked songs, reminder settings, anonymous listener and ad IDs, UI preferences, and PWA install choices. You
          can clear this data anytime via your browser settings or, for the schedule cache, via{' '}
          <strong className="text-gray-200">Settings → Clear schedule cache</strong> in the app.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-pink-300 mb-2">How we use information</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Stream the radio and show now-playing metadata</li>
          <li>Display the programme schedule and station events</li>
          <li>Serve and measure advertisements (including house promos when no paid ad is available)</li>
          <li>Remember your preferences and reminders on your device</li>
          <li>Improve and protect the Service</li>
        </ul>
        <p className="mt-3">We do not sell your personal information.</p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-pink-300 mb-2">Third-party services</h2>
        <p className="mb-3">The Service relies on partners that may collect or process data under their own policies:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-gray-200">Live stream &amp; metadata</strong> — Airtime Pro / Icecast (audio stream
            and track information)
          </li>
          <li>
            <strong className="text-gray-200">Hosting</strong> — Vercel (listener app), Railway (API and ad server)
          </li>
          <li>
            <strong className="text-gray-200">Ad images</strong> — Cloudflare R2 or similar storage for advertiser
            creatives
          </li>
          <li>
            <strong className="text-gray-200">Cover art lookups</strong> — Public APIs such as iTunes Search and
            MusicBrainz when displaying artwork
          </li>
          <li>
            <strong className="text-gray-200">Google AdSense</strong> — When enabled, Google may show ads and use
            cookies or similar technologies on pages where our ad fallback runs. See{' '}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-300 hover:text-pink-200 underline"
            >
              Google&apos;s Privacy Policy
            </a>{' '}
            and{' '}
            <a
              href="https://policies.google.com/technologies/ads"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-300 hover:text-pink-200 underline"
            >
              How Google uses data in advertising
            </a>
            . You can manage ad personalization at{' '}
            <a
              href="https://adssettings.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-300 hover:text-pink-200 underline"
            >
              Google Ads Settings
            </a>
            .
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-pink-300 mb-2">Cookies and similar technologies</h2>
        <p>
          Our own listener app primarily uses browser storage rather than traditional login cookies. Third parties
          (especially Google AdSense when active) may set cookies or use similar identifiers for ad delivery and
          measurement. You can control cookies through your browser settings.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-pink-300 mb-2">Legal bases (EEA / UK visitors)</h2>
        <p>
          If you are in the European Economic Area or the United Kingdom, we process data based on:{' '}
          <strong className="text-gray-200">legitimate interests</strong> (operating the radio, security, non-invasive
          analytics, and contextual or appropriately consented advertising) and, where required,{' '}
          <strong className="text-gray-200">your consent</strong> (for example, browser notifications or personalized
          ads where a consent mechanism applies).
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-pink-300 mb-2">Your choices and rights</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Decline or revoke browser notification permission in your device or browser settings</li>
          <li>Clear site data in your browser to remove local IDs, likes, and cached content</li>
          <li>Use Google&apos;s ad settings if AdSense ads are shown</li>
          <li>
            Contact us to ask about access, correction, deletion, or restriction of data we hold on our servers (such as
            ad logs or anonymous like records), where applicable law gives you these rights
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-pink-300 mb-2">Children</h2>
        <p>
          The Service is not directed at children under 16. We do not knowingly collect personal information from
          children. If you believe a child has provided us information, contact us and we will take appropriate steps.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-pink-300 mb-2">Data retention</h2>
        <p>
          Data on your device remains until you clear it. Server-side ad and analytics logs are kept for a limited
          period needed for reporting, billing advertisers, and security, then deleted or aggregated.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-pink-300 mb-2">International transfers</h2>
        <p>
          Our providers may process data in countries other than yours (including the United States). Where required,
          we rely on appropriate safeguards offered by those providers.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-pink-300 mb-2">Changes</h2>
        <p>
          We may update this policy from time to time. The &quot;Last updated&quot; date at the top will change when we
          do. Continued use of the Service after changes means you accept the updated policy.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-pink-300 mb-2">Contact</h2>
        <p>
          Email{' '}
          <a
            href={`mailto:${PRIVACY_CONTACT_EMAIL}?subject=Privacy%20request`}
            className="text-pink-300 hover:text-pink-200 underline"
          >
            {PRIVACY_CONTACT_EMAIL}
          </a>{' '}
          with any privacy question or request.
        </p>
      </section>
    </article>
  );
}
