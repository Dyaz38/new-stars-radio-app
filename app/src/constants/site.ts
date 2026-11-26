/** Public site pages and contact — used in footer, About, and crawler-visible copy. */
export const ABOUT_URL = '/about';
export const LISTEN_GUIDE_URL = '/listen';
export const FAQ_URL = '/faq';
export const ADVERTISE_URL = '/advertise';

/** Advertising, events, and general business enquiries */
export const CONTACT_EMAIL = 'sales@newstarsradio.com';
/** Unsigned artists submitting tracks for airplay consideration */
export const MUSIC_SUBMISSION_EMAIL = 'music@newstarsradio.com';

export const musicSubmissionMailto = (subject = 'Track submission for New Stars Radio') =>
  `mailto:${MUSIC_SUBMISSION_EMAIL}?subject=${encodeURIComponent(subject)}`;

export const STATION_ABOUT_SUMMARY =
  'New Stars Radio (NSR) is a Namibia-based online station for people who love Hip-Hop and R&B and want to hear up-and-coming artists. Listen live, browse the weekly schedule, and explore station events from any device.';

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
      'A soft launch some years ago happened while I was in Windhoek. Since then I have moved to Okahao, Namibia, and still hope to return to Windhoek one day. New Stars Radio remains a Namibia-based online station.',
      'Not fully launched yet — the stream and site are up while we finish content and ops. What you use today at newstarsradio.com is the rebuilt listener experience.',
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
  genresNote:
    'Most of what we play is Hip-Hop and R&B, but we reserve the right to play other genres when a track is strong enough for air.',
  howWeChoose:
    'I listen first. If I like a track, I add it to the music roster and play it. Most tracks I find online; how many new songs join in a week depends on how many I hear and like. Production should be clear — instrumental and vocals.',
  submitViaEmail:
    'Email us your track for rotation consideration. A dedicated submit form in the app may come later; email is how submissions work today.',
  includeInEmail: [
    'Artist or stage name',
    'Track title',
    'Year (and other metadata already in the file when possible: track name, artist name, etc.)',
    'Link to stream (YouTube, SoundCloud, Dropbox, Google Drive, etc.) or attach an MP3/WAV',
    'One or two sentences about you and the song (optional but helpful)',
    'Social handle (optional)',
  ] as const,
  afterYouSend:
    'We listen to every submission we can. We cannot reply to every email, and airplay is not guaranteed — but matching tracks may be added to our programme rotation and heard by listeners worldwide.',
  notAcceptedNote:
    'Please do not send copyrighted material you do not own. By submitting, you confirm you have the rights to share the recording for broadcast consideration.',
} as const;

export type ProgrammeShowBlurb = {
  name: string;
  /** Schedule row time label (currently listed in Windhoek / CAT). */
  time: string;
  blurb: string;
};

/** Flagship shows for About / crawlers — keep names in sync with admin schedule when you rename shows. */
export const PROGRAMME_SHOWS_SECTION = {
  title: 'Programme highlights',
  intro:
    'New Stars Radio runs on an automated programme built around undiscovered Hip-Hop and R&B artists. Open the Schedule tab in the app for the full Mon–Sun grid and reminders. In the app, show times are converted to your local clock; the station itself runs on Namibia time (Windhoek, CAT). Times below are Namibia time.',
  shows: [
    {
      name: 'Da Morning Buzz',
      time: '6:00 AM – 7:30 AM',
      blurb: 'A morning show to help get your body up and your mind going.',
    },
    {
      name: 'Jus 4 Laughs',
      time: '7:30 AM – 8:00 AM',
      blurb:
        'A standup comedy show to get listeners laughing hard — a great break from the music.',
    },
    {
      name: 'Morning Street Raps',
      time: '8:00 AM – 10:30 AM',
      blurb:
        'An upbeat Hip-Hop show to get listeners bobbing their heads to some of the best tracks from up-and-coming Hip-Hop artists.',
    },
    {
      name: 'Just RnB',
      time: '10:30 AM – 1:00 PM',
      blurb: 'Up Beat RnB show',
    },
    {
      name: 'KILO (Keeping It Local)',
      time: '1:00 PM – 1:30 PM',
      blurb:
        'Keeping It Local — a show exclusively for local Hip-Hop and R&B artists to showcase their music to a listening local audience.',
    },
    {
      name: 'Jus 4 Laughs',
      time: '1:30 PM – 2:00 PM',
      blurb: 'Standup comedy — another laugh break in the afternoon.',
    },
    {
      name: 'Just RnB',
      time: '2:00 PM – 3:00 PM',
      blurb: 'Up Beat RnB show',
    },
  ] satisfies readonly ProgrammeShowBlurb[],
} as const;

