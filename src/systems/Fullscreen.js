// Browser fullscreen toggle. Must be called from a user action (key press or click).
export function toggleFullscreen(game) {
  try {
    if (game.scale.isFullscreen) game.scale.stopFullscreen();
    else game.scale.startFullscreen();
  } catch (e) {
    console.warn('Fullscreen not available', e);
  }
}
