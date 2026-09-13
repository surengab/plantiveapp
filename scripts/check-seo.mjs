import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

// Validate the generated site, including destinations shared by unchanged pages.
const root = resolve('dist');
const origin = 'https://plantiveapp.com';
const read = (path) => readFileSync(path, 'utf8');
const attributes = (tag) => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map((m) => [m[1], m[2] ?? m[3]]));
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'g'))].map((m) => attributes(m[0]));
const fileFor = (url) => {
  const path = resolve(root, `.${decodeURIComponent(url.pathname)}`);
  assert(path.startsWith(root), `Path outside build: ${url}`);
  return existsSync(path) && statSync(path).isDirectory() ? resolve(path, 'index.html') : path;
};
const urls = [...read(`${root}/sitemap-0.xml`).matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
assert.equal(urls.length, 37, 'Keep every existing indexable URL');
assert.equal(new Set(urls).size, urls.length, 'Duplicate sitemap URLs');
const titles = new Set();
const descriptions = new Set();
const pages = new Map();
let checkedLinks = 0;
for (const url of urls) {
  assert(url.startsWith(`${origin}/`), `Wrong sitemap host: ${url}`);
  const html = read(fileFor(new URL(url)));
  pages.set(new URL(url).pathname, html);
  const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
  const metas = tags(html, 'meta');
  const description = metas.find((m) => m.name === 'description')?.content;
  assert(title && !titles.has(title), `Missing or duplicate title: ${url}`);
  assert(description && !descriptions.has(description), `Missing or duplicate description: ${url}`);
  titles.add(title); descriptions.add(description);
  assert.equal(tags(html, 'h1').length, 1, `H1 count: ${url}`);
  assert.equal(tags(html, 'link').find((l) => l.rel === 'canonical')?.href, url, `Canonical: ${url}`);
  assert(!metas.some((m) => m.name === 'robots' && /noindex/.test(m.content)), `Noindex: ${url}`);
  for (const match of html.matchAll(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)) JSON.parse(match[1]);
  for (const item of [...tags(html, 'a'), ...tags(html, 'img'), ...tags(html, 'link'), ...tags(html, 'script')]) {
    const target = item.href ?? item.src;
    if (!target) continue;
    const destination = new URL(target.replaceAll('&amp;', '&'), url);
    if (destination.origin !== origin) continue;
    const file = fileFor(destination);
    assert(existsSync(file), `Broken local link or asset: ${url} -> ${target}`);
    if (destination.hash && file.endsWith('.html')) {
      assert(tags(read(file), '[a-z][a-z0-9]*').some((t) => t.id === decodeURIComponent(destination.hash.slice(1))), `Broken fragment: ${url} -> ${target}`);
    }
    checkedLinks++;
  }
}

const priority = ['/problems/monstera-leaves-not-splitting/', '/problems/fungus-gnats/', '/blog/how-to-identify-a-plant-from-a-photo/'];
for (const path of priority) {
  const html = pages.get(path);
  const metas = tags(html, 'meta');
  const imageURL = metas.find((m) => m.property === 'og:image')?.content;
  assert(imageURL && !imageURL.endsWith('og-default.png'), `Missing article image: ${path}`);
  const image = await sharp(fileFor(new URL(imageURL))).metadata();
  assert.equal(image.width, Number(metas.find((m) => m.property === 'og:image:width')?.content));
  assert.equal(image.height, Number(metas.find((m) => m.property === 'og:image:height')?.content));
  assert(html.includes('2026-09-13'), `Missing revision date: ${path}`);
  assert(pages.get('/').includes(`href="${path}"`), `Priority URL missing from homepage: ${path}`);
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/s)[1])['@graph'];
  const article = graph.find((entry) => entry['@type'] === 'Article');
  assert.equal(article.image.url, imageURL, `Article image disagrees with social image: ${path}`);
}
console.log(`SEO checks passed: ${urls.length} indexable pages, ${checkedLinks} local links/assets, three priority article images and metadata.`);
