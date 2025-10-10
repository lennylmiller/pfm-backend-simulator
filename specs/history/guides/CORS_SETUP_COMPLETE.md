# CORS Setup - Drop-In Replacement Architecture ✅

## Implementation Complete

The pfm-backend-simulator now functions as a true drop-in replacement for the Geezeo staging backend, using CORS to allow responsive-tiles to connect directly.

## What Was Changed

### 1. Backend CORS Configuration ✅
**File**: `/Users/LenMiller/code/pfm-backend-simulator/.env`
**Status**: Already configured correctly

```env
ENABLE_CORS=true
CORS_ORIGINS="http://localhost:3001,http://localhost:8080,http://localhost:8081"
```

### 2. Responsive-Tiles Environment ✅
**File**: `/Users/LenMiller/code/banno/responsive-tiles/.env`
**Status**: Created new file

```env
# JWT Configuration (must match backend JWT_SECRET)
API_KEY=b29b7113d2a972204eab307d5c92202c5f46a11f7a4f6fda3b9a47766ea0d4a2c851abfdb2addfcac513e5c28c92187452ceffe95680ee6005d54030c25cf061

# Partner/Domain Configuration
PARTNER_DOMAIN=pfm.backend.simulator.com
PCID=443
PARTNER_ID=1

# Environment
ENV=development
NODE_ENV=development
```

### 3. Quick Start Workflow Fix ✅
**File**: `tools/cli/modules/responsiveTilesManager.ts` (Line 41)
**Status**: Fixed

**Before**:
```typescript
PARTNER_DOMAIN: domain,  // Used config value
```

**After**:
```typescript
PARTNER_DOMAIN: 'pfm.backend.simulator.com',  // Always use backend domain for drop-in replacement
```

### 4. Reverse Proxy Documentation ✅
**File**: `docs/REVERSE_PROXY_SETUP.md`
**Status**: Created for future implementation

Complete documentation for Option 2 (Caddy/nginx reverse proxy setup).

## Architecture

### Request Flow (CORS Approach)

```
┌─────────────────────────────────────────────────────────────┐
│ Browser: http://localhost:8080                              │
│ (responsive-tiles served by webpack-dev-server)             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Direct CORS Request
                     │ Authorization: Bearer <JWT>
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend: http://pfm.backend.simulator.com:3000/api/v2/*     │
│ (pfm-backend-simulator Express server)                      │
│                                                              │
│ CORS Headers:                                                │
│   Access-Control-Allow-Origin: http://localhost:8080        │
│   Access-Control-Allow-Methods: GET, POST, PUT, DELETE      │
│   Access-Control-Allow-Headers: Authorization, Content-Type │
└─────────────────────────────────────────────────────────────┘
```

### JWT Token Structure

```json
{
  "iss": "1",                        // Partner ID
  "aud": "pfm.backend.simulator.com", // Domain (used by frontend to build URLs)
  "sub": "443",                       // User ID
  "iat": 1696723200,
  "exp": 1696809600
}
```

**Critical**: The `aud` claim must be `pfm.backend.simulator.com` so responsive-tiles constructs URLs like:
- `http://pfm.backend.simulator.com:3000/api/v2/users/443/accounts`

## How to Use

### Option 1: Quick Start Workflow (Recommended)

```bash
# Terminal 1: Run pfm-backend-simulator CLI
cd /Users/LenMiller/code/pfm-backend-simulator
npm run cli

# Select: 🚀 Quick Start Workflow
# The workflow will:
#   1. Clear seed data
#   2. Regenerate seed data
#   3. Select user and partner
#   4. Generate JWT shared secret
#   5. Update backend .env
#   6. Start backend server
#   7. Start responsive-tiles
```

### Option 2: Manual Setup

```bash
# Terminal 1: Start backend
cd /Users/LenMiller/code/pfm-backend-simulator
npm run dev

# Terminal 2: Start responsive-tiles
cd /Users/LenMiller/code/banno/responsive-tiles
npm start

# Terminal 3: Open browser
open http://localhost:8080
```

### Verify Setup

1. **Backend Health**:
   ```bash
   curl http://pfm.backend.simulator.com:3000/health
   # Expected: {"status":"ok","timestamp":"..."}
   ```

2. **CORS Headers**:
   ```bash
   curl -H "Origin: http://localhost:8080" \
        -H "Access-Control-Request-Method: GET" \
        -H "Access-Control-Request-Headers: authorization" \
        -X OPTIONS \
        http://pfm.backend.simulator.com:3000/api/v2/users/443/accounts
   # Expected: Access-Control-Allow-Origin: http://localhost:8080
   ```

