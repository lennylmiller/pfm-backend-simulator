# Debugging Session - October 2, 2025 (Continued)

## Critical Discovery: JWT Token Mismatch

### Root Cause Identified

The app was crashing because the JWT token hardcoded in `/Users/LenMiller/code/banno/responsive-tiles/src/local-dev.html` was generated with a **different secret** than what the pfm-backend-simulator is using.

**File**: `local-dev.html:13`
**Original JWT** (line 13):
```
jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiIxIiwiYXVkIjoiZGV2LmxvY2FsaG9zdC5jb20iLCJzdWIiOiIxIiwiaWF0IjoxNzU5Mzc1MzY5LCJleHAiOjE3NTk0NjE3Njl9.4mTaBq10sP23laqu9AOS-UTrngpxhIloSISj92khGa4'
```

**Problem**: This JWT was signed with an unknown/incorrect secret, causing the backend to reject it with:
```
{"error":"Invalid or expired token"}
```

### Investigation Process

1. **Verified `/users/current` endpoint works correctly**:
   ```bash
   curl -H "Authorization: Bearer <VALID_JWT>" http://localhost:3000/api/v2/users/current
   # Returns: {"id":"1","partner_id":"1","email":"Asha_Toy84@gmail.com",...}
   ```

2. **Found actual JWT secret in backend `.env`**:
   ```
   JWT_SECRET="your-secret-key-change-in-production-minimum-32-chars"
   ```

3. **Generated new JWT with correct secret**:
   ```javascript
   const jwt = require('jsonwebtoken');
   const token = jwt.sign(
     { iss: '1', aud: 'dev.localhost.com', sub: '1' },
     'your-secret-key-change-in-production-minimum-32-chars',
     { expiresIn: '30d' }  // Extended expiration
   );
   ```

### Fix Applied

**Updated**: `/Users/LenMiller/code/banno/responsive-tiles/src/local-dev.html:13`

**New JWT** (expires in 30 days):
```
jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiIxIiwiYXVkIjoiZGV2LmxvY2FsaG9zdC5jb20iLCJzdWIiOiIxIiwiaWF0IjoxNzU5NDMyNTY3LCJleHAiOjE3NjIwMjQ1Njd9.e_qqvB4qDQ1jP3eznlS1w-EWDQk_LIb4TWeJ5bdpaxY'
```

## Current Status After JWT Fix

### What Changed
- ✅ JWT token in local-dev.html now matches backend secret
- ✅ Token validated and confirmed working via curl
- ✅ HTML file updated and being served by webpack

### What's Still Broken
- ❌ App still shows "Oops! Something went wrong!"
- ❌ `window.geezeo._user` is still `null`
- ❌ User data not loading into frontend stores
- ❌ Accounts count: 0
- ❌ Goals count: 0

### Console Errors (Still Present)
```
- "Cannot read properties of undefined (reading '0')" - Multiple occurrences
- "Failed to execute 'json' on 'Response': Unexpected end of JSON input"
- "handleError called {"e":{},"opts":{}}" - Multiple occurrences
```

## Next Steps / Remaining Issues

### Hypothesis
The JWT fix was necessary but not sufficient. The app is likely failing due to:
1. **Empty stub data causing undefined array access** - Frontend expects at least minimal data in arrays
2. **Possible race condition** - User endpoint may be loading but timing out or being rejected for another reason
3. **Additional missing fields** - User or account responses may be missing required fields

### Recommended Actions

**Option A: Verify User Endpoint Loading**
1. Force browser hard reload (Cmd+Shift+R)
2. Check network tab for `/users/current` response
3. Verify response body contains user data
4. Check if user data is being stored in `window.geezeo._user`

**Option B: Add Minimal Valid Data to Stub Endpoints**
Instead of returning empty arrays `[]`, return arrays with minimal but valid object structures:
- `accounts: []` → `accounts: [{id: 1, name: "Checking", ...minimal_fields}]`
- `expenses: []` → `expenses: [{amount: "0.00", ...minimal_fields}]`
- etc.

**Option C: Debug Frontend User Loading Logic**
1. Search responsive-tiles source for where `_user` is set
2. Add debugging to see why user data isn't being stored
3. Check if there's validation/parsing failing silently

### Files Modified This Session

**Frontend**:
- `/Users/LenMiller/code/banno/responsive-tiles/src/local-dev.html` - Updated JWT token

**Backend** (from previous session):
- `/src/routes/stubs.ts` - Stub endpoints with goals data
- `/src/routes/index.ts` - Added stub routes
- `/src/routes/accounts.ts` - Added potential_cashflow route

## Technical Notes

### JWT Token Generation Command
```bash
node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { iss: '1', aud: 'dev.localhost.com', sub: '1' },
  'your-secret-key-change-in-production-minimum-32-chars',
  { expiresIn: '30d' }
);
console.log(token);
"
```

### Verifying JWT Works
```bash
curl -s -H "Authorization: Bearer <JWT_TOKEN>" \
  http://localhost:3000/api/v2/users/current | jq .
```

### Auth Config Location
- **Backend**: `/src/config/auth.ts` - Defaults to `process.env.JWT_SECRET || 'dev-secret-key'`
- **Environment**: `.env` - Contains `JWT_SECRET="your-secret-key-change-in-production-minimum-32-chars"`
- **Frontend**: `src/local-dev.html:13` - Hardcoded JWT token

### Important Pattern Discovered

When the backend rejects a JWT:
1. Returns 401 with `{"error":"Invalid or expired token"}`
2. Frontend doesn't show specific error, just generic "Oops! Something went wrong!"
3. User store remains null: `window.geezeo._user === null`
4. Downstream code crashes trying to access undefined arrays/properties

This created a cascading failure where:
- User doesn't load → accounts can't load → app crashes
- Empty stub arrays → frontend accesses `array[0]` → undefined error
- Multiple "Cannot read properties of undefined" errors compound

## Key Insight

The JWT mismatch was masking multiple other issues:
1. All API endpoints returning 200 OK ✅
2. But user endpoint being rejected due to bad JWT ❌
3. Without user data, everything else fails ❌
4. Empty stub arrays also causing crashes ❌

**The fix addresses authentication, but data structure issues remain.**
