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
        new Phaser.Game({
            type: Phaser.AUTO,
            parent: 'gameParent',
            backgroundColor: GAME.background,
            scale: {
                mode: Phaser.Scale.RESIZE,
                autoCenter: Phaser.Scale.CENTER_BOTH,
                width: Math.max(320, window.innerWidth),
                height: Math.max(320, window.innerHeight)
            },
            render: {
                antialias: true,
                roundPixels: false
            },
            scene: [Boot, Preloader, MainMenu, Game, GameOver, Shop, Areas, Wheel]
        });
    });
});
