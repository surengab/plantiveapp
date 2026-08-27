import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/** Shared SEO fields every content type needs. */
const seo = {
  title: z.string().max(70),
  /** Meta description. Keep 140-160 chars for full SERP display. */
  description: z.string().min(70).max(200),
  /** Overrides the <h1> when the SEO title needs to differ from the on-page headline. */
  heading: z.string().optional(),
  publishDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  /** Extra terms this page targets; rendered into the related-search block. */
  keywords: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
};

const faqSchema = z
  .array(
    z.object({
      question: z.string(),
      answer: z.string(),
    })
  )
  .default([]);

/**
 * Per-species care guides. The structured `care` block drives the care table,
 * the at-a-glance cards and the HowTo/Article structured data, so a new plant
 * is a single markdown file with no template work.
 */
const plants = defineCollection({
  loader: glob({ base: './src/content/plants', pattern: '**/*.md' }),
  schema: z.object({
    ...seo,
    commonName: z.string(),
    botanicalName: z.string(),
    alsoKnownAs: z.array(z.string()).default([]),
    family: z.string(),
    origin: z.string(),
    /** Drives card art: a lightweight inline SVG silhouette, no photos to ship. */
    silhouette: z.enum([
      'monstera',
      'heart',
      'lance',
      'round',
      'spiky',
      'trailing',
      'frond',
      'rosette',
    ]),
    /** Hue angle (0-360) for the card gradient, giving each guide its own tint. */
    hue: z.number().min(0).max(360).default(140),
    difficulty: z.enum(['easy', 'moderate', 'demanding']),
    petSafe: z.boolean(),
    care: z.object({
      light: z.object({ label: z.string(), detail: z.string() }),
      water: z.object({ label: z.string(), detail: z.string() }),
      humidity: z.object({ label: z.string(), detail: z.string() }),
      temperature: z.object({ label: z.string(), detail: z.string() }),
      soil: z.object({ label: z.string(), detail: z.string() }),
      fertilizer: z.object({ label: z.string(), detail: z.string() }),
      repotting: z.object({ label: z.string(), detail: z.string() }),
      propagation: z.object({ label: z.string(), detail: z.string() }),
    }),
    matureSize: z.string(),
    growthRate: z.enum(['slow', 'moderate', 'fast']),
    toxicity: z.string(),
    /** Symptom -> cause -> fix rows, optionally deep-linking a /problems/ page. */
    troubleshooting: z
      .array(
        z.object({
          symptom: z.string(),
          cause: z.string(),
          fix: z.string(),
          problemSlug: z.string().optional(),
        })
      )
      .default([]),
    faqs: faqSchema,
    related: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
  }),
});

/**
 * Symptom-first diagnostic pages ("why are my leaves turning yellow").
 * These target the highest-intent long-tail queries in the plant-care space.
 */
const problems = defineCollection({
  loader: glob({ base: './src/content/problems', pattern: '**/*.md' }),
  schema: z.object({
    ...seo,
    /** Short symptom label used on cards and in the diagnostic index. */
    symptom: z.string(),
    severity: z.enum(['low', 'medium', 'high']),
    /** Plain-language one-liner shown in the symptom picker. */
    quickAnswer: z.string(),
    /** Ranked candidate causes; renders the diagnosis checklist. */
    causes: z
      .array(
        z.object({
          name: z.string(),
          likelihood: z.enum(['most likely', 'common', 'less common', 'rare']),
          tell: z.string(),
          fix: z.string(),
        })
      )
      .default([]),
    affectedPlants: z.array(z.string()).default([]),
    faqs: faqSchema,
    featured: z.boolean().default(false),
  }),
});

/** General editorial content: technique guides, roundups, explainers. */
const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.md' }),
  schema: z.object({
    ...seo,
    excerpt: z.string(),
    category: z.enum(['Watering', 'Light', 'Getting started', 'Plant picks', 'Identification']),
    readingTime: z.number().optional(),
    faqs: faqSchema,
    featured: z.boolean().default(false),
  }),
});

export const collections = { plants, problems, blog };
