/** Public site pages and contact — used in footer, About, and crawler-visible copy. */
export const ABOUT_URL = '/about';
/** Advertising, events, and general business enquiries */
export const CONTACT_EMAIL = 'sales@newstarsradio.com';
/** Unsigned artists submitting tracks for airplay consideration */
export const MUSIC_SUBMISSION_EMAIL = 'music@newstarsradio.com';

export const musicSubmissionMailto = (subject = 'Track submission for New Stars Radio') =>
  `mailto:${MUSIC_SUBMISSION_EMAIL}?subject=${encodeURIComponent(subject)}`;

export const STATION_ABOUT_SUMMARY =
  'New Stars Radio (NSR) is a live online station from Windhoek, Namibia, founded by Dyaz to discover and promote undiscovered Hip-Hop and R&B artists. Listen 24/7, browse the weekly schedule, and explore station events from any device.';

export type AboutStorySection = {
  title: string;
  paragraphs: readonly string[];
};

/** Founder narrative — also mirrored on static /about for crawlers. */
export const STATION_ABOUT_STORY_SECTIONS: readonly AboutStorySection[] = [
  {
    title: "Founder's story",
    paragraphs: [
      'My name is Negumbo, but I go by Dyaz. I started New Stars Radio (NSR) for one reason and one reason only: to find and help promote the music of undiscovered artists in Hip-Hop and R&B.',
      'I have a long love for that genre of music, ever since I was a kid growing up in the 90s in Windhoek, Namibia. My older sister would play R&B tracks in the background while my twin brother and I would hang out in her room — artists like Babyface, Mariah Carey, Toni Braxton, Michael Bolton, Biggie, 2Pac, and more. That was how I slowly fell in love with Hip-Hop and R&B.',
      'Later on in life I got the opportunity to work at one of the biggest urban radio stations in Namibia, Radio 100FM. That is where I got my taste for media, particularly radio broadcasting. I got to see artists walk into the station to try and get their music played on air; some had well-produced tracks, while others did not.',
      'After seeing a fair few of these undiscovered artists get turned down, I decided to take a chance and start my own radio station that prioritizes the promotion of those types of artists.',
      'After a soft launch in 2022 that lasted for about a month, I pulled the app from the store and rebuilt it to a stronger standard — the listener experience you use today at newstarsradio.com.',
    ],
  },
  {
    title: 'What promotion means to me',
    paragraphs: [
      'It is discovering as many new artists as possible and pushing their music on my station to listeners in a way that mainstream radio would not — or could not — for whatever reason.',
      'If you are an artist looking for airtime, email music@newstarsradio.com with your track. Partners who want to reach our audience can contact sales@newstarsradio.com.',
    ],
  },
] as const;

/** @deprecated Use STATION_ABOUT_STORY_SECTIONS — kept for imports that expect flat paragraphs. */
export const STATION_ABOUT_PARAGRAPHS = STATION_ABOUT_STORY_SECTIONS.flatMap((s) => s.paragraphs);
