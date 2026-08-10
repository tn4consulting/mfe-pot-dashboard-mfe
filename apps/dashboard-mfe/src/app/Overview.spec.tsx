import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { clearSession, createMockSession, storeSession } from '@tn4consulting/shared-auth/core';
import {
  RemoteModuleLoaderContext,
  WidgetRegistryContext,
} from '@tn4consulting/shared-federation-runtime';
import { UnleashClient } from 'unleash-proxy-client';
import {
  __resetBrowserFeatureFlagsForTests,
  initBrowserFeatureFlags,
} from '@tn4consulting/shared-feature-flags';
import { Overview } from './Overview';

jest.mock('./register-scds', () => ({}));
jest.mock('./asset-base-url', () => ({ assetBaseUrl: 'http://localhost:4201/' }));
jest.mock('unleash-proxy-client', () => ({ UnleashClient: jest.fn() }));

// Overview renders DashboardFeaturePaymentHistory (the "Payments Activity"
// widget) directly, alongside NeedsAttentionList, matching the two-column
// layout in docs/msca-screenshots/dashboard.png -- same runtime-config/
// content-client/fetch mocking PaymentHistory.spec.tsx and App.spec.tsx
// already need for that widget. Overview also renders two cross-domain
// widget tiles (job-bank's JobApplicationsList, employment-insurance's
// ReportingStatus) behind the dashboard-overview-cross-domain-widgets flag
// -- see the second describe block below and Overview.tsx's own comment.
// "My Tasks" stays dropped for good (no owning page, content was always a
// restatement of signals ReportingStatus already surfaces).
jest.mock('../runtime-config', () => ({
  loadRuntimeConfig: jest.fn().mockResolvedValue({ dashboardBffBaseUrl: 'http://localhost:3004', strapiBaseUrl: undefined }),
}));

const getPageContentsMock = jest.fn().mockResolvedValue({
  'dashboard.payment-history.heading': { title: 'Payments Activity', body: '' },
  'dashboard.payment-history.table.program': { title: 'Program', body: '' },
  'dashboard.payment-history.table.status': { title: 'Status', body: '' },
  'dashboard.payment-history.table.date': { title: 'Date', body: '' },
  'dashboard.payment-history.table.amount': { title: 'Amount', body: '' },
  'dashboard.payment-history.table.actions': { title: 'Actions', body: '' },
  'dashboard.payment-history.table.actions-label': { title: 'Actions', body: '' },
  'dashboard.payment-history.status.complete': { title: 'Complete', body: '' },
  'dashboard.payment-history.status.pending': { title: 'Pending', body: '' },
  'dashboard.payment-history.error': { title: 'Payment history is temporarily unavailable.', body: '' },
  'dashboard.payment-history.view-all': { title: 'View payment history', body: '' },
  'dashboard.overview.breadcrumbHome': { title: 'Home', body: '' },
  'dashboard.overview.breadcrumbDashboard': { title: 'Dashboard', body: '' },
  'dashboard.overview.greeting': { title: 'Hello', body: '' },
  'dashboard.overview.greetingWithName': { title: 'Hello, {name}', body: '' },
  'dashboard.overview.whatsNewHeading': { title: "What's New?", body: '' },
  'dashboard.overview.needsAttentionHeading': { title: 'Needs Attention', body: '' },
  'dashboard.overview.considerThisHeading': { title: 'Consider this...', body: '' },
});
jest.mock('./content-client', () => ({
  PAYMENT_HISTORY_CONTENT_KEYS: [
    'dashboard.payment-history.heading',
    'dashboard.payment-history.table.program',
    'dashboard.payment-history.table.status',
    'dashboard.payment-history.table.date',
    'dashboard.payment-history.table.amount',
    'dashboard.payment-history.table.actions',
    'dashboard.payment-history.table.actions-label',
    'dashboard.payment-history.status.complete',
    'dashboard.payment-history.status.pending',
    'dashboard.payment-history.error',
    'dashboard.payment-history.view-all',
  ],
  OVERVIEW_CHROME_CONTENT_KEYS: [
    'dashboard.overview.breadcrumbHome',
    'dashboard.overview.breadcrumbDashboard',
    'dashboard.overview.greeting',
    'dashboard.overview.greetingWithName',
    'dashboard.overview.whatsNewHeading',
    'dashboard.overview.needsAttentionHeading',
    'dashboard.overview.considerThisHeading',
  ],
  createContentClient: () => ({ getPageContents: getPageContentsMock }),
}));

