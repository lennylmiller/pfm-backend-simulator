# Reverse Proxy Setup (Option 2)

## Overview

This document describes the alternative architecture for running responsive-tiles with pfm-backend-simulator using a reverse proxy. This approach provides maximum production parity by serving both frontend and backend from the same domain.

**Status**: Not yet implemented (documented for future use)

**Current Approach**: CORS-based connection (Option 1) - see main README

## Architecture

### Current Setup (Option 1 - CORS)
```
Browser → http://localhost:8080 (responsive-tiles webpack-dev-server)
          ↓ (CORS request)
          http://pfm.backend.simulator.com:3000/api/v2/* (backend)
```

### Proposed Setup (Option 2 - Reverse Proxy)
```
Browser → http://pfm.backend.simulator.com (reverse proxy)
          ├─ / → responsive-tiles (port 8080)
          └─ /api/v2/* → backend (port 3000)
```

## Benefits

1. **Production Parity**: Matches production architecture where frontend and backend share domain
2. **No CORS Needed**: Same-origin requests, no cross-origin complications
3. **HTTPS Support**: Can add TLS certificates for testing secure features
4. **Service Worker Testing**: Some browser features require HTTPS or localhost
5. **Cookie Security**: Can test secure/httpOnly cookies properly
6. **Subdomain Testing**: Can test multiple subdomains (api.pfm.backend.simulator.com)

## Implementation Options

### Option A: Caddy (Recommended)

**Why Caddy**:
- Automatic HTTPS with self-signed certificates
- Simple configuration
- Built-in reverse proxy
- Perfect for development

**Installation**:
```bash
# macOS
brew install caddy

# Linux
sudo apt install caddy
```

**Caddyfile Configuration**:
```caddy
# /etc/caddy/Caddyfile or ./Caddyfile

pfm.backend.simulator.com {
  # Reverse proxy API calls to backend
  reverse_proxy /api/v2/* localhost:3000

  # Serve frontend from webpack-dev-server
  reverse_proxy localhost:8080 {
    # Preserve WebSocket for hot reload
    header_up Upgrade {http.request.header.Upgrade}
    header_up Connection {http.request.header.Connection}
  }

  # Optional: automatic HTTPS with self-signed cert
  tls internal
}
```

**Start Caddy**:
```bash
caddy run --config Caddyfile
```

### Option B: Nginx

**nginx.conf Configuration**:
```nginx
server {
  listen 80;
  server_name pfm.backend.simulator.com;

  # API endpoints to backend
  location /api/v2/ {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # Frontend from webpack-dev-server
  location / {
    proxy_pass http://localhost:8080;
    proxy_set_header Host $host;

    # WebSocket support for hot reload
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

**Start nginx**:
```bash
sudo nginx -c /path/to/nginx.conf
```

### Option C: Node.js http-proxy

**proxy-server.js**:
```javascript
const http = require('http');
const httpProxy = require('http-proxy');

const proxy = httpProxy.createProxyServer({});

http.createServer((req, res) => {
  if (req.url.startsWith('/api/v2/')) {
    // Proxy API calls to backend
    proxy.web(req, res, { target: 'http://localhost:3000' });
  } else {
    // Proxy everything else to webpack-dev-server
    proxy.web(req, res, { target: 'http://localhost:8080', ws: true });
  }
}).listen(80);

console.log('Reverse proxy running on http://pfm.backend.simulator.com');
```

**Install and Run**:
```bash
npm install -g http-proxy
node proxy-server.js
```

## DNS Configuration

Ensure `/etc/hosts` contains:
```
127.0.0.1 pfm.backend.simulator.com
```

## Environment Variables

### Backend (.env)
```env
# No CORS needed with reverse proxy
ENABLE_CORS=false

# Server runs on localhost:3000
PORT=3000
NODE_ENV=development
```

### Responsive-Tiles (.env)
```env
# Domain matches reverse proxy
PARTNER_DOMAIN=pfm.backend.simulator.com

# JWT shared secret
API_KEY=<same-as-backend-JWT_SECRET>

# User/Partner IDs
PCID=443
PARTNER_ID=1

