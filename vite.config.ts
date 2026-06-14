import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      input: {
        // Landing page (marketing site) is the entry point.
        main: 'index.html',
        // Playable demo lives at /game.html and boots the Phaser game.
        game: 'game.html',
      },
    },
  },
});
