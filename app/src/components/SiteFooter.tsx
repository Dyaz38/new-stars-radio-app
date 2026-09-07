import { RADIO_CONFIG } from '../constants';
import { PRIVACY_POLICY_URL } from '../constants/privacy';
import { ABOUT_URL, CONTACT_EMAIL } from '../constants/site';

interface SiteFooterProps {
  className?: string;
}

export function SiteFooter({ className = '' }: SiteFooterProps) {
  return (
    <footer
      className={`px-4 py-6 sm:py-8 text-center text-xs sm:text-sm text-gray-400 ${className}`}
      aria-label="Site footer"
    >
      <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mb-3" aria-label="Legal and information">
        <a href={ABOUT_URL} className="text-pink-300 hover:text-pink-200 underline">
          About
        </a>
        <a href={PRIVACY_POLICY_URL} className="text-pink-300 hover:text-pink-200 underline">
          Privacy Policy
        </a>
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=New%20Stars%20Radio%20enquiry`}
          className="text-pink-300 hover:text-pink-200 underline"
        >
          Contact
        </a>
      </nav>
      <p>
        © {new Date().getFullYear()} {RADIO_CONFIG.STATION_NAME}. {RADIO_CONFIG.TAGLINE}.
      </p>
    </footer>
  );
}
