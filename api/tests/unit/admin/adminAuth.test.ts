import { describe, expect, it } from 'vitest';
import { isAdminUser } from '../../../src/services/adminAuth.service';

const baseUser = { uid: 'user_1' } as any;

describe('admin auth (unit)', () => {
  it('returns true when admin claim present', () => {
    expect(isAdminUser({ ...baseUser, admin: true })).toBe(true);
  });

  it('returns true when role is admin', () => {
    expect(isAdminUser({ ...baseUser, role: 'admin' })).toBe(true);
  });

  it('returns true when uid listed in ADMIN_USER_IDS', () => {
    process.env.ADMIN_USER_IDS = 'user_1, user_2';
    expect(isAdminUser(baseUser)).toBe(true);
  });

  it('returns false when not admin', () => {
    process.env.ADMIN_USER_IDS = 'user_2';
    expect(isAdminUser(baseUser)).toBe(false);
  });
});
