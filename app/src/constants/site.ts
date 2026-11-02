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
      'After a soft launch in 2022 that lasted for about a month, I pulled the mobile app from the store and rebuilt the listener experience to a stronger standard — what you use today at newstarsradio.com.',
    ],
  },
  {
    title: 'What promotion means to me',
    paragraphs: [
      'It is discovering as many new artists as possible and pushing their music on my station to listeners in a way that mainstream radio would not — or could not — for whatever reason.',
      'Partners who want to reach our audience can contact sales@newstarsradio.com. If you are an unsigned artist, see For artists below.',
    ],
  },
] as const;

/** Crawler-friendly block for unsigned artist submissions (AdSense / discovery). */
export const FOR_ARTISTS_SECTION = {
  title: 'For artists',
  intro:
    'New Stars Radio exists to spotlight undiscovered Hip-Hop and R&B talent. If you are building your name and want airplay on a station that prioritizes new voices, we want to hear from you.',
  genresNote: 'We focus on Hip-Hop and R&B. Send your best work — clean or explicit versions are fine if they are clearly labelled.',
  submitViaEmail:
    'Email us your track for rotation consideration. A dedicated submit form in the app may come later; email is how submissions work today.',
  includeInEmail: [
    'Artist or stage name',
    'Track title',
    'Link to stream (YouTube, SoundCloud, Dropbox, Google Drive, etc.) or attach an MP3/WAV',
    'One or two sentences about you and the song (optional but helpful)',
    'Social handle (optional)',
  ] as const,
  afterYouSend:
    'We listen to every submission we can. We cannot reply to every email, and airplay is not guaranteed — but matching tracks may be added to our automated programme rotation and heard by listeners worldwide.',
  notAcceptedNote:
    'Please do not send copyrighted material you do not own. By submitting, you confirm you have the rights to share the recording for broadcast consideration.',
} as const;

export type ProgrammeShowBlurb = {
  name: string;
  /** Matches the in-app schedule row (Windhoek, CAT). */
  time: string;
  blurb: string;
};

/** Flagship dayparts for About / crawlers — keep names in sync with admin schedule when you rename shows. */
export const PROGRAMME_SHOWS_SECTION = {
  title: 'Programme highlights',
  intro:
    'New Stars Radio runs on an automated programme built around undiscovered Hip-Hop and R&B artists. On Mon–Thu the day is split into named blocks. Open the Schedule tab in the app for the full grid and reminders — all times are Windhoek (CAT).',
  // First 7 Mon–Thu slots from the live admin schedule (keep in sync when those rename).
  shows: [
    {
      name: 'Da Morning Buzz',
      time: '6:00 AM – 7:30 AM',
      blurb: 'A show with a great mix of Hip-Hop and RnB to get your morning started.',
    },
    {
      name: 'Jus 4 Laughs',
      time: '7:30 AM – 8:00 AM',
      blurb: 'A show where stand up comics tell awesome jokes',
    },
    {
      name: 'Morning Street Raps',
      time: '8:00 AM – 10:30 AM',
      blurb: 'Up beat Hip-Hop show',
    },
    {
      name: 'Just RnB',
      time: '10:30 AM – 1:00 PM',
      blurb: 'Up Beat RnB show',
    },
    {
      name: 'KILO',
      time: '1:00 PM – 1:30 PM',
      blurb: 'A show dedicated to local artists',
    },
    {
      name: 'Jus 4 Laughs',
      time: '1:30 PM – 2:00 PM',
      blurb: 'Stand up Comics telling awesome jokes',
    },
    {
      name: 'Just RnB',
      time: '2:00 PM – 3:00 PM',
      blurb: 'Up Beat RnB show',
    },
  ] satisfies readonly ProgrammeShowBlurb[],
} as const;

/** @deprecated Use STATION_ABOUT_STORY_SECTIONS — kept for imports that expect flat paragraphs. */
export const STATION_ABOUT_PARAGRAPHS = STATION_ABOUT_STORY_SECTIONS.flatMap((s) => s.paragraphs);
