import { YouTubePlayables } from '../playables/YouTubePlayables';
import {
    BIOMES,
    DAILY_MISSION_COUNT,
    ECONOMY,
    MISSIONS,
    SKINS,
    getBiome,
    getMission,
    type BiomeDef,
    type MissionMetric
} from '../config';

const STORAGE_KEY = 'undertow.profile.v1';

export interface MissionState {
    id: string;
    target: number;
    progress: number;
    claimed: boolean;
}

export interface ProfileData {
    coins: number;
    xp: number;
    bestScore: number;
    totalGames: number;
    totalDistance: number;
    pearls: number;
    ownedSkins: string[];
    equippedSkin: string;
    selectedBiome: string;
    lastWheel: number;
    dailyDate: string;
    dailyMissions: MissionState[];
    dailyMetrics: Record<string, number>;
}

export interface RunStats {
    score: number;
    distance: number;
    pearls: number;
    bubbles: number;
}

export interface RunReward {
    coins: number;
    xp: number;
    leveledUp: boolean;
    level: number;
    newBiomes: BiomeDef[];
}

const DEFAULT_PROFILE = (): ProfileData => ({
    coins: 0,
    xp: 0,
    bestScore: 0,
    totalGames: 0,
    totalDistance: 0,
    pearls: 0,
    ownedSkins: [SKINS[0].id],
    equippedSkin: SKINS[0].id,
    selectedBiome: BIOMES[0].id,
    lastWheel: 0,
    dailyDate: '',
    dailyMissions: [],
    dailyMetrics: {}
});

const num = (value: unknown, fallback: number): number =>
    typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const todayKey = (): string => {
    const d = new Date();
    const month = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
};

const seedFromString = (text: string): number => {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
};

