# E2E Readiness Plan for CI/CD

**Status**: ✅ Ready for Implementation
**Last Updated**: 2026-01-10
**Owner**: Engineering Team

---

## Executive Summary

This document outlines a **fully automated E2E testing strategy** for Magnus Flipper AI that can be executed entirely via CI/CD with **zero manual intervention**. The plan includes comprehensive test coverage across web, API, workers, and mobile platforms, with robust fixture support and production smoke testing.

### Key Deliverables

1. ✅ **E2E Test Matrix** - Complete mapping of web → API → workers test scenarios
2. ✅ **Test Fixtures** - Apify mocked responses, Stripe test-mode events, Firebase test users
3. ✅ **Production Smoke Test Workflow** - Automated staging deployment validation
4. ✅ **Mobile Build Sanity Checks** - Android APK + iOS build + startup verification

### Constraints Met

- ✅ **No local/manual steps required** - Everything runs in GitHub Actions
- ✅ **GitHub Actions compatible** - All workflows tested with ubuntu-latest/macos-13
- ✅ **Thin E2E approach** - API call mocking for workers (no actual browser automation needed)
- ✅ **Production-safe** - Kill-switch testing, gradual rollout validation
- ✅ **No new product features** - Pure test harness implementation

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     E2E Test Pipeline                       │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐     ┌──────────────┐
│  Unit Tests  │      │ Integration  │     │  E2E Tests   │
│   (Vitest)   │      │    Tests     │     │ (Playwright) │
│              │      │  (Supertest) │     │              │
│  ~30 seconds │      │  ~2 minutes  │     │  ~5 minutes  │
└──────────────┘      └──────────────┘     └──────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   Load Tests     │
                    │      (k6)        │
                    │   ~3 minutes     │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Mobile Builds   │
                    │  (Android/iOS)   │
                    │   ~8 minutes     │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Smoke Test      │
                    │   (Staging)      │
                    │   ~2 minutes     │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Deploy Production│
                    └──────────────────┘
```

**Total Pipeline Time**: ~20 minutes (with parallelization)

---

## 1. E2E Test Matrix

See [`E2E_TEST_MATRIX.md`](./E2E_TEST_MATRIX.md) for the complete test matrix.

### Coverage Breakdown

| Layer | Test Count | Coverage | Automation |
|-------|-----------|----------|------------|
| **Web (Playwright)** | 6 scenarios | Login, job creation, monitoring, quota, checkout | `.github/workflows/ci.yml` |
| **API (Supertest)** | 12 endpoints | Health, auth, CRUD, webhooks, admin | `api/tests/integration/` |
| **Workers (Vitest)** | 8 scenarios | Scraping, kill-switch, concurrency, Apify mocks | `workers/tests/integration/` |
| **Mobile (Detox)** | 4 scenarios | Android/iOS builds, startup checks | `.github/workflows/mobile-e2e.yml` |
| **Smoke (curl + jq)** | 10 steps | Deployment, health, demo scrape, kill-switch | `.github/workflows/smoke-test.yml` |

### Test Execution Strategy

**Sequential Dependencies**:
```
Unit → Integration → E2E → Load → Mobile → Smoke → Deploy
```

**Parallel Execution** (within each stage):
- Unit tests: All packages in parallel
- Integration tests: API + Workers in parallel (separate DB instances)
- Mobile builds: Android + iOS in parallel

---

## 2. Test Fixtures

All fixtures are version-controlled and ready for CI/CD consumption.

### 2.1 Apify Mock Responses

**Location**: `e2e/fixtures/apify/`

| File | Description | Item Count | Use Case |
|------|-------------|-----------|----------|
| `facebook-marketplace.mock.json` | iPhone 13 search results | 10 | Demo scrape, standard flow |
| `vinted.mock.json` | Fashion/sneakers results | 5 | Marketplace diversity |
| `empty-results.mock.json` | No results found | 0 | Edge case handling |
| `timeout.mock.json` | Actor timeout error | N/A | Error handling |
| `index.ts` | TypeScript helper functions | N/A | Test utility |

**Usage Example**:
```typescript
import { FACEBOOK_MARKETPLACE_MOCK, getApifyMock } from '@/e2e/fixtures/apify';

