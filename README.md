# plantiveapp.com

Marketing site and plant-care content hub for
[Plantive: Identify & Care](https://apps.apple.com/us/app/plantive-identify-care/id6762530988),
an iPhone plant identification app by DEDUCTIFY, LLC.

Built with [Astro](https://astro.build). Static output, no client framework:
the only JavaScript shipped is a theme toggle and a mobile menu.

## Local development

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # astro check && astro build -> dist/
npm run preview  # serve dist/ locally
```

## Deployment

Hosted on **Cloudflare Pages**, project `plantiveapp`
([plantiveapp.pages.dev](https://plantiveapp.pages.dev)).

```bash
npm run deploy   # builds, then uploads dist/ to the production branch
```

This is a **Direct Upload** project, so pushing to GitHub does *not* redeploy.
Run the command above. Uploads are incremental; only changed files transfer.

First-time setup on a new machine needs `npx wrangler login` once.

> Cloudflare does not allow connecting a Git repo to an existing Direct Upload
> project. To get deploy-on-push you have to create a *new* Git-connected
> project (build command `npm run build`, output `dist`) and move the custom
> domain across. Everything but the `plantiveapp.pages.dev` hostname carries
> over.

`public/_headers` and `public/_redirects` are Cloudflare Pages config: immutable
caching for fingerprinted `/_astro/` assets, revalidated HTML so content edits go
live on the next request, baseline security headers, and a www → apex redirect so
only one hostname gets indexed.

`public/.nojekyll` is vestigial GitHub Pages insurance: harmless, and it costs
nothing to keep in case Pages is ever used again.

## Adding content

Content lives in `src/content/` as markdown with typed frontmatter, validated by
the Zod schemas in `src/content.config.ts`. Adding a page is one file, and routes,
navigation, structured data and the sitemap all follow from the collection.

- `src/content/plants/`: per-species care guides. The structured `care` block
  drives the care table and the `HowTo` structured data.
- `src/content/problems/`: symptom-first diagnostics. `causes` are ordered by
  likelihood and render as the diagnosis checklist.
- `src/content/blog/`: technique guides and explainers.

Site-wide facts (app metadata, App Store URL, support email) live in
`src/consts.ts` and are referenced everywhere else, so change them once.

## SEO notes

Each page emits a single JSON-LD `@graph` (`src/lib/schema.ts`) rather than
several disconnected blocks, so crawlers resolve the Organization / WebSite /
WebPage relationships in one pass.

Two deliberate omissions:

- **No `aggregateRating`.** The App Store listing has no ratings yet. Fabricated
  review markup is a manual-action risk, so add it once the ratings are real.
- **`FAQPage` markup only where the questions are visible on the page.** Google
  demotes FAQ markup with no on-page counterpart.

## Brand assets

`scripts/gen-assets.mjs` regenerates every icon, favicon and the Open Graph card
from the single source `public/assets/app-icon.png`:

```bash
node scripts/gen-assets.mjs
```

`brand/` holds the raw App Store screenshots for reference. They are **not**
published, because they carry "Silvan Flora" branding rather than Plantive, so the site
uses CSS device mockups instead.
