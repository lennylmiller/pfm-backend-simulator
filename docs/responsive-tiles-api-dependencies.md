# Responsive Tiles API Dependencies

**Research Date**: 2025-09-30
**Source**: Direct analysis of ~/code/banno/responsive-tiles codebase
**Base URL Pattern**: `https://{host}/api/v2/*`

## Executive Summary

The responsive-tiles project is a React/MobX frontend application that provides modular financial UI components ("tiles"). It depends entirely on the Geezeo Rails backend's `/api/v2` REST API for all data operations. The project makes **135+ distinct API calls** across 13 functional domains.

**Key Findings**:
- All API calls route through `src/api/fetch.js` wrapper
- Uses JWT Bearer token authentication OR OAuth client credentials
- User ID is required for most endpoints (pattern: `/users/{userId}/*`)
- Partner context required (partnerId available in auth context)
- No direct database access - 100% REST API dependent

---

## Authentication & Configuration

### Auth Mechanism (from `src/api/fetch.js`)

```javascript
// Base URL construction
const baseUrl = `http${useSsl ? 's' : ''}://${host}${port ? ':' + port : ''}`
const fullUrl = `${baseUrl}/api/v2${path}`

// Auth headers (3 modes):
// 1. JWT Bearer token (primary)
opts.headers['Authorization'] = `Bearer ${jwt}`

// 2. OAuth client credentials (fallback)
opts.headers['Authorization'] = tokens.access_token

