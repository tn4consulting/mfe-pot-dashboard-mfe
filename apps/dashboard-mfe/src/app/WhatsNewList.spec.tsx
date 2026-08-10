import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { WhatsNewList } from './WhatsNewList';

jest.mock('./asset-base-url', () => ({ assetBaseUrl: 'http://localhost:4201/' }));
jest.mock('../runtime-config', () => ({
  loadRuntimeConfig: jest.fn().mockResolvedValue({ dashboardBffBaseUrl: 'http://localhost:3004' }),
}));

function mockWhatsNewResponse(body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(body) }) as unknown as typeof fetch;
}

describe('WhatsNewList', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the English copy of the message fetched via its own self-configured API client', async () => {
    mockWhatsNewResponse({
      id: 'whats-new-esdc-test-message',
      variant: 'control',
      title: { en: 'ESDC test message', fr: 'Message de test d’EDSC' },
      body: {
        en: 'This is a test message from Employment and Social Development Canada (ESDC). No action is required.',
        fr: "Ceci est un message de test d'Emploi et Développement social Canada (EDSC). Aucune mesure n'est requise.",
      },
    });

    render(<WhatsNewList locale="en" heading="What's New?" />);

    // scds-notice is an unregistered custom element in this test
    // environment -- its `notice-title` prop lands as a plain attribute
    // (no shadow DOM to render it as visible text), so title is asserted
    // via the attribute and body via its slotted (visible) text content.
    const notice = await screen.findByText(
      'This is a test message from Employment and Social Development Canada (ESDC). No action is required.',
    );
    expect(notice.getAttribute('notice-title')).toBe('ESDC test message');
    expect(notice.getAttribute('tone')).toBe('info');
  });

  it('renders the French copy when locale is fr', async () => {
    mockWhatsNewResponse({
      id: 'whats-new-esdc-test-message',
      variant: 'control',
      title: { en: 'ESDC test message', fr: 'Message de test d’EDSC' },
      body: {
        en: 'This is a test message from Employment and Social Development Canada (ESDC). No action is required.',
        fr: "Ceci est un message de test d'Emploi et Développement social Canada (EDSC). Aucune mesure n'est requise.",
      },
    });

    render(<WhatsNewList locale="fr" heading="Quoi de neuf?" />);

    const notice = await screen.findByText(
      "Ceci est un message de test d'Emploi et Développement social Canada (EDSC). Aucune mesure n'est requise.",
    );
    expect(notice.getAttribute('notice-title')).toBe('Message de test d’EDSC');
  });

  it('renders nothing before the message has loaded', () => {
    mockWhatsNewResponse({
      id: 'whats-new-esdc-test-message',
      variant: 'control',
      title: { en: 'ESDC test message', fr: '' },
      body: { en: 'Body', fr: '' },
    });

    const { container } = render(<WhatsNewList locale="en" heading="What's New?" />);

    expect(container).toBeEmptyDOMElement();
  });
});