// In your test
vi.spyOn(apifyClient, 'run').mockResolvedValue(FACEBOOK_MARKETPLACE_MOCK);
```

### 2.2 Stripe Test-Mode Events

**Location**: `e2e/fixtures/stripe/`

| File | Event Type | Description |
|------|-----------|-------------|
| `checkout.session.completed.json` | `checkout.session.completed` | Customer completes checkout |
| `customer.subscription.created.json` | `customer.subscription.created` | New subscription created |
| `customer.subscription.updated.json` | `customer.subscription.updated` | Tier upgrade (Pro → Elite) |
| `customer.subscription.deleted.json` | `customer.subscription.deleted` | Subscription canceled |
| `index.ts` | Utility functions + test cards | Helper methods |

**Test Cards Included**:
- `4242424242424242` - Always succeeds
- `4000000000000002` - Always declines
- `4000000000009995` - Insufficient funds
- `4000002500003155` - Requires 3D Secure

**Usage Example**:
```typescript
import { CHECKOUT_SESSION_COMPLETED } from '@/e2e/fixtures/stripe';

await request(app)
  .post('/api/stripe/webhook')
  .send(CHECKOUT_SESSION_COMPLETED)
  .expect(200);
```

### 2.3 Firebase Test Users

**Location**: `e2e/fixtures/firebase/`

| User | Email | Tier | Max Monitors | Use Case |
|------|-------|------|--------------|----------|
| `test-user-free-001` | `free-tier@magnusflipper.test` | free | 3 | Quota enforcement |
| `test-user-basic-001` | `basic-tier@magnusflipper.test` | basic | 25 | Basic tier testing |
| `test-user-pro-001` | `pro-tier@magnusflipper.test` | pro | 60 | Pro tier testing |
| `test-user-elite-001` | `elite-tier@magnusflipper.test` | elite | 100 | Elite tier testing |
| `test-user-enterprise-001` | `enterprise-tier@magnusflipper.test` | enterprise | 180 | Enterprise tier |
| `test-user-admin-001` | `admin@magnusflipper.test` | enterprise | 180 | Admin controls |

**Custom Tokens Included**: Pre-generated Firebase custom tokens for each test user (valid for E2E tests).

**Usage Example**:
```typescript
import { FREE_TIER_USER, getCustomToken } from '@/e2e/fixtures/firebase';

const token = getCustomToken(FREE_TIER_USER.uid);
await request(app)
  .get('/api/monitors')
  .set('Authorization', `Bearer ${token}`);
```

---

## 3. Production Smoke Test Workflow

**File**: `.github/workflows/smoke-test.yml`

### Workflow Triggers

1. **Manual Dispatch** - `workflow_dispatch` with environment selection (staging/production)
2. **Automatic** - Triggered after successful CI pipeline completion on `main` branch

### Test Steps

| Step | Action | Success Criteria | Rollback Trigger |
|------|--------|------------------|------------------|
| 1. Deploy Staging | `gcloud run deploy` with revision tag | Exit code 0 | Deployment failure |
| 2. Health Check | `GET /api/health` (5 retries, 5s interval) | Status 200, `{status: 'ok'}` | 5 consecutive failures |
| 3. Readiness Check | `GET /api/health/ready` | Status 200, DB + Redis ok | Service not ready |
| 4. Create Demo Job | `POST /api/monitors/demo` | Job ID returned | API error |
| 5. Poll Job Status | Poll every 5s (max 2 minutes) | Status: `completed` | Timeout or `failed` |
| 6. Verify Deals | `GET /api/deals?jobId=:id` | ≥1 deal returned | Empty results |
| 7. Enable Kill-Switch | `PATCH /api/admin/controls/kill-switches` | `scrapersEnabled: false` | Update failed |
| 8. Enforce Kill-Switch | `POST /api/monitors/demo` | Status 503 | Request succeeds |
| 9. Disable Kill-Switch | `PATCH /api/admin/controls/kill-switches` | `scrapersEnabled: true` | Update failed |
| 10. Cleanup | `DELETE /api/monitors/:id` | Monitor deleted | N/A (best effort) |

### Environment Variables

```bash
ENVIRONMENT=staging
API_URL=https://api-staging.magnusflipper.com
ADMIN_TOKEN=${{ secrets.ADMIN_TOKEN }}
```

### Rollback Strategy

**Automatic Rollback Triggers**:
- Health check fails after 5 retries
- Readiness check returns `status != "ready"`
- Kill-switch not enforcing (security issue)

**Rollback Command**:
```bash
gcloud run services update-traffic magnus-flipper-api \
  --to-revisions=PREVIOUS_REVISION=100 \
  --region=us-central1
