// See App.tsx's own comment on this same import -- required for the
// classic JSX transform this app's tsconfig uses.
import * as React from 'react';
import { ComponentType, useEffect, useState } from 'react';
import { useWidgetLoader } from '@tn4consulting/shared-federation-runtime';
import { useLocale, useTranslations } from '@tn4consulting/shared-i18n';
import { assetBaseUrl } from './asset-base-url';

export interface CrossDomainWidgetTileProps {
  widgetId: string;
  /**
   * A serialized W3C traceparent from Overview.tsx's own root span,
   * forwarded straight through as a prop to whichever widget component
   * loads -- both payment-history's and this widget-loader's target
   * components (JobApplicationsList, ReportingStatus) accept the identical
   * optional `parentTraceparent` prop. See Overview.tsx's own comment.
   */
  parentTraceparent?: string;
}

/**
 * Renders another domain's own federated widget in place, host-mediated
 * via useWidgetLoader (see mfe-pot-msca-shell's routes.tsx WIDGET_REGISTRY)
 * -- e.g. job-bank's JobApplicationsList, employment-insurance's
 * ReportingStatus. Both target widgets already render their own heading
 * internally, so this stays a bare loader/error boundary with no wrapper
 * heading of its own, matching how DashboardFeaturePaymentHistory is
 * rendered above with no extra heading either. Modeled directly on
 * mfe-pot-life-events-mfe's kit/WidgetSlot.tsx.
 */
export function CrossDomainWidgetTile({ widgetId, parentTraceparent }: CrossDomainWidgetTileProps) {
  const locale = useLocale();
  const { t } = useTranslations(assetBaseUrl, locale);
  const loadWidget = useWidgetLoader(widgetId);
  const [Widget, setWidget] = useState<ComponentType<Record<string, unknown>> | null>(null);
  const [widgetLoadError, setWidgetLoadError] = useState(false);

  useEffect(() => {
    if (!loadWidget) {
      setWidgetLoadError(true);
      return;
    }
    let cancelled = false;
    loadWidget()
      .then(({ component }) => {
        if (!cancelled) {
          setWidget(() => component);
        }
      })
      .catch((err) => {
        console.error(`Failed to load widget "${widgetId}"`, err);
        if (!cancelled) {
          setWidgetLoadError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loadWidget, widgetId]);

  if (widgetLoadError) {
    return <p role="alert">{t('errors.contentUnavailable')}</p>;
  }
  return Widget ? <Widget parentTraceparent={parentTraceparent} /> : null;
}
