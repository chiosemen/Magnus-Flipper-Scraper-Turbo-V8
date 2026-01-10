
# 🏛️ Magnus Flipper AI - Technical Architecture & Toolstack

**Version:** 2.0 (Monorepo Edition)  
**Status:** Production Ready  
**Architect:** Senior Frontend Engineer  

---

## 1. 🚀 Executive Summary

Magnus Flipper AI is a high-frequency arbitrage discovery platform. This document outlines the transition to a **TypeScript Monorepo** architecture. This approach unifies the Frontend (Dashboard), Backend (API Gateway), and Workers (Scrapers) into a single repository to ensure **end-to-end type safety**, code sharing, and atomic deployments.

### 🎯 Key Architectural Goals
1.  **Type Safety**: Shared `types` package ensures the API response types match exactly what the Frontend expects.
2.  **Scale-to-Zero**: Infrastructure runs on Google Cloud Run; costs are near-zero when idle.
3.  **Developer Experience**: `pnpm` workspaces + Turborepo for fast, cached builds.

---

## 2. 🛠️ The "Modern Monorepo" Toolstack

We are using the **"T3-Enterprise"** inspired stack, optimized for scraping heavy workloads.

### 📦 Workspace Structure (Turborepo)
| Scope | Technology | Purpose |
| :--- | :--- | :--- |
| **Repo Manager** | **Turborepo** | Orchestrates tasks, caches builds, manages deps. |
| **Package Mgr** | **pnpm** | Fast, disk-efficient dependency management. |

### 🎨 `apps/web` (Frontend)
| Category | Tool | Why? |
| :--- | :--- | :--- |
| **Core** | **React 19 + Vite** | The fastest SPA development experience. |
| **Styling** | **TailwindCSS v4** | Utility-first CSS with zero runtime. |
| **State** | **TanStack Query** | Replaces `useEffect` fetching; handles caching/refetching. |
| **Global State** | **Zustand** | Minimalist store for user session & UI toggles. |
| **Charts** | **Recharts** | Responsive, composable D3 wrapper for analytics. |
| **Icons** | **Lucide React** | Consistent, clean SVG iconography. |

### 🔌 `apps/api` (Backend Gateway)
| Category | Tool | Why? |
| :--- | :--- | :--- |
| **Runtime** | **Node.js 20 (Alpine)** | LTS stability. |
| **Framework** | **Hono** | Ultrafast, lightweight, web-standards compliant. Perfect for Serverless. |
| **Validation** | **Zod** | Runtime schema validation (shared with Frontend). |
| **Auth** | **Firebase Admin** | Verifies tokens sent from the client. |

### 🤖 `apps/worker` (Scraper Engine) - **APIFY-FIRST ARCHITECTURE**
| Category | Tool | Why? |
| :--- | :--- | :--- |
| **Execution** | **Apify Platform** | ⚠️ **CHANGED FROM PLAYWRIGHT** - All scraping delegated to Apify actors. Zero browser processes in Cloud Run. |
| **Client** | **apify-client** | Official Apify SDK for actor execution. |
| **Architecture** | **Pure Functions** | ⚠️ **CHANGED FROM CLASSES** - Functional scrapers (no classes, no state). |
| **Normalization** | **Marketplace-Specific Mappers** | Separate normalizers map raw Apify output to CreateDeal schema. |

**❌ REMOVED (Browser Era):**
- Playwright (headless browser automation)
- Crawlee (browser queue management)
- Fingerprint Suite (canvas/audio spoofing)
- Browser Service, Proxy Service, Antibot Service
- BaseScraper class hierarchy

**✅ NEW (Apify-First):**
- Single execution surface: `runApifyActor<T>()`
- Functional scrapers: SearchCriteria → Apify input
- Separate normalizers: Apify output → CreateDeal
- No browser code in workers

### 💾 Data & Infrastructure
| Category | Tool | Why? |
| :--- | :--- | :--- |
| **Database** | **PostgreSQL (Cloud SQL)** | Historical pricing data, user logs. |
| **ORM** | **Drizzle ORM** | Lightweight, type-safe SQL builder. No heavy runtime. |
| **Realtime** | **Firestore** | Hot data sync (Job status, Active monitors) to frontend. |
| **Queue** | **Cloud Tasks** | Async job dispatching with robust retry policies. |
| **Cache/Lock** | **Redis (Upstash/Memorystore)** | Distributed locking for the Scheduler Engine. |

---

## 3. 🏗️ High-Level System Design