export const BROADCAST_HOURS = {
  title: 'Broadcast hours',
  intro: 'We are not a 24-hour broadcast yet. Hours below are Namibia time (CAT).',
  lines: [
    'Monday–Thursday: 16 hours a day',
    'Friday–Saturday: 18 hours a day',
    'Sunday: 16 hours a day',
  ] as const,
} as const;

export const LISTEN_GUIDE_SECTION = {
  title: 'How to listen',
  intro: 'New Stars Radio streams in your browser — no account required.',
  steps: [
    'Open newstarsradio.com and press Play to start the live stream.',
    'Check the Schedule for today’s shows and set reminders when you want a heads-up.',
    'Browse Events for station listings (more coming after full launch).',
    'Tap the heart on a track to show you like it.',
    'Use Share on now playing to send a song to a friend.',
    'Install New Stars Radio as an app on your phone or desktop when your browser offers Add to Home Screen / Install (PWA).',
  ] as const,
  timezoneNote:
    'In the app, schedule times are shown in your local clock. The station runs on Namibia time (Windhoek, CAT).',
} as const;

export type FaqItem = {
  question: string;
  answer: string;
};

export const FAQ_SECTION = {
  title: 'Frequently asked questions',
  intro: 'Quick answers about New Stars Radio.',
  items: [
    {
      question: 'Is New Stars Radio free to listen?',
      answer: 'Yes. Open newstarsradio.com and press Play — no subscription required.',
    },
    {
      question: 'Where are you based?',
      answer:
        'New Stars Radio is a Namibia-based online station. The founder story spans Windhoek (where a soft launch happened years ago) and Okahao (where operations are based today), with plans to return to Windhoek in the future.',
    },
    {
      question: 'What music do you play?',
      answer:
        'Mostly Hip-Hop and R&B from up-and-coming artists. We may also play other genres when a track is strong enough for air.',
    },
    {
      question: 'How do I submit my music?',
      answer:
        'Email music@newstarsradio.com with your track (or a stream link). Include metadata in the file when possible — track name, artist name, year, and so on. See For artists on the About page for the full checklist.',
    },
    {
      question: 'Can I advertise on the station?',
      answer:
        'Yes. We offer app banner ads and event listings. Email sales@newstarsradio.com — we review every enquiry.',
    },
    {
      question: 'What are your broadcast hours?',
      answer:
        'Monday–Thursday and Sunday: 16 hours a day. Friday–Saturday: 18 hours a day. Times follow Namibia (CAT).',
    },
  ] satisfies readonly FaqItem[],
} as const;

export const ADVERTISE_SECTION = {
  title: 'Advertise with New Stars Radio',
  intro:
    'Reach listeners who love Hip-Hop, R&B, and up-and-coming artists. Anyone can enquire — local businesses, events, brands, and more.',
  offerings: [
    'App banner ads in the listener experience',
    'Station event listings for your show or venue',
  ] as const,
  contactBlurb: 'Tell us what you want to promote and we will follow up with options.',
  policy:
    'We review every enquiry. We don’t run ads for illegal products/services, tobacco, weapons, adult sexual services, or misleading offers. Final approval is ours.',
} as const;

export const EVENTS_COMING_SOON =
  'Events coming after launch — check back soon. When we go fully live, station events will appear in the app Events section.';

/** @deprecated Use STATION_ABOUT_STORY_SECTIONS — kept for imports that expect flat paragraphs. */
export const STATION_ABOUT_PARAGRAPHS = STATION_ABOUT_STORY_SECTIONS.flatMap((s) => s.paragraphs);
