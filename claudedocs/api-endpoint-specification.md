# Responsive Tiles API Endpoint Specification

**Purpose**: Complete mapping of ALL API endpoints needed for pfm-backend-simulator to support responsive-tiles frontend

**Generated**: 2025-10-02
**Source Analysis**: `~/code/banno/responsive-tiles/src/api/` (18 modules, 73 endpoints)

---

## Executive Summary

**Total Endpoints Cataloged**: 73 API endpoints across 15 functional domains
**Mock Data Files**: 16 JSON fixture files analyzed
**Test Coverage**: 14 Playwright E2E test suites identified
**Authentication**: JWT Bearer token (via `global.geezeo._auth`)
**Base URL Pattern**: `http(s)://host:port/api/v2`

---

## Endpoint Inventory by Module

### 1. Accounts Module (`accounts.js`) - 7 Endpoints

| Method | Endpoint | Purpose | Mock Data |
|--------|----------|---------|-----------|
| GET | `/users/:userId/accounts/:id` | Get single account details | accounts.json |
| GET | `/users/:userId/accounts/:id/investments` | Get account investment positions | investments.json |
| GET | `/users/:userId/accounts/:id/transactions?page=N` | Get paginated account transactions | accountTransactions.json |
| GET | `/users/:userId/accounts/all` | Get all user accounts | accounts.json |
| PUT | `/users/:userId/accounts/:id` | Update account settings | - |
| DELETE | `/users/:userId/accounts/:id` | Delete account | - |
| PUT | `/users/:userId/accounts/:id/archive` | Archive account | - |

**Key Data Structures**:
```json
{
  "accounts": [{
    "id": 41,
    "name": "eChecking",
    "balance": "13172.66",
    "reference_id": "789274930",
    "aggregation_type": "partner|cashedge|finicity",
    "state": "active|archived|closed",
    "harvest_updated_at": "2013-03-05T12:00:00Z",
    "account_type": "checking|savings|investment|cards",
    "display_account_type": "checking|savings|cd|investment|...",
    "include_in_expenses": true,
    "include_in_budget": true,
    "include_in_cashflow": true,
    "include_in_dashboard": true,
    "include_in_goals": true,
    "include_in_networth": true,
    "fi": {"id": 2, "name": "Capital One"},
    "error": {"message": "...", "code": "...", "actionable": true},
    "cashedge_account_type": {"name": "...", "acct_type": "...", "ext_type": "...", "group": "..."},
    "other_balances": [{"balance_type": "current", "balance": "..."}],
    "preferred_balance_type": "current|avail|...",
    "locked_balance": "0.0"
  }]
}
```

### 2. Ads Module (`ads.js`) - 1 Endpoint

| Method | Endpoint | Purpose | Query Params |
|--------|----------|---------|--------------|
| GET | `/users/:userId/ads` | Get partner advertisements | campaign_location, count, ad_dimensions |

### 3. Alerts Module (`alerts.js`) - 7 Endpoints

| Method | Endpoint | Purpose | Mock Data |
|--------|----------|---------|-----------|
| GET | `/users/:userId/alerts/destinations` | Get alert delivery settings | alertDestinations.json |
| PUT | `/users/:userId/alerts/destinations` | Update alert destinations | - |
| GET | `/users/:userId/alerts` | Get all alerts | alerts.json |
| GET | `/users/:userId/alerts/:id` | Get single alert | alerts.json |
| POST | `/users/:userId/alerts/:type` | Create alert (type-based routing) | - |
| PUT | `/users/:userId/alerts/:type/:id` | Update alert (type-based routing) | - |
| DELETE | `/users/:userId/alerts/:id` | Delete alert | - |

**Alert Type Routing Map**:
```javascript
{
  'AccountThresholdAlert': 'account_thresholds',
  'GoalAlert': 'goals',
  'MerchantNameAlert': 'merchant_names',
  'SpendingTargetAlert': 'spending_targets',
  'TransactionLimitAlert': 'transaction_limits',
  'UpcomingBillAlert': 'upcoming_bills'
}
```

