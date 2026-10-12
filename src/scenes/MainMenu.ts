import Phaser from 'phaser';
import { YouTubePlayables } from '../playables/YouTubePlayables';
import { GAME } from '../config';
import { sfx } from '../systems/Sfx';

export class MainMenu extends Phaser.Scene {
    constructor() {
        super('MainMenu');
    }

    create(): void {
        const { width, height } = this.scale;
        const cx = width / 2;
        const cy = height / 2;
        const min = Math.min(width, height);

        this.cameras.main.setBackgroundColor(GAME.background);

        // Decorative concentric rings.
        const deco = this.add.graphics();
        const baseR = min * 0.36;
        for (let i = 0; i < 4; i++) {
            deco.lineStyle(3, GAME.colors[i], 0.5);
            deco.beginPath();
            deco.arc(cx, cy + 40, baseR + i * 26, 0, Math.PI * 2, false);
            deco.strokePath();
        }

        const spinner = this.add.container(cx, cy + 40);
        const knob = this.add.circle(baseR, 0, 12, GAME.colors[0]);
        spinner.add(knob);
        this.tweens.add({ targets: spinner, angle: 360, duration: 2600, repeat: -1 });

        this.add
            .text(cx, cy - min * 0.3, GAME.title, {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '64px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 8
            })
            .setOrigin(0.5);

        this.add
            .text(cx, cy - min * 0.3 + 52, GAME.tagline, {
                fontFamily: 'Arial, sans-serif',
                fontSize: '24px',
                color: '#9aa4c7'
            })
            .setOrigin(0.5);

        const best = (this.registry.get('bestScore') as number) ?? 0;
        this.add
            .text(cx, cy + min * 0.32, `BEST ${best}`, {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '28px',
                color: '#ffb703'
            })
            .setOrigin(0.5);

        const prompt = this.add
            .text(cx, cy + min * 0.32 + 64, 'TAP TO PLAY', {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '32px',
                color: '#2ec4b6',
                stroke: '#000000',
                strokeThickness: 5
            })
            .setOrigin(0.5);
        this.tweens.add({ targets: prompt, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });

        const start = (): void => {
            sfx.resume();
            sfx.click();
            this.scene.start('Game');
        };

        this.input.once('pointerdown', start);
        this.input.keyboard?.once('keydown-SPACE', start);
        this.input.keyboard?.once('keydown-ENTER', start);

        // Dev-only shortcut: open with #play to jump straight into a run.
        if (window.location.hash === '#play') {
            this.time.delayedCall(60, start);
        }

        // The menu is interactive now: notify YouTube.
        YouTubePlayables.gameReady();
    }
}
