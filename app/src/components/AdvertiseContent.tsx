import { ADVERTISE_SECTION, CONTACT_EMAIL } from '../constants/site';

interface AdvertiseContentProps {
  className?: string;
}

export function AdvertiseContent({ className = '' }: AdvertiseContentProps) {
  return (
    <article className={`space-y-6 text-sm text-gray-300 leading-relaxed ${className}`}>
      <section>
        <h2 className="text-base font-semibold text-pink-300 mb-2">{ADVERTISE_SECTION.title}</h2>
        <p className="mb-4">{ADVERTISE_SECTION.intro}</p>
        <p className="mb-2 text-gray-200 font-medium">What you can enquire about:</p>
        <ul className="list-disc pl-5 space-y-2 mb-4">
          {ADVERTISE_SECTION.offerings.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="mb-4">{ADVERTISE_SECTION.contactBlurb}</p>
        <p className="mb-4">
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=Advertising%20enquiry%20—%20New%20Stars%20Radio`}
            className="inline-flex items-center rounded-lg bg-pink-600/90 hover:bg-pink-600 text-white text-sm font-semibold px-4 py-2.5 transition-colors"
          >
            Email {CONTACT_EMAIL}
          </a>
        </p>
        <p className="text-gray-400 text-xs sm:text-sm">{ADVERTISE_SECTION.policy}</p>
      </section>
    </article>
  );
}
