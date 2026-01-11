# Production Deployment Guide

## Quick Start

This guide walks you through deploying Magnus Flipper AI to Google Cloud Run.

**Prerequisites:**
- Google Cloud Platform account
- `gcloud` CLI installed and authenticated
- GitHub repository with secrets configured
- Domain registered (for custom domains)

**Estimated Time:** 4-6 hours for first deployment

---

## Step 1: Apply Production Readiness Patches

All critical patches have been created and are ready to commit:

```bash
# Verify patches are present
ls -la api/Dockerfile
ls -la workers/Dockerfile
ls -la .env.example
ls -la .github/workflows/deploy-api.yml
ls -la .github/workflows/deploy-workers.yml

# Run tests to ensure patches didn't break anything
pnpm test:unit

# Commit patches
git add .
git commit -m "feat: add production deployment infrastructure

- Add Dockerfiles for API and Workers (Cloud Run ready)
- Add .env.example with all 46 environment variables
- Add GitHub Actions deployment workflows
- Fix CORS to require CORS_ORIGIN env var (fail-closed)
- Add environment variable documentation

BREAKING CHANGE: CORS_ORIGIN is now required
"

git push origin claude/production-readiness-audit-oXsOD
```

---

## Step 2: Set Up Google Cloud Platform

### 2.1 Create GCP Project

```bash
# Create production project
gcloud projects create magnus-flipper-ai-prod --name="Magnus Flipper AI - Production"

# Set as default
gcloud config set project magnus-flipper-ai-prod

# Enable billing (replace BILLING_ACCOUNT_ID)
gcloud beta billing projects link magnus-flipper-ai-prod \
  --billing-account=BILLING_ACCOUNT_ID
```

### 2.2 Enable Required APIs

```bash
# Enable all required GCP APIs
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  cloudtasks.googleapis.com \
  secretmanager.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  artifactregistry.googleapis.com
```

### 2.3 Create Service Account

```bash
# Create service account for GitHub Actions
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions Deployment"

# Grant necessary permissions
gcloud projects add-iam-policy-binding magnus-flipper-ai-prod \
  --member="serviceAccount:github-actions@magnus-flipper-ai-prod.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding magnus-flipper-ai-prod \
  --member="serviceAccount:github-actions@magnus-flipper-ai-prod.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding magnus-flipper-ai-prod \
  --member="serviceAccount:github-actions@magnus-flipper-ai-prod.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Create and download key
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions@magnus-flipper-ai-prod.iam.gserviceaccount.com

# Save this key - you'll add it to GitHub Secrets
cat github-actions-key.json
```

---

## Step 3: Provision Database (Cloud SQL)

### 3.1 Create PostgreSQL Instance

```bash
# Create Cloud SQL instance (db-g1-small recommended for 500 users)
gcloud sql instances create magnus-flipper-db \
  --database-version=POSTGRES_14 \
  --tier=db-g1-small \
  --region=us-central1 \
  --root-password=CHOOSE_STRONG_PASSWORD \
  --backup \
  --backup-start-time=03:00 \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=4

# Create database
gcloud sql databases create magnus_flipper_prod \
  --instance=magnus-flipper-db

# Get connection name (needed for DATABASE_URL)
gcloud sql instances describe magnus-flipper-db --format="value(connectionName)"
# Output: magnus-flipper-ai-prod:us-central1:magnus-flipper-db
```

### 3.2 Create Database User

```bash
# Create application user
gcloud sql users create app_user \
  --instance=magnus-flipper-db \
  --password=CHOOSE_STRONG_PASSWORD

# Connection string format:
# postgresql://app_user:PASSWORD@/cloudsql/magnus-flipper-ai-prod:us-central1:magnus-flipper-db/magnus_flipper_prod
```

---

## Step 4: Provision Redis (Optional but Recommended)

```bash
# Create Memorystore instance (1GB standard tier)
gcloud redis instances create magnus-flipper-redis \
  --size=1 \
  --region=us-central1 \
  --redis-version=redis_6_x

# Get connection info
gcloud redis instances describe magnus-flipper-redis \
  --region=us-central1 \
  --format="value(host,port)"

# Connection string format:
# redis://HOST:PORT
```

---

## Step 5: Create Secrets in Secret Manager

```bash
# Create all required secrets
echo -n "postgresql://app_user:PASSWORD@/cloudsql/..." | \
  gcloud secrets create DATABASE_URL --data-file=-

echo -n "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n" | \
  gcloud secrets create FIREBASE_PRIVATE_KEY --data-file=-

echo -n "sk_live_..." | \
  gcloud secrets create STRIPE_LIVE_SECRET_KEY --data-file=-

echo -n "whsec_..." | \
  gcloud secrets create STRIPE_WEBHOOK_SECRET --data-file=-

echo -n "redis://HOST:PORT" | \
  gcloud secrets create REDIS_URL --data-file=-

echo -n "apify_api_..." | \
  gcloud secrets create APIFY_TOKEN --data-file=-

# Generate a strong random secret for worker authentication
openssl rand -base64 32 | \
  gcloud secrets create WORKER_SHARED_SECRET --data-file=-

# Create service account for Cloud Run
gcloud iam service-accounts create api-service \
  --display-name="API Service"

# Grant secret access
for secret in DATABASE_URL FIREBASE_PRIVATE_KEY STRIPE_LIVE_SECRET_KEY STRIPE_WEBHOOK_SECRET REDIS_URL; do
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:api-service@magnus-flipper-ai-prod.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
done

# Same for workers
gcloud iam service-accounts create worker-service \
  --display-name="Worker Service"

for secret in DATABASE_URL APIFY_TOKEN WORKER_SHARED_SECRET; do
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:worker-service@magnus-flipper-ai-prod.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
done
```

