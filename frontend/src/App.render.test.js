import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { test } from 'node:test';
import { createServer } from 'vite';

const frontendRoot = fileURLToPath(new URL('../', import.meta.url));
const viteConfig = fileURLToPath(new URL('../vite.config.js', import.meta.url));

test('the application renders its initial login shell without browser globals', async () => {
  const server = await createServer({
    configFile: viteConfig,
    root: frontendRoot,
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent'
  });

  try {
    const { default: App } = await server.ssrLoadModule('/src/App.jsx');
    const markup = renderToString(React.createElement(App));
    assert.match(markup, /app-auth/);
    assert.match(markup, /Sign in to ORBIT/);
  } finally {
    await server.close();
  }
});
