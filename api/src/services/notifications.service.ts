import { Deal, Monitor, User } from '@repo/types';
import { logger } from '@repo/logger';
import { db, schema } from '../lib/db';
import { eq } from 'drizzle-orm';

export const notificationsService = {
  async sendDealAlert(userId: string, deal: Deal, monitor: Monitor) {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId)
    });

    if (!user) return;

    logger.info(`Sending alert for deal ${deal.id} to user ${userId}`);

    // Create In-App Alert
    if (monitor.notifyInApp) {
      await db.insert(schema.alerts).values({
        userId,
        dealId: deal.id,
        monitorId: monitor.id,
        type: 'new_deal',
        message: `New deal found: ${deal.title} for ${deal.currency}${deal.listPrice}`,
        sentVia: ['in_app'],
      });
    }

    // External notifications would go here (SendGrid, Twilio, FCM)
    if (monitor.notifyEmail && user.email) {
      logger.info(`[MOCK] Sending Email to ${user.email}`);
    }
  }
};
