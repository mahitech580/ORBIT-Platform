import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getStorageItem, removeStorageItem, setStorageItem } from './safeStorage.js';

test('reads, writes, and removes values through a storage adapter', () => {
  const values = new Map();
  const storage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };

  assert.equal(getStorageItem('theme', storage), null);
  assert.equal(setStorageItem('theme', 'dark', storage), true);
  assert.equal(getStorageItem('theme', storage), 'dark');
  assert.equal(removeStorageItem('theme', storage), true);
  assert.equal(getStorageItem('theme', storage), null);
});

test('storage access failures degrade to in-memory application state', () => {
  const blocked = {
    getItem() { throw new Error('Storage access denied'); },
    setItem() { throw new Error('Storage quota exceeded'); },
    removeItem() { throw new Error('Storage access denied'); }
  };

  assert.equal(getStorageItem('token', blocked), null);
  assert.equal(setStorageItem('token', 'session-token', blocked), false);
  assert.equal(removeStorageItem('token', blocked), false);
});

test('missing browser storage does not throw', () => {
  assert.equal(getStorageItem('token', null), null);
  assert.equal(setStorageItem('token', 'value', null), false);
  assert.equal(removeStorageItem('token', null), false);
});
