# vendor-drizzle

**Vendored Drizzle ORM (PostgreSQL adapter only)**

## Why Vendoring Exists

This package vendors `drizzle-orm` to solve **registry reliability issues** that blocked production deployments:

1. **npm registry instability** - Intermittent failures during CI/CD builds
2. **Version resolution conflicts** - Workspace hoisting issues in monorepo
3. **Build determinism** - Ensures consistent builds across environments

**This is NOT an architectural preference** - it's a pragmatic solution to infrastructure problems.

## What's Intentionally Kept

### ✅ Retained Adapters
- **`postgres-js/`** - Core PostgreSQL adapter (ACTIVELY USED)
- **`node-postgres/`** - Alternative PostgreSQL adapter (backup option)

### ✅ Core Modules
- **`column-builder.js`** - Type-safe column definitions
- **`alias.js`** - Query aliasing
- **`batch.js`** - Batch operations
- **`relations.js`** - Table relations
- **Schema utilities** - Migration and type generation

### ❌ Removed Adapters (Not Used)
The following adapters were removed to reduce audit surface:
- `aws-data-api/` - AWS RDS Data API
- `better-sqlite3/` - SQLite adapter
- `bun-sqlite/` - Bun runtime SQLite
- `d1/` - Cloudflare D1 database
- `expo-sqlite/` - React Native SQLite
- `op-sqlite/` - React Native SQLite (alternative)
- `sqlite-core/` - SQLite core abstractions
- `sqlite-proxy/` - SQLite proxy adapter

**Rationale:** This is a **PostgreSQL-only SaaS**. These adapters introduce unnecessary supply chain risk and audit overhead.

## How Updates Are Handled

**When to update:**
- Security vulnerabilities in drizzle-orm
- Critical bug fixes required for production
- Major version upgrades after testing

**How to update:**
```bash
# 1. Install fresh version
cd /tmp
npm pack drizzle-orm@latest

# 2. Extract and copy postgres adapters only
tar -xzf drizzle-orm-*.tgz
cd package

# 3. Copy ONLY postgres-related files to vendor-drizzle
cp -r postgres-js/ ../../packages/vendor-drizzle/
cp -r node-postgres/ ../../packages/vendor-drizzle/

# 4. Verify imports still work
cd ../../packages/database
pnpm typecheck

# 5. Test against production database schema
pnpm test
```

## Import Path Configuration

All imports use the vendored version:
```typescript
// packages/database/src/index.ts
import { drizzle } from '@repo/vendor-drizzle/postgres-js';
import { eq, and, or } from '@repo/vendor-drizzle';
```

**DO NOT** mix imports between vendored and npm registry versions.

## Peer Dependencies

Vendoring drizzle-orm introduces peer dependency warnings for unused adapters. These are intentionally ignored in `.npmrc`:

```ini
[peerDependencyRules]
ignoreMissing[]=mysql2              # Not used (postgres-only)
ignoreMissing[]=better-sqlite3      # Not used (postgres-only)
ignoreMissing[]=@aws-sdk/*          # Not using AWS Data API
ignoreMissing[]=@cloudflare/*       # Not using Cloudflare Workers
```

**These ignores are safe** because we explicitly use only the postgres adapter.

## Supply Chain Security

**Audit Notes:**
- Original npm package: `drizzle-orm@0.36.4` (or check package.json)
- Vendored on: 2025-01-08
- Checksum verification: Run `sha256sum` on critical files before updates
- Review changes: Always diff postgres adapter code on updates

**Threat Model:**
- ✅ **Registry compromise** - Mitigated (vendored)
- ✅ **Typosquatting** - Mitigated (no runtime npm installs)
- ⚠️ **Upstream supply chain** - Not mitigated (inherited from drizzle-orm maintainers)

## Maintenance

**Current file count:** ~400 files (down from 526 after removing unused adapters)

**Review schedule:**
- **Monthly** - Check for security advisories
- **Quarterly** - Evaluate moving back to npm registry (if reliability improves)
- **On major drizzle-orm releases** - Assess upgrade necessity

## Exit Strategy

**When to stop vendoring:**
1. npm registry demonstrates 99.9%+ uptime for 6 consecutive months
2. CI/CD builds succeed consistently without registry issues
3. Workspace hoisting conflicts resolved in pnpm

**How to unvendor:**
```bash
# 1. Remove vendor package
rm -rf packages/vendor-drizzle

# 2. Update package.json dependencies
# Replace: "@repo/vendor-drizzle": "workspace:*"
# With: "drizzle-orm": "^0.36.4"

# 3. Update imports
# Replace: from '@repo/vendor-drizzle'
# With: from 'drizzle-orm'

# 4. Test thoroughly
pnpm test
```

---

**Last Updated:** 2026-01-09
**Maintained by:** Platform Engineering
**Questions?** Check internal wiki or Slack #platform-engineering
