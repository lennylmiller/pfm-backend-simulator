# Caddy Reverse Proxy Integration

## Overview

The pfm-backend-simulator uses Caddy as a reverse proxy to enable HTTPS access, making it a true drop-in replacement for the staging backend without requiring any modifications to responsive-tiles.

## Architecture

```
Browser → http://localhost:8080 (webpack-dev-server)
          ↓
Responsive-tiles makes API calls to: https://pfm.backend.simulator.com/api/v2/*
          ↓
Caddy reverse proxy: https://pfm.backend.simulator.com:443 → http://localhost:3000
          ↓
Backend: http://localhost:3000/api/v2/*
```

## Why Caddy?

**Problem**: Responsive-tiles constructs API URLs as `https://pfm.backend.simulator.com` (HTTPS, no port) based on:
- `useSsl: true` (hardcoded default in tiles.js)
- `aud` claim from JWT (set to PARTNER_DOMAIN environment variable)

**Solution**: Instead of modifying responsive-tiles, we make the backend accessible via HTTPS on port 443 using Caddy.

**Benefits**:
- ✅ Zero responsive-tiles modifications required
- ✅ Automatic HTTPS with self-signed certificates
- ✅ Matches staging workflow pattern
- ✅ Easy to set up and manage
- ✅ Integrated into CLI Quick Start workflow

## Installation

```bash
brew install caddy
```

Or visit https://caddyserver.com/docs/install

## Sudo Requirement

**⚠️ Important**: Caddy requires `sudo` to bind to port 443 (privileged port).

The CLI Quick Start workflow handles this automatically:
1. You'll be prompted for your password **once** at Step 6
2. Credentials are cached for subsequent sudo commands
3. No passwords are stored - OS handles authentication

**See [CADDY_SUDO.md](./CADDY_SUDO.md) for detailed information about:**
- Why sudo is needed
- What to expect during workflow
- Security considerations
- Optional passwordless setup
- Troubleshooting

## Configuration

The `Caddyfile` in the project root configures the reverse proxy:

```caddy
pfm.backend.simulator.com {
  # Reverse proxy all requests to the backend
  reverse_proxy localhost:3000

  # Use Caddy's internal CA for self-signed certificates
  tls internal

  # Enable CORS headers for responsive-tiles frontend
  header {
    Access-Control-Allow-Origin "http://localhost:8080"
    Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS"
    Access-Control-Allow-Headers "X-Requested-With, Content-Type, Authorization"
    Access-Control-Allow-Credentials "true"
  }

  # Handle preflight requests
  @options {
    method OPTIONS
  }
  respond @options 204

  # Logging for debugging
  log {
    output file /Users/LenMiller/code/pfm-backend-simulator/logs/caddy.log
    format json
  }
}
```

## CLI Integration

Caddy is fully integrated into the CLI Quick Start workflow:

### Quick Start Workflow

```bash
npm run cli
# Select: Quick Start Workflow
```

**Steps**:
1. Check Caddy installation
2. Clear and regenerate seed data
3. Select user and partner
4. Generate JWT shared secret
5. Update backend .env with JWT_SECRET
6. **Start Caddy reverse proxy** ← New step
7. Start backend server
8. Start responsive-tiles frontend

### Manual Caddy Management

You can also manage Caddy manually:

**Start Caddy**:
```bash
caddy run --config Caddyfile
```

**Stop Caddy**:
```bash
pkill -f "caddy run"
# or
caddy stop
```

**Validate Configuration**:
```bash
caddy validate --config Caddyfile
```

## Testing the Setup

### 1. Test Backend Directly (HTTP)

```bash
curl http://localhost:3000/health
# Expected: {"status":"ok","timestamp":"..."}
```

### 2. Test Through Caddy (HTTPS)

```bash
curl -k https://pfm.backend.simulator.com/health
# Expected: {"status":"ok","timestamp":"..."}
```

Note: `-k` flag allows insecure connection (self-signed certificate)

### 3. Test Full Integration

1. Start the Quick Start workflow via CLI
2. Navigate to http://localhost:8080
3. Check browser console - API calls should go to `https://pfm.backend.simulator.com`
4. No connection errors should appear

## How Responsive-Tiles Discovers the Domain

The domain comes from the JWT `aud` claim:

**webpack.config.js** (responsive-tiles):
```javascript
// Lines 48-67
const createJwt = () => {
  const partnerDomain = process.env.PARTNER_DOMAIN || 'geez3o.geezeo.com'

  jwt = sign({
    iss: partnerID,
    aud: partnerDomain,  // <-- This becomes auth.host
    sub: pcid,
    iat,
    exp
  }, apiKey)
}
```

**tiles.js** (responsive-tiles):
```javascript
// Line 124
auth.host = token.aud  // Sets host from JWT aud claim
```

**fetch.js** (responsive-tiles):
```javascript
// Line 62
const baseUrl = `http${useSsl ? 's' : ''}://${host}${port ? ':' + port : ''}`
// With useSsl=true (default) and host from aud: https://pfm.backend.simulator.com
```

## Staging Workflow Compatibility

This setup matches how responsive-tiles works with staging:

**Staging**:
```bash
API_KEY=<secret> \
PARTNER_DOMAIN='geezeo.geezeo.banno-staging.com' \
PCID=dpotockitest \
ENV=staging \
npm start
```
- Staging serves HTTPS on port 443 (standard)
- Requests go to: `https://geezeo.geezeo.banno-staging.com/api/v2/*`

**Local with Caddy**:
```bash
API_KEY=<secret> \
PARTNER_DOMAIN='pfm.backend.simulator.com' \
PCID=443 \
ENV=development \
npm start
```
- Caddy serves HTTPS on port 443
- Backend serves HTTP on port 3000
- Requests go to: `https://pfm.backend.simulator.com/api/v2/*`

**Key Difference**: Local setup uses Caddy to bridge HTTP backend (port 3000) to HTTPS endpoint (port 443).

## Troubleshooting

### Certificate Warnings

**Problem**: Browser shows certificate warning for `https://pfm.backend.simulator.com`

**Solution**: This is expected with Caddy's self-signed certificates. Options:
1. Click "Accept Risk" (recommended for development)
2. Add Caddy's root CA to your system trust store (advanced)

### Caddy Not Starting

**Check if another process is using port 443**:
```bash
sudo lsof -i :443
```

**Check Caddy logs**:
```bash
tail -f logs/caddy.log
```

### Backend Not Reachable Through Caddy

**Verify backend is running**:
```bash
curl http://localhost:3000/health
```

**Verify Caddy is running**:
```bash
ps aux | grep caddy
```

**Check Caddyfile syntax**:
```bash
caddy validate --config Caddyfile
```

## Files Modified

This integration adds/modifies:

- ✅ **Caddyfile** - Reverse proxy configuration
- ✅ **tools/cli/modules/caddyManager.ts** - Caddy process management
- ✅ **tools/cli/workflows/quickStart.ts** - Integrated Caddy into workflow
- ✅ **tools/cli/types/workflow.ts** - Added `caddyProcess` to context

## Drop-in Replacement Verification

To verify this is truly a drop-in replacement:

1. ✅ No responsive-tiles modifications required
2. ✅ Same environment variable workflow as staging
3. ✅ Same HTTPS endpoint pattern
4. ✅ Same JWT-based authentication
5. ✅ Zero configuration changes to responsive-tiles codebase

## References

- [Caddy Documentation](https://caddyserver.com/docs/)
- [Caddy Reverse Proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)
- [Caddy Internal TLS](https://caddyserver.com/docs/caddyfile/directives/tls#internal)
