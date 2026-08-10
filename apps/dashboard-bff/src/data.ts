import { sessionCache } from './config';

export interface Payment {
  id: string;
  date: string;
  benefit: string;
  program: string;
  status: 'pending' | 'complete';
  amount: number;
}

export interface CorrespondenceItem {
  id: string;
  date: string;
  subject: string;
}

export interface BilingualText {
  en: string;
  fr: string;
}

export interface WhatsNewMessage {
  id: string;
  variant: string;
  title: BilingualText;
  body: BilingualText;
}

/**
 * Backs the `dashboard-whats-new-message` Unleash variant flag (see
 * config.ts's `featureFlags` and app.ts's `/api/whats-new`) -- an A/B test
 * of this message's content across a percentage of users, not just an
 * on/off gate. Hardcoded test data, same posture as SEED_PAYMENTS/
 * SEED_CORRESPONDENCE above: mock BFF *data* stays hardcoded, unlike UI
 * chrome/labels, which are CMS-driven (see mfe-pot-platform/CLAUDE.md's
 * i18n section). `control` reproduces WhatsNewList.tsx's own former static
 * mock content unchanged, so a citizen assigned to it sees no visible
 * change from before this feature existed.
 */
const WHATS_NEW_VARIANTS: Record<string, WhatsNewMessage> = {
  control: {
    id: 'whats-new-esdc-test-message',
    variant: 'control',
    title: {
      en: 'ESDC test message',
      fr: 'Message de test d’EDSC',
    },
    body: {
      en: 'This is a test message from Employment and Social Development Canada (ESDC). No action is required.',
      fr: "Ceci est un message de test d'Emploi et Développement social Canada (EDSC). Aucune mesure n'est requise.",
    },
  },
  'updated-message': {
    id: 'whats-new-esdc-updated-message',
    variant: 'updated-message',
    title: {
      en: 'ESDC test message — updated',
      fr: 'Message de test d’EDSC — mis à jour',
    },
    body: {
      en: 'This is an updated test message from Employment and Social Development Canada (ESDC), shown to a portion of users. No action is required.',
      fr: "Ceci est un message de test mis à jour d'Emploi et Développement social Canada (EDSC), affiché à une partie des utilisateurs. Aucune mesure n'est requise.",
    },
  },
};
const DEFAULT_WHATS_NEW_VARIANT = 'control';

/** Falls back to `control` for an unknown/undefined variant name -- same safe-default posture as the flag SDKs themselves. */
export function getWhatsNewMessage(variantName?: string): WhatsNewMessage {
  return WHATS_NEW_VARIANTS[variantName ?? DEFAULT_WHATS_NEW_VARIANT] ?? WHATS_NEW_VARIANTS[DEFAULT_WHATS_NEW_VARIANT];
}

/**
 * A single mock persona for this PoT -- matches the mock session issued by
 * `createMockSession()` in `libs/shared/auth`. Seeded lazily into the
 * cache on that persona's first read (see below) rather than up front, so
 * a fresh cache (a freshly deployed pod, or right after `/api/reset`)
 * still demos correctly without a separate seed step.
 */
const SEED_SUB = 'mock-citizen-001';

const SEED_PAYMENTS: Payment[] = [
  {
    id: 'pay-001',
    date: '2026-07-15',
    benefit: 'Employment Insurance',
    program: 'EI',
    status: 'pending',
    amount: 638.0,
  },
  {
    id: 'pay-002',
    date: '2026-07-01',
    benefit: 'Employment Insurance',
    program: 'EI',
    status: 'complete',
    amount: 638.0,
  },
];

const SEED_CORRESPONDENCE: CorrespondenceItem[] = [
  { id: 'corr-001', date: '2026-07-10', subject: 'Your EI application has been approved' },
  { id: 'corr-002', date: '2026-06-28', subject: 'We received your EI application' },
];

export async function getPayments(sub: string): Promise<Payment[]> {
  const key = sessionCache.buildKey('payments', sub);
  const existing = await sessionCache.getJson<Payment[]>(key);
  if (existing) {
    return existing;
  }
  const seeded = sub === SEED_SUB ? SEED_PAYMENTS : [];
  await sessionCache.setJson(key, seeded);
  return seeded;
}

export async function getCorrespondence(sub: string): Promise<CorrespondenceItem[]> {
  const key = sessionCache.buildKey('correspondence', sub);
  const existing = await sessionCache.getJson<CorrespondenceItem[]>(key);
  if (existing) {
    return existing;
  }
  const seeded = sub === SEED_SUB ? SEED_CORRESPONDENCE : [];
  await sessionCache.setJson(key, seeded);
  return seeded;
}
