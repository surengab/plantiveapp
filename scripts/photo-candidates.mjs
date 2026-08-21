/**
 * Gathers candidate photos per species into /tmp/candidates.json and renders a
 * contact sheet at /tmp/candidates.png so they can be judged by eye.
 *
 * Restricted to Commons category members and biased toward iNaturalist-sourced
 * files, which are real field photographs with community-verified IDs — the
 * single most effective filter against botanical engravings and herbarium sheets.
 */
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

const UA = 'plantiveapp.com photo curation (contact@deductify.org)';
const PER = 4;

const SPECIES = {
  'aloe-vera': ['Aloe vera'],
  calathea: ['Goeppertia makoyana', 'Goeppertia orbifolia'],
  echeveria: ['Echeveria elegans'],
  'fiddle-leaf-fig': ['Ficus lyrata'],
  'heartleaf-philodendron': ['Philodendron hederaceum'],
  'monstera-deliciosa': ['Monstera deliciosa'],
  'peace-lily': ['Spathiphyllum wallisii', 'Spathiphyllum'],
  'phalaenopsis-orchid': ['Phalaenopsis amabilis', 'Phalaenopsis'],
  pothos: ['Epipremnum aureum'],
  'rubber-plant': ['Ficus elastica'],
  'snake-plant': ['Dracaena trifasciata'],
  'spider-plant': ['Chlorophytum comosum'],
  'zz-plant': ['Zamioculcas zamiifolia'],
};

const strip = (s = '') =>
  s.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

const rank = (l = '') => {
  const s = l.toLowerCase();
  if (s.includes('cc0') || s.includes('public domain')) return 0;
  if (s.startsWith('cc by') && !s.includes('sa')) return 1;
  if (s.includes('cc by-sa')) return 2;
  return 9;
};

async function api(params) {
  const r = await fetch('https://commons.wikimedia.org/w/api.php?' + new URLSearchParams(params), {
    headers: { 'User-Agent': UA },
  });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

async function categoryFiles(species) {
  const out = [];
  for (const cat of [`Category:${species}`]) {
    let data;
    try {
      data = await api({
        action: 'query',
        generator: 'categorymembers',
        gcmtitle: cat,
        gcmtype: 'file',
        gcmlimit: '60',
        prop: 'imageinfo',
        iiprop: 'url|extmetadata|size|mime',
        iiurlwidth: '800',
        format: 'json',
      });
    } catch {
      continue;
    }
    for (const p of Object.values(data?.query?.pages ?? {})) {
      const ii = p.imageinfo?.[0];
      if (!ii) continue;
      const m = ii.extmetadata ?? {};
      const licence = strip(m.LicenseShortName?.value);
      if (rank(licence) === 9) continue;
      if (!/^image\/jpeg$/.test(ii.mime ?? '')) continue; // jpeg ⇒ photograph, not a scan/diagram
      if ((ii.width ?? 0) < 800) continue;
      const title = p.title.replace(/^File:/, '');
      if (/herbari|illustration|drawing|plate|engrav|map|diagram|sketch|painting|botanicus|seed/i.test(title))
        continue;
      const credit = strip(m.Credit?.value);
      out.push({
        title,
        licence,
        author: strip(m.Artist?.value) || 'Unknown',
        licenceUrl: m.LicenseUrl?.value ?? '',
        source: ii.descriptionurl,
        thumb: ii.thumburl ?? ii.url,
        width: ii.width,
        height: ii.height,
        // iNaturalist observations are real photos with verified IDs.
        inat: /inaturalist/i.test(credit) || /inaturalist/i.test(m.Artist?.value ?? ''),
      });
    }
  }
  // Prefer iNat photos, then landscape-ish framing, then permissive licences.
  out.sort(
    (a, b) =>
      Number(b.inat) - Number(a.inat) ||
      Math.abs(a.width / a.height - 1.4) - Math.abs(b.width / b.height - 1.4) ||
      rank(a.licence) - rank(b.licence)
  );
  return out;
}

const picked = {};
for (const [slug, names] of Object.entries(SPECIES)) {
  let cands = [];
  for (const n of names) {
    cands = cands.concat(await categoryFiles(n));
    if (cands.length >= PER) break;
  }
  picked[slug] = cands.slice(0, PER);
  console.log(`${slug}: ${picked[slug].length} candidates`);
}

await writeFile('/tmp/candidates.json', JSON.stringify(picked, null, 2));

// ---- contact sheet -------------------------------------------------------
const W = 240,
  H = 156,
  COLS = PER;
const slugs = Object.keys(picked);
const tiles = [];
for (let r = 0; r < slugs.length; r++) {
  for (let c = 0; c < PER; c++) {
    const cand = picked[slugs[r]][c];
    const label = `${slugs[r]} #${c}`;
    let img;
    if (cand) {
      // Commons rate-limits bursts; throttle and retry rather than silently
      // rendering a blank tile, which would look like "no candidate found".
      for (let attempt = 0; attempt < 3 && !img; attempt++) {
        try {
          await new Promise((r) => setTimeout(r, 1400 + attempt * 2500));
          const res = await fetch(cand.thumb, { headers: { 'User-Agent': UA } });
          if (!res.ok) throw new Error(String(res.status));
          const buf = Buffer.from(await res.arrayBuffer());
          img = await sharp(buf).rotate().resize(W, H - 18, { fit: 'cover' }).toBuffer();
        } catch (e) {
          if (attempt === 2) console.warn(`  ! ${label}: ${e.message}`);
        }
      }
    }
    if (!img)
      img = await sharp({ create: { width: W, height: H - 18, channels: 3, background: '#222' } })
        .png()
        .toBuffer();
    const cap = Buffer.from(
      `<svg width="${W}" height="18"><rect width="${W}" height="18" fill="#111"/><text x="4" y="13" font-family="Helvetica" font-size="11" fill="#fff">${label}</text></svg>`
    );
    tiles.push({
      input: await sharp({ create: { width: W, height: H, channels: 3, background: '#000' } })
        .composite([
          { input: img, top: 0, left: 0 },
          { input: cap, top: H - 18, left: 0 },
        ])
        .png()
        .toBuffer(),
      top: r * H,
      left: c * W,
    });
  }
}
await sharp({ create: { width: W * COLS, height: H * slugs.length, channels: 3, background: '#000' } })
  .composite(tiles)
  .png()
  .toFile('/tmp/candidates.png');
console.log('\ncontact sheet: /tmp/candidates.png');
