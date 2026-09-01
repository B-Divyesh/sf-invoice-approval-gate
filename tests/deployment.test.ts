import { readFile } from 'node:fs/promises';
import { describe, expect, test } from 'vitest';

describe('static deployment contract', () => {
  test('ships a designed 404 response override instead of an SPA soft 404', async () => {
    const config = JSON.parse(await readFile('public/staticwebapp.config.json', 'utf8')) as {
      navigationFallback?: unknown;
      responseOverrides?: Record<string, { rewrite?: string }>;
    };
    const page = await readFile('public/404.html', 'utf8');
    expect(config.navigationFallback).toBeUndefined();
    expect(config.responseOverrides?.['404']?.rewrite).toBe('/404.html');
    expect(page).toContain('<h1>This page is not on the approval desk.</h1>');
    expect(page).toContain('Return to approval desk');
  });

  test('keeps the PWA and designed 404 on the current repair identity', async () => {
    const manifest = JSON.parse(await readFile('public/manifest.webmanifest', 'utf8')) as { start_url: string };
    const page = await readFile('public/404.html', 'utf8');
    expect(manifest.start_url).toBe('/?source=pwa&v=6');
    expect(page).toContain('Built by Param Factory · v1.0.3 · build repair-6');
  });
});
