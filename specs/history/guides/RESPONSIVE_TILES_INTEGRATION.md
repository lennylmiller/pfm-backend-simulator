# Responsive Tiles Integration Guide

This guide explains how to integrate the **responsive-tiles** frontend with the **pfm-backend-simulator** backend.

## Architecture Overview

**responsive-tiles** is a React-based PFM (Personal Financial Management) frontend that expects to communicate with a Geezeo API v2 compatible backend. The **pfm-backend-simulator** implements this API specification.

### Communication Flow

```
responsive-tiles (React + Webpack Dev Server)
       ↓ HTTP Requests (/api/v2/*)
       ↓ JWT Authentication
pfm-backend-simulator (Express + TypeScript + PostgreSQL)
```

## Quick Start Integration

### 1. Start the Backend Simulator

```bash
cd /Users/LenMiller/code/pfm-backend-simulator

# Ensure PostgreSQL is running
# Ensure database is migrated and seeded
npm run dev  # Starts on http://localhost:3000
```

### 2. Configure Responsive Tiles

```bash
cd /Users/LenMiller/code/banno/responsive-tiles

# Create .env file from example
cp .env.example .env
```

Edit `.env` with the following configuration:

```bash
# .env for local development with pfm-backend-simulator

# API Key - matches JWT_SECRET from pfm-backend-simulator
API_KEY=your_jwt_secret_here_min_32_chars_long

# Partner domain (can use localhost for development)
PARTNER_DOMAIN=localhost

# Partner Customer ID (use a seeded user ID)
PCID=406

# Partner ID (use seeded partner ID)
PARTNER_ID=1

# Environment
ENV=development
NODE_ENV=development

# Optional debugging
DEBUG=responsive-tiles:*
```

### 3. Configure Webpack for Local Backend

The responsive-tiles webpack.config.js needs to point to your local backend. Edit `webpack.config.js`:

```javascript
// Around line 150 in webpack.config.js, in the devServer section
devServer: {
  allowedHosts: "all",
  port: 8080,
  hot: true,

  // ADD THIS: Proxy API requests to pfm-backend-simulator
  proxy: [
    {
      context: ['/api'],
      target: 'http://localhost:3000',
      secure: false,
      changeOrigin: true,
      logLevel: 'debug'
    }
  ],

  // ... rest of devServer config
}
```

### 4. Start Responsive Tiles

```bash
cd /Users/LenMiller/code/banno/responsive-tiles
npm start  # Starts on http://localhost:8080
```

### 5. Access the Application

Open browser to `http://localhost:8080` and you should see the responsive-tiles UI loading data from pfm-backend-simulator.

## API Integration Details

### Authentication Flow

**responsive-tiles** uses JWT authentication with a specific token format:

```javascript
// JWT Token Structure (from webpack.config.js:46-68)
{
  iss: "1",              // Partner ID
  aud: "localhost",      // Partner domain
  sub: "406",            // User ID (PCID)
  iat: 1234567890,       // Issued at
  exp: 1234568790        // Expires (15 minutes later)
}
```

The backend (`src/middleware/auth.ts`) supports dual JWT formats:
- **Standard**: `{ userId, partnerId }`
- **responsive-tiles**: `{ sub: userId, iss: partnerId }`

### API Endpoints Used by Responsive Tiles

Based on `src/api/index.js`, responsive-tiles expects these endpoints:

#### Accounts
- `GET /api/v2/users/:userId/accounts` - List all accounts ✅
- `GET /api/v2/users/:userId/accounts/:id` - Get single account ✅
- `PUT /api/v2/users/:userId/accounts/:id` - Update account ✅
- `DELETE /api/v2/users/:userId/accounts/:id` - Delete account ✅
- `PUT /api/v2/users/:userId/accounts/:id/archive` - Archive account ✅

#### Transactions
- `GET /api/v2/users/:userId/transactions` - List transactions ✅
- `GET /api/v2/users/:userId/transactions/search` - Search transactions ✅
- `PUT /api/v2/users/:userId/transactions/:id` - Update transaction ✅
- `DELETE /api/v2/users/:userId/transactions/:id` - Delete transaction ✅

#### Budgets
- `GET /api/v2/users/:userId/budgets` - List budgets ✅
- `GET /api/v2/users/:userId/budgets/:id` - Get budget ✅
- `POST /api/v2/users/:userId/budgets` - Create budget ✅
- `PUT /api/v2/users/:userId/budgets/:id` - Update budget ✅
- `DELETE /api/v2/users/:userId/budgets/:id` - Delete budget ✅

