import Phaser from 'phaser';
import { YouTubePlayables } from '../playables/YouTubePlayables';
import { GAME } from '../config';
import { Profile, type RunStats } from '../systems/Profile';
import { sfx } from '../systems/Sfx';
import { UIButton } from '../ui/Button';
import { makeCoin } from '../ui/icons';

interface AwardedTotals {
    score: number;
    distance: number;
    pearls: number;
    bubbles: number;
}

interface GameOverData {
    score?: number;
    distance?: number;
    pearls?: number;
    bubbles?: number;
    awarded?: AwardedTotals;
}

export class GameOver extends Phaser.Scene {
    private score = 0;
    private distance = 0;
    private pearls = 0;
    private bubbles = 0;
    private awarded: AwardedTotals = { score: 0, distance: 0, pearls: 0, bubbles: 0 };

    private rewards = { coins: 0, xp: 0, leveledUp: false, level: 1, newBiome: '' };
    private doubled = false;
    private busy = false;

    private titleText!: Phaser.GameObjects.Text;
    private scoreText!: Phaser.GameObjects.Text;
    private bestText!: Phaser.GameObjects.Text;
    private coinIcon!: Phaser.GameObjects.Container;
    private coinText!: Phaser.GameObjects.Text;
    private xpText!: Phaser.GameObjects.Text;
    private levelText!: Phaser.GameObjects.Text;
    private menuButton!: UIButton;
    private againButton!: UIButton;
    private reviveButton!: UIButton;
    private doubleButton!: UIButton;

    constructor() {
        super('GameOver');
    }

    init(data: GameOverData = {}): void {
        this.score = data.score ?? 0;
        this.distance = data.distance ?? 0;
        this.pearls = data.pearls ?? 0;
        this.bubbles = data.bubbles ?? 0;
        this.awarded = data.awarded ?? { score: 0, distance: 0, pearls: 0, bubbles: 0 };
        this.doubled = false;
        this.busy = false;
    }

    create(): void {
        this.cameras.main.setBackgroundColor(GAME.background);

        // Only award the portion of the run that hasn't been rewarded yet
        // (a revived run is awarded in segments).
        const delta: RunStats = {
            score: Math.max(0, this.score - this.awarded.score),
            distance: Math.max(0, this.distance - this.awarded.distance),
            pearls: Math.max(0, this.pearls - this.awarded.pearls),
            bubbles: Math.max(0, this.bubbles - this.awarded.bubbles)
        };

        const bestBefore = Profile.profile.bestScore;
        const reward = Profile.addRun(delta);
        this.rewards = {
            coins: reward.coins,
            xp: reward.xp,
            leveledUp: reward.leveledUp,
            level: reward.level,
            newBiome: reward.newBiomes.length > 0 ? reward.newBiomes[reward.newBiomes.length - 1].name : ''
        };
        const isBest = this.score > bestBefore;

        YouTubePlayables.sendScore(this.score);
        Profile.save();

        const totalGames = Profile.profile.totalGames;
        if (totalGames % GAME.interstitialEvery === 0) {
            void YouTubePlayables.requestInterstitialAd();
        }

        this.titleText = this.add
            .text(0, 0, 'GAME OVER', {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '46px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 7
            })
            .setOrigin(0.5);

        this.scoreText = this.add
            .text(0, 0, `${this.score}`, {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '76px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 7
            })
            .setOrigin(0.5);

        this.bestText = this.add
            .text(0, 0, isBest ? 'NEW BEST!' : `BEST ${Profile.profile.bestScore}`, {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '24px',
                color: isBest ? '#ffb703' : '#9aa4c7',
                stroke: '#000000',
                strokeThickness: 4
            })
            .setOrigin(0.5);

        this.coinIcon = makeCoin(this, 0, 0, 13);
        this.coinText = this.add
            .text(0, 0, `+${this.rewards.coins}`, {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '26px',
                color: '#ffe3a3',
                stroke: '#000000',
                strokeThickness: 4
            })
            .setOrigin(0, 0.5);

        this.xpText = this.add
            .text(0, 0, `+${this.rewards.xp} XP`, {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '18px',
                color: '#9aa4c7'
            })
            .setOrigin(0, 0.5);

        this.levelText = this.add
            .text(0, 0, '', {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '22px',
                color: '#2ec4b6',
                align: 'center',
                stroke: '#000000',
                strokeThickness: 4
            })
            .setOrigin(0.5);

        if (this.rewards.leveledUp) {
            this.levelText.setText(
                this.rewards.newBiome
                    ? `LEVEL ${this.rewards.level}!  ·  ${this.rewards.newBiome} unlocked`
                    : `LEVEL ${this.rewards.level}!`
            );
        }

        this.againButton = new UIButton(this, 0, 0, 'PLAY AGAIN', GAME.colors[1], () => this.playAgain(), {
            width: 300,
            height: 68,
            fontSize: 28
        });

        this.reviveButton = new UIButton(
            this,
            0,
            0,
            `WATCH AD  +${GAME.startingLives} LIVES`,
            GAME.colors[0],
            () => void this.revive(),
            { width: 300, height: 60, fontSize: 22 }
        );

        this.doubleButton = new UIButton(this, 0, 0, 'WATCH AD  x2 COINS', GAME.colors[2], () => void this.doubleCoins(), {
            width: 300,
            height: 60,
            fontSize: 22
        });

        this.menuButton = new UIButton(this, 0, 0, 'MENU', GAME.backgroundAccent, () => this.menu(), {
            width: 300,
            height: 56,
            fontSize: 22
        });

        this.input.keyboard?.once('keydown-SPACE', () => this.playAgain());

        this.layout();
        this.scale.on('resize', this.layout, this);
        this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
    }

