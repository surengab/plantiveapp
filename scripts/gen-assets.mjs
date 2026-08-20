/**
 * Generates every static brand asset from the single source app icon.
 *
 *   node scripts/gen-assets.mjs
 *
 * Outputs are committed so the site builds without a network fetch. Re-run this
 * whenever the App Store icon changes.
 */
import sharp from 'sharp';
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');
const assets = join(pub, 'assets');
const SRC = join(assets, 'app-icon.png');

await mkdir(assets, { recursive: true });

/** The icon art is a leaf on a near-white plate; trim it to the leaf itself. */
const leafOnly = () =>
  sharp(SRC)
    .extract({ left: 120, top: 120, width: 784, height: 784 })
    .flatten({ background: '#ffffff' });

// ---------------------------------------------------------------- favicons
await sharp(SRC).resize(512, 512).png({ quality: 90 }).toFile(join(assets, 'icon-512.png'));
await sharp(SRC).resize(192, 192).png({ quality: 90 }).toFile(join(assets, 'icon-192.png'));
await sharp(SRC).resize(180, 180).png({ quality: 92 }).toFile(join(pub, 'apple-touch-icon.png'));
await sharp(SRC).resize(96, 96).png({ quality: 92 }).toFile(join(assets, 'logo-96.png'));

// A real multi-size .ico so legacy browsers and Google's favicon crawler agree.
const ico = async (sizes) => {
  const images = await Promise.all(
    sizes.map(async (size) => ({
      size,
      data: await sharp(SRC).resize(size, size).png({ compressionLevel: 9 }).toBuffer(),
    }))
  );
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const dir = [];
  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.size >= 256 ? 0 : img.size, 0);
    entry.writeUInt8(img.size >= 256 ? 0 : img.size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(img.data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += img.data.length;
    dir.push(entry);
  }
  return Buffer.concat([header, ...dir, ...images.map((i) => i.data)]);
};
await writeFile(join(pub, 'favicon.ico'), await ico([16, 32, 48]));

// ------------------------------------------------------------- OG image
// 1200x630 social card: brand green ground, the leaf mark, wordmark + promise.
const OG_W = 1200;
const OG_H = 630;

const escapeXml = (s) =>
  s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);

function ogSvg({ kicker, title, sub }) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${OG_W}" height="${OG_H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0d3a26"/>
      <stop offset="55%" stop-color="#14532d"/>
      <stop offset="100%" stop-color="#1c6b3d"/>
    </linearGradient>
  </defs>
  <rect width="${OG_W}" height="${OG_H}" fill="url(#bg)"/>
  <rect x="0" y="${OG_H - 14}" width="${OG_W}" height="14" fill="#9ed3b3"/>
  <text x="86" y="196" font-family="Outfit, Helvetica, Arial, sans-serif" font-size="26"
        font-weight="600" letter-spacing="4" fill="#9ed3b3">${escapeXml(kicker.toUpperCase())}</text>
  <text x="86" y="300" font-family="Outfit, Helvetica, Arial, sans-serif" font-size="76"
        font-weight="700" fill="#ffffff">${escapeXml(title)}</text>
  <text x="86" y="382" font-family="Helvetica, Arial, sans-serif" font-size="32"
        fill="#c7e8d3">${escapeXml(sub)}</text>
  <text x="86" y="540" font-family="Outfit, Helvetica, Arial, sans-serif" font-size="30"
        font-weight="600" fill="#ffffff">plantiveapp.com</text>
</svg>`);
}

const leafBadge = await leafOnly().resize(300, 300).png().toBuffer();
const rounded = await sharp({
  create: { width: 300, height: 300, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
})
  .composite([
    { input: leafBadge, blend: 'over' },
    {
      input: Buffer.from(
        `<svg width="300" height="300"><rect width="300" height="300" rx="66" ry="66" fill="#fff"/></svg>`
      ),
      blend: 'dest-in',
    },
  ])
  .png()
  .toBuffer();

await sharp(
  ogSvg({
    kicker: 'Plant identifier & care app',
    title: 'Know every plant.',
    sub: 'Identify from a photo. Water it right. Keep it alive.',
  })
)
  .composite([{ input: rounded, left: OG_W - 300 - 86, top: 165 }])
  .png({ quality: 92 })
  .toFile(join(pub, 'og-default.png'));

// Re-compress the source icon so we are not shipping a 1MB logo.
await sharp(SRC).resize(1024, 1024).png({ quality: 88, compressionLevel: 9 }).toBuffer().then((b) =>
  writeFile(SRC, b)
);

console.log('Brand assets generated.');
