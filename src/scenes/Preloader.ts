import Phaser from 'phaser';
import { YouTubePlayables } from '../playables/YouTubePlayables';
import { GAME } from '../config';

export class Preloader extends Phaser.Scene {
    constructor() {
        super('Preloader');
    }

    create(): void {
        const { width, height } = this.scale;
        const cx = width / 2;
        const cy = height / 2;

        this.cameras.main.setBackgroundColor(GAME.background);

        this.add
            .text(cx, cy - 60, GAME.title, {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '56px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 6
            })
            .setOrigin(0.5);

        const ring = this.add.circle(cx, cy + 70, 34);
        ring.setStrokeStyle(6, GAME.colors[1], 0.9);

        const spinner = this.add.container(cx, cy + 70);
        const knob = this.add.circle(34, 0, 8, GAME.colors[0]);
        spinner.add(knob);
        this.tweens.add({ targets: spinner, angle: 360, duration: 900, repeat: -1 });

        this.add
            .text(cx, cy + 150, 'Loading...', {
                fontFamily: 'Arial, sans-serif',
                fontSize: '24px',
                color: '#9aa4c7'
            })
            .setOrigin(0.5);

        // The loader/splash is now visible: tell YouTube we are rendering.
        YouTubePlayables.firstFrameReady();

        this.time.delayedCall(450, () => this.scene.start('MainMenu'));
    }
}
