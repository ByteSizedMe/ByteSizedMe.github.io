/*
 * ALL site content lives here. Edit this file to add or change cards.
 * Anything marked TODO is an unknown value waiting for the real thing.
 *
 * Coordinates are in "world" units (the board is 3000 x 2000).
 * x / y is the CENTER of the card. w / h is its size. rot is degrees.
 * pin is where the pin/tape sits, as a fraction of the card (0..1);
 * red strings attach at that point.
 */
window.CASE = {
  world: { width: 3000, height: 2000 },

  site: {
    name: 'Byte',
    tagline: 'Software Engineer: Application Security & Mobile',
    caseNo: 'CASE FILE No. 001'
  },

  // Free-floating stamps on the wall itself. at = world coordinates (center).
  boardStamps: [
    { text: 'CASE FILE No. 001', tone: 'red', rot: -6, at: [420, 240], size: 'lg' },
    { text: '機密', tone: 'red', rot: 7, at: [1500, 410], size: 'xl', lang: 'ja' },
    { text: '事件ファイル', tone: 'yellow', rot: -5, at: [2700, 1850], size: 'lg', lang: 'ja' }
  ],

  /*
   * type:    dossier | index | polaroid | sticky | folder
   * variant: optional paper variant (dossier: 'washi')
   * fixture: pin | tape | both   (pinColor: red | yellow | steel)
   * stamps:  [{ text, tone: red|black|yellow, rot, at: [fx, fy] }]  fx/fy are fractions of the card
   * zoomFocus: scale the camera uses when flying to this card (used from Batch 2/4)
   * related:   ids for next/previous navigation along strings (used from Batch 4)
   */
  cards: [
    {
      id: 'profile',
      type: 'dossier',
      label: 'SUBJECT FILE',
      title: 'Byte',
      subtitle: 'Software Engineer: Application Security & Mobile',
      summary: 'BTech CS student at Manipal Institute of Technology Bangalore. Graduating May 2028.',
      x: 1500, y: 1000, w: 480, h: 620, rot: -1.5,
      fixture: 'pin', pinColor: 'red', pin: { x: 0.5, y: 0.035 },
      stamps: [{ text: 'CLASSIFIED', tone: 'red', rot: -12, at: [0.7, 0.9] }],
      zoomFocus: 1.2,
      related: ['tech', 'japanese']
    },
    {
      id: 'tech',
      type: 'index',
      label: 'TECH STACK',
      title: 'Tech Stack',
      summary: 'Languages, mobile, security, backend and tools. TODO: confirm the skill list.',
      x: 820, y: 560, w: 440, h: 320, rot: 2.5,
      fixture: 'pin', pinColor: 'yellow', pin: { x: 0.5, y: 0.06 },
      stamps: [],
      zoomFocus: 1.5,
      related: ['profile', 'vault', 'phishguard', 'sentinel']
    },
    {
      id: 'vault',
      type: 'polaroid',
      label: 'EXHIBIT A',
      title: 'Singularity Vault',
      summary: 'Android security app on Google Play. Built under Rift Labs.',
      x: 1950, y: 430, w: 400, h: 540, rot: -3,
      fixture: 'tape', pinColor: 'steel', pin: { x: 0.5, y: 0.03 },
      stamps: [{ text: 'DECLASSIFIED', tone: 'red', rot: 6, at: [0.47, 0.3] }],
      zoomFocus: 1.4,
      related: ['tech', 'sentinel']
    },
    {
      id: 'phishguard',
      type: 'sticky',
      label: 'EXHIBIT B',
      title: 'PhishGuard',
      summary: 'TODO: description and links.',
      x: 2700, y: 900, w: 340, h: 340, rot: 3.5,
      fixture: 'pin', pinColor: 'red', pin: { x: 0.5, y: 0.07 },
      stamps: [],
      zoomFocus: 1.6,
      related: ['tech']
    },
    {
      id: 'sentinel',
      type: 'folder',
      label: 'PENDING / UPCOMING',
      title: 'Sentinel',
      summary: 'Go RBAC authorization microservice.',
      status: 'PLANNED: JAN 2027',
      redacted: true,
      x: 2350, y: 1500, w: 480, h: 440, rot: -2,
      fixture: 'pin', pinColor: 'steel', pin: { x: 0.8, y: 0.04 },
      stamps: [{ text: 'CLASSIFIED: IN DEVELOPMENT', tone: 'red', rot: -8, at: [0.5, 0.85] }],
      zoomFocus: 1.4,
      related: ['vault', 'tech']
    },
    {
      id: 'japanese',
      type: 'dossier',
      variant: 'washi',
      label: 'LANGUAGE FILE',
      title: 'Japanese',
      subtitle: '日本語',
      summary: 'JLPT: TODO (level / date). Study progress: TODO. Goal: work in Japan, combining software engineering and cybersecurity.',
      x: 820, y: 1400, w: 420, h: 540, rot: 2,
      fixture: 'both', pinColor: 'red', pin: { x: 0.78, y: 0.035 },
      stamps: [],
      zoomFocus: 1.4,
      related: ['profile', 'contact']
    },
    {
      id: 'contact',
      type: 'index',
      label: 'CONTACT',
      title: 'Contact / Links',
      summary: 'GitHub, LinkedIn, email. TODO: add the links.',
      x: 1450, y: 1700, w: 420, h: 300, rot: -2.5,
      fixture: 'pin', pinColor: 'yellow', pin: { x: 0.5, y: 0.07 },
      stamps: [{ text: 'TOP SECRET', tone: 'red', rot: 8, at: [0.78, 0.88] }],
      zoomFocus: 1.5,
      related: ['japanese']
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
