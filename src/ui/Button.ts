import Phaser from 'phaser';

export interface UIButtonOptions {
    width?: number;
    height?: number;
    fontSize?: number;
    textColor?: string;
    stroke?: number;
}

/** A tappable rounded button that works for both mouse and touch. */
export class UIButton extends Phaser.GameObjects.Container {
    private bg: Phaser.GameObjects.Rectangle;
    private label: Phaser.GameObjects.Text;
    private baseColor: number;
    private interactiveArea: Phaser.GameObjects.Rectangle;
    private buttonWidth: number;
    private buttonHeight: number;
    private enabled = true;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        text: string,
        color: number,
        onClick: () => void,
        options: UIButtonOptions = {}
    ) {
        super(scene, x, y);

        this.baseColor = color;
        this.buttonHeight = options.height ?? 66;

        this.label = scene.add
            .text(0, 0, text, {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: `${options.fontSize ?? 26}px`,
                color: options.textColor ?? '#ffffff'
            })
            .setOrigin(0.5);

        this.buttonWidth = options.width ?? this.label.width + 56;

        this.bg = scene.add
            .rectangle(0, 0, this.buttonWidth, this.buttonHeight, color, 0.95)
            .setStrokeStyle(3, options.stroke ?? 0xffffff, 0.5);

        this.add([this.bg, this.label]);

        this.interactiveArea = this.bg;
        this.interactiveArea.setInteractive({ useHandCursor: true });
        this.interactiveArea.on('pointerover', () => this.enabled && this.setScale(1.04));
        this.interactiveArea.on('pointerout', () => this.setScale(1));
        this.interactiveArea.on('pointerdown', () => {
            if (this.enabled) {
                this.setScale(0.96);
                onClick();
            }
        });
        this.interactiveArea.on('pointerup', () => this.setScale(1));

        scene.add.existing(this);
    }

    setEnabled(enabled: boolean): this {
        this.enabled = enabled;
        this.setAlpha(enabled ? 1 : 0.4);
        this.bg.setFillStyle(enabled ? this.baseColor : 0x39406b, enabled ? 0.95 : 0.6);
        return this;
    }

    setLabel(text: string): this {
        this.label.setText(text);
        return this;
    }

    setButtonColor(color: number): this {
        this.baseColor = color;
        if (this.enabled) {
            this.bg.setFillStyle(color, 0.95);
        }
        return this;
    }

    get buttonW(): number {
        return this.buttonWidth;
    }
}
