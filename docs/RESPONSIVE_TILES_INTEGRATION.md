# Responsive-Tiles Integration Guide

Complete guide for connecting the responsive-tiles frontend to the pfm-backend-simulator.

## Table of Contents

- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Backend Configuration](#backend-configuration)
- [Frontend Configuration](#frontend-configuration)
- [Authentication Setup](#authentication-setup)
- [Testing the Connection](#testing-the-connection)
- [Troubleshooting](#troubleshooting)
- [API Compatibility](#api-compatibility)

---

## Quick Start

### 5-Minute Setup

**1. Start the backend:**
```bash
cd pfm-backend-simulator
npm run dev
# Backend running at http://localhost:3000
```

**2. Configure responsive-tiles:**
```javascript
// In your responsive-tiles configuration
global.geezeo._auth = {
  useSsl: false,              // No HTTPS for local dev
  host: 'localhost',          // Backend hostname
  port: 3000,                 // Backend port
  jwt: '<YOUR_JWT_TOKEN>',    // Generated JWT (see below)
  userId: '1',                // User ID from database
  partnerId: '1',             // Partner ID from database
  prefix: ''                  // No URL prefix
}
```

**3. Generate JWT token:**
```bash
# Use Node.js to generate a token
node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { userId: '1', partnerId: '1' },
  'your-secret-key-change-in-production-minimum-32-chars',
  { expiresIn: '24h' }
);
console.log('JWT Token:', token);
"
```

**4. Test the connection:**
```bash
# Test from responsive-tiles or terminal
curl http://localhost:3000/api/v2/partners/current \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

---

## Prerequisites

### Backend Requirements

1. **PFM Backend Simulator running**:
   ```bash
   cd pfm-backend-simulator
   npm install
   npm run dev
   ```
   ✅ Backend should be at `http://localhost:3000`

2. **Database with data**:
   ```bash
   # Check if database exists and has data
   psql -d pfm_simulator -c "SELECT COUNT(*) FROM users"

   # If empty, seed with test data:
   npm run seed -- generate --scenario realistic
   ```

3. **Environment configured**:
   ```bash
   # Verify .env file exists
   cat .env

   # Key settings:
   PORT=3000
   JWT_SECRET=your-secret-key-change-in-production-minimum-32-chars
   ENABLE_CORS=true
   CORS_ORIGINS=http://localhost:3001,http://localhost:8080
   ```

### Frontend Requirements

1. **Responsive-tiles repository**
2. **Node.js 20+**
3. **Access to configure `global.geezeo._auth`**

---

## Backend Configuration

### 1. CORS Setup

The backend must allow requests from your responsive-tiles origin.

**Update `.env`**:
```env
ENABLE_CORS=true
CORS_ORIGINS=http://localhost:3001,http://localhost:8080
```

**If responsive-tiles runs on a different port** (e.g., 4000):
```env
CORS_ORIGINS=http://localhost:3001,http://localhost:8080,http://localhost:4000
```

**Verify CORS is enabled**:
```bash
# Check server logs when starting
npm run dev

# Should see:
# [INFO] PFM Backend Simulator listening on port 3000
```

### 2. JWT Secret Configuration

**Important**: The JWT secret in `.env` must match what you use to generate tokens.

**`.env`**:
```env
JWT_SECRET=your-secret-key-change-in-production-minimum-32-chars
```

**Best practice**: Use a strong, random 32+ character secret:
```bash
# Generate a secure secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Database User IDs

**Find available users**:
```bash
psql -d pfm_simulator -c "SELECT id, email, first_name, last_name FROM users LIMIT 5"
```

**Example output**:
```
 id |        email        | first_name | last_name
----+---------------------+------------+-----------
  1 | john@example.com    | John       | Doe
  2 | alice@example.com   | Alice      | Smith
  3 | bob@example.com     | Bob        | Johnson
```

**Use one of these user IDs** in your JWT token and frontend config.

---

## Frontend Configuration

### Method 1: Direct Configuration (Development)

Configure responsive-tiles to point to your local backend.

**Location**: Usually in responsive-tiles initialization or config file

```javascript
// Set global Geezeo auth configuration
global.geezeo = global.geezeo || {};
global.geezeo._auth = {
  // Connection settings
  useSsl: false,              // Set to true if using HTTPS
  host: 'localhost',          // Backend hostname
  port: 3000,                 // Backend port (default: 3000)
  prefix: '',                 // URL prefix (usually empty)

  // Authentication
  jwt: '<YOUR_JWT_TOKEN>',    // JWT token (see generation below)
  userId: '1',                // User ID from database
  partnerId: '1',             // Partner ID from database

  // Optional OAuth (not needed for JWT auth)
  clientSecret: null,
  session: null,
};
```

### Method 2: Environment-Based Configuration (Production)

**Create environment config file**:
```javascript
// config/local.js
export default {
  api: {
    useSsl: false,
    host: process.env.REACT_APP_API_HOST || 'localhost',
    port: parseInt(process.env.REACT_APP_API_PORT || '3000'),
    prefix: process.env.REACT_APP_API_PREFIX || '',
  },
  auth: {
    userId: process.env.REACT_APP_USER_ID || '1',
    partnerId: process.env.REACT_APP_PARTNER_ID || '1',
  },
};
```

**Set environment variables**:
```bash
# .env.local (responsive-tiles)
REACT_APP_API_HOST=localhost
REACT_APP_API_PORT=3000
REACT_APP_USER_ID=1
REACT_APP_PARTNER_ID=1
```

### Base URL Construction

The responsive-tiles `fetch.js` constructs URLs like this:

```javascript
// From responsive-tiles src/api/fetch.js
const baseUrl = `http${useSsl ? 's' : ''}://${host}${port ? ':' + port : ''}`
const fullUrl = `${baseUrl}/api/v2${path}`

// Example results:
// http://localhost:3000/api/v2/users/current
// http://localhost:3000/api/v2/users/1/accounts/all
```

**Verify your config produces correct URLs**:
```javascript
const { useSsl, host, port } = global.geezeo._auth;
const baseUrl = `http${useSsl ? 's' : ''}://${host}${port ? ':' + port : ''}`;
console.log('API Base URL:', baseUrl + '/api/v2');
// Should output: http://localhost:3000/api/v2
```

---

## Authentication Setup

### Understanding JWT Authentication

The backend expects JWT tokens in the `Authorization` header:

```
Authorization: Bearer <JWT_TOKEN>
```

**JWT Payload Structure**:
```json
{
  "userId": "1",
  "partnerId": "1",
  "iat": 1234567890,    // Issued at timestamp
  "exp": 1234654290     // Expiration timestamp
}
```

### Generating JWT Tokens

#### Method 1: Node.js Script (Recommended)

**Create `tools/generate-jwt.js`**:
```javascript
const jwt = require('jsonwebtoken');

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production-minimum-32-chars';
const userId = process.argv[2] || '1';
const partnerId = process.argv[3] || '1';
const expiresIn = process.argv[4] || '24h';

// Generate token
const token = jwt.sign(
  {
    userId: userId,
    partnerId: partnerId,
  },
  JWT_SECRET,
  { expiresIn: expiresIn }
);

console.log('\nGenerated JWT Token:');
console.log('─'.repeat(80));
console.log(token);
console.log('─'.repeat(80));
console.log('\nToken Details:');
console.log(`  User ID: ${userId}`);
console.log(`  Partner ID: ${partnerId}`);
console.log(`  Expires: ${expiresIn}`);
console.log('\nUse in responsive-tiles config:');
console.log(`  jwt: '${token}'`);
console.log('');
```

**Usage**:
```bash
# Generate token for user 1, partner 1 (24h expiry)
node tools/generate-jwt.js

# Generate for specific user
node tools/generate-jwt.js 2 1

# Generate with 7-day expiry
node tools/generate-jwt.js 1 1 7d
```

#### Method 2: Online Tool (Development Only)

Use [jwt.io](https://jwt.io) for development/testing:

1. Go to https://jwt.io
2. Select algorithm: **HS256**
3. Payload:
   ```json
   {
     "userId": "1",
     "partnerId": "1"
   }
   ```
4. Secret: `your-secret-key-change-in-production-minimum-32-chars`
5. Copy generated token

**⚠️ Warning**: Never use online tools for production secrets!

#### Method 3: Command Line (Quick)

```bash
# One-liner (requires jsonwebtoken installed globally)
node -e "const jwt=require('jsonwebtoken');console.log(jwt.sign({userId:'1',partnerId:'1'},'your-secret-key-change-in-production-minimum-32-chars',{expiresIn:'24h'}))"
```

### Token Expiration Handling

**Default expiry**: 24 hours

**Responsive-tiles automatic refresh**:
The responsive-tiles frontend has built-in JWT expiration detection:

```javascript
// From responsive-tiles src/api/fetch.js
if (isJwtExpired(jwt) && global.geezeo.onJwtExpired) {
  await global.geezeo.onJwtExpired(jwt)
  // Retry request with new JWT
}
```

**Implement refresh callback**:
```javascript
global.geezeo.onJwtExpired = async (expiredToken) => {
  // Option 1: Call your auth service to get new token
  const newToken = await yourAuthService.refreshToken();

  // Option 2: Redirect to login
  window.location.href = '/login';

  // Update global config
  global.geezeo._auth.jwt = newToken;

  return newToken;
};
```

---

## Testing the Connection

### 1. Health Check

```bash
# Test backend is running
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","timestamp":"2024-10-01T18:30:00.000Z"}
```

### 2. Test Authentication

```bash
# Generate a JWT token first
TOKEN=$(node -e "const jwt=require('jsonwebtoken');console.log(jwt.sign({userId:'1',partnerId:'1'},'your-secret-key-change-in-production-minimum-32-chars',{expiresIn:'24h'}))")

# Test with partners endpoint
curl http://localhost:3000/api/v2/partners/current \
  -H "Authorization: Bearer $TOKEN"

# Expected response:
# {
#   "partner": {
#     "id": "1",
#     "name": "...",
#     "domain": "..."
#   }
# }
```

### 3. Test User Endpoint

```bash
# Get current user
curl http://localhost:3000/api/v2/users/current \
  -H "Authorization: Bearer $TOKEN"

# Note: This endpoint may not be fully implemented yet
# Check API.md for current implementation status
```

### 4. Test Accounts Endpoint

```bash
# Get all accounts for user 1
curl http://localhost:3000/api/v2/users/1/accounts/all \
  -H "Authorization: Bearer $TOKEN"

# Expected response:
# {
#   "accounts": [
#     {
#       "id": "1",
#       "userId": "1",
#       "name": "Primary Checking",
#       "accountType": "checking",
#       "balance": "1234.56",
#       ...
#     }
#   ]
# }
```

### 5. Test from Responsive-Tiles

**Create a test API call**:
```javascript
// In responsive-tiles console or test file
import { getCurrentPartner } from '@geezeo/api/partners';

async function testConnection() {
  try {
    const partner = await getCurrentPartner();
    console.log('✅ Backend connected!', partner);
  } catch (error) {
    console.error('❌ Connection failed:', error);
  }
}

testConnection();
```

### 6. Browser DevTools Test

```javascript
// Open browser console in responsive-tiles
// Verify configuration
console.log('API Config:', global.geezeo._auth);

// Test fetch
fetch('http://localhost:3000/api/v2/partners/current', {
  headers: {
    'Authorization': 'Bearer ' + global.geezeo._auth.jwt
  }
})
.then(r => r.json())
.then(data => console.log('Response:', data))
.catch(err => console.error('Error:', err));
```

---

## Troubleshooting

### Connection Issues

#### Error: "Failed to fetch" / "Network request failed"

**Cause**: CORS not configured or backend not running

**Solutions**:
```bash
# 1. Verify backend is running
curl http://localhost:3000/health

# 2. Check CORS configuration in .env
cat .env | grep CORS

# Should show:
# ENABLE_CORS=true
# CORS_ORIGINS=http://localhost:3001,...

# 3. Add your responsive-tiles origin if missing
# Edit .env and add your port:
CORS_ORIGINS=http://localhost:3001,http://localhost:8080,http://localhost:4000

# 4. Restart backend
npm run dev
```

**Check browser console for CORS errors**:
```
Access to fetch at 'http://localhost:3000/api/v2/...' from origin 'http://localhost:4000'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

#### Error: "401 Unauthorized"

**Cause**: Invalid or missing JWT token

**Solutions**:
```javascript
// 1. Verify JWT is set
console.log('JWT:', global.geezeo._auth.jwt);

// 2. Verify JWT secret matches .env
// Check .env JWT_SECRET value

// 3. Generate new token with correct secret
node tools/generate-jwt.js

// 4. Check token is not expired
// Decode at https://jwt.io to see expiration
```

**Verify token manually**:
```bash
# Test token works
curl http://localhost:3000/api/v2/partners/current \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# If this works, JWT is valid
# If this fails with 401, regenerate token
```

#### Error: "403 Forbidden"

**Cause**: User ID mismatch - requesting data for different user than in JWT

**Example**:
```javascript
// JWT has userId: "1"
const jwt = { userId: "1", partnerId: "1" }

// But trying to access user 2's data
fetch('/api/v2/users/2/accounts/all')  // ❌ Forbidden

// Should match:
fetch('/api/v2/users/1/accounts/all')  // ✅ Allowed
```

**Solution**:
```javascript
// Ensure global.geezeo._auth.userId matches JWT
const { userId } = global.geezeo._auth;

// Use this userId in API calls
getAllAccounts(userId);  // Uses correct userId
```

#### Error: "404 Not Found"

**Cause**: Wrong API URL or endpoint not implemented

**Solutions**:
```bash
# 1. Verify URL construction
# Should be: http://localhost:3000/api/v2/...
# NOT: http://localhost:3000/...

# 2. Check endpoint is implemented
# See docs/API.md for implemented endpoints

# 3. Check for typos in URL
# Correct:   /api/v2/users/1/accounts/all
# Incorrect: /api/v2/user/1/accounts/all (missing 's')
```

### Data Issues

#### Error: "User not found" / "Account not found"

**Cause**: User/Account ID doesn't exist in database

**Solutions**:
```bash
# 1. Check available users
psql -d pfm_simulator -c "SELECT id, email FROM users"

# 2. Check available accounts
psql -d pfm_simulator -c "SELECT id, user_id, name FROM accounts"

# 3. Seed database if empty
npm run seed -- generate --scenario realistic

# 4. Update JWT and config with valid user ID
node tools/generate-jwt.js <VALID_USER_ID>
```

### Frontend Issues

#### Responsive-tiles not making API calls

**Check configuration**:
```javascript
// Verify in browser console
console.log('Geezeo config:', global.geezeo);

// Should show:
// {
//   _auth: {
//     useSsl: false,
//     host: 'localhost',
//     port: 3000,
//     jwt: 'eyJ...',
//     userId: '1',
//     partnerId: '1'
//   }
// }
```

**Common issues**:
1. **Config not loaded**: Check initialization order
2. **Wrong scope**: `global.geezeo` vs `window.geezeo`
3. **Missing JWT**: Token not set or empty string

#### API calls going to wrong URL

**Debug URL construction**:
```javascript
// Add logging to fetch.js (temporary)
const fullUrl = `${baseUrl}/api/v2${path}`;
console.log('API Request:', fullUrl);

// Should log: http://localhost:3000/api/v2/users/1/accounts/all
```

**Common issues**:
1. **useSsl: true** when should be false
2. **Wrong port** (3001 instead of 3000)
3. **Missing port** (assumes 80/443)

### Performance Issues

#### Slow API responses

**Check backend logs**:
```bash
# Backend shows query timing
npm run dev

# Look for slow queries in logs
# [DEBUG] Database query: SELECT * FROM ... (duration: 234ms)
```

**Solutions**:
```bash
# 1. Check database performance
psql -d pfm_simulator -c "
  EXPLAIN ANALYZE
  SELECT * FROM accounts WHERE user_id = 1;
"

# 2. Vacuum database
psql -d pfm_simulator -c "VACUUM ANALYZE"

# 3. Check for missing indexes
# See docs/POSTGRESQL_TUTORIAL.md
```

---

## API Compatibility

### Implemented Endpoints

The pfm-backend-simulator currently implements a **subset** of the 135+ endpoints required by responsive-tiles.

**Fully Implemented** (Ready to use):
```
✅ GET  /partners/current
✅ GET  /users/{userId}/accounts/all
✅ GET  /users/{userId}/accounts/{id}
✅ PUT  /users/{userId}/accounts/{id}
✅ PUT  /users/{userId}/accounts/{id}/archive
✅ DELETE /users/{userId}/accounts/{id}
```

**Planned** (See [docs/API.md](./API.md)):
```
⏳ GET  /users/current
⏳ PUT  /users/current
⏳ GET  /users/{userId}/transactions/search
⏳ PUT  /users/{userId}/transactions/{id}
⏳ GET  /users/{userId}/budgets
⏳ POST /users/{userId}/budgets
⏳ ... and 120+ more endpoints
```

### Working Around Missing Endpoints

**Option 1: Graceful Degradation**

Wrap API calls in try/catch:
```javascript
async function loadData() {
  try {
    const accounts = await getAllAccounts(userId);
    // ✅ Works - endpoint implemented
  } catch (error) {
    console.warn('Accounts unavailable, using defaults');
    return [];
  }

  try {
    const budgets = await getBudgets(userId);
    // ❌ May fail - endpoint not yet implemented
  } catch (error) {
    console.warn('Budgets unavailable, using defaults');
    return [];
  }
}
```

**Option 2: Feature Flags**

Disable tiles that require unimplemented endpoints:
```javascript
const FEATURES = {
  accounts: true,      // ✅ Implemented
  transactions: false, // ❌ Not yet
  budgets: false,      // ❌ Not yet
  goals: false,        // ❌ Not yet
};

if (FEATURES.accounts) {
  <AccountsTile />
}
```

**Option 3: Mock Data**

Provide fallback mock data:
```javascript
async function getBudgets(userId) {
  try {
    return await api.getBudgets(userId);
  } catch (error) {
    if (error.status === 404) {
      // Endpoint not implemented, return mock data
      return MOCK_BUDGETS;
    }
    throw error;
  }
}
```

### Checking Endpoint Availability

**Test endpoints before using**:
```bash
# Create a test script
cat > test-endpoints.sh << 'EOF'
#!/bin/bash
TOKEN="YOUR_JWT_TOKEN"
BASE="http://localhost:3000/api/v2"

# Test each endpoint
echo "Testing /partners/current..."
curl -s "$BASE/partners/current" -H "Authorization: Bearer $TOKEN" | jq -r '.partner.id' && echo "✅" || echo "❌"

echo "Testing /users/current..."
curl -s "$BASE/users/current" -H "Authorization: Bearer $TOKEN" | jq -r '.user.id' && echo "✅" || echo "❌"

echo "Testing /users/1/accounts/all..."
curl -s "$BASE/users/1/accounts/all" -H "Authorization: Bearer $TOKEN" | jq -r '.accounts[0].id' && echo "✅" || echo "❌"
EOF

chmod +x test-endpoints.sh
./test-endpoints.sh
```

**Reference documentation**:
- [docs/API.md](./API.md) - Current implementation status
- [docs/responsive-tiles-api-dependencies.md](./responsive-tiles-api-dependencies.md) - Full endpoint inventory

---

## Advanced Configuration

### Using Docker

If running backend in Docker:

```yaml
# docker-compose.yml
services:
  api:
    ports:
      - "3000:3000"  # Expose on host
    environment:
      - CORS_ORIGINS=http://localhost:3001,http://localhost:8080
```

**Frontend config**:
```javascript
global.geezeo._auth = {
  host: 'localhost',  // Still localhost (port forwarded)
  port: 3000,
  // ... rest of config
}
```

### HTTPS / SSL

For production or staging with HTTPS:

**Backend** (requires SSL certificate):
```env
# .env
NODE_ENV=production
PORT=443
```

**Frontend**:
```javascript
global.geezeo._auth = {
  useSsl: true,                    // Enable HTTPS
  host: 'api.yourbank.com',        // Production domain
  port: null,                      // Use default 443
  // ...
}
```

### Reverse Proxy

If using nginx/Apache in front of backend:

```nginx
# nginx.conf
location /api/v2 {
  proxy_pass http://localhost:3000;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;

  # CORS headers
  add_header Access-Control-Allow-Origin *;
  add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
  add_header Access-Control-Allow-Headers "Authorization, Content-Type";
}
```

**Frontend config**:
```javascript
global.geezeo._auth = {
  host: 'yourbank.com',  // Main domain
  port: null,            // Default port (80/443)
  prefix: '',            // No prefix needed
  // ...
}
```

---

## Next Steps

1. ✅ **Verify backend is running**: `npm run dev`
2. ✅ **Generate JWT token**: `node tools/generate-jwt.js`
3. ✅ **Configure responsive-tiles**: Set `global.geezeo._auth`
4. ✅ **Test connection**: Run curl tests or browser test
5. ✅ **Check API docs**: Review [docs/API.md](./API.md) for available endpoints
6. 📝 **Report issues**: Open issues on GitHub for missing endpoints

**Additional Resources**:
- [API Documentation](./API.md) - Complete endpoint reference
- [Architecture Guide](./ARCHITECTURE.md) - System design
- [Development Guide](./DEVELOPMENT_GUIDE.md) - Adding new endpoints
- [PostgreSQL Tutorial](./POSTGRESQL_TUTORIAL.md) - Database operations

---

## Support

**Common Questions**:

Q: Which responsive-tiles version is supported?
A: Any version that uses `/api/v2` endpoints with JWT authentication.

Q: Can I use OAuth instead of JWT?
A: Not currently supported. JWT Bearer token authentication only.

Q: How do I add missing endpoints?
A: See [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md#adding-a-new-endpoint)

Q: Can I connect multiple responsive-tiles instances?
A: Yes, just add all origins to `CORS_ORIGINS` in `.env`

**Getting Help**:
- Check [docs/INDEX.md](./INDEX.md) for documentation map
- Review troubleshooting section above
- Open issue on GitHub with error logs