**Key Data Structures**:
```json
{
  "alerts": [{
    "id": 170,
    "options": {"threshold_amount": 0.0, "threshold_type": "minimum"},
    "email_delivery": true,
    "sms_delivery": true,
    "source_type": "Account|PayoffGoal|SavingsGoal",
    "source_id": "41",
    "type": "AccountThresholdAlert",
    "source": { /* full source object */ }
  }],
  "destinations": {
    "email_address": "user@example.com",
    "sms_number": "5555551234"
  },
  "meta": {"partner_sms_enabled": true}
}
```

### 4. Budgets Module (`budgets.js`) - 5 Endpoints

| Method | Endpoint | Purpose | Query Params | Test Coverage |
|--------|----------|---------|--------------|---------------|
| GET | `/users/:userId/budgets/:id` | Get single budget | - | budgets.spec.js |
| GET | `/users/:userId/budgets` | Get all budgets or date range | start_date, end_date | budgets.spec.js |
| POST | `/users/:userId/budgets` | Create budget | - | - |
| PUT | `/users/:userId/budgets/:id` | Update budget | - | budgets.spec.js |
| DELETE | `/users/:userId/budgets/:id` | Delete budget | - | - |

**Test Scenarios** (budgets.spec.js):
- View budget details
- Edit budget name
- Edit budget amount
- View budget transactions

### 5. Cashflow Module (`cashflow.js`) - 14 Endpoints

| Method | Endpoint | Purpose | Mock Data |
|--------|----------|---------|-----------|
| GET | `/users/:userId/cashflow` | Get cashflow summary | cashflows.json |
| GET | `/users/:userId/accounts/potential_cashflow` | Get accounts eligible for cashflow | cashflow_potential_accounts.json |
| PUT | `/users/:userId/cashflow` | Update cashflow settings | - |
| GET | `/users/:userId/cashflow/events` | Get cashflow calendar events | query: begin_on, end_on |
| PUT | `/users/:userId/cashflow/events/:id` | Update cashflow event | - |
| DELETE | `/users/:userId/cashflow/events/:id` | Delete cashflow event | - |
| GET | `/users/:userId/cashflow/bills` | Get recurring bills | cashflowBills.json |
| POST | `/users/:userId/cashflow/bills` | Create bill | - |
| PUT | `/users/:userId/cashflow/bills/:id` | Update bill | - |
| DELETE | `/users/:userId/cashflow/bills/:id` | Delete bill | - |
| GET | `/users/:userId/cashflow/incomes` | Get recurring incomes | cashflowIncomes.json |
| POST | `/users/:userId/cashflow/incomes` | Create income | - |
| PUT | `/users/:userId/cashflow/incomes/:id` | Update income | - |
| DELETE | `/users/:userId/cashflow/incomes/:id` | Delete income | - |

**Key Data Structures**:
```json
{
  "cashflows": [{"id": 42, "links": {"accounts": [41]}}],
  "bills": [{
    "id": 1,
    "amount": -1827.34,
    "frequency": "Monthly|Weekly|Once|Twice a month",
    "name": "Mortgage",
    "start_date": "2018-06-05",
    "stopped_on": null
  }],
  "incomes": [{
    "id": 1,
    "amount": 3150.93,
    "frequency": "Twice a month|Monthly|Once",
    "name": "ADI Paycheck",
    "start_date": "2018-08-17",
    "stopped_on": null
  }]
}
```

### 6. Expenses Module (`expenses.js`) - 1 Endpoint

| Method | Endpoint | Purpose | Query Params | Mock Data |
|--------|----------|---------|--------------|-----------|
| GET | `/users/:userId/expenses` | Get expense summary by tag | begin_on, end_on, threshold | expenses.json |

