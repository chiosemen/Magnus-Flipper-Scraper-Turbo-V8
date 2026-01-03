import { db, schema } from '../lib/db';
import { eq } from 'drizzle-orm';
import { DecodedIdToken } from 'firebase-admin/auth';
import { auth } from '../lib/firebase';
import { User } from '@repo/types';

export const authService = {
  async ensureUserExists(firebaseUser: DecodedIdToken): Promise<User> {
    const { uid, email, picture, name } = firebaseUser;

    if (!email) {
      throw new Error('Email is required for registration');
    }

    // Check if user exists
    const existing = await db.query.users.findFirst({
      where: eq(schema.users.id, uid),
    });

    if (existing) {
      // Update last login
      await db.update(schema.users)
        .set({ lastLoginAt: new Date() })
        .where(eq(schema.users.id, uid));
      
      // Cast to User type (drizzle types generally match but for safety)
      return existing as unknown as User;
    }

    // Create new user
    const newUser = {
      id: uid,
      email,
      displayName: name || email.split('@')[0],
      photoURL: picture,
      tier: 'free' as const,
      settings: {
        notifications: { email: true, push: true, sms: false, minDealScore: 50 },
        display: { theme: 'system' as const, currency: 'USD', timezone: 'UTC' },
        scraping: {}
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
      quotaResetAt: new Date(Date.now() + 86400000), // Next day
    };

    await db.insert(schema.users).values(newUser);

    return newUser as unknown as User;
  },

  async getUserProfile(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });
    return user as unknown as User | undefined;
  },

  async updateUserProfile(userId: string, data: Partial<User>) {
    const [updated] = await db.update(schema.users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.users.id, userId))
      .returning();
    return updated as unknown as User;
  },

  async revokeUserTokens(userId: string) {
    await auth.revokeRefreshTokens(userId);
  }
};
