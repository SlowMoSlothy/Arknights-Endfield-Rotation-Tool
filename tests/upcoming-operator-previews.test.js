import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { upcomingOperatorPreviews, selectUpcomingPreviews, createUpcomingOperatorPage, previewPortraitStyle } from '../tools/upcoming-operator-previews.js';
import { createIndexPage, writeGeneratedOutput, baseStyles, siteHeader } from '../tools/build-operator-pages.js';

test('the official nine cards cover ten figures without inventing combat classifications', () => {
  assert.equal(upcomingOperatorPreviews.length, 10);
  assert.equal(new Set(upcomingOperatorPreviews.map(row => row.icon_path)).size, 9);
  assert.equal(upcomingOperatorPreviews.filter(row => row.name.startsWith('Unrevealed Operator')).length, 8);
  for (const row of upcomingOperatorPreviews) {
    assert.equal(row.star, null);
    assert.equal(row.weapon_type, null);
    assert.equal(row.operator_class, 'unannounced');
    assert.equal(row.element_type, 'unannounced');
    assert.ok(fs.statSync(path.join('endfield', row.icon_path)).size > 100);
    const [x, y, size] = row.raw_data.crop;
    assert.ok(x >= 0 && y >= 0 && x + size <= 1400 && y + size <= 596);
    assert.doesNotMatch(previewPortraitStyle(row), /NaN|Infinity/);
  }
});

test('a real profile supersedes its teaser, including aliases and hidden profiles', () => {
  const result = selectUpcomingPreviews([
    { slug: 'warfarin', name: 'Warfarin', is_visible: false },
    { slug: 'released-m3', name: 'M3' },
    { slug: 'new-name', name: 'Official Name', raw_data: { previewSlug: 'signal-prelink-02' } }
  ]);
  assert.equal(result.length, 7);
  assert.ok(!result.some(row => ['warfarin', 'm3', 'signal-prelink-02'].includes(row.slug)));
});

test('preview pages show unknown fields and sources without made-up stars or a planner entry', () => {
  for (const row of upcomingOperatorPreviews) {
    const html = createUpcomingOperatorPage(row, { styles: baseStyles(), header: siteHeader() });
    assert.match(html, /Upcoming · Preview/);
    assert.match(html, /<dd>Not announced<\/dd>/);
    assert.match(html, /5-m2XEedNlU/);
    assert.doesNotMatch(html, /[★☆]|leader=|data-profile-engagement|0-star|null-star/);
    for (const match of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) assert.doesNotThrow(() => JSON.parse(match[1]));
  }
  const index = createIndexPage(upcomingOperatorPreviews);
  assert.match(index, /value="0">Not announced<\/option>/);
  assert.doesNotMatch(index, />0 stars<\/option>/);
  assert.equal((index.match(/class="operator-tile upcoming-tile"/g) || []).length, 10);
});

test('the atomic generator includes previews in search and sitemap while keeping real profiles intact', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'upcoming-operators-'));
  try {
    const real = { id: 1, slug: 'test-operator', name: 'Test Operator', star: 5, operator_class: 'Guard', element_type: 'physical' };
    const outputDir = path.join(temp, 'operators'), sitemapPath = path.join(temp, 'sitemap.xml');
    writeGeneratedOutput({ operators: [real], previewOperators: upcomingOperatorPreviews, skillsByOperator: new Map(), outputDir, sitemapPath });
    assert.equal(fs.readdirSync(outputDir).length, 12);
    const index = fs.readFileSync(path.join(outputDir, 'index.html'), 'utf8');
    assert.match(index, /11 Operators/);
    for (const row of upcomingOperatorPreviews) {
      assert.ok(fs.existsSync(path.join(outputDir, row.slug, 'index.html')));
      assert.ok(fs.readFileSync(sitemapPath, 'utf8').includes(`/operators/${row.slug}/`));
    }
    assert.match(fs.readFileSync(path.join(outputDir, real.slug, 'index.html'), 'utf8'), /leader=test-operator/);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});
