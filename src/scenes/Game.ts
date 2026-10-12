import Phaser from 'phaser';
import { GAME, getBiome, getSkin, type BiomeDef, type SkinDef } from '../config';
import { Profile } from '../systems/Profile';
import { sfx } from '../systems/Sfx';

const clamp = Phaser.Math.Clamp;
const lerp = Phaser.Math.Linear;

interface AwardedTotals {
    score: number;
    distance: number;
    pearls: number;
    bubbles: number;
}

interface GameInitData {
    revive?: boolean;
    score?: number;
    lives?: number;
    distance?: number;
    pearls?: number;
    bubbles?: number;
    awarded?: AwardedTotals;
}

interface Gate {
    top: Phaser.GameObjects.Rectangle | null;
    bottom: Phaser.GameObjects.Rectangle | null;
    x: number;
    gapTop: number;
    gapBottom: number;
    checked: boolean;
}

interface Jelly {
    obj: Phaser.GameObjects.Ellipse;
    x: number;
    y: number;
    r: number;
    drift: number;
    checked: boolean;
}

interface Pickup {
    obj: Phaser.GameObjects.Arc;
    x: number;
    y: number;
    r: number;
    kind: 'bubble' | 'pearl';
}

interface Decor {
    obj: Phaser.GameObjects.Arc;
    x: number;
    y: number;
    r: number;
    speed: number;
}

/**
 * UNDERTOW core loop.
 *
 * Hold to swim up, release to sink. Current bands push you up or down; weave
 * through coral gates and jellies, grab air bubbles and pearls. The equipped
 * skin and selected biome change the look and the feel of the run.
 */
export class Game extends Phaser.Scene {
    private width = 0;
    private height = 0;
    private surface = 0;
    private floor = 0;

    private biome!: BiomeDef;
    private skin!: SkinDef;

    private swimmer!: Phaser.GameObjects.Container;
    private tail!: Phaser.GameObjects.Triangle;
    private swimmerRadius = 18;
    private swimmerX = 0;
    private swimmerY = 0;
    private vy = 0;
    private holding = false;

    private bg!: Phaser.GameObjects.Graphics;
    private currentGfx!: Phaser.GameObjects.Graphics;
    private hudGfx!: Phaser.GameObjects.Graphics;

    private decor: Decor[] = [];
    private gates: Gate[] = [];
    private jellies: Jelly[] = [];
    private pickups: Pickup[] = [];

    private bands: number[] = [];
    private bandTimer = 0;
    private trailTimer = 0;

    private score = 0;
    private lives: number = GAME.startingLives;
    private oxygen = 100;
    private elapsed = 0;
    private worldSpeed: number = GAME.speedStart;
    private distanceAccum = 0;
    private pixels = 0;
    private pearls = 0;
    private bubbles = 0;
    private nextSpawn = 0;
    private patternCount = 0;
    private invuln = 0;
    private roundActive = false;
    private awarded: AwardedTotals = { score: 0, distance: 0, pearls: 0, bubbles: 0 };
    private nearCombo = 0;
    private slowmo = 0;
    private isRevive = false;

    private scoreText!: Phaser.GameObjects.Text;
    private livesText!: Phaser.GameObjects.Text;
    private hintText!: Phaser.GameObjects.Text;
    private biomeText!: Phaser.GameObjects.Text;

    constructor() {
        super('Game');
    }

    init(data: GameInitData = {}): void {
        const revive = data.revive === true;
        this.isRevive = revive;
        this.score = revive ? data.score ?? 0 : 0;
        this.lives = revive ? data.lives ?? GAME.startingLives : GAME.startingLives;
        this.pixels = revive ? (data.distance ?? 0) * 60 : 0;
        this.pearls = revive ? data.pearls ?? 0 : 0;
        this.bubbles = revive ? data.bubbles ?? 0 : 0;
        this.awarded = revive && data.awarded
            ? data.awarded
            : { score: this.score, distance: Math.floor(this.pixels / 60), pearls: this.pearls, bubbles: this.bubbles };
    }

