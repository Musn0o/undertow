import Phaser from 'phaser';
import { GAME, SKINS } from '../config';
import { Profile } from '../systems/Profile';
import { sfx } from '../systems/Sfx';
import { UIButton } from '../ui/Button';
import { makeCoin } from '../ui/icons';

interface Segment {
    label: string;
    coins: number;
    skin: boolean;
}

const SEGMENTS: Segment[] = [
    { label: '50', coins: 50, skin: false },
    { label: '75', coins: 75, skin: false },
    { label: 'SKIN', coins: 0, skin: true },
    { label: '100', coins: 100, skin: false },
    { label: '150', coins: 150, skin: false },
    { label: '75', coins: 75, skin: false },
    { label: 'SKIN', coins: 0, skin: true },
    { label: '400', coins: 400, skin: false }
];

export class Wheel extends Phaser.Scene {
    private wheel!: Phaser.GameObjects.Container;
    private pointer!: Phaser.GameObjects.Triangle;
    private titleText!: Phaser.GameObjects.Text;
    private coinIcon!: Phaser.GameObjects.Container;
    private coinText!: Phaser.GameObjects.Text;
    private backButton!: UIButton;
    private spinButton!: UIButton;
    private timerText!: Phaser.GameObjects.Text;
    private resultText!: Phaser.GameObjects.Text;

    private spinning = false;
    private wheelRadius = 140;
    private tickEvent?: Phaser.Time.TimerEvent;

    constructor() {
        super('Wheel');
    }

    create(): void {
        this.cameras.main.setBackgroundColor(GAME.background);

        this.titleText = this.add
            .text(0, 0, 'LUCKY WHEEL', {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '38px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 6
            })
            .setOrigin(0.5)
            .setDepth(5);

        this.coinIcon = makeCoin(this, 0, 0, 12).setDepth(5);
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

        this.backButton = new UIButton(this, 0, 0, 'BACK', GAME.backgroundAccent, () => this.back(), {
            width: 110,
            height: 52,
            fontSize: 20
        });

        this.wheel = this.add.container(0, 0).setDepth(3);
        this.pointer = this.add.triangle(0, 0, 0, 0, 28, 0, 14, 26, 0xff4d6d).setStrokeStyle(3, 0xffffff, 0.9).setDepth(4);

        this.spinButton = new UIButton(this, 0, 0, 'SPIN', GAME.colors[2], () => this.spin(), {
            width: 200,
            height: 66,
            fontSize: 28
        });

        this.timerText = this.add
            .text(0, 0, '', {
                fontFamily: 'Arial, sans-serif',
                fontSize: '18px',
                color: '#9aa4c7'
            })
            .setOrigin(0.5)
            .setDepth(5);

        this.resultText = this.add
            .text(0, 0, '', {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '24px',
                color: '#ffb703'
            })
            .setOrigin(0.5)
            .setDepth(5);

        this.refreshCoins();
        this.buildWheel();
        this.layout();
        this.scale.on('resize', this.layout, this);
        this.events.once('shutdown', () => {
            this.scale.off('resize', this.layout, this);
            this.tickEvent?.remove();
        });

        this.input.keyboard?.once('keydown-ESC', () => this.back());

        this.tick();
        this.tickEvent = this.time.addEvent({ delay: 1000, loop: true, callback: () => this.tick() });
    }

    private back(): void {
        sfx.click();
        this.scene.start('MainMenu');
    }

    private refreshCoins(): void {
        this.coinText.setText(`${Profile.profile.coins}`);
    }

    private tick(): void {
        if (this.spinning) {
            return;
        }
        const ready = Profile.canSpin();
        this.spinButton.setEnabled(ready);

        if (ready) {
            this.timerText.setText('Spin ready!');
            this.timerText.setColor('#2ec4b6');
        } else {
            const ms = Profile.msUntilSpin();
            const total = Math.ceil(ms / 1000);
            const mm = Math.floor(total / 60).toString().padStart(2, '0');
            const ss = (total % 60).toString().padStart(2, '0');
            this.timerText.setText(`Next free spin in ${mm}:${ss}`);
            this.timerText.setColor('#9aa4c7');
        }
    }

