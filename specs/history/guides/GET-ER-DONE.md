# GET-ER-DONE: Complete Setup Instructions for Debugging

This guide covers debugging both the **responsive-tiles frontend** and the **pfm-backend-simulator backend**.

## Debugging Frontend (Responsive-Tiles)

### Start Services in Order

### Step 1: Verify PostgreSQL is Running
**Project**: System-wide
**Command**:
```bash
# Check if PostgreSQL is running locally:
pg_isready

# If not running, start it (macOS with Homebrew):
brew services start postgresql@14

# Or if using a different version:
brew services list  # Find your PostgreSQL version
brew services start postgresql@<version>
```
**Wait for**: `accepting connections` message

### Step 2: Start PFM Backend Simulator
**Project**: `~/code/pfm-backend-simulator`
**Terminal 1**:
```bash
cd ~/code/pfm-backend-simulator
npm run dev
```
**Wait for**: `[INFO]: PFM Backend Simulator listening on port 3000`

### Step 3: Start Caddy Reverse Proxy
**Project**: `~/code/pfm-backend-simulator`
**Terminal 2**:
```bash
cd ~/code/pfm-backend-simulator
caddy run --config Caddyfile
```
**Wait for**: Caddy starts and shows serving on port 443

### Step 4: Start Responsive-Tiles Debug Session
**Project**: `~/code/banno/responsive-tiles`
**In VS Code**:
1. Open the responsive-tiles project in VS Code
2. Press `Cmd+Shift+D` (opens Run & Debug panel)
3. From the dropdown at the top, select **"Full Stack Debug (PFM Backend Simulator)"**
4. Press `F5` (or click the green play button)
5. Wait for "webpack compiled successfully" in the terminal
6. Chrome will automatically open to http://localhost:8080

### Step 5: Set Breakpoints and Debug
**Project**: `~/code/banno/responsive-tiles`
**In VS Code**:
1. Open any `.js` file in `src/` (e.g., `src/stores/accountsStore.js`)
2. Click in the gutter (left of line numbers) to add breakpoints
3. Interact with the app in Chrome
4. Code will pause at your breakpoints

## Quick Reference

**Running Services:**
- PostgreSQL: Database (port 5432) - running locally via Homebrew
- Backend: http://localhost:3000
- Caddy: https://pfm.backend.simulator.com (port 443) → proxies to backend
- Frontend: http://localhost:8080

**Service Dependencies:**
```
PostgreSQL (local service)
    ↓
Backend (port 3000)
    ↓
Caddy (port 443) → proxies to Backend
    ↓
Responsive-Tiles (port 8080) → calls Caddy
```

## Stopping Services

```bash
# Stop development services:
lsof -i :3000 -t | xargs kill  # Backend
lsof -i :8080 -t | xargs kill  # Responsive-tiles
caddy stop                      # Caddy

# PostgreSQL keeps running (don't stop it)
# If you need to stop PostgreSQL:
# brew services stop postgresql@14
```

Or press `Shift+F5` in VS Code to stop the debugger (stops responsive-tiles only).

## Debugging Tips

### Setting Breakpoints
1. Open any `.js` file in `src/` (e.g., `src/stores/accountsStore.js`)
2. Click in the gutter (left of line numbers) to add a red dot breakpoint
3. Start debugging - code will pause when it hits the breakpoint

### Debug Panel Features
When paused at a breakpoint:
- **Variables** - See all local variables and their values
- **Watch** - Add expressions to watch (e.g., `this.accounts.length`)
- **Call Stack** - See the execution path that led to this point
- **Debug Console** - Type JavaScript to evaluate in the current context

### Keyboard Shortcuts
- `F5` - Start/Continue debugging
- `F10` - Step over (execute current line, move to next)
- `F11` - Step into (go inside function calls)
- `Shift+F11` - Step out (finish current function, return to caller)
- `Cmd+Shift+F5` - Restart debugger
- `Shift+F5` - Stop debugging

## Troubleshooting

### Backend Won't Start
```bash
# Check if port 3000 is already in use:
lsof -i :3000

# Kill the process:
lsof -i :3000 -t | xargs kill
```

### Caddy Won't Start
```bash
# Check if port 443 is already in use:
sudo lsof -i :443

# Stop existing Caddy:
caddy stop

# Validate Caddyfile:
caddy validate --config Caddyfile
```

### PostgreSQL Not Running
```bash
# Check status:
brew services list | grep postgresql

# Start it:
brew services start postgresql@14
```

### Responsive-Tiles Won't Start
```bash
# Check if port 8080 is already in use:
lsof -i :8080

# Kill the process:
lsof -i :8080 -t | xargs kill
```

### Certificate Errors in Chrome
If you see `ERR_CERT_AUTHORITY_INVALID`:
1. Open Caddy's root certificate:
   ```bash
   open "/Users/LenMiller/Library/Application Support/Caddy/pki/authorities/local/root.crt"
   ```
2. Double-click the certificate
3. In Keychain Access, find "Caddy Local Authority"
4. Double-click it → Trust section → Set to "Always Trust"
5. Restart Chrome

## Configuration Details

