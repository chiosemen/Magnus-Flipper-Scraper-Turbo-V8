
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

### 🤖 `apps/worker` (Scraper Engine)
| Category | Tool | Why? |
| :--- | :--- | :--- |
| **Core** | **Playwright** | The gold standard for headless browser automation. |
| **Framework** | **Crawlee** | Wraps Playwright to handle queues, proxies, and retries automatically. |
| **Stealth** | **Fingerprint Suite** | Advanced canvas/audio fingerprint spoofing. |

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
