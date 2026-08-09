// See App.tsx's own comment on this same import -- required for the
// classic JSX transform this app's tsconfig uses.
import * as React from 'react';
import { useEffect, useState } from 'react';
import { getStoredSession } from '@tn4consulting/shared-auth/core';
import type { ContentClient, PageContent } from '@tn4consulting/shared-content-client';
import { useLocale } from '@tn4consulting/shared-i18n';
import type { Payment, PaymentHistoryApiClient } from 'dashboard-data-access';
import { HttpPaymentHistoryApiClient } from 'dashboard-data-access';
import { createContentClient, PAYMENT_HISTORY_CONTENT_KEYS } from './content-client';
import { loadRuntimeConfig } from '../runtime-config';
import { assetBaseUrl } from './asset-base-url';

// Inline style, not a stylesheet class -- `.scds-visually-hidden` (defined
// globally in shared-ui-scds-core's tokens.css) never loads when this
// widget is federated, same reasoning as every other inline style in this
// file/Overview.tsx.
const VISUALLY_HIDDEN_STYLE: React.CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

/**
 * Exposed as `./PaymentHistoryWidget` for life-events to embed,
 * and also rendered inline on dashboard's own overview -- either way it's
 * fully self-configuring (fetches its own runtime config, builds its own
 * API client), since there's no host-provided REMOTE_PROVIDERS equivalent
 * for a React remote to receive. Exported under this exact name --
 * `DashboardFeaturePaymentHistory` -- because mfe-pot-shell's routes.tsx
 * already resolves the widget module by this name.
 */
export function DashboardFeaturePaymentHistory() {
  const [apiClient, setApiClient] = useState<PaymentHistoryApiClient | null>(null);
  const [contentClient, setContentClient] = useState<ContentClient | null>(null);
  const [content, setContent] = useState<Record<string, PageContent>>({});
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadError, setLoadError] = useState(false);
  const locale = useLocale();

  function label(key: (typeof PAYMENT_HISTORY_CONTENT_KEYS)[number]): string {
    return content[key]?.title ?? key;
  }

  useEffect(() => {
    let cancelled = false;
    loadRuntimeConfig(assetBaseUrl).then((runtimeConfig) => {
      if (!cancelled) {
        setApiClient(new HttpPaymentHistoryApiClient(runtimeConfig.dashboardBffBaseUrl));
        setContentClient(createContentClient(runtimeConfig.strapiBaseUrl, assetBaseUrl));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // CMS content isn't reactive by default, so this widget explicitly
  // re-fetches whenever the cross-remote active locale changes -- same
  // pattern as every app's own intro block.
  useEffect(() => {
    if (!contentClient) {
      return;
    }
    let cancelled = false;
    contentClient
      .getPageContents([...PAYMENT_HISTORY_CONTENT_KEYS], locale === 'fr' ? 'fr' : 'en')
      .then((result) => {
        if (!cancelled) {
          setContent(result);
        }
      })
      .catch((err) => {
        console.error('Failed to load payment history content', err);
      });
    return () => {
      cancelled = true;
    };
  }, [contentClient, locale]);

  useEffect(() => {
    if (!apiClient) {
      return;
    }
    const session = getStoredSession();
    if (!session) {
      setLoadError(true);
      return;
    }
    let cancelled = false;
    apiClient
      .getPayments(session.sub)
      .then((result) => {
        if (!cancelled) {
          setPayments(result);
        }
      })
      .catch((err) => {
        console.error('Failed to load payment history', err);
        if (!cancelled) {
          setLoadError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [apiClient]);

  return (
    // Inline styles, not a stylesheet class -- same federation-survival
    // reasoning as Overview.tsx's own comment: this widget renders both
    // standalone (dashboard's own overview) and embedded remotely
    // (life-events), and its own styles.css never loads in
    // either federated case. The card look (white background, border,
    // radius, persistent shadow) mirrors dashboard.png's "Payments
    // Activity" card, and matches scds-card's own visual treatment
    // (see shared-ui-scds-core's scds-card.css) without actually using
    // scds-card, since this widget needs its own heading + table + link
    // layout, not scds-card's title/badge/actions-slot shape.
    <section
      className="payment-history-widget"
      style={{
        background: 'var(--scds-color-white)',
        border: '1px solid var(--scds-border-color)',
        borderRadius: 'var(--scds-radius-md)',
        boxShadow: 'var(--scds-shadow-sm)',
        padding: 'var(--scds-space-5)',
        boxSizing: 'border-box',
      }}
    >
      <scds-heading tag="h2">{label('dashboard.payment-history.heading')}</scds-heading>
      {loadError ? (
        <p role="alert">{label('dashboard.payment-history.error')}</p>
      ) : (
        <>
          <scds-table>
            <table>
              <caption style={VISUALLY_HIDDEN_STYLE}>{label('dashboard.payment-history.heading')}</caption>
              <thead>
                <tr>
                  <th scope="col">{label('dashboard.payment-history.table.program')}</th>
                  <th scope="col">{label('dashboard.payment-history.table.status')}</th>
                  <th scope="col">{label('dashboard.payment-history.table.date')}</th>
                  <th scope="col">{label('dashboard.payment-history.table.amount')}</th>
                  <th scope="col">
                    <span style={VISUALLY_HIDDEN_STYLE}>{label('dashboard.payment-history.table.actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.benefit}</td>
                    <td>
                      <scds-badge
                        variant="pill"
                        tone={payment.status === 'complete' ? 'success' : 'warning'}
                        label={
                          payment.status === 'complete'
                            ? label('dashboard.payment-history.status.complete')
                            : label('dashboard.payment-history.status.pending')
                        }
                        show-icon="false"
                      ></scds-badge>
                    </td>
                    <td>{payment.date}</td>
                    <td>${payment.amount.toFixed(2)}</td>
                    <td>
                      <button
                        type="button"
                        aria-label={`${label('dashboard.payment-history.table.actions-label')} — ${payment.benefit}`}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 'var(--scds-font-size-lg)',
                          lineHeight: 1,
                          color: 'var(--scds-color-text-muted)',
                          padding: 'var(--scds-space-1) var(--scds-space-2)',
                        }}
                      >
                        ⋯
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </scds-table>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--scds-space-4)' }}>
            <scds-link href="#" icon-name="arrow-right">
              {label('dashboard.payment-history.view-all')}
            </scds-link>
          </div>
        </>
      )}
    </section>
  );
}
