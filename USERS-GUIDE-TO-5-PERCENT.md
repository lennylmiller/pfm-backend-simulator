# User's Guide to Completing the Final 5%

**Quick Start Guide for PFM Backend Simulator Completion**

---

## 📋 What Is This?

This guide helps you complete the final 5% of the PFM Backend Simulator using SuperClaude commands. You have three detailed specification documents and a comprehensive workflow - this guide makes it simple to execute.

**Current Status**: ~95% complete, 119/202 tests passing
**Goal**: 100% production-ready with all features implemented

---

## 🚦 Before You Start

### Check Your Status

```bash
# Where are you now?
npm test                    # See test status
git status                  # Check git state
git branch                  # Current branch
```

### Prerequisites

- Node.js 20+ installed ✅
- PostgreSQL running ✅
- Project dependencies installed ✅
- Git repository initialized ✅

**Need to install**: Redis (we'll do this together in Step 1)

---

## 🎯 Three Ways to Execute

Choose the approach that fits your situation:

### Path A: "Just Fix It Fast" (Recommended for Solo Developers)

**Timeline**: 2-3 weeks solo work
**Best for**: Getting to production quickly

Execute large chunks with single commands, let SuperClaude handle the details.

### Path B: "Step-by-Step Learning" (Recommended for Teams)

**Timeline**: 4-5 weeks with 4-5 developers
**Best for**: Understanding each component, team collaboration

Implement components one at a time with full control.

### Path C: "I'll Do It Manually"

**Timeline**: 6-8 weeks
**Best for**: Maximum control, learning the codebase deeply

Use the specs as reference, implement everything yourself.

**This guide focuses on Paths A and B** (using SuperClaude commands).

---

## 🚀 The Fast Path (Path A)

### Step 1: Fix Tests & Setup (Sprint 0)

**Time**: 1 day
**Goal**: All tests passing, Redis ready

```bash
# Fix all failing tests automatically
/sc:troubleshoot "test suite failures" \
  --focus isolation \
  --spec specs/ARCHITECTURE_SPEC_FINAL_5_PERCENT.md \
  --task-manage \
  --with-tests

# While that runs, install Redis in another terminal
# macOS:
brew install redis
brew services start redis

# Linux:
sudo apt-get install redis-server
sudo systemctl start redis

# Docker (all platforms):
docker run -d -p 6379:6379 --name pfm-redis redis:7-alpine

# Verify Redis is running
redis-cli ping    # Should return "PONG"

# Install Phase 2 dependencies
npm install redis express-rate-limit rate-limit-redis --save
```

**Validate Step 1**:
```bash
npm test          # Should show 202/202 passing
redis-cli ping    # Should return "PONG"
```

### Step 2: Build Infrastructure (Sprints 1-2)

**Time**: 3-4 days
**Goal**: Rate limiting, pagination, all controllers updated

```bash
# Execute entire Phase 2 in one command
/sc:workflow "Phase 2: Infrastructure Implementation" \
  --spec specs/ARCHITECTURE_SPEC_FINAL_5_PERCENT.md \
  --spec specs/COMPONENT_SPEC_FINAL_5_PERCENT.md \
  --spec specs/API_SPEC_FINAL_5_PERCENT.md \
  --phase 2 \
  --task-manage \
  --all-mcp \
  --safe \
  --with-tests
```

This single command will:
- ✅ Create Redis configuration (`src/config/redis.ts`)
- ✅ Implement rate limiting middleware (1000/hour partner, 100/15min user)
- ✅ Implement pagination middleware + helpers
- ✅ Update middleware chain in `src/index.ts`
- ✅ Update all 10 controllers for pagination
- ✅ Write comprehensive tests
- ✅ Generate documentation

**Validate Step 2**:
```bash
npm test                                    # All tests still passing
npm run test:coverage                       # >80% coverage
curl -I http://localhost:3000/api/v2/users/1/accounts?page=1&per_page=10
# Look for RateLimit-* headers and pagination meta in response
```

### Step 3: Add Security (Sprint 3) - Optional

**Time**: 1-2 days
**Goal**: JWT blacklist and logout endpoint

```bash
# Execute Phase 3A: JWT Blacklist
/sc:implement "JWT blacklist system with logout endpoint" \
  --spec specs/COMPONENT_SPEC_FINAL_5_PERCENT.md \
  --spec specs/API_SPEC_FINAL_5_PERCENT.md \
  --task-manage \
  --safe \
  --with-tests
```

This will:
- ✅ Create JWTBlacklistService (`src/services/jwtBlacklistService.ts`)
- ✅ Update auth middleware to check blacklist
- ✅ Add `POST /users/:userId/logout` endpoint
- ✅ Write security tests

**Validate Step 3**:
```bash
npm test
/sc:test "JWT blacklist security scenarios" --integration
```

### Step 4: Build Ads System (Sprint 4) - Optional

**Time**: 2-3 days
**Goal**: Complete ads platform

```bash
# Execute Phase 3B: Ads System
/sc:workflow "Phase 3: Ads System Implementation" \
  --spec specs/DATABASE_SPEC_FINAL_5_PERCENT.md \
  --spec specs/COMPONENT_SPEC_FINAL_5_PERCENT.md \
  --spec specs/API_SPEC_FINAL_5_PERCENT.md \
  --phase 3 \
  --task-manage \
  --all-mcp \
  --safe \
  --with-tests
```

This will:
- ✅ Create database migration for ads table
- ✅ Implement AdService with targeting logic
- ✅ Implement AdsController (user + admin endpoints)
- ✅ Create serializer and routes
- ✅ Generate seed data
- ✅ Write comprehensive tests

**Validate Step 4**:
```bash
npm test
npx prisma migrate status    # Verify migration applied
npm run seed                  # Generate test ads
```

### Step 5: Production Prep (Sprint 5)

**Time**: 1 day
**Goal**: Documentation, final validation

```bash
# Generate comprehensive documentation
/sc:document "Complete API" \
  --type api \
  --format openapi \
  --output docs/openapi.yaml

/sc:document "production deployment guide" \
  --type deployment \
  --format markdown \
  --output docs/DEPLOYMENT.md

# Final validation
npm test                      # 100% passing
npm run lint                  # No errors
npm run build                 # Successful build
npm audit                     # No critical vulnerabilities
```

**Done!** 🎉 You're production-ready.

---

## 📚 The Step-by-Step Path (Path B)

For those who want more control and understanding.

### Phase 1: Foundation (Sprint 0)

**Tasks**: Fix tests, setup infrastructure

#### Task 1.1: Analyze Test Failures

```bash
# Run tests and save output
npm test 2>&1 | tee test-failures.log

# Analyze failures
/sc:analyze test-failures.log --focus "test isolation and cleanup"
```

#### Task 1.2: Fix Tests Systematically

```bash
# Option 1: Let SuperClaude fix all
/sc:troubleshoot "test suite failures" \
  --focus isolation \
  --task-manage \
  --with-tests

# Option 2: Fix specific test categories
/sc:fix "database cleanup in tests" --spec specs/ARCHITECTURE_SPEC_FINAL_5_PERCENT.md
/sc:fix "test isolation issues" --spec specs/ARCHITECTURE_SPEC_FINAL_5_PERCENT.md
/sc:fix "API response format tests" --spec specs/ARCHITECTURE_SPEC_FINAL_5_PERCENT.md
```

#### Task 1.3: Setup Redis

```bash
# Install (choose your platform)
brew install redis              # macOS
sudo apt install redis-server   # Ubuntu/Debian
docker run -d -p 6379:6379 --name pfm-redis redis:7-alpine  # Docker

# Start
brew services start redis       # macOS
sudo systemctl start redis      # Linux
# Docker already started

# Configure environment
echo "REDIS_URL=redis://localhost:6379" >> .env

# Test connection
redis-cli ping  # Should return "PONG"
```

#### Task 1.4: Install Dependencies

```bash
npm install redis express-rate-limit rate-limit-redis --save
npm test  # Verify no conflicts
```

**✅ Sprint 0 Complete** when:
- `npm test` shows 202/202 passing
- `redis-cli ping` returns "PONG"
- New dependencies installed

---

### Phase 2: Infrastructure (Sprints 1-2)

**Tasks**: Rate limiting, pagination, controller updates

#### Sprint 1: Core Middleware (Days 1-5)

**Task 1.1**: Implement Redis Configuration

```bash
/sc:implement "Redis connection manager with retry logic and graceful degradation" \
  --file src/config/redis.ts \
  --spec specs/COMPONENT_SPEC_FINAL_5_PERCENT.md \
  --safe \
  --with-tests
```

**Task 1.2**: Implement Rate Limiting Middleware

```bash
/sc:implement "Express rate limiting middleware with partner and user tiers" \
  --file src/middleware/rateLimit.ts \
  --spec specs/COMPONENT_SPEC_FINAL_5_PERCENT.md \
  --spec specs/ARCHITECTURE_SPEC_FINAL_5_PERCENT.md \
  --safe \
  --with-tests \
  --c7
```

**Task 1.3**: Implement Pagination Middleware

```bash
/sc:implement "Pagination middleware with query parameter parsing and validation" \
  --file src/middleware/pagination.ts \
  --spec specs/COMPONENT_SPEC_FINAL_5_PERCENT.md \
  --safe \
  --with-tests
```

**Task 1.4**: Implement Pagination Helper

```bash
/sc:implement "Pagination response formatter with meta object generation" \
  --file src/utils/paginationHelper.ts \
  --spec specs/COMPONENT_SPEC_FINAL_5_PERCENT.md \
  --safe \
  --with-tests
```

**Task 1.5**: Update Middleware Chain

```bash
/sc:implement "Update Express middleware chain to include rate limiting and pagination" \
  --file src/index.ts \
  --spec specs/ARCHITECTURE_SPEC_FINAL_5_PERCENT.md \
  --safe
```

**Validate Sprint 1**:
```bash
npm test
npm run test:coverage  # Check >80%
```

#### Sprint 2: Controller Updates (Days 6-10)

You can do these **in parallel** if you have multiple developers, or **sequentially** if solo.

**Task 2.1**: Update Financial Controllers (3 controllers)

```bash
/sc:implement "Add pagination support to transactions, accounts, and budgets endpoints" \
  --files "src/controllers/transactionsController.ts,src/controllers/accountsController.ts,src/controllers/budgetsController.ts" \
  --spec specs/COMPONENT_SPEC_FINAL_5_PERCENT.md \
  --spec specs/API_SPEC_FINAL_5_PERCENT.md \
  --safe \
  --with-tests
```

**Task 2.2**: Update Goals & Tags Controllers (3 controllers)

```bash
/sc:implement "Add pagination support to goals, payoff goals, and tags endpoints" \
  --files "src/controllers/goalsController.ts,src/controllers/tagsController.ts" \
  --spec specs/COMPONENT_SPEC_FINAL_5_PERCENT.md \
  --spec specs/API_SPEC_FINAL_5_PERCENT.md \
  --safe \
  --with-tests
```

**Task 2.3**: Update Alerts & Notifications Controllers (2 controllers)

```bash
/sc:implement "Add pagination support to alerts and notifications endpoints" \
  --file src/controllers/alertsController.ts \
  --spec specs/COMPONENT_SPEC_FINAL_5_PERCENT.md \
  --spec specs/API_SPEC_FINAL_5_PERCENT.md \
  --safe \
  --with-tests
```

**Task 2.4**: Update Cashflow Controllers (2 controllers)

```bash
/sc:implement "Add pagination support to cashflow bills and incomes endpoints" \
  --file src/controllers/cashflowController.ts \
  --spec specs/COMPONENT_SPEC_FINAL_5_PERCENT.md \
  --spec specs/API_SPEC_FINAL_5_PERCENT.md \
  --safe \
  --with-tests
```

**Validate Sprint 2**:
```bash
npm test
/sc:test "pagination responses" --integration

# Verify API compliance
/sc:analyze src/routes/ src/controllers/ \
  --focus api-compliance \
  --spec specs/API_SPEC_FINAL_5_PERCENT.md
```

**✅ Phase 2 Complete** when:
- All 10 controllers return pagination meta
- Rate limiting enforced (check RateLimit-* headers)
- All tests passing
- API compliance validated

---

### Phase 3: Optional Features (Sprints 3-4)

**Choose what you need**:
- JWT Blacklist + Logout (Sprint 3)
- Ads System (Sprint 4)
- Both
- Neither (skip to Production Prep)

#### Sprint 3: JWT Blacklist (Optional)

**Task 3.1**: Implement JWT Blacklist Service

```bash
/sc:implement "JWT token blacklist service with Redis storage and TTL management" \
  --file src/services/jwtBlacklistService.ts \
  --spec specs/COMPONENT_SPEC_FINAL_5_PERCENT.md \
  --safe \
  --with-tests
```

**Task 3.2**: Update Auth Middleware

```bash
/sc:implement "Add JWT blacklist validation to authenticateJWT middleware" \
  --file src/middleware/auth.ts \
  --spec specs/COMPONENT_SPEC_FINAL_5_PERCENT.md \
  --safe \
  --with-tests
```

**Task 3.3**: Implement Logout Endpoint

```bash
/sc:implement "POST /users/:userId/logout endpoint with token blacklisting" \
  --file src/routes/users.ts \
  --spec specs/API_SPEC_FINAL_5_PERCENT.md \
  --safe \
  --with-tests
```

**Validate Sprint 3**:
```bash
npm test
/sc:test "JWT blacklist security scenarios" --integration
```

#### Sprint 4: Ads System (Optional)

**Task 4.1**: Create Database Migration

```bash
/sc:implement "Prisma migration for ads table with indexes and constraints" \
  --type database \
  --spec specs/DATABASE_SPEC_FINAL_5_PERCENT.md \
  --safe

# Run migration
npx prisma migrate dev --name create_ads_table

# Update schema
/sc:implement "Add Ad model to Prisma schema with Partner relationship" \
  --file prisma/schema.prisma \
  --spec specs/DATABASE_SPEC_FINAL_5_PERCENT.md \
  --safe

# Generate client
npx prisma generate
```

**Task 4.2**: Implement Ad Service

```bash
/sc:implement "Ad service with targeting logic and CRUD operations" \
  --file src/services/adService.ts \
  --spec specs/COMPONENT_SPEC_FINAL_5_PERCENT.md \
  --spec specs/DATABASE_SPEC_FINAL_5_PERCENT.md \
  --safe \
  --with-tests
```

**Task 4.3**: Implement Ads Controller

```bash
/sc:implement "Ads REST API controller with user and admin endpoints" \
  --file src/controllers/adsController.ts \
  --spec specs/COMPONENT_SPEC_FINAL_5_PERCENT.md \
  --spec specs/API_SPEC_FINAL_5_PERCENT.md \
  --safe \
  --with-tests
```

**Task 4.4**: Add Serializer & Routes

```bash
# Serializer
/sc:implement "Add serializeAd function to serializers" \
  --file src/utils/serializers.ts \
  --spec specs/COMPONENT_SPEC_FINAL_5_PERCENT.md \
  --safe \
  --with-tests

# Routes
/sc:implement "Express routes for ads API endpoints" \
  --file src/routes/ads.ts \
  --spec specs/API_SPEC_FINAL_5_PERCENT.md \
  --safe

# Wire into app
/sc:implement "Register ads routes in Express application" \
  --file src/index.ts \
  --safe
```

**Task 4.5**: Create Seed Generator

```bash
/sc:implement "Ad data generator for seeding test data" \
  --file tools/seed/generators/adGenerator.ts \
  --spec specs/DATABASE_SPEC_FINAL_5_PERCENT.md \
  --safe

# Run seed
npm run seed
```

**Validate Sprint 4**:
```bash
npm test
npx prisma migrate status
/sc:test "ads API" --coverage --integration
```

---

### Phase 4: Production Prep (Sprint 5)

**Task 5.1**: Comprehensive Testing

```bash
# Run all tests
npm test

# Integration tests
/sc:test "complete user workflow with rate limiting and pagination" --e2e

# Performance tests
/sc:test "rate limiting under load (1000 req/min)" --performance
/sc:test "pagination with large datasets (10000+ records)" --performance

# Security audit
npm audit
/sc:analyze src/middleware/ src/services/ --focus security
```

**Task 5.2**: Generate Documentation

```bash
# API documentation
/sc:document "Complete API" \
  --type api \
  --format openapi \
  --output docs/openapi.yaml

# Architecture diagrams
/sc:design "complete system architecture" \
  --type architecture \
  --format diagram \
  --output docs/architecture-final.svg

# Deployment guide
/sc:document "production deployment guide" \
  --type deployment \
  --format markdown \
  --output docs/DEPLOYMENT.md

# Environment config template
/sc:document "environment variables for production" \
  --type config \
  --format env \
  --output .env.production.template
```

**Task 5.3**: Final Validation

```bash
# Pre-deployment checklist
npm test &&                    # All tests passing
npm run lint &&                # No linting errors
npm run build &&               # TypeScript compiles
npm audit &&                   # No critical vulnerabilities
npx prisma migrate status &&   # Migrations ready
npx prisma generate            # Client generated
```

**✅ Production Ready!** 🎉

---

## 🎯 Quick Decision Guide

### "Where Should I Start?"

**Answer these questions**:

1. **Are all your tests passing?**
   - ❌ No → Start with Sprint 0 (fix tests)
   - ✅ Yes → Move to question 2

2. **Is Redis installed and running?**
   - ❌ No → Install Redis (see Sprint 0)
   - ✅ Yes → Move to question 3

3. **Do you want to go fast or learn deeply?**
   - 🚀 Fast → Use Path A (orchestrated workflow commands)
   - 📚 Learn → Use Path B (step-by-step implementation)

4. **Do you need optional features?**
   - JWT Blacklist? → Yes/No
   - Ads System? → Yes/No
   - Both → Execute Phase 3 completely
   - Neither → Skip to Production Prep

### "What If Something Goes Wrong?"

**Common Issues**:

**Tests fail after implementation**:
```bash
# Analyze what broke
/sc:troubleshoot "test failures after [feature] implementation" \
  --focus regression \
  --with-tests
```

**Redis connection errors**:
```bash
# Check Redis is running
redis-cli ping

# If not running:
brew services start redis              # macOS
sudo systemctl start redis             # Linux
docker start pfm-redis                 # Docker
```

**TypeScript compilation errors**:
```bash
# Fix type errors
/sc:fix "TypeScript compilation errors" \
  --focus types

# Or check manually
npm run build
```

**Merge conflicts (team work)**:
```bash
# Let SuperClaude resolve
/sc:fix "merge conflicts in [file]" \
  --safe

# Or manually
git status
# Resolve conflicts, then:
git add .
git commit -m "Resolve merge conflicts"
```

**Tests are slow**:
```bash
# Run specific test suites
npm test -- tests/integration/accounts.test.ts

# Run tests in parallel
npm test -- --maxWorkers=4
```

---

## 📊 Progress Tracking

### Visual Checklist

Copy this to track your progress:

```markdown
## Sprint 0: Foundation
- [ ] All 202 tests passing
- [ ] Redis installed and running
- [ ] Phase 2 dependencies installed
- [ ] Environment configured

## Sprint 1: Core Infrastructure
- [ ] RedisClient implemented
- [ ] Rate limiting middleware (partner + user)
- [ ] Pagination middleware
- [ ] Pagination helper
- [ ] Middleware chain updated

## Sprint 2: Controller Updates
- [ ] Transactions, Accounts, Budgets paginated
- [ ] Goals, PayoffGoals, Tags paginated
- [ ] Alerts, Notifications paginated
- [ ] Cashflow (Bills, Incomes) paginated

## Sprint 3: Security (Optional)
- [ ] JWT blacklist service
- [ ] Auth middleware updated
- [ ] Logout endpoint

## Sprint 4: Ads System (Optional)
- [ ] Database migration
- [ ] Ad service
- [ ] Ads controller
- [ ] Serializer & routes
- [ ] Seed generator

## Sprint 5: Production Prep
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Security audit clean
- [ ] Performance validated
- [ ] Deployment guide ready
```

### Automated Progress

SuperClaude commands with `--task-manage` automatically create todos visible in Claude Code UI.

---

## 🔧 Command Quick Reference

### Most Common Commands

```bash
# Fix test failures
/sc:troubleshoot "test suite failures" --focus isolation --task-manage --with-tests

# Implement Phase 2 (all infrastructure)
/sc:workflow "Phase 2: Infrastructure Implementation" \
  --spec specs/ARCHITECTURE_SPEC_FINAL_5_PERCENT.md \
  --spec specs/COMPONENT_SPEC_FINAL_5_PERCENT.md \
  --spec specs/API_SPEC_FINAL_5_PERCENT.md \
  --phase 2 --task-manage --all-mcp --safe --with-tests

# Implement specific component
/sc:implement "[description]" \
  --file [path] \
  --spec [spec-file] \
  --safe \
  --with-tests

# Test specific feature
/sc:test "[feature]" --integration

# Analyze code quality
/sc:analyze [path] --focus [quality|security|performance]

# Generate documentation
/sc:document "[topic]" --type [api|deployment] --format [markdown|openapi]
```

### Validation Commands

```bash
# Run tests
npm test
npm run test:coverage

# Lint
npm run lint

# Build
npm run build

# Security
npm audit

# Database
npx prisma migrate status
npx prisma generate
npx prisma studio  # GUI for database

# Redis
redis-cli ping
redis-cli info

# Performance
npm test -- --testNamePattern="performance"
```

---

## 📚 Reference Documents

**Detailed Specifications** (in `/specs`):
- `ARCHITECTURE_SPEC_FINAL_5_PERCENT.md` - System architecture (157 pages)
- `COMPONENT_SPEC_FINAL_5_PERCENT.md` - Component interfaces (detailed contracts)
- `API_SPEC_FINAL_5_PERCENT.md` - API endpoints documentation
- `DATABASE_SPEC_FINAL_5_PERCENT.md` - Database schema changes

**Implementation Plans**:
- `SUPERCLAUDE_IMPLEMENTATION_PLAN.md` - Original high-level plan
- `AGILE_IMPLEMENTATION_WORKFLOW.md` - Comprehensive 99-page sprint guide

**Project Documentation**:
- `CLAUDE.md` - Project overview and architecture
- `README.md` - Setup and development instructions

---

## 💡 Pro Tips

### Tip 1: Use Parallel Development (Teams)

If you have 4-5 developers:

**Sprint 1**: Assign tracks
- Dev 1-2: Redis + RateLimitMiddleware
- Dev 3: Pagination
- Dev 4: Test infrastructure

**Sprint 2**: Assign controller groups
- Dev 1: Financial controllers
- Dev 2: Goals/Tags controllers
- Dev 3: Alerts/Notifications controllers
- Dev 4: Cashflow controllers

Each developer works on a feature branch, merges daily to `develop`.

### Tip 2: Use Git Wisely

```bash
# Create feature branches
git checkout -b sprint1/redis-config
git checkout -b sprint2/controllers-group1

# Commit frequently
git add .
git commit -m "Implement Redis configuration with retry logic"

# Merge to develop daily
git checkout develop
git merge sprint1/redis-config
npm test  # Always test after merge
```

### Tip 3: Test Early, Test Often

```bash
# After every major implementation
npm test

# Before committing
npm run lint && npm test

# Before merging
npm test && npm run build
```

### Tip 4: Use SuperClaude for Help

```bash
# Stuck? Ask for analysis
/sc:analyze [problematic-code] --focus [issue]

# Need explanation?
/sc:explain "[concept or code]"

# Need troubleshooting?
/sc:troubleshoot "[issue description]"
```

### Tip 5: Monitor Performance

```bash
# Benchmark before and after
/sc:test "middleware performance" --performance

# Check response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/v2/users/1/accounts
```

Create `curl-format.txt`:
```
time_total: %{time_total}s
time_connect: %{time_connect}s
time_starttransfer: %{time_starttransfer}s
```

---

## 🎯 Success Criteria

You're **done** when:

### Required (Phase 2)
- ✅ All 202+ tests passing
- ✅ Code coverage >80%
- ✅ Rate limiting enforced (1000/hour partner, 100/15min user)
- ✅ Pagination working on all 10 list endpoints
- ✅ All middleware integrated correctly
- ✅ ESLint passing
- ✅ TypeScript compiling without errors
- ✅ API responses match Geezeo v2 specification

### Optional (Phase 3)
- ✅ JWT blacklist functional (if implemented)
- ✅ Logout endpoint working (if implemented)
- ✅ Ads system operational (if implemented)
- ✅ Database migrations applied (if implemented)

### Production Ready (Phase 4)
- ✅ Security audit clean (no critical vulnerabilities)
- ✅ Performance benchmarks met (<200ms avg response)
- ✅ Documentation complete
- ✅ Deployment guide ready
- ✅ All quality gates passed

---

## 🚀 Let's Get Started!

**Ready to begin?**

1. **Right now**: Check your test status
   ```bash
   npm test
   ```

2. **Next**: Start Sprint 0 (fix tests + setup Redis)
   ```bash
   /sc:troubleshoot "test suite failures" --focus isolation --task-manage --with-tests
   ```

3. **Then**: Choose your path (A for fast, B for learning)

4. **Finally**: Celebrate when you're production-ready! 🎉

---

## 📞 Need Help?

- **Stuck on a command?** Check `AGILE_IMPLEMENTATION_WORKFLOW.md` Appendix A for full command reference
- **Need component details?** See specifications in `/specs` folder
- **Architecture questions?** See `ARCHITECTURE_SPEC_FINAL_5_PERCENT.md`
- **API questions?** See `API_SPEC_FINAL_5_PERCENT.md`

**General troubleshooting**:
```bash
/sc:troubleshoot "[describe your issue]" --focus [relevant-area]
```

---

**Good luck! You've got this!** 💪

Remember: You can always use SuperClaude commands to help when you get stuck. The specifications are comprehensive, and the workflow is well-planned. Just follow the steps, validate as you go, and you'll be production-ready before you know it.
