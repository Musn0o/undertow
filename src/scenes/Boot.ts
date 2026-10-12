import Phaser from 'phaser';
import { YouTubePlayables } from '../playables/YouTubePlayables';
import { sfx } from '../systems/Sfx';

const readNumber = (data: unknown, key: string, fallback: number): number => {
    if (data && typeof data === 'object' && key in data) {
        const value = (data as Record<string, unknown>)[key];
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }
    }
    return fallback;
};

export class Boot extends Phaser.Scene {
    constructor() {
        super('Boot');
    }

    async create(): Promise<void> {
        // Load cloud save. loadData only resolves here, so it is safe to call
        // saveData later (required ordering for the Playables integration).
        let data: Record<string, unknown> | null = null;
        try {
            data = await YouTubePlayables.withTimeout(
                YouTubePlayables.loadData<Record<string, unknown>>(),
                1500
            );
        } catch (error) {
            console.warn('[Boot] No cloud save available.', error);
        }

        this.registry.set('bestScore', readNumber(data, 'bestScore', 0));
        this.registry.set('totalGames', readNumber(data, 'totalGames', 0));

        const audioEnabled = YouTubePlayables.isAudioEnabled();
        this.registry.set('audioEnabled', audioEnabled);
        sfx.setEnabled(audioEnabled);

        // Save progress on pause; the platform can pause at any time.
        YouTubePlayables.setOnPause(() => {
            void YouTubePlayables.saveData({
                bestScore: this.registry.get('bestScore') ?? 0,
                totalGames: this.registry.get('totalGames') ?? 0
            });
            this.game.pause();
        });

        YouTubePlayables.setOnResume(() => {
            this.game.resume();
        });

        // Obey YouTube's mute/unmute command instantly.
        YouTubePlayables.setAudioChangeCallback((enabled: boolean) => {
            this.registry.set('audioEnabled', enabled);
            sfx.setEnabled(enabled);
        });

        this.scene.start('Preloader');
    }
}
