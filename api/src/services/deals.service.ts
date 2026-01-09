import { db, schema } from '../lib/db';
import { eq, and, desc, asc, gte, lte, like, sql, ilike } from 'drizzle-orm';
import { DealFilters, Deal, CreateDeal, UpdateDeal } from '@repo/types';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { pricingService } from './pricing.service';

/**
 * Normalizes timestamp fields (Date | string | number) to Date objects for Drizzle ORM
 */
const normalizeDate = (value: Date | string | number | undefined | null): Date | null | undefined => {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (value instanceof Date) return value;
  return new Date(value);
};

export const dealsService = {
  async listDeals(userId: string, filters: DealFilters) {
    const conditions = [eq(schema.deals.userId, userId)];

    if (filters.query) {
      conditions.push(ilike(schema.deals.title, `%${filters.query}%`));
    }
    if (filters.minPrice) {
      conditions.push(gte(schema.deals.listPrice, filters.minPrice));
    }
    if (filters.maxPrice) {
      conditions.push(lte(schema.deals.listPrice, filters.maxPrice));
    }
    if (filters.minScore) {
      conditions.push(gte(schema.deals.dealScore, filters.minScore));
    }
    if (filters.sources && filters.sources.length > 0) {
      // In Drizzle, 'inArray' needs explicit handling if array is dynamic
      // For now, simpler implementation
      // conditions.push(inArray(schema.deals.source, filters.sources));
    }

    const sortKey = filters.sortBy || 'date';
    const sortCol =
      sortKey === 'date' ? schema.deals.createdAt :
      sortKey === 'price' ? schema.deals.listPrice :
      sortKey === 'profit' ? schema.deals.profitAmount :
      sortKey === 'score' ? schema.deals.dealScore :
      schema.deals.createdAt;
    const sortDir = filters.sortOrder === 'asc' ? asc : desc;

    const limit = filters.limit || 20;
    const offset = ((filters.page || 1) - 1) * limit;

    const data = await db.query.deals.findMany({
      where: and(...conditions),
      orderBy: [sortDir(sortCol)],
      limit: limit,
      offset: offset,
    });

    // Count total for pagination
    // Note: 'postgres' driver count requires raw SQL or separate query
    const totalRes = await db.execute(sql`
      SELECT count(*) as count FROM ${schema.deals} 
      WHERE user_id = ${userId}
    `);
    const total = Number(totalRes[0].count);

    return {
      items: data as unknown as Deal[],
      pagination: {
        page: filters.page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: offset > 0
      }
    };
  },

  async getDeal(dealId: string, userId: string) {
    const deal = await db.query.deals.findFirst({
      where: and(eq(schema.deals.id, dealId), eq(schema.deals.userId, userId))
    });

    if (!deal) throw new NotFoundError('Deal not found');
    return deal as unknown as Deal;
  },

  async updateDeal(dealId: string, userId: string, data: UpdateDeal) {
    const existing = await this.getDeal(dealId, userId);

    // Normalize date fields for Drizzle ORM
    const normalizedData = {
      ...data,
      firstSeenAt: data.firstSeenAt ? normalizeDate(data.firstSeenAt) : undefined,
      lastSeenAt: data.lastSeenAt ? normalizeDate(data.lastSeenAt) : undefined,
      scrapedAt: data.scrapedAt ? normalizeDate(data.scrapedAt) : undefined,
      updatedAt: new Date(),
    };

    const [updated] = await db.update(schema.deals)
      .set(normalizedData as any)
      .where(eq(schema.deals.id, dealId))
      .returning();

    return updated as unknown as Deal;
  },

  async deleteDeal(dealId: string, userId: string) {
    const existing = await this.getDeal(dealId, userId);
    await db.delete(schema.deals).where(eq(schema.deals.id, dealId));
  },

  async markPurchased(dealId: string, userId: string) {
    return this.updateDeal(dealId, userId, { status: 'purchased' });
  },

  async flagDeal(dealId: string, userId: string) {
    return this.updateDeal(dealId, userId, { status: 'flagged' });
  },
  
  async createDealInternal(dealData: CreateDeal) {
    // This is mostly used by workers, but included for completeness
    const score = pricingService.calculateDealScore(dealData);

    // Normalize date fields for Drizzle ORM
    const normalizedData = {
      ...dealData,
      firstSeenAt: normalizeDate(dealData.firstSeenAt),
      lastSeenAt: normalizeDate(dealData.lastSeenAt),
      scrapedAt: normalizeDate(dealData.scrapedAt),
      dealScore: score,
    };

    const [created] = await db.insert(schema.deals)
      .values(normalizedData as any)
      .returning();
    return created;
  }
};
