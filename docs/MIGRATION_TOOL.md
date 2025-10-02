# Migration Tool Documentation

## Overview

The Migration Tool imports real production/staging data from Geezeo PFM API into your local PostgreSQL database. This enables responsive-tiles development with realistic data without manual test data creation.

## Components

### 1. Web UI (`tools/migrate-ui/`)

Browser-based interface for configuring and running migrations.

**Files**:
- `index.html` - Form interface
- `app.js` - Client-side logic and SSE handling
- `styles.css` - Styling

**Features**:
- Credential input form
- Connection testing
- Entity selection (checkboxes)
- Real-time progress display
- Error reporting

### 2. API Backend (`src/routes/migrate.ts`)

Express routes handling migration logic.

**Endpoints**:
- `POST /api/migrate/test` - Test connection
- `POST /api/migrate/start` - Start migration (SSE)

### 3. Static File Serving

Migration UI served via Express static middleware:

```typescript
// src/index.ts
app.use('/migrate-ui', express.static(path.join(__dirname, '../tools/migrate-ui')));
app.get('/migrate', (req, res) => res.redirect('/migrate-ui'));
```

## Usage Guide

### Quick Start

1. **Start the simulator**:
   ```bash
   npm run dev
   ```

2. **Open the migration tool**:
   ```
   http://localhost:3000/migrate
   ```
   (redirects to `/migrate-ui`)

3. **Enter API credentials**:
   - **API Key**: Your Geezeo API key (64-char hex string)
   - **Partner Domain**: e.g., `geezeo.geezeo.banno-staging.com`
   - **PCID**: User identifier (e.g., `dpotockitest`)
   - **Partner ID**: Usually `1`

4. **Test connection**: Click "Test Connection" to verify credentials

5. **Select entities** to import:
   - ☑ Current User
   - ☑ Accounts
   - ☐ Transactions (can take time)
   - ☐ Budgets
   - ☐ Goals
   - ☐ Alerts
   - ☐ Tags

6. **Start import**: Watch real-time progress

### Example Credentials

**Staging Environment**:
```
API Key: a0aaac50f0bdfec4973620ce8a7cbb5400af7b4283671b02671ed7f78b3bcd733a8dc791643f88ed2e0f4505298a9efbd51e34fdeb10431f5113c7fecccabc95
Partner Domain: geezeo.geezeo.banno-staging.com
PCID: dpotockitest
Partner ID: 1
```

## Technical Details

### Authentication Flow

1. **JWT Generation**:
   ```typescript
   function generateJWT(config: MigrateConfig): string {
     const iat = Math.floor(Date.now() / 1000);
     const exp = iat + (15 * 60); // 15 minutes

     return jwt.sign(
       {
         iss: config.partnerId,      // Issuer (Partner ID)
         aud: config.partnerDomain,  // Audience (Partner Domain)
         sub: config.pcid,           // Subject (User PCID)
         iat,                        // Issued At
         exp,                        // Expiration
       },
       config.apiKey                 // Secret (API Key)
     );
   }
   ```

