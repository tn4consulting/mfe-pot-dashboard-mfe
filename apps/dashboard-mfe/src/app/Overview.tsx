// See App.tsx's own comment on this same import -- required for the
// classic JSX transform this app's tsconfig uses.
import * as React from 'react';
import { useEffect, useState } from 'react';
import { getStoredSession, onSessionChange } from '@tn4consulting/shared-auth/core';
import type { ContentClient } from '@tn4consulting/shared-content-client';
import { fillTemplate } from '@tn4consulting/shared-content-client';
import { useLocale } from '@tn4consulting/shared-i18n';
import { OVERVIEW_CHROME_CONTENT_KEYS } from './content-client';
import { usePageContents } from './use-page-contents';
import { WhatsNewList } from './WhatsNewList';
import { NeedsAttentionList } from './NeedsAttentionList';
import { ConsiderThisList } from './ConsiderThisList';
import { DashboardFeaturePaymentHistory } from './PaymentHistory';

export interface OverviewProps {
  contentClient: ContentClient;
}

/**
 * Composes dashboard's own sections only -- WhatsNewList/NeedsAttentionList/
 * DashboardFeaturePaymentHistory/ConsiderThisList -- matching the widget
 * set in docs/msca-screenshots/dashboard.png exactly. This used to also
 * render "My Tasks" (a benefitOverview-fed list, always EI-report-derived
 * in practice) and two federated widgets owned by other domains --
 * job-bank's JobApplicationsList and employment-insurance's
 * ReportingStatus, loaded via the shell-mediated
 * JobApplicationsWidgetLoaderContext/EiReportingStatusWidgetLoaderContext.
 * None of the three appear in the reference screenshot, so they moved to
 * where they actually belong: `ReportingStatus`/`JobApplicationsList` now
 * render directly on employment-insurance-mfe's/job-bank-mfe's own pages
 * (see those repos' App.tsx) instead of only existing as a
 * dashboard-embedded widget; "My Tasks" had no other owning page (its
 * content was always synthesized from the same EI claim/reporting-status
 * signals `ReportingStatus` already surfaces), so it was dropped rather
 * than duplicated -- see CLAUDE.md's federation section for why a remote
 * can't loadRemoteModule another remote itself, and dashboard-bff's
 * overview.ts for the cross-repo fan-out that used to feed "My Tasks"
 * (still there, still exercised by dashboard-bff's own tests, just no
 * longer consumed by this page).
 */
export function Overview({ contentClient }: OverviewProps) {
  const [citizenName, setCitizenName] = useState(() => getStoredSession()?.name ?? null);
  const locale = useLocale();
  const formattedDate = new Intl.DateTimeFormat(locale === 'fr' ? 'fr-CA' : 'en-CA', { dateStyle: 'long' }).format(
    new Date(),
  );
  const content = usePageContents(contentClient, OVERVIEW_CHROME_CONTENT_KEYS, locale);
  function label(key: (typeof OVERVIEW_CHROME_CONTENT_KEYS)[number]): string {
    return content[key]?.title ?? key;
  }

  useEffect(() => onSessionChange((session) => setCitizenName(session?.name ?? null)), []);

  return (
    <section className="dashboard-overview" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--scds-space-6)', paddingBlock: 'var(--scds-space-5)' }}>
      <scds-breadcrumbs>
        <scds-breadcrumbs-item href="/">{label('dashboard.overview.breadcrumbHome')}</scds-breadcrumbs-item>
        <scds-breadcrumbs-item>{label('dashboard.overview.breadcrumbDashboard')}</scds-breadcrumbs-item>
      </scds-breadcrumbs>

      {/* Inline styles, not a stylesheet class, for every layout-critical
          rule in this file: when this component is federated into the
          shell (the common case), this app's own styles.css/index.html
          never load at all -- only this exposed ./Component module does
          -- so an external className-based rule would silently be dead
          weight there. Confirmed live: the grid below rendered as a
          single stacked column, not 2, until this was inlined. Only
          shadow-DOM-encapsulated scds-* component styles survive
          federation on their own. The border-bottom below mirrors
          dashboard.png's divider between the "Hello, {name}" heading row
          and the What's New card underneath it. */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 'var(--scds-space-3)',
          paddingBottom: 'var(--scds-space-4)',
          borderBottom: '1px solid var(--scds-border-color)',
        }}
      >
        <scds-heading tag="h1">
          {citizenName
            ? fillTemplate(label('dashboard.overview.greetingWithName'), { name: citizenName })
            : label('dashboard.overview.greeting')}
        </scds-heading>
        <p className="today" style={{ color: 'var(--scds-color-text-muted)', margin: 0 }}>
          {formattedDate}
        </p>
      </div>

      <WhatsNewList locale={locale} heading={label('dashboard.overview.whatsNewHeading')} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(22rem, 1fr))', gap: 'var(--scds-space-5)', alignItems: 'start' }}>
        <NeedsAttentionList locale={locale} heading={label('dashboard.overview.needsAttentionHeading')} />
        <DashboardFeaturePaymentHistory />
      </div>

      <ConsiderThisList locale={locale} heading={label('dashboard.overview.considerThisHeading')} />
    </section>
  );
}
