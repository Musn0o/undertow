import Phaser from 'phaser';
import { GAME, BIOMES, type BiomeDef } from '../config';
import { Profile } from '../systems/Profile';
import { sfx } from '../systems/Sfx';
import { UIButton } from '../ui/Button';
import { makePanel } from '../ui/panel';

export class Areas extends Phaser.Scene {
    private cards!: Phaser.GameObjects.Container;
    private titleText!: Phaser.GameObjects.Text;
    private levelText!: Phaser.GameObjects.Text;
    private backButton!: UIButton;
    private statusText!: Phaser.GameObjects.Text;
    private prevButton!: UIButton;
    private nextButton!: UIButton;
    private pageText!: Phaser.GameObjects.Text;

    private page = 0;
    private totalPages = 1;

    constructor() {
        super('Areas');
    }

    create(): void {
        this.page = 0;
        this.cameras.main.setBackgroundColor(GAME.background);

        this.titleText = this.add
            .text(0, 0, 'AREAS', {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '44px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 6
            })
            .setOrigin(0.5)
            .setDepth(5);

        this.levelText = this.add
            .text(0, 0, '', {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '22px',
                color: '#ffb703',
                stroke: '#000000',
                strokeThickness: 5
            })
            .setOrigin(0.5)
            .setDepth(5);

        this.backButton = new UIButton(this, 0, 0, 'BACK', GAME.backgroundAccent, () => this.back(), {
            width: 110,
            height: 52,
            fontSize: 20
        });

        this.statusText = this.add
            .text(0, 0, '', {
                fontFamily: 'Arial, sans-serif',
                fontSize: '18px',
                color: '#ffb703'
            })
            .setOrigin(0.5)
            .setDepth(5);

        this.cards = this.add.container(0, 0).setDepth(3);

        this.prevButton = new UIButton(this, 0, 0, '<', GAME.backgroundAccent, () => this.changePage(-1), {
            width: 54,
            height: 44,
            fontSize: 22
        });
        this.nextButton = new UIButton(this, 0, 0, '>', GAME.backgroundAccent, () => this.changePage(1), {
            width: 54,
            height: 44,
            fontSize: 22
        });
        this.pageText = this.add
            .text(0, 0, '', { fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '18px', color: '#9aa4c7' })
            .setOrigin(0.5)
            .setDepth(5);

        this.layout();
        this.scale.on('resize', this.layout, this);
        this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));

        this.input.keyboard?.once('keydown-ESC', () => this.back());
    }

    private back(): void {
        sfx.click();
        this.scene.start('MainMenu');
    }

    private changePage(delta: number): void {
        const target = Phaser.Math.Clamp(this.page + delta, 0, this.totalPages - 1);
        if (target === this.page) {
            return;
        }
        sfx.click();
        this.page = target;
        this.layout();
    }

    private flash(message: string): void {
        this.statusText.setText(message);
        this.statusText.setAlpha(1);
        this.tweens.add({ targets: this.statusText, alpha: 0, duration: 900, delay: 700 });
    }

    private layout(): void {
        const w = this.scale.width;
        const h = this.scale.height;
        this.titleText.setPosition(w / 2, 44);
        this.backButton.setPosition(70, 40);
        this.levelText.setPosition(w - 90, 42);
        this.statusText.setPosition(w / 2, 88);
        this.levelText.setText(`LEVEL ${Profile.level}`);
        this.rebuild(w, h);
    }

    private rebuild(w: number, h: number): void {
        this.cards.removeAll(true);

        const padding = 18;
        const gap = 14;
        const cols = w < 560 ? 2 : 3;
        const cardW = Math.min(210, (w - padding * 2 - gap * (cols - 1)) / cols);
        const cardH = Math.min(cardW * 1.05, 196);
        const gridTop = 136;
        const gridBottom = h - 78;
        const rows = Math.max(1, Math.floor((gridBottom - gridTop + gap) / (cardH + gap)));
        const perPage = Math.max(cols, cols * rows);
        this.totalPages = Math.max(1, Math.ceil(BIOMES.length / perPage));
        this.page = Phaser.Math.Clamp(this.page, 0, this.totalPages - 1);

        const visible = BIOMES.slice(this.page * perPage, this.page * perPage + perPage);
        const gridW = cols * cardW + (cols - 1) * gap;
        const startX = (w - gridW) / 2 + cardW / 2;
        const startY = gridTop + cardH / 2;
        const rowH = cardH + gap;

        visible.forEach((biome, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = startX + col * (cardW + gap);
            const y = startY + row * rowH;
            this.cards.add(this.makeCard(x, y, cardW, cardH, biome));
        });

        const showPager = this.totalPages > 1;
        this.prevButton.setVisible(showPager).setEnabled(this.page > 0);
        this.nextButton.setVisible(showPager).setEnabled(this.page < this.totalPages - 1);
        this.pageText.setVisible(showPager);
        this.pageText.setText(`${this.page + 1} / ${this.totalPages}`);
        this.prevButton.setPosition(w / 2 - 80, h - 44);
        this.nextButton.setPosition(w / 2 + 80, h - 44);
        this.pageText.setPosition(w / 2, h - 44);
    }

    private makeCard(x: number, y: number, w: number, h: number, biome: BiomeDef): Phaser.GameObjects.Container {
        const unlocked = Profile.isBiomeUnlocked(biome.id);
        const selected = Profile.selectedBiome === biome.id;

        const card = this.add.container(x, y);
        const border = selected ? GAME.colors[0] : 0x39406b;
        card.add(makePanel(this, w, h, 0x0d1730, border, 0.95, 16));
        const hit = this.add.rectangle(0, 0, w, h, 0xffffff, 0);
        card.add(hit);

        const swatchW = w - 28;
        const swatchH = h * 0.42;
        const swatch = this.add.graphics();
        const swX = -swatchW / 2;
        const swY = -h / 2 + 12;
        swatch.fillStyle(biome.surface, unlocked ? 1 : 0.35);
        swatch.fillRoundedRect(swX, swY, swatchW, swatchH, { tl: 10, tr: 10, bl: 0, br: 0 });
        swatch.fillStyle(biome.deep, unlocked ? 1 : 0.35);
        swatch.fillRoundedRect(swX, swY + swatchH / 2, swatchW, swatchH / 2, { tl: 0, tr: 0, bl: 10, br: 10 });
        swatch.fillStyle(biome.decor, unlocked ? 0.6 : 0.2);
        swatch.fillCircle(swX + swatchW * 0.3, swY + swatchH * 0.5, 5);
        swatch.fillCircle(swX + swatchW * 0.6, swY + swatchH * 0.35, 3);
        swatch.fillStyle(biome.rock, unlocked ? 1 : 0.35);
        swatch.fillTriangle(swX + swatchW * 0.55, swY + swatchH, swX + swatchW * 0.75, swY + swatchH * 0.4, swX + swatchW * 0.95, swY + swatchH);
        card.add(swatch);

        card.add(
            this.add
                .text(0, h * 0.08, biome.name, {
                    fontFamily: 'Arial Black, Arial, sans-serif',
                    fontSize: '18px',
                    color: unlocked ? '#ffffff' : '#6b7396',
                    align: 'center'
                })
                .setOrigin(0.5)
        );

        let status = `LEVEL ${biome.unlockLevel}`;
        let color = '#6b7396';
        if (selected) {
            status = 'SELECTED';
            color = '#2ec4b6';
        } else if (unlocked) {
            status = 'SELECT';
            color = '#ffb703';
        }

        card.add(
            this.add
                .text(0, h * 0.34, status, {
                    fontFamily: 'Arial Black, Arial, sans-serif',
                    fontSize: '17px',
                    color
                })
                .setOrigin(0.5)
        );

        hit.setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => {
            if (selected) {
                return;
            }
            if (!unlocked) {
                sfx.fail();
                this.flash(`Reach level ${biome.unlockLevel} to unlock`);
                return;
            }
            Profile.selectBiome(biome.id);
            sfx.success();
            this.flash(`${biome.name} selected`);
            this.layout();
        });

        return card;
    }
}
