import Phaser from 'phaser';

/** A simple drawn coin, so we ship no image assets. Position is its centre. */
export function makeCoin(scene: Phaser.Scene, x: number, y: number, radius = 12): Phaser.GameObjects.Container {
    const coin = scene.add.container(x, y);
    coin.add(scene.add.circle(0, 0, radius, 0xffe3a3).setStrokeStyle(2, 0xb8860b, 1));
    coin.add(scene.add.circle(0, 0, radius * 0.55, 0xffd15c));
    coin.add(scene.add.circle(-radius * 0.28, -radius * 0.28, radius * 0.18, 0xffffff, 0.7));
    return coin;
}

/** Draws the swimmer silhouette for previews (shop, menu). */
export function makeSwimmerPreview(
    scene: Phaser.Scene,
    x: number,
    y: number,
    scale: number,
    body: number,
    fin: number
): Phaser.GameObjects.Container {
    const container = scene.add.container(x, y);
    const tail = scene.add.triangle(-22, 0, 0, -13, 0, 13, -22, 0, fin, 0.9);
    const bodyShape = scene.add.ellipse(0, 0, 46, 30, body);
    const topFin = scene.add.triangle(0, -14, -10, 6, 10, 6, 0, -12, fin, 0.85);
    const eye = scene.add.circle(12, -4, 4, 0x05121f);
    const shine = scene.add.circle(13.5, -5.5, 1.6, 0xffffff);
    container.add([tail, bodyShape, topFin, eye, shine]);
    container.setScale(scale);
    return container;
}
