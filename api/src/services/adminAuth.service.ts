import { DecodedIdToken } from 'firebase-admin/auth';

const getAdminUserIds = () => {
  const raw = process.env.ADMIN_USER_IDS || '';
  return raw.split(',').map((value) => value.trim()).filter(Boolean);
};

export const isAdminUser = (user: DecodedIdToken | undefined) => {
  if (!user) return false;

  if ((user as any).admin === true) return true;
  if ((user as any).role === 'admin') return true;

  const adminIds = getAdminUserIds();
  return adminIds.includes(user.uid);
};