    create(): void {
        this.biome = getBiome(Profile.selectedBiome);
        this.skin = getSkin(Profile.equippedSkin);

        this.roundActive = true;
        this.elapsed = 0;
        this.oxygen = 100;
        this.worldSpeed = GAME.speedStart;
        this.distanceAccum = 0;
        this.holding = false;
        this.vy = 0;
        this.swimmerY = 0;
        this.invuln = 0;
        this.patternCount = 0;
        this.nearCombo = 0;
        this.slowmo = 0;
        this.trailTimer = 0;
        this.nextSpawn = 460;
        this.bandTimer = Phaser.Math.FloatBetween(4, 6);
        this.decor = [];
        this.gates = [];
        this.jellies = [];
        this.pickups = [];

        // A rewarded-ad continue is the same run, so only count a brand new run.
        if (!this.isRevive) {
            Profile.beginRun();
        }

        this.cameras.main.setBackgroundColor(this.biome.deep);

        this.bg = this.add.graphics().setDepth(0);
        this.currentGfx = this.add.graphics().setDepth(2);
        this.hudGfx = this.add.graphics().setDepth(20);

        this.buildSwimmer();

        for (let i = 0; i < GAME.bandCount; i++) {
            this.bands.push(Math.random() < 0.5 ? -1 : 1);
        }

        this.scoreText = this.add
            .text(0, 0, '0', {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '34px',
                color: '#ffffff',
                stroke: '#05121f',
                strokeThickness: 5
            })
            .setDepth(21);

        this.livesText = this.add
            .text(0, 0, '', {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '30px',
                color: '#ff4d6d',
                stroke: '#05121f',
                strokeThickness: 5
            })
            .setDepth(21)
            .setOrigin(1, 0);

        this.hintText = this.add
            .text(0, 0, GAME.tagline, {
                fontFamily: 'Arial, sans-serif',
                fontSize: '20px',
                color: '#bfe9ff',
                align: 'center'
            })
            .setDepth(21)
            .setOrigin(0.5);

        this.biomeText = this.add
            .text(0, 0, this.biome.name.toUpperCase(), {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '26px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 5
            })
            .setDepth(21)
            .setOrigin(0.5);

        this.layout();
        this.buildDecor();

        this.input.on('pointerdown', this.onPressStart);
        this.input.on('pointerup', this.onPressEnd);
        this.input.on('pointerout', this.onPressEnd);
        this.input.keyboard?.on('keydown-SPACE', this.onPressStart);
        this.input.keyboard?.on('keyup-SPACE', this.onPressEnd);
        this.input.keyboard?.on('keydown-UP', this.onPressStart);
        this.input.keyboard?.on('keyup-UP', this.onPressEnd);
        this.input.keyboard?.on('keydown-W', this.onPressStart);
        this.input.keyboard?.on('keyup-W', this.onPressEnd);

        this.scale.on('resize', this.handleResize, this);
        this.events.once('shutdown', () => {
            this.scale.off('resize', this.handleResize, this);
        });

        this.time.delayedCall(1600, () => {
            this.tweens.add({ targets: this.biomeText, alpha: 0, duration: 700 });
        });
        this.time.delayedCall(5000, () => {
            this.tweens.add({ targets: this.hintText, alpha: 0, duration: 600 });
        });

        this.updateHud();
    }

    update(_time: number, deltaMs: number): void {
        if (!this.roundActive) {
            return;
        }
        const raw = Math.min(deltaMs, 50) / 1000;
        this.elapsed += raw;
        if (this.slowmo > 0) {
            this.slowmo = Math.max(0, this.slowmo - raw);
        }
        const dt = raw * (this.slowmo > 0 ? 0.45 : 1);
        const diff = this.difficulty();
        this.worldSpeed = lerp(GAME.speedStart, GAME.speedMax, diff) * this.biome.speedMul;

        this.updateBands(dt);
        this.updateSwim(dt);
        this.spawn(dt);
        this.updateEntities(dt);
        this.checkCollisions();
        this.updateOxygen(dt);
        this.renderCurrents();
        this.updateHud();
    }

    //  Input ----------------------------------------------------------------

    private onPressStart = (): void => {
        sfx.resume();
        this.holding = true;
    };

    private onPressEnd = (): void => {
        this.holding = false;
    };

    //  Setup ----------------------------------------------------------------

    private buildSwimmer(): void {
        this.swimmer = this.add.container(0, 0).setDepth(6);

        this.tail = this.add.triangle(-22, 0, 0, -13, 0, 13, -22, 0, this.skin.fin, 0.9);
        const body = this.add.ellipse(0, 0, 46, 30, this.skin.body);
        const fin = this.add.triangle(0, -14, -10, 6, 10, 6, 0, -12, this.skin.fin, 0.85);
        const eye = this.add.circle(12, -4, 4, 0x05121f);
        const eyeShine = this.add.circle(13.5, -5.5, 1.6, 0xffffff);

        this.swimmer.add([this.tail, body, fin, eye, eyeShine]);
    }

