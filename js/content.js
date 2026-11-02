/*
 * ALL site content lives here. Edit this file to add or change cards.
 * Anything marked TODO is an unknown value waiting for the real thing.
 *
 * Layout: coordinates are in "world" units (the board is 3000 x 2000).
 * x / y is the CENTER of the card. w / h is its size. rot is degrees.
 * pin is where the pin/tape sits, as a fraction of the card (0..1);
 * red strings attach at that point.
 *
 * To add a card: copy one entry in `cards`, give it a new id, pick an `icon`
 * from `icons` below (or add one), place it, and add `connections` for it.
 */
window.CASE = {
  world: { width: 3000, height: 2000 },

  site: {
    name: 'Malhar Srivatsav',
    shortName: 'Malhar',                 // used where the full name is too long
    tagline: 'Software Engineer: Application Security & Mobile',
    caseNo: 'CASE FILE No. 001'
  },

  /*
   * The tour: the order of PREVIOUS FILE / NEXT FILE in the case file, and of the list view.
   * Every card should appear once. It is linear (no looping): the first file has no previous,
   * the last has no next. Any card left out is added at the end.
   */
  tour: ['profile', 'tech', 'vault', 'phishguard', 'sentinel', 'japanese', 'contact'],

  /*
   * Semantic zoom. The board gets data-zoom-level="far|mid|near" from the camera
   * scale (1 = one world unit per screen pixel):
   *   far  below `mid`           title + icon only
   *   mid  `mid` up to `near`    + tags, summary line
   *   near `near` and above      + content preview
   * `hysteresis` stops the level flickering when the scale hovers on a threshold.
   */
  zoomLevels: { mid: 0.72, near: 1.05, hysteresis: 0.02 },

  /*
   * Atmosphere. The Japan layer is an accent: a dim rising-sun circle behind the
   * board center and a few very faint sakura petals drifting over the screen.
   * Everything here is switched off under prefers-reduced-motion where it moves.
   */
  atmosphere: {
    sun: { x: 1500, y: 1000, r: 560 },   // world units
    petals: { count: 10 },

    /*
     * Backdrop: decoration behind everything so the sides of the wall are not bare (a panelled
     * concrete wall is drawn behind these).
     * All of it is purely visual (no text that says anything about you). Coordinates
     * are world units and may lie outside the 3000 x 2000 board, for wide screens.
     *   banners: hanging cloth banners { x (centre), y (top), w, h, text } with vertical text
     *   sheets:  faded, redacted papers pinned to the wall { x, y (centre), w, h, rot }
     * The concrete panels cover the board itself; banners and papers may sit outside it. None of
     * it is drawn on phone-width screens (css). Remove `backdrop` entirely to get a plain wall.
     */
    backdrop: {
      banners: [
        { x: 105, y: -40, w: 170, h: 1560, text: '調査中' },
        { x: 2975, y: -40, w: 170, h: 1560, text: '機密事項' },
        { x: -215, y: -40, w: 170, h: 1560, text: '事件' },
        { x: 3295, y: -40, w: 170, h: 1560, text: '捜査中' }
      ],
      sheets: [
        { x: 830, y: 150, w: 190, h: 230, rot: 3 },
        { x: 380, y: 760, w: 210, h: 280, rot: -5 },
        { x: 335, y: 1130, w: 200, h: 270, rot: 4 },
        { x: 400, y: 1490, w: 190, h: 250, rot: -3 },
        { x: 2350, y: 150, w: 200, h: 240, rot: -3 },
        { x: 2765, y: 360, w: 200, h: 260, rot: 4 },
        { x: 2800, y: 1240, w: 190, h: 250, rot: -4 },
        { x: 2745, y: 1590, w: 180, h: 240, rot: 3 },
        { x: -55, y: 500, w: 210, h: 280, rot: 4 },
        { x: -95, y: 1320, w: 200, h: 270, rot: -4 },
        { x: 3090, y: 700, w: 210, h: 280, rot: -4 },
        { x: 3130, y: 1450, w: 200, h: 270, rot: 4 },
        { x: 1150, y: -170, w: 220, h: 200, rot: -3 },
        { x: 2050, y: 2160, w: 210, h: 190, rot: -3 }
      ]
    }
  },

  // Free-floating stamps on the wall itself. at = world coordinates (center).
  boardStamps: [
    { text: 'CASE FILE No. 001', tone: 'red', rot: -6, at: [500, 235], size: 'lg' },
    { text: '機密', tone: 'red', rot: 7, at: [1500, 410], size: 'xl', lang: 'ja' },
    { text: '事件ファイル', tone: 'yellow', rot: -5, at: [2700, 1850], size: 'lg', lang: 'ja' }
  ],

  // Line icons on a 24x24 grid (stroke only). Used by the far zoom level.
  icons: {
    person: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
    chip: '<rect x="6" y="6" width="12" height="12" rx="1"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
    shield: '<path d="M12 2.5l8 3v6.2c0 4.7-3.2 8.4-8 9.8-4.8-1.4-8-5.1-8-9.8V5.5z"/><rect x="9" y="10.5" width="6" height="5" rx="1"/><path d="M10.5 10.5V9a1.5 1.5 0 0 1 3 0v1.5"/>',
    hook: '<circle cx="12" cy="4" r="1.6"/><path d="M12 5.6V15a4.5 4.5 0 0 1-9 0"/><path d="M3 15l-1.4-2.6M3 15l2.6-1.2"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    torii: '<path d="M3 6c3 1.5 15 1.5 18 0"/><path d="M5 9.5h14"/><path d="M7 7.5V21M17 7.5V21"/><path d="M12 8v1.5"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 7l9 7 9-7"/>'
  },

  /*
   * Card fields
   *   type:      dossier | index | polaroid | sticky | folder
   *   variant:   optional paper variant (dossier: 'washi')
   *   shortTitle: optional shorter title for tight spots (far zoom, previous / next buttons)
   *   label:     small caps line above the title
   *   icon:      key of `icons`
   *   summary:   one line shown at mid zoom (and read out by screen readers)
   *   tags:      short chips shown at mid zoom
   *   preview:   [key, value] rows shown at near zoom. Keep to 3-5 short rows
   *   status:    optional boxed status line (mid zoom)
   *   redacted:  true adds the black redaction bars
   *   fixture:   pin | tape | both   (pinColor: red | yellow | steel)
   *   stamps:    [{ text, tone: red|black|yellow, size?: sm|lg|xl, rot, at: [fx, fy] }]
   *   hanko:     optional red seal { text (1-2 characters), size (px), rot, at: [fx, fy] }
   *   vertical:  optional Japanese label set vertically along the card's right edge
   *   washi:     true | 'strong': washi-paper fibre texture on top of the card paper
   *   zoomFocus: scale the camera flies to for this card
   *   detail:    { sections: [...] } for the dossier view. Each section has a
   *              `heading` and any of: text (string), list ([string]),
   *              rows ([[label, value]])
   *   links:     [{ label, url, kind, note? }]. url 'TODO' means not filled in yet
   */
  cards: [
    {
      id: 'profile',
      type: 'dossier',
      label: 'SUBJECT FILE',
      icon: 'person',
      title: 'Malhar Srivatsav',
      shortTitle: 'Malhar',       // far zoom, previous / next buttons, OPEN FILE
      subtitle: 'Software Engineer: Application Security & Mobile',
      summary: 'BTech CS student at Manipal Institute of Technology, Bangalore. Into ethical hacking, pentesting, and application and mobile security. Aiming for a career in Japan at the intersection of software engineering and cybersecurity.',
      tags: ['APPSEC', 'MOBILE', 'CLASS OF 2028'],
      preview: [
        ['DEGREE', 'BTech CS'],
        ['SCHOOL', 'Manipal Institute of Technology Bangalore'],
        ['GRADUATES', 'May 2028'],
        ['VENTURE', 'Rift Labs']
      ],
      x: 1500, y: 1000, w: 480, h: 740, rot: -1.5,
      fixture: 'pin', pinColor: 'red', pin: { x: 0.5, y: 0.035 },
      stamps: [{ text: 'CLASSIFIED', tone: 'red', rot: -12, at: [0.7, 0.92] }],
      hanko: { text: '承', size: 70, rot: -8, at: [0.17, 0.92] },
      zoomFocus: 1.2,
      detail: {
        sections: [
          {
            heading: 'SUMMARY',
            text: 'I’m Malhar, but everyone calls me Byte. I’m a third-year BTech Computer Science student at Manipal Institute of Technology, Bangalore, graduating in May 2028.'
          },
          {
            heading: 'WHAT PULLS ME IN',
            text: 'The offensive and defensive side of software: ethical hacking, pentesting, application security, and mobile security. I started out building apps, but I want to work in security rather than stay in general app development. I like understanding how systems break so I can build ones that don’t.'
          },
          {
            heading: 'LONG-TERM GOAL',
            text: 'To work in Japan as a software engineer specializing in cybersecurity. I’m building both the technical skills and the language to get there.'
          },
          {
            heading: 'EDUCATION',
            rows: [
              ['Institution', 'Manipal Institute of Technology Bangalore'],
              ['Degree', 'BTech in Computer Science'],
              ['Graduation', 'May 2028'],
              ['CGPA', '8.64 out of 10']
            ]
          },
          {
            heading: 'EXPERIENCE',
            rows: [
              ['Clazuno', 'Remote software engineering intern since June 2026, building mobile and web features in React Native'],
              ['Rift Labs', 'Founding engineer in Bangalore since 2025']
            ]
          },
          {
            heading: 'ACHIEVEMENTS',
            list: [
              'Hack IITK 2026 finalist, a national cybersecurity hackathon run by IIT Kanpur’s C3i Hub',
              'Over 300 data structures and algorithms problems solved on LeetCode',
              'JLPT N2 certified, with a score of 156 out of 180'
            ]
          },
          { heading: 'SKILLS OVERVIEW', text: 'Comfortable in Python, Java, C, Go, Kotlin, JavaScript and TypeScript. I build for Android and React Native, write backends in Node.js and Go on PostgreSQL, and care most about application and mobile security. The full breakdown is in the Tech Stack file.' }
        ]
      },
      links: [
        { label: 'Preview resume', url: 'assets/resume.pdf', image: 'assets/resume-preview.png', kind: 'preview' },
        { label: 'LinkedIn', url: 'https://www.linkedin.com/in/malhar-srivatsav/', kind: 'linkedin' },
        { label: 'GitHub', url: 'https://github.com/ByteSizedMe', kind: 'github' }
      ]
    },
    {
      id: 'tech',
      type: 'index',
      label: 'TECH STACK',
      icon: 'chip',
      title: 'Tech Stack',
      summary: 'Grouped by language, mobile, security, backend and tools.',
      tags: ['KOTLIN', 'TYPESCRIPT', 'APPSEC'],
      preview: [
        ['LANGUAGES', 'Python, Java, C, Kotlin, JS, TS'],
        ['MOBILE', 'Android, React Native'],
        ['SECURITY', 'JWT, RBAC, AES-256-GCM'],
        ['BACKEND', 'Node.js, Go, PostgreSQL, Redis'],
        ['TOOLS', 'Git, GitHub, Linux']
      ],
      x: 820, y: 560, w: 440, h: 380, rot: 2.5,
      fixture: 'pin', pinColor: 'yellow', pin: { x: 0.5, y: 0.06 },
      stamps: [],
      vertical: '技術',
      zoomFocus: 1.5,
      detail: {
        sections: [
          { heading: 'LANGUAGES', list: ['Python', 'Java', 'C', 'SQL', 'Go', 'Kotlin', 'JavaScript', 'TypeScript'] },
          { heading: 'CS FUNDAMENTALS', list: ['Data structures and algorithms', 'Object-oriented design', 'Databases (DBMS)', 'Operating systems', 'Computer networks', 'Testing'] },
          { heading: 'MOBILE', list: ['Android (Jetpack Compose)', 'React Native (Expo)', 'React'] },
          { heading: 'SECURITY', list: ['JWT authentication', 'RBAC authorization and scopes (Sentinel)', 'Rate limiting', 'AES-256-GCM encryption', 'PBKDF2 key derivation', 'Android Keystore', 'Biometric authentication (BiometricPrompt)', 'Web application security'] },
          { heading: 'BACKEND & CLOUD', list: ['Node.js with Express', 'Go with Chi', 'REST API design', 'PostgreSQL', 'Redis', 'Firebase Auth and Firestore', 'AWS (the basics)', 'Hosting on Render'] },
          { heading: 'HOW I WORK', list: ['Git and GitHub', 'CI with GitHub Actions', 'Docker', 'Code reviews', 'Build and release pipelines (EAS Build)', 'Linux'] }
        ]
      },
      links: []
    },
    {
      id: 'vault',
      type: 'polaroid',
      label: 'EXHIBIT A',
      icon: 'shield',
      title: 'Singularity Vault',
      summary: 'Android security app on Google Play. Built under Rift Labs.',
      tags: ['ANDROID', 'SECURITY', 'GOOGLE PLAY'],
      preview: [
        ['PLATFORM', 'Android'],
        ['STATUS', 'Published on Google Play'],
        ['BUILT UNDER', 'Rift Labs']
      ],
      x: 1950, y: 430, w: 400, h: 540, rot: -3,
      fixture: 'tape', pinColor: 'steel', pin: { x: 0.5, y: 0.03 },
      stamps: [{ text: 'DECLASSIFIED', tone: 'red', rot: 6, at: [0.47, 0.3], size: 'sm' }],
      vertical: '公開済み',
      zoomFocus: 1.4,
      detail: {
        sections: [
          { heading: 'OVERVIEW', text: 'A password manager for Android that works fully offline and never sends your data anywhere (zero-knowledge). Live on Google Play and built under Rift Labs.' },
          {
            heading: 'SECURITY DESIGN',
            list: [
              'Everything is encrypted with AES-256-GCM, and encrypting or decrypting a credential takes under 2 ms',
              'Unlocking runs PBKDF2WithHmacSHA256 for 100,000 iterations (about 1.15 s). That cost is deliberate: it makes brute-forcing painful without making daily use feel slow',
              'Secrets don’t linger: the app locks after 30 seconds idle, clears the clipboard after 20 seconds, and wipes keys from memory when it goes to the background. There is no cloud component at all',
              'Biometric unlock (Android BiometricPrompt) sits on top of the master password, which stays the root of trust, across 5 types of cryptographic operation'
            ]
          },
          { heading: 'MY ROLE', text: 'I’m the founding engineer at Rift Labs and took this app all the way to release.' },
          { heading: 'BUILT WITH', list: ['Android', 'Android (Jetpack Compose)', 'Android Keystore', 'BiometricPrompt API'] }
        ]
      },
      links: [
        { label: 'Google Play', url: 'https://play.google.com/store/apps/details?id=com.riftlabs.singularityvault', kind: 'play' },
        { label: 'GitHub', url: 'https://github.com/theriftlabs/SingularityVault', kind: 'github' }
      ]
    },
    {
      id: 'phishguard',
      type: 'sticky',
      label: 'EXHIBIT B',
      icon: 'hook',
      title: 'PhishGuard',
      summary: 'A phishing-detection API that scores URLs on 15+ risk signals and explains each one.',
      tags: ['TYPESCRIPT', 'NODE.JS', 'POSTGRESQL'],
      preview: [
        ['WHAT', 'Phishing detection REST API'],
        ['SIGNALS', '15+ URL risk signals'],
        ['STACK', 'TypeScript, Node.js, Express, PostgreSQL']
      ],
      x: 2680, y: 920, w: 400, h: 620, rot: 3.5,
      fixture: 'pin', pinColor: 'red', pin: { x: 0.5, y: 0.07 },
      stamps: [],
      zoomFocus: 1.6,
      detail: {
        sections: [
          {
            heading: 'OVERVIEW',
            text: 'A REST API that checks a URL against more than 15 risk signals: Shannon entropy, Punycode homograph tricks, typosquatting (Damerau-Levenshtein distance) and double-encoding evasion, plus lookups against the Google Safe Browsing and URLhaus threat feeds.'
          },
          {
            heading: 'RISK ENGINE',
            text: 'The signals feed one normalized risk score, and the JSON response shows how much each signal contributed. Scan history is stored in PostgreSQL, API keys and rate limiting guard the endpoints, and the service is deployed on Render.'
          },
          { heading: 'BUILT WITH', list: ['TypeScript', 'Node.js', 'Express', 'PostgreSQL', 'Google Safe Browsing', 'URLhaus', 'Render'] }
        ]
      },
      links: [
        { label: 'GitHub', url: 'https://github.com/ByteSizedMe/phishguard', kind: 'github' }
      ]
    },
    {
      id: 'sentinel',
      type: 'folder',
      label: 'EXHIBIT C',
      icon: 'eye',
      title: 'Sentinel',
      summary: 'A Go service that answers "can this user do this?" with allow or deny. Anything not granted is denied.',
      tags: ['GO', 'RBAC', 'POSTGRES', 'REDIS'],
      status: 'BUILT: 2026',
      preview: [
        ['LANGUAGE', 'Go'],
        ['TYPE', 'RBAC authorization microservice'],
        ['STORAGE', 'PostgreSQL, Redis cache'],
        ['TESTS', '570+, about 90% coverage']
      ],
      redacted: true,
      x: 2350, y: 1500, w: 480, h: 460, rot: -2,
      fixture: 'pin', pinColor: 'steel', pin: { x: 0.8, y: 0.04 },
      stamps: [{ text: 'CLASSIFIED: ON GITHUB', tone: 'red', rot: -8, at: [0.5, 0.86] }],
      vertical: '開発完了',
      zoomFocus: 1.4,
      detail: {
        sections: [
          {
            heading: 'OVERVIEW',
            text: 'Sentinel is a Go microservice that other services call to ask one question: can user X do action Y on resource Z? It replies with allow or deny plus a reason, and anything that has not been explicitly granted is denied.'
          },
          {
            heading: 'AT A GLANCE',
            rows: [
              ['Language', 'Go'],
              ['Type', 'RBAC authorization microservice'],
              ['Year', '2026'],
              ['Tests', '570+ at about 89.9% coverage']
            ]
          },
          {
            heading: 'HOW IT WORKS',
            list: [
              'A JSON API with 19 authenticated endpoints for roles, resources, permissions, grants and role assignments',
              'One authorize endpoint returns the decision and writes it to an append-only audit log',
              'Decisions are cached in Redis using the cache-aside pattern. Whenever a policy changes, a generation counter moves forward once the database commit has landed, so every older entry stops matching at once',
              'If Redis goes down, requests fall back to PostgreSQL and the service keeps running'
            ]
          },
          {
            heading: 'ACCESS CONTROL AND ABUSE PROTECTION',
            list: [
              'Every route needs a signed JWT and a scope inside it (authorize, read or admin), so a caller that only asks questions cannot change policy. A route with no scope declared answers 403, and a test fails if one is added without it',
              'Rate limiting in two layers: per client IP before authentication, and per caller after it, with bounded memory and a fixed 429 response'
            ]
          },
          {
            heading: 'SECURITY DESIGN',
            list: [
              'Deny by default: unknown users, resources and actions, and every error path, end in a denial or a 500, never an allow',
              'Parameterized SQL only, with strict input validation and request size limits',
              'JWT checks on HS256: expiry, issuer, audience and subject are required, and every failure gets the same generic 401',
              'The audit log is append-only, enforced by database triggers. If an audit write fails, no decision is returned'
            ]
          },
          {
            heading: 'TESTING AND CI',
            text: 'Over 570 tests at roughly 90% coverage, including integration tests against real PostgreSQL and Redis, with the cache switched off and with Redis unreachable. A GitHub Actions pipeline runs the race detector, govulncheck and gosec on every push. Those tools caught a reachable vulnerability in a dependency (golang.org/x/text) and a log-injection issue, and I fixed both. Local benchmarks showed the cache saving under 10% per decision, since container round trips dominate, so I don’t claim a big speed-up.'
          },
          {
            heading: 'KNOWN LIMITS',
            list: [
              'No role hierarchies, deny rules or wildcard permissions: access is an exact match on role, action and resource',
              'Tokens use HS256 with a shared secret, so anyone holding the secret can mint any scope. It has to be treated like an admin credential. RS256 and key rotation are future work',
              'Scopes are coarse (three for the whole API), and there is no token revocation',
              'Single instance: the rate limits and the cache failure handling live in memory, and behind a proxy all clients would share one IP budget until a trusted-proxy design exists',
              'List endpoints have no pagination yet'
            ]
          },
          { heading: 'BUILT WITH', list: ['Go', 'Chi', 'PostgreSQL (pgx, raw SQL)', 'Redis (go-redis)', 'golang-migrate', 'Docker Compose', 'GitHub Actions'] }
        ]
      },
      links: [
        { label: 'GitHub', url: 'https://github.com/ByteSizedMe/sentinel', kind: 'github' }
      ]
    },
    {
      id: 'japanese',
      type: 'dossier',
      variant: 'washi',
      label: 'LANGUAGE FILE',
      icon: 'torii',
      title: 'Japanese',
      subtitle: '日本語',
      summary: 'JLPT N2 certified. Studying daily, aiming for N1 in July 2027. Goal: work in Japan’s tech industry.',
      tags: ['JLPT N2', 'N1: JULY 2027', 'GOAL: JAPAN'],
      preview: [
        ['JLPT', 'N2 certified (156/180)'],
        ['NEXT', 'N1, planned July 2027'],
        ['HABIT', 'Studies every day'],
        ['GOAL', 'Work in Japan, combining software engineering and cybersecurity']
      ],
      x: 820, y: 1400, w: 420, h: 620, rot: 2,
      fixture: 'both', pinColor: 'red', pin: { x: 0.78, y: 0.035 },
      stamps: [],
      hanko: { text: '日本', size: 132, rot: 9, at: [0.74, 0.88] },
      vertical: '日本語学習',
      washi: 'strong',
      zoomFocus: 1.4,
      detail: {
        sections: [
          {
            heading: 'JLPT',
            rows: [
              ['Status', 'Passed JLPT N2 with 156 out of 180, up from N3'],
              ['Next target', 'JLPT N1, planned for July 2027']
            ]
          },
          {
            heading: 'HABIT',
            text: 'Japanese is one of my two non-negotiable daily routines. I study every day, and I keep a themed vocabulary notebook focused on meaning and usage rather than rote memorization.'
          },
          {
            heading: 'GOAL',
            text: 'I’m interested in Japan’s tech industry and want to work there combining software engineering with cybersecurity. I’m building the language alongside my technical skills so both are ready at the same time.'
          }
        ]
      },
      links: []
    },
    {
      id: 'contact',
      type: 'index',
      label: 'CONTACT',
      icon: 'mail',
      title: 'Contact / Links',
      summary: 'Where to find me: GitHub, LinkedIn and email.',
      tags: ['GITHUB', 'LINKEDIN', 'EMAIL'],
      preview: [
        ['GITHUB', 'ByteSizedMe'],
        ['LINKEDIN', 'malhar-srivatsav'],
        ['EMAIL', 'malharsrivatsav2@gmail.com']
      ],
      x: 1450, y: 1700, w: 460, h: 300, rot: -2.5,
      fixture: 'pin', pinColor: 'yellow', pin: { x: 0.5, y: 0.07 },
      stamps: [{ text: 'TOP SECRET', tone: 'red', rot: 8, at: [0.7, 0.93] }],
      vertical: '連絡先',
      washi: true,
      zoomFocus: 1.5,
      detail: {
        sections: [
          {
            heading: 'CHANNELS',
            rows: [
              ['GitHub', 'github.com/ByteSizedMe'],
              ['LinkedIn', 'linkedin.com/in/malhar-srivatsav'],
              ['Email', 'malharsrivatsav2@gmail.com']
            ]
          }
        ]
      },
      links: [
        { label: 'GitHub', url: 'https://github.com/ByteSizedMe', kind: 'github' },
        { label: 'LinkedIn', url: 'https://www.linkedin.com/in/malhar-srivatsav/', kind: 'linkedin' },
        { label: 'Email', url: 'mailto:malharsrivatsav2@gmail.com', kind: 'email' }
      ]
    }
  ],

  // Red strings. sag is an optional multiplier (default 1).
  connections: [
    { from: 'profile', to: 'tech' },
    { from: 'profile', to: 'japanese' },
    { from: 'tech', to: 'vault', sag: 1.2 },
    { from: 'tech', to: 'phishguard' },
    { from: 'tech', to: 'sentinel' },
    { from: 'vault', to: 'sentinel', sag: 0.8 },
    { from: 'japanese', to: 'contact', sag: 1.1 }
  ]
};
