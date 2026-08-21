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
    'Identify any plant, flower or succulent from a photo in seconds, then get the watering and light schedule it actually needs. Free guides plus the iPhone app.',
  locale: 'en_US',
  lang: 'en',
  themeColor: '#14532d',
  /**
   * Google Search Console ownership token. Public by design — it only proves
   * control of this site. Kept alongside the /googled…html file so verification
   * survives if either method breaks.
   */
  googleSiteVerification: '9SZDJKni2zRuXtNdxtFCvHv5ri9bLrwtOeFG3-LLnHw',
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
  contentRating: '12+',
  supportEmail: 'contact@deductify.org',
  privacyUrl:
    'https://docs.google.com/document/d/1aArtFTt3BBX7Ft_YmQlOsRMgu3PcTHXK4G0mEpcTcjM',
  termsUrl:
    'https://docs.google.com/document/d/1lY8Z_TE3wIUNrO6oh_VBa-9Tc_n3oxA0yO7c9g8UeDM',
} as const;

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
