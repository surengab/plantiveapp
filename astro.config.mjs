// @ts-check
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/**
 * Real per-URL `lastmod` values, read straight from the content frontmatter.
 *
 * Stamping every entry with the build time (the obvious `lastmod: new Date()`)
 * tells Google all 37 pages changed on every deploy, which is false, and an
 * unreliable lastmod is one Google discounts wholesale. A page's honest date is
 * its updatedDate, or its publishDate if it has never been revised.
 */
const CONTENT = { plants: 'plant-care', problems: 'problems', blog: 'blog' };

const contentDates = new Map();
for (const [dir, route] of Object.entries(CONTENT)) {
  const base = new URL(`./src/content/${dir}/`, import.meta.url);
  for (const file of readdirSync(base).filter((f) => f.endsWith('.md'))) {
    const fm = readFileSync(new URL(file, base), 'utf8').split('---')[1] ?? '';
    /** @param {string} key */
    const pick = (key) => fm.match(new RegExp(`^${key}:\\s*(\\S+)`, 'm'))?.[1];
    const date = pick('updatedDate') ?? pick('publishDate');
    if (date) contentDates.set(`/${route}/${file.slice(0, -3)}/`, new Date(date));
  }
}

/** Newest child date, used for the hub pages that list them. */
const newestUnder = (/** @type {string} */ prefix) =>
  [...contentDates.entries()]
    .filter(([url]) => url.startsWith(prefix))
    .reduce((max, [, d]) => (d > max ? d : max), new Date(0));

/**
 * Static pages have no frontmatter date, so use the last commit that touched
 * their source. Falling back to the build clock would re-stamp them on every
 * deploy, and a lastmod that moves when the page did not is exactly the kind
 * Google learns to ignore -- across the whole file, not just those URLs.
 */
const buildDate = new Date();

/** @param {string} file */
function lastCommitDate(file) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', file], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return out ? new Date(out) : buildDate;
  } catch {
    return buildDate; // no git available (shallow CI checkout, tarball build)
  }
}

/** Route -> source file, for the pages that are not content collections. */
const STATIC_PAGES = {
  '/': 'src/pages/index.astro',
  '/about/': 'src/pages/about.astro',
  '/faq/': 'src/pages/faq.astro',
  '/privacy/': 'src/pages/privacy.astro',
  '/support/': 'src/pages/support.astro',
  '/terms/': 'src/pages/terms.astro',
};

const staticDates = new Map(
  Object.entries(STATIC_PAGES).map(([route, file]) => [route, lastCommitDate(file)])
);

// https://astro.build/config
export default defineConfig({
  site: 'https://plantiveapp.com',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404'),
      changefreq: 'weekly',
      serialize(item) {
        const path = new URL(item.url).pathname;
        // Content pages carry their own date; hubs inherit their newest child;
        // static pages (privacy, terms, about) fall back to the build date.
        const hub = /^\/(plant-care|problems|blog)\/$/.test(path);
        item.lastmod = (
          contentDates.get(path) ??
          staticDates.get(path) ??
          (hub ? newestUnder(path) : buildDate)
        ).toISOString();

        // Homepage and the two content hubs are the priority crawl targets.
        if (item.url === 'https://plantiveapp.com/') item.priority = 1.0;
        else if (/\/(plant-care|problems|blog)\/$/.test(item.url)) item.priority = 0.9;
        else if (/\/(plant-care|problems)\//.test(item.url)) item.priority = 0.8;
        else item.priority = 0.6;
        return item;
      },
    }),
  ],
  markdown: {
    shikiConfig: { theme: 'github-light', wrap: true },
  },
});
