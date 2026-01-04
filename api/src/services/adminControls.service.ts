import { db, schema } from '../lib/db';
import { eq } from 'drizzle-orm';
import { recordAdminAudit } from './adminAudit.service';
import { getKillSwitchConfig } from './killSwitch.service';
import { getGateDecision, getGateConfig } from './observabilityGate.service';

export type KillSwitchUpdate = {
  scrapersEnabled?: boolean;
  facebookEnabled?: boolean;
  vintedEnabled?: boolean;
  realtimeEnabled?: boolean;
  scheduledEnabled?: boolean;
  manualEnabled?: boolean;
  demoModeEnabled?: boolean;
  demoModeTtlMinutes?: number | null;
};

export const getAdminControls = async () => {
  const killSwitch = await getKillSwitchConfig();
  const gateConfig = await getGateConfig();
  const gateDecision = await getGateDecision();

  const gateStatus = !gateConfig.config.enabled
    ? 'amber'
    : gateDecision.allowed
      ? 'green'
      : 'red';

  return {
    killSwitch: killSwitch.config,
    gate: {
      config: gateConfig.config,
      source: gateConfig.source,
      decision: gateDecision,
      status: gateStatus,
    },
    stripeMode: process.env.STRIPE_MODE || 'unknown',
  };
};

const resolveDemoExpiry = (enabled: boolean, ttlMinutes?: number | null) => {
  if (!enabled) return null;
  const ttl = typeof ttlMinutes === 'number'
    ? ttlMinutes
    : Number(process.env.DEMO_MODE_TTL_MINUTES || 60);

  if (!Number.isFinite(ttl) || ttl <= 0) {
    return null;
  }

  return new Date(Date.now() + ttl * 60 * 1000);
};

export const updateKillSwitches = async (
  actorUserId: string,
  payload: KillSwitchUpdate,
  env: string
) => {
  const before = await db.query.scraperKillSwitches.findFirst({
    where: eq(schema.scraperKillSwitches.id, 'default'),
  });

  const demoModeEnabled = typeof payload.demoModeEnabled === 'boolean'
    ? payload.demoModeEnabled
    : (before?.demoModeEnabled ?? false);

  const demoModeExpiresAt = resolveDemoExpiry(demoModeEnabled, payload.demoModeTtlMinutes ?? null);

  await db.update(schema.scraperKillSwitches)
    .set({
      scrapersEnabled: payload.scrapersEnabled ?? before?.scrapersEnabled ?? true,
      facebookEnabled: payload.facebookEnabled ?? before?.facebookEnabled ?? true,
      vintedEnabled: payload.vintedEnabled ?? before?.vintedEnabled ?? true,
      realtimeEnabled: payload.realtimeEnabled ?? before?.realtimeEnabled ?? true,
      scheduledEnabled: payload.scheduledEnabled ?? before?.scheduledEnabled ?? true,
      manualEnabled: payload.manualEnabled ?? before?.manualEnabled ?? true,
      demoModeEnabled: demoModeEnabled,
      demoModeExpiresAt: demoModeExpiresAt,
      updatedAt: new Date(),
    })
    .where(eq(schema.scraperKillSwitches.id, 'default'));

  const after = await db.query.scraperKillSwitches.findFirst({
    where: eq(schema.scraperKillSwitches.id, 'default'),
  });

  await recordAdminAudit({
    actorUserId,
    action: 'kill_switch_update',
    target: 'scraper_kill_switches',
    beforeState: before || null,
    afterState: after || null,
    env,
  });

  return after;
};
