import Phaser from 'phaser';
import { YouTubePlayables } from '../playables/YouTubePlayables';
import { GAME, getSkin } from '../config';
import { Profile } from '../systems/Profile';
import { sfx } from '../systems/Sfx';
import { UIButton } from '../ui/Button';
import { makeCoin, makeSwimmerPreview } from '../ui/icons';

export class MainMenu extends Phaser.Scene {
    private deco!: Phaser.GameObjects.Graphics;
    private spinner!: Phaser.GameObjects.Container;
    private swimmer!: Phaser.GameObjects.Container;

    private titleText!: Phaser.GameObjects.Text;
    private tagline!: Phaser.GameObjects.Text;
    private levelText!: Phaser.GameObjects.Text;
    private xpGfx!: Phaser.GameObjects.Graphics;
    private coinIcon!: Phaser.GameObjects.Container;
    private coinText!: Phaser.GameObjects.Text;
    private bestText!: Phaser.GameObjects.Text;

    private playButton!: UIButton;
    private shopButton!: UIButton;
    private areasButton!: UIButton;
    private wheelButton!: UIButton;
    private wheelBadge!: Phaser.GameObjects.Container;
    private hint!: Phaser.GameObjects.Text;

    constructor() {
        super('MainMenu');
    }

    create(): void {
        this.cameras.main.setBackgroundColor(GAME.background);

        this.deco = this.add.graphics().setDepth(0);

        this.spinner = this.add.container(0, 0).setDepth(1);
        this.spinner.add(this.add.circle(200, 0, 10, GAME.colors[0]));
        this.tweens.add({ targets: this.spinner, angle: 360, duration: 5200, repeat: -1 });

        const skin = getSkin(Profile.equippedSkin);
        this.swimmer = makeSwimmerPreview(this, 0, 0, 1.1, skin.body, skin.fin).setDepth(2);
        this.tweens.add({ targets: this.swimmer, y: -8, duration: 900, yoyo: true, repeat: -1 });

        this.titleText = this.add
            .text(0, 0, GAME.title, {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '64px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 8
            })
            .setOrigin(0.5)
            .setDepth(5);

        this.tagline = this.add
            .text(0, 0, GAME.tagline, {
                fontFamily: 'Arial, sans-serif',
                fontSize: '20px',
                color: '#9aa4c7'
            })
            .setOrigin(0.5)
            .setDepth(5);

        this.levelText = this.add
            .text(0, 0, '', {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '22px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 5
            })
            .setOrigin(0.5)
            .setDepth(5);

        this.xpGfx = this.add.graphics().setDepth(5);

        this.coinIcon = makeCoin(this, 0, 0, 13).setDepth(5);
        this.coinText = this.add
            .text(0, 0, '', {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '24px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 5
            })
            .setOrigin(0, 0.5)
            .setDepth(5);

        this.bestText = this.add
            .text(0, 0, '', {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '20px',
                color: '#9aa4c7'
            })
            .setOrigin(0, 0.5)
            .setDepth(5);

        const w = this.scale.width;
        const rowW = Phaser.Math.Clamp((w - 60) / 3, 92, 150);

        this.playButton = new UIButton(this, 0, 0, 'PLAY', GAME.colors[1], () => this.startGame(), {
            width: Phaser.Math.Clamp(w * 0.62, 220, 340),
            height: 76,
            fontSize: 34
        });

        this.shopButton = new UIButton(this, 0, 0, 'SHOP', GAME.colors[0], () => this.open('Shop'), {
            width: rowW,
            height: 60,
            fontSize: 22
        });

        this.areasButton = new UIButton(this, 0, 0, 'AREAS', GAME.colors[3], () => this.open('Areas'), {
            width: rowW,
            height: 60,
            fontSize: 22
        });

        this.wheelButton = new UIButton(this, 0, 0, 'WHEEL', GAME.colors[2], () => this.open('Wheel'), {
            width: rowW,
            height: 60,
            fontSize: 22
        });

        this.wheelBadge = this.add.container(0, 0).setDepth(6);
        this.wheelBadge.add(this.add.circle(0, 0, 12, 0xff4d6d).setStrokeStyle(2, 0xffffff, 0.9));
        this.wheelBadge.add(
            this.add
                .text(0, 0, '!', { fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '16px', color: '#ffffff' })
                .setOrigin(0.5)
        );

        this.hint = this.add
            .text(0, 0, 'Grab bubbles to breathe · pearls give coins', {
                fontFamily: 'Arial, sans-serif',
                fontSize: '16px',
                color: '#5f6b96'
            })
            .setOrigin(0.5)
            .setDepth(5);

        this.refreshProfile();

        this.input.keyboard?.once('keydown-SPACE', () => this.startGame());
        this.input.keyboard?.once('keydown-ENTER', () => this.startGame());

        this.layout();
        this.scale.on('resize', this.layout, this);
        this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));

        YouTubePlayables.gameReady();

        // Dev-only shortcuts: #play, #shop, #areas, #wheel jump straight in.
        const hash = window.location.hash;
        if (hash === '#play') {
            this.scene.start('Game');
        } else if (hash === '#shop') {
            this.scene.start('Shop');
        } else if (hash === '#areas') {
            this.scene.start('Areas');
        } else if (hash === '#wheel') {
            this.scene.start('Wheel');
        }
    }

    private refreshProfile(): void {
        const p = Profile.profile;
        this.coinText.setText(`${p.coins}`);
        this.bestText.setText(`BEST ${p.bestScore}`);
        this.levelText.setText(`LEVEL ${Profile.level}`);
        this.wheelBadge.setVisible(Profile.canSpin());
    }

    private startGame(): void {
        sfx.resume();
        sfx.click();
        this.scene.start('Game');
    }

    private open(scene: string): void {
        sfx.resume();
        sfx.click();
        this.scene.start(scene);
    }

    private layout(): void {
        const w = this.scale.width;
        const h = this.scale.height;
        const cx = w / 2;
        const cy = h / 2;
        const size = Math.min(w, h);

        this.deco.clear();
        for (let i = 0; i < 4; i++) {
            this.deco.lineStyle(3, GAME.colors[i], 0.35);
            this.deco.strokeCircle(cx, cy, size * 0.34 + i * 26);
        }

        this.spinner.setPosition(cx, cy);
        this.spinner.setScale(size / 300);

        const titleY = h * 0.15;
        this.titleText.setPosition(cx, titleY).setFontSize(Math.round(Phaser.Math.Clamp(size * 0.12, 40, 72)));

        const tagY = titleY + Phaser.Math.Clamp(size * 0.08, 34, 56);
        this.tagline.setPosition(cx, tagY);

        const swimY = tagY + Phaser.Math.Clamp(size * 0.11, 50, 84);
        this.swimmer.setPosition(cx, swimY);

        const xpY = swimY + Phaser.Math.Clamp(size * 0.1, 48, 70);
        this.levelText.setPosition(cx, xpY);
        this.drawXpBar(cx, xpY + 26, Phaser.Math.Clamp(w * 0.6, 180, 320));

        this.coinIcon.setPosition(w - 96, 30);
        this.coinText.setPosition(w - 74, 30);
        this.bestText.setPosition(20, 30);

        this.playButton.setPosition(cx, h * 0.60);

        const rowY = h * 0.745;
        const col = Phaser.Math.Clamp(w / 3, 100, 190);
        this.shopButton.setPosition(cx - col, rowY);
        this.areasButton.setPosition(cx, rowY);
        this.wheelButton.setPosition(cx + col, rowY);
        this.wheelBadge.setPosition(cx + col + this.wheelButton.buttonW / 2 - 6, rowY - 26);

        this.hint.setPosition(cx, h - 22);
    }

    private drawXpBar(cx: number, y: number, width: number): void {
        const h = 14;
        const x = cx - width / 2;
        this.xpGfx.clear();
        this.xpGfx.fillStyle(0x000000, 0.35);
        this.xpGfx.fillRoundedRect(x - 3, y - 3, width + 6, h + 6, 8);
        this.xpGfx.fillStyle(GAME.colors[2], 1);
        this.xpGfx.fillRoundedRect(x, y, Math.max(3, width * Phaser.Math.Clamp(Profile.levelProgress, 0, 1)), h, 7);
    }
}