```mermaid
flowchart TD
    subgraph "Clients"
        User[User / Browser]
    end

    subgraph "Google Cloud Platform"
        LB[Load Balancer]
        
        subgraph "Cloud Run Services"
            API[apps/api (Hono)]
            Worker[apps/worker (Playwright)]
        end
        
        subgraph "Data Persistence"
            DB[(Cloud SQL PG)]
            Fire[(Firestore)]
            Redis[(Redis Cache)]
        end
        
        subgraph "Async Messaging"
            Queue[Cloud Tasks]
        end
    end

    subgraph "External"
        Target[Amazon / eBay / Vinted]
        Proxy[Residental Proxy Network]
    end

    %% Flows
    User -->|HTTPS / JSON| LB
    LB --> API
    
    %% API Logic
    API -->|Auth Check| Fire
    API -->|Read Config| DB
    API -->|Dispatch Job| Queue
    
    %% Worker Logic
    Queue -->|Trigger| Worker
    Worker -->|Check Lock / Dedupe| Redis
    Worker -->|Route Traffic| Proxy
    Proxy -->|Scrape| Target
    
    %% Result Storage
    Worker -->|Save Results| DB
    Worker -->|Update Status| Fire
    
    %% Realtime Feed
    Fire -.->|Realtime Snapshot| User
```

---

## 4. 📂 Monorepo Directory Structure

This structure ensures code sharing while keeping concerns specific.

```text
.
├── apps/
│   ├── web/                # React Dashboard (Vite)
│   │   ├── src/
│   │   ├── public/
│   │   └── vite.config.ts
│   ├── api/                # REST API Gateway (Hono)
│   │   ├── src/routes/
│   │   └── Dockerfile
│   └── worker/             # Scraper Logic (Playwright)
│       ├── src/scrapers/
│       └── Dockerfile
├── packages/
│   ├── ui/                 # Shared React Components (Buttons, Cards)
│   ├── database/           # Drizzle Schema & DB connection logic
│   ├── types/              # Zod Schemas & TS Interfaces (Shared FE/BE)
│   ├── config/             # Shared ESLint, TSConfig, Tailwind presets
│   └── logger/             # Structured JSON logger
├── infrastructure/         # Terraform / Pulumi IaC
└── turbo.json              # Build pipeline config
```

---

## 5. 💡 Key Architectural Decisions (ADRs)

### ADR-001: Why Hono over Express?
**Decision:** We use Hono.
**Reason:** Express is heavy and relies on older JS patterns. Hono is built for the "Edge" era, has 1/10th the startup time (critical for Cloud Run cold starts), and offers first-class TypeScript support.

### ADR-002: Why Drizzle over Prisma?
**Decision:** We use Drizzle ORM.
**Reason:** Prisma's Rust binary can be heavy in serverless environments, causing slow cold starts. Drizzle is "just SQL" with TypeScript magic, resulting in near-zero runtime overhead.

### ADR-003: Hybrid Storage Strategy
**Decision:** Use **Firestore** for Job Status/UI Sync and **PostgreSQL** for Historical Data.
**Reason:**
*   **Firestore:** The `onSnapshot` listener is unbeatable for giving the user a "live terminal" feel without implementing complex WebSockets.
*   **PostgreSQL:** Relational data (Products, Prices over time, User Tiers) requires complex SQL queries for analytics that NoSQL cannot handle efficiently.

---

## 6. 🔄 CI/CD & Deployment Pipeline

We use **GitHub Actions** driven by Turborepo's `affected` command.

1.  **PR Check:**
    *   `turbo run lint test` (Runs mainly on changed workspaces).
    *   `vitest` for Unit Tests.
2.  **Merge to Main:**
    *   **Build:** `turbo run build`.
    *   **Dockerize:** Build images for `api` and `worker`.
    *   **Push:** Push to Google Artifact Registry.
    *   **Deploy:** `gcloud run deploy` (Traffic split 100% to new revision).

---

## 7. 🧪 Testing Strategy

*   **Unit (Vitest):** Used for Utility functions, Parsers, and UI components in `apps/web`.
*   **Integration (Vitest):** Used in `apps/api` to test endpoints against a Dockerized Postgres.
*   **E2E (Playwright):** Used in `apps/web` to test the full user flow (Login -> Submit Job -> View Result).
*   **Load (k6):** Used to stress test the API Gateway and Worker scaling limits.

---

## 8. 🔄 APIFY-FIRST ARCHITECTURE (V2.0 - Current)