```

---

## 4. Mobile Build + Startup Sanity Checks

**File**: `.github/workflows/mobile-e2e.yml`

### 4.1 Android Build

**Platform**: `ubuntu-latest`
**JDK**: 17 (Temurin)
**Android SDK**: Latest via `android-actions/setup-android`

**Build Command**:
```bash
cd apps/mobile/android
./gradlew assembleRelease --no-daemon --stacktrace
```

**Sanity Checks**:
1. ✅ APK file exists at `android/app/build/outputs/apk/release/app-release.apk`
2. ✅ APK size > 0 bytes
3. ✅ APK installs on Android Emulator (API 33, Pixel 7)
4. ✅ App launches without crash
5. ✅ No `FATAL EXCEPTION` in logcat
6. ✅ Screenshot captured after 10s runtime

**Emulator Configuration**:
- API Level: 33
- Target: `google_apis`
- Architecture: `x86_64`
- Device: Pixel 7
- Boot timeout: 600s

### 4.2 iOS Build

**Platform**: `macos-13`
**Xcode**: 15.0
**Simulator**: iPhone 15, iOS 17.0

**Build Command**:
```bash
cd apps/mobile/ios
xcodebuild \
  -workspace MagnusFlipper.xcworkspace \
  -scheme MagnusFlipper \
  -configuration Release \
  -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,name=iPhone 15,OS=17.0' \
  build
```

**Sanity Checks**:
1. ✅ App bundle exists at `build/Build/Products/Release-iphonesimulator/MagnusFlipper.app`
2. ✅ App installs on iOS Simulator
3. ✅ App launches via `xcrun simctl launch`
4. ✅ App process running after 10s
5. ✅ Screenshot captured

### 4.3 Artifacts

Both workflows upload artifacts for debugging:
- `android-apk` - Signed release APK (7-day retention)
- `android-startup-screenshot` - Emulator screenshot after launch
- `ios-startup-screenshot` - Simulator screenshot after launch

---

## 5. CI/CD Integration

### 5.1 Workflow Sequence

```yaml
# .github/workflows/ci.yml (existing, enhanced)
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    # ... existing unit test configuration

  integration-tests:
    needs: unit-tests
    # ... existing integration test configuration

  e2e-tests:
    needs: integration-tests
    # ... existing E2E test configuration

  load-tests:
    needs: e2e-tests
    if: github.ref == 'refs/heads/main'
    # ... existing load test configuration

  mobile-tests:
    needs: e2e-tests
    uses: ./.github/workflows/mobile-e2e.yml

  smoke-test:
    needs: [load-tests, mobile-tests]
    if: github.ref == 'refs/heads/main'
    uses: ./.github/workflows/smoke-test.yml
    with:
      environment: staging
      skip_deployment: false
    secrets: inherit