    private buildDecor(): void {
        for (let i = 0; i < 26; i++) {
            const r = Phaser.Math.Between(2, 6);
            const x = Phaser.Math.Between(0, this.width);
            const y = Phaser.Math.Between(0, this.height);
            const obj = this.add.circle(x, y, r, this.biome.decor, 0.18).setDepth(1);
            this.decor.push({ obj, x, y, r, speed: Phaser.Math.Between(20, 60) });
        }
    }

    //  Physics --------------------------------------------------------------

    private updateSwim(dt: number): void {
        const current = this.getBandAccel(this.swimmerY);
        const thrust = this.holding ? GAME.thrust : 0;
        const accel = GAME.gravity - thrust - current;

        this.vy += accel * dt;
        this.vy *= 1 - clamp(GAME.drag * dt, 0, 0.9);
        this.vy = clamp(this.vy, -GAME.maxVy, GAME.maxVy);

        this.swimmerY += this.vy * dt;

        const topLimit = this.surface + this.swimmerRadius;
        const bottomLimit = this.floor - this.swimmerRadius;

        if (this.swimmerY < topLimit) {
            this.swimmerY = topLimit;
            this.vy = Math.max(0, this.vy);
        } else if (this.swimmerY > bottomLimit) {
            this.swimmerY = bottomLimit;
            this.vy = Math.min(0, this.vy);
        }

        this.swimmer.setPosition(this.swimmerX, this.swimmerY);
        this.swimmer.rotation = clamp(this.vy / 1100, -0.5, 0.5);
        this.tail.setRotation(Math.sin(this.elapsed * 16) * 0.45);
        this.swimmer.setAlpha(this.invuln > 0 ? (Math.floor(this.elapsed * 14) % 2 === 0 ? 1 : 0.35) : 1);

        if (this.invuln > 0) {
            this.invuln -= dt;
        }

        this.trailTimer -= dt;
        if (this.trailTimer <= 0 && (this.holding || Math.abs(this.vy) > 220)) {
            this.trailTimer = 0.07;
            const bubble = this.add.circle(this.swimmerX - 18, this.swimmerY, 5, this.skin.trail, 0.5).setDepth(5);
            this.tweens.add({
                targets: bubble,
                x: bubble.x - 60,
                alpha: 0,
                scale: 0.3,
                duration: 500,
                onComplete: () => bubble.destroy()
            });
        }
    }

    private getBandAccel(y: number): number {
        const span = Math.max(1, this.floor - this.surface);
        const t = clamp((y - this.surface) / span, 0, 0.999);
        const idx = Math.min(this.bands.length - 1, Math.floor(t * this.bands.length));
        return this.bands[idx] * GAME.currentAccel * this.biome.currentMul;
    }

    private updateBands(dt: number): void {
        this.bandTimer -= dt;
        if (this.bandTimer <= 0) {
            this.bandTimer = Phaser.Math.FloatBetween(6, 9);
            for (let i = 0; i < this.bands.length; i++) {
                if (Math.random() < 0.5) {
                    this.bands[i] *= -1;
                }
            }
        }
    }

    //  Spawning -------------------------------------------------------------

    private spawn(dt: number): void {
        if (this.elapsed < 1.4) {
            return;
        }
        this.nextSpawn -= this.worldSpeed * dt;
        if (this.nextSpawn > 0) {
            return;
        }
        this.patternCount++;
        if (this.patternCount % 3 === 0) {
            this.spawnTreasure();
        } else if (Math.random() < 0.68) {
            this.spawnGate();
        } else {
            this.spawnJelly();
        }
        this.nextSpawn += lerp(440, 240, this.difficulty());
    }

    private spawnGate(): void {
        const d = this.difficulty();
        const gapH = this.height * lerp(0.36, 0.22, d);
        const margin = gapH / 2 + this.height * 0.05;
        const center = Phaser.Math.Between(Math.round(margin), Math.round(this.height - margin));
        const gateTop = center - gapH / 2;
        const gateBottom = center + gapH / 2;
        const w = clamp(this.width * 0.14, 54, 110);
        const x = this.width + w;

        let top: Phaser.GameObjects.Rectangle | null = null;
        let bottom: Phaser.GameObjects.Rectangle | null = null;

        if (gateTop > 4) {
            top = this.add
                .rectangle(x, gateTop / 2, w, gateTop, this.biome.rock)
                .setStrokeStyle(2, this.biome.rockEdge, 0.9)
                .setDepth(4);
        }
        if (gateBottom < this.height - 4) {
            const h = this.height - gateBottom;
            bottom = this.add
                .rectangle(x, gateBottom + h / 2, w, h, this.biome.rock)
                .setStrokeStyle(2, this.biome.rockEdge, 0.9)
                .setDepth(4);
        }

        this.gates.push({ top, bottom, x, gapTop: gateTop, gapBottom: gateBottom, checked: false });
    }

