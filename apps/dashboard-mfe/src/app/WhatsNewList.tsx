// See App.tsx's own comment on this same import -- required for the
// classic JSX transform this app's tsconfig uses (react/jsx-runtime can't
// resolve once this bundle treats react as a federation-shared external).
import * as React from 'react';
import { useEffect, useState } from 'react';
import { getStoredSession } from '@tn4consulting/shared-auth/core';
import type { Locale } from '@tn4consulting/shared-i18n';
import type { BilingualText, WhatsNewApiClient, WhatsNewMessage } from 'dashboard-data-access';
import { HttpWhatsNewApiClient } from 'dashboard-data-access';
import { loadRuntimeConfig } from '../runtime-config';
import { assetBaseUrl } from './asset-base-url';

function text(value: BilingualText, locale: Locale): string {
  return locale === 'fr' ? value.fr : value.en;
}

const WHATS_NEW_SESSION_STORAGE_KEY = 'mfe-pot-whats-new-session-id';

/**
 * A random id, stable for this browser tab's session (sessionStorage, not
 * localStorage -- a fresh tab/incognito window gets a new one) but not
 * tied to citizen identity. dashboard-bff's Unleash flag is keyed on this
 * (not the signed-in sub) specifically because this PoT has one seeded
 * mock persona -- sub-keyed stickiness would otherwise always resolve to
 * the same variant on every demo run. See
 * mfe-pot-platform's seed-unleash-flags.mjs for the flag-side half of this.
 */
function getOrCreateSessionId(): string {
  const existing = sessionStorage.getItem(WHATS_NEW_SESSION_STORAGE_KEY);
  if (existing) {
    return existing;
  }
  const generated = crypto.randomUUID();
  sessionStorage.setItem(WHATS_NEW_SESSION_STORAGE_KEY, generated);
  return generated;
}

/**
 * Fetches its own message from dashboard-bff's /api/whats-new, which
 * A/B-tests the content across a percentage of users via the
 * `dashboard-whats-new-message` Unleash variant flag (see
 * mfe-pot-platform/CLAUDE.md's "Design principles" section, and
 * dashboard-bff's config.ts/app.ts) -- previously a static, hardcoded
 * mock message with no upstream owner. Self-configuring (fetches its own
 * runtime config, builds its own API client) the same way
 * DashboardFeaturePaymentHistory does, since this app follows the "every
 * remote is fully self-configuring" pattern (see
 * mfe-pot-platform/CLAUDE.md's "Federation" section) even for a component
 * that isn't itself a separately-exposed federated widget.
 */
export function WhatsNewList({ locale, heading }: { locale: Locale; heading: string }) {
  const [apiClient, setApiClient] = useState<WhatsNewApiClient | null>(null);
  const [message, setMessage] = useState<WhatsNewMessage | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadRuntimeConfig(assetBaseUrl).then((runtimeConfig) => {
      if (!cancelled) {
        setApiClient(new HttpWhatsNewApiClient(runtimeConfig.dashboardBffBaseUrl));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!apiClient) {
      return;
    }
    let cancelled = false;
    apiClient
      .getWhatsNewMessage({ sub: getStoredSession()?.sub, sessionId: getOrCreateSessionId() })
      .then((result) => {
        if (!cancelled) {
          setMessage(result);
        }
      })
      .catch((err) => {
        console.error('Failed to load What\'s New message', err);
      });
    return () => {
      cancelled = true;
    };
  }, [apiClient]);

  if (!message) {
    return null;
  }

  return (
    <section className="whats-new-list" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--scds-space-3)' }}>
      <scds-heading tag="h2" id="whats-new-heading">
        {heading}
      </scds-heading>
      <scds-notice notice-title={text(message.title, locale)} tone="info" title-tag="h3">
        {text(message.body, locale)}
      </scds-notice>
    </section>
  );
}
