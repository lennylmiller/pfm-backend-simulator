# API v2 Specification
**pfm-backend-simulator REST API Documentation**

> **📋 Reference Documentation**: This document describes the complete Geezeo API v2 specification for responsive-tiles frontend compatibility. Not all features are fully implemented. See `CLAUDE.md` for actual implementation status.

**Version**: 2.0.0
**Base URL**: `https://api.example.com/api/v2`
**Protocol**: HTTPS
**Content-Type**: `application/json`
**Authentication**: JWT Bearer Token

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [Common Patterns](#3-common-patterns)
4. [Error Handling](#4-error-handling)
5. [Users API](#5-users-api)
6. [Partners API](#6-partners-api)
7. [Accounts API](#7-accounts-api)
8. [Budgets API](#8-budgets-api)
9. [Goals API](#9-goals-api)
10. [Transactions API](#10-transactions-api)
11. [Tags API](#11-tags-api)
12. [Cashflow API](#12-cashflow-api)
13. [Alerts API](#13-alerts-api)
14. [Expenses API](#14-expenses-api)
15. [Networth API](#15-networth-api)
16. [Webhooks](#16-webhooks)

---

## 1. Overview

### 1.1 API Design Principles

**RESTful Architecture**:
- Resources identified by URIs
- Standard HTTP methods (GET, POST, PUT, DELETE)
- Stateless request/response
- HATEOAS links for resource relationships

**Response Format**:
- JSON for all responses
- Snake_case field naming
- Resource wrapping (`{ resource: {...} }`)
- ISO 8601 timestamps
- Decimal currency as strings

**Versioning**:
- URI versioning (`/api/v2/...`)
- Backward compatibility within major version
- Deprecation notices 90 days before removal

### 1.2 Rate Limiting

**Limits**:
- 100 requests per 15 minutes per user
- 1000 requests per hour per partner
- Rate limit headers included in responses

**Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1696435200
```

**Rate Limit Exceeded Response**:
```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
  "error": "Rate limit exceeded",
  "retry_after": 300
}
```

### 1.3 Pagination

**Query Parameters**:
- `page`: Page number (1-indexed, default: 1)
- `per_page`: Items per page (default: 25, max: 100)

**Response Format**:
```json
{
  "resources": [...],
  "meta": {
    "current_page": 1,
    "per_page": 25,
    "total_pages": 4,
    "total_count": 95
  }
}
```

---

## 2. Authentication

### 2.1 JWT Token Authentication

**Token Acquisition**:
```http
POST /api/v2/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 900,
  "user_id": 123,
  "partner_id": 456
}
```

**Token Usage**:
```http
GET /api/v2/users/123/budgets
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2.2 JWT Token Structure

**Standard Format** (Primary):
```json
{
  "userId": 123,
  "partnerId": 456,
  "iat": 1696435200,
  "exp": 1696436100
}
```

**responsive-tiles Format** (Supported):
```json
{
  "sub": 123,
  "iss": 456,
  "aud": "pfm-backend-simulator",
  "iat": 1696435200,
  "exp": 1696436100
}
```

### 2.3 Token Refresh

```http
POST /api/v2/auth/refresh
Authorization: Bearer <expired_token>
```

**Response**:
```json
{
  "access_token": "new_token_here",
  "expires_in": 900
}
```

---

## 3. Common Patterns

### 3.1 Resource URI Patterns

**Collection Operations**:
```
GET    /api/v2/resources              # List all
POST   /api/v2/resources              # Create new
```

**Member Operations**:
```
GET    /api/v2/resources/:id          # Get one
PUT    /api/v2/resources/:id          # Update (full)
PATCH  /api/v2/resources/:id          # Update (partial)
DELETE /api/v2/resources/:id          # Delete (soft)
```

**User-Scoped Resources**:
```
GET    /api/v2/users/:userId/resources
POST   /api/v2/users/:userId/resources
PUT    /api/v2/users/:userId/resources/:id
DELETE /api/v2/users/:userId/resources/:id
```

**Nested Resources**:
```
GET    /api/v2/users/:userId/accounts/:accountId/transactions
GET    /api/v2/users/:userId/budgets/:budgetId/transactions
```

### 3.2 Field Naming Conventions

**JSON Keys** (snake_case):
```json
{
  "budget_amount": "500.00",
  "created_at": "2025-10-04T12:00:00Z",
  "show_on_dashboard": true,
  "user_id": 123
}
```

**Query Parameters** (snake_case):
```
?start_date=2025-10-01&end_date=2025-10-31
?tag_names=Groceries,Dining
?include_archived=false
```

### 3.3 Data Type Conventions

**Currency** (String with 2 decimals):
```json
{
  "budget_amount": "500.00",
  "spent": "347.23",
  "balance": "12450.50"
}
```

**Dates** (ISO 8601):
```json
{
  "created_at": "2025-10-04T12:00:00Z",
  "updated_at": "2025-10-04T14:30:00Z",
  "posted_at": "2025-10-03T00:00:00Z"
}
```

**Date-Only** (YYYY-MM-DD):
```json
{
  "start_date": "2025-10-01",
  "end_date": "2025-10-31",
  "target_completion_on": "2026-12-31"
}
```

**Booleans**:
```json
{
  "show_on_dashboard": true,
  "active": false,
  "deleted": null
}
```

**Arrays**:
```json
{
  "tag_names": ["Groceries", "Food", "Essential"],
  "account_list": [123, 456, 789]
}
```

### 3.4 Links Pattern

**Resource Relationships**:
```json
{
  "budget": {
    "id": 123,
    "name": "Groceries",
    "links": {
      "accounts": [456, 789],
      "budget_histories": [1, 2, 3],
      "transactions": "/api/v2/users/123/budgets/123/transactions"
    }
  }
}
```

---

## 4. Error Handling

### 4.1 HTTP Status Codes

**Success Codes**:
- `200 OK` - Successful GET, PUT, PATCH
- `201 Created` - Successful POST
- `204 No Content` - Successful DELETE

**Client Error Codes**:
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Missing/invalid auth
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource doesn't exist
- `422 Unprocessable Entity` - Semantic error
- `429 Too Many Requests` - Rate limit exceeded

**Server Error Codes**:
- `500 Internal Server Error` - Unexpected error
- `503 Service Unavailable` - Temporary outage

### 4.2 Error Response Format

**Validation Error** (400):
```json
{
  "error": "Validation failed",
  "details": {
    "budget_amount": ["is required", "must be a positive number"],
    "name": ["is required", "must not exceed 255 characters"]
  }
}
```

**Not Found** (404):
```json
{
  "error": "Budget not found"
}
```

**Unauthorized** (401):
```json
{
  "error": "Missing or invalid authorization header"
}
```

**Forbidden** (403):
```json
{
  "error": "You don't have permission to access this resource"
}
```

**Server Error** (500):
```json
{
  "error": "Internal server error",
  "request_id": "req_abc123"
}
```

---

## 5. Users API

### 5.1 Get Current User

**Endpoint**: `GET /api/v2/users/current`

**Authentication**: Required

**Response** (200):
```json
{
  "user": {
    "id": 123,
    "partner_id": 456,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+1-555-0100",
    "timezone": "America/New_York",
    "last_login_at": "2025-10-04T12:00:00Z",
    "login_count": 42,
    "preferences": {
      "theme": "dark",
      "notifications_enabled": true
    },
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-10-04T12:00:00Z"
  }
}
```

### 5.2 Update Current User

**Endpoint**: `PUT /api/v2/users/current`

**Authentication**: Required

**Request Body**:
```json
{
  "user": {
    "first_name": "Jane",
    "last_name": "Smith",
    "phone": "+1-555-0200",
    "timezone": "America/Los_Angeles",
    "preferences": {
      "theme": "light",
      "notifications_enabled": false
    }
  }
}
```

**Response** (200):
```json
{
  "user": {
    "id": 123,
    "first_name": "Jane",
    "last_name": "Smith",
    "phone": "+1-555-0200",
    "timezone": "America/Los_Angeles",
    "preferences": {
      "theme": "light",
      "notifications_enabled": false
    },
    "updated_at": "2025-10-04T14:00:00Z"
  }
}
```

### 5.3 Track Login

**Endpoint**: `POST /api/v2/users/current/track_login`

**Authentication**: Required

**Request Body**: (Empty or optional metadata)
```json
{
  "metadata": {
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0..."
  }
}
```

**Response** (200):
```json
{
  "success": true,
  "login_count": 43,
  "last_login_at": "2025-10-04T15:00:00Z"
}
```

---

## 6. Partners API

### 6.1 Get Current Partner

**Endpoint**: `GET /api/v2/partners/current`

**Authentication**: Required

**Response** (200):
```json
{
  "partner": {
    "id": 456,
    "name": "Example Bank",
    "domain": "example.com",
    "subdomain": "pfm",
    "allow_partner_apiv2": true,
    "sso_enabled": true,
    "mfa_required": false,
    "logo_url": "https://cdn.example.com/logo.png",
    "primary_color": "#0066CC",
    "secondary_color": "#FF6600",
    "feature_flags": {
      "goals_enabled": true,
      "cashflow_enabled": true,
      "alerts_enabled": true
    },
    "settings": {
      "default_currency": "USD",
      "date_format": "MM/DD/YYYY"
    },
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2025-10-04T12:00:00Z"
  }
}
```

---

## 7. Accounts API

### 7.1 List Accounts

**Endpoint**: `GET /api/v2/users/:userId/accounts`

**Authentication**: Required

**Query Parameters**:
- `include_archived` (boolean, default: false)
- `account_type` (string, optional): checking, savings, credit_card, etc.
- `state` (string, optional): active, inactive, archived

**Response** (200):
```json
{
  "accounts": [
    {
      "id": 789,
      "user_id": 123,
      "partner_id": 456,
      "name": "Primary Checking",
      "display_name": "My Checking",
      "account_type": "checking",
      "display_account_type": "checking",
      "balance": "5432.10",
      "locked_balance": "0.00",
      "state": "active",
      "aggregation_type": "plaid",
      "include_in_networth": true,
      "include_in_cashflow": true,
      "include_in_budget": true,
      "ordering": 1,
      "latest_transaction_posted_at": "2025-10-03T12:00:00Z",
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-10-04T08:00:00Z",
      "archived_at": null
    }
  ]
}
```

### 7.2 Get Account

**Endpoint**: `GET /api/v2/users/:userId/accounts/:id`

**Authentication**: Required

**Response** (200):
```json
{
  "account": {
    "id": 789,
    "user_id": 123,
    "name": "Primary Checking",
    "display_name": "My Checking",
    "number": "****1234",
    "account_type": "checking",
    "balance": "5432.10",
    "state": "active",
    "description": "Main checking account",
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-10-04T08:00:00Z"
  }
}
```

### 7.3 Create Account

**Endpoint**: `POST /api/v2/users/:userId/accounts`

**Authentication**: Required

**Request Body**:
```json
{
  "account": {
    "name": "Savings Account",
    "display_name": "Emergency Fund",
    "account_type": "savings",
    "balance": "10000.00",
    "aggregation_type": "manual",
    "include_in_networth": true,
    "include_in_cashflow": false
  }
}
```

**Response** (201):
```json
{
  "account": {
    "id": 790,
    "user_id": 123,
    "name": "Savings Account",
    "display_name": "Emergency Fund",
    "account_type": "savings",
    "balance": "10000.00",
    "state": "active",
    "aggregation_type": "manual",
    "include_in_networth": true,
    "include_in_cashflow": false,
    "created_at": "2025-10-04T15:00:00Z",
    "updated_at": "2025-10-04T15:00:00Z"
  }
}
```

### 7.4 Update Account

**Endpoint**: `PUT /api/v2/users/:userId/accounts/:id`

**Authentication**: Required

**Request Body**:
```json
{
  "account": {
    "display_name": "Rainy Day Fund",
    "include_in_networth": true,
    "include_in_budget": true
  }
}
```

**Response** (200):
```json
{
  "account": {
    "id": 790,
    "display_name": "Rainy Day Fund",
    "include_in_networth": true,
    "include_in_budget": true,
    "updated_at": "2025-10-04T16:00:00Z"
  }
}
```

### 7.5 Delete Account

**Endpoint**: `DELETE /api/v2/users/:userId/accounts/:id`

**Authentication**: Required

**Response** (204): No Content

### 7.6 Archive Account

**Endpoint**: `PUT /api/v2/users/:userId/accounts/:id/archive`

**Authentication**: Required

**Response** (204): No Content

---

## 8. Budgets API

### 8.1 List Budgets

**Endpoint**: `GET /api/v2/users/:userId/budgets`

**Authentication**: Required

**Query Parameters**:
- `show_on_dashboard` (boolean, optional)
- `month` (integer, optional): 1-12
- `year` (integer, optional): YYYY

**Response** (200):
```json
{
  "budgets": [
    {
      "id": 100,
      "user_id": 123,
      "name": "Groceries",
      "budget_amount": "500.00",
      "spent": "347.23",
      "state": "under",
      "month": 10,
      "year": 2025,
      "tag_names": ["Groceries", "Food"],
      "show_on_dashboard": true,
      "start_date": "2025-10-01",
      "end_date": "2025-10-31",
      "recurrence_period": "monthly",
      "created_at": "2025-09-28T10:00:00Z",
      "updated_at": "2025-10-04T12:00:00Z",
      "links": {
        "accounts": [789, 790],
        "budget_histories": []
      }
    }
  ]
}
```

### 8.2 Get Budget

**Endpoint**: `GET /api/v2/users/:userId/budgets/:id`

**Authentication**: Required

**Response** (200):
```json
{
  "budget": {
    "id": 100,
    "user_id": 123,
    "name": "Groceries",
    "budget_amount": "500.00",
    "spent": "347.23",
    "state": "under",
    "percent_used": 69.45,
    "month": 10,
    "year": 2025,
    "tag_names": ["Groceries", "Food"],
    "show_on_dashboard": true,
    "created_at": "2025-09-28T10:00:00Z",
    "updated_at": "2025-10-04T12:00:00Z",
    "links": {
      "accounts": [789],
      "budget_histories": []
    }
  }
}
```

### 8.3 Create Budget

**Endpoint**: `POST /api/v2/users/:userId/budgets`

**Authentication**: Required

**Request Body**:
```json
{
  "budget": {
    "name": "Dining Out",
    "budget_amount": "300.00",
    "tag_names": ["Dining", "Restaurants"],
    "account_list": [789],
    "show_on_dashboard": true,
    "start_date": "2025-10-01",
    "end_date": "2025-10-31",
    "recurrence_period": "monthly"
  }
}
```

**Response** (201):
```json
{
  "budget": {
    "id": 101,
    "user_id": 123,
    "name": "Dining Out",
    "budget_amount": "300.00",
    "spent": "0.00",
    "state": "under",
    "month": 10,
    "year": 2025,
    "tag_names": ["Dining", "Restaurants"],
    "show_on_dashboard": true,
    "created_at": "2025-10-04T15:00:00Z",
    "updated_at": "2025-10-04T15:00:00Z",
    "links": {
      "accounts": [789],
      "budget_histories": []
    }
  }
}
```

### 8.4 Update Budget

**Endpoint**: `PUT /api/v2/users/:userId/budgets/:id`

**Authentication**: Required

**Request Body**:
```json
{
  "budget": {
    "budget_amount": "350.00",
    "show_on_dashboard": false
  }
}
```

**Response** (200):
```json
{
  "budget": {
    "id": 101,
    "budget_amount": "350.00",
    "show_on_dashboard": false,
    "updated_at": "2025-10-04T16:00:00Z"
  }
}
```

### 8.5 Delete Budget

**Endpoint**: `DELETE /api/v2/users/:userId/budgets/:id`

**Authentication**: Required

**Response** (204): No Content

---

## 9. Goals API

### 9.1 Payoff Goals

#### 9.1.1 List Payoff Goals

**Endpoint**: `GET /api/v2/users/:userId/payoff_goals`

**Authentication**: Required

**Query Parameters**:
- `include_archived` (boolean, default: false)
- `state` (string, optional): active, archived

**Response** (200):
```json
{
  "payoff_goals": [
    {
      "id": 200,
      "user_id": 123,
      "name": "Pay off credit card",
      "state": "active",
      "status": "under",
      "percent_complete": 35.5,
      "initial_value": "5000.00",
      "current_value": "3225.00",
      "target_value": "0.00",
      "monthly_contribution": "150.00",
      "target_completion_on": "2026-12-31",
      "image_name": "credit_card.jpg",
      "image_url": "https://content.geezeo.com/images/payoff_goal_images/credit_card.jpg",
      "complete": false,
      "created_at": "2025-05-01T10:00:00Z",
      "updated_at": "2025-10-04T12:00:00Z",
      "links": {
        "accounts": [789]
      }
    }
  ]
}
```

#### 9.1.2 Get Payoff Goal

**Endpoint**: `GET /api/v2/users/:userId/payoff_goals/:id`

**Authentication**: Required

**Response** (200):
```json
{
  "payoff_goal": {
    "id": 200,
    "name": "Pay off credit card",
    "state": "active",
    "status": "under",
    "percent_complete": 35.5,
    "initial_value": "5000.00",
    "current_value": "3225.00",
    "target_value": "0.00",
    "monthly_contribution": "150.00",
    "target_completion_on": "2026-12-31",
    "image_url": "https://content.geezeo.com/images/payoff_goal_images/credit_card.jpg",
    "complete": false,
    "created_at": "2025-05-01T10:00:00Z",
    "updated_at": "2025-10-04T12:00:00Z",
    "links": {
      "accounts": [789]
    }
  }
}
```

#### 9.1.3 Create Payoff Goal

**Endpoint**: `POST /api/v2/users/:userId/payoff_goals`

**Authentication**: Required

**Request Body**:
```json
{
  "payoff_goal": {
    "name": "Pay off student loan",
    "current_value": "25000.00",
    "account_id": 791,
    "target_completion_on": "2030-06-30",
    "monthly_contribution": "500.00",
    "image_name": "student_loan.jpg"
  }
}
```

**Response** (201):
```json
{
  "payoff_goal": {
    "id": 201,
    "name": "Pay off student loan",
    "state": "active",
    "status": "under",
    "percent_complete": 0.0,
    "initial_value": "25000.00",
    "current_value": "25000.00",
    "target_value": "0.00",
    "monthly_contribution": "500.00",
    "target_completion_on": "2030-06-30",
    "image_url": "https://content.geezeo.com/images/payoff_goal_images/student_loan.jpg",
    "complete": false,
    "created_at": "2025-10-04T15:00:00Z",
    "updated_at": "2025-10-04T15:00:00Z",
    "links": {
      "accounts": [791]
    }
  }
}
```

#### 9.1.4 Update Payoff Goal

**Endpoint**: `PUT /api/v2/users/:userId/payoff_goals/:id`

**Authentication**: Required

**Request Body**:
```json
{
  "payoff_goal": {
    "current_value": "24500.00",
    "monthly_contribution": "600.00"
  }
}
```

**Response** (200):
```json
{
  "payoff_goal": {
    "id": 201,
    "current_value": "24500.00",
    "percent_complete": 2.0,
    "monthly_contribution": "600.00",
    "updated_at": "2025-10-04T16:00:00Z"
  }
}
```

#### 9.1.5 Delete Payoff Goal

**Endpoint**: `DELETE /api/v2/users/:userId/payoff_goals/:id`

**Authentication**: Required

**Response** (204): No Content

#### 9.1.6 Archive Payoff Goal

**Endpoint**: `PUT /api/v2/users/:userId/payoff_goals/:id/archive`

**Authentication**: Required

**Response** (204): No Content

### 9.2 Savings Goals

#### 9.2.1 List Savings Goals

**Endpoint**: `GET /api/v2/users/:userId/savings_goals`

**Authentication**: Required

**Response** (200):
```json
{
  "savings_goals": [
    {
      "id": 300,
      "user_id": 123,
      "name": "Emergency Fund",
      "state": "active",
      "status": "under",
      "percent_complete": 60.0,
      "initial_value": "0.00",
      "current_value": "6000.00",
      "target_value": "10000.00",
      "monthly_contribution": "500.00",
      "target_completion_on": "2026-06-30",
      "image_name": "emergency_fund.jpg",
      "image_url": "https://content.geezeo.com/images/savings_goal_images/emergency_fund.jpg",
      "complete": false,
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-10-04T12:00:00Z",
      "links": {
        "accounts": [790]
      }
    }
  ]
}
```

#### 9.2.2 Create Savings Goal

**Endpoint**: `POST /api/v2/users/:userId/savings_goals`

**Authentication**: Required

**Request Body**:
```json
{
  "savings_goal": {
    "name": "Vacation Fund",
    "target_value": "5000.00",
    "current_value": "500.00",
    "account_id": 790,
    "target_completion_on": "2026-07-01",
    "monthly_contribution": "300.00",
    "image_name": "vacation.jpg"
  }
}
```

**Response** (201):
```json
{
  "savings_goal": {
    "id": 301,
    "name": "Vacation Fund",
    "state": "active",
    "status": "under",
    "percent_complete": 10.0,
    "initial_value": "500.00",
    "current_value": "500.00",
    "target_value": "5000.00",
    "monthly_contribution": "300.00",
    "target_completion_on": "2026-07-01",
    "image_url": "https://content.geezeo.com/images/savings_goal_images/vacation.jpg",
    "complete": false,
    "created_at": "2025-10-04T15:00:00Z",
    "updated_at": "2025-10-04T15:00:00Z",
    "links": {
      "accounts": [790]
    }
  }
}
```

*(Additional CRUD operations follow same pattern as Payoff Goals)*

### 9.3 Goal Images

#### 9.3.1 List Payoff Goal Images

**Endpoint**: `GET /api/v2/payoff_goals`

**Authentication**: Not Required (Public)

**Response** (200):
```json
{
  "payoff_goals": [
    {
      "image_name": "credit_card.jpg",
      "image_url": "https://content.geezeo.com/images/payoff_goal_images/credit_card.jpg",
      "category": "debt"
    },
    {
      "image_name": "student_loan.jpg",
      "image_url": "https://content.geezeo.com/images/payoff_goal_images/student_loan.jpg",
      "category": "education"
    }
  ]
}
```

#### 9.3.2 List Savings Goal Images

**Endpoint**: `GET /api/v2/savings_goals`

**Authentication**: Not Required (Public)

**Response** (200):
```json
{
  "savings_goals": [
    {
      "image_name": "emergency_fund.jpg",
      "image_url": "https://content.geezeo.com/images/savings_goal_images/emergency_fund.jpg",
      "category": "emergency"
    },
    {
      "image_name": "vacation.jpg",
      "image_url": "https://content.geezeo.com/images/savings_goal_images/vacation.jpg",
      "category": "leisure"
    }
  ]
}
```

---

## 10. Transactions API

### 10.1 List Transactions

**Endpoint**: `GET /api/v2/users/:userId/transactions`

**Authentication**: Required

**Query Parameters**:
- `start_date` (date, optional): YYYY-MM-DD
- `end_date` (date, optional): YYYY-MM-DD
- `account_id` (integer, optional)
- `tag_id` (integer, optional)
- `transaction_type` (string, optional): debit, credit
- `page` (integer, default: 1)
- `per_page` (integer, default: 25, max: 100)

**Response** (200):
```json
{
  "transactions": [
    {
      "id": 1000,
      "user_id": 123,
      "account_id": 789,
      "description": "Grocery Store",
      "original_description": "SAFEWAY #1234",
      "merchant_name": "Safeway",
      "amount": "-45.67",
      "balance": "5386.43",
      "transaction_type": "debit",
      "posted_at": "2025-10-03T12:00:00Z",
      "transacted_at": "2025-10-03T10:30:00Z",
      "primary_tag_id": 50,
      "check_number": null,
      "metadata": {},
      "created_at": "2025-10-03T14:00:00Z",
      "updated_at": "2025-10-03T14:00:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 25,
    "total_pages": 8,
    "total_count": 189
  }
}
```

### 10.2 Create Transaction

**Endpoint**: `POST /api/v2/users/:userId/transactions`

**Authentication**: Required

**Request Body**:
```json
{
  "transaction": {
    "account_id": 789,
    "description": "Coffee Shop",
    "amount": "-5.50",
    "transaction_type": "debit",
    "posted_at": "2025-10-04T08:00:00Z",
    "primary_tag_id": 52
  }
}
```

**Response** (201):
```json
{
  "transaction": {
    "id": 1001,
    "user_id": 123,
    "account_id": 789,
    "description": "Coffee Shop",
    "amount": "-5.50",
    "balance": "5380.93",
    "transaction_type": "debit",
    "posted_at": "2025-10-04T08:00:00Z",
    "primary_tag_id": 52,
    "created_at": "2025-10-04T15:00:00Z",
    "updated_at": "2025-10-04T15:00:00Z"
  }
}
```

### 10.3 Update Transaction

**Endpoint**: `PUT /api/v2/users/:userId/transactions/:id`

**Authentication**: Required

**Request Body**:
```json
{
  "transaction": {
    "description": "Starbucks",
    "primary_tag_id": 53,
    "metadata": {
      "notes": "Morning coffee"
    }
  }
}
```

**Response** (200):
```json
{
  "transaction": {
    "id": 1001,
    "description": "Starbucks",
    "primary_tag_id": 53,
    "metadata": {
      "notes": "Morning coffee"
    },
    "updated_at": "2025-10-04T16:00:00Z"
  }
}
```

### 10.4 Delete Transaction

**Endpoint**: `DELETE /api/v2/users/:userId/transactions/:id`

**Authentication**: Required

**Response** (204): No Content

### 10.5 Search Transactions

**Endpoint**: `GET /api/v2/users/:userId/transactions/search`

**Authentication**: Required

**Query Parameters**:
- `q` (string, required): Search query
- `search_fields` (array, optional): description, merchant_name, original_description
- `start_date` (date, optional)
- `end_date` (date, optional)

**Response** (200):
```json
{
  "transactions": [
    {
      "id": 1000,
      "description": "Grocery Store",
      "merchant_name": "Safeway",
      "amount": "-45.67",
      "posted_at": "2025-10-03T12:00:00Z"
    }
  ],
  "meta": {
    "query": "safeway",
    "total_count": 12
  }
}
```

---

## 11. Tags API

### 11.1 List System Tags

**Endpoint**: `GET /api/v2/tags`

**Authentication**: Optional

**Response** (200):
```json
{
  "tags": [
    {
      "id": 50,
      "name": "Groceries",
      "parent_tag_id": null,
      "tag_type": "system",
      "icon": "shopping-cart",
      "color": "#FF5733"
    },
    {
      "id": 51,
      "name": "Organic",
      "parent_tag_id": 50,
      "tag_type": "system",
      "icon": "leaf",
      "color": "#28B463"
    }
  ]
}
```

### 11.2 List User Tags

**Endpoint**: `GET /api/v2/users/:userId/tags`

**Authentication**: Required

**Response** (200):
```json
{
  "tags": [
    {
      "id": 50,
      "name": "Groceries",
      "parent_tag_id": null,
      "tag_type": "system",
      "icon": "shopping-cart",
      "color": "#FF5733"
    },
    {
      "id": 100,
      "name": "My Custom Category",
      "parent_tag_id": null,
      "tag_type": "user",
      "icon": null,
      "color": "#3498DB"
    }
  ]
}
```

### 11.3 Update User Tags

**Endpoint**: `PUT /api/v2/users/:userId/tags`

**Authentication**: Required

**Request Body**:
```json
{
  "tags": [
    {
      "id": 100,
      "name": "Updated Category Name",
      "color": "#E74C3C"
    },
    {
      "name": "New Custom Tag",
      "parent_tag_id": 50,
      "color": "#9B59B6"
    }
  ]
}
```

**Response** (200):
```json
{
  "tags": [
    {
      "id": 100,
      "name": "Updated Category Name",
      "color": "#E74C3C",
      "updated_at": "2025-10-04T16:00:00Z"
    },
    {
      "id": 101,
      "name": "New Custom Tag",
      "parent_tag_id": 50,
      "color": "#9B59B6",
      "created_at": "2025-10-04T16:00:00Z"
    }
  ]
}
```

---

## 12. Cashflow API

### 12.1 Get Cashflow Summary

**Endpoint**: `GET /api/v2/users/:userId/cashflow`

**Authentication**: Required

**Query Parameters**:
- `start_date` (date, optional): Default 90 days from now
- `end_date` (date, optional): Default current date

**Response** (200):
```json
{
  "cashflow": {
    "total_income": "5000.00",
    "total_bills": "3200.00",
    "net_cashflow": "1800.00",
    "start_date": "2025-10-01",
    "end_date": "2025-12-31",
    "bills_count": 12,
    "incomes_count": 2,
    "events_count": 45,
    "settings": {
      "auto_categorize": true,
      "show_projections": true,
      "projection_days": 90
    }
  }
}
```

### 12.2 Update Cashflow Settings

**Endpoint**: `PUT /api/v2/users/:userId/cashflow`

**Authentication**: Required

**Request Body**:
```json
{
  "cashflow": {
    "settings": {
      "auto_categorize": false,
      "projection_days": 120
    }
  }
}
```

**Response** (200):
```json
{
  "cashflow": {
    "settings": {
      "auto_categorize": false,
      "show_projections": true,
      "projection_days": 120
    },
    "updated_at": "2025-10-04T16:00:00Z"
  }
}
```

### 12.3 Bills

#### 12.3.1 List Bills

**Endpoint**: `GET /api/v2/users/:userId/cashflow/bills`

**Authentication**: Required

**Response** (200):
```json
{
  "bills": [
    {
      "id": 500,
      "user_id": 123,
      "name": "Electric Bill",
      "amount": "120.00",
      "due_date": 15,
      "recurrence": "monthly",
      "category_id": 60,
      "account_id": 789,
      "active": true,
      "stopped_at": null,
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-10-04T12:00:00Z",
      "links": {
        "category": 60,
        "account": 789
      }
    }
  ]
}
```

#### 12.3.2 Create Bill

**Endpoint**: `POST /api/v2/users/:userId/cashflow/bills`

**Authentication**: Required

**Request Body**:
```json
{
  "bill": {
    "name": "Internet Bill",
    "amount": "79.99",
    "due_date": 1,
    "recurrence": "monthly",
    "category_id": 61,
    "account_id": 789
  }
}
```

**Response** (201):
```json
{
  "bill": {
    "id": 501,
    "name": "Internet Bill",
    "amount": "79.99",
    "due_date": 1,
    "recurrence": "monthly",
    "active": true,
    "created_at": "2025-10-04T15:00:00Z"
  }
}
```

#### 12.3.3 Update Bill

**Endpoint**: `PUT /api/v2/users/:userId/cashflow/bills/:id`

**Request Body**:
```json
{
  "bill": {
    "amount": "84.99"
  }
}
```

**Response** (200):
```json
{
  "bill": {
    "id": 501,
    "amount": "84.99",
    "updated_at": "2025-10-04T16:00:00Z"
  }
}
```

#### 12.3.4 Delete Bill

**Endpoint**: `DELETE /api/v2/users/:userId/cashflow/bills/:id`

**Response** (204): No Content

#### 12.3.5 Stop Bill

**Endpoint**: `PUT /api/v2/users/:userId/cashflow/bills/:id/stop`

**Response** (200):
```json
{
  "bill": {
    "id": 501,
    "active": false,
    "stopped_at": "2025-10-04T16:00:00Z"
  }
}
```

### 12.4 Incomes

*(Same structure as Bills)*

### 12.5 Cashflow Events

#### 12.5.1 List Events

**Endpoint**: `GET /api/v2/users/:userId/cashflow/events`

**Authentication**: Required

**Query Parameters**:
- `start_date` (date, optional)
- `end_date` (date, optional)
- `event_type` (string, optional): income, expense

**Response** (200):
```json
{
  "events": [
    {
      "id": 1500,
      "user_id": 123,
      "source_type": "bill",
      "source_id": 500,
      "name": "Electric Bill",
      "amount": "-120.00",
      "event_date": "2025-10-15",
      "event_type": "expense",
      "account_id": 789,
      "processed": false,
      "metadata": {
        "recurrence": "monthly",
        "original_due_date": 15
      }
    }
  ]
}
```

---

## 13. Alerts API

### 13.1 List Alerts

**Endpoint**: `GET /api/v2/users/:userId/alerts`

**Authentication**: Required

**Response** (200):
```json
{
  "alerts": [
    {
      "id": 700,
      "user_id": 123,
      "alert_type": "account_threshold",
      "name": "Low Balance Alert",
      "source_type": "account",
      "source_id": 789,
      "conditions": {
        "threshold": "100.00",
        "operator": "less_than"
      },
      "email_delivery": true,
      "sms_delivery": false,
      "active": true,
      "last_triggered_at": "2025-10-03T12:00:00Z",
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-10-04T12:00:00Z"
    }
  ]
}
```

### 13.2 Create Account Threshold Alert

**Endpoint**: `POST /api/v2/users/:userId/alerts/account_thresholds`

**Authentication**: Required

**Request Body**:
```json
{
  "alert": {
    "name": "Savings Low Balance",
    "source_id": 790,
    "conditions": {
      "threshold": "1000.00",
      "operator": "less_than"
    },
    "email_delivery": true,
    "sms_delivery": true
  }
}
```

**Response** (201):
```json
{
  "alert": {
    "id": 701,
    "alert_type": "account_threshold",
    "name": "Savings Low Balance",
    "source_type": "account",
    "source_id": 790,
    "conditions": {
      "threshold": "1000.00",
      "operator": "less_than"
    },
    "email_delivery": true,
    "sms_delivery": true,
    "active": true,
    "created_at": "2025-10-04T15:00:00Z"
  }
}
```

### 13.3 Notifications

#### 13.3.1 List Notifications

**Endpoint**: `GET /api/v2/users/:userId/alerts/notifications`

**Authentication**: Required

**Query Parameters**:
- `read` (boolean, optional): Filter by read status
- `page` (integer, default: 1)
- `per_page` (integer, default: 25)

**Response** (200):
```json
{
  "notifications": [
    {
      "id": 2000,
      "user_id": 123,
      "alert_id": 700,
      "title": "Low Balance Alert",
      "message": "Your checking account balance is below $100",
      "read": false,
      "read_at": null,
      "email_sent": true,
      "email_sent_at": "2025-10-03T12:05:00Z",
      "sms_sent": false,
      "sms_sent_at": null,
      "metadata": {
        "account_id": 789,
        "current_balance": "87.50"
      },
      "created_at": "2025-10-03T12:00:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 25,
    "total_count": 15,
    "unread_count": 8
  }
}
```

---

## 14. Expenses API

### 14.1 Get Expenses (Current Month)

**Endpoint**: `GET /api/v2/users/:userId/expenses`

**Authentication**: Required

**Response** (200):
```json
{
  "expenses": {
    "total": "2450.50",
    "period_start": "2025-10-01",
    "period_end": "2025-10-31",
    "categories": [
      {
        "tag_id": 50,
        "tag_name": "Groceries",
        "amount": "650.00",
        "transaction_count": 15,
        "average_amount": "43.33",
        "percent_of_total": 26.5
      },
      {
        "tag_id": 52,
        "tag_name": "Dining",
        "amount": "450.50",
        "transaction_count": 12,
        "average_amount": "37.54",
        "percent_of_total": 18.4
      }
    ]
  }
}
```

### 14.2 Get Last Month Expenses

**Endpoint**: `GET /api/v2/users/:userId/expenses/last_month`

**Response** (200): Same format as 14.1

### 14.3 Get Last 30 Days Expenses

**Endpoint**: `GET /api/v2/users/:userId/expenses/last_thirty_days`

**Response** (200): Same format as 14.1

### 14.4 Filter Expenses (Include Only)

**Endpoint**: `GET /api/v2/users/:userId/expenses/only`

**Query Parameters**:
- `tags` (array, required): Comma-separated tag IDs or names

**Example**: `?tags=50,52,53` or `?tags=Groceries,Dining,Gas`

**Response** (200): Same format as 14.1

### 14.5 Filter Expenses (Exclude)

**Endpoint**: `GET /api/v2/users/:userId/expenses/except`

**Query Parameters**:
- `tags` (array, required): Comma-separated tag IDs or names to exclude

**Response** (200): Same format as 14.1

---

## 15. Networth API

### 15.1 Get Networth

**Endpoint**: `GET /api/v2/users/:userId/networth`

**Authentication**: Required

**Response** (200):
```json
{
  "networth": {
    "total": "125450.00",
    "assets": "150000.00",
    "liabilities": "24550.00",
    "calculated_at": "2025-10-04T12:00:00Z",
    "accounts_included": 8,
    "accounts_excluded": 2
  }
}
```

### 15.2 Get Networth by Account

**Endpoint**: `GET /api/v2/users/:userId/networth/accounts`

**Authentication**: Required

**Response** (200):
```json
{
  "networth": {
    "total": "125450.00",
    "assets": "150000.00",
    "liabilities": "24550.00",
    "accounts": [
      {
        "account_id": 789,
        "account_name": "Primary Checking",
        "account_type": "checking",
        "balance": "5432.10",
        "contribution": "5432.10",
        "category": "asset"
      },
      {
        "account_id": 791,
        "account_name": "Credit Card",
        "account_type": "credit_card",
        "balance": "-3225.00",
        "contribution": "-3225.00",
        "category": "liability"
      }
    ]
  }
}
```

---

## 16. Webhooks

### 16.1 Webhook Events

**Available Events**:
- `account.created`
- `account.updated`
- `account.deleted`
- `transaction.created`
- `transaction.updated`
- `budget.created`
- `budget.updated`
- `budget.exceeded`
- `goal.created`
- `goal.completed`
- `alert.triggered`

### 16.2 Webhook Payload Format

**Event Structure**:
```json
{
  "id": "evt_abc123",
  "type": "budget.exceeded",
  "created_at": "2025-10-04T16:00:00Z",
  "data": {
    "object": {
      "id": 100,
      "user_id": 123,
      "name": "Groceries",
      "budget_amount": "500.00",
      "spent": "525.00",
      "state": "over"
    }
  },
  "metadata": {
    "user_id": 123,
    "partner_id": 456
  }
}
```

### 16.3 Webhook Security

**Signature Verification**:
```
X-Webhook-Signature: sha256=<signature>
X-Webhook-Timestamp: 1696436100
```

**Verification Process**:
```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  const digest = hmac.digest('hex');
  return `sha256=${digest}` === signature;
}
```

---

## Appendix A: Status Codes Reference

**Success**:
- `200 OK` - Request successful
- `201 Created` - Resource created
- `204 No Content` - Successful deletion

**Client Errors**:
- `400 Bad Request` - Invalid request
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `422 Unprocessable Entity` - Validation error
- `429 Too Many Requests` - Rate limited

**Server Errors**:
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Temporary outage

## Appendix B: Data Type Reference

**Currency**: String, 2 decimals (`"500.00"`)
**Date**: ISO 8601 (`"2025-10-04T12:00:00Z"`)
**Date-Only**: YYYY-MM-DD (`"2025-10-04"`)
**Boolean**: `true` / `false`
**Integer**: Number
**BigInt**: Number (converted from BigInt)
**Array**: `[...]`
**Object**: `{...}`

## Appendix C: Testing

**Example cURL Requests**:

```bash
# Get current user
curl -X GET "https://api.example.com/api/v2/users/current" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create budget
curl -X POST "https://api.example.com/api/v2/users/123/budgets" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "budget": {
      "name": "Groceries",
      "budget_amount": "500.00",
      "tag_names": ["Groceries"]
    }
  }'

# List transactions
curl -X GET "https://api.example.com/api/v2/users/123/transactions?start_date=2025-10-01&end_date=2025-10-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

**Document Version**: 2.0.0
**Last Updated**: 2025-10-04
**Status**: Complete API Specification
**Compatibility**: responsive-tiles frontend 100%