    private layout(): void {
        const w = this.scale.width;
        const h = this.scale.height;
        const cx = w / 2;

        this.titleText.setPosition(cx, h * 0.13);
        this.scoreText.setPosition(cx, h * 0.24);
        this.bestText.setPosition(cx, h * 0.33);

        this.coinIcon.setPosition(cx - 54, h * 0.42);
        this.coinText.setPosition(cx - 34, h * 0.42);
        this.xpText.setPosition(cx - 34, h * 0.42 + 26);
        this.levelText.setPosition(cx, h * 0.5);

        this.againButton.setPosition(cx, h - 264);
        this.reviveButton.setPosition(cx, h - 188);
        this.doubleButton.setPosition(cx, h - 120);
        this.menuButton.setPosition(cx, h - 52);
    }

    private playAgain(): void {
        if (this.busy) {
            return;
        }
        this.busy = true;
        sfx.resume();
        sfx.click();
        this.scene.start('Game', { revive: false });
    }

    private menu(): void {
        sfx.resume();
        sfx.click();
        this.scene.start('MainMenu');
    }

    private async revive(): Promise<void> {
        if (this.busy) {
            return;
        }
        this.busy = true;
        sfx.resume();
        sfx.click();

        const granted = YouTubePlayables.isLoaded()
            ? await YouTubePlayables.requestRewardedAd(GAME.reviveRewardId)
            : true;

        if (granted) {
            this.scene.start('Game', {
                revive: true,
                score: this.score,
                lives: GAME.startingLives,
                distance: this.distance,
                pearls: this.pearls,
                bubbles: this.bubbles,
                awarded: {
                    score: this.score,
                    distance: this.distance,
                    pearls: this.pearls,
                    bubbles: this.bubbles
                }
            });
        } else {
            this.busy = false;
        }
    }

    private async doubleCoins(): Promise<void> {
        if (this.busy || this.doubled || this.rewards.coins <= 0) {
            return;
        }
        sfx.resume();
        sfx.click();

        const usedAd = YouTubePlayables.isLoaded();
        const granted = usedAd ? await YouTubePlayables.requestRewardedAd(GAME.doubleCoinsRewardId) : true;
        if (!granted) {
            return;
        }

        this.doubled = true;
        Profile.addCoins(this.rewards.coins);
        this.coinText.setText(`+${this.rewards.coins * 2}`);
        this.doubleButton.setEnabled(false).setLabel('COINS DOUBLED');
        sfx.success();
    }
}
