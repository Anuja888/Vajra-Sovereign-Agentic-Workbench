import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    // Ensure React loads its development build during tests
    env: {
      NODE_ENV: 'test',
    },
  },
});