#### Goals
- `GET /api/v2/users/:userId/goals` - List all goals ✅
- `GET /api/v2/users/:userId/payoff_goals` - List payoff goals ✅
- `GET /api/v2/users/:userId/savings_goals` - List savings goals ✅
- `POST /api/v2/users/:userId/payoff_goals` - Create payoff goal ✅
- `POST /api/v2/users/:userId/savings_goals` - Create savings goal ✅
- `PUT /api/v2/users/:userId/payoff_goals/:id` - Update payoff goal ✅
- `PUT /api/v2/users/:userId/savings_goals/:id` - Update savings goal ✅
- `DELETE /api/v2/users/:userId/payoff_goals/:id` - Delete payoff goal ✅
- `DELETE /api/v2/users/:userId/savings_goals/:id` - Delete savings goal ✅

#### Cashflow
- `GET /api/v2/users/:userId/cashflow` - Get cashflow summary ✅
- `GET /api/v2/users/:userId/cashflow/bills` - List bills ✅
- `POST /api/v2/users/:userId/cashflow/bills` - Create bill ✅
- `PUT /api/v2/users/:userId/cashflow/bills/:id` - Update bill ✅
- `DELETE /api/v2/users/:userId/cashflow/bills/:id` - Delete bill ✅
- `GET /api/v2/users/:userId/cashflow/incomes` - List incomes ✅
- `POST /api/v2/users/:userId/cashflow/incomes` - Create income ✅
- `PUT /api/v2/users/:userId/cashflow/incomes/:id` - Update income ✅
- `DELETE /api/v2/users/:userId/cashflow/incomes/:id` - Delete income ✅
- `GET /api/v2/users/:userId/cashflow/events` - List events ✅
- `PUT /api/v2/users/:userId/cashflow/events/:id` - Update event ✅
- `DELETE /api/v2/users/:userId/cashflow/events/:id` - Delete event ✅

#### Expenses
- `GET /api/v2/users/:userId/expenses` - Get expenses analysis ✅

#### Alerts
- `GET /api/v2/users/:userId/alerts` - List alerts ✅
- `POST /api/v2/users/:userId/alerts` - Create alert ✅
- `PUT /api/v2/users/:userId/alerts/:id` - Update alert ✅
- `DELETE /api/v2/users/:userId/alerts/:id` - Delete alert ✅

#### Notifications
- `GET /api/v2/users/:userId/notifications` - List notifications ✅
- `DELETE /api/v2/users/:userId/notifications/:id` - Delete notification ✅

#### Tags
- `GET /api/v2/users/:userId/tags` - List user tags ✅
- `PUT /api/v2/users/:userId/tags` - Update tags ✅

#### Users
- `GET /api/v2/users/:userId` - Get current user ✅
- `PUT /api/v2/users/:userId` - Update current user ✅

#### Partners
- `GET /api/v2/partners/:partnerId` - Get partner info ✅

### Response Format Compatibility

The backend serializers (`src/utils/serializers.ts`) format responses to match Geezeo API v2:

**Key Requirements**:
- Snake_case field names (e.g., `user_id`, `created_at`)
- ISO 8601 date strings
- Decimal values as strings for precision
- Consistent resource wrapping: `{ resource: {...} }` or `{ resources: [...] }`

**Example Account Response**:
```json
{
  "account": {
    "id": "123",
    "user_id": "406",
    "name": "Checking Account",
    "balance": "1250.50",
    "account_type": "checking",
    "created_at": "2024-10-05T12:00:00Z",
    "updated_at": "2024-10-05T12:00:00Z"
  }
}
```

## Development Workflow

### 1. Running Both Applications

**Terminal 1** - Backend:
```bash
cd /Users/LenMiller/code/pfm-backend-simulator
npm run dev
```

**Terminal 2** - Frontend:
```bash
cd /Users/LenMiller/code/banno/responsive-tiles
npm start
```

**Terminal 3** - Database GUI (optional):
```bash
cd /Users/LenMiller/code/pfm-backend-simulator
npx prisma studio
```

### 2. Testing User Flow

1. Access responsive-tiles at `http://localhost:8080`
2. The app will authenticate with JWT using user ID `406` (from PCID in .env)
3. Frontend fetches data from backend at `http://localhost:3000`
4. Webpack proxy forwards `/api/*` requests to backend

### 3. Debugging API Calls

**Backend Logs**: Watch `npm run dev` output for Pino structured logs

**Frontend Network Tab**: Check browser DevTools → Network → Filter by "api"

**Check JWT**:
```javascript
// In browser console
const jwt = global.geezeo._auth.jwt
console.log(jwt)
```

**Decode JWT**:
```bash
# Use jwt.io or Node.js
node -e "console.log(JSON.parse(Buffer.from('JWT_PAYLOAD_PART'.split('.')[1], 'base64')))"
```

## Common Integration Issues

### Issue 1: 401 Unauthorized
**Cause**: JWT secret mismatch or expired token

**Fix**:
- Ensure `API_KEY` in responsive-tiles `.env` matches `JWT_SECRET` in pfm-backend-simulator `.env`
- JWT expires after 15 minutes (configured in webpack.config.js)
- Restart responsive-tiles webpack-dev-server to generate fresh JWT