const mulberry32 = (seed: number): (() => number) => {
    let state = seed;
    return () => {
        state |= 0;
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

const pickDailyMissions = (dateKey: string): MissionState[] => {
    const rng = mulberry32(seedFromString(dateKey));
    const shuffled = [...MISSIONS];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const chosen: typeof MISSIONS = [];
    const usedMetrics = new Set<MissionMetric>();
    for (const mission of shuffled) {
        if (!usedMetrics.has(mission.metric)) {
            usedMetrics.add(mission.metric);
            chosen.push(mission);
        }
        if (chosen.length >= DAILY_MISSION_COUNT) {
            break;
        }
    }
    for (const mission of shuffled) {
        if (chosen.length >= DAILY_MISSION_COUNT) {
            break;
        }
        if (!chosen.includes(mission)) {
            chosen.push(mission);
        }
    }
    return chosen.map((mission) => ({ id: mission.id, target: mission.target, progress: 0, claimed: false }));
};

/**
 * Persistent player profile: currency, XP/level, owned skins and unlocked
 * areas, reward-wheel timing and daily missions.
 *
 * Persistence strategy:
 *  - Inside YouTube Playables we use ONLY the SDK cloud save (saveData), as
 *    required by the integration rules.
 *  - Outside Playables (local dev / the hosted web demo) we fall back to
 *    localStorage so progress still persists for testing.
 */
class ProfileStore {
    private data: ProfileData = DEFAULT_PROFILE();
    private listeners = new Set<() => void>();

    get profile(): Readonly<ProfileData> {
        return this.data;
    }

    onChange(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private emit(): void {
        this.listeners.forEach((listener) => listener());
    }

    async load(): Promise<void> {
        let raw: unknown = null;

        if (YouTubePlayables.isLoaded()) {
            try {
                raw = await YouTubePlayables.withTimeout(YouTubePlayables.loadData<unknown>(), 1500);
            } catch {
                raw = null;
            }
        } else {
            try {
                const stored = window.localStorage.getItem(STORAGE_KEY);
                raw = stored ? JSON.parse(stored) : null;
            } catch {
                raw = null;
            }
        }

        this.data = this.migrate(raw);
        this.refreshDaily();
        this.emit();
    }

    private migrate(raw: unknown): ProfileData {
        const base = DEFAULT_PROFILE();
        if (!raw || typeof raw !== 'object') {
            return base;
        }
        const src = raw as Record<string, unknown>;

        const owned = Array.isArray(src.ownedSkins)
            ? src.ownedSkins.filter((id): id is string => typeof id === 'string' && SKINS.some((s) => s.id === id))
            : [];
        if (!owned.includes(SKINS[0].id)) {
            owned.push(SKINS[0].id);
        }

        const equippedSkin = typeof src.equippedSkin === 'string' && owned.includes(src.equippedSkin)
            ? src.equippedSkin
            : SKINS[0].id;

        const xp = Math.max(0, num(src.xp, 0));
        const level = 1 + Math.floor(xp / ECONOMY.xpPerLevel);
        const biom = BIOMES.find((b) => b.id === src.selectedBiome && b.unlockLevel <= level) ?? BIOMES[0];

        const dailyMissions = Array.isArray(src.dailyMissions)
            ? (src.dailyMissions as unknown[])
                  .filter(
                      (m): m is MissionState =>
                          !!m &&
                          typeof m === 'object' &&
                          typeof (m as MissionState).id === 'string' &&
                          !!getMission((m as MissionState).id)
                  )
                  .map((m) => ({
                      id: m.id,
                      target: num(m.target, getMission(m.id)?.target ?? 1),
                      progress: Math.max(0, num(m.progress, 0)),
                      claimed: m.claimed === true
                  }))
            : [];

        const dailyMetrics: Record<string, number> = {};
        if (src.dailyMetrics && typeof src.dailyMetrics === 'object') {
            for (const [key, value] of Object.entries(src.dailyMetrics as Record<string, unknown>)) {
                dailyMetrics[key] = Math.max(0, num(value, 0));
            }
        }

        return {
            coins: Math.max(0, num(src.coins, 0)),
            xp,
            bestScore: Math.max(0, num(src.bestScore, 0)),
            totalGames: Math.max(0, num(src.totalGames, 0)),
            totalDistance: Math.max(0, num(src.totalDistance, 0)),
            pearls: Math.max(0, num(src.pearls, 0)),
            ownedSkins: owned,
            equippedSkin,
            selectedBiome: biom.id,
            lastWheel: Math.max(0, num(src.lastWheel, 0)),
            dailyDate: typeof src.dailyDate === 'string' ? src.dailyDate : '',
            dailyMissions,
            dailyMetrics
        };
    }

    save(): void {
        if (YouTubePlayables.isLoaded()) {
            void YouTubePlayables.saveData(this.data);
            return;
        }
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        } catch {
            // Ignore storage failures (private mode, quota, etc.).
        }
    }

    //  Progression ---------------------------------------------------------

    get level(): number {
        return 1 + Math.floor(this.data.xp / ECONOMY.xpPerLevel);
    }

    get levelProgress(): number {
        return (this.data.xp % ECONOMY.xpPerLevel) / ECONOMY.xpPerLevel;
    }

    addRun(stats: RunStats): RunReward {
        const levelBefore = this.level;

        const coins = Math.round(
            stats.score * ECONOMY.coinScoreRate +
            stats.pearls * ECONOMY.coinPerPearl +
            stats.bubbles * ECONOMY.coinPerBubble +
            stats.distance * ECONOMY.coinPerMeter
        );
        const xp = Math.round(stats.distance + stats.pearls * 5 + stats.bubbles * 2);

        this.data.coins += coins;
        this.data.xp += xp;
        this.data.totalGames += 1;
        this.data.totalDistance += Math.round(stats.distance);
        this.data.pearls += stats.pearls;
        this.data.bestScore = Math.max(this.data.bestScore, Math.round(stats.score));

        this.refreshDaily();
        this.bumpMetric('distance', Math.round(stats.distance));
        this.bumpMetric('pearls', stats.pearls);
        this.bumpMetric('bubbles', stats.bubbles);
        this.bumpMetric('bestScore', Math.round(stats.score), true);
        this.updateMissionProgress();

        const levelAfter = this.level;
        const newBiomes = BIOMES.filter(
            (b) => b.unlockLevel > levelBefore && b.unlockLevel <= levelAfter
        );

        this.save();
        this.emit();

        return { coins, xp, leveledUp: levelAfter > levelBefore, level: levelAfter, newBiomes };
    }

    addCoins(amount: number): void {
        this.data.coins = Math.max(0, this.data.coins + Math.round(amount));
        this.save();
        this.emit();
    }

    /**
     * Call once when a genuinely new run starts (not on a rewarded-ad
     * continue). Counts toward the "play N runs" daily mission.
     */
    beginRun(): void {
        this.refreshDaily();
        this.bumpMetric('runs', 1);
        this.updateMissionProgress();
        this.save();
        this.emit();
    }

    //  Skins ---------------------------------------------------------------

    isSkinOwned(id: string): boolean {
        return this.data.ownedSkins.includes(id);
    }

    get equippedSkin(): string {
        return this.data.equippedSkin;
    }

    buySkin(id: string): boolean {
        const skin = SKINS.find((s) => s.id === id);
        if (!skin || this.isSkinOwned(id) || this.data.coins < skin.price) {
            return false;
        }
        this.data.coins -= skin.price;
        this.data.ownedSkins.push(id);
        this.data.equippedSkin = id;
        this.save();
        this.emit();
        return true;
    }

    equipSkin(id: string): void {
        if (!this.isSkinOwned(id)) {
            return;
        }
        this.data.equippedSkin = id;
        this.save();
        this.emit();
    }

    grantSkin(id: string): void {
        if (!SKINS.some((s) => s.id === id) || this.isSkinOwned(id)) {
            return;
        }
        this.data.ownedSkins.push(id);
        this.save();
        this.emit();
    }

    //  Areas ---------------------------------------------------------------

    isBiomeUnlocked(id: string): boolean {
        const biome = BIOMES.find((b) => b.id === id);
        return !!biome && this.level >= biome.unlockLevel;
    }

    get selectedBiome(): string {
        return this.data.selectedBiome;
    }

    selectBiome(id: string): void {
        if (!this.isBiomeUnlocked(id)) {
            return;
        }
        this.data.selectedBiome = id;
        this.save();
        this.emit();
    }

    activeBiome(): BiomeDef {
        return getBiome(this.data.selectedBiome);
    }

    //  Reward wheel --------------------------------------------------------

    spinReadyAt(): number {
        return this.data.lastWheel + ECONOMY.wheelIntervalMs;
    }

    canSpin(now: number = Date.now()): boolean {
        return now >= this.spinReadyAt();
    }

    msUntilSpin(now: number = Date.now()): number {
        return Math.max(0, this.spinReadyAt() - now);
    }

    recordSpin(now: number = Date.now()): void {
        this.data.lastWheel = now;
        this.save();
        this.emit();
    }

    //  Daily missions ------------------------------------------------------

    private refreshDaily(): void {
        const key = todayKey();
        if (this.data.dailyDate === key && this.data.dailyMissions.length > 0) {
            return;
        }
        this.data.dailyDate = key;
        this.data.dailyMissions = pickDailyMissions(key);
        this.data.dailyMetrics = {};
    }

    private bumpMetric(metric: MissionMetric, amount: number, useMax = false): void {
        const current = this.data.dailyMetrics[metric] ?? 0;
        this.data.dailyMetrics[metric] = useMax ? Math.max(current, amount) : current + amount;
    }

    private updateMissionProgress(): void {
        for (const mission of this.data.dailyMissions) {
            const def = getMission(mission.id);
            if (!def) {
                continue;
            }
            mission.target = def.target;
            const value = this.data.dailyMetrics[def.metric] ?? 0;
            mission.progress = Math.min(def.target, value);
        }
    }

    getMissions(): ReadonlyArray<MissionState> {
        return this.data.dailyMissions;
    }

    missionProgress(id: string): MissionState | undefined {
        return this.data.dailyMissions.find((m) => m.id === id);
    }

    isMissionComplete(id: string): boolean {
        const mission = this.missionProgress(id);
        return !!mission && mission.progress >= mission.target;
    }

    hasClaimableMissions(): boolean {
        return this.data.dailyMissions.some((m) => !m.claimed && m.progress >= m.target);
    }

    claimableMissionCount(): number {
        return this.data.dailyMissions.filter((m) => !m.claimed && m.progress >= m.target).length;
    }

    incompleteMissionCount(): number {
        return this.data.dailyMissions.filter((m) => m.progress < m.target).length;
    }

    claimMission(id: string): number {
        const mission = this.missionProgress(id);
        const def = getMission(id);
        if (!mission || !def || mission.claimed || mission.progress < mission.target) {
            return 0;
        }
        mission.claimed = true;
        this.data.coins += def.reward;
        this.save();
        this.emit();
        return def.reward;
    }

    /** Restores the daily state on app open even before the first run. */
    syncDaily(): void {
        this.refreshDaily();
        this.updateMissionProgress();
    }
}

export const Profile = new ProfileStore();
