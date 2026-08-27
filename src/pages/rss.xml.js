import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '../consts';

export async function GET(context) {
  const [blog, plants, problems] = await Promise.all([
    getCollection('blog', (p) => !p.data.draft),
    getCollection('plants', (p) => !p.data.draft),
    getCollection('problems', (p) => !p.data.draft),
  ]);

  const items = [
    ...blog.map((p) => ({
      title: p.data.title,
      description: p.data.excerpt,
      pubDate: p.data.publishDate,
      link: `/blog/${p.id}/`,
      categories: [p.data.category],
    })),
    ...plants.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.publishDate,
      link: `/plant-care/${p.id}/`,
      categories: ['Plant care'],
    })),
    ...problems.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.publishDate,
      link: `/problems/${p.id}/`,
      categories: ['Plant problems'],
    })),
  ].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: `${SITE.name}: Plant Care Guides`,
    description: SITE.description,
    site: context.site ?? SITE.url,
    items,
    customData: `<language>en-us</language>`,
  });
}
