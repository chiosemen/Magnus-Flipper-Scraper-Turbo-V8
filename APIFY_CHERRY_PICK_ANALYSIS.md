# Apify Branch Cherry-Pick Extraction Analysis

**Analyst**: Release Engineer & Git Historian
**Source Branch**: `claude/apify-migration-AyRbl`
**Target Branch**: `claude/rewrite-apify-prompt-Xc8Kg`
**Date**: 2026-01-10
**Analysis Type**: Surgical commit extraction for architecture alignment

---

## Executive Summary

❌ **CRITICAL FINDING**: The Apify migration exists as a **single monolithic commit** (`f93e8aa`) that **cannot be safely cherry-picked** due to architectural incompatibility.

### Why This Commit Cannot Be Cherry-Picked

1. **Class-based architecture** - All scrapers are classes (not functional)
2. **Playwright contamination** - `base.scraper.ts` still exists with Playwright imports
3. **Mixed concerns** - Infrastructure, scrapers, router, and blocking logic in one commit
4. **Type coupling** - All files import from `base.scraper.ts` which contains browser code

### Recommended Strategy

✅ **Manual extraction** of infrastructure files only
✅ **Rewrite scrapers** as pure functions (per Step B requirements)
✅ **Delete** BaseScraper entirely
✅ **Remove** all Playwright references

---

## SECTION 1 — COMMIT INVENTORY

### Branch Structure

The Apify branch contains **only one non-merge commit**:

```
6a4fe12 Merge pull request #7 from chiosemen/claude/apify-migration-AyRbl
└── f93e8aa feat: Apify-first migration - replace browser scraping with Apify actors
```

### Commit f93e8aa - Full Analysis

**SHA**: `f93e8aa52ac9f8c41a2888e7e02c6070b94d99a1`
**Message**: "feat: Apify-first migration - replace browser scraping with Apify actors"
**Files Changed**: 14 files, +1311/-443 lines

#### Files Added (A)
- `workers/src/lib/apify.ts` - Apify client wrapper ✅ SAFE
- `workers/src/config/scraping.config.ts` - Scraping configuration ✅ SAFE
- `workers/tests/unit/lib/apify.test.ts` - Apify tests ✅ SAFE
- `workers/tests/unit/services/browserService.test.ts` - Browser blocking tests ⚠️ SAFE but unnecessary

#### Files Modified (M)
- `workers/package.json` - Dependencies ⚠️ PARTIALLY SAFE
- `workers/src/index.ts` - Startup validation ⚠️ SAFE but depends on config
- `workers/src/router.ts` - Scraper dispatch ❌ USES CLASS-BASED SCRAPERS
- `workers/src/scrapers/amazon.scraper.ts` - Amazon ❌ CLASS-BASED, imports base.scraper
- `workers/src/scrapers/ebay.scraper.ts` - eBay ❌ CLASS-BASED, imports base.scraper
- `workers/src/scrapers/facebook.scraper.ts` - Facebook ❌ CLASS-BASED, imports base.scraper
- `workers/src/scrapers/vinted/vinted.scraper.ts` - Vinted ❌ CLASS-BASED, imports base.scraper
- `workers/src/scrapers/craigslist.scraper.ts` - Craigslist ❌ CLASS-BASED, imports base.scraper
- `workers/src/services/browser.service.ts` - Browser blocking ❌ STILL HAS PLAYWRIGHT IMPORTS
- `pnpm-lock.yaml` - Lockfile ⚠️ AUTO-GENERATED

---

## SECTION 2 — CLASSIFICATION BY ARCHITECTURE RULES

### ✅ SAFE TO CHERRY-PICK (None - commit is atomic)

**ZERO FILES** can be safely cherry-picked because:

1. **Infrastructure files** (`apify.ts`, `scraping.config.ts`) are safe in isolation BUT...
2. **They export constants** that scrapers depend on (`APIFY_ACTORS`, `APIFY_DEFAULTS`)
3. **Scrapers are class-based** and violate the functional architecture requirement
4. **Cannot cherry-pick infrastructure without scrapers** - would leave codebase in broken state

### ❌ DO NOT CHERRY-PICK (Entire commit)

| SHA | Files | Rejection Reason |
|-----|-------|------------------|
| `f93e8aa` | All scraper files | Class-based implementation, imports from base.scraper with Playwright |
| `f93e8aa` | `router.ts` | Instantiates class-based scrapers, references base.scraper types |
| `f93e8aa` | `browser.service.ts` | Still contains Playwright imports (even though blocked at runtime) |
| `f93e8aa` | `base.scraper.ts` (not deleted) | Still exists in codebase with Playwright imports |
| `f93e8aa` | `package.json` | Removes playwright but in same commit as architecture violations |

#### Detailed Rejection Analysis

