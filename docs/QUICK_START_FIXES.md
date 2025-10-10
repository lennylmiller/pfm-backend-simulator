# Quick Start Workflow Fixes

## Issues Fixed

### 1. Missing Dependencies Error ✅
**Error**: `webpack-dev-server: command not found`

**Cause**: Responsive-tiles `node_modules` directory didn't exist.

**Fix**: Added automatic dependency check and installation step to the Quick Start workflow:
- Checks if `node_modules` exists in responsive-tiles
- If missing, runs `npm install` automatically
- Shows installation progress to user
- Fails gracefully if installation fails

**Implementation**:
- `tools/cli/modules/responsiveTilesManager.ts`:
  - Added `checkDependenciesInstalled()` function
  - Added `installDependencies()` function
- `tools/cli/workflows/quickStart.ts`:
  - Added Step 8: Check/install responsive-tiles dependencies
  - Updated workflow description to show 8 steps instead of 7

### 2. Process Management Bug ✅
**Error**: `Cannot read properties of null (reading 'pid')`

**Cause**: When responsive-tiles process exited with an error, the exit handler set `responsiveTilesProcess = null`, but the code continued executing and tried to access `responsiveTilesProcess.pid`.

**Fix**: Added null check after the wait period:
```typescript
// Wait for webpack to compile
await new Promise(resolve => setTimeout(resolve, 5000));

// Check if process is still running after wait
if (!responsiveTilesProcess || responsiveTilesProcess.killed) {
  console.log(chalk.red('\n❌ Responsive-tiles failed to start\n'));
  return null;
}
```

**Implementation**:
- `tools/cli/modules/responsiveTilesManager.ts` lines 95-99

### 3. Backend Health Check Timeout ✅
**Warning**: `Backend started but health check failed`

**Cause**: Backend took longer than 2 seconds to start, causing health check to timeout.

**Fix**: Increased health check timeout from 2 seconds to 4 seconds:
```typescript
// Wait for server to start (increased from 2s to 4s for better reliability)
await new Promise(resolve => setTimeout(resolve, 4000));
```

**Implementation**:
- `tools/cli/modules/backendManager.ts` line 79-80

## Testing

### Before Fixes
```
❌ Responsive-tiles exited with code 127
❌ Error starting responsive-tiles: Cannot read properties of null (reading 'pid')
⚠️  Backend started but health check failed
```

### After Fixes
```
✅ Dependencies already installed (or installs automatically if missing)
✅ Backend started successfully on port 3000
✅ Responsive-tiles started on http://localhost:8080
✅ Quick Start Complete!
```

## Updated Workflow Steps

1. Clear existing seed data
2. Regenerate new seed data
3. Select user and partner
4. Generate JWT shared secret
5. Update backend .env with JWT_SECRET
6. Start Caddy reverse proxy (HTTPS)
7. Start backend server
8. **Check/install responsive-tiles dependencies** ← NEW
9. Start responsive-tiles frontend

## Files Modified

- `tools/cli/modules/responsiveTilesManager.ts`
  - Added dependency check and installation functions
  - Added null check before returning ProcessInfo
  - Added fs and path imports

- `tools/cli/modules/backendManager.ts`
  - Increased health check timeout from 2s to 4s

- `tools/cli/workflows/quickStart.ts`
  - Added dependency check step
  - Updated workflow description
  - Updated step numbering

## How to Test

1. **Clean test** (no node_modules):
   ```bash
   rm -rf /Users/LenMiller/code/banno/responsive-tiles/node_modules
   npm run cli
   # Select: Quick Start Workflow
   # Should install dependencies automatically
   ```

2. **Normal test** (with node_modules):
   ```bash
   npm run cli
   # Select: Quick Start Workflow
   # Should skip dependency installation
   ```

3. **Verify services**:
   - Backend: http://localhost:3000/health
   - Caddy: https://pfm.backend.simulator.com/health
   - Frontend: http://localhost:8080

## Expected Behavior

### First Run (No Dependencies)
```
📋 Step 8: Checking responsive-tiles dependencies

⚠️  Dependencies not found, installing...

📦 Installing responsive-tiles dependencies...

  This may take a few minutes...

[npm install output...]

✅ Dependencies installed successfully

📋 Step 9: Starting responsive-tiles

[continues normally...]
```

### Subsequent Runs (With Dependencies)
```
📋 Step 8: Checking responsive-tiles dependencies

✅ Dependencies already installed

📋 Step 9: Starting responsive-tiles

[continues normally...]
```

## Benefits

1. **User-Friendly**: Automatically handles missing dependencies
2. **Robust**: Proper error handling and null checks
3. **Informative**: Clear status messages for each step
4. **Reliable**: Increased backend startup timeout prevents false failures
5. **Graceful**: Fails early and clearly when dependencies can't be installed
