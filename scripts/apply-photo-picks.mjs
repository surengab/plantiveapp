/**
 * Downloads the hand-picked candidate for each plant and writes the credit
 * metadata the templates render.
 *
 *   node scripts/photo-candidates.mjs      # gather + contact sheet
 *   node scripts/apply-photo-picks.mjs     # download the chosen ones
 *
 * PICKS are indexes into /tmp/candidates.json, chosen by looking at the contact
 * sheet. Automated ranking was tried twice and produced botanical engravings,
 * herbarium sheets and a photograph of a book page — for an identification site
 * the image has to be judged by eye, so that judgement is recorded here.
 */
import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PHOTO_DIR = join(root, 'public', 'photos');
const META_PATH = join(root, 'src', 'data', 'plant-photos.json');
const UA = 'plantiveapp.com photo fetcher (contact@deductify.org)';

const PICKS = {
  'aloe-vera': 2,
  calathea: 1,
  echeveria: 2,
  'fiddle-leaf-fig': 2,
  'heartleaf-philodendron': 3,
  'monstera-deliciosa': 0,
  'peace-lily': 2,
  'phalaenopsis-orchid': 0,
  pothos: 2,
  'rubber-plant': 2,
  'snake-plant': 0,
  'spider-plant': 0,
  'zz-plant': 2,
};

/** Short alt text describing what the photo shows, for screen readers and SEO. */
const ALT = {
  'aloe-vera': 'Aloe vera plant with thick, upright, spotted succulent leaves',
  calathea: 'Calathea leaf showing its distinctive feathered green pattern',
  echeveria: 'Cluster of blue-green Echeveria rosettes',
  'fiddle-leaf-fig': 'Fiddle leaf fig with large violin-shaped glossy leaves',
  'heartleaf-philodendron': 'Glossy heart-shaped leaf of a heartleaf philodendron',
  'monstera-deliciosa': 'Monstera deliciosa foliage with deeply split, fenestrated leaves',
  'peace-lily': 'Peace lily plant with glossy dark green lance-shaped leaves',
  'phalaenopsis-orchid': 'White Phalaenopsis moth orchid flowers in bloom',
  pothos: 'Pothos vine trailing with variegated heart-shaped leaves',
  'rubber-plant': 'Rubber plant with thick glossy dark green leaves and a red new-growth sheath',
  'snake-plant': 'Snake plant with tall upright banded sword-shaped leaves',
  'spider-plant': 'Spider plant with arching green and cream striped leaves',
  'zz-plant': 'ZZ plant stem with paired glossy dark green leaflets',
};

const candidates = JSON.parse(await readFile('/tmp/candidates.json', 'utf8'));
await mkdir(PHOTO_DIR, { recursive: true });
await mkdir(dirname(META_PATH), { recursive: true });

/** Commons throttles bursts; back off rather than failing the run. */
async function get(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    await new Promise((r) => setTimeout(r, attempt === 0 ? 400 : 2000 * attempt));
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (res.status !== 429) throw new Error(`${res.status} ${url}`);
  }
  throw new Error(`rate limited: ${url}`);
}

const meta = {};
for (const [slug, index] of Object.entries(PICKS)) {
  const cand = candidates[slug]?.[index];
  if (!cand) {
    console.warn(`! ${slug}: no candidate at index ${index}`);
    continue;
  }

  // Ask for a width large enough to crop a 1200px hero from.
  const src = cand.thumb.replace(/\/800px-/, '/1600px-');
  const buf = await get(src).catch(() => get(cand.thumb));
  const base = sharp(buf).rotate();

  await base
    .clone()
    .resize(900, 600, { fit: 'cover', position: 'attention' })
    .webp({ quality: 72, effort: 6 })
    .toFile(join(PHOTO_DIR, `${slug}-900.webp`));
  await base
    .clone()
    .resize(640, 360, { fit: 'cover', position: 'attention' })
    .webp({ quality: 70, effort: 6 })
    .toFile(join(PHOTO_DIR, `${slug}-640.webp`));

  meta[slug] = {
    alt: ALT[slug] ?? '',
    author: cand.author,
    licence: cand.licence,
    licenceUrl: cand.licenceUrl,
    source: cand.source,
    file: cand.title,
  };
  console.log(`✓ ${slug} — ${cand.licence} — ${cand.author.slice(0, 45)}`);
}

await writeFile(META_PATH, JSON.stringify(meta, null, 2) + '\n');
console.log(`\nWrote ${Object.keys(meta).length} entries to src/data/plant-photos.json`);
