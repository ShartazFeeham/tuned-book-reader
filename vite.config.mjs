import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:7861',
      '/tts': 'http://localhost:7861',
      '/flag': 'http://localhost:7861',
      '/unflag': 'http://localhost:7861',
      '/flagged.json': 'http://localhost:7861',
      '/flagged/where': 'http://localhost:7861',
      '/respell': 'http://localhost:7861',
      '/pronounce.json': 'http://localhost:7861',
      '/pronounce-explicit.json': 'http://localhost:7861',
    },
  },
});