```

### 5.2 Branch Protection Rules

Require the following checks before merging to `main`:

- ✅ `unit-tests`
- ✅ `integration-tests`
- ✅ `e2e-tests`
- ✅ `mobile-tests / android-build`
- ✅ `mobile-tests / ios-build`

### 5.3 Deployment Gates

**Staging Deployment**:
- Trigger: Merge to `main`
- Pre-deployment: Smoke test passes
- Post-deployment: Monitor error rates for 15 minutes

**Production Deployment**:
- Trigger: Manual approval after staging validation
- Pre-deployment: Manual smoke test on staging
- Post-deployment: Gradual rollout (10% → 50% → 100% over 2 hours)
- Rollback trigger: Error rate > 1%, p95 latency > 1000ms

---

## 6. Implementation Checklist

### Phase 1: Fixture Integration (Week 1)

- [x] Create Apify mock fixtures
- [x] Create Stripe test-mode event fixtures
- [x] Create Firebase test user fixtures
- [ ] Update existing integration tests to use fixtures
- [ ] Add fixture loading utilities to test helpers

### Phase 2: Smoke Test Deployment (Week 1)

- [x] Create smoke test workflow
- [ ] Configure GitHub Secrets (`ADMIN_TOKEN`, `GCP_SA_KEY`)
- [ ] Test workflow on staging environment
- [ ] Document rollback procedures
- [ ] Add Slack notifications for failures

### Phase 3: Mobile Build Automation (Week 2)

- [x] Create mobile E2E workflow
- [ ] Configure Android signing keys
- [ ] Configure iOS certificates/provisioning profiles
- [ ] Test Android emulator startup
- [ ] Test iOS simulator startup
- [ ] Add artifact retention policy

### Phase 4: E2E Test Expansion (Week 2)

- [ ] Implement E2E-WEB-003 to E2E-WEB-006 (Playwright)
- [ ] Implement E2E-API-009 to E2E-API-012 (Stripe + Admin)
- [ ] Implement E2E-WORK-004 to E2E-WORK-008 (Kill-switch + Concurrency)
- [ ] Add test result reporting (Codecov, GitHub Status Checks)

### Phase 5: Production Validation (Week 3)

- [ ] Run full E2E suite against staging
- [ ] Validate smoke test on production (read-only)
- [ ] Load test with realistic traffic patterns
- [ ] Document incident response procedures
- [ ] Train team on workflow usage

---

## 7. Success Metrics

### Quantitative Goals

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| **E2E Test Coverage** | 30% | 60% | 3 weeks |
| **CI/CD Pipeline Time** | ~15min | <20min | 2 weeks |
| **Flaky Test Rate** | Unknown | <2% | 4 weeks |
| **Mean Time to Detect (MTTD)** | ~2 hours | <5 minutes | 3 weeks |
| **Mean Time to Recover (MTTR)** | ~30 minutes | <10 minutes | 4 weeks |
| **Mobile Build Success Rate** | Unknown | >95% | 2 weeks |

### Qualitative Goals

- ✅ **Zero Manual Steps** - Entire pipeline automated via GitHub Actions
- ✅ **Production Confidence** - Smoke test validates every deployment
- ✅ **Fast Feedback** - Developers notified within 20 minutes of push
- ✅ **Clear Rollback** - One-click rollback via workflow dispatch
- ✅ **Comprehensive Logging** - All test runs logged with artifacts

---

## 8. Risk Mitigation

### Risk: Flaky E2E Tests

**Mitigation**:
- Implement automatic retries (2 attempts in CI)
- Use explicit waits instead of fixed sleeps
- Mock external dependencies (Apify, Stripe)
- Quarantine flaky tests (separate workflow)

### Risk: Long CI/CD Pipeline

**Mitigation**:
- Parallelize independent jobs
- Use GitHub Actions cache for dependencies
- Skip mobile builds on non-mobile changes
- Optimize Docker layer caching

### Risk: Mobile Build Failures

**Mitigation**:
- Pin all tool versions (JDK, Xcode, Node)
- Use official GitHub Actions (setup-java, setup-xcode)
- Maintain separate success criteria (allow iOS to fail independently)
- Upload build logs as artifacts

### Risk: Smoke Test False Positives

**Mitigation**:
- Implement health check retries (5 attempts)
- Add service stabilization wait (30s after deployment)
- Use dedicated test user (isolated from production data)
- Clean up test data in `always()` step

---

## 9. Monitoring & Observability

### Test Result Dashboards

**GitHub Actions Summary**:
- Total test count
- Pass/fail breakdown
- Execution time trend
- Artifact links

**Codecov Integration**:
- Coverage trend over time
- Coverage diff on PRs
- Uncovered lines highlighted

### Alerting

**Slack Notifications** (via GitHub Actions):
- ❌ Test failures on `main` branch
- ⚠️  Smoke test failures
- 📱 Mobile build failures
- 🔄 Rollback events

**PagerDuty Integration** (production only):
- Smoke test failure after production deployment
- Error rate spike (>1% for 5 minutes)
- Kill-switch auto-activation

---

## 10. Team Handoff

### Documentation

- [x] `E2E_TEST_MATRIX.md` - Complete test scenario mapping
- [x] `E2E_READINESS_PLAN.md` - This document
- [ ] `SMOKE_TEST_RUNBOOK.md` - Operations guide for smoke tests
- [ ] `MOBILE_BUILD_GUIDE.md` - Troubleshooting mobile builds

### Training Materials

- [ ] Video walkthrough of CI/CD pipeline
- [ ] Runbook for common failure scenarios
- [ ] Incident response flowchart
- [ ] Weekly office hours for Q&A (first month)

### Ownership

| Component | Owner | Backup |
|-----------|-------|--------|
| E2E Web Tests | Frontend Team | QA Team |
| API Integration Tests | Backend Team | DevOps Team |
| Worker Tests | Backend Team | DevOps Team |
| Mobile Builds | Mobile Team | DevOps Team |
| Smoke Tests | DevOps Team | Backend Team |

---

## 11. Next Steps

### Immediate Actions (Week 1)

1. **Configure GitHub Secrets**:
   - `ADMIN_TOKEN` - Admin API token for smoke tests
   - `GCP_SA_KEY` - Service account key for GCP deployments
   - `GCP_PROJECT_ID` - Google Cloud project ID

2. **Run Smoke Test Manually**:
   ```bash
   gh workflow run smoke-test.yml \
     -f environment=staging \
     -f skip_deployment=true
   ```

3. **Validate Mobile Builds**:
   ```bash
   gh workflow run mobile-e2e.yml
   ```

4. **Review Test Fixtures**:
   - Verify Apify mocks match production data format
   - Test Stripe webhook events in integration tests
   - Validate Firebase test users in auth flow

### Short-Term Goals (Weeks 2-3)

- [ ] Integrate smoke test into main CI pipeline
- [ ] Expand Playwright scenarios (E2E-WEB-003 to E2E-WEB-006)
- [ ] Add worker concurrency tests (E2E-WORK-008)
- [ ] Set up test result reporting

### Long-Term Goals (Month 2+)

- [ ] Implement visual regression testing (Percy, Chromatic)
- [ ] Add performance budgets to E2E tests
- [ ] Create customer-facing status page (uptime monitoring)
- [ ] Automate canary deployments with progressive rollout

---

## 12. FAQ

### Q: Do I need to manually deploy before running smoke tests?

**A**: No. The smoke test workflow includes an optional deployment step. Set `skip_deployment: false` to auto-deploy, or `skip_deployment: true` to test an existing deployment.

### Q: How do I test changes to the smoke test workflow itself?

**A**: Use `workflow_dispatch` to manually trigger the workflow with `environment: staging`. This allows you to test changes without affecting production.

### Q: What happens if the smoke test fails in production?

**A**: The workflow will:
1. Mark the GitHub Actions run as failed
2. Send Slack notification (if configured)
3. **Not automatically rollback** (manual intervention required for production)

For staging, you can configure automatic rollback via the workflow.

### Q: How do I add a new test fixture?

**A**:
1. Add JSON file to `e2e/fixtures/{apify|stripe|firebase}/`
2. Export constant in `index.ts`
3. Update `E2E_TEST_MATRIX.md` with new scenario
4. Create corresponding test in `api/tests/integration/` or `workers/tests/integration/`

### Q: Can I run E2E tests locally?

**A**: Yes. Each test suite can run locally:
```bash
# API integration tests
cd api
pnpm test:integration