**Data Structure**:
```json
{
  "expenses": [
    {"tag": "health", "amount": "1.74"},
    {"tag": "diningout", "amount": "102.19"},
    {"tag": "insurance", "amount": "160.48"}
  ]
}
```

### 7. Goals Module (`goals.js`) - 8 Endpoints

| Method | Endpoint | Purpose | Mock Data | Test Coverage |
|--------|----------|---------|-----------|---------------|
| GET | `/users/:userId/payoff_goals` | Get user payoff goals | stubs.ts | goals.spec.js |
| GET | `/users/:userId/savings_goals` | Get user savings goals | stubs.ts | goals.spec.js |
| GET | `/payoff_goals` | Get payoff goal image options | stubs.ts | - |
| GET | `/savings_goals` | Get savings goal image options | stubs.ts | - |
| POST | `/users/:userId/:type_goals` | Create goal (payoff|savings) | - | - |
| PUT | `/users/:userId/:type_goals/:id` | Update goal | - | - |
| PUT | `/users/:userId/:type_goals/:id/archive` | Archive goal | - | - |
| DELETE | `/users/:userId/:type_goals/:id` | Delete goal | - | - |

**Key Data Structures** (from stubs.ts):
```json
{
  "payoff_goals": [{
    "id": 13949,
    "name": "Pay off a credit card",
    "state": "active",
    "status": "under|risk|over",
    "percent_complete": 0,
    "target_completion_on": "2026-05-01",
    "image_name": "credit_card.jpg",
    "image_url": "https://content.geezeo.com/images/payoff_goal_images/credit_card.jpg",
    "links": {"accounts": [39923316]},
    "initial_value": "501.29",
    "current_value": "1002.09",
    "target_value": "0.00",
    "monthly_contribution": "70.00",
    "remaining_monthly_contribution": "140.00",
    "complete": false
  }]
}
```

### 8. Harvests Module (`harvests.js`) - 2 Endpoints

| Method | Endpoint | Purpose | Mock Data |
|--------|----------|---------|-----------|
| GET | `/users/:userId/harvest` | Get account aggregation status | harvest.json |
| POST | `/users/:userId/harvest` | Trigger account refresh | harvest.json |

**Data Structure**:
```json
{
  "harvests": [{
    "status": "complete|working",
    "href": "http://example.com/api/v2/users/42/harvest"
  }]
}
```

### 9. Net Worth Module (`netWorth.js`) - 4 Endpoints

| Method | Endpoint | Purpose | Test Coverage |
|--------|----------|---------|---------------|
| GET | `/users/:userId/networth` | Get net worth summary | networth.spec.js |
| POST | `/users/:userId/networth/accounts` | Create net worth account | - |
| PUT | `/users/:userId/networth/accounts/:id` | Update net worth account | - |
| DELETE | `/users/:userId/networth/accounts/:id` | Delete net worth account | - |

### 10. Notifications Module (`notifications.js`) - 2 Endpoints

| Method | Endpoint | Purpose | Mock Data | Test Coverage |
|--------|----------|---------|-----------|---------------|
| GET | `/users/:userId/alerts/notifications` | Get alert notifications | notifications.json | notifications.spec.js |
| DELETE | `/users/:userId/alerts/notifications/:id` | Delete notification | - | - |

**Data Structure**:
```json
{
  "notifications": [{
    "id": 50,
    "message": "Your account balance has fallen below $500.",
    "alert_type": "AccountThresholdAlert",
    "created_at": "2018-01-01T16:54:15Z"
  }]
}
```

### 11. Partners Module (`partners.js`) - 1 Endpoint

| Method | Endpoint | Purpose | Mock Data | Notes |
|--------|----------|---------|-----------|-------|
| GET | `/partners/current` | Get partner configuration | partners.json | No userId required |

