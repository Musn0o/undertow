import { YouTubePlayables } from '../playables/YouTubePlayables';
import { BIOMES, ECONOMY, SKINS, getBiome, type BiomeDef } from '../config';

const STORAGE_KEY = 'undertow.profile.v1';

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
    lastWheel: 0
});

const num = (value: unknown, fallback: number): number =>
    typeof value === 'number' && Number.isFinite(value) ? value : fallback;

/**
 * Persistent player profile: currency, XP/level, owned skins and unlocked
 * areas, plus reward-wheel timing.
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
            lastWheel: Math.max(0, num(src.lastWheel, 0))
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

    xpIntoLevel(): number {
        return this.data.xp % ECONOMY.xpPerLevel;
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

    //  Skins ---------------------------------------------------------------

    isSkinOwned(id: string): boolean {
        return this.data.ownedSkins.includes(id);
    }

    ownsSkin(id: string): boolean {
        return this.isSkinOwned(id);
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
}

export const Profile = new ProfileStore();
