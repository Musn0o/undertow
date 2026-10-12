import Phaser from 'phaser';
import { YouTubePlayables } from '../playables/YouTubePlayables';
import { GAME } from '../config';
import { sfx } from '../systems/Sfx';

interface GameOverData {
    score?: number;
}

export class GameOver extends Phaser.Scene {
    private score = 0;
    private reviving = false;

    constructor() {
        super('GameOver');
    }

    init(data: GameOverData = {}): void {
        this.score = data.score ?? 0;
        this.reviving = false;
    }

    create(): void {
        const { width, height } = this.scale;
        const cx = width / 2;
        const cy = height / 2;

        this.cameras.main.setBackgroundColor(GAME.background);

        const bestBefore = (this.registry.get('bestScore') as number) ?? 0;
        const isBest = this.score > bestBefore;
        if (isBest) {
            this.registry.set('bestScore', this.score);
        }

        const totalGames = ((this.registry.get('totalGames') as number) ?? 0) + 1;
        this.registry.set('totalGames', totalGames);

        // Persist progress and report the run's score to YouTube.
        void YouTubePlayables.saveData({
            bestScore: this.registry.get('bestScore'),
            totalGames
        });
        YouTubePlayables.sendScore(this.score);

        // Interstitial at a natural breakpoint, if the region/platform supports it.
        if (totalGames % GAME.interstitialEvery === 0) {
            void YouTubePlayables.requestInterstitialAd();
        }

        this.add
            .text(cx, cy - Math.min(160, height * 0.26), 'GAME OVER', {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '52px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 7
            })
            .setOrigin(0.5);

        this.add
            .text(cx, cy - 60, `${this.score}`, {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '80px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 7
            })
            .setOrigin(0.5);

        if (isBest) {
            this.add
                .text(cx, cy - 6, 'NEW BEST!', {
                    fontFamily: 'Arial Black, Arial, sans-serif',
                    fontSize: '28px',
                    color: '#ffb703',
                    stroke: '#000000',
                    strokeThickness: 5
                })
                .setOrigin(0.5);
        }

        this.add
            .text(cx, cy + 40, `BEST ${this.registry.get('bestScore')}`, {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '26px',
                color: '#9aa4c7'
            })
            .setOrigin(0.5);

        this.makeButton(cx, cy + 140, 'PLAY AGAIN', GAME.colors[1], () => {
            sfx.resume();
            sfx.click();
            this.scene.start('Game');
        });

        this.makeButton(cx, cy + 224, `WATCH AD  +${GAME.startingLives} LIVES`, GAME.colors[0], () => {
            void this.revive();
        });

        this.input.keyboard?.once('keydown-SPACE', () => {
            sfx.resume();
            sfx.click();
            this.scene.start('Game');
        });
    }

    private async revive(): Promise<void> {
        if (this.reviving) {
            return;
        }
        this.reviving = true;
        sfx.resume();
        sfx.click();

        // Locally (not in the Playables env) ads resolve false, so allow the
        // revive to be tested without an ad.
        const granted = YouTubePlayables.isLoaded()
            ? await YouTubePlayables.requestRewardedAd(GAME.reviveRewardId)
            : true;

        this.reviving = false;

        if (granted) {
            this.scene.start('Game', {
                revive: true,
                score: this.score,
                lives: GAME.startingLives
            });
        }
    }

    private makeButton(
        x: number,
        y: number,
        label: string,
        color: number,
        onClick: () => void
    ): Phaser.GameObjects.Container {
        const text = this.add
            .text(0, 0, label, {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '26px',
                color: '#ffffff'
            })
            .setOrigin(0.5);

        const buttonWidth = text.width + 56;
        const background = this.add
            .rectangle(0, 0, buttonWidth, 66, color, 0.95)
            .setStrokeStyle(3, 0xffffff, 0.55);

        const container = this.add.container(x, y, [background, text]);
        background.setInteractive({ useHandCursor: true });
        background.on('pointerover', () => container.setScale(1.04));
        background.on('pointerout', () => container.setScale(1));
        background.on('pointerdown', () => {
            background.setScale(0.96);
            onClick();
        });

        return container;
    }
}
