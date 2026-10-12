export const GAME = {
    title: 'UNDERTOW',
    tagline: 'Hold to rise · release to sink',

    // Original, self-made palette. No borrowed IP, no external assets.
    colors: [0x2ec4b6, 0xff4d6d, 0xffb703, 0x9b5de5],

    background: 0x061a2b,
    backgroundAccent: 0x0b2a4a,

    // Underwater scene colours.
    surfaceColor: 0x14507a,
    deepColor: 0x05121f,
    rock: 0x2a5f7a,
    rockEdge: 0x0c2536,
    jelly: 0xa06cff,
    jellyEdge: 0xd7c2ff,
    bubble: 0x9fe8ff,
    pearl: 0xffe3a3,
    upCurrent: 0x37c7ff,
    downCurrent: 0x2b6bff,
    swimmer: 0x2ec4b6,
    swimmerFin: 0x8ff0e6,

    startingLives: 3,
    reviveRewardId: 'undertow-revive-1',
    interstitialEvery: 3,

    // Swim physics.
    gravity: 1500,
    thrust: 3000,
    drag: 3,
    maxVy: 680,
    currentAccel: 380,
    bandCount: 4,

    // Run pacing.
    speedStart: 240,
    speedMax: 560,
    oxygenDrain: 9,
    bubbleOxygen: 30
} as const;

export type GameConfig = typeof GAME;
