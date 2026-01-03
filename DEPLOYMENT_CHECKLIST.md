# Production Readiness & Deployment Checklist

This document outlines the step-by-step process to migrate **Magnus Flipper AI** from its current High-Fidelity Simulation state to a fully "wired" Production Environment on Google Cloud Platform.

## Phase 1: Infrastructure Provisioning (GCP)
*The foundation layer. Move from "Simulation" to actual Cloud Resources.*

- [ ] **GCP Project Setup**
    - [ ] Create Production Project (`magnus-flipper-ai-prod`) and Staging Project (`magnus-flipper-ai-staging`).
    - [ ] Enable required APIs:
        - [ ] Cloud Run API (Compute)
        - [ ] Cloud Build API (CI/CD)
        - [ ] Cloud Firestore API (NoSQL Database)
        - [ ] Cloud Tasks API (Async Job Queue)
        - [ ] Secret Manager API (Secure Config)
        - [ ] Artifact Registry API (Docker Images)
- [ ] **Networking (VPC)**
    - [ ] Create VPC Network `scraper-vpc`.
    - [ ] **Serverless VPC Access**: Configure Connector (e.g., `projects/magnus-flipper-ai-prod/locations/us-central1/connectors/db-connector`) to allow Cloud Run to access Cloud SQL.
    - [ ] **Cloud NAT**: Configure Cloud NAT on the VPC to ensure Cloud Run workers have a **static outbound IP**. This is critical for whitelisting your workers with proxy providers.
- [ ] **Database Provisioning**
    - [ ] **Firestore**: Create database in `Native Mode` (Multi-region `nam5` recommended for US availability).
    - [ ] **Cloud SQL**: Provision PostgreSQL instance (`db-f1-micro` for start).
    - [ ] **Redis (Optional)**: Provision Memorystore if high-speed rate limiting is required across distributed workers.
- [ ] **Message Queue**
    - [ ] Create Cloud Task Queue: `projects/magnus-flipper-ai-prod/locations/us-central1/queues/scraper-queue`.
    - [ ] Configure Retry Config: Max attempts 3, Max backoff 5m (to handle transient proxy failures).

## Phase 2: Backend Implementation (Migrating off Mocks)
*Replace `mockScraperService.ts` logic with real Node.js microservices.*

- [ ] **API Service (`api-service`)**
    - [ ] Initialize new Express.js project.
    - [ ] **Endpoints**:
        - [ ] `POST /jobs`: Validate input -> Check Quota (Firestore) -> Create Job Doc -> Dispatch Cloud Task.
        - [ ] `GET /jobs`: Query Firestore for user's job history.
    - [ ] **Auth**: Implement `firebase-admin` middleware to verify Bearer tokens from the frontend.
    - [ ] Dockerize: Create `Dockerfile` optimized for Node.js (Alpine or Slim).
- [ ] **Worker Service (`worker-service`)**
    - [ ] Initialize Node.js project with **Playwright**.
    - [ ] **Docker**: Use the official Playwright image: `mcr.microsoft.com/playwright:v1.44.0-jammy`.
    - [ ] **Task Handler**: Create an Express route `POST /process-job` that accepts the Cloud Task payload.
    - [ ] **Proxy Integration**:
        - [ ] Retrieve `PROXY_URL` (e.g., `http://user:pass@pr.oxylabs.io:7777`) from Secret Manager at runtime.
        - [ ] Pass proxy config to `browser.newContext({ proxy: ... })`.
    - [ ] **Database Connection**:
        - [ ] Use `pg-pool` or an ORM (Prisma/TypeORM) for Cloud SQL connections to manage pooling efficiently.
        - [ ] Replace `this.results.push(...)` with `firestore.collection('listings').add(...)`.

## Phase 3: Frontend Integration (Wiring)
*Connecting the React App to the Real Backend.*

- [ ] **Service Layer Refactoring**
    - [ ] **Delete**: Remove `services/mockScraperService.ts` references.
    - [ ] **Create**: `services/apiClient.ts` using `axios` or `fetch`.
        - [ ] Implement `submitJob(url)` -> `POST ${VITE_API_URL}/jobs`.
        - [ ] Implement `getResults(jobId)` -> `GET ${VITE_API_URL}/results?jobId=...`.
    - [ ] **Real-time Updates**: 
        - [ ] Replace custom `subscribe` simulation with `onSnapshot` from `firebase/firestore`.
        - [ ] Listen directly to `collection('jobs').where('userId', '==', uid)` for status updates.
