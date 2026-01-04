import { db, schema } from '../lib/db';
import { eq, sql, and } from 'drizzle-orm';

export const analyticsService = {
  async getDashboardStats(userId: string) {
    // Basic aggregation
    // In production, these should be cached or computed via materialized views
    const totalDeals = await db.execute(sql`
        SELECT count(*) as count FROM ${schema.deals} 
        WHERE user_id = ${userId}
    `);

    const activeMonitors = await db.execute(sql`
        SELECT count(*) as count FROM ${schema.monitors}
        WHERE user_id = ${userId} AND status = 'active'
    `);

    const user = await db.query.users.findFirst({
        where: eq(schema.users.id, userId)
    });

    return {
      today: {
        dealsFound: user?.totalDealsFound || 0, // Using user aggregated field for simplicity
        jobsRun: user?.jobsUsedToday || 0,
      },
      total: {
        deals: Number(totalDeals[0].count),
        monitors: Number(activeMonitors[0].count),
        profitPotential: user?.totalProfitTracked || 0,
      }
    };
  }
};
