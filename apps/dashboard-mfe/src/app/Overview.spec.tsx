import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { clearSession, createMockSession, storeSession } from '@tn4consulting/shared-auth/core';
import { Overview } from './Overview';

jest.mock('./register-scds', () => ({}));
jest.mock('./asset-base-url', () => ({ assetBaseUrl: 'http://localhost:4201/' }));

// Overview renders DashboardFeaturePaymentHistory (the "Payments Activity"
// widget) directly, alongside NeedsAttentionList, matching the two-column
// layout in docs/msca-screenshots/dashboard.png -- same runtime-config/
// content-client/fetch mocking PaymentHistory.spec.tsx and App.spec.tsx
// already need for that widget. Overview no longer renders "My Tasks" or
// the job-bank/employment-insurance federated widgets -- see Overview.tsx's
// own comment on why (none of the three appear in the reference
// screenshot; the two widgets moved to their owning apps' own pages).
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

describe('Overview', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) }) as unknown as typeof fetch;
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
});
