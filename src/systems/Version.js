// Version of the game. Appended to content/asset URLs so browsers (and GitHub Pages caches)
// load fresh files after an update. Increase it whenever content or assets change.
export const GAME_VERSION = '2.0.1';

// True when the page runs the automated test (?autotest).
export const AUTOTEST = new URLSearchParams(location.search).has('autotest');

export const versioned = (url) => `${url}?v=${GAME_VERSION}`;
