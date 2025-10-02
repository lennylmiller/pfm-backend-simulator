# API Documentation

Complete reference for PFM Backend Simulator API endpoints.

## Base URL

```
http://localhost:3000/api/v2
```

## Authentication

All API endpoints require JWT Bearer token authentication (except migration endpoints).

```http
Authorization: Bearer <JWT_TOKEN>
```

### JWT Payload Structure

```json
{
  "userId": "123",
  "partnerId": "1",
  "iat": 1234567890,
  "exp": 1234567890
}
```

## Response Format

### Success Response
```json
{
  "user": { /* resource object */ },
  "accounts": [ /* array of resources */ ]
}
```

### Error Response
```json
{
  "error": "Error message description"
}
```

## HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PUT request |
| 201 | Created | Successful POST request |
| 204 | No Content | Successful DELETE request |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | Valid token but insufficient permissions |
| 404 | Not Found | Resource does not exist |
| 500 | Internal Server Error | Server-side error |

---

## Partner Endpoints

### Get Current Partner

Retrieve partner information for the authenticated context.

```http
GET /partners/current
```

**Authentication**: Required

**Response**:
```json
{
  "partner": {
    "id": "1",
    "name": "Example Bank",
    "domain": "example.bank.com",
    "subdomain": "banking",
    "allowPartnerApiv2": true,
    "ssoEnabled": false,
    "mfaRequired": false,
    "logoUrl": "https://example.com/logo.png",
    "primaryColor": "#003366",
    "secondaryColor": "#6699CC",
    "featureFlags": {},
    "settings": {},
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## User Endpoints

### Get Current User

Retrieve the current authenticated user's information.

```http
GET /users/current
```

**Authentication**: Required

**Status**: Placeholder (not yet implemented)

### Update Current User

Update the current authenticated user's information.

```http
PUT /users/current
```

**Authentication**: Required

**Status**: Placeholder (not yet implemented)

---

## Account Endpoints

### Get All Accounts

Retrieve all active accounts for a user.

```http
GET /users/{userId}/accounts/all
```

**Authentication**: Required

**Path Parameters**:
- `userId` (string, required) - User ID (must match authenticated user)

**Query Parameters**: None

**Response**:
```json
{
  "accounts": [
    {
      "id": "1",
      "userId": "123",
      "partnerId": "1",
      "name": "Primary Checking",
      "displayName": "My Checking",
      "number": "****1234",
      "accountType": "checking",
      "displayAccountType": "checking",
      "aggregationType": "plaid",
      "balance": "1234.56",
      "state": "active",
      "includeInNetworth": true,
      "includeInCashflow": true,
      "includeInBudget": true,
      "includeInGoals": true,
      "includeInDashboard": true,
      "ordering": 0,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Account States**:
- `active` - Account is active and visible
- `inactive` - Account is inactive
- `archived` - Account has been archived by user
- `pending` - Account is being set up
- `error` - Account has errors

**Account Types**:
- `checking` - Checking account
- `savings` - Savings account
- `credit_card` - Credit card
- `loan` - Loan account
- `investment` - Investment account
- `mortgage` - Mortgage account
- `line_of_credit` - Line of credit
- `other` - Other account type

**Aggregation Types**:
- `plaid` - Plaid aggregation
- `mx` - MX aggregation
- `finicity` - Finicity aggregation
- `cashedge` - CashEdge aggregation
- `manual` - Manual account

### Get Single Account

Retrieve a specific account by ID.

```http
GET /users/{userId}/accounts/{id}
```

**Authentication**: Required

**Path Parameters**:
- `userId` (string, required) - User ID (must match authenticated user)
- `id` (string, required) - Account ID

**Response**:
```json
{
  "account": {
    "id": "1",
    "userId": "123",
    "name": "Primary Checking",
    "balance": "1234.56",
    // ... full account object
  }
}
```

**Error Responses**:
- `404 Not Found` - Account does not exist or doesn't belong to user

### Update Account

Update account properties.

```http
PUT /users/{userId}/accounts/{id}
```

**Authentication**: Required

**Path Parameters**:
- `userId` (string, required) - User ID (must match authenticated user)
- `id` (string, required) - Account ID

**Request Body**:
```json
{
  "account": {
    "name": "Updated Account Name",
    "display_name": "My Updated Account",
    "include_in_networth": true,
    "include_in_cashflow": true,
    "include_in_budget": true,
    "include_in_goals": true,
    "include_in_dashboard": true
  }
}
```

**Updatable Fields**:
- `name` - Account name
- `display_name` - Display name
- `include_in_networth` - Include in net worth calculations
- `include_in_cashflow` - Include in cashflow
- `include_in_budget` - Include in budget
- `include_in_goals` - Include in goals
- `include_in_dashboard` - Show on dashboard

**Response**:
```json
{
  "account": {
    "id": "1",
    "name": "Updated Account Name",
    "updatedAt": "2024-01-02T00:00:00.000Z",
    // ... full account object
  }
}
```

### Archive Account

Archive an account (soft delete).

```http
PUT /users/{userId}/accounts/{id}/archive
```

**Authentication**: Required

**Path Parameters**:
- `userId` (string, required) - User ID (must match authenticated user)
- `id` (string, required) - Account ID

**Response**:
```json
{
  "account": {
    "id": "1",
    "archivedAt": "2024-01-02T00:00:00.000Z",
    // ... full account object
  }
}
```

**Notes**:
- Archived accounts are excluded from `/accounts/all` queries
- Archived accounts can be retrieved individually by ID

### Delete Account

Permanently delete an account.

```http
DELETE /users/{userId}/accounts/{id}
```

**Authentication**: Required

**Path Parameters**:
- `userId` (string, required) - User ID (must match authenticated user)
- `id` (string, required) - Account ID

**Response**: `204 No Content`

**Notes**:
- This permanently deletes the account and all associated transactions
- Cascading deletes are handled automatically by the database

---

## Transaction Endpoints

**Status**: Not yet implemented

Planned endpoints:
- `GET /users/{userId}/transactions/search` - Search transactions
- `GET /users/{userId}/transactions/{id}` - Get single transaction
- `PUT /users/{userId}/transactions/{id}` - Update transaction
- `DELETE /users/{userId}/transactions/{id}` - Delete transaction

---

## Budget Endpoints

**Status**: Not yet implemented

Planned endpoints:
- `GET /users/{userId}/budgets` - List budgets
- `POST /users/{userId}/budgets` - Create budget
- `GET /users/{userId}/budgets/{id}` - Get budget
- `PUT /users/{userId}/budgets/{id}` - Update budget
- `DELETE /users/{userId}/budgets/{id}` - Delete budget

---

## Goal Endpoints

**Status**: Not yet implemented

Planned endpoints:
- `GET /users/{userId}/savings_goals` - List savings goals
- `POST /users/{userId}/savings_goals` - Create savings goal
- `GET /users/{userId}/savings_goals/{id}` - Get savings goal
- `PUT /users/{userId}/savings_goals/{id}` - Update savings goal
- `DELETE /users/{userId}/savings_goals/{id}` - Delete savings goal
- `GET /users/{userId}/payoff_goals` - List payoff goals
- `POST /users/{userId}/payoff_goals` - Create payoff goal
- `GET /users/{userId}/payoff_goals/{id}` - Get payoff goal
- `PUT /users/{userId}/payoff_goals/{id}` - Update payoff goal
- `DELETE /users/{userId}/payoff_goals/{id}` - Delete payoff goal

---

## Alert Endpoints

**Status**: Not yet implemented

Planned endpoints:
- `GET /users/{userId}/alerts` - List alerts
- `POST /users/{userId}/alerts` - Create alert
- `GET /users/{userId}/alerts/{id}` - Get alert
- `PUT /users/{userId}/alerts/{id}` - Update alert
- `DELETE /users/{userId}/alerts/{id}` - Delete alert

---

## Tag Endpoints

**Status**: Not yet implemented

Planned endpoints:
- `GET /tags` - List all tags
- `GET /users/{userId}/tags` - List user's tags
- `POST /users/{userId}/tags` - Create tag
- `PUT /users/{userId}/tags/{id}` - Update tag
- `DELETE /users/{userId}/tags/{id}` - Delete tag

---

## Cashflow Endpoints

**Status**: Not yet implemented

Planned endpoints:
- `GET /users/{userId}/cashflow` - Get cashflow data
- `GET /users/{userId}/cashflow/summary` - Get cashflow summary

---

## Migration Endpoints

These endpoints are used by the migration tool and do not require JWT authentication.

### Test Connection

Test connection to Geezeo API.

```http
POST /api/migrate/test
```

**Authentication**: None (uses API key in body)

**Request Body**:
```json
{
  "apiKey": "your-geezeo-api-key",
  "partnerDomain": "geezeo.example.com",
  "pcid": "user-identifier",
  "partnerId": "1"
}
```

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "123",
    "email": "user@example.com",
    // ... user data from Geezeo API
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Connection failed: Invalid API key"
}
```

### Start Migration

Begin data migration from Geezeo API (Server-Sent Events).

```http
POST /api/migrate/start
```

**Authentication**: None (uses API key in body)

**Request Body**:
```json
{
  "config": {
    "apiKey": "your-geezeo-api-key",
    "partnerDomain": "geezeo.example.com",
    "pcid": "user-identifier",
    "partnerId": "1"
  },
  "entities": {
    "currentUser": true,
    "accounts": true,
    "transactions": false,
    "budgets": false,
    "goals": false,
    "alerts": false,
    "tags": false
  }
}
```

**Response**: Server-Sent Events stream

**Event Format**:
```
data: {"type":"progress","message":"Fetching user data...","entity":"user"}

data: {"type":"success","message":"User migrated","entity":"user","count":1}

data: {"type":"progress","message":"Fetching accounts...","entity":"accounts"}

data: {"type":"success","message":"Accounts migrated","entity":"accounts","count":4}

data: {"type":"complete","message":"Migration completed"}
```

**Event Types**:
- `progress` - Progress update
- `success` - Entity migration completed
- `error` - Migration error occurred
- `complete` - All migrations finished

---

## Error Handling

### Common Error Scenarios

**Invalid JWT Token**:
```json
{
  "error": "Invalid or expired token"
}
```
Status: `401 Unauthorized`

**User Context Mismatch**:
```json
{
  "error": "Forbidden"
}
```
Status: `403 Forbidden`

When a user tries to access another user's resources.

**Resource Not Found**:
```json
{
  "error": "Account not found"
}
```
Status: `404 Not Found`

**Server Error**:
```json
{
  "error": "Internal server error"
}
```
Status: `500 Internal Server Error`

---

## Data Types

### BigInt Handling

All IDs are PostgreSQL `bigint` type. In JSON responses, they are serialized as strings:

```json
{
  "id": "1234567890",
  "userId": "9876543210"
}
```

### Decimal Handling

Monetary amounts are stored as `Decimal(12,2)` and serialized as strings:

```json
{
  "balance": "1234.56",
  "amount": "99.99"
}
```

### Date Handling

All dates are in ISO 8601 format (UTC):

```json
{
  "createdAt": "2024-01-01T00:00:00.000Z",
  "postedAt": "2024-01-02T12:30:00.000Z"
}
```

### JSON Fields

Some fields accept arbitrary JSON objects:

```json
{
  "metadata": { "custom": "value" },
  "featureFlags": { "newFeature": true },
  "settings": { "theme": "dark" }
}
```

---

## Rate Limiting

**Status**: Not implemented

Future consideration for production deployments.

---

## Pagination

**Status**: Not implemented

Future consideration for large result sets (transactions, etc.).

---

## Versioning

Current API version: **v2**

All endpoints are prefixed with `/api/v2` to maintain compatibility with Geezeo PFM API.
