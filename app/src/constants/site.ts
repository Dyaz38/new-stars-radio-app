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
  shows: [
    {
      name: 'Overnight Stars Mix',
      time: '12:00 AM – 5:00 AM',
      blurb:
        'Non-stop overnight rotation of rising Hip-Hop and R&B — deep listens while the world sleeps, with room for tracks we are breaking before daytime listeners catch up.',
    },
    {
      name: 'Morning Hip-Hop Rise',
      time: '7:00 AM – 10:00 AM',
      blurb:
        'Fresh bars and beats from tomorrow’s stars to start your morning — high-energy Hip-Hop focused on new voices, not yesterday’s playlist.',
    },
    {
      name: 'Midday R&B Flow',
      time: '10:00 AM – 2:00 PM',
      blurb:
        'Midday grooves and newer R&B cuts that fit work, study, or the road — smooth enough to focus, still rooted in artists you have not heard on mainstream radio yet.',
    },
    {
      name: 'Afternoon Discovery',
      time: '2:00 PM – 6:00 PM',
      blurb:
        'Deep cuts and debut tracks from unsigned artists we want listeners to discover first — the block most aligned with why NSR exists.',
    },
    {
      name: 'Drive Time Heat',
      time: '6:00 PM – 9:00 PM',
      blurb:
        'Peak-hour Hip-Hop and R&B energy for the commute home — anthems and newcomers side by side when you want the volume up.',
    },
    {
      name: 'Late Night Lounge',
      time: '9:00 PM – 12:00 AM',
      blurb:
        'Slow R&B and mellow late-night Hip-Hop to wind down — still centred on rising talent, with a softer tempo for the end of the day.',
    },
  ] satisfies readonly ProgrammeShowBlurb[],
} as const;

/** @deprecated Use STATION_ABOUT_STORY_SECTIONS — kept for imports that expect flat paragraphs. */
export const STATION_ABOUT_PARAGRAPHS = STATION_ABOUT_STORY_SECTIONS.flatMap((s) => s.paragraphs);
