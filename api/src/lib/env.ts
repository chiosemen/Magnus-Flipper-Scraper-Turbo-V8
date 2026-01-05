import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().optional(),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).optional(),
  CORS_ORIGIN: z.string().optional(),
  STRIPE_MODE: z.enum(['test', 'live']).optional(),
  STRIPE_TEST_SECRET_KEY: z.string().optional(),
  STRIPE_LIVE_SECRET_KEY: z.string().optional(),
  STRIPE_PRICE_ID_BASIC: z.string().optional(),
  STRIPE_PRICE_ID_PRO: z.string().optional(),
  STRIPE_PRICE_ID_ELITE: z.string().optional(),
  STRIPE_PRICE_ID_ENTERPRISE: z.string().optional(),
  STRIPE_SUCCESS_URL: z.string().optional(),
  STRIPE_CANCEL_URL: z.string().optional(),
  STRIPE_PORTAL_RETURN_URL: z.string().optional(),
  WORKER_SHARED_SECRET: z.string().optional(),
  WORKER_SERVICE_URL: z.string().optional(),
  GCP_PROJECT_ID: z.string().optional(),
  GCP_LOCATION: z.string().optional(),
  GCP_QUEUE_NAME: z.string().optional(),
  DEMO_GCP_QUEUE_NAME: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_BASE64: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  FIREBASE_AUTH_EMULATOR_HOST: z.string().optional(),
  FIRESTORE_EMULATOR_HOST: z.string().optional(),
  FIREBASE_EMULATOR_HUB: z.string().optional(),
});

type EnvShape = z.infer<typeof EnvSchema>;

const formatZodIssues = (issues: z.ZodIssue[]) =>
  issues.map((issue) => issue.path.join('.') || issue.message).join(', ');

const pushMissing = (missing: string[], key: string, value?: string | null) => {
  if (!value) missing.push(key);
};

export const validateApiEnv = (env: NodeJS.ProcessEnv = process.env): EnvShape => {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const message = formatZodIssues(parsed.error.issues);
    throw new Error(`Invalid API environment configuration: ${message}`);
  }

  const config = parsed.data;
  const missing: string[] = [];

  if (config.NODE_ENV === 'production') {
    if (!config.CORS_ORIGIN || config.CORS_ORIGIN === '*') {
      missing.push('CORS_ORIGIN');
    }
    pushMissing(missing, 'REDIS_URL', config.REDIS_URL);
    pushMissing(missing, 'WORKER_SHARED_SECRET', config.WORKER_SHARED_SECRET);
    pushMissing(missing, 'WORKER_SERVICE_URL', config.WORKER_SERVICE_URL);
    pushMissing(missing, 'GCP_PROJECT_ID', config.GCP_PROJECT_ID);
    pushMissing(missing, 'GCP_LOCATION', config.GCP_LOCATION);
    pushMissing(missing, 'GCP_QUEUE_NAME', config.GCP_QUEUE_NAME);

    if (config.STRIPE_MODE !== 'live') {
      missing.push('STRIPE_MODE');
    }
    pushMissing(missing, 'STRIPE_LIVE_SECRET_KEY', config.STRIPE_LIVE_SECRET_KEY);
    pushMissing(missing, 'STRIPE_PRICE_ID_BASIC', config.STRIPE_PRICE_ID_BASIC);
    pushMissing(missing, 'STRIPE_PRICE_ID_PRO', config.STRIPE_PRICE_ID_PRO);
    pushMissing(missing, 'STRIPE_PRICE_ID_ELITE', config.STRIPE_PRICE_ID_ELITE);
    pushMissing(missing, 'STRIPE_PRICE_ID_ENTERPRISE', config.STRIPE_PRICE_ID_ENTERPRISE);
    pushMissing(missing, 'STRIPE_SUCCESS_URL', config.STRIPE_SUCCESS_URL);
    pushMissing(missing, 'STRIPE_CANCEL_URL', config.STRIPE_CANCEL_URL);
    pushMissing(missing, 'STRIPE_PORTAL_RETURN_URL', config.STRIPE_PORTAL_RETURN_URL);

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
    throw new Error(`Missing required API env vars: ${missing.join(', ')}`);
  }

  return config;
};
