import { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Clock, DollarSign, SortAsc } from 'lucide-react';
import { TrialBanner } from '../components/TrialBanner';

// Type definition (from packages/types/src/uiReadModel.ts)
interface UiListingCard {
  listingId: string;
  marketplace: string;
  title: string;
  priceUSD: number;
  score: number;
  signals: Record<string, number>;
  updatedAt: string;
}

// Demo mode frozen data (constitutional-safe)
const DEMO_LISTINGS: UiListingCard[] = [
  {
    listingId: 'demo-1',
    marketplace: 'facebook',
    title: 'Vintage Leica M6 Camera - Mint Condition',
    priceUSD: 850,
    score: 0.92,
    signals: { freshness: 0.95, rarity: 0.89, priceContext: 0.91 },
    updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    listingId: 'demo-2',
    marketplace: 'ebay',
    title: 'Herman Miller Aeron Chair - Size B',
    priceUSD: 320,
    score: 0.87,
    signals: { freshness: 0.88, rarity: 0.72, priceContext: 0.95 },
    updatedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  },
  {
    listingId: 'demo-3',
    marketplace: 'offerup',
    title: 'Nintendo Switch OLED Bundle w/ Games',
    priceUSD: 210,
    score: 0.84,
    signals: { freshness: 0.92, rarity: 0.65, priceContext: 0.88 },
    updatedAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
  },
  {
    listingId: 'demo-4',
    marketplace: 'vinted',
    title: 'Patagonia Better Sweater - XL - Black',
    priceUSD: 45,
    score: 0.79,
    signals: { freshness: 0.81, rarity: 0.58, priceContext: 0.92 },
    updatedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
  {
    listingId: 'demo-5',
    marketplace: 'facebook',
    title: 'Dyson V11 Vacuum - Barely Used',
    priceUSD: 180,
    score: 0.76,
    signals: { freshness: 0.75, rarity: 0.68, priceContext: 0.84 },
    updatedAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
  },
];

type SortKey = 'score' | 'priceUSD' | 'updatedAt';

export function Listings() {
  const [searchParams] = useSearchParams();
  const isDemoMode = searchParams.get('demo') === '1';

  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Client-side sorting (constitutional-safe)
  const sortedListings = useMemo(() => {
    if (!isDemoMode) return [];

    return [...DEMO_LISTINGS].sort((a, b) => {
      const aVal = sortKey === 'updatedAt' ? new Date(a[sortKey]).getTime() : a[sortKey];
      const bVal = sortKey === 'updatedAt' ? new Date(b[sortKey]).getTime() : b[sortKey];

      const multiplier = sortDirection === 'asc' ? 1 : -1;
      return (aVal > bVal ? 1 : -1) * multiplier;
    });
  }, [isDemoMode, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const minutes = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getMarketplaceColor = (marketplace: string) => {
    const colors: Record<string, string> = {
      facebook: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      ebay: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
      offerup: 'bg-green-500/10 text-green-400 border-green-500/30',
      vinted: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    };
    return colors[marketplace] || 'bg-carbon-700 text-carbon-300 border-carbon-600';
  };

  if (!isDemoMode) {
    return (
      <div className="min-h-screen bg-carbon-950 flex items-center justify-center px-6">
        <div className="max-w-2xl text-center">
          <h1 className="text-4xl font-bold text-carbon-100 mb-4">
            Live Mode Requires Authentication
          </h1>
          <p className="text-xl text-carbon-100/60 mb-8">
            This page shows real-time listings from your monitors. Please log in to continue.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/login"
              className="px-8 py-4 bg-green-500 text-carbon-950 rounded-lg font-bold hover:bg-green-400 transition-all"
            >
              Login
            </Link>
            <Link
              to="/?demo=1"
              className="px-8 py-4 border-2 border-carbon-700 text-carbon-100 rounded-lg font-semibold hover:border-green-500 hover:text-green-500 transition-all"
            >
              View Demo Mode
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-carbon-950 text-carbon-100">
      <TrialBanner />
      {/* Header */}
      <div className="border-b border-carbon-800 bg-carbon-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="text-carbon-100/60 hover:text-green-500 transition-colors"
                aria-label="Back to home"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Live Listings</h1>
                <p className="text-sm text-carbon-100/50">
                  Demo Mode (Frozen Data)
                </p>
              </div>
            </div>
            <div className="px-4 py-2 bg-yellow-400/10 border border-yellow-400/30 rounded-lg text-yellow-400 text-sm font-medium">
              DEMO MODE
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-carbon-100/60">
            Showing {sortedListings.length} listings
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-carbon-100/60">Sort by:</span>
            <button
              onClick={() => handleSort('score')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                sortKey === 'score'
                  ? 'bg-green-500 text-carbon-950'
                  : 'bg-carbon-800 text-carbon-100 hover:bg-carbon-700'
              }`}
              aria-label="Sort by score"
            >
              <TrendingUp className="w-4 h-4 inline mr-1" />
              Score
            </button>
            <button
              onClick={() => handleSort('priceUSD')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                sortKey === 'priceUSD'
                  ? 'bg-green-500 text-carbon-950'
                  : 'bg-carbon-800 text-carbon-100 hover:bg-carbon-700'
              }`}
              aria-label="Sort by price"
            >
              <DollarSign className="w-4 h-4 inline mr-1" />
              Price
            </button>
            <button
              onClick={() => handleSort('updatedAt')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                sortKey === 'updatedAt'
                  ? 'bg-green-500 text-carbon-950'
                  : 'bg-carbon-800 text-carbon-100 hover:bg-carbon-700'
              }`}
              aria-label="Sort by freshness"
            >
              <Clock className="w-4 h-4 inline mr-1" />
              Fresh
            </button>
            <button
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 bg-carbon-800 text-carbon-100 rounded-lg hover:bg-carbon-700 transition-all"
              aria-label={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
            >
              <SortAsc className={`w-4 h-4 transition-transform ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Listings Grid */}
        <div className="grid gap-4">
          {sortedListings.map((listing) => (
            <div
              key={listing.listingId}
              className="glass-card p-6 rounded-xl hover:border-green-500/50 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${getMarketplaceColor(
                        listing.marketplace
                      )}`}
                    >
                      {listing.marketplace}
                    </span>
                    <span className="text-xs text-carbon-100/50">
                      {formatTimeAgo(listing.updatedAt)}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-carbon-100 mb-3">
                    {listing.title}
                  </h3>
                  <div className="flex items-center space-x-6 text-sm">
                    <div>
                      <span className="text-carbon-100/50">Price:</span>
                      <span className="ml-2 text-green-400 font-semibold">
                        ${listing.priceUSD}
                      </span>
                    </div>
                    <div>
                      <span className="text-carbon-100/50">Freshness:</span>
                      <span className="ml-2 text-carbon-100">
                        {(listing.signals.freshness * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-carbon-100/50">Rarity:</span>
                      <span className="ml-2 text-carbon-100">
                        {(listing.signals.rarity * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-carbon-100/50">Value:</span>
                      <span className="ml-2 text-carbon-100">
                        {(listing.signals.priceContext * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="ml-6 text-right">
                  <div className="text-3xl font-bold text-green-400">
                    {(listing.score * 100).toFixed(0)}
                  </div>
                  <div className="text-xs text-carbon-100/50">Score</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Info Footer */}
        <div className="mt-8 p-4 bg-carbon-900/50 border border-carbon-800 rounded-xl text-center text-sm text-carbon-100/60">
          Demo mode shows frozen sample data. In live mode, listings update in real-time via WebSocket.
        </div>
      </div>
    </div>
  );
}
