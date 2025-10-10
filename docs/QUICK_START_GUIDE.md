# Quick Start Guide - CLI Workflow Automation

## TL;DR

One command to set up your entire development environment:

```bash
npm run cli
# Select: 🚀 Quick Start Workflow → Quick Start (Automated)
```

That's it! Backend and frontend will be running with correct configuration.

## What This Does

The Quick Start workflow automatically:

1. **Clears old data** - Removes all existing seed data from database
2. **Creates fresh data** - Generates new partners, users, accounts, transactions
3. **Selects configuration** - Lets you pick which partner/user to use
4. **Generates secrets** - Creates cryptographically secure JWT shared secret
5. **Updates backend** - Automatically updates backend `.env` file
6. **Starts backend** - Launches backend server at `http://pfm.backend.simulator.com:3000`
7. **Starts frontend** - Launches responsive-tiles at `http://localhost:8080`

## Prerequisites

### One-Time Setup

1. **Add domain to /etc/hosts**
   ```bash
   echo "127.0.0.1 pfm.backend.simulator.com" | sudo tee -a /etc/hosts
   ```

2. **Verify PostgreSQL is running**
   ```bash
   psql -U postgres -c "SELECT 1"
   ```

3. **Install dependencies (if not done)**
   ```bash
   cd ~/code/pfm-backend-simulator
   npm install

   cd ~/code/banno/responsive-tiles
   npm install
   ```

That's the only setup needed!

## Running Quick Start

### Step-by-Step

```bash
# 1. Open terminal and navigate to backend
cd ~/code/pfm-backend-simulator

# 2. Run CLI
npm run cli

# 3. From main menu, select:
🚀 Quick Start Workflow

# 4. Select:
🚀 Quick Start (Automated)

# 5. Confirm when prompted:
This will clear all existing data. Continue? (y/N)

# 6. Wait ~30 seconds while it:
#    - Clears database
#    - Seeds new data
#    - Asks you to select partner (auto-selects if only 1)
#    - Asks you to select user (auto-selects if only 1)
#    - Generates JWT secret
#    - Updates backend .env
#    - Starts backend server
#    - Starts frontend server

# 7. When you see:
✅ Quick Start Complete!
🎉 Your development environment is ready!

# Open browser to:
http://localhost:8080
```

## What Gets Configured

### Database
- Default: 1 partner, 10 users, 3 accounts per user, 100 transactions per account
- Fully customizable in `~/.pfm-cli-config.json`

### Backend Server
- Runs at: `http://pfm.backend.simulator.com:3000`
- Environment: development
- JWT_SECRET: Automatically updated with generated secret

### Frontend Server
- Runs at: `http://localhost:8080`
- API proxied to backend via webpack
- Environment variables set automatically:
  - `API_KEY` = Generated JWT shared secret
  - `PARTNER_DOMAIN` = pfm.backend.simulator.com
  - `PCID` = Selected user ID
  - `ENV` = development

## Customizing Configuration

### First Time

Run workflow once to create default config:
```bash
npm run cli
# Select Quick Start Workflow
```

This creates `~/.pfm-cli-config.json`

### Edit Configuration

```bash
# Edit config file
nano ~/.pfm-cli-config.json
```

Example customizations:

```json
{
  "paths": {
    "backend": "/Users/you/custom/path/pfm-backend-simulator",
    "responsiveTiles": "/Users/you/custom/path/responsive-tiles"
  },
  "database": {
    "seedDefaults": {
      "partnersCount": 2,
      "usersPerPartner": 20,
      "accountsPerUser": 5,
      "transactionsPerAccount": 200
    }
  },
  "server": {
    "backendPort": 3001,
    "responsiveTilesPort": 8080,
    "domain": "pfm.backend.simulator.com"
  },
  "workflow": {
    "confirmDestructiveActions": false
  }
}
```

Next workflow run will use these settings!

## Troubleshooting

### "Database connection failed"
```bash
# Check PostgreSQL is running
psql -U postgres -c "SELECT 1"

# Check DATABASE_URL in backend .env
cat ~/code/pfm-backend-simulator/.env | grep DATABASE_URL
```

