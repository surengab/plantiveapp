# plantiveapp.com

Marketing site and plant-care content hub for
[Plantive: Identify & Care](https://apps.apple.com/us/app/plantive-identify-care/id6762530988),
an iPhone plant identification app by DEDUCTIFY, LLC.

Built with [Astro](https://astro.build). Static output, no client framework —
the only JavaScript shipped is a theme toggle and a mobile menu.

## Local development

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # astro check && astro build -> dist/
npm run preview  # serve dist/ locally
```

## Deployment

Hosted on **Cloudflare Pages**, deployed automatically on push to `main`.

| Setting | Value |
| --- | --- |
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | from `.node-version` (22) |

`public/_headers` and `public/_redirects` are Cloudflare Pages config: long-lived
caching for fingerprinted `/_astro/` assets, revalidated HTML, and a www → apex
redirect so only one hostname gets indexed.

## Adding content

Content lives in `src/content/` as markdown with typed frontmatter, validated by
the Zod schemas in `src/content.config.ts`. Adding a page is one file — routes,
navigation, structured data and the sitemap all follow from the collection.

- `src/content/plants/` — per-species care guides. The structured `care` block
  drives the care table and the `HowTo` structured data.
- `src/content/problems/` — symptom-first diagnostics. `causes` are ordered by
  likelihood and render as the diagnosis checklist.
- `src/content/blog/` — technique guides and explainers.

Site-wide facts (app metadata, App Store URL, support email) live in
`src/consts.ts` and are referenced everywhere else — change them once.

## SEO notes

Each page emits a single JSON-LD `@graph` (`src/lib/schema.ts`) rather than
several disconnected blocks, so crawlers resolve the Organization / WebSite /
WebPage relationships in one pass.

Two deliberate omissions:

- **No `aggregateRating`.** The App Store listing has no ratings yet. Fabricated
  review markup is a manual-action risk — add it once the ratings are real.
- **`FAQPage` markup only where the questions are visible on the page.** Google
  demotes FAQ markup with no on-page counterpart.

## Brand assets

`scripts/gen-assets.mjs` regenerates every icon, favicon and the Open Graph card
from the single source `public/assets/app-icon.png`:

```bash
node scripts/gen-assets.mjs
```

`brand/` holds the raw App Store screenshots for reference. They are **not**
published — they carry "Silvan Flora" branding rather than Plantive, so the site
uses CSS device mockups instead.
