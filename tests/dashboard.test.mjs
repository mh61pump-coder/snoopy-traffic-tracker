import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('stores remain isolated', async () => {
  const js = await readFile('app.js', 'utf8');
  assert.match(js, /rijing:/);
  assert.match(js, /wenxin:/);
  assert.match(js, /let current = 'rijing'/);
});

test('no secret or buyer PII is published', async () => {
  const all = (await Promise.all(['index.html', 'app.js', 'data/analysis.json'].map(file => readFile(file, 'utf8')))).join('\n');
  assert.doesNotMatch(all, /client_secret|private_key|AIza[0-9A-Za-z_-]{20,}/i);
  const data = await readFile('data/analysis.json', 'utf8');
  assert.doesNotMatch(data, /買家姓名|收件地址|電話號碼|訂單編號/);
});

test('latest monthly datasets are isolated and checkpointed', async () => {
  const data = JSON.parse(await readFile('data/analysis.json', 'utf8'));
  assert.equal(data.version, '1.2.0');
  assert.equal(data.shops.rijing.source.files.length, 4);
  assert.equal(data.shops.wenxin.source.files.length, 4);
  assert.equal(data.shops.rijing.coverage.periodDays, 19);
  assert.equal(data.shops.rijing.coverage.priorPeriodDays, 31);
  assert.equal(data.shops.rijing.totals.orders, 217);
  assert.equal(data.shops.wenxin.totals.orders, 903);
  assert.notEqual(data.shops.rijing.source.files[0].sha256, data.shops.wenxin.source.files[0].sha256);
});

test('clear funnel, top seven traffic products and score components exist', async () => {
  const data = JSON.parse(await readFile('data/analysis.json', 'utf8'));
  for (const shop of Object.values(data.shops)) {
    assert.ok(shop.totals.visitors >= shop.totals.potential_buyers);
    assert.ok(shop.totals.potential_buyers >= shop.totals.buyers);
    assert.equal(shop.trafficLeaders.length, 7);
    assert.ok(shop.trafficLeaders.every(product => product.name && Number.isFinite(product.visitors)));
    assert.ok(shop.topProducts.every(product => Object.keys(product.components).length === 5));
  }
});

test('daily-average comparison is used for unequal periods', async () => {
  const data = JSON.parse(await readFile('data/analysis.json', 'utf8'));
  const shop = data.shops.rijing;
  const expected = ((shop.totals.revenue / 19) - (shop.priorTotals.revenue / 31)) / (shop.priorTotals.revenue / 31);
  assert.ok(Math.abs(shop.comparisonDaily.revenue - expected) < 0.0001);
});
