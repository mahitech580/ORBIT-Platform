import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchesSearch, normalizeSearchText } from './searchText.js';

test('normalizes accents, composed text, compatibility characters and whitespace', () => {
  assert.equal(normalizeSearchText('  Café   Operações  '), 'cafe operacoes');
  assert.equal(normalizeSearchText('Cafe\u0301'), 'cafe');
  assert.equal(normalizeSearchText('Ｆｕｌｌｗｉｄｔｈ'), 'fullwidth');
});

test('retains non-Latin letters and normalizes case', () => {
  assert.equal(normalizeSearchText('తెలుగు తెలుగు'), 'తెలుగు తెలుగు');
  assert.equal(normalizeSearchText('కోడ్'), 'కోడ్');
  assert.equal(matchesSearch(['తెలుగు భాష'], 'తెలుగు'), true);
  assert.equal(matchesSearch(['Straße'], 'straße'), true);
});

test('normalizes numeric, null and blank values predictably', () => {
  assert.equal(normalizeSearchText(42), '42');
  assert.equal(normalizeSearchText(null), '');
  assert.equal(matchesSearch(['Project Atlas'], '  '), true);
  assert.equal(matchesSearch(['Project Atlas'], 'missing'), false);
});
