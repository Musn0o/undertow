import Phaser from 'phaser';
import { GAME, SKINS, type SkinDef } from '../config';
import { Profile } from '../systems/Profile';
import { sfx } from '../systems/Sfx';
import { UIButton } from '../ui/Button';
import { makeCoin, makeSwimmerPreview } from '../ui/icons';

export class Shop extends Phaser.Scene {
    private cards!: Phaser.GameObjects.Container;
    private titleText!: Phaser.GameObjects.Text;
    private coinIcon!: Phaser.GameObjects.Container;
    private coinText!: Phaser.GameObjects.Text;
    private backButton!: UIButton;
    private statusText!: Phaser.GameObjects.Text;
    private prevButton!: UIButton;
    private nextButton!: UIButton;
    private pageText!: Phaser.GameObjects.Text;

    private page = 0;
    private totalPages = 1;

    constructor() {
        super('Shop');
    }

    create(): void {
        this.page = 0;
        this.cameras.main.setBackgroundColor(GAME.background);

        this.titleText = this.add
            .text(0, 0, 'SHOP', {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '44px',
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

        this.refreshCoins();
        this.layout();
        this.scale.on('resize', this.layout, this);
        this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));

        this.input.keyboard?.once('keydown-ESC', () => this.back());
    }

    private back(): void {
        sfx.click();
        this.scene.start('MainMenu');
    }

    private refreshCoins(): void {
        this.coinText.setText(`${Profile.profile.coins}`);
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
        const cx = w / 2;

        this.titleText.setPosition(cx, 44);
        this.backButton.setPosition(70, 40);
        this.coinIcon.setPosition(w - 92, 40);
        this.coinText.setPosition(w - 72, 40);
        this.statusText.setPosition(cx, 90);

        this.rebuild(w, h);
    }

    private rebuild(w: number, h: number): void {
        this.cards.removeAll(true);

        const padding = 18;
        const gap = 14;
        const cols = w < 520 ? 2 : 3;
        const cardW = Math.min(200, (w - padding * 2 - gap * (cols - 1)) / cols);
        const cardH = Math.min(cardW * 0.95, 176);
        const gridTop = 142;
        const gridBottom = h - 78;
        const rows = Math.max(1, Math.floor((gridBottom - gridTop + gap) / (cardH + gap)));
        const perPage = Math.max(cols, cols * rows);
        this.totalPages = Math.max(1, Math.ceil(SKINS.length / perPage));
        this.page = Phaser.Math.Clamp(this.page, 0, this.totalPages - 1);

        const visible = SKINS.slice(this.page * perPage, this.page * perPage + perPage);
        const gridW = cols * cardW + (cols - 1) * gap;
        const startX = (w - gridW) / 2 + cardW / 2;
        const startY = gridTop + cardH / 2;
        const rowH = cardH + gap;

        visible.forEach((skin, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = startX + col * (cardW + gap);
            const y = startY + row * rowH;
            this.cards.add(this.makeCard(x, y, cardW, cardH, skin));
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

    private makeCard(x: number, y: number, w: number, h: number, skin: SkinDef): Phaser.GameObjects.Container {
        const owned = Profile.isSkinOwned(skin.id);
        const equipped = Profile.equippedSkin === skin.id;
        const affordable = Profile.profile.coins >= skin.price;

        const card = this.add.container(x, y);

        const border = equipped ? GAME.colors[0] : 0x39406b;
        const bg = this.add.rectangle(0, 0, w, h, 0x0d1730, 1).setStrokeStyle(3, border, 0.95);
        card.add(bg);

        const preview = makeSwimmerPreview(this, 0, -h * 0.22, Math.min(w / 150, 1), skin.body, skin.fin);
        card.add(preview);

        card.add(
            this.add
                .text(0, h * 0.06, skin.name, {
                    fontFamily: 'Arial Black, Arial, sans-serif',
                    fontSize: '20px',
                    color: '#ffffff'
                })
                .setOrigin(0.5)
        );

        let statusColor = '#9aa4c7';
        let status = `${skin.price}`;

        if (equipped) {
            status = 'EQUIPPED';
            statusColor = '#2ec4b6';
        } else if (owned) {
            status = 'EQUIP';
            statusColor = '#ffb703';
        } else if (!affordable) {
            statusColor = '#6b7396';
        }

        if (owned) {
            card.add(
                this.add
                    .text(0, h * 0.32, status, {
                        fontFamily: 'Arial Black, Arial, sans-serif',
                        fontSize: '18px',
                        color: statusColor
                    })
                    .setOrigin(0.5)
            );
        } else {
            const price = this.add
                .text(14, h * 0.32, status, {
                    fontFamily: 'Arial Black, Arial, sans-serif',
                    fontSize: '18px',
                    color: statusColor
                })
                .setOrigin(0, 0.5);
            const coin = makeCoin(this, -6, h * 0.32, 9);
            card.add([coin, price]);
        }

        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', () => {
            if (equipped) {
                return;
            }
            if (owned) {
                Profile.equipSkin(skin.id);
                sfx.success();
                this.flash(`${skin.name} equipped`);
                this.layout();
                return;
            }
            if (Profile.buySkin(skin.id)) {
                sfx.success();
                this.flash(`${skin.name} unlocked!`);
                this.refreshCoins();
                this.layout();
            } else {
                sfx.fail();
                this.flash('Not enough coins');
            }
        });

        return card;
    }
}
