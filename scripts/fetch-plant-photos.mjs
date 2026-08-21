/**
 * Fetches a species photo for each plant guide from Wikimedia Commons.
 *
 *   node scripts/fetch-plant-photos.mjs            # fill in anything missing
 *   node scripts/fetch-plant-photos.mjs --force    # refetch everything
 *
 * Accuracy matters more than looks here: a wrong photo on a plant
 * identification site is worse than no photo. Commons files are species-labelled
 * and many originate from iNaturalist, where IDs are community-verified.
 *
 * Licence handling: CC BY / public-domain files are preferred over CC BY-SA,
 * because we resize the originals and share-alike would otherwise attach to the
 * derivative. Whatever is chosen, the credit line is stored alongside the image
 * and rendered on the page — attribution is a condition of every CC licence.
 *
 * Outputs:
 *   public/photos/<slug>-{640,1200}.webp
 *   src/data/plant-photos.json   (credit metadata consumed by the templates)
 */
import sharp from 'sharp';
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PHOTO_DIR = join(root, 'public', 'photos');
const META_PATH = join(root, 'src', 'data', 'plant-photos.json');
const UA = 'plantiveapp.com photo fetcher (contact@deductify.org)';
const FORCE = process.argv.includes('--force');

/**
 * Wikipedia article to pull the lead image from. Several guides cover a genus
 * ("Goeppertia spp."), where the genus article often leads with a herbarium
 * scan — so these point at the representative species people actually own.
 */
const OVERRIDES = {
  'aloe-vera': 'Aloe vera',
  calathea: 'Goeppertia makoyana',
  echeveria: 'Echeveria elegans',
  'fiddle-leaf-fig': 'Ficus lyrata',
  'heartleaf-philodendron': 'Philodendron hederaceum',
  'monstera-deliciosa': 'Monstera deliciosa',
  'peace-lily': 'Spathiphyllum wallisii',
  'phalaenopsis-orchid': 'Phalaenopsis amabilis',
  pothos: 'Epipremnum aureum',
  'rubber-plant': 'Ficus elastica',
  'snake-plant': 'Dracaena trifasciata',
  'spider-plant': 'Chlorophytum comosum',
  'zz-plant': 'Zamioculcas',
};

const stripHtml = (s = '') =>
  s
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

/** Lower is better. Share-alike last, since we publish resized derivatives. */
function licenceRank(short = '') {
  const l = short.toLowerCase();
  if (l.includes('cc0') || l.includes('public domain')) return 0;
  if (l.startsWith('cc by') && !l.includes('sa')) return 1;
  if (l.includes('cc by-sa')) return 2;
  return 9; // unknown / non-free — rejected below
}

