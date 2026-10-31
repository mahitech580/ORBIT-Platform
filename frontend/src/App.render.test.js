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
    assert.match(markup, /href="#main-content">Skip to main content/);
    assert.match(markup, /id="main-content" tabindex="-1"/);
  } finally {
    await server.close();
  }
});


test('the dashboard does not introduce a nested main landmark', async () => {
  const server = await createServer({
    configFile: viteConfig,
    root: frontendRoot,
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent'
  });

  try {
    const { default: Dashboard } = await server.ssrLoadModule('/src/pages/Dashboard.jsx');
    const markup = renderToString(React.createElement(Dashboard, {
      projects: [],
      deployments: [],
      teams: [],
      instances: [],
      health: null,
      user: { name: 'Test user' },
      demoMode: true,
      loading: false,
      refreshing: false,
      lastSyncedAt: null,
      onRefresh: () => {},
      onPageChange: () => {}
    }));
    assert.equal((markup.match(/<main\b/g) || []).length, 0);
    assert.match(markup, /class="dashboard-primary"/);
  } finally {
    await server.close();
  }
});


test('command palette listbox contains only option elements', async () => {
  const server = await createServer({
    configFile: viteConfig,
    root: frontendRoot,
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent'
  });

  try {
    const { default: CommandPalette } = await server.ssrLoadModule('/src/components/CommandPalette.jsx');
    const markup = renderToString(React.createElement(CommandPalette, {
      onClose: () => {},
      onSelect: () => {}
    }));
    const listboxStart = markup.indexOf('id="command-results"');
    const footerStart = markup.indexOf('<div class="command-footer"', listboxStart);
    assert.ok(listboxStart >= 0 && footerStart > listboxStart);
    const listboxMarkup = markup.slice(listboxStart, footerStart);
    assert.match(markup, /id="command-title"/);
    assert.match(listboxMarkup, /role="option"/);
    assert.doesNotMatch(listboxMarkup, /command-section-label|command-no-results/);
    assert.match(markup, /aria-labelledby="command-title"/);
  } finally {
    await server.close();
  }
});
