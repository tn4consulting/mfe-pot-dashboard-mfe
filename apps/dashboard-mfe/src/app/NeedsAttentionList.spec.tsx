import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { NeedsAttentionList } from './NeedsAttentionList';

jest.mock('./register-scds', () => ({}));

describe('NeedsAttentionList', () => {
  it('renders the English copy as a scds-card with the item severity as tone', () => {
    render(<NeedsAttentionList locale="en" heading="Needs Attention" />);

    // scds-card is an unregistered custom element in this test
    // environment -- its title/tone props land as plain attributes,
    // asserted directly rather than via shadow-DOM rendered text.
    const card = screen
      .getByText('Add a second sign-in method to better protect your account.')
      .closest('scds-card');
    expect(card).not.toBeNull();
    expect(card?.getAttribute('card-title')).toBe('MSCA Account Security');
    expect(card?.getAttribute('tone')).toBe('warning');
    expect(card?.getAttribute('tone-label')).toBe('Not Secure');
  });

  it('renders the French copy when locale is fr', () => {
    render(<NeedsAttentionList locale="fr" heading="Nécessite une attention" />);

    const card = screen
      .getByText('Ajoutez une deuxième méthode de connexion pour mieux protéger votre compte.')
      .closest('scds-card');
    expect(card?.getAttribute('card-title')).toBe('Sécurité du compte Mon dossier Service Canada');
    expect(card?.getAttribute('tone-label')).toBe('Non sécurisé');
  });
});
