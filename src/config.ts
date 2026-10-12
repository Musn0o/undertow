export const GAME = {
    title: 'UNDERTOW',
    tagline: 'Hold to rise · release to sink',

    // Original, self-made palette. No borrowed IP, no external assets.
    colors: [0x2ec4b6, 0xff4d6d, 0xffb703, 0x9b5de5],

    background: 0x061a2b,
    backgroundAccent: 0x0b2a4a,

    // Universal pickup colours.
    bubble: 0x9fe8ff,
    pearl: 0xffe3a3,

    startingLives: 3,
    reviveRewardId: 'undertow-revive-1',
    doubleCoinsRewardId: 'undertow-double-coins-1',
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
    bubbleOxygen: 30,

    // Near-miss feedback.
    nearMissPx: 26,
    nearMissScore: 2,
    nearMissSlowmo: 0.4
} as const;

export type GameConfig = typeof GAME;

export interface SkinDef {
    id: string;
    name: string;
    body: number;
    fin: number;
    trail: number;
    price: number;
}

// Cosmetic swimmer skins, bought with in-game coins.
export const SKINS: SkinDef[] = [
    { id: 'classic', name: 'Classic', body: 0x2ec4b6, fin: 0x8ff0e6, trail: 0x9fe8ff, price: 0 },
    { id: 'sunfish', name: 'Sunfish', body: 0xffb703, fin: 0xffe08a, trail: 0xffe3a3, price: 250 },
    { id: 'mint', name: 'Mint', body: 0x5ce1a6, fin: 0xbff5da, trail: 0xd6ffe9, price: 350 },
    { id: 'ember', name: 'Ember', body: 0xff4d6d, fin: 0xffa3b3, trail: 0xffb3c2, price: 450 },
    { id: 'coral', name: 'Coral', body: 0xff7ab0, fin: 0xffc2da, trail: 0xffd6e6, price: 550 },
    { id: 'violet', name: 'Violet', body: 0x9b5de5, fin: 0xc9a6f5, trail: 0xd9b8ff, price: 700 },
    { id: 'shadow', name: 'Shadow', body: 0x6b6f9c, fin: 0xb9bce0, trail: 0xd0d3f0, price: 900 },
    { id: 'aurora', name: 'Aurora', body: 0x37c7ff, fin: 0xb9ecff, trail: 0xd6f4ff, price: 1000 },
    { id: 'cyber', name: 'Cyber', body: 0x39ff88, fin: 0xff39c8, trail: 0x9bffe0, price: 1300 },
    { id: 'golden', name: 'Golden', body: 0xffe3a3, fin: 0xfff3cf, trail: 0xfff7dd, price: 1600 }
];

export interface BiomeDef {
    id: string;
    name: string;
    unlockLevel: number;
    surface: number;
    deep: number;
    rock: number;
    rockEdge: number;
    jelly: number;
    jellyEdge: number;
    decor: number;
    upCurrent: number;
    downCurrent: number;
    speedMul: number;
    currentMul: number;
    oxygenMul: number;
    jellyMul: number;
}