    private spawnJelly(): void {
        const d = this.difficulty();
        const r = clamp(this.height * 0.05, 20, 40);
        const y = Phaser.Math.Between(Math.round(this.surface + r + 20), Math.round(this.floor - r - 20));
        const x = this.width + r + 24;

        const obj = this.add
            .ellipse(x, y, r * 2, r * 1.7, this.biome.jelly, 0.55)
            .setStrokeStyle(3, this.biome.jellyEdge, 0.9)
            .setDepth(4);
        this.tweens.add({
            targets: obj,
            scaleX: 1.12,
            scaleY: 0.9,
            duration: 700,
            yoyo: true,
            repeat: -1
        });

        const drift = Phaser.Math.Between(-1, 1) * (50 + 90 * d) * this.biome.jellyMul;
        this.jellies.push({ obj, x, y, r, drift, checked: false });
    }

    private spawnTreasure(): void {
        const y0 = Phaser.Math.Between(Math.round(this.surface + 70), Math.round(this.floor - 70));
        const x0 = this.width + 60;
        const count = Phaser.Math.Between(3, 4);
        for (let i = 0; i < count; i++) {
            this.spawnPickup(x0 + i * 46, y0 + Math.sin(i * 0.9) * 34, 'bubble');
        }
        this.spawnPickup(x0 + count * 46 + 34, y0, 'pearl');
    }

    private spawnPickup(x: number, y: number, kind: 'bubble' | 'pearl'): void {
        const r = clamp(this.height * 0.024, 10, 18);
        const color = kind === 'pearl' ? GAME.pearl : GAME.bubble;
        const obj = this.add
            .circle(x, y, r, color, kind === 'pearl' ? 1 : 0.25)
            .setStrokeStyle(3, color, 0.95)
            .setDepth(5);
        if (kind === 'bubble') {
            this.tweens.add({ targets: obj, alpha: { from: 1, to: 0.55 }, duration: 620, yoyo: true, repeat: -1 });
        }
        this.pickups.push({ obj, x, y, r, kind });
    }

    //  Entity updates -------------------------------------------------------

    private updateEntities(dt: number): void {
        const move = this.worldSpeed * dt;
        this.pixels += move;

        for (let i = this.gates.length - 1; i >= 0; i--) {
            const g = this.gates[i];
            g.x -= move;
            if (g.top) {
                g.top.x = g.x;
            }
            if (g.bottom) {
                g.bottom.x = g.x;
            }
            if (!g.checked && g.x < this.swimmerX) {
                g.checked = true;
                const clearance = Math.min(this.swimmerY - g.gapTop, g.gapBottom - this.swimmerY);
                if (clearance >= this.swimmerRadius + 1 && clearance < GAME.nearMissPx) {
                    this.nearMiss();
                }
            }
            if (g.x < -220) {
                g.top?.destroy();
                g.bottom?.destroy();
                this.gates.splice(i, 1);
            }
        }

        for (let i = this.jellies.length - 1; i >= 0; i--) {
            const j = this.jellies[i];
            j.x -= move;
            j.y += j.drift * dt;
            if (j.y < this.surface + j.r) {
                j.y = this.surface + j.r;
                j.drift = Math.abs(j.drift);
            } else if (j.y > this.floor - j.r) {
                j.y = this.floor - j.r;
                j.drift = -Math.abs(j.drift);
            }
            j.obj.setPosition(j.x, j.y);
            if (!j.checked && j.x < this.swimmerX) {
                j.checked = true;
                const gap = Math.abs(this.swimmerY - j.y);
                const contact = this.swimmerRadius + j.r * 0.85;
                if (gap >= contact && gap < j.r + GAME.nearMissPx) {
                    this.nearMiss();
                }
            }
            if (j.x < -90) {
                j.obj.destroy();
                this.jellies.splice(i, 1);
            }
        }

        for (let i = this.pickups.length - 1; i >= 0; i--) {
            const p = this.pickups[i];
            p.x -= move;
            p.obj.setPosition(p.x, p.y);
            if (p.x < -60) {
                p.obj.destroy();
                this.pickups.splice(i, 1);
            }
        }

        for (const b of this.decor) {
            b.y -= b.speed * dt;
            b.x -= move * 0.15;
            if (b.y < this.surface - 30) {
                b.y = this.floor + 10;
                b.x = Phaser.Math.Between(0, this.width);
            }
            if (b.x < -20) {
                b.x = this.width + 10;
            }
            b.obj.setPosition(b.x, b.y);
        }

        this.distanceAccum += move;
        while (this.distanceAccum >= 60) {
            this.distanceAccum -= 60;
            this.score += 1;
        }
    }

