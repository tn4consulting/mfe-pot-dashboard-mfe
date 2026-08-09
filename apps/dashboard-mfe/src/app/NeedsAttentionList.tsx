// See App.tsx's own comment on this same import -- required for the
// classic JSX transform this app's tsconfig uses (react/jsx-runtime can't
// resolve once this bundle treats react as a federation-shared external).
import * as React from 'react';
import type { Locale } from '@tn4consulting/shared-i18n';
import './register-scds';

interface BilingualText {
  en: string;
  fr: string;
}

type NeedsAttentionTone = 'info' | 'success' | 'warning' | 'danger';

interface NeedsAttentionItem {
  id: string;
  program: BilingualText;
  severity: NeedsAttentionTone;
  badgeLabel: BilingualText;
  message: BilingualText;
}

/**
 * Mock demo dressing modeled on `dashboard.png` -- deliberately not
 * sourced from dashboard-bff, there's no upstream owner for "needs
 * attention" in this PoT, so it stays as static, bilingual,
 * presentation-only data. `badgeLabel` (e.g. "Expiring soon"/"Not
 * Secure"/"Active") is the short status word the reference screenshot
 * shows as its own badge, distinct from `message` (the longer description
 * line below it).
 */
const NEEDS_ATTENTION: NeedsAttentionItem[] = [
  {
    id: 'needs-attention-security',
    program: { en: 'MSCA Account Security', fr: 'Sécurité du compte Mon dossier Service Canada' },
    severity: 'warning',
    badgeLabel: { en: 'Not Secure', fr: 'Non sécurisé' },
    message: {
      en: 'Add a second sign-in method to better protect your account.',
      fr: 'Ajoutez une deuxième méthode de connexion pour mieux protéger votre compte.',
    },
  },
  {
    id: 'needs-attention-passport',
    program: { en: 'Passport Canada', fr: 'Passeport Canada' },
    severity: 'danger',
    badgeLabel: { en: 'Expiring soon', fr: 'Expire bientôt' },
    message: {
      en: 'Renew your passport before it expires on February 15.',
      fr: 'Renouvelez votre passeport avant son expiration le 15 février.',
    },
  },
  {
    id: 'needs-attention-parks',
    program: { en: 'Parks Canada', fr: 'Parcs Canada' },
    severity: 'info',
    badgeLabel: { en: 'Reminder', fr: 'Rappel' },
    message: {
      en: 'Confirm your passport reservation before it expires.',
      fr: 'Confirmez votre réservation de passeport avant son expiration.',
    },
  },
];

function text(value: BilingualText, locale: Locale): string {
  return locale === 'fr' ? value.fr : value.en;
}

export function NeedsAttentionList({ locale, heading }: { locale: Locale; heading: string }) {
  return (
    <section
      className="needs-attention-list"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--scds-space-3)' }}
    >
      <scds-heading tag="h2" id="needs-attention-heading">
        {heading}
      </scds-heading>
      {NEEDS_ATTENTION.map((item) => (
        <scds-card
          key={item.id}
          card-title={text(item.program, locale)}
          card-title-tag="h3"
          tone={item.severity}
          tone-label={text(item.badgeLabel, locale)}
        >
          {text(item.message, locale)}
        </scds-card>
      ))}
    </section>
  );
}
