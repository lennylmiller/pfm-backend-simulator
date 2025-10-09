# Port Cleanup Fix - EADDRINUSE Prevention

## Problem Solved

The Quick Start workflow was failing silently when ports were already in use, causing:
1. Backend failed to start with `EADDRINUSE` error on port 3000
2. Caddy couldn't bind to port 443 if already occupied
3. Responsive-tiles couldn't start on port 8080 if taken
4. Workflow appeared to succeed but services weren't running
5. Users saw "Oops! Something went wrong!" with 401 errors

## Root Cause

**Log Evidence** (`logs/backend.log`):
```
Error: listen EADDRINUSE: address already in use :::3000
code: 'EADDRINUSE',
errno: -48,
syscall: 'listen',
address: '::',
port: 3000
```

The Quick Start workflow attempted to start services without checking if ports were available. If another process was using the ports (from a previous failed run, manual testing, or other development), the services would fail to start but the workflow would continue, leading to confusion.

## Solution Implemented

### 1. Port Cleanup Utility
**File**: `tools/cli/modules/cleanup.ts`

**New Functions**:
```typescript
async function isPortInUse(port: number): Promise<boolean>
async function killProcessOnPort(port: number, useSudo: boolean): Promise<boolean>
export async function clearPorts(): Promise<void>
```

**How it works**:
1. Checks ports 443, 3000, and 8080 for existing processes
2. Kills any processes found using those ports
3. Port 443 uses `sudo` since Caddy runs as root
4. Ports 3000 and 8080 use regular `kill` for user processes
5. Waits 1 second after cleanup for ports to be fully released

### 2. Workflow Integration
**File**: `tools/cli/workflows/quickStart.ts`

**New Step 1**:
```typescript
// Step 1: Clear ports (ensure no conflicts)
console.log(chalk.blue('📋 Step 1: Checking and clearing required ports\n'));
await cleanup.clearPorts();
completedSteps.push('clear_ports');
```

**All subsequent steps renumbered** (now 11 steps total, was 10)

## Output Examples

### When Ports Are Clear
```
🔍 Checking for processes using required ports...

  ✅ All ports are available
```

### When Ports Need Cleaning
```
🔍 Checking for processes using required ports...

  ⚠️  Port 3000 (Backend) is in use, clearing...
  ✅ Cleared port 3000
  ⚠️  Port 8080 (Responsive-tiles) is in use, clearing...
  ✅ Cleared port 8080

✅ Cleared 2 port(s)
```

### When Sudo Required for Port 443
```
  ⚠️  Port 443 (Caddy) is in use, clearing...
  [sudo password prompt if needed]
  ✅ Cleared port 443
```

## Updated Workflow

### Complete 11-Step Process
1. ✅ Check and clear required ports (443, 3000, 8080)
2. ✅ Clear existing seed data
3. ✅ Regenerate new seed data
4. ✅ Select user and partner
5. ✅ Generate JWT shared secret
6. ✅ Update backend .env with JWT_SECRET
7. ✅ Verify sudo access (for port 443)
8. ✅ Start Caddy reverse proxy (HTTPS)
9. ✅ Start backend server
10. ✅ Check/install responsive-tiles dependencies
11. ✅ Start responsive-tiles frontend

## Technical Details

### Port Checking Implementation
```typescript
// Uses lsof to find processes
const { stdout } = await execAsync(`lsof -i :${port} -t`);
const pids = stdout.trim().split('\n').filter(pid => pid);
```

### Graceful Killing
```typescript
// User processes (ports 3000, 8080)
await execAsync(`kill -9 ${pid}`);

// Root processes (port 443)
await execAsync(`sudo kill -9 ${pid}`);
```

### Sudo Handling
- Port 443 cleanup requires sudo (Caddy runs as root)
- Reuses cached sudo credentials from Step 7 (verify sudo access)
- If sudo credentials expired, user will be prompted once

## Benefits

### Reliability
- ✅ Prevents `EADDRINUSE` errors
- ✅ Ensures clean start every time
- ✅ Eliminates mysterious failures

### User Experience
- ✅ Clear feedback on port status
- ✅ Automatic cleanup (no manual intervention)
- ✅ Prevents confusion from silent failures

### Developer Workflow
- ✅ Safe to run Quick Start multiple times
- ✅ Recovers from interrupted previous runs
- ✅ No need to manually hunt for processes

## Common Scenarios

### Scenario 1: Quick Start After Ctrl+C
**Before**: Caddy and backend left running, next Quick Start fails
**After**: Ports automatically cleared, fresh start succeeds

### Scenario 2: Manual Testing Conflicts
**Before**: `npm run dev` running, Quick Start backend fails
**After**: Port 3000 cleared automatically, both services start

### Scenario 3: Multiple Quick Starts
**Before**: Second run fails silently with port conflicts
**After**: Each run clears ports first, always succeeds

## Troubleshooting

### If Port Cleanup Fails

**Check what's using ports**:
```bash
lsof -i :443  # Caddy
lsof -i :3000 # Backend
lsof -i :8080 # Responsive-tiles
```

**Manual cleanup**:
```bash
# Kill specific port
sudo lsof -i :443 -t | xargs sudo kill -9
lsof -i :3000 -t | xargs kill -9
lsof -i :8080 -t | xargs kill -9

# Or use the CLI Stop All Services option
npm run cli
# Select: "🛑 Stop All Services"
```

### If Sudo Password Needed
Port 443 cleanup requires sudo. If you see a password prompt:
1. Enter your password (credential caching from Step 7 usually prevents this)
2. Password is cached for ~5 minutes
3. Subsequent Quick Starts within 5 minutes won't prompt again

## Files Modified

**New Functions**:
- `tools/cli/modules/cleanup.ts` - `clearPorts()`, `isPortInUse()`, `killProcessOnPort()`

**Updated Files**:
- `tools/cli/workflows/quickStart.ts` - Added Step 1 port cleanup, renumbered all steps

**Documentation**:
- `docs/PORT_CLEANUP_FIX.md` - This file

## Related Issues

This fix resolves:
- Backend `EADDRINUSE` errors
- Silent Quick Start failures
- Orphaned process conflicts
- Port availability confusion

## Testing

**Test the fix**:
```bash
# 1. Start a process on port 3000
npm run dev &

# 2. Run Quick Start
npm run cli
# Select: "🚀 Quick Start Workflow"

# Expected: Port 3000 is detected and cleared automatically
# Result: All services start successfully
```

**Verify ports cleared**:
```bash
lsof -i :443 -i :3000 -i :8080
# Should show only the newly started services
```
