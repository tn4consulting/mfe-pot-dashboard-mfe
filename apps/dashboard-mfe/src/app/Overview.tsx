// See App.tsx's own comment on this same import -- required for the
// classic JSX transform this app's tsconfig uses.
import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { getStoredSession, onSessionChange } from '@tn4consulting/shared-auth/core';
import type { ContentClient } from '@tn4consulting/shared-content-client';
import { fillTemplate } from '@tn4consulting/shared-content-client';
import { useFeatureFlag } from '@tn4consulting/shared-feature-flags';
import { useLocale } from '@tn4consulting/shared-i18n';
import { startPageSpan } from '@tn4consulting/shared-observability';
import { OVERVIEW_CHROME_CONTENT_KEYS } from './content-client';
import { usePageContents } from './use-page-contents';
import { WhatsNewList } from './WhatsNewList';
import { NeedsAttentionList } from './NeedsAttentionList';
import { ConsiderThisList } from './ConsiderThisList';
import { DashboardFeaturePaymentHistory } from './PaymentHistory';
import { CrossDomainWidgetTile } from './CrossDomainWidgetTile';

export interface OverviewProps {
  contentClient: ContentClient;
}

/**
 * Composes dashboard's own sections -- WhatsNewList/NeedsAttentionList/
 * DashboardFeaturePaymentHistory/ConsiderThisList -- matching the widget
 * set in docs/msca-screenshots/dashboard.png exactly, plus two
 * feature-flagged cross-domain widget tiles (job-bank's
 * JobApplicationsList, employment-insurance's ReportingStatus). This used
 * to also render "My Tasks" (fed by dashboard-bff's now-deleted
 * `getBenefitOverview` server-to-server fan-out to job-bank-bff/
 * employment-insurance-bff -- see mfe-pot/TODO.md's "Design principles"
 * section, principle 2) and the same two cross-domain widgets, all three
 * dropped because none appear in the reference screenshot. The two
 * widgets are back, restored the compliant way -- host-mediated browser
 * composition via useWidgetLoader (`CrossDomainWidgetTile`, see
 * mfe-pot-msca-shell's routes.tsx WIDGET_REGISTRY), each widget calling
 * only its own domain's BFF -- gated behind the
 * `dashboard-overview-cross-domain-widgets` Unleash flag (default off, so
 * this page still matches the reference screenshot until the flag is
 * rolled out). "My Tasks" itself stays dropped: it had no other owning
 * page and its content was always just a restatement of the same EI
 * claim/reporting-status signals `ReportingStatus` already surfaces.
 *
 * When the cross-domain tiles are on, this page also opens its own root
 * span (`startPageSpan`, @tn4consulting/shared-observability) and passes
 * its serialized traceparent down as a `parentTraceparent` prop to
 * DashboardFeaturePaymentHistory and both CrossDomainWidgetTiles, so all
 * three widgets' BFF calls join one trace -- a legitimate,
 * principle-compliant replacement for the multi-BFF trace the deleted
 * `getBenefitOverview` fan-out used to (accidentally) produce. This has to
 * be explicit prop-passing, not ambient: OTel is not a federation-shared
 * singleton (see mfe-pot-platform/CLAUDE.md's observability section), so
 * each widget's independently-bundled copy of shared-observability has no
 * way to see this page's active span on its own.
 */
export function Overview({ contentClient }: OverviewProps) {
  const [citizenName, setCitizenName] = useState(() => getStoredSession()?.name ?? null);
  const crossDomainWidgetsEnabled = useFeatureFlag('dashboard-overview-cross-domain-widgets', false);
  // Only opened once the flag is actually on -- a page span with only this
  // one service in it (the common, flag-off case) isn't a useful trace to
  // start in the first place, and this stays consistent with the flag
  // gating everything else about this feature.
  const pageSpan = useMemo(
    () => (crossDomainWidgetsEnabled ? startPageSpan('dashboard-overview-cross-domain-widgets') : undefined),
    [crossDomainWidgetsEnabled],
  );
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
        <DashboardFeaturePaymentHistory parentTraceparent={pageSpan?.traceparent} />
      </div>

      <ConsiderThisList locale={locale} heading={label('dashboard.overview.considerThisHeading')} />

      {crossDomainWidgetsEnabled && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(22rem, 1fr))', gap: 'var(--scds-space-5)', alignItems: 'start' }}>
          <CrossDomainWidgetTile widgetId="job-applications" parentTraceparent={pageSpan?.traceparent} />
          <CrossDomainWidgetTile widgetId="ei-reporting-status" parentTraceparent={pageSpan?.traceparent} />
        </div>
      )}
    </section>
  );
}
