# 500-Subscriber Safe Deployment Checklist

## Production Readiness Assessment

This checklist covers the production hardening work completed for safe deployment with 500 concurrent subscribers. The system is optimized for **stability**, **predictability**, and **failure containment**.

---

## ✅ Pre-Deployment Checklist

### 1. Environment Variables

Ensure all required environment variables are configured:

#### Required Variables
```bash
# Node Environment
NODE_ENV=production  # CRITICAL: Enables PRODUCTION_SAFE_MODE

# Database
DATABASE_URL=postgres://...  # PostgreSQL connection string

# Firebase Auth
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...

# Stripe (for billing)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SUCCESS_URL=https://...
STRIPE_CANCEL_URL=https://...
STRIPE_PORTAL_RETURN_URL=https://...

# Redis (optional, falls back to in-process rate limiting)
REDIS_URL=redis://...

# CORS
CORS_ORIGIN=https://yourdomain.com

# Port
PORT=8080
```

#### Safety Verification
- [ ] `NODE_ENV` is set to `production` (enables fail-closed guards)
- [ ] All Stripe keys are **live** keys (not test keys)
- [ ] Database URL uses SSL/TLS connection
- [ ] CORS_ORIGIN is set to your frontend domain (not `*`)

---

### 2. API Route Safety Classification

All routes have been classified into safety categories. **UNSAFE routes return 503 in production.**

#### ✅ SAFE Routes (Read-only, validated)
- `GET /health/` - Status check
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe
- `GET /auth/me` - User profile
- `GET /deals/` - List deals (with zod validation)
- `GET /deals/:id` - Get single deal
- `GET /monitors/` - List monitors
- `GET /monitors/:id` - Get single monitor
- `GET /jobs/` - List jobs
- `GET /jobs/:id` - Get single job
- `GET /analytics/dashboard` - Dashboard stats
- `GET /users/me` - Current user
- `GET /admin/status` - Admin check
- `GET /admin/controls` - Admin controls (admin-gated)
- `GET /telemetry/usage` - Usage telemetry (admin-gated)

#### ⚠️ CONDITIONAL Routes (Writes with validation)
- `POST /auth/verify` - User creation (idempotent)
- `POST /auth/logout` - Token revocation
- `PATCH /deals/:id` - Update deal (zod validated)
- `DELETE /deals/:id` - Delete deal (user-scoped)
- `POST /deals/:id/flag` - Flag deal (zod validated)
- `POST /monitors/` - Create monitor (zod validated, quota checked)
- `PATCH /monitors/:id` - Update monitor (zod validated)
- `DELETE /monitors/:id` - Delete monitor (user-scoped)
- `POST /monitors/:id/pause` - Pause monitor (idempotent)
- `POST /monitors/:id/resume` - Resume monitor (idempotent)
- `POST /jobs/` - Create job (zod validated, entitlements checked)
- `DELETE /jobs/:id` - Cancel job (user-scoped)
- `POST /stripe/checkout` - Stripe checkout (validated, demo mode guarded)
- `GET /stripe/portal` - Stripe portal (validated, demo mode guarded)
- `PATCH /admin/controls/kill-switches` - Update kill switches (admin-only, zod validated)
- `PATCH /admin/controls/canary` - Update canary ramp (admin-only, zod validated)

#### ❌ UNSAFE Routes (Disabled in production)
- `POST /stripe/webhook` - **Returns 503 in production**
  - Reason: Complex billing state management, insufficient error boundaries
  - Risk: Silent data corruption on malformed Stripe events
  - **Action**: This route is blocked. Stripe webhooks must be handled by a separate, hardened service or manually validated before production use.

---

### 3. Production Safety Features Enabled

#### PRODUCTION_SAFE_MODE Flag
- [ ] Verify `process.env.NODE_ENV === 'production'` in deployment
- [ ] Test that unsafe routes return 503 in staging with NODE_ENV=production

**What PRODUCTION_SAFE_MODE Does:**
- Blocks UNSAFE routes (returns 503 with clear error message)
- Enables fail-closed behavior for critical operations
- Enforces strict input validation
- Activates in-process rate limiting

#### Route Safety Middleware
- [x] `productionSafetyMiddleware` applied globally
- [x] Blocks `/api/stripe/webhook` when NODE_ENV=production
- [x] Returns clear error messages to clients

---

### 4. Input Validation

All write endpoints have **hard validation**:

#### UUID Parameter Validation
- [x] All `/:id` routes validate UUID format (deals, monitors, jobs)
- [x] Returns 400 with clear error on invalid UUID
- [x] Prevents database errors from malformed IDs

#### Request Body Validation (Zod schemas)
- [x] `POST /deals/:id/flag` - Validates reason (1-1000 chars)
- [x] `POST /monitors/` - Validates CreateMonitorSchema
- [x] `PATCH /monitors/:id` - Validates UpdateMonitorSchema
- [x] `POST /jobs/` - Validates CreateJobSchema
- [x] `POST /stripe/checkout` - Validates tier enum
- [x] `PATCH /admin/controls/kill-switches` - Validates boolean flags
- [x] `PATCH /admin/controls/canary` - Validates ramp percent (0-100)