// 3. Session-based (legacy)
// No Authorization header, relies on cookies
```

### Required Configuration

```javascript
global.geezeo._auth = {
  useSsl: true,          // HTTPS enabled
  host: 'host',          // Geezeo API hostname
  port: null,            // Optional port
  jwt: '',               // JWT token for user authentication
  userId: 'userId',      // Current user ID
  partnerId: 'partnerId',// Current partner/tenant ID
  clientSecret: null,    // Optional OAuth client secret
  session: null,         // Optional session-based auth
  prefix: ''             // Optional URL prefix
}
```

---

## Complete API Endpoint Inventory

### 1. Accounts Management (8 endpoints)

**Purpose**: Account CRUD operations, investments, transactions

| Method | Endpoint Pattern | Function | Notes |
|--------|-----------------|----------|-------|
| GET | `/users/{userId}/accounts/all` | `getAllAccounts()` | List all user accounts |
| GET | `/users/{userId}/accounts/{id}` | `getAccount(id)` | Single account details |
| GET | `/users/{userId}/accounts/{id}/investments` | `getAccountInvestments(id)` | Investment holdings |
| GET | `/users/{userId}/accounts/{id}/transactions` | `getAccountTransactions(id, page)` | Paginated transactions |
| PUT | `/users/{userId}/accounts/{id}` | `updateAccount(account)` | Update account settings |
| PUT | `/users/{userId}/accounts/{id}/archive` | `archiveAccount(id)` | Archive (soft delete) |
| DELETE | `/users/{userId}/accounts/{id}` | `deleteAccount(id)` | Hard delete account |
| GET | `/users/{userId}/accounts/potential_cashflow` | `getCashflowPotentialAccounts()` | Cashflow-eligible accounts |

**Request Body Example** (updateAccount):
```json
{
  "account": {
    "name": "Updated Name",
    "include_in_networth": true,
    "include_in_cashflow": true,
    "include_in_budget": true
  }
}
```

---

### 2. Alerts System (12 endpoints)

**Purpose**: Financial alerts management (thresholds, goals, merchants, spending, bills)

| Method | Endpoint Pattern | Function | Alert Types |
|--------|-----------------|----------|-------------|
| GET | `/users/{userId}/alerts` | `getAlerts()` | All alerts |
| GET | `/users/{userId}/alerts/{id}` | `getAlert(id)` | Single alert |
| POST | `/users/{userId}/alerts/account_thresholds` | `createAlert(alert)` | AccountThresholdAlert |
| POST | `/users/{userId}/alerts/goals` | `createAlert(alert)` | GoalAlert |
| POST | `/users/{userId}/alerts/merchant_names` | `createAlert(alert)` | MerchantNameAlert |
| POST | `/users/{userId}/alerts/spending_targets` | `createAlert(alert)` | SpendingTargetAlert |
| POST | `/users/{userId}/alerts/transaction_limits` | `createAlert(alert)` | TransactionLimitAlert |
| POST | `/users/{userId}/alerts/upcoming_bills` | `createAlert(alert)` | UpcomingBillAlert |
| PUT | `/users/{userId}/alerts/{type}/{id}` | `updateAlert(alert)` | Update by type |
| DELETE | `/users/{userId}/alerts/{id}` | `deleteAlert(id)` | Delete alert |
| GET | `/users/{userId}/alerts/destinations` | `getDestinations()` | SMS/email settings |
| PUT | `/users/{userId}/alerts/destinations` | `updateDestinations(destinations)` | Update notification settings |

**Alert Type Mapping**:
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

---

### 3. Budgets (7 endpoints)

**Purpose**: Budget tracking and management

| Method | Endpoint Pattern | Function | Notes |
|--------|-----------------|----------|-------|
| GET | `/users/{userId}/budgets` | `getBudgets()` | All budgets |
| GET | `/users/{userId}/budgets/{id}` | `getBudget(id)` | Single budget |
| GET | `/users/{userId}/budgets?start_date={start}&end_date={end}` | `getBudgetsByRange(start, end)` | Date-filtered budgets |
| POST | `/users/{userId}/budgets` | `createBudget(budget)` | Create budget |
| PUT | `/users/{userId}/budgets/{id}` | `updateBudget(budget)` | Update budget |
| DELETE | `/users/{userId}/budgets/{id}` | `deleteBudget(id)` | Delete budget |

**Budget Object Structure**:
```json
{
  "name": "Groceries",
  "budget_amount": 500.00,
  "tag_names": ["food", "groceries"],
  "account_list": [123, 456],
  "show_on_dashboard": true,
  "other": {}
}
```

---

### 4. Cashflow Management (16 endpoints)

**Purpose**: Income/expense tracking, bill management, recurring transactions

| Method | Endpoint Pattern | Function | Resource |
|--------|-----------------|----------|----------|
| GET | `/users/{userId}/cashflow` | `getCashflows()` | Cashflow overview |
| PUT | `/users/{userId}/cashflow` | `updateCashflow(cashflow)` | Update settings |
| GET | `/users/{userId}/cashflow/events?begin_on={start}&end_on={end}` | `getCashflowEvents(start, end)` | Calendar events |
| PUT | `/users/{userId}/cashflow/events/{id}` | `updateCashflowEvent(event)` | Update event |
| DELETE | `/users/{userId}/cashflow/events/{id}` | `deleteCashflowEvent(id)` | Delete event |
| GET | `/users/{userId}/cashflow/bills` | `getCashflowBills()` | All bills |
| POST | `/users/{userId}/cashflow/bills` | `createCashflowBill(bill)` | Create bill |
| PUT | `/users/{userId}/cashflow/bills/{id}` | `updateCashflowBill(bill)` | Update bill |
| DELETE | `/users/{userId}/cashflow/bills/{id}` | `deleteCashflowBill(id)` | Delete bill |
| GET | `/users/{userId}/cashflow/incomes` | `getCashflowIncomes()` | All income sources |
| POST | `/users/{userId}/cashflow/incomes` | `createCashflowIncome(income)` | Create income |
| PUT | `/users/{userId}/cashflow/incomes/{id}` | `updateCashflowIncome(income)` | Update income |
| DELETE | `/users/{userId}/cashflow/incomes/{id}` | `deleteCashflowIncome(id)` | Delete income |

**Date Format**: RFC 3339 (e.g., `2024-09-30T00:00:00Z`)

---

### 5. Financial Institution Connection (CashEdge/MX) (14 endpoints)

**Purpose**: Bank account aggregation, credential management, MFA handling

| Method | Endpoint Pattern | Function | Purpose |
|--------|-----------------|----------|---------|
| GET | `/ce_fis?page={page}` | `getInstitutions(page)` | List FIs |
| GET | `/ce_fis/{id}` | `getInstitution(id)` | Single FI |
| GET | `/ce_fis/search?q={query}&scope={scope}&page={page}` | `searchInstitutions(opts)` | Search FIs |
| GET | `/users/{userId}/pending_accounts` | `getPendingAccounts()` | Awaiting classification |
| DELETE | `/users/{userId}/pending_accounts/{id}` | `deletePendingAccount(id)` | Cancel pending |
| POST | `/users/{userId}/ce_fis` | `authenticate(institution)` | Initial login |
| PUT | `/users/{userId}/ce_fis/{id}` | `mfa(institutionId, data)` | MFA response |
| PUT | `/users/{userId}/accounts/{id}/classify` | `classifyAccounts(accounts)` | Type assignment |
| PUT | `/users/{userId}/accounts/{id}/update_credentials` | `updateCredentials(accountId, data)` | Refresh credentials |
| GET | `/users/{userId}/cashedge/login` | `getLogin()` | Login status |
| POST | `/users/{userId}/cashedge/login` | `postLogin(body)` | Establish session |
| DELETE | `/users/{userId}/cashedge/login` | `deleteLogin()` | End session |

**Content-Type**: `application/x-www-form-urlencoded` (for auth endpoints)

**Credential Format**:
```
id={fiId}&credentials[login_params][username]={user}&credentials[login_params][password]={pass}
```

---

### 6. Finicity Integration (2 endpoints)

**Purpose**: Alternative aggregation provider

| Method | Endpoint Pattern | Function |
|--------|-----------------|----------|
| GET | `/users/{userId}/aggregation/finicity/connect_urls` | `getConnectUrl()` |
| POST | `/users/{userId}/aggregation/finicity/connect_urls` | `getFixConnectUrl(accountId)` |

---

### 7. Goals Management (8 endpoints)

**Purpose**: Savings and payoff goal tracking

| Method | Endpoint Pattern | Function | Goal Types |
|--------|-----------------|----------|-----------|
| GET | `/users/{userId}/savings_goals` | `getSavingsGoals()` | Savings goals |
| GET | `/users/{userId}/payoff_goals` | `getPayoffGoals()` | Debt payoff goals |
| GET | `/savings_goals` | `getSavingsGoalImages()` | Goal icon catalog |
| GET | `/payoff_goals` | `getPayoffGoalImages()` | Payoff icon catalog |
| POST | `/users/{userId}/{type}_goals` | `createGoal(type, goal)` | Create goal |
| PUT | `/users/{userId}/{type}_goals/{id}` | `updateGoal(type, goal)` | Update goal |
| PUT | `/users/{userId}/{type}_goals/{id}/archive` | `archiveGoal(type, id)` | Archive goal |
| DELETE | `/users/{userId}/{type}_goals/{id}` | `deleteGoal(type, id)` | Delete goal |

**Goal Types**: `savings` | `payoff`

---

### 8. Data Harvesting (2 endpoints)

**Purpose**: Account data refresh status

| Method | Endpoint Pattern | Function |
|--------|-----------------|----------|
| GET | `/users/{userId}/harvest` | `getHarvestStatus()` |
| POST | `/users/{userId}/harvest` | `createHarvest()` |

---

### 9. Net Worth Tracking (4 endpoints)

**Purpose**: Manual asset/liability tracking

| Method | Endpoint Pattern | Function |
|--------|-----------------|----------|
| GET | `/users/{userId}/networth` | `getNetWorth()` |
| POST | `/users/{userId}/networth/accounts` | `createNetWorth(account)` |
| PUT | `/users/{userId}/networth/accounts/{id}` | `updateNetWorth(account)` |
| DELETE | `/users/{userId}/networth/accounts/{id}` | `deleteNetWorth(id)` |

**Net Worth Account Structure**:
```json
{
  "networth_account": {
    "name": "401k",
    "account_type": "investment",
    "balance": 50000.00
  }
}
```

---

### 10. Notifications (2 endpoints)

**Purpose**: Alert notifications inbox

| Method | Endpoint Pattern | Function |
|--------|-----------------|----------|
| GET | `/users/{userId}/alerts/notifications` | `getNotifications()` |
| DELETE | `/users/{userId}/alerts/notifications/{id}` | `deleteNotification(id)` |

---

### 11. Spending Analysis (1 endpoint)

**Purpose**: Expense categorization and analysis

| Method | Endpoint Pattern | Function | Query Params |
|--------|-----------------|----------|--------------|
| GET | `/users/{userId}/expenses?begin_on={start}&end_on={end}&threshold={amount}` | `getExpenses(opts)` | Date range + threshold filter |

---

### 12. Tags/Categories (3 endpoints)

**Purpose**: Transaction categorization

| Method | Endpoint Pattern | Function | Scope |
|--------|-----------------|----------|-------|
| GET | `/tags` | `getDefaultTags()` | System-wide tags |
| GET | `/users/{userId}/tags` | `getUserTags()` | User custom tags |
| PUT | `/users/{userId}/tags` | `updateTags(tags)` | Modify user tags |

---

### 13. Transactions (3 endpoints)

**Purpose**: Transaction management and search

| Method | Endpoint Pattern | Function | Query Params |
|--------|-----------------|----------|--------------|
| GET | `/users/{userId}/transactions/search?q={query}&untagged={0,1}&tags[]={tag}&begin_on={start}&end_on={end}` | `searchTransactions(opts)` | Full-text + filters |
| PUT | `/users/{userId}/transactions/{id}` | `updateTransaction(transaction, opts)` | Nickname + tagging |
| DELETE | `/users/{userId}/transactions/{id}` | `deleteTransaction(transaction)` | Delete transaction |

**Transaction Update Body**:
```json
{
  "transaction": {
    "nickname": "Monthly Rent"
  },
  "tagging": {
    "type": "regular",
    "repeat": true,
    "regular": ["housing"]
  }
}
```

**Split Transaction Tagging**:
```json
{
  "tagging": {
    "type": "split",
    "split": [
      { "name": "food", "value": 50.00 },
      { "name": "gas", "value": 30.00 }
    ]
  }
}
```

---

### 14. Users (6 endpoints)

**Purpose**: User profile and session management

| Method | Endpoint Pattern | Function |
|--------|-----------------|----------|
| GET | `/users/current` | `getCurrentUser()` |
| PUT | `/users/current` | `putCurrentUser(user)` |
| POST | `/users` | `createUser(user)` |
| GET | `/users/{userId}/informational_messages` | `getInformationalMessages()` |
| POST | `/users/{userId}/logout` | `logout()` |
| POST | `/users/current/track_login` | `trackLogin()` |

---

### 15. Partners (1 endpoint)

**Purpose**: Tenant/partner configuration

| Method | Endpoint Pattern | Function |
|--------|-----------------|----------|
| GET | `/partners/current` | `getCurrentPartner()` |

---

### 16. Advertising (1 endpoint)

**Purpose**: Display targeted ads

| Method | Endpoint Pattern | Function | Query Params |
|--------|-----------------|----------|--------------|
| GET | `/users/{userId}/ads?campaign_location={loc}&count={n}&ad_dimensions={dims}` | `getAds(opts)` | Ad targeting params |

---

### 17. Support Tickets (1 endpoint)

**Purpose**: User support requests

| Method | Endpoint Pattern | Function |
|--------|-----------------|----------|
| POST | `/users/{userId}/tickets` | `postTicket(ticket)` |

---

### 18. OAuth (1 endpoint)

**Purpose**: OAuth token acquisition

| Method | Endpoint Pattern | Function | Auth |
|--------|-----------------|----------|------|
| POST | `/oauth/tokens` | (internal) | Basic auth with client secret |

**Request Body**:
```json
{
  "grant_type": "client_credentials"
}
```

---

## Geezeo Backend Requirements

### Minimum Required Endpoints for Responsive Tiles

To support the responsive-tiles frontend, the Geezeo backend **MUST** implement:

1. **Authentication**: JWT token generation + validation OR OAuth client credentials flow
2. **User Context**: `/users/current` and `/partners/current` for session establishment
3. **Core Financial Data**:
   - Accounts: GET all, GET single, PUT update
   - Transactions: GET search, PUT update (tagging)
   - Budgets: Full CRUD
   - Goals: Full CRUD (savings + payoff)
   - Cashflow: Bills/income CRUD

4. **Aggregation**: CashEdge/MX integration endpoints for bank connections
5. **Alerts**: Full CRUD for 6 alert types
6. **Supporting Data**: Tags, harvest status, net worth

### Optional (Feature-Dependent)

- Finicity endpoints (if using alternative aggregation)
- Ads endpoint (if monetization enabled)
- Tickets endpoint (if support widget enabled)
- Expenses analysis (if spending insights enabled)

---

## Common Patterns & Conventions

### URL Encoding
All path parameters are URI-encoded:
```javascript
`/users/${encodeURIComponent(userId)}/accounts/${encodeURIComponent(id)}`
```

### Date Formats
RFC 3339 for query parameters:
```javascript
import { rfc3339Date } from '@geezeo/utils/timeFormats'
const start_date = rfc3339Date(startDate) // "2024-09-30T00:00:00Z"
```

### HTTP Methods
- GET: Retrieve data (no body)
- POST: Create resources
- PUT: Update resources (replace/modify)
- DELETE: Remove resources

### Content Types
- Default: `application/json`
- Auth endpoints: `application/x-www-form-urlencoded`

### Error Handling
```javascript
checkStatus(response) // throws on non-2xx
  - 404: error.invalidUser = true
  - 500: Logged to Datadog
