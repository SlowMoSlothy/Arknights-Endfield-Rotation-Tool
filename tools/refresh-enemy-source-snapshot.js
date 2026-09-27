// Run from a connection that the public API accepts. Never falls back to old data.
import fs from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { fetchSource, mapSource, SOURCE } from './sync-endfield-enemies.js';

export async function refresh({data,fetcher=fetch,outputUrl=new URL('./data/',import.meta.url)}={}) {
data ??= await fetchSource();
const catalog=mapSource(data),images=new Map();
for(const item of catalog.filter(item=>item.image)) {
  const response=await fetcher(item.image,{signal:AbortSignal.timeout(30000),redirect:'error'});
  if(!response.ok) throw new Error(`Image capture failed: ${item.sourceId} (${response.status})`);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length>2097152 || bytes.subarray(0,4).toString()!=='RIFF' || bytes.subarray(8,12).toString()!=='WEBP') throw new Error(`Invalid source image: ${item.sourceId}`);
  images.set(item.sourceId,bytes);
  if(images.size%20===0) console.log(`Validated ${images.size} source images`);
}
const root=outputUrl,bytes=gzipSync(Buffer.from(JSON.stringify(data)));
await fs.mkdir(new URL('enemy-source-images/',root),{recursive:true});
for(const [key,image] of images) await fs.writeFile(new URL(`enemy-source-images/${key}.webp`,root),image);
await fs.writeFile(new URL('enemy-source-snapshot.json.gz',root),bytes);
await fs.writeFile(new URL('enemy-source-snapshot.json',root),JSON.stringify({source:SOURCE,capturedAt:new Date().toISOString(),sha256:createHash('sha256').update(bytes).digest('hex'),sourceTemplates:catalog.length,images:Object.fromEntries([...images].map(([key,image])=>[key,createHash('sha256').update(image).digest('hex')]))},null,2)+'\n');
console.log(`Captured ${catalog.length} templates and ${images.size} images. Review and commit tools/data/enemy-source-* to update the Actions fallback.`);

}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) refresh().catch(error=>{console.error(error.message);process.exitCode=1;});