2. **API Request**:
   ```typescript
   const response = await fetch(
     `https://${config.partnerDomain}/api/v2${endpoint}`,
     {
       headers: {
         Authorization: `Bearer ${token}`,
         Accept: 'application/json',
       },
     }
   );
   ```

### Data Transformation

#### User Data

**Geezeo API Response**:
```json
{
  "user": {
    "id": "123",
    "partner_id": "1",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

**Prisma Insert**:
```typescript
await prisma.user.upsert({
  where: {
    email_partnerId: {
      email: userData.email,
      partnerId: BigInt(userData.partner_id),
    },
  },
  create: {
    id: BigInt(userData.id),
    partnerId: BigInt(userData.partner_id),
    email: userData.email,
    firstName: userData.first_name,
    lastName: userData.last_name,
  },
  update: {
    firstName: userData.first_name,
    lastName: userData.last_name,
  },
});
```

#### Account Data

**Geezeo API Endpoint**: `/users/{userId}/accounts/all`

**Transformation**:
```typescript
// Geezeo: account_type → Prisma: accountType
// Geezeo: display_name → Prisma: displayName
// Geezeo: ce_account_id → Prisma: ceAccountId

await prisma.account.upsert({
  where: {
    userId_ceAccountLoginId: {
      userId: BigInt(userId),
      ceAccountLoginId: account.ce_account_login_id,
    },
  },
  create: {
    userId: BigInt(userId),
    partnerId: BigInt(partnerId),
    name: account.name,
    displayName: account.display_name,
    accountType: account.account_type as AccountType,
    balance: new Decimal(account.balance),
    state: account.state as AccountState,
    // ... additional fields
  },
  update: {
    balance: new Decimal(account.balance),
    state: account.state as AccountState,
    // ... additional fields
  },
});
```

#### Transaction Data

**Geezeo API Endpoint**: `/users/{userId}/transactions/search`

**Query Parameters**:
```typescript
const params = new URLSearchParams({
  page: '1',
  results_per_page: '500',
  order_by: 'posted_at',
  order: 'desc',
});
```

**Transformation Challenges**:
- High volume (can be thousands)
- Pagination handling
- Date format conversion
- Decimal precision

### Server-Sent Events (SSE)

#### Server Side

```typescript
router.post('/start', async (req: Request, res: Response) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Helper function
  function sendProgress(data: any) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  try {
    sendProgress({ type: 'progress', message: 'Starting migration...' });

    // Migrate users
    if (entities.currentUser) {
      sendProgress({ type: 'progress', message: 'Fetching user data...', entity: 'user' });
      const userData = await fetchFromGeezeo(config, token, '/users/current');
      // ... insert user
      sendProgress({ type: 'success', message: 'User migrated', entity: 'user', count: 1 });
    }

    // Migrate accounts
    if (entities.accounts) {
      sendProgress({ type: 'progress', message: 'Fetching accounts...', entity: 'accounts' });
      const accountsData = await fetchFromGeezeo(config, token, `/users/${userId}/accounts/all`);
      // ... insert accounts
      sendProgress({ type: 'success', message: 'Accounts migrated', entity: 'accounts', count: accountsData.accounts.length });
    }

    sendProgress({ type: 'complete', message: 'Migration completed' });
  } catch (error) {
    sendProgress({ type: 'error', message: error.message });
  } finally {
    res.end();
  }
});
```

#### Client Side

```javascript
const eventSource = new EventSource('/api/migrate/start');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case 'progress':
      updateProgress(data.message);
      break;
    case 'success':
      showSuccess(data.message, data.count);
      break;
    case 'error':
      showError(data.message);
      eventSource.close();
      break;
    case 'complete':
      showComplete(data.message);
      eventSource.close();
      break;
  }
};

eventSource.onerror = (error) => {
  console.error('SSE error:', error);
  eventSource.close();
};
```

### Event Types

| Type | Purpose | Fields |
|------|---------|--------|
| `progress` | Show ongoing operation | `message`, `entity` |
| `success` | Entity migration completed | `message`, `entity`, `count` |
| `error` | Migration error occurred | `message` |
| `complete` | All migrations finished | `message` |

## Geezeo API Endpoints

### User Endpoints

**Get Current User**:
```
GET /users/current
```

Response:
```json
{
  "user": {
    "id": "123",
    "partner_id": "1",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "timezone": "America/New_York"
  }
}
```

### Account Endpoints

**Get All Accounts**:
```
GET /users/{userId}/accounts/all
```

Response:
```json
{
  "accounts": [
    {
      "id": "456",
      "user_id": "123",
      "name": "Primary Checking",
      "account_type": "checking",
      "balance": "1234.56",
      "state": "active",
      "ce_account_id": "abc123",
      "ce_account_login_id": "login123"
    }
  ]
}
```

### Transaction Endpoints

**Search Transactions**:
```
GET /users/{userId}/transactions/search?page=1&results_per_page=500
```

Response:
```json
{
  "transactions": [
    {
      "id": "789",
      "account_id": "456",
      "description": "Grocery Store",
      "amount": "-45.67",
      "posted_at": "2024-01-15T10:30:00Z",
      "transaction_type": "debit"
    }
  ],
  "total_count": 1234,
  "page": 1,
  "results_per_page": 500
}
```

### Budget Endpoints

**Get Budgets**:
```
GET /users/{userId}/budgets
```

### Goal Endpoints

**Get Savings Goals**:
```
GET /users/{userId}/savings_goals
```

**Get Payoff Goals**:
```
GET /users/{userId}/payoff_goals
```

### Alert Endpoints

**Get Alerts**:
```
GET /users/{userId}/alerts
```

### Tag Endpoints

**Get Tags**:
```
GET /users/{userId}/tags
```

## Entity Mapping

### Account Types

| Geezeo API | Prisma Enum | Description |
|------------|-------------|-------------|
| `checking` | `checking` | Checking account |
| `savings` | `savings` | Savings account |
| `credit_card` | `credit_card` | Credit card |
| `loan` | `loan` | Loan account |
| `investment` | `investment` | Investment account |
| `mortgage` | `mortgage` | Mortgage |
| `line_of_credit` | `line_of_credit` | Line of credit |

### Account States

| Geezeo API | Prisma Enum | Description |
|------------|-------------|-------------|
| `active` | `active` | Active account |
| `inactive` | `inactive` | Inactive account |
| `archived` | `archived` | Archived account |
| `pending` | `pending` | Pending setup |
| `error` | `error` | Error state |

### Aggregation Types

| Geezeo API | Prisma Enum |
|------------|-------------|
| `plaid` | `plaid` |
| `mx` | `mx` |
| `finicity` | `finicity` |
| `cashedge` | `cashedge` |
| `manual` | `manual` |

### Goal Types

| Geezeo API | Prisma Enum |
|------------|-------------|
| Savings Goal | `savings` |
| Payoff Goal | `payoff` |

### Alert Types

| Geezeo API | Prisma Enum |
|------------|-------------|
| `account_threshold` | `account_threshold` |
| `goal` | `goal` |
| `merchant_name` | `merchant_name` |
| `spending_target` | `spending_target` |
| `transaction_limit` | `transaction_limit` |
| `upcoming_bill` | `upcoming_bill` |

## Error Handling

### Connection Errors

**Symptom**: Test connection fails

**Common Causes**:
1. Invalid API key
2. Incorrect partner domain
3. Invalid PCID
4. Network issues

**Solution**:
```
1. Verify API key is 64-char hex string
2. Check partner domain format (no https://)
3. Confirm PCID exists in Geezeo system
4. Test network connectivity
```

### Authentication Errors

**Error**: `401 Unauthorized`

**Causes**:
- Expired JWT (token valid for 15 minutes)
- Invalid API key
- Mismatched claims (iss, aud, sub)

**Solution**:
- Regenerate JWT
- Verify API key matches partner
- Check partner ID and domain

### Data Transformation Errors

**Error**: `Prisma validation error`

**Causes**:
- Invalid enum value
- Missing required field
- Type mismatch (BigInt, Decimal)

**Solution**:
- Add enum mapping
- Provide default values
- Convert types properly

### Pagination Issues

**Symptom**: Not all transactions imported

**Cause**: Only first page fetched

**Solution**:
```typescript
let page = 1;
let hasMore = true;

while (hasMore) {
  const response = await fetch(`/transactions/search?page=${page}`);
  const data = await response.json();

  // Process transactions
  await processTransactions(data.transactions);

  hasMore = data.transactions.length === data.results_per_page;
  page++;
}
```

## Performance Considerations

### Large Transaction Volumes

**Problem**: Importing 10,000+ transactions takes time

**Optimizations**:
1. **Batch Inserts**:
   ```typescript
   await prisma.transaction.createMany({
     data: transactions,
     skipDuplicates: true,
   });
   ```

2. **Pagination**:
   - Fetch 500 transactions per page
   - Process in batches

3. **Progress Updates**:
   - Send SSE every 100 transactions
   - Show percentage complete

### Database Performance

**Upsert Strategy**:
```typescript
// Efficient upsert using unique constraint
await prisma.account.upsert({
  where: {
    userId_ceAccountLoginId: {
      userId: BigInt(userId),
      ceAccountLoginId: account.ce_account_login_id,
    },
  },
  create: { /* data */ },
  update: { /* data */ },
});
```

**Indexing**:
```prisma
// Ensure index exists for upsert performance
@@unique([userId, ceAccountLoginId])
```

## Security Considerations

### API Key Handling

**Important**:
- Never log API keys
- Never commit API keys to repository
- Use HTTPS for production
- Rotate keys periodically

**Implementation**:
```typescript
// ❌ Bad: Logging API key
logger.info({ apiKey: config.apiKey }, 'Migration started');

// ✅ Good: Redacting sensitive data
logger.info({ partnerId: config.partnerId }, 'Migration started');
```

### CORS Configuration

Migration endpoints are public (no JWT required):

```typescript
// Allow migration UI to call API
app.use('/api/migrate', cors({
  origin: process.env.CORS_ORIGINS?.split(','),
  credentials: true,
}));
```

### Rate Limiting (Future)

Prevent abuse:
```typescript
import rateLimit from 'express-rate-limit';

const migrateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
});

router.use('/api/migrate', migrateLimiter);
```

## Troubleshooting

### "Connection refused" Error

**Check**:
1. Is server running? (`npm run dev`)
2. Correct port? (default: 3000)
3. Firewall blocking?

### "Invalid token" Error

**Check**:
1. API key correct?
2. Partner ID matches?
3. Domain format correct? (no `https://`)

### "No data imported" Issue

**Debug**:
1. Check server logs (`console`)
2. Verify user exists in Geezeo
3. Check entity selection (checkboxes)
4. Review SSE events in browser DevTools

### Migration Hangs

**Causes**:
- Large transaction volume
- Network timeout
- Database lock

**Solutions**:
1. Import smaller entities first
2. Increase timeout values
3. Check database performance

## Best Practices

### 1. Start Small

Import minimal data first:
```
☑ Current User
☑ Accounts (usually < 10)
☐ Transactions (defer)
```

### 2. Verify Data

After migration, check:
```bash
npm run prisma:studio
```

Verify:
- User created
- Accounts match Geezeo
- Relationships correct

### 3. Incremental Imports

Import transactions separately:
1. Import user + accounts
2. Verify in Prisma Studio
3. Import transactions in batches

### 4. Clean State

Before re-importing:
```bash
npx prisma migrate reset
npm run prisma:migrate
```

### 5. Monitor Progress

Watch server logs:
```
[INFO] Fetching user data...
[INFO] User migrated: user@example.com
[INFO] Fetching accounts...
[INFO] Accounts migrated: 4 accounts
```

## Future Enhancements

1. **Resume Capability**: Save migration state, resume on failure
2. **Selective Sync**: Update only changed records
3. **Scheduling**: Periodic sync (cron)
4. **Validation**: Pre-migration data validation
5. **Conflict Resolution**: Handle duplicate/conflicting data
6. **Multi-User**: Import multiple users in batch
7. **Export**: Export local data back to Geezeo
8. **Dry Run**: Simulate migration without database changes
