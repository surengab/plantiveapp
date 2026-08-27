import { APP, SITE } from '../consts';

const abs = (path: string) => new URL(path, SITE.url).href;

export const orgRef = { '@id': `${SITE.url}/#organization` };

/** BreadcrumbList matching the visible <Breadcrumbs> trail. */
export function breadcrumbs(trail: { label: string; href?: string }[]) {
  const items = [{ label: 'Home', href: '/' }, ...trail];
  return {
    '@type': 'BreadcrumbList',
    '@id': `${abs(items.at(-1)?.href ?? '/')}#breadcrumbs`,
    itemListElement: items.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: abs(c.href) } : {}),
    })),
  };
}

/**
 * FAQPage. Only emit when the questions are genuinely visible on the page.
 * Google demotes pages whose FAQ markup has no on-page counterpart.
 */
export function faqPage(faqs: { question: string; answer: string }[], url: string) {
  if (!faqs.length) return null;
  return {
    '@type': 'FAQPage',
    '@id': `${abs(url)}#faq`,
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

export function article({
  url,
  headline,
  description,
  publishDate,
  updatedDate,
  section,
  keywords,
  image,
}: {
  url: string;
  headline: string;
  description: string;
  publishDate: Date;
  updatedDate?: Date;
  section?: string;
  keywords?: string[];
  /** Root-relative path to the article's lead image, if it has one. */
  image?: string;
}) {
  return {
    '@type': 'Article',
    '@id': `${abs(url)}#article`,
    isPartOf: { '@id': `${abs(url)}#webpage` },
    mainEntityOfPage: { '@id': `${abs(url)}#webpage` },
    headline,
    description,
    datePublished: publishDate.toISOString(),
    dateModified: (updatedDate ?? publishDate).toISOString(),
    author: orgRef,
    publisher: orgRef,
    inLanguage: SITE.lang,
    ...(section ? { articleSection: section } : {}),
    ...(keywords?.length ? { keywords: keywords.join(', ') } : {}),
    ...(image ? { image: { '@type': 'ImageObject', url: abs(image), width: 900, height: 600 } } : {}),
  };
}

/**
 * The app itself. Deliberately omits aggregateRating: the App Store listing has
 * no ratings yet, and inventing one is both false and a manual-action risk.
 */
export function mobileApp() {
  return {
    '@type': 'MobileApplication',
    '@id': `${SITE.url}/#app`,
    name: APP.name,
    alternateName: APP.shortName,
    description: SITE.description,
    url: APP.appStoreUrl,
    installUrl: APP.appStoreUrl,
    applicationCategory: APP.category,
    applicationSubCategory: 'Plant identification',
    operatingSystem: `iOS ${APP.minimumOsVersion}+`,
    softwareVersion: APP.version,
    fileSize: `${APP.fileSizeMb}MB`,
    contentRating: APP.contentRating,
    inLanguage: SITE.lang,
    screenshot: abs('/og-default.png'),
    publisher: orgRef,
    author: { '@type': 'Organization', name: APP.developer, url: APP.developerUrl },
    offers: {
      '@type': 'Offer',
      price: APP.price,
      priceCurrency: APP.currency,
      category: 'Free with in-app purchases',
      url: APP.appStoreUrl,
    },
  };
}

/**
 * HowTo for a plant-care routine. Steps come from the structured care block so
 * they always match what is rendered.
 */
export function careHowTo({
  url,
  name,
  description,
  steps,
}: {
  url: string;
  name: string;
  description: string;
  steps: { name: string; text: string }[];
}) {
  return {
    '@type': 'HowTo',
    '@id': `${abs(url)}#howto`,
    name,
    description,
    totalTime: 'PT10M',
    step: steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
      url: `${abs(url)}#care`,
    })),
  };
}

/** ItemList for hub pages. Helps Google understand the collection structure. */
export function itemList(url: string, name: string, items: { name: string; href: string }[]) {
  return {
    '@type': 'ItemList',
    '@id': `${abs(url)}#list`,
    name,
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      url: abs(it.href),
    })),
  };
}