ENV=development
```

## HTTPS Setup (Optional)

### Self-Signed Certificate with Caddy

Caddy automatically generates self-signed certificates with `tls internal`:

```caddy
pfm.backend.simulator.com {
  tls internal  # Auto-generates self-signed cert
  reverse_proxy /api/v2/* localhost:3000
  reverse_proxy localhost:8080
}
```

Access: `https://pfm.backend.simulator.com` (browser will warn about self-signed cert)

### Self-Signed Certificate with OpenSSL

```bash
# Generate certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/CN=pfm.backend.simulator.com"

# Use with nginx
server {
  listen 443 ssl;
  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;
  server_name pfm.backend.simulator.com;
  # ... proxy configuration
}
```

## CLI Workflow Integration

### Future Enhancement

Modify `tools/cli/workflows/quickStart.ts` to support reverse proxy mode:

```typescript
export interface QuickStartOptions {
  mode: 'cors' | 'reverse-proxy';
  reverseProxy?: {
    type: 'caddy' | 'nginx' | 'nodejs';
    autoStart: boolean;
  };
}
```

**Workflow Steps** (reverse proxy mode):
1. Clear seed data
2. Regenerate seed data
3. Select user and partner
4. Generate JWT shared secret
5. Update backend .env (disable CORS)
6. Start reverse proxy (Caddy/nginx)
7. Start backend server
8. Start responsive-tiles
9. Open browser to http://pfm.backend.simulator.com

## Testing Checklist

- [ ] Reverse proxy starts successfully
- [ ] Frontend loads at http://pfm.backend.simulator.com
- [ ] API calls go to /api/v2/* without CORS errors
- [ ] Webpack hot reload works (WebSocket connection)
- [ ] Authentication flow completes
- [ ] All responsive-tiles features work
- [ ] HTTPS works with self-signed certificate (if enabled)
- [ ] Service worker tests pass (if using HTTPS)

## Troubleshooting

### Port Already in Use
```bash
# Find process on port 80
sudo lsof -i :80

# Kill process
sudo kill -9 <PID>
```

### DNS Resolution Issues
```bash
# Test DNS
ping pfm.backend.simulator.com

# Should resolve to 127.0.0.1
# If not, check /etc/hosts
```

### WebSocket Connection Failed
- Ensure reverse proxy has WebSocket support enabled
- Check `Upgrade` and `Connection` headers are proxied
- Caddy: Automatic
- nginx: Requires `proxy_http_version 1.1` and header configuration

### Certificate Warnings
- Expected with self-signed certificates
- Browser: "Your connection is not private" - click "Advanced" → "Proceed"
- Add certificate to system keychain to avoid warnings (macOS only)

## Comparison: CORS vs Reverse Proxy

| Feature | CORS (Current) | Reverse Proxy |
|---------|---------------|---------------|
| Setup Complexity | Low | Medium |
| Production Parity | Medium | High |
| HTTPS Support | No | Yes (optional) |
| CORS Issues | Possible | None |
| Hot Reload | Works | Works |
| Service Workers | Limited | Full support |
| Cookie Testing | Limited | Full support |
| DNS Required | Yes | Yes |
| Port Requirements | 3000 + 8080 | 80/443 + 3000 + 8080 |

## When to Use

**Use CORS (Current)**:
- Quick development
- No HTTPS needed
- Don't need production parity
- Simpler setup preferred

**Use Reverse Proxy (Future)**:
- Testing HTTPS features
- Service worker development
- Cookie security testing
- Maximum production parity
- Subdomain testing needed

## Implementation Timeline

**Phase 1** (Current): CORS-based connection ✅
**Phase 2** (Future): Add reverse proxy support as optional workflow mode
**Phase 3** (Future): HTTPS with trusted certificates for advanced testing

## References

- [Caddy Documentation](https://caddyserver.com/docs/)
- [nginx Reverse Proxy Guide](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
- [http-proxy npm package](https://www.npmjs.com/package/http-proxy)
- [Webpack DevServer Proxy](https://webpack.js.org/configuration/dev-server/#devserverproxy)
