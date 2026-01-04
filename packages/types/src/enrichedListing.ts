export interface EnrichedListing {
  listingId: string;
  marketplace: string;

  normalized: {
    title: string;
    priceUSD: number;
    currency: string;
  };

  signals: {
    freshness: number;
    rarity: number;
    demand?: number;
  };

  score: number | null;

  provenance: {
    pipelineVersion: string;
    steps: Array<{
      step: 'NORMALIZE' | 'SIGNALS' | 'SCORE' | 'ALERT_EVAL' | 'ARB_EVAL' | 'PROJECT_UI';
      updatedAt: string;
      details?: string;
    }>;
  };

  enrichedAt: string;
}
