# Configuration Guide for Responsive-Tiles Developers

Quick reference for connecting responsive-tiles to pfm-backend-simulator.

## Where to Put `global.geezeo._auth` Configuration

The `global.geezeo._auth` configuration must be set **before any API calls are made**, typically in your app's initialization phase.

### Option 1: Main Entry Point (Recommended)

**File**: `src/index.js` or `src/index.tsx`

Place it **before** the React app renders:

```javascript
// src/index.js
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

// ✅ Configure backend connection BEFORE app renders
global.geezeo = global.geezeo || {};
global.geezeo._auth = {
  useSsl: false,              // No HTTPS for local dev
  host: 'localhost',          // Backend hostname
  port: 3000,                 // Backend port
  jwt: '<YOUR_JWT_TOKEN>',    // Generated JWT (see below)
  userId: '1',                // User ID from database
  partnerId: '1',             // Partner ID from database
  prefix: ''                  // No URL prefix
};

ReactDOM.render(<App />, document.getElementById('root'));
```

---

### Option 2: Separate Config File

**Create**: `src/config/api.js`

```javascript
// src/config/api.js
export const initializeApiConfig = () => {
  global.geezeo = global.geezeo || {};
  global.geezeo._auth = {
    useSsl: false,
    host: 'localhost',
    port: 3000,
    jwt: '<YOUR_JWT_TOKEN>',
    userId: '1',
    partnerId: '1',
    prefix: ''
  };
};
```

**Import and call** in `src/index.js`:
```javascript
import { initializeApiConfig } from './config/api';

initializeApiConfig();  // ✅ Call before rendering
ReactDOM.render(<App />, document.getElementById('root'));
```

---

### Option 3: Environment-Based (Multiple Environments)

**Create**: `src/config/environment.js`

```javascript
// src/config/environment.js
const config = {
  development: {
    useSsl: false,
    host: 'localhost',
    port: 3000,
    userId: '1',
    partnerId: '1'
  },
  staging: {
    useSsl: true,
    host: 'staging-api.yourcompany.com',
    port: 443,
    userId: '1',
    partnerId: '1'
  },
  production: {
    useSsl: true,
    host: 'api.yourcompany.com',
    port: 443,
    userId: '1',
    partnerId: '1'
  }
};

const env = process.env.NODE_ENV || 'development';

global.geezeo = global.geezeo || {};
global.geezeo._auth = {
  ...config[env],
  jwt: process.env.REACT_APP_JWT_TOKEN || '',
  prefix: ''
};
```

**Create** `.env.local`:
```bash
# .env.local (responsive-tiles root directory)
REACT_APP_JWT_TOKEN=<YOUR_JWT_TOKEN>
NODE_ENV=development
```

**Import** in `src/index.js`:
```javascript
import './config/environment';  // ✅ Loads config automatically
import ReactDOM from 'react-dom';
import App from './App';

ReactDOM.render(<App />, document.getElementById('root'));
```

---

## Generate JWT Token

Before using any of the above configurations, you need a valid JWT token.

### Quick Token Generation

```bash
# From pfm-backend-simulator directory
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

**Copy the token** and paste it into your `global.geezeo._auth.jwt` configuration.

---

## Verify Configuration

### 1. Check API Base URL

```javascript
// In browser console or React component
const { useSsl, host, port } = global.geezeo._auth;
const baseUrl = `http${useSsl ? 's' : ''}://${host}${port ? ':' + port : ''}`;
console.log('API Base URL:', baseUrl + '/api/v2');
// ✅ Should output: http://localhost:3000/api/v2
```

### 2. Test Backend Connection

```javascript
// In browser console
fetch('http://localhost:3000/api/v2/partners/current', {
  headers: {
    'Authorization': `Bearer ${global.geezeo._auth.jwt}`
  }
})
.then(res => res.json())
.then(data => console.log('✅ Partner data:', data))
.catch(err => console.error('❌ Error:', err));
```

**Expected response**:
```json
{
  "id": "1",
  "name": "Test Partner",
  "partnerId": "partner123"
}
```

---

## Troubleshooting

### ❌ "global.geezeo is undefined"

**Cause**: Configuration not loaded before API calls

**Fix**: Ensure config is set in `src/index.js` **before** `ReactDOM.render()`

### ❌ CORS errors in browser console

**Cause**: Backend CORS not configured for responsive-tiles origin

**Fix**: Update backend `.env`:
```env
ENABLE_CORS=true
CORS_ORIGINS=http://localhost:3001,http://localhost:8080
```

Add your responsive-tiles port if different (e.g., `http://localhost:4000`).

### ❌ 401 Unauthorized errors

**Cause**: Invalid or expired JWT token

**Fix**:
1. Regenerate JWT token (see above)
2. Verify JWT secret matches between token generation and backend `.env`:
   ```bash
   # Backend .env
   JWT_SECRET=your-secret-key-change-in-production-minimum-32-chars
   ```
3. Update `global.geezeo._auth.jwt` with new token

### ❌ "Cannot find user" errors

**Cause**: User ID in JWT doesn't exist in database

**Fix**: Check available users in backend:
```bash
psql -d pfm_simulator -c "SELECT id, email FROM users LIMIT 5"
```

Use a valid user ID in your JWT token and config.

---

## Quick Start Checklist

- [ ] Backend running: `npm run dev` (port 3000)
- [ ] Database has users: `psql -d pfm_simulator -c "SELECT COUNT(*) FROM users"`
- [ ] JWT token generated (see above)
- [ ] `global.geezeo._auth` configured in `src/index.js`
- [ ] Backend CORS configured for responsive-tiles origin
- [ ] Test connection in browser console (see verification section)

---

## Backend Requirements

### 1. Start Backend

```bash
cd pfm-backend-simulator
npm run dev
# ✅ Backend running at http://localhost:3000
```

### 2. Verify Database

```bash
# Check database has users
psql -d pfm_simulator -c "SELECT id, email, first_name FROM users LIMIT 5"

# If empty, seed test data:
npm run seed -- generate --scenario realistic
```

### 3. Configure CORS

**Backend `.env`**:
```env
ENABLE_CORS=true
CORS_ORIGINS=http://localhost:3001,http://localhost:8080
```

**Add your responsive-tiles port** if different.

---

## API Compatibility

The backend implements the following endpoints needed by responsive-tiles:

### ✅ Fully Implemented

- `GET /api/v2/partners/current` - Current partner info
- `GET /api/v2/users/current` - Current user info
- `GET /api/v2/users/{userId}` - User details
- `GET /api/v2/users/{userId}/accounts/all` - All accounts
- `GET /api/v2/users/{userId}/accounts/{accountId}` - Single account
- `PUT /api/v2/users/{userId}/accounts/{accountId}` - Update account
- `POST /api/v2/users/{userId}/accounts/{accountId}/archive` - Archive account
- `DELETE /api/v2/users/{userId}/accounts/{accountId}` - Delete account

### 🚧 Planned

- Transaction endpoints
- Budget endpoints
- Goal endpoints (savings, payoff)
- Alert endpoints
- Cashflow endpoints
- Tag endpoints

**See full API reference**: [docs/API.md](./API.md)

---

## Need More Help?

- **Full integration guide**: [docs/RESPONSIVE_TILES_INTEGRATION.md](./RESPONSIVE_TILES_INTEGRATION.md)
- **API reference**: [docs/API.md](./API.md)
- **Backend architecture**: [docs/ARCHITECTURE.md](./ARCHITECTURE.md)
- **Development guide**: [docs/DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)