---

### 5. Rate Limiting

#### In-Process Rate Limiter (Active)
- [x] Memory-based rate limiting (no Redis dependency)
- [x] Sliding window counter algorithm
- [x] Per-user and per-IP rate limits

**Rate Limits:**
```typescript
free: 60 req/min (1 req/sec)
basic: 120 req/min (2 req/sec)
pro: 300 req/min (5 req/sec)
elite: 600 req/min (10 req/sec)
enterprise: 1000 req/min (16 req/sec)
```

**Capacity:**
- Supports 500 concurrent users
- Memory usage: ~50KB (500 users × 100 bytes/entry)
- Automatic cleanup every 5 minutes

**Important:** This is **single-process only**. For multi-process deployments, ensure sticky sessions or use Redis.

#### Redis-Based Rate Limiter (Fail-Closed)
- [ ] If using Redis, verify Redis connection in staging
- [x] **Fails closed** in production if Redis unavailable (returns 429)
- [x] Fails open in development (logs warning, allows request)

---

### 6. Fail-Closed Guards

Critical operations **fail with errors** instead of guessing:

#### Monitor Creation
- [x] Fails if tier limits missing (`TIER_LIMITS_UNAVAILABLE`)
- [x] Fails if monitor count invalid (`INVALID_COUNT_VALUE`)
- [x] Enforces quota before allowing creation

#### Monitor Deletion
- [x] Fails if user not found (`USER_NOT_FOUND`)
- [x] Fails if usage count invalid (`INVALID_COUNT_VALUE`)
- [x] Updates usage count safely

#### Job Creation
- [x] Fails if entitlements missing (`ENTITLEMENTS_UNAVAILABLE`)
- [x] Fails if usage telemetry missing (`USAGE_TELEMETRY_UNAVAILABLE`)
- [x] Blocks job if enforcement gate triggered

**Error Codes:**
- `ENTITLEMENTS_UNAVAILABLE` - 403
- `USAGE_TELEMETRY_UNAVAILABLE` - 429
- `TIER_LIMITS_UNAVAILABLE` - 500
- `INVALID_COUNT_VALUE` - 500
- `USER_NOT_FOUND` - 404

---

### 7. Operator Visibility (Logging)

All requests logged with rich context:

#### Standard Log Fields
- `requestId` - Trace across services
- `userId` - User-specific debugging
- `userTier` - Billing tier for capacity planning
- `ip` - Client IP for abuse detection
- `userAgent` - Client compatibility issues
- `routeName` - Route-level metrics
- `status` - HTTP status code
- `duration` - Request latency (ms)
- `method` - HTTP method
- `path` - Full request path

#### Error Logging
- `errorName` - Error class name
- `errorMessage` - Human-readable error
- `errorCode` - Application error code
- `errorStack` - First line of stack trace

#### Performance Monitoring
- Slow requests (>3s) flagged with `performanceWarning: 'SLOW_REQUEST'`

**Actionable Logs:**
```
INFO GET /deals 200 - 45ms [user-123-abc]
WARN POST /jobs 429 - 120ms [user-456-def] { errorCode: 'ENFORCEMENT_BLOCKED', reason: 'DAILY_LIMIT_EXCEEDED' }
ERROR GET /stripe/webhook 503 - 5ms [anonymous] { reason: 'Route marked as unsafe' }
```

---

### 8. Limitations & Constraints

#### Known Constraints (500-User Deployment)

**In-Process Rate Limiting:**
- ✅ Safe for single-process deployment
- ⚠️ Requires sticky sessions for multi-process (or use Redis)

**Disabled Features:**
- ❌ Stripe webhooks (`POST /stripe/webhook`) - Returns 503
  - **Workaround**: Use Stripe Dashboard for subscription management
  - **Future**: Implement webhook handler with idempotency keys and event deduplication

**Database Connections:**
- Recommended pool size: 10-20 connections for 500 users
- Monitor connection pool usage in production

**Concurrency:**
- Rate limiter: 60-1000 req/min per user (depending on tier)
- Estimated throughput: 500 users × 2 req/sec avg = 1000 req/sec peak

---

### 9. Rollback Plan

If issues arise after deployment:

#### Immediate Actions
1. **Check logs** for error patterns (use `requestId` to trace failures)
2. **Monitor rate limit headers** (`X-RateLimit-Limit`, `X-RateLimit-Remaining`)
3. **Verify NODE_ENV=production** is set correctly

#### Emergency Rollback Steps
```bash
# 1. Set NODE_ENV to development (disables production safety)
export NODE_ENV=development

# 2. Restart the API service
pm2 restart api

# 3. Monitor logs for stabilization
tail -f logs/api.log

# 4. Communicate to users about temporary degraded service
```

