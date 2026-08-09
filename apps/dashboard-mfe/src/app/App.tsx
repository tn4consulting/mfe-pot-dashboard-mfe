// See below -- required for the classic JSX transform this app's
// tsconfig uses (react/jsx-runtime can't resolve once this bundle treats
// react as a federation-shared external).
import * as React from 'react';
import { useEffect, useState } from 'react';
import { CLAIM_DASHBOARD, getStoredSession, hasClaim, onSessionChange } from '@tn4consulting/shared-auth/core';
import type { ContentClient, PageContent } from '@tn4consulting/shared-content-client';
import { useLocale, useTranslations } from '@tn4consulting/shared-i18n';
import { createContentClient, OVERVIEW_CONTENT_KEY } from './content-client';
import { loadRuntimeConfig } from '../runtime-config';
import { assetBaseUrl } from './asset-base-url';
import { Overview } from './Overview';
import './register-scds';

interface RemoteConfig {
  contentClient: ContentClient;
}

/**
 * Does its own setup entirely -- no host-provided REMOTE_PROVIDERS
 * equivalent (see RemoteRouteHost in shared-federation-runtime for why).
 * Auth/claim check lives here, not in the feature components -- defense
 * in depth, this app validates its own claim independently.
 *
 * dashboard-bff no longer has an `/api/overview` endpoint at all --
 * its `getBenefitOverview` server-to-server fan-out to job-bank-bff/
 * employment-insurance-bff was deleted outright (see mfe-pot/TODO.md's
 * "Design principles" section, principle 2: BFFs must not call each
 * other). Its only frontend consumer was Overview.tsx's "My Tasks"
 * section, already dropped before this; the two cross-domain widgets it
 * also used to feed are back, restored the compliant way (host-mediated
 * browser composition, see Overview.tsx's own comment).
 */
export function App() {
  const [hasAccess, setHasAccess] = useState(() => hasClaim(getStoredSession(), CLAIM_DASHBOARD));
  const [config, setConfig] = useState<RemoteConfig | null>(null);
  const [intro, setIntro] = useState<PageContent | null>(null);
  const [introLoadError, setIntroLoadError] = useState(false);
  const locale = useLocale();
  const { t } = useTranslations(assetBaseUrl, locale);

  useEffect(() => onSessionChange((session) => setHasAccess(hasClaim(session, CLAIM_DASHBOARD))), []);

  useEffect(() => {
    let cancelled = false;
    loadRuntimeConfig(assetBaseUrl).then((runtimeConfig) => {
      if (cancelled) {
        return;
      }
      setConfig({
        contentClient: createContentClient(runtimeConfig.strapiBaseUrl, assetBaseUrl),
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // CMS content (unlike the i18n chrome text below) isn't reactive by
  // default, so this app explicitly re-fetches whenever the cross-remote
  // active locale changes -- same pattern as every other converted app.
  useEffect(() => {
    if (!config) {
      return;
    }
    let cancelled = false;
    config.contentClient
      .getPageContent(OVERVIEW_CONTENT_KEY, locale === 'fr' ? 'fr' : 'en')
      .then((content) => {
        if (!cancelled) {
          setIntro(content);
          setIntroLoadError(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load dashboard overview content', err);
        if (!cancelled) {
          setIntroLoadError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [config, locale]);

  if (!hasAccess) {
    return <p role="alert">{t('auth.signInRequired')}</p>;
  }

  if (!config) {
    return null;
  }

  return (
    <>
      <section>
        <h1>{t('chrome.heading')}</h1>
        {intro ? (
          <>
            <h2>{intro.title}</h2>
            <p>{intro.body}</p>
          </>
        ) : introLoadError ? (
          <p role="alert">{t('errors.contentUnavailable')}</p>
        ) : null}
        <p>{t('chrome.servedFrom')}</p>
      </section>

      <Overview contentClient={config.contentClient} />
    </>
  );
}