---

## Step 6: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add the following secrets:

```
GCP_PROJECT_ID = magnus-flipper-ai-prod
GCP_SA_KEY = <contents of github-actions-key.json>
```

---

## Step 7: Run Database Migrations

```bash
# Install Cloud SQL Proxy
wget https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 -O cloud_sql_proxy
chmod +x cloud_sql_proxy

# Start proxy (in background)
./cloud_sql_proxy -instances=magnus-flipper-ai-prod:us-central1:magnus-flipper-db=tcp:5432 &

# Set DATABASE_URL for local migration
export DATABASE_URL="postgresql://app_user:PASSWORD@localhost:5432/magnus_flipper_prod"

# Run migrations
pnpm --filter @repo/database migrate

# Verify tables created
psql $DATABASE_URL -c "\dt"

# Stop proxy
killall cloud_sql_proxy
```

---

## Step 8: Deploy to Cloud Run

### 8.1 Initial Manual Deployment (Testing)

```bash
# Build and push API image
docker build -t gcr.io/magnus-flipper-ai-prod/api:latest ./api
docker push gcr.io/magnus-flipper-ai-prod/api:latest

# Deploy API
gcloud run deploy api \
  --image=gcr.io/magnus-flipper-ai-prod/api:latest \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated \
  --memory=1Gi \
  --cpu=1 \
  --timeout=300 \
  --concurrency=80 \
  --min-instances=1 \
  --max-instances=10 \
  --service-account=api-service@magnus-flipper-ai-prod.iam.gserviceaccount.com \
  --set-env-vars="NODE_ENV=production,CORS_ORIGIN=https://app.magnusflipper.ai" \
  --set-secrets="DATABASE_URL=DATABASE_URL:latest,FIREBASE_PRIVATE_KEY=FIREBASE_PRIVATE_KEY:latest,STRIPE_LIVE_SECRET_KEY=STRIPE_LIVE_SECRET_KEY:latest,STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET:latest,REDIS_URL=REDIS_URL:latest"

# Get API URL
gcloud run services describe api \
  --platform=managed \
  --region=us-central1 \
  --format='value(status.url)'

# Test health check
curl https://api-xyz-uc.a.run.app/api/health/
curl https://api-xyz-uc.a.run.app/api/health/ready
```

### 8.2 Deploy Workers

```bash
# Build and push workers image
docker build -t gcr.io/magnus-flipper-ai-prod/workers:latest ./workers
docker push gcr.io/magnus-flipper-ai-prod/workers:latest

# Deploy workers
gcloud run deploy workers \
  --image=gcr.io/magnus-flipper-ai-prod/workers:latest \
  --platform=managed \
  --region=us-central1 \
  --no-allow-unauthenticated \
  --memory=2Gi \
  --cpu=2 \
  --timeout=600 \
  --concurrency=10 \
  --min-instances=0 \
  --max-instances=50 \
  --service-account=worker-service@magnus-flipper-ai-prod.iam.gserviceaccount.com \
  --set-env-vars="NODE_ENV=production" \
  --set-secrets="DATABASE_URL=DATABASE_URL:latest,APIFY_TOKEN=APIFY_TOKEN:latest,WORKER_SHARED_SECRET=WORKER_SHARED_SECRET:latest"

# Get worker URL
gcloud run services describe workers \
  --platform=managed \
  --region=us-central1 \
  --format='value(status.url)'
```

### 8.3 Update API with Worker URL

```bash
# Update API to set WORKER_SERVICE_URL
gcloud run services update api \
  --update-env-vars="WORKER_SERVICE_URL=https://workers-xyz-uc.a.run.app"
```

---

## Step 9: Configure Custom Domains

### 9.1 Map Domain to Cloud Run

```bash
# Verify domain ownership first (add TXT record to DNS)
gcloud domains verify magnusflipper.ai

# Map API domain
gcloud run domain-mappings create \
  --service=api \
  --domain=api.magnusflipper.ai \
  --region=us-central1

# Get DNS records to add
gcloud run domain-mappings describe \
  --domain=api.magnusflipper.ai \
  --region=us-central1
```

### 9.2 Add DNS Records

Add the following records to your DNS provider:

```
Type: A
Name: api
Value: <IP from gcloud output>

Type: AAAA
Name: api
Value: <IPv6 from gcloud output>
```