**Scrapers** (amazon, ebay, facebook, vinted, craigslist):
```typescript
// ❌ Imports types from file with Playwright
import { ScrapeResult, ScrapeOptions } from './base.scraper';

// ❌ Class-based (should be functional)
export class AmazonScraper {
  readonly source: DealSource = 'amazon';
  private storageService: StorageService; // ❌ Stateful service

  constructor() { // ❌ Has constructor
    this.storageService = new StorageService();
  }

  // ❌ Instance method (should be pure function)
  async search(criteria: SearchCriteria, options: ScrapeOptions): Promise<ScrapeResult>
```

**base.scraper.ts** (still exists after this commit):
```typescript
// ❌ Playwright contamination remains
import { Page, BrowserContext } from 'playwright';

// ❌ Abstract class still exists
export abstract class BaseScraper {
  protected browserService: BrowserService; // ❌ Browser dependency
  protected antibotService: AntibotService;

  abstract parseSearchResults(page: Page): Promise<...>; // ❌ Playwright Page type
}
```

**router.ts**:
```typescript
// ❌ Still references base.scraper types
import { ScrapeResult, ScrapeOptions } from './scrapers/base.scraper';

// ❌ Instantiates classes instead of calling functions
this.scrapers = {
  craigslist: new CraigslistScraper(), // ❌ new keyword
  ebay: new EbayScraper(),
  amazon: new AmazonScraper(),
};
```

---

## SECTION 3 — FINAL CHERRY-PICK SCRIPT

### Answer: NO CHERRY-PICKS POSSIBLE

```bash
# ❌ DO NOT RUN - No safe cherry-picks exist

# The commit is architecturally incompatible and must be rejected in full.
# Reason: Violates functional architecture requirements by using:
#   - Class-based scrapers (not functions)
#   - Imports from base.scraper.ts (contains Playwright)
#   - Constructor injection of services (not pure functions)
#   - Instance methods (not module-level functions)
```

---

## SECTION 4 — RECOMMENDED EXTRACTION STRATEGY

Since cherry-picking is not viable, here's the **manual extraction** approach:

### Phase 1: Extract Infrastructure (Manual File Creation)

✅ **Create these files by hand** (copying content, not cherry-picking):

1. `workers/src/lib/apify.ts` - Copy entire file
   - Pure Apify wrapper
   - No dependencies on base.scraper
   - Exports: `runApifyActor`, `APIFY_ACTORS`, `APIFY_DEFAULTS`

2. `workers/src/config/scraping.config.ts` - Copy entire file
   - Configuration constants only
   - Exports: `validateScrapingConfig()`, `assertScrapingEnabled()`
   - NOTE: Duplicates exports from apify.ts - may need consolidation

3. `workers/tests/unit/lib/apify.test.ts` - Copy entire file
   - Unit tests for Apify wrapper
   - No architecture violations

4. `workers/package.json` - Manual merge of dependency changes only:
   ```diff
   + "apify-client": "^2.21.0"
   - "playwright": "^1.44.0"  // Only if removing browser entirely
   ```

### Phase 2: Write Functional Scrapers (From Scratch per Step B)

❌ **DO NOT** copy scraper implementations from f93e8aa
✅ **WRITE** new functional scrapers like:

```typescript
// ✅ Correct functional architecture
import { runApifyActor, APIFY_ACTORS, APIFY_DEFAULTS } from '../lib/apify';
import { SearchCriteria, CreateDeal, ScrapeResult } from '@repo/types';

// ✅ Pure function, no class
export async function scrapeAmazon(
  criteria: SearchCriteria,
  options: ScrapeOptions
): Promise<ScrapeResult> {
  const result = await runApifyActor<AmazonApifyItem>({
    actorId: APIFY_ACTORS.AMAZON,
    input: { searchTerms: criteria.keywords.join(' ') },
  });

  const deals = result.items.map(item => mapAmazonItemToDeal(item, options));
  return { dealsFound: deals.length, dealsNew: deals.length, deals };
}

// ✅ Pure mapper function
function mapAmazonItemToDeal(item: AmazonApifyItem, options: ScrapeOptions): CreateDeal {
  return {
    source: 'amazon',
    sourceId: item.asin || generateId(item),
    // ... mapping logic
  };
}
```

### Phase 3: Delete Legacy Files

❌ **DELETE** these files entirely:
- `workers/src/scrapers/base.scraper.ts`
- `workers/src/services/browser.service.ts`
- `workers/src/services/antibot.service.ts` (if browser-only)

### Phase 4: Update Router

✅ **REWRITE** router to call functions instead of instantiating classes:

```typescript
// ✅ Functional dispatch
import { scrapeAmazon } from './scrapers/amazon.scraper';
import { scrapeEbay } from './scrapers/ebay.scraper';
// ...

const SCRAPER_MAP = {
  amazon: scrapeAmazon,
  ebay: scrapeEbay,
  // ... function references, not class instances
};

export async function route(payload: JobPayload) {
  const scraperFn = SCRAPER_MAP[payload.source];
  if (!scraperFn) throw new Error(`Unknown source: ${payload.source}`);

  const result = await scraperFn(payload.params.criteria, {
    jobId: payload.jobId,
    userId: payload.meta.userId
  });
  // ...
}
```

---

