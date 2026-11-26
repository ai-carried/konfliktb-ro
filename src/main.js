// Entry point: Phaser configuration and scene list.
import { BootScene } from './scenes/BootScene.js';
import { StartScene } from './scenes/StartScene.js';
import { OfficeScene } from './scenes/OfficeScene.js';
import { UIScene } from './scenes/UIScene.js';
import { AUTOTEST } from './systems/Version.js';
import { toggleFullscreen } from './systems/Fullscreen.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0b1020',
  // Smooth text; pixel graphics get NEAREST filtering per texture in BootScene.
  pixelArt: false,
  antialias: true,
  roundPixels: true,
  physics: { default: 'arcade', arcade: { debug: false } },
  // Headless test browsers throttle requestAnimationFrame, so the test uses a timer loop.
  fps: AUTOTEST ? { forceSetTimeOut: true, target: 60 } : {},
  // RESIZE: the canvas always fills the whole browser window (no borders).
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight,
    autoCenter: Phaser.Scale.NO_CENTER,
  },
  // Only the first scene starts automatically. UIScene is last so it renders on top.
  scene: [BootScene, StartScene, OfficeScene, UIScene],
});

// F toggles browser fullscreen. Handled on the native event so the browser
// accepts it as a user gesture.
window.addEventListener('keydown', (event) => {
  if (event.code === 'KeyF' && !event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey) {
    toggleFullscreen(game);
  }
});

if (AUTOTEST) {
  window.__game = game;
  import('./systems/AutoTest.js').then((m) => m.runAutoTest(game));
}