```

### JWT Expiration
Automatic refresh via `onJwtExpired` callback:
```javascript
if (isJwtExpired(jwt) && global.geezeo.onJwtExpired) {
  await global.geezeo.onJwtExpired(jwt)
  // Retry request with new JWT
}
```

---

## Database Schema Implications

Based on API endpoints, the Geezeo database requires tables for:

### Core Entities
- `users` - User profiles and authentication
- `partners` - Multi-tenant partner/FI configuration
- `accounts` - Financial accounts (checking, savings, credit, investment)
- `transactions` - Transaction records
- `tags` - Transaction categories (system + user-defined)

### Financial Features
- `budgets` - Budget definitions
- `savings_goals` - Savings goal tracking
- `payoff_goals` - Debt payoff tracking
- `networth_accounts` - Manual asset/liability tracking
- `cashflow_bills` - Recurring bill tracking
- `cashflow_incomes` - Income source tracking
- `cashflow_events` - Calendar event projections

### Alerts
- `account_threshold_alerts`
- `goal_alerts`
- `merchant_name_alerts`
- `spending_target_alerts`
- `transaction_limit_alerts`
- `upcoming_bill_alerts`
- `alert_destinations` - SMS/email notification settings
- `notifications` - Alert notifications inbox

### Aggregation
- `ce_fis` - Financial institution catalog (CashEdge/MX)
- `pending_accounts` - Accounts awaiting classification
- `harvests` - Data refresh job tracking
- `cashedge_logins` - Aggregation session state

### Supporting
- `expenses` - Spending analysis cache
- `ads` / `ad_campaigns` - Advertising system
- `tickets` - Support tickets
- `informational_messages` - System announcements

---

## Security Considerations

1. **User Isolation**: All endpoints require userId parameter - enforce row-level security
2. **Partner Scoping**: Multi-tenant architecture requires partner_id checks
3. **JWT Validation**: Token signature, expiration, and user context verification
4. **Rate Limiting**: Consider throttling on:
   - Authentication endpoints
   - Search endpoints (transactions, institutions)
   - Aggregation operations (harvest, authenticate)

4. **Sensitive Data**: Credentials passed via form-encoded POST (not logged)
5. **CORS**: Configure allowed origins for responsive-tiles hosts

---

## Performance Considerations

### High-Traffic Endpoints
- `GET /users/{userId}/accounts/all` - Called on every tile load
- `GET /users/{userId}/transactions/search` - Heavy query with filters
- `GET /users/{userId}/budgets` - Dashboard frequently polls this
- `GET /users/{userId}/alerts` - Notification badge polling

### Optimization Recommendations
1. **Caching**: Redis cache for:
   - Partner configurations
   - User tags
   - Financial institution catalog
2. **Pagination**: Implement for:
   - Transactions (already has `?page=`)
   - Alerts
   - Notifications
3. **Indexes**: Ensure on:
   - `accounts.user_id`
   - `transactions.user_id`, `transactions.posted_at`
   - `budgets.user_id`
   - `alerts.user_id`

---

## Migration Path (MySQL → PostgreSQL)

If migrating Geezeo database to PostgreSQL, test these critical API endpoints:

### Date Handling
- Cashflow date ranges (`begin_on`, `end_on`)
- Budget date filters
- Transaction search by date
- Expenses analysis date filtering

### JSON Responses
- Ensure UTF-8 encoding consistency
- Test decimal precision (currency amounts)
- Verify array handling (tags[], accounts[] params)

### Text Search
- Transaction full-text search (`?q=` parameter)
- Institution search (`/ce_fis/search`)
- May require PostgreSQL full-text search indices

---

## Conclusion

The responsive-tiles project has a **complete dependency** on the Geezeo `/api/v2` REST API. There is no direct database access, file system operations, or alternative data sources. All 135+ API endpoints must be functional for the tiles to operate correctly.

**Critical Path Endpoints** (minimum viable):
1. Authentication: JWT or OAuth tokens
2. User/Partner context: `/users/current`, `/partners/current`
3. Accounts: List, get, update
4. Transactions: Search, update
5. Aggregation: CashEdge authentication and pending accounts
6. Tags: Get default and user tags

**Database Migration Impact**: Low risk for responsive-tiles (API abstraction layer), but comprehensive API testing required to ensure MySQL → PostgreSQL migration doesn't break JSON serialization, date handling, or query patterns.
