import assert from 'node:assert/strict';
import { test } from 'node:test';
import { subscribeMediaQuery } from './mediaQueryListener.js';

test('uses and cleans up the modern MediaQueryList event API', () => {
  const calls = [];
  const mediaQuery = {
    addEventListener: (...args) => calls.push(['add', ...args]),
    removeEventListener: (...args) => calls.push(['remove', ...args])
  };
  const listener = () => {};
  const unsubscribe = subscribeMediaQuery(mediaQuery, listener);
  unsubscribe();
  assert.deepEqual(calls, [
    ['add', 'change', listener],
    ['remove', 'change', listener]
  ]);
});

test('falls back to the legacy MediaQueryList listener API', () => {
  const calls = [];
  const mediaQuery = {
    addListener: listener => calls.push(['add', listener]),
    removeListener: listener => calls.push(['remove', listener])
  };
  const listener = () => {};
  const unsubscribe = subscribeMediaQuery(mediaQuery, listener);
  unsubscribe();
  assert.deepEqual(calls, [['add', listener], ['remove', listener]]);
});

test('safely handles unavailable media-query event APIs', () => {
  assert.doesNotThrow(() => subscribeMediaQuery({}, () => {})());
  assert.doesNotThrow(() => subscribeMediaQuery(null, () => {})());
});