Wait for DNS propagation (5-30 minutes).

---

## Step 10: Deploy Frontend (Firebase Hosting)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize project
firebase init hosting

# Build frontend
cd apps/web
VITE_API_URL=https://api.magnusflipper.ai/api \
VITE_FIREBASE_API_KEY=... \
VITE_FIREBASE_AUTH_DOMAIN=... \
VITE_FIREBASE_PROJECT_ID=... \
pnpm build

# Deploy
firebase deploy --only hosting

# Configure custom domain (in Firebase Console)
# Hosting → Add custom domain → app.magnusflipper.ai
```

---

## Step 11: Smoke Tests

### 11.1 Health Checks

```bash
# API health
curl https://api.magnusflipper.ai/api/health/
# Expected: {"status":"ok","version":"1.0.0"}

# Readiness probe
curl https://api.magnusflipper.ai/api/health/ready
# Expected: {"status":"ready","db":"ok","redis":"ok"}
```

### 11.2 Authentication Test

```bash
# Create test user in Firebase Console
# Then login via frontend: https://app.magnusflipper.ai

# Verify token works
TOKEN="<firebase-id-token>"
curl -H "Authorization: Bearer $TOKEN" \
  https://api.magnusflipper.ai/api/auth/me
```

### 11.3 Scraper Test

1. Login to dashboard: https://app.magnusflipper.ai
2. Create a new monitor (Amazon)
3. Submit a job
4. Check logs:
   ```bash
   gcloud logging tail --limit=50
   ```
5. Verify job completes
6. Check results in database

---

## Step 12: Enable Automated Deployments

### 12.1 Merge to Main Branch

```bash
# Create PR from audit branch
gh pr create --title "Production deployment infrastructure" \
  --body "Adds Dockerfiles, deployment workflows, and env var documentation"

# After review, merge to main
gh pr merge --auto --squash
```

### 12.2 Verify Automated Deployment

Once merged to `main`, GitHub Actions will automatically:
1. Build Docker images
2. Push to Google Container Registry
3. Deploy to Cloud Run
4. Verify health checks

Monitor deployment:
```bash
# Watch GitHub Actions
gh run watch

# Check Cloud Run deployment
gcloud run services list
```

---

## Monitoring & Alerts

### Set Up Cloud Monitoring

```bash
# Create notification channel (email)
gcloud alpha monitoring channels create \
  --display-name="Ops Team" \
  --type=email \
  --channel-labels=email_address=ops@magnusflipper.ai

# Create alert policy for 5xx errors
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="API 5xx Error Rate" \
  --condition-display-name="Error rate > 1%" \
  --condition-threshold-value=0.01 \
  --condition-threshold-duration=60s
```

### View Logs

```bash
# API logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=api" --limit=50

# Worker logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=workers" --limit=50

# Errors only
gcloud logging read "severity>=ERROR" --limit=50
```

---

## Rollback Procedure

If issues arise after deployment:

```bash
# List revisions
gcloud run revisions list --service=api

# Rollback to previous revision
gcloud run services update-traffic api \
  --to-revisions=api-00001-xyz=100

# Verify rollback
curl https://api.magnusflipper.ai/api/health/
```

---

## Cost Optimization

### Estimated Monthly Costs (500 users)

- **Cloud Run (API):** $20-40/month (1 min instance, auto-scale to 10)
- **Cloud Run (Workers):** $50-100/month (scale-to-zero, bursty)
- **Cloud SQL:** $25-50/month (db-g1-small)
- **Redis:** $50/month (1GB standard tier)
- **Cloud Tasks:** $5/month (queue operations)
- **Firebase Hosting:** $0 (free tier)
- **Total:** ~$150-250/month

### Cost Control

```bash
# Set budget alerts
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="Magnus Flipper Monthly Budget" \
  --budget-amount=300USD \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100
```

---

## Troubleshooting

### Issue: Deployment fails with "Permission denied"
**Solution:** Verify service account has `roles/run.admin` and `roles/iam.serviceAccountUser`

### Issue: Health check returns 503
**Solution:** Check Cloud SQL connection, verify secrets are accessible

### Issue: CORS errors in browser
**Solution:** Verify `CORS_ORIGIN` matches frontend domain exactly (https://app.magnusflipper.ai, no trailing slash)

### Issue: Workers timeout
**Solution:** Increase timeout to 600s (max for Cloud Run), check Playwright installation in Docker image

---

## Next Steps

1. ✅ Deploy to production
2. Monitor for 24 hours
3. Enable canary deployments (traffic splitting)
4. Set up Datadog/CloudLogging integration
5. Configure Stripe webhooks
6. Submit mobile apps to App Store/Play Store

---

**Deployment completed!** 🚀

For issues or questions, refer to:
- `docs/PRODUCTION_READINESS_AUDIT.md` - Full audit report
- `docs/ENVIRONMENT_VARIABLES.md` - Environment variable reference
- `PRODUCTION_SAFETY_CHECKLIST.md` - Safety checklist
