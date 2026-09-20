/**
 * Single source of truth for site-wide metadata, brand facts and outbound links.
 * Everything here is verified against the live App Store listing (id6762530988).
 */

export const SITE = {
  name: 'Plantive',
  domain: 'plantiveapp.com',
  url: 'https://plantiveapp.com',
  /** Used as the <title> suffix and in structured data. */
  tagline: 'Plant Identifier & Plant Care App',
  description:
    'Identify plants, flowers and succulents from a photo, then explore watering and light guidance. Free guides plus the iPhone app.',
  locale: 'en_US',
  lang: 'en',
  themeColor: '#14532d',
  /**
   * Google Search Console ownership token. Public by design: it only proves
   * control of this site. Kept alongside the /googled…html file so verification
   * survives if either method breaks.
   */
  googleSiteVerification: '9SZDJKni2zRuXtNdxtFCvHv5ri9bLrwtOeFG3-LLnHw',
  /**
   * Ahrefs Web Analytics site key. Public by design: it identifies the site,
   * not the account. Doubles as Ahrefs' ownership verification for the domain.
   */
  ahrefsKey: 'l7lBgyq4L7EQcUFudfMMFQ',
} as const;

export const APP = {
  name: 'Plantive: Identify & Care',
  shortName: 'Plantive',
  subtitle: 'Scan, diagnose & grow plants',
  appStoreId: '6762530988',
  appStoreUrl: 'https://apps.apple.com/us/app/plantive-identify-care/id6762530988',
  developer: 'DEDUCTIFY, LLC',
  developerUrl: 'https://deductify.org/',
  category: 'LifestyleApplication',
  price: '0',
  currency: 'USD',
  platform: 'iOS',
  minimumOsVersion: '17.0',
  fileSizeMb: 15.3,
  version: '1.2',
  contentRating: '13+',
  supportEmail: 'contact@deductify.org',
  privacyUrl:
    'https://docs.google.com/document/d/1aArtFTt3BBX7Ft_YmQlOsRMgu3PcTHXK4G0mEpcTcjM',
  termsUrl:
    'https://docs.google.com/document/d/1lY8Z_TE3wIUNrO6oh_VBa-9Tc_n3oxA0yO7c9g8UeDM',
} as const;

export type ContentGroup = 'home' | 'plant-care' | 'problems' | 'blog' | 'other';

const APP_STORE_CAMPAIGNS: Record<ContentGroup, string> = {
  home: 'website-home',
  'plant-care': 'website-plant-care',
  problems: 'website-problems',
  blog: 'website-blog',
  other: 'website-other',
};

const appleProviderToken = import.meta.env.PUBLIC_APPLE_PROVIDER_TOKEN?.trim();

if (appleProviderToken && !/^\d+$/.test(appleProviderToken)) {
  throw new Error('PUBLIC_APPLE_PROVIDER_TOKEN must contain digits only.');
}

export function contentGroupForPath(pathname: string): ContentGroup {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/plant-care/')) return 'plant-care';
  if (pathname.startsWith('/problems/')) return 'problems';
  if (pathname.startsWith('/blog/')) return 'blog';
  return 'other';
}

/** Apple campaign links are added only when App Store Connect supplies a provider token. */
export function appStoreUrl(contentGroup: ContentGroup): string {
  if (!appleProviderToken) return APP.appStoreUrl;

  const url = new URL(APP.appStoreUrl);
  url.searchParams.set('pt', appleProviderToken);
  url.searchParams.set('ct', APP_STORE_CAMPAIGNS[contentGroup]);
  url.searchParams.set('mt', '8');
  return url.href;
}

/** Safari Smart App Banner attribution uses the same stable content-group campaign tokens. */
export function smartAppBannerContent(contentGroup: ContentGroup): string {
  if (!appleProviderToken) return `app-id=${APP.appStoreId}`;
  return `app-id=${APP.appStoreId}, affiliate-data=pt=${appleProviderToken}&ct=${APP_STORE_CAMPAIGNS[contentGroup]}&mt=8`;
}

/** Primary navigation, also emitted as a SiteNavigationElement in structured data. */
export const NAV = [
  { label: 'Plant Care Guides', href: '/plant-care/' },
  { label: 'Plant Problems', href: '/problems/' },
  { label: 'Blog', href: '/blog/' },
  { label: 'FAQ', href: '/faq/' },
] as const;

export const FOOTER_LINKS = [
  {
    heading: 'Learn',
    links: [
      { label: 'Plant care guides', href: '/plant-care/' },
      { label: 'Diagnose a problem', href: '/problems/' },
      { label: 'Blog', href: '/blog/' },
      { label: 'Frequently asked questions', href: '/faq/' },
    ],
  },
  {
    heading: 'App',
    links: [
      { label: 'Download on the App Store', href: APP.appStoreUrl },
      { label: 'Features', href: '/#features' },
      { label: 'How it works', href: '/#how-it-works' },
      { label: 'Support', href: '/support/' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About Plantive', href: '/about/' },
      { label: 'Privacy policy', href: '/privacy/' },
      { label: 'Terms of use', href: '/terms/' },
      { label: APP.supportEmail, href: `mailto:${APP.supportEmail}` },
    ],
  },
] as const;
