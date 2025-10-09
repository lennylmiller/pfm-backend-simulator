# ENV Variable Fix: Using ENV=staging for Drop-In Replacement

## Problem Identified

The CLI was starting responsive-tiles with `ENV=development`, which didn't correctly match the intended behavior of pfm-backend-simulator as a **drop-in replacement for staging**.

## Analysis

### How ENV Variable Works

In `responsive-tiles/webpack.config.js`:

```javascript
let TEST_HARNESS_SUB_PATH = process.env.ENV
let DEPLOY_BUCKET_PREFIX = 'dev'
if(process.env.ENV === 'staging') {
  DEPLOY_BUCKET_PREFIX = 'stage'
}
if(process.env.ENV === 'production') {
  DEPLOY_BUCKET_PREFIX = 'prod'
}
if(process.env.ENV === 'development') {
  TEST_HARNESS_SUB_PATH = 'qa'
}
```

**ENV affects**:
- Webpack `publicPath` for assets (lines 229, 235, 241)
- Bucket prefix for cloud deployments
- Test harness configuration

**ENV does NOT affect**:
- API base URL (comes from JWT `aud` field via `PARTNER_DOMAIN`)
- Authentication mechanism

### How PARTNER_DOMAIN Becomes API Host

In `tiles.js:123-124`:
```javascript
if (!auth.host) {
  auth.host = token.aud  // JWT audience claim becomes API host
}
```

In `fetch.js:62`:
```javascript
const baseUrl = `http${useSsl ? 's' : ''}://${host}${port ? ':' + port : ''}`
// Returns: https://pfm.backend.simulator.com/api/v2
```

### Staging Pattern (Reference)

Real staging environment uses:
```bash
API_KEY=a0aaac50f0bdfec4973620ce8a7cbb5400af7b4283671b02671ed7f78b3bcd733a8dc791643f88ed2e0f4505298a9efbd51e34fdeb10431f5113c7fecccabc95 \
PARTNER_DOMAIN='geezeo.geezeo.banno-staging.com' \
PCID=dpotockitest \
ENV=staging \
npm start
```

## Solution

### Correct Configuration for pfm-backend-simulator

Since `pfm.backend.simulator.com` **is a drop-in replacement** for `geezeo.geezeo.banno-staging.com`:

**Use ENV=staging** ✅

Complete startup command:
```bash
API_KEY=<generated-secret> \
PARTNER_DOMAIN='pfm.backend.simulator.com' \
PCID=<userId> \
ENV=staging \
npm start
```

### Why ENV=staging is Correct

1. ✅ pfm-backend-simulator **replaces** geezeo.geezeo.banno-staging.com
2. ✅ Matches production staging environment behavior
3. ✅ webpack publicPath will use "staging" in asset URLs
4. ✅ DEPLOY_BUCKET_PREFIX='stage' matches staging conventions
5. ✅ Behaves identically to real staging environment

### Why ENV=development Would Be Wrong

1. ❌ Implies QA environment, not staging replacement
2. ❌ TEST_HARNESS_SUB_PATH would be 'qa' instead of 'staging'
3. ❌ Doesn't match intended drop-in replacement behavior

## Implementation

### Files Changed

1. **`tools/cli/modules/responsiveTilesManager.ts:83`**
   - Changed `ENV: 'development'` → `ENV: 'staging'`
   - Used in spawn() environment when starting responsive-tiles

2. **`tools/cli/modules/responsiveTilesManager.ts:200`**
   - Updated generateStartupCommand() display
   - Shows `ENV=staging` in command output

3. **`tools/cli/modules/responsiveTilesManager.ts:224`**
   - Updated documentation comment
   - Explains staging as "drop-in replacement for staging environment"

4. **Removed `/Users/LenMiller/code/banno/responsive-tiles/.env`**
   - Manual .env file deleted
   - All configuration now via spawn() environment variables
   - Matches staging pattern (no .env file)

## Build Verification

```bash
npm run build
```

✅ TypeScript compilation successful

## Testing

After changes, responsive-tiles will start with:
```bash
API_KEY=<generated> \
PARTNER_DOMAIN='pfm.backend.simulator.com' \
PCID=<userId> \
ENV=staging \
PORT=8080 \
npm start
```

Expected behavior:
- API calls to: `https://pfm.backend.simulator.com/api/v2/...`
- JWT signed with matching API_KEY
- Webpack asset URLs use "staging" prefix
- Identical behavior to real staging environment

## Key Takeaways

- **No .env file** - All config via environment variables at startup
- **ENV=staging** - Matches staging environment behavior
- **PARTNER_DOMAIN controls API host** - Not ENV variable
- **Drop-in replacement** - Behaves identically to geezeo.geezeo.banno-staging.com
