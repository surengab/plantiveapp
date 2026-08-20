// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://plantiveapp.com',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404'),
      changefreq: 'weekly',
      lastmod: new Date(),
      serialize(item) {
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