**Data Structure**:
```json
{
  "partners": [{
    "id": 42,
    "domain": "pfm.example.com",
    "product_name": "Money Manager",
    "browser_title": "Money Manager",
    "partner_alerts_enabled": true,
    "demo": true,
    "modules": {
      "aggregation": {"type": "finicity|cashedge"},
      "mobile": { /* mobile config */ }
    },
    "featured_searches": []
  }]
}
```

### 12. Tags Module (`tags.js`) - 3 Endpoints

| Method | Endpoint | Purpose | Mock Data |
|--------|----------|---------|-----------|
| GET | `/tags` | Get default tags | tags.json |
| GET | `/users/:userId/tags` | Get user custom tags | tags.json |
| PUT | `/users/:userId/tags` | Update user tags | - |

**Data Structure**:
```json
{
  "defaultTags": ["Clothing", "Education", "Entertainment", ...],
  "userTags": ["Insurance", "Household", "Extra Income", ...]
}
```

### 13. Transactions Module (`transactions.js`) - 3 Endpoints

| Method | Endpoint | Purpose | Query Params | Test Coverage |
|--------|----------|---------|--------------|---------------|
| GET | `/users/:userId/transactions/search` | Search/filter transactions | q, untagged, tags[], begin_on, end_on | transactions.spec.js |
| PUT | `/users/:userId/transactions/:id` | Update transaction (tag/split) | repeat (query param) | transactions.spec.js |
| DELETE | `/users/:userId/transactions/:id` | Delete transaction | - | - |

**Transaction Data Structure**:
```json
{
  "transactions": [{
    "id": "2020_08_06_2020080603168_36807129",
    "reference_id": "2020080603168",
    "transaction_type": "Debit|Credit",
    "memo": "DICKS SPORTING GOODS",
    "balance": 45.63,
    "posted_at": "2020-08-06T00:00:00.000+00:00",
    "created_at": "2020-08-18T20:10:52.000+00:00",
    "nickname": "Dicks Sporting Goods",
    "original_name": "Dicks Sporting Goods",
    "check_number": null,
    "tags": [{"name": "Personal", "balance": 45.63}],
    "links": {"account": 36807129}
  }],
  "meta": {"total_pages": 6, "current_page": 1}
}
```

### 14. Users Module (`users.js`) - 6 Endpoints

| Method | Endpoint | Purpose | Mock Data |
|--------|----------|---------|-----------|
| GET | `/users/current` | Get current authenticated user | users.json |
| PUT | `/users/current` | Update current user | - |
| POST | `/users` | Create new user | - |
| GET | `/users/:userId/informational_messages` | Get info messages | informationalMessages.json |
| POST | `/users/:userId/logout` | Logout user | - |
| POST | `/users/current/track_login` | Track login event | - |

**User Data Structure**:
```json
{
  "users": [{
    "id": "wesnodata",
    "custom_tags": ["Household", "Insurance", ...],
    "login": "wesnodata",
    "email": "wesnodata@test.com",
    "login_count": 4267,
    "last_login_at": "2022-04-18T17:35:28.000Z",
    "custom_settings": {},
    "first_name": "Sample",
    "last_name": "User",
    "postal_code": "12345",
    "birth_year": 1999,
    "sex": "Male"
  }]
}
```

### 15. Tickets Module (`tickets.js`) - 1 Endpoint

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/users/:userId/tickets` | Create support ticket |

### 16. CashEdge Integration (`cashedge.js`) - 11 Endpoints

**Financial Institution Discovery**:
| Method | Endpoint | Purpose | Query Params |
|--------|----------|---------|--------------|
| GET | `/ce_fis` | List financial institutions | page |
| GET | `/ce_fis/:id` | Get FI details | - |
| GET | `/ce_fis/search` | Search FIs | q, scope, page |

**Account Aggregation**:
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/users/:userId/pending_accounts` | Get pending aggregation accounts |
| DELETE | `/users/:userId/pending_accounts/:accountId` | Delete pending account |
| POST | `/users/:userId/ce_fis` | Authenticate with FI (credentials) |
| PUT | `/users/:userId/ce_fis/:institutionId` | Submit MFA response |
| PUT | `/users/:userId/accounts/:accountId/update_credentials` | Update account credentials |
| PUT | `/users/:userId/accounts/classify` | Classify account types |

