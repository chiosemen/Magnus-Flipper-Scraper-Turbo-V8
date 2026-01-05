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
  // EXPLAINABILITY_CONTRACT_V1 (facts only; no decisions)
  explain?: {
    model: "RULES_V1";
    signals: Array<{ name: string; value: number; label: string }>;
    scoreBreakdown?: {
      method: "WEIGHTED_SUM" | "MULTIPLICATIVE";
      components: Array<{ name: string; weight: number; contribution: number }>;
      total: number; // 0..100
    };
    confidence?: number; // input quality, not truth
    warnings?: string[];
  };

}

// PROVENANCE_META_V1 (optional extension; keeps backward compatibility)
export interface EnrichedListingProvenanceMeta {
  pipelineVersion: string;
  stepVersions?: Partial<Record<"NORMALIZE" | "SIGNAL_EXTRACT" | "SCORE" | "FINALIZE", string>>;
  derivedFrom?: {
    listingHash: string;
    idempotencyKey: string;
  };
}