    private checkCollisions(): void {
        const sx = this.swimmerX;
        const sy = this.swimmerY;
        const sr = this.swimmerRadius;

        if (this.invuln <= 0) {
            for (const g of this.gates) {
                if (g.top && this.circleRect(sx, sy, sr, g.top)) {
                    this.hit();
                    return;
                }
                if (g.bottom && this.circleRect(sx, sy, sr, g.bottom)) {
                    this.hit();
                    return;
                }
            }
            for (const j of this.jellies) {
                if (Phaser.Math.Distance.Between(sx, sy, j.x, j.y) < sr + j.r * 0.85) {
                    this.hit();
                    return;
                }
            }
        }

        for (let i = this.pickups.length - 1; i >= 0; i--) {
            const p = this.pickups[i];
            if (Phaser.Math.Distance.Between(sx, sy, p.x, p.y) < sr + p.r) {
                if (p.kind === 'bubble') {
                    this.oxygen = Math.min(100, this.oxygen + GAME.bubbleOxygen);
                    this.bubbles++;
                    sfx.bubble();
                } else {
                    this.score += 5;
                    this.pearls++;
                    sfx.success();
                }
                this.popAt(p.x, p.y, p.kind === 'pearl' ? GAME.pearl : GAME.bubble);
                p.obj.destroy();
                this.pickups.splice(i, 1);
            }
        }
    }

    private nearMiss(): void {
        this.nearCombo++;
        this.score += GAME.nearMissScore + Math.min(3, Math.floor(this.nearCombo / 3));
        this.slowmo = GAME.nearMissSlowmo;
        sfx.whoosh();

        const ring = this.add
            .circle(this.swimmerX, this.swimmerY, 22, 0xffffff, 0)
            .setStrokeStyle(3, 0xffffff, 0.9)
            .setDepth(7);
        this.tweens.add({ targets: ring, scale: 2.6, alpha: 0, duration: 320, onComplete: () => ring.destroy() });

        const label = this.add
            .text(this.swimmerX + 26, this.swimmerY - 26, this.nearCombo > 1 ? `CLOSE x${this.nearCombo}` : 'CLOSE!', {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '16px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4
            })
            .setOrigin(0, 0.5)
            .setDepth(9);
        this.tweens.add({ targets: label, y: label.y - 28, alpha: 0, duration: 620, onComplete: () => label.destroy() });
    }

    private hit(): void {
        this.lives--;
        this.nearCombo = 0;
        this.invuln = 1.6;
        this.oxygen = Math.max(this.oxygen, 55);
        sfx.fail();
        this.cameras.main.shake(200, 0.012);
        this.updateHud();
        if (this.lives <= 0) {
            this.die();
        }
    }

    private die(): void {
        this.roundActive = false;
        sfx.gameOver();
        this.swimmer.setAlpha(0);
        this.time.delayedCall(700, () => {
            this.scene.start('GameOver', {
                score: this.score,
                distance: Math.floor(this.pixels / 60),
                pearls: this.pearls,
                bubbles: this.bubbles,
                awarded: this.awarded
            });
        });
    }

    //  Oxygen / HUD ---------------------------------------------------------

    private updateOxygen(dt: number): void {
        if (this.invuln > 0) {
            return;
        }
        this.oxygen -= (GAME.oxygenDrain + 6 * this.difficulty()) * this.biome.oxygenMul * dt;
        if (this.oxygen <= 0) {
            this.oxygen = 0;
            this.hit();
            this.oxygen = 60;
        }
    }

    private updateHud(): void {
        this.scoreText.setText(`${this.score}`);
        this.livesText.setText('♥'.repeat(Math.max(0, this.lives)));

        this.hudGfx.clear();
        const barW = Math.min(320, this.width * 0.42);
        const barH = 14;
        const x = this.width / 2 - barW / 2;
        const y = 60;
        const frac = clamp(this.oxygen / 100, 0, 1);
        const color = frac > 0.5 ? GAME.colors[0] : frac > 0.25 ? GAME.colors[2] : GAME.colors[1];

        this.hudGfx.fillStyle(0x000000, 0.35);
        this.hudGfx.fillRoundedRect(x - 3, y - 3, barW + 6, barH + 6, 8);
        this.hudGfx.fillStyle(color, 1);
        this.hudGfx.fillRoundedRect(x, y, Math.max(2, barW * frac), barH, 7);
    }

