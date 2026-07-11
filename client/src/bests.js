import { api } from './api.js';

// Personal bests for the higher-is-better games, persisted in preferences JSON.
// recordBest reports back whether this run set a new record so the game can
// celebrate; it fails soft (a network hiccup never breaks the end-of-game screen).
export function recordBest(game, score) {
  return api.post('/games/best', { game, score }).catch(() => ({ best: score, isNewBest: false }));
}

export function fetchBests() {
  return api.get('/preferences').then(p => p?.bests ?? {}).catch(() => ({}));
}
