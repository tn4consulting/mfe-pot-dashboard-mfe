// See App.tsx's own comment on this same import -- required for the
// classic JSX transform this app's tsconfig uses (react/jsx-runtime can't
// resolve once this bundle treats react as a federation-shared external).
import * as React from 'react';
import type { Locale } from '@tn4consulting/shared-i18n';

interface BilingualText {
  en: string;
  fr: string;
}

interface WhatsNewItem {
  id: string;
  title: BilingualText;
  body: BilingualText;
}

/**
 * Mock demo dressing modeled on `dashboard.png` -- deliberately not
 * sourced from dashboard-bff, there's no upstream owner for "what's new"
 * in this PoT, so it stays as static, bilingual, presentation-only data.
 * Deliberately a generic ESDC test notice, not a real named benefit
 * (contrast the reference screenshot's "Climate Action Incentive
 * Payment" -- a real CRA benefit, not one this fictional ESDC scenario
 * owns) -- see mfe-pot-platform/CLAUDE.md's "Design/UX fidelity" section
 * on this family's citizen-facing content being clearly-marked test data.
 */
const WHATS_NEW: WhatsNewItem[] = [
  {
    id: 'whats-new-esdc-test-message',
    title: {
      en: 'ESDC test message',
      fr: 'Message de test d’EDSC',
    },
    body: {
      en: 'This is a test message from Employment and Social Development Canada (ESDC). No action is required.',
      fr: "Ceci est un message de test d'Emploi et Développement social Canada (EDSC). Aucune mesure n'est requise.",
    },
  },
];

function text(value: BilingualText, locale: Locale): string {
  return locale === 'fr' ? value.fr : value.en;
}

export function WhatsNewList({ locale, heading }: { locale: Locale; heading: string }) {
  return (
    <section className="whats-new-list" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--scds-space-3)' }}>
      <scds-heading tag="h2" id="whats-new-heading">
        {heading}
      </scds-heading>
      {WHATS_NEW.map((item) => (
        <scds-notice key={item.id} notice-title={text(item.title, locale)} tone="info" title-tag="h3">
          {text(item.body, locale)}
        </scds-notice>
      ))}
    </section>
  );
}