    private spin(): void {
        if (this.spinning || !Profile.canSpin()) {
            return;
        }
        sfx.resume();
        sfx.click();
        this.spinning = true;
        this.spinButton.setEnabled(false);
        this.resultText.setText('');

        const index = Phaser.Math.Between(0, SEGMENTS.length - 1);
        const segAngle = 360 / SEGMENTS.length;
        const centerAngle = (index + 0.5) * segAngle;
        const targetAngle = 270 - centerAngle + 360 * 5 + Phaser.Math.Between(-segAngle * 0.35, segAngle * 0.35);

        const start = this.wheel.angle;
        this.tweens.add({
            targets: this.wheel,
            angle: start + targetAngle + (360 - (start % 360)),
            duration: 3600,
            ease: 'Cubic.easeOut',
            onComplete: () => this.award(index)
        });
    }

    private award(index: number): void {
        const segment = SEGMENTS[index];
        let message: string;

        if (segment.skin) {
            const unowned = SKINS.filter((s) => !Profile.isSkinOwned(s.id));
            if (unowned.length > 0) {
                const skin = Phaser.Utils.Array.GetRandom(unowned);
                Profile.grantSkin(skin.id);
                message = `New skin: ${skin.name}!`;
            } else {
                Profile.addCoins(200);
                message = 'All skins owned: +200 coins!';
            }
        } else {
            Profile.addCoins(segment.coins);
            message = `+${segment.coins} coins!`;
        }

        Profile.recordSpin();
        sfx.success();
        this.resultText.setText(message);
        this.refreshCoins();
        this.spinning = false;
        this.tick();
    }

    private buildWheel(): void {
        this.wheel.removeAll(true);
        this.wheel.setAngle(0);

        const radius = this.wheelRadius;
        const segAngle = (Math.PI * 2) / SEGMENTS.length;
        const g = this.add.graphics();

        SEGMENTS.forEach((segment, i) => {
            const start = i * segAngle;
            const end = start + segAngle;
            const color = segment.skin ? 0xffb703 : i % 2 === 0 ? 0x1b2a4a : 0x24365e;
            g.fillStyle(color, 1);
            g.slice(0, 0, radius, start, end, false);
            g.fillPath();
            g.lineStyle(2, 0x0b1026, 0.9);
            g.slice(0, 0, radius, start, end, false);
            g.strokePath();

            const mid = start + segAngle / 2;
            const lx = Math.cos(mid) * radius * 0.64;
            const ly = Math.sin(mid) * radius * 0.64;
            const label = this.add
                .text(lx, ly, segment.label, {
                    fontFamily: 'Arial Black, Arial, sans-serif',
                    fontSize: segment.skin ? '15px' : '22px',
                    color: segment.skin ? '#0b1026' : '#ffffff'
                })
                .setOrigin(0.5);
            this.wheel.add(label);
        });

        g.lineStyle(6, 0xffffff, 0.9);
        g.strokeCircle(0, 0, radius);
        g.fillStyle(0x0b1026, 1);
        g.fillCircle(0, 0, 22);
        this.wheel.addAt(g, 0);
    }

    private layout(): void {
        const w = this.scale.width;
        const h = this.scale.height;
        const cx = w / 2;
        const cy = h / 2;

        this.wheelRadius = Phaser.Math.Clamp(Math.min(w, h) * 0.26, 110, 170);

        this.titleText.setPosition(cx, 44);
        this.backButton.setPosition(70, 40);
        this.coinIcon.setPosition(w - 92, 40);
        this.coinText.setPosition(w - 72, 40);

        this.wheel.setPosition(cx, cy);
        this.pointer.setPosition(cx - 14, cy - this.wheelRadius - 20);

        this.spinButton.setPosition(cx, cy + this.wheelRadius + 70);
        this.timerText.setPosition(cx, cy + this.wheelRadius + 118);
        this.resultText.setPosition(cx, cy - this.wheelRadius - 44);

        this.buildWheel();
    }
}