    //  Rendering ------------------------------------------------------------

    private renderCurrents(): void {
        this.currentGfx.clear();
        const n = this.bands.length;
        const span = this.floor - this.surface;
        const bandH = span / n;

        for (let i = 0; i < n; i++) {
            const top = this.surface + i * bandH;
            const dir = this.bands[i];
            const up = dir > 0;
            const color = up ? this.biome.upCurrent : this.biome.downCurrent;

            this.currentGfx.fillStyle(color, 0.06);
            this.currentGfx.fillRect(0, top, this.width, bandH);

            const spacing = 130;
            const offset = ((this.elapsed * 70 * dir) % spacing + spacing) % spacing;
            this.currentGfx.lineStyle(4, color, 0.18);
            const y = top + bandH / 2;
            for (let x = -spacing + offset; x < this.width + spacing; x += spacing) {
                this.currentGfx.beginPath();
                if (up) {
                    this.currentGfx.moveTo(x, y + 14);
                    this.currentGfx.lineTo(x + 16, y);
                    this.currentGfx.lineTo(x + 32, y + 14);
                } else {
                    this.currentGfx.moveTo(x, y - 14);
                    this.currentGfx.lineTo(x + 16, y);
                    this.currentGfx.lineTo(x + 32, y - 14);
                }
                this.currentGfx.strokePath();
            }
        }
    }

    private renderBackground(): void {
        // Banded vertical gradient. Works on both the Canvas and WebGL
        // renderers (Graphics.fillGradientStyle is WebGL-only).
        this.bg.clear();
        const bands = 24;
        const bandH = this.height / bands + 1;
        const top = Phaser.Display.Color.ValueToColor(this.biome.surface);
        const bottom = Phaser.Display.Color.ValueToColor(this.biome.deep);
        for (let i = 0; i < bands; i++) {
            const mix = Phaser.Display.Color.Interpolate.ColorWithColor(top, bottom, bands - 1, i);
            this.bg.fillStyle(Phaser.Display.Color.GetColor(mix.r, mix.g, mix.b), 1);
            this.bg.fillRect(0, i * bandH, this.width, bandH);
        }
    }

    private popAt(x: number, y: number, color: number): void {
        for (let i = 0; i < 10; i++) {
            const particle = this.add.circle(x, y, 4, color).setDepth(8);
            const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            const distance = Phaser.Math.Between(24, 70);
            this.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * distance,
                y: y + Math.sin(angle) * distance,
                alpha: 0,
                scale: 0.2,
                duration: 400,
                onComplete: () => particle.destroy()
            });
        }
    }

    //  Layout ---------------------------------------------------------------

    private layout(): void {
        this.width = this.scale.width;
        this.height = this.scale.height;
        this.surface = Math.min(84, this.height * 0.18);
        this.floor = this.height - Math.min(48, this.height * 0.1);
        this.swimmerX = this.width * 0.3;
        this.swimmerRadius = clamp(this.height * 0.024, 14, 20);
        if (this.swimmerY <= 0) {
            this.swimmerY = (this.surface + this.floor) / 2;
        }

        this.renderBackground();

        this.scoreText.setPosition(22, 16);
        this.livesText.setPosition(this.width - 22, 18);
        this.hintText.setPosition(this.width / 2, this.height - 22);
        this.biomeText.setPosition(this.width / 2, this.height * 0.3);

        this.swimmer.setScale(clamp(this.height / 900, 0.75, 1.15));
    }

    private handleResize(): void {
        this.layout();
        this.renderCurrents();
    }

    private difficulty(): number {
        return clamp(this.elapsed / 100, 0, 1);
    }

    private circleRect(cx: number, cy: number, r: number, rect: Phaser.GameObjects.Rectangle): boolean {
        const dx = Math.abs(cx - rect.x) - rect.width / 2;
        const dy = Math.abs(cy - rect.y) - rect.height / 2;
        if (dx > r || dy > r) {
            return false;
        }
        if (dx <= 0 || dy <= 0) {
            return true;
        }
        return dx * dx + dy * dy <= r * r;
    }
}
