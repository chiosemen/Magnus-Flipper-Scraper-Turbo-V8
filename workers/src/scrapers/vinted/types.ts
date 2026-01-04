export type VintedListing = {
  externalId: string;
  title: string;
  url: string;
  price: {
    amount: number;
    currency: string;
  };
  imageUrl?: string;
  location?: string;
  createdAt?: string;
};

export type VintedScrapeParams = {
  query: string;
  locale?: 'uk' | 'us';
  category?: string;
  pageHtml?: string;
  pageHtmls?: string[];
};

export type VintedScrapeResult = {
  listings: VintedListing[];
  pagination: {
    page: number;
    hasNextPage: boolean;
  };
  classification: VintedClassification;
};

export type VintedClassificationState = 'ok' | 'empty' | 'blocked' | 'login' | 'consent' | 'rate_limited';

export type VintedClassification = {
  state: VintedClassificationState;
  reason?: string;
};
