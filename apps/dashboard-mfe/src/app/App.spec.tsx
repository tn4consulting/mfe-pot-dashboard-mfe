import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { clearSession, createMockSession, storeSession } from '@tn4consulting/shared-auth/core';
import { App } from './App';

jest.mock('./asset-base-url', () => ({ assetBaseUrl: 'http://localhost:4201/' }));
jest.mock('./register-scds', () => ({}));

jest.mock('../runtime-config', () => ({
  loadRuntimeConfig: jest.fn().mockResolvedValue({ dashboardBffBaseUrl: 'http://localhost:3004', strapiBaseUrl: undefined }),
}));

const getPageContentMock = jest.fn();
const getPageContentsMock = jest.fn();
jest.mock('./content-client', () => ({
  OVERVIEW_CONTENT_KEY: 'dashboard.overview.intro',
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
  createContentClient: () => ({ getPageContent: getPageContentMock, getPageContents: getPageContentsMock }),
}));

describe('App', () => {
  beforeEach(() => {
    getPageContentMock.mockReset().mockResolvedValue(null);
    getPageContentsMock.mockReset().mockResolvedValue({
      'dashboard.payment-history.heading': { title: 'Payment history', body: '' },
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
    global.fetch = jest.fn((url: RequestInfo | URL) => {
      if (url.toString().includes('/api/payments')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { id: 'pay-1', date: '2026-07-15', benefit: 'EI', program: 'ei', status: 'complete', amount: 638 },
            ]),
        } as Response);
      }
      return Promise.resolve({ ok: false, status: 404 } as Response);
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    clearSession();
    jest.restoreAllMocks();
  });

  it('renders its feature components when there is an active session', async () => {
    storeSession(createMockSession());
    render(<App />);

    // scds-heading is an unregistered custom element in this test
    // environment (register-scds is mocked out), so it carries no
    // implicit heading role -- match on its text content instead, same
    // pattern used for scds-card elsewhere in this family's specs.
    expect(await screen.findByText('Hello, Jordan Tremblay')).toBeInTheDocument();
    // Payment-history's table labels come from an async ContentClient fetch
    // (even the fallback path is a Promise, per StaticContentClient), so
    // this needs an awaiting query, not a synchronous one -- same reason
    // the intro-content test below uses findByRole rather than getByRole.
    expect(await screen.findByText('Program')).toBeInTheDocument();
  });

  it('renders intro content fetched via ContentClient', async () => {
    storeSession(createMockSession());
    getPageContentMock.mockResolvedValue({
      key: 'dashboard.overview.intro',
      title: 'Welcome to your account',
      body: 'Here is an overview of your benefits, payments, and tasks.',
    });

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Welcome to your account' })).toBeInTheDocument();
  });

  it('blocks its own content when there is no active session, independent of the shell', async () => {
    clearSession();
    render(<App />);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('auth.signInRequired');
    expect(screen.queryByText('Payments Activity')).not.toBeInTheDocument();
  });
});
