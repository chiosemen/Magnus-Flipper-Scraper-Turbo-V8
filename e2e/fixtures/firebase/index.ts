/**
 * Firebase Test User Fixtures
 *
 * Pre-configured test users for E2E testing.
 * Use these users to test various tier levels and permissions.
 */

import testUsersData from './test-users.json';

export interface FirebaseTestUser {
  uid: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  tier: 'free' | 'basic' | 'pro' | 'elite' | 'enterprise';
  stripeCustomerId: string;
  stripeSubscriptionId?: string;
  isAdmin?: boolean;
  createdAt: string;
}

export const TEST_USERS: FirebaseTestUser[] = testUsersData.users as FirebaseTestUser[];
export const CUSTOM_TOKENS: Record<string, string> = testUsersData.customTokens;

/**
 * Get a test user by tier
 */
export function getTestUserByTier(tier: string): FirebaseTestUser | undefined {
  return TEST_USERS.find((user) => user.tier === tier && !user.isAdmin);
}

/**
 * Get a test user by UID
 */
export function getTestUserByUid(uid: string): FirebaseTestUser | undefined {
  return TEST_USERS.find((user) => user.uid === uid);
}

/**
 * Get admin test user
 */
export function getAdminTestUser(): FirebaseTestUser | undefined {
  return TEST_USERS.find((user) => user.isAdmin);
}

/**
 * Get custom token for a test user
 */
export function getCustomToken(uid: string): string | undefined {
  return CUSTOM_TOKENS[uid];
}

/**
 * Test user shortcuts
 */
export const FREE_TIER_USER = getTestUserByTier('free')!;
export const BASIC_TIER_USER = getTestUserByTier('basic')!;
export const PRO_TIER_USER = getTestUserByTier('pro')!;
export const ELITE_TIER_USER = getTestUserByTier('elite')!;
export const ENTERPRISE_TIER_USER = getTestUserByTier('enterprise')!;
export const ADMIN_USER = getAdminTestUser()!;

/**
 * Tier limits for testing quota enforcement
 */
export const TIER_LIMITS = {
  free: {
    maxMonitors: 3,
    maxConcurrent: 1,
    refreshInterval: '12h',
  },
  basic: {
    maxMonitors: 25,
    maxConcurrent: 2,
    refreshInterval: '12h',
  },
  pro: {
    maxMonitors: 60,
    maxConcurrent: 3,
    refreshInterval: '6h',
  },
  elite: {
    maxMonitors: 100,
    maxConcurrent: 5,
    refreshInterval: '3h',
  },
  enterprise: {
    maxMonitors: 180,
    maxConcurrent: 8,
    refreshInterval: '2h',
  },
} as const;
