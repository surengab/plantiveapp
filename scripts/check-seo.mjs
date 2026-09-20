import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

// Validate the generated site, including destinations shared by unchanged pages.
const root = resolve('dist');
const origin = 'https://plantiveapp.com';
const appStoreBase = 'https://apps.apple.com/us/app/plantive-identify-care/id6762530988';
const providerToken = process.env.PUBLIC_APPLE_PROVIDER_TOKEN?.trim();
const gaEnabled = process.env.PUBLIC_GA_ENABLED === 'true';
const gaMeasurementId = process.env.PUBLIC_GA_MEASUREMENT_ID?.trim();
const campaigns = {
  home: 'website-home',
  'plant-care': 'website-plant-care',
  problems: 'website-problems',
  blog: 'website-blog',
  other: 'website-other',
};
const contentGroup = (path) => path === '/' ? 'home' : path.startsWith('/plant-care/') ? 'plant-care' : path.startsWith('/problems/') ? 'problems' : path.startsWith('/blog/') ? 'blog' : 'other';
const appStoreUrl = (group) => {
  const url = new URL(appStoreBase);
  if (providerToken) {
    url.searchParams.set('pt', providerToken);
    url.searchParams.set('ct', campaigns[group]);
    url.searchParams.set('mt', '8');
  }
  return url.href;
};
const read = (path) => readFileSync(path, 'utf8');
const decodeAttribute = (value) => value.replaceAll('&amp;', '&').replaceAll('&#38;', '&');
const attributes = (tag) => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map((m) => [m[1], m[2] ?? m[3]]));
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'g'))].map((m) => attributes(m[0]));
const fileFor = (url) => {
  const path = resolve(root, `.${decodeURIComponent(url.pathname)}`);
  assert(path.startsWith(root), `Path outside build: ${url}`);
  return existsSync(path) && statSync(path).isDirectory() ? resolve(path, 'index.html') : path;
};
const urls = [...read(`${root}/sitemap-0.xml`).matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
assert.equal(urls.length, 40, 'Keep every existing indexable URL and the three comparison pages');
assert.equal(new Set(urls).size, urls.length, 'Duplicate sitemap URLs');
const titles = new Set();
const descriptions = new Set();
const pages = new Map();
let checkedLinks = 0;
let checkedStoreLinks = 0;
for (const url of urls) {
  assert(url.startsWith(`${origin}/`), `Wrong sitemap host: ${url}`);
  const html = read(fileFor(new URL(url)));
  pages.set(new URL(url).pathname, html);
  const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
  const metas = tags(html, 'meta');
  const pagePath = new URL(url).pathname;
  const group = contentGroup(pagePath);
  const description = metas.find((m) => m.name === 'description')?.content;
  assert(title && !titles.has(title), `Missing or duplicate title: ${url}`);
  assert(description && !descriptions.has(description), `Missing or duplicate description: ${url}`);
  titles.add(title); descriptions.add(description);
  assert.equal(tags(html, 'h1').length, 1, `H1 count: ${url}`);
  assert.equal(tags(html, 'link').find((l) => l.rel === 'canonical')?.href, url, `Canonical: ${url}`);
  assert.equal(metas.find((m) => m.property === 'og:url')?.content, url, `Open Graph URL: ${url}`);
  assert(!html.includes('https://www.plantiveapp.com'), `www hostname leaked into page: ${url}`);
  assert(!metas.some((m) => m.name === 'robots' && /noindex/.test(m.content)), `Noindex: ${url}`);
  const banner = metas.find((m) => m.name === 'apple-itunes-app')?.content;
  const expectedBanner = providerToken
    ? `app-id=6762530988, affiliate-data=pt=${providerToken}&ct=${campaigns[group]}&mt=8`
    : 'app-id=6762530988';
  assert.equal(banner && decodeAttribute(banner), expectedBanner, `Smart App Banner attribution: ${url}`);

  const storeLinks = tags(html, 'a').filter((a) => a.href?.startsWith(appStoreBase));
  assert(storeLinks.length >= 3, `Expected shared App Store links: ${url}`);
  for (const link of storeLinks) {
    assert.equal(decodeAttribute(link.href), appStoreUrl(group), `App Store campaign URL: ${url}`);
    assert(link['data-source'], `App Store link missing data-source: ${url}`);
    checkedStoreLinks++;
  }

  const googleTagScripts = tags(html, 'script').filter((script) => script.src?.startsWith('https://www.googletagmanager.com/gtag/js'));
  assert.equal(googleTagScripts.length, gaEnabled ? 1 : 0, `GA4 loader count: ${url}`);
  assert.equal((html.match(/app_store_click/g) ?? []).length, gaEnabled ? 1 : 0, `GA4 click handler count: ${url}`);
  if (gaEnabled) assert(googleTagScripts[0].src.includes(`id=${gaMeasurementId}`), `GA4 measurement ID: ${url}`);
  assert.equal(tags(html, 'script').filter((script) => script.src === 'https://analytics.ahrefs.com/analytics.js').length, 1, `Ahrefs loader count: ${url}`);
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

assert(existsSync(`${root}/404.html`), 'Missing static 404 page');
assert(read(`${root}/robots.txt`).includes(`Sitemap: ${origin}/sitemap-index.xml`), 'robots.txt sitemap origin');

const comparisonPages = ['/blog/plant-identification-apps-compared/', '/blog/plantive-vs-picturethis/', '/blog/plantive-vs-planta/'];
for (const path of comparisonPages) {
  const html = pages.get(path);
  assert(html.includes('data-source="comparison-top"'), `Missing top comparison CTA: ${path}`);
  assert(html.includes('data-source="comparison-bottom"'), `Missing bottom comparison CTA: ${path}`);
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
  assert(pages.get('/').includes(`href="${path}"`), `Priority URL missing from homepage: ${path}`);
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/s)[1])['@graph'];
  const article = graph.find((entry) => entry['@type'] === 'Article');
  assert(new Date(article.dateModified) > new Date(article.datePublished), `Missing revision date: ${path}`);
  assert.equal(article.image.url, imageURL, `Article image disagrees with social image: ${path}`);
}
console.log(`SEO checks passed: ${urls.length} indexable pages, ${checkedLinks} local links/assets, ${checkedStoreLinks} attributed App Store links, analytics ${gaEnabled ? 'enabled' : 'disabled'}, and three priority article images and metadata.`);
