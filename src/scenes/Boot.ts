import Phaser from 'phaser';
import { YouTubePlayables } from '../playables/YouTubePlayables';
import { Profile } from '../systems/Profile';
import { sfx } from '../systems/Sfx';

export class Boot extends Phaser.Scene {
    constructor() {
        super('Boot');
    }

    async create(): Promise<void> {
        // Load the player profile (cloud save inside Playables, localStorage
        // outside). loadData must resolve before saveData is ever called.
        try {
            await Profile.load();
        } catch (error) {
            console.warn('[Boot] Profile load failed.', error);
        }

        const audioEnabled = YouTubePlayables.isAudioEnabled();
        sfx.setEnabled(audioEnabled);

        // Persist progress on pause; the platform can pause at any time.
        YouTubePlayables.setOnPause(() => {
            Profile.save();
            this.game.pause();
        });

        YouTubePlayables.setOnResume(() => {
            this.game.resume();
        });

        // Obey YouTube's mute/unmute command instantly.
        YouTubePlayables.setAudioChangeCallback((enabled: boolean) => {
            sfx.setEnabled(enabled);
        });

        this.scene.start('Preloader');
    }
}
