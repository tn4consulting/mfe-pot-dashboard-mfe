import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { ConsiderThisList } from './ConsiderThisList';

jest.mock('./register-scds', () => ({}));

describe('ConsiderThisList', () => {
  it('renders each suggestion as a scds-card with the bilingual copy in English by default', () => {
    render(<ConsiderThisList locale="en" heading="Consider this..." />);

    const cdcpCard = screen.getByText('Based on your profile, you may be eligible for CDCP.').closest('scds-card');
    expect(cdcpCard).not.toBeNull();
    expect(cdcpCard?.getAttribute('card-title')).toBe('Canada Dental Care Plan');
    expect(screen.getByText('Check eligibility')).toBeInTheDocument();
  });

  it('renders the French copy when locale is fr', () => {
    render(<ConsiderThisList locale="fr" heading="À considérer..." />);

    const cdcpCard = screen
      .getByText('Selon votre profil, vous pourriez être admissible au RCSD.')
      .closest('scds-card');
    expect(cdcpCard?.getAttribute('card-title')).toBe('Régime canadien de soins dentaires');
  });
});
