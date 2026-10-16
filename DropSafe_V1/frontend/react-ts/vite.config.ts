import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `allowedHosts` exists on newer Vite versions; spread as `any` so this config
// type-checks and runs on Vite 5.x while also accepting the sandbox preview host.
const hostAccess = { allowedHosts: true } as Record<string, unknown>;

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    ...hostAccess,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    ...hostAccess,
  },
});
