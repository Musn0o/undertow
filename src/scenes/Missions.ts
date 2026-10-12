import Phaser from 'phaser';
import { GAME, getMission, type MissionDef } from '../config';
import { Profile } from '../systems/Profile';
import { sfx } from '../systems/Sfx';
import { UIButton } from '../ui/Button';
import { makeCoin } from '../ui/icons';
import { makePanel } from '../ui/panel';

export class Missions extends Phaser.Scene {
    private rows!: Phaser.GameObjects.Container;
    private titleText!: Phaser.GameObjects.Text;
    private subText!: Phaser.GameObjects.Text;
    private coinIcon!: Phaser.GameObjects.Container;
    private coinText!: Phaser.GameObjects.Text;
    private backButton!: UIButton;

    constructor() {
        super('Missions');
    }

    create(): void {
        this.cameras.main.setBackgroundColor(GAME.background);

        this.titleText = this.add
            .text(0, 0, 'DAILY MISSIONS', {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '34px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 6
            })
            .setOrigin(0.5)
            .setDepth(5);

        this.subText = this.add
            .text(0, 0, 'Resets at midnight', {
                fontFamily: 'Arial, sans-serif',
                fontSize: '15px',
                color: '#9aa4c7'
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

        this.rows = this.add.container(0, 0).setDepth(3);

        this.layout();
        this.scale.on('resize', this.layout, this);
        this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));

        this.input.keyboard?.once('keydown-ESC', () => this.back());
    }

    private back(): void {
        sfx.click();
        this.scene.start('MainMenu');
    }

    private layout(): void {
        const w = this.scale.width;
        this.titleText.setPosition(w / 2, 44);
        this.subText.setPosition(w / 2, 76);
        this.backButton.setPosition(70, 40);
        this.coinIcon.setPosition(w - 92, 40);
        this.coinText.setPosition(w - 72, 40);
        this.coinText.setText(`${Profile.profile.coins}`);
        this.rebuild(w);
    }

    private rebuild(w: number): void {
        this.rows.removeAll(true);

        const rowW = Math.min(w - 32, 480);
        const rowH = 98;
        const gap = 12;
        const startY = 126;
        const cx = w / 2;

        Profile.getMissions().forEach((mission, index) => {
            const def = getMission(mission.id);
            if (!def) {
                return;
            }
            const y = startY + index * (rowH + gap) + rowH / 2;
            this.rows.add(this.makeRow(cx, y, rowW, rowH, def));
        });
    }

    private makeRow(x: number, y: number, w: number, h: number, def: MissionDef): Phaser.GameObjects.Container {
        const mission = Profile.missionProgress(def.id);
        const progress = mission?.progress ?? 0;
        const claimed = mission?.claimed ?? false;
        const complete = progress >= def.target;

        const row = this.add.container(x, y);
        const border = claimed ? 0x2ec4b6 : complete ? GAME.colors[2] : 0x39406b;
        row.add(makePanel(this, w, h, 0x0d1730, border, 0.95, 16));

        row.add(
            this.add
                .text(-w / 2 + 16, -h / 2 + 22, def.label, {
                    fontFamily: 'Arial Black, Arial, sans-serif',
                    fontSize: '17px',
                    color: claimed ? '#8fb9b1' : '#ffffff'
                })
                .setOrigin(0, 0.5)
        );

        // Reward, top-right.
        const reward = this.add
            .text(w / 2 - 16, -h / 2 + 22, `${def.reward}`, {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '17px',
                color: '#ffe3a3'
            })
            .setOrigin(1, 0.5);
        const coin = makeCoin(this, w / 2 - 16 - reward.width - 12, -h / 2 + 22, 10);
        row.add([coin, reward]);

        // Full-width progress bar in the middle.
        const barW = w - 32;
        const barX = -w / 2 + 16;
        const barY = -8;
        const bar = this.add.graphics();
        bar.fillStyle(0x000000, 0.35);
        bar.fillRoundedRect(barX, barY, barW, 12, 6);
        bar.fillStyle(complete ? GAME.colors[0] : GAME.colors[3], 1);
        bar.fillRoundedRect(barX, barY, Math.max(2, barW * Math.min(1, progress / def.target)), 12, 6);
        row.add(bar);

        // Progress count, bottom-left.
        row.add(
            this.add
                .text(-w / 2 + 16, h / 2 - 22, `${progress}/${def.target}`, {
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '14px',
                    color: '#9aa4c7'
                })
                .setOrigin(0, 0.5)
        );

        // Status / claim, bottom-right.
        if (claimed) {
            row.add(
                this.add
                    .text(w / 2 - 16, h / 2 - 22, 'CLAIMED', {
                        fontFamily: 'Arial Black, Arial, sans-serif',
                        fontSize: '15px',
                        color: '#2ec4b6'
                    })
                    .setOrigin(1, 0.5)
            );
        } else if (complete) {
            const claim = new UIButton(this, w / 2 - 58, h / 2 - 22, 'CLAIM', GAME.colors[2], () => {
                const gained = Profile.claimMission(def.id);
                if (gained > 0) {
                    sfx.claim();
                    this.coinText.setText(`${Profile.profile.coins}`);
                    this.layout();
                }
            }, { width: 96, height: 34, fontSize: 15, radius: 14 });
            row.add(claim);
        } else {
            row.add(
                this.add
                    .text(w / 2 - 16, h / 2 - 22, 'IN PROGRESS', {
                        fontFamily: 'Arial, sans-serif',
                        fontSize: '14px',
                        color: '#6b7396'
                    })
                    .setOrigin(1, 0.5)
            );
        }

        return row;
    }
}