- [ ] **Environment Configuration**
    - [ ] Create `.env.production`.
    - [ ] Set `VITE_API_URL` to the Cloud Run Load Balancer URL.
    - [ ] Set `VITE_FIREBASE_CONFIG` with production project keys.

## Phase 4: Security & Compliance
*Hardening for Production.*

- [ ] **Secret Management**
    - [ ] Store sensitive keys in Google Secret Manager:
        - [ ] `PROXY_PASSWORD`
        - [ ] `DB_PASSWORD`
        - [ ] `FIREBASE_SERVICE_ACCOUNT_KEY`
    - [ ] Configure Cloud Run to mount secrets as Environment Variables.
- [ ] **Network Security**
    - [ ] **Cloud Armor**: Configure WAF rules to rate-limit IP addresses on the API Gateway.
    - [ ] **IAM**: Create Service Accounts with *Least Privilege*:
        - [ ] `api-service-sa`: Can write to Firestore, Enqueue Tasks.
        - [ ] `worker-service-sa`: Can read/write Firestore, Write Cloud SQL.
- [ ] **Bot Mitigation (Defense)**
    - [ ] Ensure `AntibotService` implementation uses the real proxy network.
    - [ ] Verify `playwright-stealth` or similar plugin is active.

## Phase 5: CI/CD Pipeline
*Automating the release process.*

- [ ] **GitHub Actions**
    - [ ] Create `.github/workflows/deploy-api.yml`:
        - [ ] Steps: Checkout -> Build Docker -> Push to Artifact Registry -> `gcloud run deploy`.
    - [ ] Create `.github/workflows/deploy-worker.yml`: 
        - [ ] Similar to API, but ensure the Playwright browser binaries are handled correctly in the Docker build.
    - [ ] Create `.github/workflows/deploy-web.yml`:
        - [ ] Steps: Checkout -> `npm run build` -> `firebase deploy`.

## Phase 6: Observability & Monitoring
*Day 2 Operations.*

- [ ] **Structured Logging**
    - [ ] Ensure all backend logs use JSON format (compatible with Cloud Logging).
    - [ ] Include `traceId` and `jobId` in every log line to correlate API requests with Worker executions.
- [ ] **Alerting Policies**
    - [ ] Alert on: `Cloud Run 5xx errors > 1%`.
    - [ ] Alert on: `Cloud Task Queue Depth > 1000` (indicates workers aren't scaling fast enough).
    - [ ] Alert on: `Firestore Write Latency > 2s`.

## Phase 7: Scaling to 500+ Users
*Ensuring the system handles the Friends & Family extended network.*

- [ ] **Quota Management**
    - [ ] Request Quota Increase for **Cloud Run Instance Count** (Target: 100+ instances).
    - [ ] Request Quota Increase for **Cloud Tasks** (Queue throughput).
- [ ] **Database Optimization**
    - [ ] **Cloud SQL**: Upgrade from `db-f1-micro` to `db-g1-small` or standard edition if concurrent reporting queries slow down.
    - [ ] **Firestore**: Review index write rates. If users exceed 500 writes/second collectively, implement sharding (unlikely at 500 users, but good to know).
- [ ] **Cost Control (Circuit Breakers)**
    - [ ] Implement a global daily limit on Cloud Task dispatches to prevent runaway proxy bills.
    - [ ] Set up GCP Budget Alerts to email you if daily spend > $50.

## Phase 8: Go-Live Strategy

1.  **Database Migration**: Run initial schema migrations for Cloud SQL.
2.  **Smoke Test**: Run 1 job against each supported marketplace (Amazon, eBay, etc.) in Production.
3.  **Domain Setup**: Map custom domain (`app.magnusflipper.ai`) to Firebase Hosting.
4.  **SSL**: Verify SSL certificates are provisioned.
5.  **User Onboarding**: Enable Firebase Auth sign-ups (or whitelist specific emails for closed beta).