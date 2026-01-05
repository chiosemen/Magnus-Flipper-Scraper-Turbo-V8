import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Listings } from '../../src/pages/Listings';

const renderWithRoute = (route: string) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Listings />
    </MemoryRouter>
  );
};

describe('Listings page', () => {
  it('shows demo listings when demo mode is enabled', () => {
    renderWithRoute('/listings?demo=1');

    expect(screen.getByText('DEMO MODE')).toBeInTheDocument();
    expect(screen.getByText('Showing 5 listings')).toBeInTheDocument();
  });

  it('blocks live mode without authentication', () => {
    renderWithRoute('/listings');

    expect(screen.getByText('Live Mode Requires Authentication')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument();
  });

  it('sorts demo listings by price when selected', () => {
    renderWithRoute('/listings?demo=1');

    fireEvent.click(screen.getByRole('button', { name: 'Sort by price' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sort ascending' }));

    const titles = screen.getAllByRole('heading', { level: 3 });
    expect(titles[0]).toHaveTextContent('Patagonia Better Sweater - XL - Black');
  });
});