// Areas/biomes unlocked by levelling up. Each changes the look and the feel.
export const BIOMES: BiomeDef[] = [
    {
        id: 'cove', name: 'Coral Cove', unlockLevel: 1,
        surface: 0x14507a, deep: 0x05121f, rock: 0x2a5f7a, rockEdge: 0x0c2536,
        jelly: 0xa06cff, jellyEdge: 0xd7c2ff, decor: 0x9fe8ff,
        upCurrent: 0x37c7ff, downCurrent: 0x2b6bff,
        speedMul: 1, currentMul: 1, oxygenMul: 1, jellyMul: 1
    },
    {
        id: 'kelp', name: 'Kelp Forest', unlockLevel: 2,
        surface: 0x0f6b4f, deep: 0x032018, rock: 0x1f6b4a, rockEdge: 0x08301f,
        jelly: 0x9b5de5, jellyEdge: 0xd7c2ff, decor: 0x8ff0b0,
        upCurrent: 0x37ffa0, downCurrent: 0x0fae6a,
        speedMul: 1.05, currentMul: 1, oxygenMul: 1, jellyMul: 1.1
    },
    {
        id: 'trench', name: 'Midnight Trench', unlockLevel: 4,
        surface: 0x2a1b5a, deep: 0x06031a, rock: 0x3b2a6e, rockEdge: 0x140a33,
        jelly: 0xff4d6d, jellyEdge: 0xffb3c2, decor: 0xc9a6f5,
        upCurrent: 0x9b5de5, downCurrent: 0x5a2bff,
        speedMul: 1.1, currentMul: 1.3, oxygenMul: 1.1, jellyMul: 1.15
    },
    {
        id: 'frozen', name: 'Frozen Reach', unlockLevel: 6,
        surface: 0x2f6f8f, deep: 0x081f2e, rock: 0x6fa8c4, rockEdge: 0x244a5e,
        jelly: 0x37c7ff, jellyEdge: 0xd6f4ff, decor: 0xd6f4ff,
        upCurrent: 0xb9ecff, downCurrent: 0x37c7ff,
        speedMul: 1.15, currentMul: 1.1, oxygenMul: 1.2, jellyMul: 1.2
    },
    {
        id: 'vents', name: 'Volcanic Vents', unlockLevel: 8,
        surface: 0x6b1f1f, deep: 0x1a0505, rock: 0x7a3320, rockEdge: 0x2e0f08,
        jelly: 0xffb703, jellyEdge: 0xffe08a, decor: 0xff8a5c,
        upCurrent: 0xff6b3d, downCurrent: 0xd42a2a,
        speedMul: 1.2, currentMul: 1.4, oxygenMul: 1.35, jellyMul: 1.3
    },
    {
        id: 'abyss', name: 'The Abyss', unlockLevel: 10,
        surface: 0x0a1230, deep: 0x01030c, rock: 0x1b2452, rockEdge: 0x050818,
        jelly: 0x37c7ff, jellyEdge: 0xb9ecff, decor: 0x6f8bff,
        upCurrent: 0x5a2bff, downCurrent: 0x1b3aff,
        speedMul: 1.25, currentMul: 1.5, oxygenMul: 1.5, jellyMul: 1.35
    },
    {
        id: 'aurora', name: 'Aurora Deep', unlockLevel: 12,
        surface: 0x1f6f6b, deep: 0x05161a, rock: 0x2f8f7a, rockEdge: 0x0c332a,
        jelly: 0xff7ad9, jellyEdge: 0xffd6f4, decor: 0x9fffd0,
        upCurrent: 0x37ffd0, downCurrent: 0xff7ad9,
        speedMul: 1.3, currentMul: 1.3, oxygenMul: 1.4, jellyMul: 1.4
    }
];

export const ECONOMY = {
    xpPerLevel: 400,
    wheelIntervalMs: 5 * 60 * 1000,
    coinScoreRate: 0.6,
    coinPerPearl: 3,
    coinPerBubble: 1,
    coinPerMeter: 0.2,
    wheelCoins: [50, 75, 100, 150, 250, 400]
} as const;

export type MissionMetric = 'distance' | 'pearls' | 'bubbles' | 'runs' | 'bestScore';

export interface MissionDef {
    id: string;
    metric: MissionMetric;
    target: number;
    reward: number;
    label: string;
}

export const DAILY_MISSION_COUNT = 4;

// Pool the day's missions are drawn from.
export const MISSIONS: MissionDef[] = [
    { id: 'dist500', metric: 'distance', target: 500, reward: 120, label: 'Dive 500m today' },
    { id: 'dist1200', metric: 'distance', target: 1200, reward: 260, label: 'Dive 1,200m today' },
    { id: 'pearls15', metric: 'pearls', target: 15, reward: 100, label: 'Collect 15 pearls' },
    { id: 'pearls30', metric: 'pearls', target: 30, reward: 200, label: 'Collect 30 pearls' },
    { id: 'bubbles20', metric: 'bubbles', target: 20, reward: 100, label: 'Grab 20 air bubbles' },
    { id: 'bubbles40', metric: 'bubbles', target: 40, reward: 220, label: 'Grab 40 air bubbles' },
    { id: 'runs3', metric: 'runs', target: 3, reward: 80, label: 'Play 3 runs' },
    { id: 'runs6', metric: 'runs', target: 6, reward: 160, label: 'Play 6 runs' },
    { id: 'score250', metric: 'bestScore', target: 250, reward: 150, label: 'Score 250 in one run' },
    { id: 'score500', metric: 'bestScore', target: 500, reward: 300, label: 'Score 500 in one run' }
];

export const getSkin = (id: string): SkinDef => SKINS.find((s) => s.id === id) ?? SKINS[0];
export const getBiome = (id: string): BiomeDef => BIOMES.find((b) => b.id === id) ?? BIOMES[0];
export const getMission = (id: string): MissionDef | undefined => MISSIONS.find((m) => m.id === id);
