import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const origin = 'https://endfield-assets.fffdan.com';
const directory = 'assets/beyond/dynamicassets/gameplay/ui/sprites/bufficon/';
const endpoint = `${origin}/vfs/Bundle/search/ui/sprites/bufficon?suffix=.png`;
const manifestFile = path.join(root, 'tools/data/original-effect-icons.json');

export function imageExtension(bytes) {
    if (bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') return 'png';
    if (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') return 'webp';
    throw new Error('Source did not return a PNG or WebP image');
}

export async function syncEffectIcons(fetcher = fetch) {
    async function request(url) {
        const response = await fetcher(url, { signal: AbortSignal.timeout(30000), redirect: 'error' });
        if (!response.ok) throw new Error(`Icon source failed (${response.status}): ${url}`);
        return response;
    }
    const paths = await (await request(endpoint)).json();
    if (!Array.isArray(paths) || !paths.length || paths.some(p => typeof p !== 'string'
        || !p.startsWith(directory) || !/^[a-z0-9_]+\.png$/.test(p.slice(directory.length)))) {
        throw new Error('Unexpected status icon manifest');
    }
    const unique = [...new Set(paths)].sort();
    const assets = [];
    await fs.mkdir(path.join(root, 'endfield/assets/ui/effects/original'), { recursive: true });
    // Sequential requests respect the community asset provider.
    for (const sourcePath of unique) {
        const sourceUrl = `${origin}/vfs/Bundle/file/${sourcePath}`;
        const bytes = Buffer.from(await (await request(sourceUrl)).arrayBuffer());
        const extension = imageExtension(bytes);
        const name = path.posix.basename(sourcePath, '.png');
        const localPath = `assets/ui/effects/original/${name}.${extension}`;
        await fs.writeFile(path.join(root, 'endfield', localPath), bytes);
        assets.push({ sourcePath, sourceUrl, localPath, bytes: bytes.length,
            sha256: createHash('sha256').update(bytes).digest('hex') });
        if (assets.length % 25 === 0) console.log(`Downloaded ${assets.length}/${unique.length} original status icons`);
    }
    const manifest = { source: origin, endpoint, retrieved: new Date().toISOString(), assets };
    await fs.writeFile(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`Saved ${assets.length} original status icons (${assets.reduce((n, a) => n + a.bytes, 0)} bytes)`);
    return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    await syncEffectIcons();
}
