// See App.tsx's own comment on this same import -- required for the
// classic JSX transform this app's tsconfig uses.
import * as React from 'react';
import type { Locale } from '@tn4consulting/shared-i18n';
import './register-scds';

interface BilingualText {
  en: string;
  fr: string;
}

interface SuggestionItem {
  id: string;
  title: BilingualText;
  body: BilingualText;
  actionLabel: BilingualText;
}

/**
 * Mock demo dressing modeled on `dashboard.png` -- deliberately not
 * sourced from dashboard-bff, there's no upstream owner for "consider
 * this" in this PoT, so it stays as static, bilingual, presentation-only
 * data.
 */
const SUGGESTIONS: SuggestionItem[] = [
  {
    id: 'suggestion-cdcp',
    title: { en: 'Canada Dental Care Plan', fr: 'Régime canadien de soins dentaires' },
    body: {
      en: 'Based on your profile, you may be eligible for CDCP.',
      fr: 'Selon votre profil, vous pourriez être admissible au RCSD.',
    },
    actionLabel: { en: 'Check eligibility', fr: "Vérifier l'admissibilité" },
  },
  {
    id: 'suggestion-profile',
    title: { en: 'Update your profile', fr: 'Mettez à jour votre profil' },
    body: {
      en: 'Keep your contact information current so we can reach you faster.',
      fr: 'Gardez vos coordonnées à jour afin que nous puissions vous joindre plus rapidement.',
    },
    actionLabel: { en: 'Edit profile', fr: 'Modifier le profil' },
  },
];

function text(value: BilingualText, locale: Locale): string {
  return locale === 'fr' ? value.fr : value.en;
}

export function ConsiderThisList({ locale, heading }: { locale: Locale; heading: string }) {
  return (
    <section className="consider-this-list" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--scds-space-3)' }}>
      <scds-heading tag="h2" id="consider-this-heading">
        {heading}
      </scds-heading>
      {SUGGESTIONS.map((item) => (
        <scds-card key={item.id} card-title={text(item.title, locale)}>
          {text(item.body, locale)}
          <div slot="scdsCardActions">
            <scds-link href="#" icon-name="arrow-right">
              {text(item.actionLabel, locale)}
            </scds-link>
          </div>
        </scds-card>
      ))}
    </section>
  );
}
