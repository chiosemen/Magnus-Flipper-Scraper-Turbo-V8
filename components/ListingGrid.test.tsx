import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ListingGrid } from './ListingGrid';
import { Listing } from '../types';

const mockListings: Listing[] = [
  {
    id: '1',
    title: 'Test Item 1',
    price: 100,
    currency: '$',
    location: 'NY',
    link: 'http://test.com',
    imageUrl: 'http://img.com/1.jpg',
    rating: 5,
    reviews: 10,
    marketplace: 'facebook',
    condition: 'New',
    sellerName: 'Seller 1',
    isSpam: false,
    postedTime: '1h ago',
    automationStatus: 'idle'
  }
];

describe('ListingGrid', () => {
  it('renders listings correctly', () => {
    render(
      <ListingGrid 
        listings={mockListings} 
        isLoading={false} 
        onManualMessage={() => {}} 
        onToggleSave={() => {}} 
      />
    );

    expect(screen.getByText('Test Item 1')).toBeInTheDocument();
    expect(screen.getByText('$100')).toBeInTheDocument();
  });

  it('shows no results message when empty', () => {
    render(
      <ListingGrid 
        listings={[]} 
        isLoading={false} 
        onManualMessage={() => {}} 
        onToggleSave={() => {}} 
      />
    );

    expect(screen.getByText('No active listings found.')).toBeInTheDocument();
  });

  it('calls onManualMessage when button clicked', () => {
    const handleMessage = vi.fn();
    render(
      <ListingGrid 
        listings={mockListings} 
        isLoading={false} 
        onManualMessage={handleMessage} 
        onToggleSave={() => {}} 
      />
    );

    const button = screen.getByTitle('Send Agent Message');
    fireEvent.click(button);

    expect(handleMessage).toHaveBeenCalledWith(mockListings[0]);
  });
});