### "Failed to start backend"
```bash
# Check port 3000 isn't in use
lsof -i :3000

# Kill any process using it
kill -9 <PID>
```

### "Frontend won't start"
```bash
# Check port 8080 isn't in use
lsof -i :8080

# Clear node_modules and reinstall
cd ~/code/banno/responsive-tiles
rm -rf node_modules package-lock.json
npm install
```

### "Domain not resolving"
```bash
# Verify /etc/hosts entry
cat /etc/hosts | grep pfm.backend.simulator.com

# Should show: 127.0.0.1 pfm.backend.simulator.com

# Test resolution
ping -c 1 pfm.backend.simulator.com
```

### "JWT validation error"
This shouldn't happen with Quick Start! But if it does:
```bash
# Backend and frontend secrets are auto-synced
# Just run Quick Start workflow again
```

## Stopping Services

### From CLI
Press `Ctrl+C` in the CLI terminal

### Manually
```bash
# Find and kill backend
lsof -i :3000
kill <PID>

# Find and kill frontend
lsof -i :8080
kill <PID>
```

## Comparison: Old vs New Way

### Old Manual Way (15-20 minutes)
```bash
# 1. Seed database
npm run seed -- generate --clear

# 2. Find partner and user IDs in database
psql pfm_simulator -c "SELECT id, name FROM partners;"
psql pfm_simulator -c "SELECT id, first_name, partner_id FROM users LIMIT 10;"

# 3. Generate JWT secret manually
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 4. Copy secret to backend .env
nano .env
# paste secret...

# 5. Generate frontend startup command
# manually build command with IDs and secret...

# 6. Start backend
npm run dev

# 7. Open new terminal, start frontend
cd ~/code/banno/responsive-tiles
API_KEY=<long-secret> PARTNER_DOMAIN='pfm.backend.simulator.com' PCID=<user-id> ENV=development npm start

# Common errors:
# - Mismatched secrets
# - Wrong user/partner IDs
# - Forgot to update .env
# - Used wrong domain
```

### New Quick Start Way (~2 minutes)
```bash
npm run cli
# Select: Quick Start Workflow → Quick Start (Automated)
# Confirm
# Select user
# Done! 🎉
```

## Advanced Usage

### Test Only (No Server Start)

Use individual modules:
```bash
# Test database operations
npx ts-node tools/cli/modules/test-databaseManager.ts

# Test configuration
npx ts-node tools/cli/config/test-loader.ts

# Test all workflow components
npx ts-node tools/cli/test-workflow.ts
```

### Custom Seed Data

```bash
# Generate specific counts
npm run seed -- generate --clear -p 2 -u 50 -a 5 -t 200
# 2 partners, 50 users each, 5 accounts each, 200 transactions each
```

### Manual Workflow

Not yet implemented - use Quick Start for now.

## Success Indicators

When Quick Start completes successfully, you'll see:

```
✅ Quick Start Complete!

🎉 Your development environment is ready!

Services:
  ✓ Backend: http://pfm.backend.simulator.com:3000
  ✓ Frontend: http://localhost:8080

Selected Configuration:
  Partner: Mueller and Sons (ID: 304)
  User: John Doe (ID: 427)

JWT Configuration:
  Shared Secret: a0b1c2d3e4f5...
  Backend .env updated: ✓

💡 To stop services, use Ctrl+C or run workflow again
```

## Related Documentation

- `CLI_WORKFLOW_IMPLEMENTATION.md` - Complete implementation details
- `CLI_WORKFLOW_AUTOMATION.md` - Original architecture specification
- `DOMAIN_SETUP.md` - Domain configuration guide
- `JWT_TOKEN_GUIDE.md` - JWT authentication explained

## Getting Help

If Quick Start doesn't work:

1. Check PostgreSQL is running
2. Verify /etc/hosts has domain entry
3. Check ports 3000 and 8080 are free
4. Try running individual tests (see Advanced Usage)
5. Check error messages - they're designed to be helpful!

Still stuck? The old manual process still works as a fallback.
