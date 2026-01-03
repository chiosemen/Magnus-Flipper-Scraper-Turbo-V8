import { Deal } from '@repo/types';

export const pricingService = {
  calculateDealScore(deal: Partial<Deal>): number {
    let score = 50; // Base score

    if (deal.profitMargin) {
      if (deal.profitMargin > 0.5) score += 30;
      else if (deal.profitMargin > 0.3) score += 20;
      else if (deal.profitMargin > 0.1) score += 10;
    }

    if (deal.condition === 'new' || deal.condition === 'like_new') {
      score += 10;
    } else if (deal.condition === 'poor' || deal.condition === 'for_parts') {
      score -= 10;
    }

    if (deal.sellerRating && deal.sellerRating > 4.5) {
      score += 5;
    }

    // Cap between 0 and 100
    return Math.min(100, Math.max(0, score));
  },

  calculateProfit(listPrice: number, marketPrice: number, fees: number = 0) {
    const grossProfit = marketPrice - listPrice - fees;
    const margin = marketPrice > 0 ? grossProfit / marketPrice : 0;
    return {
      profitAmount: Number(grossProfit.toFixed(2)),
      profitMargin: Number(margin.toFixed(4)),
    };
  }
};
