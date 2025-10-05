# Local Domain Setup for pfm.backend.simulator

## Quick Setup

### 1. Add Domain to /etc/hosts

Run this command:

```bash
echo "127.0.0.1 pfm.backend.simulator" | sudo tee -a /etc/hosts
```

Or manually edit `/etc/hosts` and add:
```
127.0.0.1 pfm.backend.simulator
```

### 2. Verify Domain Resolution

```bash
ping -c 1 pfm.backend.simulator
# Should show: PING pfm.backend.simulator (127.0.0.1)
```

### 3. Generate Startup Command

```bash
cd ~/code/pfm-backend-simulator
npm run cli
```

1. Login with a test user
2. Go to Settings → "Generate RT Startup command"
3. Copy the generated command
4. Update backend `.env` with the generated `JWT_SECRET`

The CLI will generate a command like:
```bash
API_KEY=<128-char-hex> PARTNER_DOMAIN='pfm.backend.simulator' PCID=426 ENV=development npm start
```

### 4. Start Backend

```bash
cd ~/code/pfm-backend-simulator
npm run dev
# Backend runs at http://pfm.backend.simulator:3000
```

### 5. Start Frontend

```bash
cd ~/code/banno/responsive-tiles
# Paste the command from step 3
API_KEY=<your-generated-key> PARTNER_DOMAIN='pfm.backend.simulator' PCID=426 ENV=development npm start
# Frontend runs at http://localhost:8080
```

## Why This Works

1. **JWT Validation**: The frontend validates that `aud` (audience) claim is a proper domain name without protocol/path
2. **Domain Mapping**: `/etc/hosts` maps `pfm.backend.simulator` → `127.0.0.1` (localhost)
3. **Shared Secret**: The `API_KEY` used to sign tokens in webpack must match the backend's `JWT_SECRET`
4. **Proxy**: Webpack proxy forwards `/api/*` requests to `http://pfm.backend.simulator:3000`

## Troubleshooting

### "JWT payload aud should only be the domain name" Error
- ✅ Fixed by using `pfm.backend.simulator` instead of `localhost`
- The domain must not include protocol (`http://`) or path

### Domain Not Resolving
```bash
# Check /etc/hosts entry
cat /etc/hosts | grep pfm.backend.simulator

# Should see: 127.0.0.1 pfm.backend.simulator
```

### API Requests Failing
```bash
# Test backend directly
curl http://pfm.backend.simulator:3000/health

# Should return: {"status":"ok"}
```

### Authentication Failing (401 Unauthorized)
- Verify `API_KEY` matches backend `JWT_SECRET` exactly
- Check that JWT_SECRET in backend `.env` was updated with generated value
- Restart backend after updating `.env`

## Clean Up (Optional)

To remove the domain entry later:

```bash
sudo sed -i '' '/pfm.backend.simulator/d' /etc/hosts
```
