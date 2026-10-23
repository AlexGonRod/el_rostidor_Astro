import { defineConfig, devices } from '@playwright/test';

/**
 * Prueba el build de producción servido con `astro preview`.
 * Antes: `npm run build && npx astro preview --background`; al terminar: `npx astro preview stop`.
 * En el entorno de agentes: CHROMIUM_PATH=/opt/pw-browsers/chromium (sin `playwright install`).
 */
const executablePath = process.env.CHROMIUM_PATH || undefined;
const launchOptions = executablePath ? { executablePath } : {};

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:4321',
    launchOptions,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, launchOptions } },
    { name: 'mobile', use: { ...devices['Pixel 7'], launchOptions } },
  ],
});