### Test User Credentials
- **User ID**: 583
- **Partner ID**: 319
- **Email**: Zena.Wilkinson41@hotmail.com
- **Password**: Password123!
- **JWT Secret**: a2dfd54f08990cac8132facb2d9c0fa5ae00d7c27b22ac0426caffc3a19d00438b1687e8fac3c3f59db2152586524d9dfe114faa6cf13847330766a3b46bb4fa

### Environment Variables (Already Configured in VS Code)
The debug configuration automatically sets:
```javascript
API_KEY: "a2dfd54f08990cac8132facb2d9c0fa5ae00d7c27b22ac0426caffc3a19d00438b1687e8fac3c3f59db2152586524d9dfe114faa6cf13847330766a3b46bb4fa"
PARTNER_DOMAIN: "pfm.backend.simulator.com"
PARTNER_ID: "319"
PCID: "583"
ENV: "staging"
PORT: "8080"
```

## Debugging Backend (PFM Backend Simulator)

### Quick Start (Recommended)

**Project**: `~/code/pfm-backend-simulator`

1. **In VS Code** (with pfm-backend-simulator open):
   - Press `Cmd+Shift+D` (Run & Debug panel)
   - Select **"Debug TypeScript App (nodemon)"** ⭐ RECOMMENDED
   - Press `F5`

2. **Set breakpoints** in any `.ts` file:
   - Controllers: `src/controllers/accountsController.ts`
   - Services: `src/services/accountService.ts`
   - Middleware: `src/middleware/auth.ts`

3. **Make API requests** to trigger breakpoints:
   - Use responsive-tiles (if also debugging frontend)
   - Use CLI tool: `npm run cli`
   - Use curl: `curl https://pfm.backend.simulator.com/api/v2/users/583/accounts/all -H "Authorization: Bearer ..."`

4. **Code pauses at breakpoints** - inspect variables, step through code

5. **Edit code** - nodemon auto-restarts debugger when you save files

### Available Backend Debug Configurations

1. **Debug TypeScript App (nodemon)** ⭐ RECOMMENDED
   - Auto-restarts when you save files
   - Best for active development

2. **Debug TypeScript App (ts-node)**
   - Simple debugging without auto-restart
   - Faster startup

3. **Debug Jest Tests**
   - Debug all tests in test suite

4. **Debug Current Jest Test**
   - Debug only the test file you have open

5. **Attach to Process**
   - Attach to already-running backend process
   - Requires backend started with `--inspect` flag

### Full Stack Debugging (Frontend + Backend)

**To debug both responsive-tiles AND backend simultaneously:**

1. **Terminal 1 - Start Caddy**:
   ```bash
   cd ~/code/pfm-backend-simulator
   caddy run --config Caddyfile
   ```

2. **VS Code Window 1 - Backend (pfm-backend-simulator)**:
   - Open pfm-backend-simulator project
   - Press `Cmd+Shift+D`
   - Select "Debug TypeScript App (nodemon)"
   - Press `F5`
   - Set breakpoints in `.ts` files

3. **VS Code Window 2 - Frontend (responsive-tiles)**:
   - Open responsive-tiles project
   - Press `Cmd+Shift+D`
   - Select "Full Stack Debug (PFM Backend Simulator)"
   - Press `F5`
   - Set breakpoints in `.js` files

4. **Use the app in Chrome** - both frontend and backend breakpoints will trigger!

**Example Flow:**
- User clicks button in responsive-tiles (frontend)
- Frontend breakpoint hits → inspect React state
- Continue (F5) → API request sent
- Backend breakpoint hits → inspect request, database queries
- Continue (F5) → response returns
- Frontend breakpoint hits again → inspect response handling

### Common Backend Debugging Scenarios

#### Debug API Endpoint
```typescript
// src/controllers/accountsController.ts
export const listAccounts = async (req: Request, res: Response) => {
  // Click here in gutter to set breakpoint ←
  const accounts = await getAccounts(req.context.userId, req.context.partnerId);
  res.json({ accounts: accounts.map(serializeAccount) });
};
```

#### Debug Service Logic
```typescript
// src/services/accountService.ts
export const getAccounts = async (userId: bigint, partnerId: bigint) => {
  // Breakpoint here to inspect Prisma query ←
  return await prisma.account.findMany({
    where: { userId, partnerId, deletedAt: null }
  });
};
```

#### Debug Authentication
```typescript
// src/middleware/auth.ts
export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const token = authHeader.split(' ')[1];
  // Breakpoint here to inspect JWT token ←
  jwt.verify(token, secret, (err, decoded) => {
    // Breakpoint here to see decoded payload ←
  });
};
```

## Additional Resources

- **Backend Debug Guide**: See `.vscode/DEBUG_GUIDE.md` in pfm-backend-simulator (comprehensive backend debugging guide)
- **Frontend Debug Guide**: See `.vscode/DEBUG_GUIDE.md` in responsive-tiles (frontend-specific debugging)
- **Backend API Documentation**: See `CLAUDE.md` in pfm-backend-simulator
- **Interactive CLI**: `npm run cli` in pfm-backend-simulator to explore API
- **Database Seeding**: `npm run seed` in pfm-backend-simulator to populate test data
