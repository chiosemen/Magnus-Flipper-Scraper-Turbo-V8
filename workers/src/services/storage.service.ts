import { db, schema } from '../lib/db';
import { CreateDeal, Deal } from '@repo/types';
import { eq, and } from 'drizzle-orm';
import { logger } from '@repo/logger';

export class StorageService {
  async saveDeal(deal: CreateDeal, jobId: string, userId: string): Promise<void> {
    try {
      // Check duplicate by source + sourceId
      const existing = await db.query.deals.findFirst({
        where: and(
          eq(schema.deals.userId, userId),
          eq(schema.deals.source, deal.source),
          eq(schema.deals.sourceId, deal.sourceId)
        )
      });

      if (existing) {
        // Update lastSeenAt and check price
        await db.update(schema.deals)
          .set({ 
            lastSeenAt: new Date(),
            scrapedAt: new Date(),
            listPrice: deal.listPrice, // Update price if changed
            updatedAt: new Date(),
          })
          .where(eq(schema.deals.id, existing.id));
          
        if (existing.listPrice !== deal.listPrice) {
            // Record price history
            await db.insert(schema.priceHistory).values({
                dealId: existing.id,
                price: deal.listPrice,
                currency: deal.currency
            });
        }
      } else {
        // Create new - normalize timestamps to Date objects for database
        const [newDeal] = await db.insert(schema.deals).values({
          ...deal,
          userId,
          status: 'active',
          // Normalize timestamp fields (Timestamp type allows Date | string | number, but DB expects Date)
          firstSeenAt: deal.firstSeenAt ? new Date(deal.firstSeenAt) : new Date(),
          lastSeenAt: deal.lastSeenAt ? new Date(deal.lastSeenAt) : new Date(),
          scrapedAt: deal.scrapedAt ? new Date(deal.scrapedAt) : new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any).returning();
        
        // Initial price history
        await db.insert(schema.priceHistory).values({
            dealId: newDeal.id,
            price: deal.listPrice,
            currency: deal.currency
        });
      }
    } catch (error) {
      logger.error('Failed to store deal', error as Error);
      throw error;
    }
  }
}
