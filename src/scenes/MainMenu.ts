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
    private missionsButton!: UIButton;
    private wheelBadge!: Phaser.GameObjects.Container;
    private wheelBadgeText!: Phaser.GameObjects.Text;
    private missionsBadge!: Phaser.GameObjects.Container;
    private missionsBadgeText!: Phaser.GameObjects.Text;
    private hint!: Phaser.GameObjects.Text;

    private statusTimer?: Phaser.Time.TimerEvent;

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
        this.swimmer = makeSwimmerPreview(this, 0, 0, 0.95, skin.body, skin.fin).setDepth(2);
        this.tweens.add({ targets: this.swimmer, y: '-=4', duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

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
        const rowW = Phaser.Math.Clamp((w - 60) / 2, 120, 190);

        this.playButton = new UIButton(this, 0, 0, 'PLAY', GAME.colors[1], () => this.startGame(), {
            width: Phaser.Math.Clamp(w * 0.62, 220, 340),
            height: 70,
            fontSize: 32
        });

        this.shopButton = new UIButton(this, 0, 0, 'SHOP', GAME.colors[0], () => this.open('Shop'), {
            width: rowW,
            height: 58,
            fontSize: 20
        });

        this.areasButton = new UIButton(this, 0, 0, 'AREAS', GAME.colors[3], () => this.open('Areas'), {
            width: rowW,
            height: 58,
            fontSize: 20
        });

        this.wheelButton = new UIButton(this, 0, 0, 'WHEEL\n--:--', GAME.colors[2], () => this.open('Wheel'), {
            width: rowW,
            height: 58,
            fontSize: 18
        });

        this.missionsButton = new UIButton(this, 0, 0, 'MISSIONS\n--', 0x3d6bff, () => this.open('Missions'), {
            width: rowW,
            height: 58,
            fontSize: 18
        });

        const wheelBadge = this.makeBadge(0xff4d6d);
        this.wheelBadge = wheelBadge.container;
        this.wheelBadgeText = wheelBadge.text;

        const missionsBadge = this.makeBadge(0xffb703);
        this.missionsBadge = missionsBadge.container;
        this.missionsBadgeText = missionsBadge.text;

        this.hint = this.add
            .text(0, 0, 'Grab bubbles to breathe · pearls give coins', {
                fontFamily: 'Arial, sans-serif',
                fontSize: '16px',
                color: '#5f6b96'
            })
            .setOrigin(0.5)
            .setDepth(5);

        this.refreshProfile();
        this.refreshStatus();

        this.input.keyboard?.once('keydown-SPACE', () => this.startGame());
        this.input.keyboard?.once('keydown-ENTER', () => this.startGame());

        this.layout();
        this.scale.on('resize', this.layout, this);
        this.statusTimer = this.time.addEvent({ delay: 1000, loop: true, callback: () => this.refreshStatus() });
        this.events.once('shutdown', () => {
            this.scale.off('resize', this.layout, this);
            this.statusTimer?.remove();
        });

        YouTubePlayables.gameReady();
    }

    private makeBadge(color: number): { container: Phaser.GameObjects.Container; text: Phaser.GameObjects.Text } {
        const container = this.add.container(0, 0).setDepth(6);
        container.add(this.add.circle(0, 0, 13, color).setStrokeStyle(2, 0xffffff, 0.9));
        const text = this.add
            .text(0, 0, '', { fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '15px', color: '#ffffff' })
            .setOrigin(0.5);
        container.add(text);
        return { container, text };
    }

    private refreshProfile(): void {
        const p = Profile.profile;
        this.coinText.setText(`${p.coins}`);
        this.bestText.setText(`BEST ${p.bestScore}`);
        this.levelText.setText(`LEVEL ${Profile.level}`);
    }

    private refreshStatus(): void {
        // Wheel: countdown on the button, "!" badge when ready.
        const ready = Profile.canSpin();
        if (ready) {
            this.wheelButton.setLabel('WHEEL\nREADY');
            this.wheelBadge.setVisible(true);
            this.wheelBadgeText.setText('!');
        } else {
            const total = Math.ceil(Profile.msUntilSpin() / 1000);
            const mm = Math.floor(total / 60).toString().padStart(2, '0');
            const ss = (total % 60).toString().padStart(2, '0');
            this.wheelButton.setLabel(`WHEEL\n${mm}:${ss}`);
            this.wheelBadge.setVisible(false);
        }

        // Missions: claimable count badge + "N left" on the button.
        const claimable = Profile.claimableMissionCount();
        const incomplete = Profile.incompleteMissionCount();
        if (claimable > 0) {
            this.missionsButton.setLabel('MISSIONS\nCLAIM!');
            this.missionsBadge.setVisible(true);
            this.missionsBadgeText.setText(`${claimable}`);
        } else if (incomplete > 0) {
            this.missionsButton.setLabel(`MISSIONS\n${incomplete} LEFT`);
            this.missionsBadge.setVisible(false);
        } else {
            this.missionsButton.setLabel('MISSIONS\nDONE');
            this.missionsBadge.setVisible(false);
        }
    }

    private startGame(): void {
        sfx.resume();
        sfx.click();
        this.scene.start('Game', { revive: false });
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

        const titleY = h * 0.13;
        this.titleText.setPosition(cx, titleY).setFontSize(Math.round(Phaser.Math.Clamp(size * 0.11, 38, 68)));

        const tagY = titleY + Phaser.Math.Clamp(size * 0.075, 32, 52);
        this.tagline.setPosition(cx, tagY);

        const levelY = tagY + Phaser.Math.Clamp(size * 0.075, 34, 52);
        this.levelText.setPosition(cx, levelY);
        this.drawXpBar(cx, levelY + 24, Phaser.Math.Clamp(w * 0.6, 180, 320));

        // Swimmer sits in its own band, sized to fit, with a gentle bob.
        const playY = h * 0.56;
        const fishY = Phaser.Math.Clamp(
            levelY + Phaser.Math.Clamp(size * 0.14, 52, 96),
            levelY + 44,
            playY - 46
        );
        this.swimmer.setPosition(cx, fishY);
        this.swimmer.setScale(Phaser.Math.Clamp(size / 620, 0.72, 1.0));

        this.coinIcon.setPosition(w - 96, 30);
        this.coinText.setPosition(w - 74, 30);
        this.bestText.setPosition(20, 30);

        this.playButton.setPosition(cx, playY);

        const rowAY = h * 0.705;
        const rowBY = rowAY + Phaser.Math.Clamp(h * 0.085, 58, 72);
        const col = Phaser.Math.Clamp(w * 0.24, 76, 112);

        this.shopButton.setPosition(cx - col, rowAY);
        this.areasButton.setPosition(cx + col, rowAY);
        this.wheelButton.setPosition(cx - col, rowBY);
        this.missionsButton.setPosition(cx + col, rowBY);

        this.wheelBadge.setPosition(cx - col + this.wheelButton.buttonW / 2 - 4, rowBY - 26);
        this.missionsBadge.setPosition(cx + col + this.missionsButton.buttonW / 2 - 4, rowBY - 26);

        this.hint.setPosition(cx, h - 20);
        this.hint.setVisible(h > 520);
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