## SECTION 5 — ARCHITECTURAL TRADE ANALYSIS

### Why Class-Based Scrapers Violate Requirements

| Aspect | Class-Based (f93e8aa) | Functional (Required) |
|--------|----------------------|----------------------|
| **Instantiation** | `new AmazonScraper()` | `scrapeAmazon(criteria, options)` |
| **State** | `private storageService` | Passed as parameters |
| **Testing** | Mock constructor dependencies | Pure function, easy to test |
| **Type safety** | Inheritance from BaseScraper | Direct function signatures |
| **Imports** | Coupled to base.scraper | Direct imports only |

### Why base.scraper.ts Must Be Deleted

```typescript
// ❌ This file poisons the entire codebase
import { Page, BrowserContext } from 'playwright'; // ← CONTAMINATION

// Even if scrapers don't extend this class, importing types from this file
// creates a transitive Playwright dependency
export interface ScrapeOptions { ... } // ← Types defined here are tainted
```

**Impact**: Any file that imports from `base.scraper.ts` (even just types) pulls in Playwright as a transitive dependency.

### Why Cherry-Picking Infrastructure Alone Would Fail

```bash
# Hypothetical cherry-pick attempt:
git cherry-pick f93e8aa -- workers/src/lib/apify.ts workers/src/config/scraping.config.ts

# ✅ These files would compile
# ❌ But router would be broken (expects class-based scrapers)
# ❌ And no scrapers would exist that use them
# ❌ Result: Non-functional codebase
```

---

## SECTION 6 — SETTLEMENT ANALOGY

**You are settling trades after a volatile session.**

### Trade Classification

| Trade | Executed Price | Settlement Status | Reason |
|-------|---------------|-------------------|---------|
| Apify infrastructure | $1311 credit | ✅ HONORED (manually) | Valid buy signal |
| Class-based scrapers | $443 debit | ❌ VOID | Outside trading rules |
| Browser blocking | $37 debit | ❌ VOID | Incomplete teardown |
| Router class dispatch | $14 debit | ❌ VOID | Wrong execution venue |

**Net Result**: Honor infrastructure trade manually, void all scraper trades, reissue scraper orders as functional contracts.

---

## SECTION 7 — EXECUTION CHECKLIST

Before proceeding to PR construction:

### ✅ Pre-Flight Validation

- [ ] Confirm `claude/rewrite-apify-prompt-Xc8Kg` exists and has clean TypeScript
- [ ] Verify no Playwright dependencies in target branch
- [ ] Verify no BaseScraper class in target branch
- [ ] Ensure target branch has strict TS config

### ✅ Manual Extraction Steps

- [ ] Copy `apify.ts` to target branch (without cherry-pick)
- [ ] Copy `scraping.config.ts` to target branch
- [ ] Copy `apify.test.ts` to target branch
- [ ] Update `package.json` dependencies manually
- [ ] Run `pnpm install` and verify no Playwright
- [ ] Run `pnpm typecheck` - should still pass (no scrapers yet)

### ✅ Functional Scraper Rewrite (Step B)

- [ ] Write `scrapeAmazon()` as pure function
- [ ] Write `scrapeEbay()` as pure function
- [ ] Write `scrapeFacebook()` as pure function
- [ ] Write `scrapeVinted()` as pure function
- [ ] Write `scrapeCraigslist()` as pure function
- [ ] All scrapers call `runApifyActor()` from `apify.ts`
- [ ] All scrapers return normalized `CreateDeal[]`
- [ ] No classes, no constructors, no instance state

### ✅ Architecture Cleanup

- [ ] Delete `base.scraper.ts`
- [ ] Delete `browser.service.ts`
- [ ] Delete antibot service (if browser-only)
- [ ] Update router to functional dispatch
- [ ] Remove all Playwright imports

### ✅ Final Validation

- [ ] `pnpm typecheck` passes
- [ ] No `import.*playwright` anywhere in workers/
- [ ] No `class.*Scraper` definitions
- [ ] No `extends BaseScraper`
- [ ] All scrapers are exported functions
- [ ] Router uses function references not class instances

---

## SECTION 8 — CONCLUSION

### Key Findings

1. **Zero commits** can be safely cherry-picked from the Apify branch
2. The single commit (`f93e8aa`) is **architecturally incompatible**
3. **Manual extraction** of infrastructure is required
4. **Functional rewrite** of scrapers is mandatory

### Recommended Next Steps

1. ✅ **Accept** this analysis (no cherry-picks possible)
2. ✅ **Proceed** to manual extraction (infrastructure only)
3. ✅ **Execute** Step B (functional scraper rewrite)
4. ✅ **Follow** PR Plan D (commit structure)

### Final Assessment

**Status**: ❌ NO CHERRY-PICKS EXECUTABLE
**Reason**: Architectural incompatibility with functional requirements
**Resolution**: Manual extraction + functional rewrite
**Timeline**: Proceed directly to PR construction using Plan D

---

**This analysis is complete and ready for execution.**

*"Only trades executed within exchange rules are honored."*
