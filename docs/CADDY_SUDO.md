# Caddy Sudo Requirement

## Why Sudo is Needed

Port 443 (HTTPS) is a **privileged port** on macOS and Unix-like systems. Privileged ports (0-1023) require elevated permissions to bind, which is why Caddy needs `sudo` to listen on port 443.

## How It Works

The CLI Quick Start workflow handles sudo automatically:

1. **Step 6: Verify Sudo Access**
   - Runs `sudo -v` to pre-cache your credentials
   - You'll be prompted for your password **once**
   - Credentials are cached for ~5 minutes by the OS

2. **Step 7: Start Caddy**
   - Runs `sudo caddy run --config Caddyfile`
   - Uses cached credentials (no second prompt)
   - Caddy binds to port 443 successfully

## What to Expect

### Normal Workflow
```bash
npm run cli
# Select: Quick Start Workflow

🚀 Quick Start Workflow

This will automate the entire setup process:
  1. Clear existing seed data
  2. Regenerate new seed data
  3. Select user and partner
  4. Generate JWT shared secret
  5. Update backend .env with JWT_SECRET
  6. Verify sudo access (for port 443)
  7. Start Caddy reverse proxy (HTTPS)
  8. Start backend server
  9. Check/install responsive-tiles dependencies
 10. Start responsive-tiles frontend

? This will clear all existing data. Continue? Yes

[... steps 1-5 complete ...]

📋 Step 6: Verifying sudo access

🔐 Verifying sudo access for privileged port 443...

Please enter your password when prompted:

Password: [you enter your password here]

✅ Sudo access verified

📋 Step 7: Starting Caddy reverse proxy

🔒 Starting Caddy reverse proxy...

⚠️  Caddy requires sudo to bind to port 443 (privileged port)
   If prompted, please enter your password.

  Caddyfile: /Users/you/code/pfm-backend-simulator/Caddyfile
  Proxying: https://pfm.backend.simulator.com:443 → http://localhost:3000

[Caddy output appears here - no second password prompt]

✅ Caddy reverse proxy started successfully
```

### Password Prompt Details

**You'll see ONE password prompt** at Step 6:
- This is the standard macOS/sudo password prompt
- Your password is handled by the operating system, not the CLI
- Credentials are cached for subsequent sudo commands
- No passwords are stored in config files or code

## Security Notes

### What Happens with Your Password
1. **OS Handles Password**: macOS/sudo manages your password, not the CLI
2. **Credential Caching**: System caches for ~5 minutes (configurable in `/etc/sudoers`)
3. **No Storage**: Password is never written to disk or stored in memory by the CLI
4. **Standard Practice**: This is identical to running `sudo` in your terminal

### Sudo Command Executed
```bash
# Pre-cache credentials
sudo -v

# Start Caddy
sudo caddy run --config /path/to/Caddyfile

# Stop Caddy (when workflow ends)
sudo pkill -f "caddy run"
```

### Risk Assessment
- **Low Risk**: Only grants temporary elevated access for Caddy
- **Limited Scope**: Sudo is only used for Caddy operations
- **Transparent**: All sudo commands are visible in the workflow output
- **Revocable**: Sudo cache expires after ~5 minutes of inactivity

## Optional: Passwordless Sudo (Advanced)

**⚠️ Only configure this if your company allows sudoers modifications**

If you want to eliminate the password prompt entirely, you can configure passwordless sudo for Caddy only:

### One-Time Setup
```bash
# Edit sudoers file safely
sudo visudo

# Add this line at the end (replace 'yourusername'):
yourusername ALL=(ALL) NOPASSWD: /opt/homebrew/bin/caddy

# Save and exit (Ctrl+X, Y, Enter in nano)
```

### Verify Configuration
```bash
# This should work without password prompt
sudo caddy version
```

**Benefits**:
- ✅ No password prompts ever
- ✅ Only affects `caddy` command
- ✅ More secure than broad sudo access

**Important**: Check with your IT department before modifying sudoers if you're on a company-managed machine.

## Troubleshooting

### "Sudo: a password is required"
**Cause**: Sudo cache has expired or was never established

**Solution**:
- Run the workflow again
- Your password will be requested at Step 6
- Credentials will be cached for subsequent steps

### "Sudo: command not found"
**Cause**: You're not in the sudoers file

**Solution**:
- Contact your system administrator
- You need sudo access to run privileged services

### "Permission denied" on Port 443
**Cause**: Caddy started without sudo

**Solution**:
- Ensure you entered your password at the sudo prompt
- Check that Caddy process is running: `ps aux | grep caddy`
- Look for errors in: `/Users/LenMiller/code/pfm-backend-simulator/logs/caddy.log`

### Password Prompt Doesn't Appear
**Cause**: Running in a non-interactive environment

**Solution**:
- Run `npm run cli` from an interactive terminal
- Don't run in background or via automation tools

## Alternatives to Sudo

If you cannot or don't want to use sudo, consider these alternatives:

### Option 1: Use Non-Privileged Port (8443)
- Modify Caddyfile to listen on port 8443 instead of 443
- Update responsive-tiles to expect `https://pfm.backend.simulator.com:8443`
- **Cons**: Requires modifying responsive-tiles (breaks drop-in replacement goal)

### Option 2: Use Different Reverse Proxy
- Use nginx or Apache that might already have privileged access
- Configure manually to proxy to port 3000
- **Cons**: More complex setup, not automated by CLI

### Option 3: Run Backend on Non-HTTPS
- Skip Caddy entirely
- Modify responsive-tiles to use `http://localhost:3000`
- **Cons**: Requires modifying responsive-tiles, doesn't match staging

**Recommendation**: Use sudo approach - it's the cleanest solution that maintains the "drop-in replacement" goal.

## Company Policy Compliance

This implementation respects company sudo policies:
- ✅ Uses standard sudo authentication
- ✅ No sudoers modifications required
- ✅ Password handled by OS security
- ✅ Transparent command execution
- ✅ Limited scope (only Caddy operations)
- ✅ Auditable (all commands logged)

If your company has specific sudo policies, consult with your IT department before using this feature.