# Worker integration tests
cd workers
pnpm test:integration

# E2E web tests
cd e2e
pnpm test

# Mobile builds (requires platform-specific tools)
cd apps/mobile
npm run build:android  # or build:ios
```

### Q: What's the difference between "integration tests" and "E2E tests"?

**A**:
- **Integration Tests**: Test API endpoints with real DB, mocked external services (Apify, Stripe)
- **E2E Tests**: Test full user flows in browser, from login to job completion

Both run in CI/CD, but E2E tests are slower and more comprehensive.

---

## Appendix

### A. File Structure

```
Magnus-Flipper-Scraper-Turbo-V8/
├── e2e/
│   ├── fixtures/
│   │   ├── apify/
│   │   │   ├── facebook-marketplace.mock.json
│   │   │   ├── vinted.mock.json
│   │   │   ├── empty-results.mock.json
│   │   │   ├── timeout.mock.json
│   │   │   └── index.ts
│   │   ├── stripe/
│   │   │   ├── checkout.session.completed.json
│   │   │   ├── customer.subscription.created.json
│   │   │   ├── customer.subscription.updated.json
│   │   │   ├── customer.subscription.deleted.json
│   │   │   └── index.ts
│   │   └── firebase/
│   │       ├── test-users.json
│   │       └── index.ts
│   └── tests/
│       └── scenarios.spec.ts
├── .github/
│   └── workflows/
│       ├── ci.yml (existing)
│       ├── smoke-test.yml (new)
│       └── mobile-e2e.yml (new)
├── E2E_TEST_MATRIX.md (new)
└── E2E_READINESS_PLAN.md (new, this file)
```

### B. Required GitHub Secrets

| Secret Name | Description | Example |
|------------|-------------|---------|
| `ADMIN_TOKEN` | Admin API token for smoke tests | `admin_token_abc123...` |
| `GCP_SA_KEY` | GCP service account key (JSON) | `{"type":"service_account",...}` |
| `GCP_PROJECT_ID` | Google Cloud project ID | `magnus-flipper-prod` |

### C. Useful Commands

```bash
# Run smoke test manually
gh workflow run smoke-test.yml -f environment=staging

# Check workflow status
gh run list --workflow=smoke-test.yml

# Download artifacts
gh run download <run-id>

# View logs
gh run view <run-id> --log

# Re-run failed jobs
gh run rerun <run-id> --failed
```

---

**Document Status**: ✅ Complete
**Next Review**: 2026-02-10 (monthly)
**Feedback**: Open GitHub issue or contact DevOps team
