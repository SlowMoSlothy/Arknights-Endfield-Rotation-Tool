import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

export async function buildEffectIcons() {
    const mapping = JSON.parse(await fs.readFile(path.join(root, 'tools/data/effect-icon-map.json'), 'utf8'));
    const catalog = JSON.parse(await fs.readFile(path.join(root, 'tools/data/original-effect-icons.json'), 'utf8'));
    const runtime = Object.fromEntries(Object.entries(mapping.effects).map(([key, entry]) =>
        [key, { ...(entry.stackIcons ? { stackIcons: entry.stackIcons } : { icon: entry.icon }),
            ...(entry.stackSegments ? { stackSegments: entry.stackSegments } : {}) }]));
    const scriptFile = path.join(root, 'endfield/js/data/effectIcons.js');
    const script = await fs.readFile(scriptFile, 'utf8');
    const start = script.indexOf('const PLANNER_EFFECT_ICONS = ');
    const end = script.indexOf('\nconst PLANNER_LEGACY_EFFECT_ICONS = ', start);
    if (start < 0 || end < 0) throw new Error('Effect resolver markers missing');
    await fs.writeFile(scriptFile, script.slice(0, start) + 'const PLANNER_EFFECT_ICONS = '
        + JSON.stringify(runtime, null, 2) + ';' + script.slice(end));
    const rows = Object.entries(mapping.effects).map(([key, entry]) => {
        const artwork = entry.stackIcons ? entry.stackIcons.join(', ') : (entry.icon || 'No dedicated icon');
        return `| \`${key}\` | ${artwork} | ${entry.note || 'Original status sprite'} |`;
    });
    const originals = Object.values(mapping.effects).filter(entry => entry.sourceFile).length;
    const stacks = Object.values(mapping.effects).filter(entry => entry.stackIcons).length;
    const hidden = Object.values(mapping.effects).filter(entry => entry.icon === null).length;
    await fs.writeFile(path.join(root, 'docs/effect-icons.md'), `# Planner effect icons

The shared resolver in \`endfield/js/data/effectIcons.js\` uses the reviewed decisions in \`tools/data/effect-icon-map.json\`. Both buff and debuff trays, including the enemy panel, use this resolver. Combat data, visibility flags, durations and triggers are unchanged.

## Original artwork

The complete public game \`bufficon\` directory was downloaded on ${catalog.retrieved.slice(0, 10)}: **${catalog.assets.length} original graphics**, ${catalog.assets.reduce((n, a) => n + a.bytes, 0)} bytes in total. These are game artwork distributed through a community asset mirror, not an official game API. The artwork remains the property of its rights holders.

- Discovery: [public status icon manifest](${catalog.endpoint})
- Provenance: \`tools/data/original-effect-icons.json\` records every source URL, local file, byte length and SHA-256 checksum.
- Local images: \`endfield/assets/ui/effects/original/\`.
- The provider can return WebP for PNG source URLs. Downloaded bytes are preserved; local extensions match the actual format.
- Refresh downloaded artwork with \`npm run sync:effect-icons\`; review mappings before assigning new statuses.
- Regenerate this document and the runtime mapping with \`npm run build:effect-icons\`.

## Reviewed mapping

${Object.keys(mapping.effects).length} effect keys: **${originals} original-status assignments**, **${stacks} retained numbered artwork assignments**, **${hidden} explicit no-icon decisions**. Numbered legacy artwork is retained where no unambiguous original replacement was identified. Action notifications and generic triggers need not have a status icon. An area or entity is not assigned an unrelated operator's skill glyph.

Corrections include Camille's Battle Skill bat, Antal's Focus, Arcane's combo seal (Imprisonment), Si's ink mark (Artful Intent), and the Weakness/Weaken alias. These operator-specific assignments are inferred from the original asset names and the operators' recorded skill data; they are not claims of a populated BuffTable (that endpoint returned no records during this audit).

Canonical \`appliesEffect\` takes precedence over instance IDs and stale database image paths. Original infliction and Vulnerability artwork is framed by a white contour: each stack adds one quarter of the ring (1–4). This overlay preserves the original downloaded artwork. Other unnumbered stackable statuses use a number badge. Failed image requests hide cleanly; effect names and mechanics remain in inspectors.

| Effect key | Artwork | Decision |
| --- | --- | --- |
${rows.join('\n')}
`);
    return { effects: Object.keys(runtime).length, originals, stacks, hidden, assets: catalog.assets.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    console.log(await buildEffectIcons());
}
