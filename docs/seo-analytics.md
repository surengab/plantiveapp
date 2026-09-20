# SEO, analytics and App Store attribution

## Production configuration

The site emits no Google Analytics script unless a production build has both:

```dotenv
PUBLIC_GA_ENABLED=true
PUBLIC_GA_MEASUREMENT_ID=G-...
```

The measurement ID is public but must come from the Plantive GA4 web data stream. Do not reuse a different product's ID. Because this Cloudflare Pages project uses Direct Upload, `npm run deploy` builds locally; put these values in the ignored `.env.production` file or export them in the shell that runs the build. Cloudflare dashboard build variables do not affect a local Direct Upload build.

Development and local preview builds remain silent by default because `PUBLIC_GA_ENABLED` is false or absent. `PUBLIC_GA_ENABLED=true` with a missing or malformed measurement ID fails the build instead of silently shipping broken analytics.

### GA4 setup and verification

1. In Google Analytics, create or select the Plantive GA4 property and web data stream, then copy its `G-...` measurement ID into the production build environment.
2. Build and deploy. In browser developer tools, filter Network requests for `googletagmanager.com` and `google-analytics.com`. A normal page load should initialize the tag once and send one `page_view`.
3. Click one App Store CTA. Confirm one `app_store_click` event with `cta_location`, `content_group`, `page_path`, and, on a plant guide, `plant_slug`. The handler does not cancel or delay navigation.
4. Use [Google Tag Assistant](https://tagassistant.google.com/) to enable debug mode, then inspect GA4 **Admin → Data display → DebugView**. DebugView access and live property data cannot be verified from this repository.
5. In **Admin → Data display → Custom definitions**, create event-scoped custom dimensions for `cta_location`, `content_group`, and `plant_slug`. `page_path` already maps to GA4 page dimensions, so do not spend a custom-dimension slot on it.
6. After GA4 has received `app_store_click`, open **Admin → Data display → Events** and mark that event as a key event. If Enhanced Measurement also records the App Store destination as the generic outbound `click` event, treat that as a separate navigation event and do not mark it as a second conversion.

The implementation sends no form values, personal data, or page query string with the custom event. Review applicable consent requirements before enabling GA4; the current site has no consent manager to integrate with.

References: [Google tag API](https://developers.google.com/tag-platform/gtagjs/reference), [GA4 DebugView](https://support.google.com/analytics/answer/7201382), [GA4 custom dimensions](https://support.google.com/analytics/answer/14240153), and [marking key events](https://support.google.com/analytics/answer/13128484).

## App Store campaign attribution

Leave `PUBLIC_APPLE_PROVIDER_TOKEN` blank until App Store Connect supplies the numeric provider token. Plain App Store URLs continue to work when it is absent.

1. In App Store Connect, select Plantive, then **Analytics → Acquisition → Campaigns**.
2. Create the first campaign link and copy the provider token (`pt`). Apple generates this token; do not invent it.
3. Put the token in the production build environment as `PUBLIC_APPLE_PROVIDER_TOKEN` and rebuild.
4. The site will add `pt`, `ct`, and `mt=8` to App Store links and the Safari Smart App Banner. It uses five stable campaign tokens: `website-home`, `website-plant-care`, `website-problems`, `website-blog`, and `website-other`. GA4, not Apple campaign proliferation, reports individual CTA placements.
5. In App Store Connect Analytics, filter Metrics by Campaign. Apple says campaigns may take at least 24 hours to appear, dashboard metrics require a threshold of five in the selected range, first-time-download attribution uses a 24-hour window, and small detailed-report groups may be withheld or combined for privacy.

Reference: [Apple campaign links](https://developer.apple.com/help/app-store-connect-analytics/acquisition/campaign-links).

## Canonical hostname redirect

The repository already uses `https://plantiveapp.com` for Astro's site origin, canonical URLs, Open Graph URLs, the sitemap, and `robots.txt`. Cloudflare Pages `_redirects` cannot implement a hostname-level redirect, so finish this in Cloudflare:

1. Open **Cloudflare Dashboard → Bulk Redirects** and create a redirect list entry from `www.plantiveapp.com` to `https://plantiveapp.com`.
2. Choose status **301** and enable **Preserve query string**, **Subpath matching**, **Preserve path suffix**, and **Include subdomains**.
3. Create and enable a Bulk Redirect Rule using that list.
4. In **DNS**, ensure `www` has a proxied record. Cloudflare's Pages guide uses an `A` record to `192.0.2.1` for the redirect-only hostname.
5. Verify a path with a query string, for example `curl -I 'https://www.plantiveapp.com/plant-care/pothos/?source=test'`. It should return one 301 whose `Location` is `https://plantiveapp.com/plant-care/pothos/?source=test`, followed by a 200 at the apex URL.

Reference: [Cloudflare's www-to-apex Pages guide](https://developers.cloudflare.com/pages/how-to/www-redirect/).

## Content evidence and assets still needed

The Pothos, Monstera, snake plant, root-rot, yellow-leaf, watering, and photo-identification pages now show their horticultural references. The content model supports optional named `author` and `reviewer` objects, but none are populated because no confirmed people or credentials were supplied.

Useful original assets that are not currently available:

- Photo-identification article: a real Plantive input photo, the resulting Plantive suggestion, and one ambiguous or failed result with the verification steps shown.
- Pothos guide: original examples of normal old-leaf yellowing versus yellowing with persistently wet mix.
- Monstera guide: the same plant's juvenile solid leaf and later fenestrated leaf, with conditions documented.
- Snake plant guide: original healthy-root versus soft root/rhizome photos during an actual repot.

The available reference screenshots show the former **Silvan Flora** name and were intentionally not added to this repository. Use current, permission-cleared Plantive screenshots before adding app UI to the articles.

The public App Store listing verifies photo identification, care guidance, the garden interface, iPhone/iOS 17 support, free download with in-app purchases, version 1.2, 15.3 MB, and a 13+ rating. It does not publicly substantiate “no account required,” offline saved guides, a numeric identification-confidence percentage, or guaranteed diagnosis/care outcomes; those claims were removed rather than inferred.