const overviewContentClient = { getPageContents: getPageContentsMock, getPageContent: jest.fn() };

const WHATS_NEW_MESSAGE = {
  id: 'whats-new-esdc-test-message',
  variant: 'control',
  title: { en: 'ESDC test message', fr: 'Message de test d’EDSC' },
  body: { en: 'This is a test message.', fr: 'Ceci est un message de test.' },
};

describe('Overview', () => {
  beforeEach(() => {
    // WhatsNewList (rendered unconditionally, see Overview.tsx) now fetches
    // its own message from dashboard-bff's /api/whats-new -- a different
    // response shape than every other endpoint this generic mock backs
    // (payments/correspondence, all plain arrays), so it's routed by URL.
    global.fetch = jest.fn((url: RequestInfo | URL) => {
      if (url.toString().includes('/api/whats-new')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(WHATS_NEW_MESSAGE) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response);
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    clearSession();
    jest.restoreAllMocks();
  });

  it('greets the signed-in citizen by name', async () => {
    storeSession(createMockSession());
    render(<Overview contentClient={overviewContentClient} />);

    // Content resolution is always asynchronous, even against this mock --
    // see mfe-pot-platform/CLAUDE.md's i18n section on why this must be
    // findByText, not a synchronous getByText.
    expect(await screen.findByText('Hello, Jordan Tremblay')).toBeInTheDocument();
  });

  it('does not render the cross-domain widget tiles when the flag is off (the default)', async () => {
    storeSession(createMockSession());
    const loadRemoteModule = jest.fn();
    render(
      <RemoteModuleLoaderContext.Provider value={loadRemoteModule}>
        <Overview contentClient={overviewContentClient} />
      </RemoteModuleLoaderContext.Provider>,
    );

    await screen.findByText('Hello, Jordan Tremblay');
    expect(loadRemoteModule).not.toHaveBeenCalled();
  });

  describe('with dashboard-overview-cross-domain-widgets on', () => {
    beforeEach(() => {
      __resetBrowserFeatureFlagsForTests();
      (UnleashClient as jest.Mock).mockReset();
    });

    it('renders both cross-domain widget tiles, loaded via the shell-mediated widget registry', async () => {
      const isEnabled = jest.fn().mockReturnValue(true);
      (UnleashClient as jest.Mock).mockImplementation(() => ({
        start: jest.fn().mockResolvedValue(undefined),
        isEnabled,
        on: jest.fn(),
        off: jest.fn(),
      }));
      initBrowserFeatureFlags({
        appName: 'dashboard-mfe',
        frontendApiUrl: 'http://unleash.mfe-pot.local/api/frontend',
        frontendApiToken: 'test-token',
      });

      const loadRemoteModule = jest.fn().mockImplementation((remoteName: string) =>
        Promise.resolve(
          remoteName === 'job-bank-mfe'
            ? { JobApplicationsList: () => <p>job applications widget</p> }
            : { ReportingStatus: () => <p>ei reporting status widget</p> },
        ),
      );

      storeSession(createMockSession());
      render(
        <RemoteModuleLoaderContext.Provider value={loadRemoteModule}>
          <WidgetRegistryContext.Provider
            value={{
              'job-applications': {
                remoteName: 'job-bank-mfe',
                exposedModule: './JobApplicationsWidget',
                exportName: 'JobApplicationsList',
              },
              'ei-reporting-status': {
                remoteName: 'employment-insurance-mfe',
                exposedModule: './EiReportingStatusWidget',
                exportName: 'ReportingStatus',
              },
            }}
          >
            <Overview contentClient={overviewContentClient} />
          </WidgetRegistryContext.Provider>
        </RemoteModuleLoaderContext.Provider>,
      );

      await screen.findByText('Hello, Jordan Tremblay');
      await waitFor(() => expect(screen.getByText('job applications widget')).toBeInTheDocument());
      expect(screen.getByText('ei reporting status widget')).toBeInTheDocument();
      expect(loadRemoteModule).toHaveBeenCalledWith('job-bank-mfe', './JobApplicationsWidget');
      expect(loadRemoteModule).toHaveBeenCalledWith('employment-insurance-mfe', './EiReportingStatusWidget');
    });
  });
});