async function api(params) {
  const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams(params);
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Commons API ${res.status}`);
  return res.json();
}

/**
 * Wikipedia's lead image for a species article. Editors curate these to be
 * representative of the plant, which raw Commons search emphatically does not —
 * search ranks on text match, so it happily returns herbarium sheets, annotated
 * diagrams and 19th-century botanical paintings.
 */
async function findViaWikipedia(botanicalName) {
  const url =
    'https://en.wikipedia.org/w/api.php?' +
    new URLSearchParams({
      action: 'query',
      titles: botanicalName,
      prop: 'pageimages',
      piprop: 'original',
      redirects: '1',
      format: 'json',
    });
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const data = await res.json();
  const page = Object.values(data?.query?.pages ?? {})[0];
  const src = page?.original?.source;
  if (!src) return null;

  const fileTitle = decodeURIComponent(src.split('/').pop()).replace(/^\d+px-/, '');

  // Pull licence + author for that exact file from Commons.
  let info;
  try {
    info = await api({
      action: 'query',
      titles: `File:${fileTitle}`,
      prop: 'imageinfo',
      iiprop: 'url|extmetadata|size|mime',
      iiurlwidth: '1600',
      format: 'json',
    });
  } catch {
    return null;
  }
  const p = Object.values(info?.query?.pages ?? {})[0];
  const ii = p?.imageinfo?.[0];
  if (!ii) return null;
  const m = ii.extmetadata ?? {};
  const licence = stripHtml(m.LicenseShortName?.value);
  if (licenceRank(licence) === 9) return null;
  if (!/^image\/(jpeg|png)$/.test(ii.mime ?? '')) return null;

  return {
    title: fileTitle,
    licence,
    width: ii.width,
    author: stripHtml(m.Artist?.value) || 'Unknown',
    licenceUrl: m.LicenseUrl?.value ?? '',
    descriptionUrl: ii.descriptionurl,
    thumb: ii.thumburl ?? ii.url,
  };
}

async function findPhoto(botanicalName, commonName) {
  const viaWiki = await findViaWikipedia(botanicalName);
  if (viaWiki) return viaWiki;

  const searches = [
    `filetype:bitmap "${botanicalName}"`,
    `filetype:bitmap ${botanicalName}`,
    `filetype:bitmap "${commonName}" plant`,
  ];

  const candidates = [];
  for (const gsrsearch of searches) {
    let data;
    try {
      data = await api({
        action: 'query',
        generator: 'search',
        gsrsearch,
        gsrlimit: '12',
        gsrnamespace: '6',
        prop: 'imageinfo',
        iiprop: 'url|extmetadata|size|mime',
        iiurlwidth: '1600',
        format: 'json',
      });
    } catch {
      continue;
    }
    const pages = data?.query?.pages ?? {};
    for (const p of Object.values(pages)) {
      const ii = p.imageinfo?.[0];
      if (!ii) continue;
      const m = ii.extmetadata ?? {};
      const licence = stripHtml(m.LicenseShortName?.value);
      const rank = licenceRank(licence);
      if (rank === 9) continue; // not a licence we can safely publish
      if ((ii.width ?? 0) < 900) continue; // too small to crop a hero from
      if (!/^image\/(jpeg|png)$/.test(ii.mime ?? '')) continue;

      const title = p.title.replace(/^File:/, '');
      // Skip herbarium sheets, diagrams, distribution maps and close-up
      // pathology shots — none of them help someone identify a houseplant.
      if (/herbari|map|distribution|diagram|illustration|drawing|seed|botanical plate/i.test(title))
        continue;

      candidates.push({
        title,
        rank,
        licence,
        width: ii.width,
        author: stripHtml(m.Artist?.value) || 'Unknown',
        licenceUrl: m.LicenseUrl?.value ?? '',
        descriptionUrl: ii.descriptionurl,
        thumb: ii.thumburl ?? ii.url,
      });
    }
    if (candidates.length >= 6) break;
  }

  candidates.sort((a, b) => a.rank - b.rank || b.width - a.width);
  return candidates[0] ?? null;
}

async function download(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`download ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// ------------------------------------------------------------------ main

await mkdir(PHOTO_DIR, { recursive: true });
await mkdir(dirname(META_PATH), { recursive: true });

const existing = existsSync(META_PATH) ? JSON.parse(await readFile(META_PATH, 'utf8')) : {};
const meta = FORCE ? {} : existing;

const files = (await readdir(join(root, 'src', 'content', 'plants'))).filter((f) =>
  f.endsWith('.md')
);

for (const file of files) {
  const slug = file.replace(/\.md$/, '');
  if (meta[slug] && !FORCE) {
    console.log(`· ${slug} — already have it`);
    continue;
  }

  const raw = await readFile(join(root, 'src', 'content', 'plants', file), 'utf8');
  const botanicalName = raw.match(/^botanicalName:\s*'?"?(.+?)'?"?\s*$/m)?.[1] ?? '';
  const commonName = raw.match(/^commonName:\s*'?"?(.+?)'?"?\s*$/m)?.[1] ?? '';
  const query = OVERRIDES[slug] ?? botanicalName.replace(/\s+spp\.?$/, '');

  process.stdout.write(`→ ${slug} (${query}) `);
  const hit = await findPhoto(query, commonName);
  if (!hit) {
    console.log('— NO SUITABLE IMAGE FOUND');
    continue;
  }

  const buf = await download(hit.thumb);
  const base = sharp(buf).rotate();
  await base
    .clone()
    .resize(1200, 800, { fit: 'cover', position: 'attention' })
    .webp({ quality: 82 })
    .toFile(join(PHOTO_DIR, `${slug}-1200.webp`));
  await base
    .clone()
    .resize(640, 360, { fit: 'cover', position: 'attention' })
    .webp({ quality: 80 })
    .toFile(join(PHOTO_DIR, `${slug}-640.webp`));

  meta[slug] = {
    title: hit.title,
    author: hit.author,
    licence: hit.licence,
    licenceUrl: hit.licenceUrl,
    source: hit.descriptionUrl,
  };
  console.log(`✓ ${hit.licence} — ${hit.author.slice(0, 40)}`);
}

await writeFile(META_PATH, JSON.stringify(meta, null, 2) + '\n');
console.log(`\nWrote ${Object.keys(meta).length} entries to src/data/plant-photos.json`);
