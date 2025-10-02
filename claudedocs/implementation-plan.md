# Implementation Plan - Missing API Endpoints

## Summary

The responsive-tiles frontend requires **15+ API endpoints** beyond what the pfm-backend-simulator currently implements. I've captured the exact response structures from the staging backend.

## Current Status

✅ **Working Endpoints:**
- `/api/v2/partners/current`
- `/api/v2/users/current`
- `/api/v2/users/:userId/harvest`
- `/api/v2/users/:userId/informational_messages`
- `/api/v2/users/:userId/alerts/notifications`
- `/api/v2/users/:userId/accounts/all`
- `/api/v2/users/current/track_login`

❌ **Missing Endpoints (captured from staging):**

### Priority 1: Goals (Dashboard requires these)
1. `GET /api/v2/users/:userId/payoff_goals` - Returns `{payoff_goals: [...]}`
2. `GET /api/v2/users/:userId/savings_goals` - Returns `{savings_goals: [...]}`
3. `GET /api/v2/payoff_goals` - Returns `{payoff_goal_images: [...]}`
4. `GET /api/v2/savings_goals` - Returns `{savings_goal_images: [...]}`

**Sample Data Captured:** ✅ Full staging responses saved

### Priority 2: Cashflow (Dashboard calendar)
5. `GET /api/v2/users/:userId/cashflow`
6. `GET /api/v2/users/:userId/cashflow/events?begin_on=YYYY-MM-DD&end_on=YYYY-MM-DD`
7. `GET /api/v2/users/:userId/accounts/potential_cashflow`

**Sample Data:** Need to capture

### Priority 3: Expenses (Dashboard pie chart)
8. `GET /api/v2/users/:userId/expenses?begin_on=YYYY-MM-DD&end_on=YYYY-MM-DD&threshold=100`

**Sample Data:** Need to capture

### Priority 4: Tags (Transaction categorization)
9. `GET /api/v2/tags`
10. `GET /api/v2/users/:userId/tags`

**Sample Data:** Need to capture

### Priority 5: Additional Features
11. `GET /api/v2/users/:userId/networth`
12. `GET /api/v2/users/:userId/transactions/search?untagged=0&begin_on=YYYY-MM-DD&end_on=YYYY-MM-DD`
13. `GET /api/v2/users/:userId/budgets?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
14. `GET /api/v2/users/:userId/ads?campaign_location=Dashboard&ad_dimensions=650_100`
15. `POST /api/v2/users/:userId/logout`
16. `POST /api/v2/users/:userId/harvest`

**Sample Data:** Need to capture

## Goals Endpoint Response Structure (Captured)

### `/api/v2/users/:userId/payoff_goals`
```json
{
  "payoff_goals": [{
    "id": 13949,
    "name": "Pay off a credit card",
    "state": "active",
    "status": "under",
    "percent_complete": 0,
    "target_completion_on": "2026-05-01",
    "image_name": "credit_card.jpg",
    "created_at": "2025-05-01T19:37:39.000Z",
    "updated_at": "2025-10-02T08:09:23.000Z",
    "image_url": "https://...",
    "links": {"accounts": [39923316]},
    "initial_value": "501.29",
    "current_value": "1002.09",
    "target_value": "0.00",
    "monthly_contribution": "70.00",
    "remaining_monthly_contribution": "140.00",
    "target_contribution": null,
    "current_progress": "-500.80",
    "complete": false
  }]
}
```

### `/api/v2/users/:userId/savings_goals`
```json
{
  "savings_goals": [{
    "id": 20360,
    "name": "Save for a vacation",
    "state": "active",
    "status": "under",
    "percent_complete": 94,
    "target_completion_on": "2026-08-01",
    "image_name": "vacation.jpg",
    "created_at": "2025-05-01T19:40:00.000Z",
    "updated_at": "2025-05-01T19:40:00.000Z",
    "image_url": "https://...",
    "links": {"accounts": [39922424]},
    "initial_value": "9357.24",
    "current_value": "9357.24",
    "target_value": "10000.00",
    "monthly_contribution": "60.00",
    "remaining_monthly_contribution": "60.00",
    "target_contribution": null,
    "current_progress": "0.00",
    "complete": false
  }]
}
```

### `/api/v2/payoff_goals`
```json
{
  "payoff_goal_images": [
    {"id": "credit_card.jpg", "name": "Pay off a credit card", "url": "https://..."},
    {"id": "loan.jpg", "name": "Pay off loans", "url": "https://..."},
    {"id": "payoff_goal.jpg", "name": "Custom payoff goal", "url": "https://..."}
  ]
}
```

### `/api/v2/savings_goals`
```json
{
  "savings_goal_images": [
    {"id": "baby.jpg", "name": "Save for a baby", "url": "https://..."},
    {"id": "car.jpg", "name": "Save for a car", "url": "https://..."},
    {"id": "college.jpg", "name": "Save for a college", "url": "https://..."},
    {"id": "cushion.jpg", "name": "Create a savings cushion", "url": "https://..."},
    {"id": "retirement.jpg", "name": "Save for retirement", "url": "https://..."},
    {"id": "tv.jpg", "name": "Buy something special", "url": "https://..."},
    {"id": "house.jpg", "name": "Save for a house", "url": "https://..."},
    {"id": "vacation.jpg", "name": "Save for a vacation", "url": "https://..."},
    {"id": "wedding.jpg", "name": "Save for a wedding", "url": "https://..."},
    {"id": "savings_goal.jpg", "name": "Custom savings goal", "url": "https://..."}
  ]
}
```

## Implementation Approach

### Option A: Full Implementation (Recommended)
Implement all 15+ endpoints with proper database models, controllers, and mock data.

**Pros:**
- Complete feature parity with staging
- Full app functionality
- Proper architecture

**Cons:**
- Significant effort (multiple days of work)
- Need database schema design
- Need to capture all response structures

### Option B: Stub Endpoints (Quick Fix)
Return empty arrays for all missing endpoints:
```typescript
router.get('/users/:userId/payoff_goals', (req, res) => {
  res.json({ payoff_goals: [] });
});
```

**Pros:**
- Fast (can be done in 1 hour)
- App will load and show "no data" instead of errors
- Can implement full features incrementally

**Cons:**
- Limited functionality
- Dashboard will show empty sections

### Option C: Hybrid Approach (Balanced)
Stub all endpoints first to get app working, then implement priority features incrementally:
1. Stub all 15 endpoints (1 hour)
2. Test app loads successfully
3. Implement goals endpoints with full data (2-3 hours)
4. Implement cashflow endpoints (2-3 hours)
5. Continue with remaining endpoints as needed

**Pros:**
- App works immediately
- Incremental progress
- Can prioritize based on user needs

**Cons:**
- Some features remain empty until implemented

## Recommendation

Start with **Option C (Hybrid Approach)**:

1. **Phase 1 (Next 30 minutes):** Create stub endpoints for all 15 missing endpoints
   - Returns empty arrays/objects
   - Gets app past loading screen

2. **Phase 2 (Next 2 hours):** Implement goals endpoints fully
   - Create database models for goals
   - Implement controllers with mock data
   - Test dashboard goals section

3. **Phase 3 (Next 2 hours):** Implement cashflow endpoints
   - Create cashflow models
   - Implement calendar data
   - Test dashboard cashflow calendar

4. **Phase 4 (As needed):** Implement remaining endpoints based on priority

## Next Steps

Would you like me to:
1. Start with Phase 1 (stub all endpoints)?
2. Capture more staging data first?
3. Something else?

