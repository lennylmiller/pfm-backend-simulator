# JWT Token Generation Guide

This guide explains how to generate and use JWT tokens for testing the pfm-backend-simulator API.

## Quick Start

Generate a JWT token for the default seeded user:

```bash
npm run jwt
```

This generates a token for:
- **User ID**: 426 (first seeded user)
- **Partner ID**: 303 (seeded partner)
- **Valid for**: 24 hours

## Custom Token Generation

Generate a token for a specific user and partner:

```bash
npm run jwt -- [userId] [partnerId] [expirationMinutes]
```

### Examples

**Different user:**
```bash
npm run jwt -- 427 303
```

**Custom expiration (7 days):**
```bash
npm run jwt -- 426 303 10080
```

**Short-lived token (15 minutes):**
```bash
npm run jwt -- 426 303 15
```

## Using Generated Tokens

### 1. API Testing with curl

```bash
# Copy the token from the output
export JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Use in curl requests
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3000/api/v2/users/426/accounts
```

### 2. Responsive Tiles Integration

#### Option A: Using CLI Tool (Easiest)

```bash
# 1. Run the CLI tool
npm run cli

# 2. Login with a test user
# 3. Go to Settings menu
# 4. Select "Generate RT Startup command"
# 5. CLI generates a new shared secret and complete startup command
# 6. Update backend .env with the generated JWT_SECRET
# 7. Copy and run the generated command in ~/code/banno/responsive-tiles
```

The CLI will:
- Generate a new cryptographically secure shared secret (128-char hex)
- Create the complete startup command with API_KEY, PARTNER_DOMAIN, PCID, ENV
- Display the matching JWT_SECRET to update in backend .env

#### Option B: Environment Variable (Manual)

```bash
cd ~/code/banno/responsive-tiles

# Set the API key to match backend JWT_SECRET
API_KEY='your-secret-key-change-in-production-minimum-32-chars' \
PARTNER_DOMAIN='localhost' \
PCID='426' \
PARTNER_ID='303' \
ENV='development' \
npm start
```

Responsive-tiles will automatically generate fresh JWTs using the API_KEY.

#### Option C: Manual JWT Override (Browser Console)

If you need to use a specific pre-generated token:

1. Start responsive-tiles normally:
   ```bash
   npm start
   ```

2. Open browser console at `http://localhost:8080`

3. Set the JWT manually:
   ```javascript
   // Replace with your generated token
   global.geezeo._auth.jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   ```

4. Reload the page

### 3. API Client (Postman, Insomnia, etc.)

1. Copy the generated token
2. Add header: `Authorization: Bearer <token>`
3. Make requests to `http://localhost:3000/api/v2/...`

## Token Details

The generated JWT contains:

```json
{
  "sub": "426",           // User ID (responsive-tiles format)
  "iss": "303",           // Partner ID (responsive-tiles format)
  "aud": "localhost",     // Audience
  "userId": "426",        // User ID (standard format)
  "partnerId": "303",     // Partner ID (standard format)
  "email": "user426@example.com",
  "iat": 1234567890,      // Issued at timestamp
  "exp": 1234654290       // Expiration timestamp
}
```

The token supports both responsive-tiles format (`sub`, `iss`) and standard format (`userId`, `partnerId`) for maximum compatibility.

## Understanding the Shared Secret

In JWT terminology, the `API_KEY` is called the **"shared secret"**:

- **Frontend (webpack)**: Uses `API_KEY` to **sign** tokens (HS256 algorithm)
- **Backend (pfm-backend-simulator)**: Uses `JWT_SECRET` to **verify** tokens
- **Critical**: `API_KEY` and `JWT_SECRET` must be identical

This is **symmetric cryptography** - the same key signs and verifies:

```javascript
// Frontend (webpack): Sign
jwt.sign(payload, apiKey)  // API_KEY = shared secret

// Backend: Verify
jwt.verify(token, process.env.JWT_SECRET)  // JWT_SECRET = same shared secret
```