**CashEdge Session**:
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/users/:userId/cashedge/login` | Get CashEdge session |
| POST | `/users/:userId/cashedge/login` | Create session |
| DELETE | `/users/:userId/cashedge/login` | Destroy session |

### 17. Finicity Integration (`finicity.js`) - 2 Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/users/:userId/aggregation/finicity/connect_urls` | Get Finicity Connect URL |
| POST | `/users/:userId/aggregation/finicity/connect_urls` | Get Fix Connect URL (with account_id) |

---

## Authentication Pattern

**From `fetch.js` analysis**:

```javascript
// Global auth config
global.geezeo._auth = {
  useSsl: true,
  host: 'host',
  port: 3000,
  jwt: 'token',
  userId: 'userId',
  partnerId: 'partnerId',
  clientSecret: 'optional',
  session: 'optional',
  prefix: ''
}

// Request headers
headers: {
  'Authorization': `Bearer ${jwt}`,
  'Accept': 'application/json',
  'Content-Type': 'application/json'
}

// Base URL construction
const baseUrl = `http${useSsl ? 's' : ''}://${host}${port ? ':' + port : ''}`
const fullUrl = `${baseUrl}/api/v2${path}`
```

**OAuth Flow** (if clientSecret provided):
```
POST /oauth/tokens
Authorization: Basic ${base64.encode(clientSecret)}
Body: {"grant_type": "client_credentials"}
Response: {"access_token": "..."}
```

**JWT Expiration Handling**:
- `isJwtExpired(jwt)` checks expiration
- `onJwtExpired(jwt)` callback refreshes token
- Max 20 retry attempts

---

## Playwright Test Coverage

| Test Suite | Features Tested | Endpoints Exercised |
|------------|-----------------|---------------------|
| accounts.spec.js | Edit account, toggle active/inactive, navigation, add account | GET/PUT accounts, GET all accounts |
| budgets.spec.js | View details, edit name/amount, view transactions | GET/PUT budgets |
| goals.spec.js | (Empty file - 1 line) | - |
| alerts.spec.js | Alert management | GET/POST/PUT/DELETE alerts |
| transactions.spec.js | Search, filter, tagging | GET/PUT transactions |
| notifications.spec.js | View notifications | GET notifications |
| networth.spec.js | Net worth tracking | GET networth |
| overview.spec.js | Dashboard | Multiple endpoints |
| navigation.spec.js | App navigation | Multiple endpoints |

**Additional Test Suites Found**:
- financialhealth.spec.js
- analyzer.spec.js
- thirdpartyaccounts.spec.js
- help.spec.js
- spendingwheel.spec.js

---

## HAR Recording Strategy

### Approach for Capturing Real API Interactions

**Phase 1: Setup**
1. Start pfm-backend-simulator on localhost:3000
2. Configure responsive-tiles to use staging backend:
   ```bash
   API_KEY=a0aaac50f0bdfec4973620ce8a7cbb5400af7b4283671b02671ed7f78b3bcd733a8dc791643f88ed2e0f4505298a9efbd51e34fdeb10431f5113c7fecccabc95 \
   PARTNER_DOMAIN='geezeo.geezeo.banno-staging.com' \
   PCID=dpotockitest \
   ENV=staging \
   PORT=8080 npm start
   ```
3. Navigate to http://localhost:8080

**Phase 2: HAR Recording Using Chrome DevTools MCP**
```javascript
// Via Chrome DevTools MCP commands
mcp__chrome-devtools__navigate_page('http://localhost:8080')
mcp__chrome-devtools__list_network_requests() // Capture all API calls
mcp__chrome-devtools__get_network_request(url) // Get specific request/response
```

**Phase 3: Systematic Feature Testing**
Record HAR files while exercising each major feature:
1. **Dashboard Load** → Captures: users/current, accounts/all, harvest, goals, budgets
2. **Accounts Page** → All account endpoints
3. **Goals Page** → Goal CRUD operations
4. **Budgets Page** → Budget operations
5. **Transactions Page** → Search and tagging
6. **Cashflow Page** → Bills, incomes, events
7. **Alerts Page** → Alert management
8. **Settings** → User preferences

**Phase 4: Analysis**
- Extract unique endpoints from HAR
- Document request/response schemas
- Identify query parameters and filters
- Map relationships between endpoints

**Phase 5: Backend Implementation**
- Use mock data as baseline
- Enhance with patterns from HAR files
- Implement business logic (filtering, sorting, pagination)
- Validate against Playwright tests

---

## Critical Implementation Notes

### Required for MVP

**Must Implement First**:
1. `GET /users/current` - Authentication foundation
2. `GET /partners/current` - Configuration
3. `GET /users/:userId/accounts/all` - Account list
4. `GET /users/:userId/payoff_goals` - Goals
5. `GET /users/:userId/savings_goals` - Goals
6. `GET /users/:userId/budgets` - Budgets
7. `GET /users/:userId/transactions/search` - Transaction list
8. `GET /users/:userId/alerts/notifications` - Notifications
9. `GET /users/:userId/harvest` - Aggregation status
10. `POST /users/current/track_login` - Analytics

**Can Defer**:
- CashEdge/Finicity aggregation (complex integration)
- Ticket system
- Advertisement system
- Advanced cashflow features

### Data Relationships

**Core Entity Relationships**:
```
User
├── Accounts[] (partner, cashedge, finicity)
│   ├── Transactions[]
│   ├── Investments[]
│   └── linked to Goals, Budgets, Cashflow
├── Goals[] (payoff, savings)
│   └── linked to Accounts[]
├── Budgets[]
│   └── linked to Tags[]
├── Cashflow
│   ├── Bills[]
│   ├── Incomes[]
│   └── Events[]
├── Alerts[]
│   └── Destinations{email, sms}
├── Notifications[]
├── Tags[] (default + custom)
└── Net Worth
    └── ManualAccounts[]