**Last Updated**: 2026-01-10
**Migration**: Complete (Browser era deleted)
**Status**: Production Ready

### 🎯 Architecture Philosophy

**Zero-Browser Execution Model**: All marketplace scraping is delegated to Apify infrastructure. Our workers orchestrate Apify actors, normalize outputs, and manage business logic. No headless browsers run in Cloud Run.

### 🏗️ Workers Architecture

#### Functional Scraper Pattern

**Old (Class-Based - DELETED):**
```typescript
export class AmazonScraper extends BaseScraper {
  private browserService: BrowserService;
  constructor() { this.browserService = new BrowserService(); }
  async search(criteria) { /* browser automation */ }
}
```

**New (Functional - CURRENT):**
```typescript
export async function scrapeAmazon(
  criteria: SearchCriteria
): Promise<unknown> {
  return await runApifyActor({
    actorId: APIFY_ACTORS.AMAZON,
    input: {
      searchTerms: criteria.keywords.join(' '),
      maxItems: 50,
    },
  });
}
```

**Key Improvements:**
- ✅ Pure functions (deterministic input → output)
- ✅ No classes, constructors, or instance state
- ✅ Single responsibility (map criteria to actor input)
- ✅ Returns raw Apify output (normalization happens separately)
- ✅ Easy to test (no mocking required)

#### Normalizer Pattern

Marketplace-specific normalizers map raw Apify output to our `CreateDeal` schema:

```typescript
export function normalizeAmazonOutput(
  rawItems: AmazonApifyItem[],
  options: { userId: string; monitorId?: string }
): CreateDeal[] {
  return rawItems.map(item => ({
    source: 'amazon',
    sourceId: item.asin || generateDeterministicId(item),
    sourceUrl: item.productUrl,
    title: item.title,
    listPrice: parseFloat(item.price),
    currency: 'USD',
    // Timestamp normalization (Date | string | number → Date)
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
    scrapedAt: new Date(),
    // User context
    userId: options.userId,
    monitorId: options.monitorId,
  }));
}
```

**Why Separate Normalizers?**
1. **Separation of Concerns** - Scrapers don't need to know CreateDeal schema
2. **Marketplace Flexibility** - Each marketplace has unique output format
3. **Schema Evolution** - Change CreateDeal without touching scrapers
4. **Type Safety** - Explicit mapping catches schema drift

#### Router (Functional Dispatch)

```typescript
export async function runScrape(payload: JobPayload): Promise<ScrapeResult> {
  // Simple switch/case (no class registry)
  switch (payload.source) {
    case 'amazon': {
      const raw = await scrapeAmazon(payload.params.criteria);
      const deals = normalizeAmazonOutput(raw, {
        userId: payload.meta.userId,
        monitorId: payload.params.monitorId,
      });
      return { dealsFound: deals.length, dealsNew: deals.length, deals };
    }
    // ... other marketplaces
    default:
      throw new Error(`Unknown source: ${payload.source}`);
  }
}
```

**No Classes, No Registry:**
- Direct function invocation
- Easy to trace execution path
- No dependency injection complexity

### 📊 Schema Reconciliation

#### Problem: Type Boundaries

**API Schema** (flexible input):
```typescript
export const TimestampSchema = z.union([z.date(), z.string(), z.number()]);
export type Timestamp = z.infer<typeof TimestampSchema>;
```

**Database Schema** (strict storage):
```typescript
export const deals = pgTable('deals', {
  firstSeenAt: timestamp('first_seen_at').defaultNow(), // Date | null
});
```

**Solution: Normalize at Storage Boundary**

```typescript
await db.insert(schema.deals).values({
  ...deal,
  // Explicit timestamp normalization
  firstSeenAt: deal.firstSeenAt ? new Date(deal.firstSeenAt) : new Date(),
  lastSeenAt: deal.lastSeenAt ? new Date(deal.lastSeenAt) : new Date(),
  scrapedAt: deal.scrapedAt ? new Date(deal.scrapedAt) : new Date(),
});
```

**Why This Design:**
- API accepts flexible formats (ISO strings, Unix timestamps, Date objects)
- Database enforces strict Date types (data integrity)
- Normalization at storage layer maintains separation of concerns

### 🗑️ Deleted Components (Browser Era)

**Files Removed:**
- `workers/src/scrapers/base.scraper.ts` - Abstract class hierarchy
- `workers/src/services/browser.service.ts` - Playwright wrapper
- `workers/src/services/proxy.service.ts` - Proxy rotation
- `workers/src/services/antibot.service.ts` - Fingerprint injection
- `workers/src/scrapers/vinted/*` - jsdom DOM parsing

