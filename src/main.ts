import Phaser from 'phaser';
import { YouTubePlayables } from './playables/YouTubePlayables';
import { GAME } from './config';
import { Boot } from './scenes/Boot';
import { Preloader } from './scenes/Preloader';
import { MainMenu } from './scenes/MainMenu';
import { Game } from './scenes/Game';
import { GameOver } from './scenes/GameOver';
import { Shop } from './scenes/Shop';
import { Areas } from './scenes/Areas';
import { Wheel } from './scenes/Wheel';
import { Missions } from './scenes/Missions';

// The SDK script tag is `async`, so wait (briefly) for it before booting the
// game. If it never arrives we proceed anyway and run as a normal web game.
const SDK_WAIT_MS = 2500;

const waitForSdk = (): Promise<void> =>
    new Promise((resolve) => {
        if (window.ytgame) {
            resolve();
            return;
        }
        const start = performance.now();
        const poll = (): void => {
            if (window.ytgame || performance.now() - start >= SDK_WAIT_MS) {
                resolve();
                return;
            }
            window.setTimeout(poll, 30);
        };
        poll();
    });

void waitForSdk().then(() => {
    YouTubePlayables.boot(() => {
        const game = new Phaser.Game({
            // Canvas renderer: WebGL framebuffer creation fails inside some
            // sandboxed iframes (e.g. the Playables Test Suite on Firefox) and
            // when the container is still 0x0. Canvas is a supported Playables
            // rendering API and is fully compatible with our 2D game.
            type: Phaser.CANVAS,
            parent: 'gameParent',
            backgroundColor: GAME.background,
            scale: {
                mode: Phaser.Scale.RESIZE,
                autoCenter: Phaser.Scale.CENTER_BOTH,
                width: Math.max(320, window.innerWidth || 320),
                height: Math.max(320, window.innerHeight || 320)
            },
            render: {
                antialias: true,
                roundPixels: false
            },
            scene: [Boot, Preloader, MainMenu, Game, GameOver, Shop, Areas, Wheel, Missions]
        });

        // Some embeds (e.g. the Playables Test Suite) keep the game hidden at
        // 0x0 until it reports ready, and don't fire a usable resize event when
        // they reveal it. So never block boot on size; just make sure we adopt
        // the real size as soon as it appears.
        const parent = document.getElementById('gameParent');
        const syncSize = (): void => {
            if (!parent) {
                return;
            }
            const w = parent.clientWidth;
            const h = parent.clientHeight;
            if (w > 0 && h > 0 && (game.scale.width !== w || game.scale.height !== h)) {
                game.scale.resize(w, h);
            }
        };

        if (parent) {
            if (typeof ResizeObserver !== 'undefined') {
                new ResizeObserver(syncSize).observe(parent);
            }
            window.setInterval(syncSize, 300);
        }
    });
});