```

### Query Parameter Patterns

**Pagination**: `?page=1` (1-indexed)
**Date Ranges**: `?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` or `?begin_on=YYYY-MM-DD&end_on=YYYY-MM-DD`
**Filtering**: `?q=search&tags[]=tag1&tags[]=tag2&untagged=0`
**Options**: `?repeat=true` (for repeating transaction edits)

### Response Patterns

**Success**: 200 OK with JSON body
**Created**: 201 Created (for POST operations)
**No Content**: 204 No Content (for DELETE, some POST/PUT)
**Error**: 4xx/5xx with `{"error": "message"}` or `{"message": "...", "code": "..."}`

---

## Next Steps

1. ✅ Complete endpoint catalog
2. ✅ Analyze mock data structures
3. ✅ Review test coverage
4. ⏳ Record HAR files using Chrome DevTools MCP
5. ⏳ Extract detailed request/response schemas
6. ⏳ Implement MVP endpoints in pfm-backend-simulator
7. ⏳ Validate with Playwright tests
8. ⏳ Iterate based on test failures

---

## Reference Files

**API Definitions**: `~/code/banno/responsive-tiles/src/api/*.js` (18 files)
**Mock Data**: `~/code/banno/responsive-tiles/src/api/data/*.json` (16 files)
**Tests**: `~/code/banno/responsive-tiles/tests/playwright/*.spec.js` (14 files)
**Backend Stubs**: `/src/routes/stubs.ts` (goals endpoints implemented)
**Auth Config**: `/src/config/auth.ts`, `/src/middleware/auth.ts`