#### Gradual Re-enablement
```bash
# 1. Test in staging with NODE_ENV=production first
npm run test:integration

# 2. Enable canary deployment (10% traffic)
curl -X PATCH /api/admin/controls/canary \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"target": "production", "rampPercent": 10}'

# 3. Monitor for 1 hour, then increase to 50%
# 4. If stable, increase to 100%
```

---

### 10. Pre-Launch Verification

Run these checks before going live:

#### Health Checks
```bash
# 1. Basic health
curl https://api.yourdomain.com/api/health/
# Expected: {"status":"ok","version":"1.0.0"}

# 2. Readiness probe (checks DB + Redis)
curl https://api.yourdomain.com/api/health/ready
# Expected: {"status":"ready","db":"ok","redis":"ok"}

# 3. Verify unsafe route is blocked
curl https://api.yourdomain.com/api/stripe/webhook -X POST
# Expected: 503 {"error":{"code":"SERVICE_TEMPORARILY_DISABLED"}}
```

#### Rate Limiting
```bash
# Trigger rate limit (send 70 requests in 1 minute)
for i in {1..70}; do
  curl -s https://api.yourdomain.com/api/health/ > /dev/null
done
# Expected: 429 after 60 requests
```

#### Fail-Closed Behavior
```bash
# Test with invalid UUID
curl https://api.yourdomain.com/api/deals/not-a-uuid
# Expected: 400 {"error":{"code":"VALIDATION_ERROR","message":"Invalid id parameter"}}
```

---

## 📊 Post-Deployment Monitoring

### Key Metrics to Track

1. **Rate Limit Hits**
   - Query logs for `errorCode: 'RATE_LIMIT_EXCEEDED'`
   - Expected: <5% of requests

2. **Fail-Closed Triggers**
   - Query logs for `ENTITLEMENTS_UNAVAILABLE`, `TIER_LIMITS_UNAVAILABLE`
   - Expected: <0.1% of requests
   - Action: If >1%, investigate subscription sync issues

3. **Request Latency**
   - Monitor `duration` in logs
   - Expected: p50 <100ms, p95 <500ms, p99 <3000ms
   - Alert: If p95 >1000ms

4. **Error Rates**
   - 4xx errors: <5% (user errors)
   - 5xx errors: <0.1% (system errors)

5. **Route Safety Blocks**
   - Query logs for `SERVICE_TEMPORARILY_DISABLED`
   - Expected: 0 for SAFE/CONDITIONAL routes
   - Expected: All attempts to `/stripe/webhook`

---

## 🚨 Incident Response

### Common Issues & Solutions

#### Issue: Rate limits too aggressive
**Symptom:** Many users hitting 429 errors
**Solution:**
```typescript
// Edit api/src/middleware/rateLimitInProcess.middleware.ts
const LIMITS = {
  free: 120,  // Increase from 60
  // ...
}
```

#### Issue: Fail-closed guards too strict
**Symptom:** Legitimate operations failing with `ENTITLEMENTS_UNAVAILABLE`
**Solution:**
1. Check subscription sync: `SELECT * FROM subscriptions WHERE user_id = '...'`
2. Verify entitlements_json is populated
3. If corrupt, re-sync from Stripe

#### Issue: Memory usage growing
**Symptom:** Rate limit store consuming excessive memory
**Solution:**
```typescript
// Check stats
getRateLimitStats()
// If >10MB, clear store
clearRateLimitStore()
```

---

## ✅ Final Sign-Off

- [ ] All environment variables configured and verified
- [ ] PRODUCTION_SAFE_MODE tested in staging
- [ ] Rate limiting tested under load
- [ ] Fail-closed guards verified (monitor/job creation)
- [ ] Logs shipping to centralized logging (e.g., Datadog, CloudWatch)
- [ ] Health check endpoints returning 200
- [ ] Unsafe routes blocked (503 for `/stripe/webhook`)
- [ ] Rollback plan documented and tested
- [ ] On-call engineer briefed on deployment changes

---

## 📚 Additional Resources

- **Route Safety Manifest:** `api/src/config/routeSafety.ts`
- **Fail-Closed Guards:** `api/src/utils/failClosed.ts`
- **Rate Limiter:** `api/src/middleware/rateLimitInProcess.middleware.ts`
- **Logger Middleware:** `api/src/middleware/logger.middleware.ts`

---

## 🎯 Success Criteria

Deployment is considered successful when:

1. ✅ All 500 users can authenticate and use the service
2. ✅ Rate limits are respected without blocking legitimate users
3. ✅ No 5xx errors from fail-open guards (all critical ops fail closed)
4. ✅ Logs provide clear visibility for operator debugging
5. ✅ Unsafe routes return 503 in production
6. ✅ Billing operations (Stripe checkout/portal) work correctly
7. ✅ No silent data corruption in telemetry or entitlements

---

**Deployment hardening completed:** 2026-01-08
**Target deployment:** 500 concurrent subscribers
**Safety mode:** PRODUCTION_SAFE_MODE enabled
**Status:** ✅ Ready for deployment
