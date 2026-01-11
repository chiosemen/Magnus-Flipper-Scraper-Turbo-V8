# Environment Variables Reference

## Overview

This document provides a comprehensive list of all environment variables used in the Magnus Flipper AI monorepo.

## Required vs Optional

- **[REQUIRED]** - Must be set for the application to start
- **[OPTIONAL]** - Has sensible defaults or fallback behavior

## Environment Variables by Service

### API Service

#### Core Configuration
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | - | Options: `development`, `test`, `production` |
| `PORT` | No | `8080` | HTTP server port |
| `CORS_ORIGIN` | Yes | - | Frontend domain (e.g., `https://app.magnusflipper.ai`) |

#### Database
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |

#### Firebase Auth
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FIREBASE_PROJECT_ID` | Yes | - | Firebase project ID |
| `FIREBASE_PRIVATE_KEY` | Yes | - | Service account private key (JSON escaped) |
| `FIREBASE_CLIENT_EMAIL` | Yes | - | Service account email |

#### Stripe Billing
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STRIPE_MODE` | Yes | - | Options: `test` or `live` |
| `STRIPE_TEST_SECRET_KEY` | Conditional | - | Required if `STRIPE_MODE=test` |
| `STRIPE_LIVE_SECRET_KEY` | Conditional | - | Required if `STRIPE_MODE=live` |
| `STRIPE_WEBHOOK_SECRET` | Yes | - | Webhook signature verification secret |
| `STRIPE_SUCCESS_URL` | Yes | - | Redirect after successful checkout |
| `STRIPE_CANCEL_URL` | Yes | - | Redirect after cancelled checkout |
| `STRIPE_PORTAL_RETURN_URL` | Yes | - | Return URL from customer portal |

#### Redis (Rate Limiting)
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_URL` | No | In-memory | Redis connection URL (e.g., `redis://localhost:6379`) |

#### Google Cloud Platform
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GCP_PROJECT_ID` | Yes | - | GCP project ID |
| `GCP_QUEUE_NAME` | Yes | - | Cloud Tasks queue name |
| `GCP_QUEUE_LOCATION` | Yes | - | Cloud Tasks queue location (e.g., `us-central1`) |

#### Worker Communication
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `WORKER_SERVICE_URL` | Yes | - | Worker service Cloud Run URL |
| `WORKER_SHARED_SECRET` | Yes | - | Shared secret for API→Worker authentication |

---

### Workers Service

#### Core Configuration
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | - | Options: `development`, `test`, `production` |
| `PORT` | No | `8080` | HTTP server port |

#### Database
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |

#### Worker Authentication
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `WORKER_SHARED_SECRET` | Yes | - | Shared secret for API→Worker authentication |

#### Apify Integration
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `APIFY_TOKEN` | Yes | - | Apify API token |
| `APIFY_ACTOR_AMAZON` | No | - | Apify actor ID for Amazon scraper |
| `APIFY_ACTOR_EBAY` | No | - | Apify actor ID for eBay scraper |
| `APIFY_ACTOR_VINTED` | No | - | Apify actor ID for Vinted scraper |

#### Google Cloud Platform
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GCP_PROJECT_ID` | Yes | - | GCP project ID |

---

### Frontend (apps/web)

#### Vite Configuration
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | Yes | - | API base URL (e.g., `https://api.magnusflipper.ai/api`) |

#### Firebase Client
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_FIREBASE_API_KEY` | Yes | - | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | - | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Yes | - | Firebase project ID |

---

### Mobile App (apps/mobile)

#### Expo Configuration
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EXPO_PUBLIC_API_BASE_URL` | Yes | - | API base URL |
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Yes | - | Firebase API key |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | - | Firebase auth domain |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Yes | - | Firebase project ID |

---

## Observability (Optional)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LOG_LEVEL` | No | `info` | Options: `debug`, `info`, `warn`, `error` |
| `GCP_LOGGING_ENABLED` | No | `false` | Enable Cloud Logging integration |

---

## Demo Mode (Development Only)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DEMO_MODE_ENABLED` | No | `false` | Enable demo mode restrictions |
| `DEMO_TIMEOUT_SEC` | No | `30` | Timeout for demo mode jobs (seconds) |

---

## Environment-Specific Examples

### Development (.env.local)
```bash
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/magnus_flipper_dev
FIREBASE_PROJECT_ID=magnus-flipper-dev
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@magnus-flipper-dev.iam.gserviceaccount.com
STRIPE_MODE=test
STRIPE_TEST_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
CORS_ORIGIN=http://localhost:5173
APIFY_TOKEN=apify_api_...
WORKER_SHARED_SECRET=dev-secret
```

### Production (GCP Secret Manager)
```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@/cloudsql/project:region:instance/magnus_flipper_prod
FIREBASE_PROJECT_ID=magnus-flipper-prod
FIREBASE_PRIVATE_KEY=<from Secret Manager>
FIREBASE_CLIENT_EMAIL=<from Secret Manager>
STRIPE_MODE=live
STRIPE_LIVE_SECRET_KEY=<from Secret Manager>
STRIPE_WEBHOOK_SECRET=<from Secret Manager>
CORS_ORIGIN=https://app.magnusflipper.ai
REDIS_URL=redis://10.0.0.1:6379
APIFY_TOKEN=<from Secret Manager>
WORKER_SHARED_SECRET=<from Secret Manager>
```

---

## Security Best Practices

1. **Never commit `.env` files** - Use `.env.example` as a template
2. **Use Secret Manager in production** - Don't pass secrets via environment variables directly
3. **Rotate secrets regularly** - Especially `WORKER_SHARED_SECRET` and API tokens
4. **Validate required vars on startup** - Fail fast if critical vars are missing
5. **Use different secrets per environment** - Staging and production should have separate credentials

---

## Troubleshooting

### Common Issues

**Issue:** `CORS_ORIGIN environment variable is required`
**Solution:** Set `CORS_ORIGIN` to your frontend domain (e.g., `https://app.magnusflipper.ai`)

**Issue:** `STRIPE_MODE must be set to "test" or "live"`
**Solution:** Set `STRIPE_MODE=test` or `STRIPE_MODE=live` explicitly

**Issue:** `Stripe live mode is blocked outside production`
**Solution:** Only use `STRIPE_MODE=live` when `NODE_ENV=production`

**Issue:** Database connection fails
**Solution:** Verify `DATABASE_URL` is correct and database is accessible

---

## Validation Script

Run this script to validate all required environment variables are set:

```bash
#!/bin/bash
# validate-env.sh

REQUIRED_VARS=(
  "NODE_ENV"
  "DATABASE_URL"
  "CORS_ORIGIN"
  "FIREBASE_PROJECT_ID"
  "STRIPE_MODE"
  "WORKER_SHARED_SECRET"
)

MISSING=()

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    MISSING+=("$var")
  fi
done

if [ ${#MISSING[@]} -ne 0 ]; then
  echo "❌ Missing required environment variables:"
  printf '  - %s\n' "${MISSING[@]}"
  exit 1
else
  echo "✅ All required environment variables are set"
  exit 0
fi
```

Usage:
```bash
source .env.local && ./validate-env.sh
```
