import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

// This repository has no browser/DOM test runner, so guard the accessibility
// configuration at the app boundary until browser-level tests are introduced.
test('Framer Motion honors the operating-system reduced-motion preference', async () => {
  const source = await readFile(new URL('../App.jsx', import.meta.url), 'utf8');

  assert.match(source, /import \\{[^}]*\\bMotionConfig\\b[^}]*\\} from 'framer-motion';/);
  const opening = source.indexOf('<MotionConfig reducedMotion="user">');
  const closing = source.lastIndexOf('</MotionConfig>');
  const appRoot = source.indexOf("<div className={'app'", opening);

  assert.ok(opening >= 0, 'MotionConfig must opt into the user motion preference');
  assert.ok(closing > opening, 'MotionConfig wrapper must be closed');
  assert.ok(appRoot > opening && appRoot < closing, 'The entire application must be inside MotionConfig');
});
