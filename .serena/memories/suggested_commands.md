# Suggested Commands - PFM Backend Simulator

## Development Workflow

### Start Development Server
```bash
npm run dev
# Starts nodemon with ts-node, auto-reloads on file changes
# Server runs at http://localhost:3000 (or PORT from .env)
```

### Build for Production
```bash
npm run build
# Compiles TypeScript to JavaScript in dist/ directory
```

### Run Production Build
```bash
npm start
# Runs compiled JavaScript from dist/index.js
# Requires: npm run build first
```

## Database Management

### Generate Prisma Client
```bash
npm run prisma:generate
# Generates Prisma Client from schema.prisma
# Run after schema changes
```

### Run Database Migrations
```bash
npm run prisma:migrate
# Creates and applies new migrations
# Interactive: prompts for migration name
```

### Open Prisma Studio
```bash
npm run prisma:studio
# Opens database GUI at http://localhost:5555
# Visual database browser and editor
```

### Seed Database with Test Data
```bash
npm run seed
# Generates realistic test data using Faker.js
# Creates users, accounts, transactions, budgets, etc.
```

### Migrate Data from MySQL
```bash
npm run migrate
# CLI tool for importing data from MySQL to PostgreSQL
# Interactive prompts for source database
```

## Testing

### Run All Tests
```bash
npm test
# Runs Jest test suite once
```

### Watch Mode
```bash
npm run test:watch
# Runs tests in watch mode
# Re-runs tests on file changes
```

### Test Coverage
```bash
npm run test:coverage
# Generates coverage report
# Shows coverage statistics and uncovered lines
```

## Code Quality

### Lint Code
```bash
npm run lint
# Runs ESLint on src/**/*.ts
# Reports code style and quality issues
```

### Format Code
```bash
npm run format
# Runs Prettier on TypeScript files
# Auto-formats code according to .prettierrc.json
```

## Utility Commands

### Check Application Health
```bash
curl http://localhost:3000/health
# Returns: {"status":"ok","timestamp":"..."}
```

### View Server Logs
Development logs are automatically pretty-printed by pino-pretty.
Production logs are JSON formatted for log aggregation.

### Access Migration UI
```bash
# Start server, then navigate to:
http://localhost:3000/migrate
# or
http://localhost:3000/migrate-ui
```

## Environment Setup

### Create .env File
```bash
cp .env.example .env
# Edit .env with your configuration:
# - DATABASE_URL (PostgreSQL connection)
# - JWT_SECRET (min 32 chars)
# - PORT (default: 3000)
# - CORS_ORIGINS (comma-separated)
```

### Install Dependencies
```bash
npm install
```

## Task Completion Checklist

After completing a task, always run:
```bash
# 1. Format code
npm run format

# 2. Lint code
npm run lint

# 3. Run tests
npm test

# 4. If schema changed, generate Prisma client
npm run prisma:generate
```

## macOS-Specific Notes

The system is running on Darwin (macOS). Standard Unix commands work:
- `ls`, `cd`, `grep`, `find`, `cat`, `tail`, `head`
- `git` for version control
- `curl` or `httpie` for API testing

PostgreSQL can be installed via Homebrew:
```bash
brew install postgresql@16
brew services start postgresql@16
```