3. **Responsive-Tiles**:
   - Open: http://localhost:8080
   - Should load without "Oops! Something went wrong!"
   - Browser console: No CORS errors
   - Network tab: Requests go to `http://pfm.backend.simulator.com:3000/api/v2/*`

## Troubleshooting

### Issue: "Oops! Something went wrong!"

**Check**:
1. Backend is running: `curl http://pfm.backend.simulator.com:3000/health`
2. Responsive-tiles .env exists: `cat /Users/LenMiller/code/banno/responsive-tiles/.env`
3. PARTNER_DOMAIN is correct: Should be `pfm.backend.simulator.com`

### Issue: CORS Errors in Browser Console

**Error**: `Access to fetch at 'http://pfm.backend.simulator.com:3000/api/v2/...' has been blocked by CORS policy`

**Fix**:
1. Check backend .env: `ENABLE_CORS=true` and `CORS_ORIGINS` includes `http://localhost:8080`
2. Restart backend after changing .env

### Issue: "ERR_CONNECTION_REFUSED"

**Error**: `GET http://pfm.backend.simulator.com:3000/api/v2/... net::ERR_CONNECTION_REFUSED`

**Fix**:
1. Backend not running - start with `npm run dev`
2. DNS issue - verify `/etc/hosts` has `127.0.0.1 pfm.backend.simulator.com`

### Issue: JWT Validation Error

**Error**: `aud should only be the domain name`

**Fix**:
- Ensure `PARTNER_DOMAIN=pfm.backend.simulator.com` (not localhost, not with protocol/port)

### Issue: Webpack Proxy Not Working

**Not a Problem**:
- Responsive-tiles doesn't use webpack proxy for API calls
- It constructs full URLs from JWT `aud` claim
- CORS allows direct cross-origin requests

## Benefits of This Architecture

1. **True Drop-In Replacement**: Responsive-tiles connects to pfm-backend-simulator exactly like it connects to staging
2. **Matches Production Pattern**: Same CORS-based architecture as staging environment
3. **No Code Changes**: Responsive-tiles requires zero modifications
4. **Development Flexibility**: Can run backend and frontend on different machines
5. **Easy Testing**: Simple to verify backend responses independently

## Comparison to Staging

| Aspect | Staging | Local (pfm-backend-simulator) |
|--------|---------|------------------------------|
| Frontend URL | http://localhost:8080 | http://localhost:8080 |
| Backend URL | https://geezeo.geezeo.banno-staging.com | http://pfm.backend.simulator.com:3000 |
| Connection | CORS | CORS |
| JWT aud claim | geezeo.geezeo.banno-staging.com | pfm.backend.simulator.com |
| API Path | /api/v2/* | /api/v2/* |
| Authentication | Bearer JWT | Bearer JWT |

## Next Steps

### Current Status ✅
- CORS approach fully implemented
- Quick Start Workflow updated
- Documentation complete
- Ready for testing

### Future Enhancements
1. **Reverse Proxy Option**: Implement Option 2 for maximum production parity (see `REVERSE_PROXY_SETUP.md`)
2. **HTTPS Support**: Add TLS certificates for testing secure features
3. **Multi-Domain Testing**: Support multiple partner domains
4. **CLI Mode Selection**: Add flag to choose CORS vs reverse proxy mode

## Testing Checklist

- [x] Backend CORS configured correctly
- [x] Responsive-tiles .env created
- [x] Quick Start Workflow fixed
- [x] Backend health endpoint responds
- [ ] Quick Start Workflow runs successfully
- [ ] Responsive-tiles loads at localhost:8080
- [ ] No CORS errors in browser console
- [ ] API calls reach backend
- [ ] Authentication flow completes
- [ ] All responsive-tiles features work

## Files Modified

1. `/Users/LenMiller/code/banno/responsive-tiles/.env` - **Created**
2. `/Users/LenMiller/code/pfm-backend-simulator/tools/cli/modules/responsiveTilesManager.ts` - Line 41 modified
3. `/Users/LenMiller/code/pfm-backend-simulator/docs/REVERSE_PROXY_SETUP.md` - **Created**
4. `/Users/LenMiller/code/pfm-backend-simulator/docs/CORS_SETUP_COMPLETE.md` - **Created** (this file)

## References

- Original issue discussion: Responsive-tiles showing "Oops! Something went wrong!"
- Root cause: JWT `aud` claim used to construct API URLs
- Solution: CORS support + correct PARTNER_DOMAIN configuration
- Alternative: Reverse proxy setup (documented for future)