**Dependencies Removed:**
- `playwright` - Headless browser automation
- `fingerprint-generator` - Browser fingerprinting
- `fingerprint-injector` - Fingerprint injection

**Why Deletion Was Necessary:**
1. **Cost** - Browsers in Cloud Run consume memory/CPU
2. **Reliability** - Browser-based scraping is fragile (timeouts, captcas)
3. **Maintenance** - Antibot measures require constant updates
4. **Architectural Clarity** - Mixing execution models creates confusion

### 🎯 Guarantees

**✅ What This Architecture Guarantees:**
1. **No Browser Processes** - Zero Playwright, jsdom, or DOM references
2. **Type Safety** - All workspace boundaries explicitly typed
3. **Functional Purity** - Scrapers are pure functions
4. **Single Execution Surface** - All scraping through `runApifyActor()`
5. **Explicit Schema Reconciliation** - All type mismatches resolved at boundaries
6. **Cost Visibility** - Apify usage tracked per marketplace

**❌ What This Architecture Prevents:**
1. **TS6059 Errors** - Strict package boundaries enforced
2. **DOM Leakage** - No browser types in workers
3. **Class Sprawl** - No inheritance hierarchies
4. **Hidden Dependencies** - All imports explicit and typed
5. **Runtime Surprises** - Timestamps normalized, coordinates flattened

### 🌍 Environment Configuration

**Required:**
```bash
APIFY_TOKEN=<your-apify-token>  # REQUIRED for all scraping
DATABASE_URL=<postgres-url>
FIREBASE_PROJECT_ID=<project-id>
REDIS_URL=<redis-url>
SHARED_SECRET=<api-worker-auth>
```

**Optional (Apify Configuration):**
```bash
# Actor Overrides (defaults to apify/* actors)
APIFY_ACTOR_AMAZON=apify/amazon-scraper
APIFY_ACTOR_EBAY=apify/ebay-scraper
APIFY_ACTOR_FACEBOOK=apify/facebook-marketplace-scraper
APIFY_ACTOR_VINTED=apify/vinted-scraper
APIFY_ACTOR_CRAIGSLIST=apify/craigslist-scraper

# Execution Limits
APIFY_TIMEOUT_SECS_DEFAULT=120
APIFY_MEMORY_MBYTES_DEFAULT=2048
APIFY_MAX_ITEMS_DEFAULT=50
```

### 📦 Directory Structure (Workers)

```text
workers/
├── src/
│   ├── lib/
│   │   ├── apify.ts              # Apify client wrapper (single execution surface)
│   │   ├── db.ts                 # Database connection
│   │   └── ...
│   ├── scrapers/
│   │   ├── amazon.ts             # Pure function: SearchCriteria → Apify input
│   │   ├── ebay.ts
│   │   ├── facebook.ts
│   │   ├── vinted.ts
│   │   └── craigslist.ts
│   ├── normalize/
│   │   ├── amazon.normalize.ts   # Raw Apify → CreateDeal
│   │   ├── ebay.normalize.ts
│   │   └── ...
│   ├── services/
│   │   ├── storage.service.ts    # Deal persistence + deduplication
│   │   └── ...
│   ├── router.ts                 # Functional dispatch (switch/case)
│   └── index.ts                  # Hono server + job webhook
```

### 🚀 Deployment Checklist

**Pre-Deployment:**
- [ ] Run `pnpm typecheck` (must pass)
- [ ] Verify `APIFY_TOKEN` in Cloud Run environment
- [ ] Ensure no Playwright in `package.json`
- [ ] Confirm scrapers are pure functions (no classes)
- [ ] Check normalizers handle all marketplace formats

**Post-Deployment:**
- [ ] Monitor Apify usage dashboard
- [ ] Verify scraping jobs complete successfully
- [ ] Check database for duplicates (dedup should work)
- [ ] Review logs for `[Apify]` prefixed messages

### 📚 Further Reading

- **Cherry-Pick Analysis**: See `APIFY_CHERRY_PICK_ANALYSIS.md` on branch `claude/extract-cherry-pick-shas-BjjnY` for detailed commit classification and migration strategy
- **TypeScript Config**: `packages/config/typescript/worker.json` - strict mode, no DOM types
- **Schema Reference**: `packages/database/src/schema/deals.ts` - database schema
- **Type Definitions**: `packages/types/src/deals.ts` - CreateDeal schema

---

**This architecture is production-ready and designed for scale.**
