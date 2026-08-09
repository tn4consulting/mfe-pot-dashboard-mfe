import {
  ContentClient,
  FallbackContentClient,
  StaticContentClient,
  StrapiContentClient,
} from '@tn4consulting/shared-content-client';

export const OVERVIEW_CONTENT_KEY = 'dashboard.overview.intro';

export const OVERVIEW_CHROME_CONTENT_KEYS = [
  'dashboard.overview.breadcrumbHome',
  'dashboard.overview.breadcrumbDashboard',
  'dashboard.overview.greeting',
  'dashboard.overview.greetingWithName',
  'dashboard.overview.whatsNewHeading',
  'dashboard.overview.needsAttentionHeading',
  'dashboard.overview.considerThisHeading',
] as const;

export const PAYMENT_HISTORY_CONTENT_KEYS = [
  'dashboard.payment-history.heading',
  'dashboard.payment-history.table.program',
  'dashboard.payment-history.table.status',
  'dashboard.payment-history.table.date',
  'dashboard.payment-history.table.amount',
  'dashboard.payment-history.table.actions',
  'dashboard.payment-history.table.actions-label',
  'dashboard.payment-history.status.complete',
  'dashboard.payment-history.status.pending',
  'dashboard.payment-history.error',
  'dashboard.payment-history.view-all',
] as const;

/**
 * No CMS configured -> the bilingual fallback (`public/assets/content-fallback/<locale>.json`)
 * directly. CMS configured -> Strapi as primary, same fallback backing it up
 * if Strapi is unreachable/missing a key at runtime -- see `FallbackContentClient`.
 */
export function createContentClient(strapiBaseUrl: string | undefined, assetBaseUrl: string): ContentClient {
  const fallback = new StaticContentClient(assetBaseUrl);
  return strapiBaseUrl ? new FallbackContentClient(new StrapiContentClient(strapiBaseUrl), fallback) : fallback;
}