**Security Note**: Anyone with this shared secret can create valid tokens. Keep it secure!

## Finding User and Partner IDs

### List Available Users

```bash
psql pfm_simulator -c "SELECT id, email, partner_id FROM users LIMIT 10;"
```

### List Available Partners

```bash
psql pfm_simulator -c "SELECT id, name FROM partners;"
```

### Check User's Accounts

```bash
psql pfm_simulator -c "SELECT id, name, account_type FROM accounts WHERE user_id = 426;"
```

## Token Expiration

Default tokens expire after 24 hours. When a token expires:

- API returns `401 Unauthorized`
- Generate a new token with `npm run jwt`
- Responsive-tiles automatically refreshes tokens if using environment variables

## Troubleshooting

### 401 Unauthorized Error

**Cause**: Token expired or invalid secret

**Fix**:
1. Generate new token: `npm run jwt`
2. Verify JWT_SECRET matches in backend `.env`
3. Check token hasn't expired

### 403 Forbidden Error

**Cause**: User/Partner ID mismatch

**Fix**:
1. Verify user ID in token matches API request
2. Check partner ID is correct for the user
3. Query database to confirm user exists:
   ```bash
   psql pfm_simulator -c "SELECT * FROM users WHERE id = 426;"
   ```

### Invalid Token Format

**Cause**: Malformed token or wrong secret

**Fix**:
1. Ensure JWT_SECRET in backend `.env` is at least 32 characters
2. Regenerate token with `npm run jwt`
3. Don't manually edit the token string

## Integration Testing Workflow

### 1. Backend Setup
```bash
cd ~/code/pfm-backend-simulator
npm run dev  # Start on port 3000
```

### 2. Generate Test Token
```bash
npm run jwt
# Copy the token from output
```

### 3. Test API Endpoint
```bash
export JWT_TOKEN="<generated-token>"
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3000/api/v2/users/426/accounts | jq
```

### 4. Start Responsive Tiles
```bash
cd ~/code/banno/responsive-tiles
npm start  # Port 8080
```

### 5. Verify Integration
Open `http://localhost:8080` - data should load automatically

## Advanced Usage

### Generate Multiple Tokens for Different Users

```bash
# User 426
npm run jwt -- 426 303 > user426-token.txt

# User 427
npm run jwt -- 427 303 > user427-token.txt

# User 428
npm run jwt -- 428 303 > user428-token.txt
```

### Scripted Token Usage

```bash
#!/bin/bash
# get-accounts.sh

# Generate token and extract just the token string
TOKEN=$(npm run jwt --silent | grep "^eyJ" | head -1)

# Use token in API request
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v2/users/426/accounts" | jq
```

### Token Validation

Decode and inspect token at [jwt.io](https://jwt.io) or:

```bash
# Install jwt-cli if needed: npm install -g jwt-cli

# Decode token
jwt decode <token>
```

## Security Notes

- **Development Only**: These tokens are for local development
- **Keep Secrets Safe**: Don't commit JWT_SECRET to version control
- **Rotate Regularly**: Change JWT_SECRET periodically in production
- **HTTPS Only**: Use HTTPS for production token transmission
- **Short Expiration**: Use shorter expiration times in production (15 minutes typical)

## Quick Reference

```bash
# Generate default token
npm run jwt

# Custom user/partner
npm run jwt -- 427 303

# Custom expiration (7 days)
npm run jwt -- 426 303 10080

# Test with curl
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/v2/users/426/accounts

# Set in responsive-tiles
API_KEY='your-secret-key-change-in-production-minimum-32-chars' PCID='426' PARTNER_ID='303' npm start
```

## Related Documentation

- [Responsive Tiles Integration Guide](./RESPONSIVE_TILES_INTEGRATION.md)
- [Authentication Middleware](../src/middleware/auth.ts)
- [CLI Tool Documentation](../tools/cli/README.md)
