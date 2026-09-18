import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createEnemyIndex, createEnemyPage, createEnemySitemap, fetchEnemies, writeEnemyOutput, enemyPath, portrait, fetchAvatarImages } from '../tools/build-enemy-pages.js';
import { baseStyles } from '../tools/build-operator-pages.js';

const enemy = { id: '10000000-0000-4000-8000-000000000001', name: 'Training Dummy', category: 'test', description: 'Synthetic target.', hp: null, defense: 0, location: '', resistances: { heat: 0.5 }, skills: [{ name: 'Hit', description: 'A test attack.' }], is_visible: true, updated_at: '2026-09-15T10:00:00Z' };

test('uploaded avatars appear on cards, profiles and share metadata with a safe fallback', () => {
    const url = `https://ftssllxdkqvmlxhfeqmy.supabase.co/storage/v1/object/public/enemy-avatars/${enemy.id}/${'a'.repeat(64)}.png`;
    const custom = { ...enemy, avatar_url: url };
    const local = `/endfield/enemies/training-dummy/avatar.png?v=${'a'.repeat(64)}`;
    assert.equal(portrait(custom), local);
    assert.ok(createEnemyIndex([custom]).includes(`src="${local}"`));
    assert.ok(createEnemyPage(custom, [custom]).includes(`property="og:image" content="https://rotationforge.gg${local}"`));
    assert.equal(portrait({...enemy, avatar_url:'javascript:alert(1)'}), portrait(enemy));
    assert.equal(portrait({...enemy, avatar_url:''}), portrait(enemy));
});

test('generated avatar copies survive removal of the old upload; missing copies fail safely', async () => {
    const custom = {...enemy, avatar_url:`https://ftssllxdkqvmlxhfeqmy.supabase.co/storage/v1/object/public/enemy-avatars/${enemy.id}/${'a'.repeat(64)}.png`};
    const bytes = Buffer.from([137,80,78,71,13,10,26,10,0]);
    const images = await fetchAvatarImages([custom], async () => new Response(bytes));
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'enemy-copy-'));
    const options = {outputDir:path.join(root,'enemies'),sitemapPath:path.join(root,'sitemap.xml'),avatarImages:images};
    try {
        writeEnemyOutput([custom], options);
        assert.deepEqual(fs.readFileSync(path.join(options.outputDir,'training-dummy','avatar.png')),bytes);
        assert.throws(() => writeEnemyOutput([custom], {...options,avatarImages:new Map()}), /Missing avatar copy/);
        assert.ok(fs.existsSync(path.join(options.outputDir,'training-dummy','avatar.png')));
        await assert.rejects(fetchAvatarImages([custom], async () => new Response('missing',{status:404})), /download failed/);
    } finally { fs.rmSync(root,{recursive:true,force:true}); }
});

test('enemy pages expose crawlable profiles and full content without database JavaScript', () => {
    const index = createEnemyIndex([enemy]);
    assert.ok(index.includes(`href="${enemyPath(enemy)}"`));
    const html = createEnemyPage(enemy, [enemy]);
    assert.match(html, /<link rel="canonical"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /A test attack\./);
    assert.match(html, /<strong>Unknown<\/strong>/);
    assert.match(html, /<strong>0<\/strong>/);
    assert.doesNotMatch(html, /supabaseClient\.js/);
    assert.equal(enemyPath(enemy), '/endfield/enemies/training-dummy/');
    assert.equal(enemyPath({ ...enemy, name: 'Triaggelos' }), '/endfield/enemies/triaggelos/');
});

test('enemy metadata escapes stored text and rejects unsafe source URLs', () => {
    const input = { ...enemy, name: '</script><img src=x onerror=alert(1)>', source_url: 'javascript:alert(1)' };
    for (const html of [createEnemyPage(input, [input]), createEnemyIndex([input])]) {
        assert.doesNotMatch(html, /<img src=x/);
        assert.doesNotMatch(html, /href="javascript:/);
        const schemas = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)];
        for (const schema of schemas) assert.doesNotThrow(() => JSON.parse(schema[1]));
    }
});

test('enemy build removes unpublished pages and sitemap URLs on the next generation', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'enemy-build-'));
    const options = { outputDir: path.join(root, 'enemies'), sitemapPath: path.join(root, 'sitemap-enemies.xml') };
    try {
        writeEnemyOutput([enemy], options);
        assert.ok(fs.existsSync(path.join(options.outputDir, 'training-dummy', 'index.html')));
        assert.match(fs.readFileSync(options.sitemapPath, 'utf8'), /<lastmod>2026-09-15T10:00:00.000Z<\/lastmod>/);
        writeEnemyOutput([{ ...enemy, is_visible: false }], options);
        assert.equal(fs.existsSync(path.join(options.outputDir, 'training-dummy')), false);
        assert.doesNotMatch(fs.readFileSync(options.sitemapPath, 'utf8'), new RegExp(enemy.id));
        assert.match(fs.readFileSync(path.join(options.outputDir, 'index.html'), 'utf8'), /No enemies have been published yet/);
        assert.throws(() => writeEnemyOutput([{ ...enemy, id: '../outside' }], options));
        assert.ok(fs.existsSync(path.join(options.outputDir, 'index.html')));
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('enemy reads paginate and do not treat a database error as an empty catalog', async () => {
    const rangeCalls = [];
    const client = { from: () => ({ select: () => ({ eq: () => ({ order: () => ({ range: async (start, end) => {
        rangeCalls.push([start, end]);
        return { data: start === 0 ? Array.from({length:1000}, (_,i) => ({...enemy, id:`10000000-0000-4000-8000-${String(i).padStart(12,'0')}`})) : [] };
    } }) }) }) }) };
    assert.equal((await fetchEnemies(client)).length, 1000);
    assert.deepEqual(rangeCalls, [[0,999],[1000,1999]]);
    const failing = { from: () => ({ select: () => ({ eq: () => ({ order: () => ({ range: async () => ({error:{message:'offline'}}) }) }) }) }) };
    await assert.rejects(fetchEnemies(failing), /offline/);
});

test('database theme uses anvil orange and enemy sitemap remains independent', () => {
    assert.match(baseStyles(), /--accent:#fc6f02/);
    assert.doesNotMatch(baseStyles(), /248,245,70|#F8F546/);
    assert.match(createEnemySitemap([enemy]), /https:\/\/rotationforge.gg\/endfield\/enemies\//);
    assert.match(fs.readFileSync('robots.txt','utf8'), /sitemap-enemies\.xml/);
});

