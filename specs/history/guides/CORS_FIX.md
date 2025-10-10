# CORS Fix - Duplicate Headers Issue

## Problem

The responsive-tiles frontend was showing "Oops! Something went wrong!" error at http://localhost:8080 with all API requests failing.

### Root Cause

Browser console showed:
```
The 'Access-Control-Allow-Origin' header contains multiple values
'http://localhost:8080, http://localhost:8080', but only one is allowed.
```

**Why this happened**: Both Caddy and the Express backend were adding CORS headers:
1. **Caddy** (Caddyfile lines 13-16) added CORS headers via `header` directive
2. **Express backend** (src/index.ts lines 16-24) added CORS headers via `cors()` middleware

When both added the same headers, browsers saw duplicate values and rejected all requests.

## Solution

### 1. Disable CORS in Backend
**File**: `.env`
**Change**: `ENABLE_CORS=true` → `ENABLE_CORS=false`

**Why**: Since Caddy handles CORS at the proxy level, the backend doesn't need to add headers.

### 2. Fix Caddy Header Syntax
**File**: `Caddyfile`

**Before** (lines 12-18):
```caddy
# Enable CORS headers for responsive-tiles frontend
header {
  Access-Control-Allow-Origin "http://localhost:8080"
  Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  Access-Control-Allow-Headers "X-Requested-With, Content-Type, Authorization"
  Access-Control-Allow-Credentials "true"
}
```

**After**:
```caddy
# Enable CORS headers for responsive-tiles frontend
header Access-Control-Allow-Origin "http://localhost:8080"
header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS"
header Access-Control-Allow-Headers "X-Requested-With, Content-Type, Authorization"
header Access-Control-Allow-Credentials "true"
```

**Why**: The `header { }` block syntax was causing Caddy to duplicate some headers. Individual `header` directives work correctly.

## Verification

### Before Fix
```bash
curl -k -I https://pfm.backend.simulator.com/api/v2/users/current | grep access-control

# Output showed duplicate headers:
access-control-allow-credentials: true
access-control-allow-credentials: true  # <-- DUPLICATE
access-control-allow-headers: X-Requested-With, Content-Type, Authorization
access-control-allow-methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
access-control-allow-origin: http://localhost:8080
```

### After Fix
```bash
curl -k -I https://pfm.backend.simulator.com/api/v2/users/current | grep access-control

# Output shows each header only once:
access-control-allow-credentials: true
access-control-allow-headers: X-Requested-With, Content-Type, Authorization
access-control-allow-methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
access-control-allow-origin: http://localhost:8080
```

## Test Backend CORS is Disabled

```bash
curl -I http://localhost:3000/api/v2/users/current | grep access-control

# Output: (empty - no CORS headers from backend)
```

## Architecture

### Request Flow
```
Browser (localhost:8080)
  ↓ HTTPS request
Caddy (port 443) [Adds CORS headers here]
  ↓ HTTP proxy
Backend (port 3000) [No CORS headers]
  ↓ Response
Caddy [Forwards response with CORS headers]
  ↓
Browser [Accepts response - single CORS headers]
```

## Why This Design?

### Centralized CORS at Proxy Level
**Benefits**:
- ✅ Single source of truth for CORS configuration
- ✅ Backend stays simple (no CORS middleware)
- ✅ Easier to manage CORS across multiple backends
- ✅ Proxy can handle OPTIONS preflight requests efficiently

### Alternative Design (Not Used)
Could disable CORS in Caddy and enable in backend:
- ❌ More complex backend configuration
- ❌ Caddy still needs to handle OPTIONS requests
- ❌ Harder to manage multi-backend scenarios

## Configuration Reference

### Caddy CORS Headers
```caddy
header Access-Control-Allow-Origin "http://localhost:8080"
header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS"
header Access-Control-Allow-Headers "X-Requested-With, Content-Type, Authorization"
header Access-Control-Allow-Credentials "true"
```

### Caddy OPTIONS Handler
```caddy
@options {
  method OPTIONS
}
respond @options 204
```

### Backend CORS Config
```env
# .env
ENABLE_CORS=false  # Caddy handles CORS
CORS_ORIGINS="http://localhost:8080,http://localhost:8081"  # Not used when disabled
```

## Related Files

- **Caddyfile** - CORS headers and OPTIONS handling
- **.env** - Backend CORS configuration
- **src/index.ts** - Express CORS middleware (lines 16-24)
- **docs/CADDY_INTEGRATION.md** - Full Caddy setup documentation

## Troubleshooting

### If CORS errors return:
1. Check Caddy is running: `curl -k https://pfm.backend.simulator.com/health`
2. Verify backend CORS disabled: `.env` has `ENABLE_CORS=false`
3. Check for duplicate headers: `curl -k -I https://pfm.backend.simulator.com/api/v2/users/current | grep access-control`
4. Restart backend after .env changes: `npm start`
5. Restart Caddy after Caddyfile changes: `sudo pkill -f "caddy run" && sudo caddy run --config Caddyfile`

### Common Issues
- **Backend not restarted**: .env changes require restart
- **Caddy not restarted**: Caddyfile changes require reload
- **Multiple Caddy instances**: Stop all with `sudo pkill -f "caddy run"`
- **Wrong origin**: Frontend must be exactly `http://localhost:8080`
