import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
      '@appchame': fileURLToPath(new URL('./appchame/src', import.meta.url)),
      '@appconchau': fileURLToPath(new URL('./appconchau/src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}', 'shared/**/*.test.{ts,tsx}'],
  },
});
