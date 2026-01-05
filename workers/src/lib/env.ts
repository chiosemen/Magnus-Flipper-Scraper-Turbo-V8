import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().optional(),
  WORKER_SHARED_SECRET: z.string().optional(),
  DATABASE_URL: z.string().min(1).optional(),
  REDIS_URL: z.string().min(1).optional(),
  FIREBASE_SERVICE_ACCOUNT_BASE64: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  FIREBASE_EMULATOR_HUB: z.string().optional(),
  FIRESTORE_EMULATOR_HOST: z.string().optional(),
  FIREBASE_AUTH_EMULATOR_HOST: z.string().optional(),
  PROXY_URL: z.string().optional(),
  HEADLESS: z.string().optional(),
  ANTIBOT_FINGERPRINT: z.string().optional(),
});

type EnvShape = z.infer<typeof EnvSchema>;

const formatZodIssues = (issues: z.ZodIssue[]) =>
  issues.map((issue) => issue.path.join('.') || issue.message).join(', ');

const pushMissing = (missing: string[], key: string, value?: string | null) => {
  if (!value) missing.push(key);
};

export const validateWorkerEnv = (env: NodeJS.ProcessEnv = process.env): EnvShape => {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const message = formatZodIssues(parsed.error.issues);
    throw new Error(`Invalid worker environment configuration: ${message}`);
  }

  const config = parsed.data;
  const missing: string[] = [];

  if (config.NODE_ENV === 'production') {
    pushMissing(missing, 'WORKER_SHARED_SECRET', config.WORKER_SHARED_SECRET);
    pushMissing(missing, 'DATABASE_URL', config.DATABASE_URL);
    pushMissing(missing, 'REDIS_URL', config.REDIS_URL);

    const hasFirebaseCreds = !!(
      config.FIREBASE_SERVICE_ACCOUNT_BASE64 ||
      config.GOOGLE_APPLICATION_CREDENTIALS ||
      config.FIREBASE_EMULATOR_HUB
    );
    if (!hasFirebaseCreds) {
      missing.push('FIREBASE_SERVICE_ACCOUNT_BASE64_OR_ADC');
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required worker env vars: ${missing.join(', ')}`);
  }

  return config;
};
