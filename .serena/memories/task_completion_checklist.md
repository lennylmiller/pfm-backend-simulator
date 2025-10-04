# Task Completion Checklist - PFM Backend Simulator

## Before Marking a Task as Complete

Follow this checklist to ensure quality and consistency:

### 1. Code Formatting ✅
```bash
npm run format
```
- Runs Prettier on all TypeScript files
- Ensures consistent code style (single quotes, semicolons, etc.)
- **Required**: Must pass without errors

### 2. Linting ✅
```bash
npm run lint
```
- Runs ESLint to catch code quality issues
- Checks TypeScript best practices
- Identifies unused variables, incorrect types
- **Required**: Must pass with 0 errors (warnings acceptable)

### 3. Type Checking ✅
```bash
npm run build
```
- Compiles TypeScript to verify no type errors
- Generates declaration files
- **Required**: Must compile successfully
- **Note**: Build output in `dist/` can be cleaned up after verification

### 4. Testing ✅
```bash
npm test
```
- Runs Jest test suite
- Ensures no regressions
- **Required**: All tests must pass
- **Optional**: Run `npm run test:coverage` for coverage report

### 5. Database Schema Changes (If Applicable) ✅

If you modified `prisma/schema.prisma`:

```bash
# Generate Prisma Client
npm run prisma:generate

# Create and apply migration
npm run prisma:migrate
# Follow prompts to name migration descriptively
```

**Required for**:
- New models or fields
- Changed field types
- Index additions
- Relation modifications

### 6. Manual Testing (If Applicable) ✅

For API changes:

```bash
# Start development server
npm run dev

# In another terminal, test endpoint
curl http://localhost:3000/api/v2/<your-endpoint>

# Or use Prisma Studio to verify database changes
npm run prisma:studio
```

### 7. Documentation Updates (If Applicable) ✅

Update documentation if:
- New API endpoints added → Update route comments
- New environment variables → Update `.env.example`
- New npm scripts → Update this file
- New features → Add JSDoc comments

### 8. Git Best Practices ✅

```bash
# Check what changed
git status
git diff

# Stage changes
git add <files>

# Commit with descriptive message
git commit -m "feat: add user profile endpoint"
# or
git commit -m "fix: resolve JWT expiration bug"
# or
git commit -m "refactor: extract auth middleware"
```

**Commit Message Format**:
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code restructuring
- `docs:` - Documentation changes
- `test:` - Test additions/changes
- `chore:` - Maintenance tasks

## Quick Checklist

Copy-paste this for quick verification:

```bash
# Format, lint, and test
npm run format && npm run lint && npm test

# If schema changed
npm run prisma:generate

# Build to verify types
npm run build

# Manual test if needed
npm run dev
# Test your changes...
```

## When to Skip Steps

### Skip Build
- Documentation-only changes
- Test-only changes
- Minor comment updates

### Skip Tests
- Never skip tests if code logic changed
- Only skip for:
  - Pure documentation changes
  - Formatting fixes
  - Comment-only updates

### Skip Prisma Generate
- Only if `prisma/schema.prisma` unchanged
- Required for any model/field changes

## Troubleshooting

### Lint Errors
```bash
# Auto-fix most issues
npm run lint -- --fix

# Then format
npm run format
```

### Type Errors
- Check TypeScript compiler output carefully
- Ensure all imports are correct
- Verify type definitions exist for dependencies

### Test Failures
- Run specific test: `npm test -- <test-file-name>`
- Use `--verbose` flag for detailed output
- Check test database setup (if integration tests)

### Build Fails
- Clear `dist/` directory: `rm -rf dist`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check `tsconfig.json` for misconfigurations

## Final Reminder

**Always run** before considering a task complete:
```bash
npm run format && npm run lint && npm test
```

This ensures:
- ✅ Code is properly formatted
- ✅ No linting issues
- ✅ All tests pass
- ✅ Ready for code review or deployment