### Issue 2: 404 Not Found
**Cause**: Missing route in backend

**Fix**:
- Check endpoint implementation in `src/routes/`
- Verify route registration in `src/index.ts`
- Check responsive-tiles expected path in `src/api/`

### Issue 3: CORS Errors
**Cause**: Cross-origin request blocking

**Fix**:
- Ensure backend `ENABLE_CORS=true` in `.env`
- Add `http://localhost:8080` to `CORS_ORIGINS` in backend `.env`
- Check `src/config/cors.ts` configuration

### Issue 4: Wrong Data Format
**Cause**: Response doesn't match expected format

**Fix**:
- Compare response in Network tab to expected format
- Check serializer in `src/utils/serializers.ts`
- Reference Geezeo backend at `/Users/LenMiller/code/banno/geezeo` for authoritative format

### Issue 5: User Data Not Found
**Cause**: Using unseeded user ID

**Fix**:
- Run `npm run seed` in backend to populate data
- Check available user IDs in database:
  ```sql
  SELECT id FROM users;
  ```
- Update `PCID` in responsive-tiles `.env` to match seeded user

## Environment Variables Reference

### pfm-backend-simulator (.env)
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/pfm_simulator
JWT_SECRET=your_jwt_secret_here_min_32_chars_long
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
ENABLE_CORS=true
CORS_ORIGINS=http://localhost:8080
```

### responsive-tiles (.env)
```bash
API_KEY=your_jwt_secret_here_min_32_chars_long
PARTNER_DOMAIN=localhost
PCID=406
PARTNER_ID=1
ENV=development
NODE_ENV=development
DEBUG=responsive-tiles:*
```

## Advanced Configuration

### Using Custom Port for Backend

If you need to run backend on a different port:

1. Change backend `.env`:
   ```bash
   PORT=3001
   ```

2. Update responsive-tiles `webpack.config.js` proxy:
   ```javascript
   proxy: [{
     context: ['/api'],
     target: 'http://localhost:3001',  // Changed port
     // ...
   }]
   ```

### Multiple User Testing

To test with different users, change the `PCID` in responsive-tiles `.env`:

```bash
# User 1
PCID=406

# User 2
PCID=407
```

Restart webpack-dev-server to generate new JWT with different user.

### Production-like Testing

For testing in a staging-like environment:

**Backend**:
```bash
NODE_ENV=production
npm run build
npm start
```

**Frontend**:
```bash
ENV=staging
npm run build
```

## Reference Implementations

### Geezeo Reference Backend
Located at: `/Users/LenMiller/code/banno/geezeo`

This Rails application provides the authoritative API v2 implementation. Reference for:
- Response formats (RABL serializers in `app/views/api/v2/`)
- Controller logic (`app/controllers/api/v2/`)
- Database schema (`db/schema.rb`)

### API Documentation
The responsive-tiles project includes HAR capture tools for generating OpenAPI specs:

```bash
cd /Users/LenMiller/code/banno/responsive-tiles
npm run har:capture     # Capture API calls
npm run har:analyze     # Analyze HAR files
npm run har:openapi     # Generate OpenAPI spec
```

## Testing Checklist

- [ ] Backend running on port 3000
- [ ] Frontend running on port 8080
- [ ] Database seeded with test data
- [ ] JWT_SECRET matches API_KEY
- [ ] CORS enabled for localhost:8080
- [ ] User ID (PCID) exists in database
- [ ] Webpack proxy configured correctly
- [ ] No 401/403 errors in browser console
- [ ] Data loads in UI (accounts, transactions, budgets, etc.)
- [ ] CRUD operations work (create, update, delete)

## Next Steps

1. **Complete API Coverage**: Implement any remaining endpoints required by responsive-tiles
2. **Real-time Updates**: Consider WebSocket support for live data updates
3. **Performance Testing**: Test with larger datasets (use seed script with higher counts)
4. **Error Handling**: Improve error messages and user feedback
5. **Documentation**: Generate OpenAPI spec from backend routes
6. **Integration Tests**: Create E2E tests using Playwright to verify full integration

## Support

For issues with:
- **Backend**: Check logs in `pfm-backend-simulator` terminal
- **Frontend**: Check browser console and Network tab
- **Database**: Use Prisma Studio (`npx prisma studio`)
- **Authentication**: Verify JWT at jwt.io

## Useful Commands

```bash
# Backend
npm run dev              # Development server
npm run seed             # Seed database
npx prisma studio        # Database GUI
npm test                 # Run tests

# Frontend
npm start                # Development server
npm run lint             # Check code quality
npm run test             # Run tests
npm run build            # Production build

# Database
psql pfm_simulator       # Connect to database
\dt                      # List tables
SELECT * FROM users;     # Query users
```
