import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { WhatsNewList } from './WhatsNewList';

describe('WhatsNewList', () => {
  it('renders the English copy by default', () => {
    render(<WhatsNewList locale="en" heading="What's New?" />);

    // scds-notice is an unregistered custom element in this test
    // environment -- its `notice-title` prop lands as a plain attribute
    // (no shadow DOM to render it as visible text), so title is asserted
    // via the attribute and body via its slotted (visible) text content.
    const notice = screen.getByText(
      'This is a test message from Employment and Social Development Canada (ESDC). No action is required.',
    );
    expect(notice.getAttribute('notice-title')).toBe('ESDC test message');
    expect(notice.getAttribute('tone')).toBe('info');
  });

  it('renders the French copy when locale is fr', () => {
    render(<WhatsNewList locale="fr" heading="Quoi de neuf?" />);

    const notice = screen.getByText(
      "Ceci est un message de test d'Emploi et Développement social Canada (EDSC). Aucune mesure n'est requise.",
    );
    expect(notice.getAttribute('notice-title')).toBe('Message de test d’EDSC');
  });
});
