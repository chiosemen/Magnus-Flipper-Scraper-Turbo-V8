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

export type VintedClassificationState = 'OK' | 'BLOCKED' | 'LOGIN' | 'CONSENT' | 'RATE_LIMIT';

export type VintedClassification = {
  state: VintedClassificationState;
  reason?: string;
};
