import { db, schema } from '../lib/db';
import { eq } from 'drizzle-orm';
import { AppError } from '../utils/errors';
import { logger } from '@repo/logger';
import { recordAdminAudit } from './adminAudit.service';
import { chooseCanary, normalizeRampPercent } from './canary.logic';
import { getGateDecision } from './observabilityGate.service';
import { OBSERVABILITY_GATE_ERROR_CODES } from './observabilityGate.logic';

export type CanaryConfig = {
  rampPercent: number;
  previousPercent: number;
};

const CACHE_TTL_MS = 30_000;
let cachedConfig: { target: string; config: CanaryConfig } | null = null;
let cachedAt = 0;

const loadConfig = async (target: string): Promise<CanaryConfig> => {
  const row = await db.query.canaryRamps.findFirst({
    where: eq(schema.canaryRamps.id, target),
  });

  if (row) {
    return {
      rampPercent: Number(row.rampPercent || 0),
      previousPercent: Number(row.previousPercent || 0),
    };
  }

  const fallback = await db.query.canaryRamps.findFirst({
    where: eq(schema.canaryRamps.id, 'default'),
  });

  return {
    rampPercent: Number(fallback?.rampPercent || 0),
    previousPercent: Number(fallback?.previousPercent || 0),
  };
};

export const getCanaryConfig = async (target: string): Promise<CanaryConfig> => {
  const now = Date.now();
  if (cachedConfig && cachedConfig.target === target && now - cachedAt < CACHE_TTL_MS) {
    return cachedConfig.config;
  }

  const config = await loadConfig(target);
  cachedConfig = { target, config };
  cachedAt = now;
  return config;
};

export const assignCanaryMeta = async (target: string) => {
  const config = await getCanaryConfig(target);
  const rampPercent = normalizeRampPercent(config.rampPercent);
  const canary = rampPercent > 0 ? chooseCanary(rampPercent) : false;
  return { canary, rampPercent };
};

const rollbackCanaryRamp = async (target: string) => {
  const config = await getCanaryConfig(target);
  if (config.rampPercent === config.previousPercent) return;

  await db.update(schema.canaryRamps)
    .set({
      rampPercent: config.previousPercent,
      updatedAt: new Date(),
    })
    .where(eq(schema.canaryRamps.id, target));

  logger.warn('Canary ramp rolled back due to gate trip', {
    target,
    from: config.rampPercent,
    to: config.previousPercent,
  });
};

export const assertGateOpenForDispatch = async (target: string) => {
  const decision = await getGateDecision();

  if (!decision.allowed) {
    await rollbackCanaryRamp(target);
    throw new AppError(
      'Observability gate closed',
      503,
      decision.code || OBSERVABILITY_GATE_ERROR_CODES.GATE_CLOSED,
      { reasons: decision.reasons }
    );
  }
};

export const updateCanaryRamp = async (
  target: string,
  rampPercent: number,
  audit?: { actorUserId: string; env: string }
) => {
  const normalized = normalizeRampPercent(rampPercent);
  const existing = await db.query.canaryRamps.findFirst({
    where: eq(schema.canaryRamps.id, target),
  });

  const previousPercent = existing ? Number(existing.rampPercent || 0) : 0;

  if (existing) {
    await db.update(schema.canaryRamps)
      .set({
        rampPercent: normalized,
        previousPercent,
        updatedAt: new Date(),
      })
      .where(eq(schema.canaryRamps.id, target));
  } else {
    await db.insert(schema.canaryRamps)
      .values({
        id: target,
        rampPercent: normalized,
        previousPercent,
        updatedAt: new Date(),
      });
  }

  const after = await db.query.canaryRamps.findFirst({
    where: eq(schema.canaryRamps.id, target),
  });

  if (audit) {
    await recordAdminAudit({
      actorUserId: audit.actorUserId,
      action: 'canary_ramp_update',
      target: `canary_ramps:${target}`,
      beforeState: existing || null,
      afterState: after || null,
      env: audit.env,
    });
  }

  return { rampPercent: normalized, previousPercent };
};
