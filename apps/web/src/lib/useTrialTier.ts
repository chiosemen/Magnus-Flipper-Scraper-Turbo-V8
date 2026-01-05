import { useAuthStore } from '../stores/authStore';

/**
 * Trial Tier Detection (UI-Only)
 *
 * Constitutional-safe: This hook only reads user metadata.
 * No backend calls, no execution logic, no business rules.
 *
 * Trial users CAN:
 * - View listings (live or cached)
 * - View scores + signals
 * - Open explainability panels
 * - Create alert rules (authoring only)
 *
 * Trial users CANNOT:
 * - Execute alerts
 * - Trigger notifications
 * - Perform arbitrage actions
 * - Enable automation
 */

export interface TrialTierState {
  /** True if user is in trial mode */
  isTrial: boolean;

  /** True if trial has expired */
  isExpired: boolean;

  /** Days remaining in trial (null if not trial or expired) */
  daysRemaining: number | null;

  /** Current tier name */
  tier: string;
}

export function useTrialTier(): TrialTierState {
  const user = useAuthStore((s) => s.user);

  // Allow env override for demo purposes (UI-only flag)
  const forceTrial = (import.meta as any).env.VITE_TRIAL_MODE === 'true';

  if (!user && !forceTrial) {
    return {
      isTrial: false,
      isExpired: false,
      daysRemaining: null,
      tier: 'none',
    };
  }

  // Env flag override (for demo/testing)
  if (forceTrial) {
    return {
      isTrial: true,
      isExpired: false,
      daysRemaining: 7,
      tier: 'trial',
    };
  }

  const tier = user!.tier || 'free';
  const tierExpiresAt = user!.tierExpiresAt;

  // Trial detection: 'free' tier with expiration date
  const isTrial = tier === 'free' && !!tierExpiresAt;

  if (!isTrial) {
    return {
      isTrial: false,
      isExpired: false,
      daysRemaining: null,
      tier,
    };
  }

  // Calculate expiration
  const expiresAt = new Date(tierExpiresAt!);
  const now = new Date();
  const isExpired = expiresAt.getTime() <= now.getTime();

  const daysRemaining = isExpired
    ? 0
    : Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return {
    isTrial: true,
    isExpired,
    daysRemaining,
    tier: 'trial',
  };
}

/**
 * Simple helper for "can this user execute actions?"
 * UI-only gating - does NOT affect backend permissions
 */
export function canExecuteActions(trialState: TrialTierState): boolean {
  // Trial users cannot execute
  if (trialState.isTrial) return false;

  // Paid tiers can execute
  if (trialState.tier === 'pro' || trialState.tier === 'enterprise') return true;

  // Free tier (non-trial) has limited execution
  return false;
}
