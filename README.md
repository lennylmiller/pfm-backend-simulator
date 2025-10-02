# PFM Backend Simulator

Lightweight Node.js/Express backend that simulates the Geezeo PFM API (`/api/v2`) for responsive-tiles development and testing.

## Overview

This project provides a minimal, standalone backend implementing 135+ API endpoints required by the responsive-tiles frontend. It uses PostgreSQL with Prisma ORM and includes tools for data migration and test data generation.

## Features

- ✅ All 135+ `/api/v2` endpoints for responsive-tiles
- ✅ PostgreSQL database with optimized schema
- ✅ JWT authentication
- ✅ Migration tool (MySQL → PostgreSQL)
- ✅ Test data generator (Faker.js)
- ✅ Docker Compose for local development
- ✅ TypeScript with full type safety
- ✅ Integration testing with Jest/Supertest

## Prerequisites

- Node.js 20+ (LTS)
- PostgreSQL 14+
- Docker & Docker Compose (optional, for containerized setup)

## Quick Start

### 1. Installation

```bash
# Clone/navigate to project
cd pfm-backend-simulator

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
```

### 2. Database Setup

#### Option A: Docker Compose (Recommended)

```bash
# Start PostgreSQL
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
docker-compose ps
```

#### Option B: Local PostgreSQL

```bash
# Ensure PostgreSQL is running
# Update DATABASE_URL in .env
```

### 3. Initialize Database

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed with test data
npm run seed -- generate --scenario realistic
```

### 4. Start Server

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start
```

API will be available at: `http://localhost:3000/api/v2`

## Configuration

### Environment Variables

Create `.env` file (see `.env.example`):

```env
# Database
DATABASE_URL="postgresql://pfm_user:pfm_password@localhost:5432/pfm_simulator"

# JWT Secret (change in production!)
JWT_SECRET="your-secret-key-minimum-32-chars"

# Server
NODE_ENV="development"
PORT=3000
LOG_LEVEL="debug"

# CORS
ENABLE_CORS=true
CORS_ORIGINS="http://localhost:3001,http://localhost:8080"

# MySQL Source (for migration)
MYSQL_URL="mysql://root:password@localhost:3306/geezeo_development"
```

## Data Management

### Migration Tool (Geezeo API → PostgreSQL)

Import real data from your Geezeo production/staging environment using the web-based migration tool.

#### Using the Web Interface

1. **Start the simulator**:
   ```bash
   npm run dev
   ```

2. **Open the migration tool**:
   ```
   http://localhost:3000/migrate-ui
   ```
   Or simply: `http://localhost:3000/migrate`

3. **Enter API credentials**:
   - **API Key**: Your Geezeo API key (used to sign JWT tokens)
   - **Partner Domain**: e.g., `geezeo.geezeo.banno-staging.com`
   - **PCID**: User identifier to import data for (e.g., `dpotockitest`)
   - **Partner ID**: Usually `1`

4. **Test connection**: Click "Test Connection" to verify credentials

5. **Select data to import**:
   - ☑ Current User (basic user information)
   - ☑ Accounts (financial accounts)
   - ☐ Transactions (can take time for large datasets)
   - ☐ Budgets
   - ☐ Goals (savings and payoff)
   - ☐ Alerts
   - ☐ Tags

6. **Start import**: Watch real-time progress as data is fetched and imported

#### How It Works

The migration tool:
1. Generates a JWT token using your API key (same as responsive-tiles)
2. Fetches data from Geezeo API endpoints (e.g., `/api/v2/users/{userId}/accounts/all`)
3. Transforms and inserts data into your local PostgreSQL database via Prisma
4. Streams progress updates in real-time

#### Example: Import from Staging

```bash
# 1. Start simulator
npm run dev

# 2. Open browser to http://localhost:3000/migrate

# 3. Enter credentials:
API_KEY=a0aaac50f0bdfec4973620ce8a7cbb5400af7b4283671b02671ed7f78b3bcd733a8dc791643f88ed2e0f4505298a9efbd51e34fdeb10431f5113c7fecccabc95
PARTNER_DOMAIN=geezeo.geezeo.banno-staging.com
PCID=dpotockitest
PARTNER_ID=1

# 4. Test connection, select entities, and import!
```

#### API Endpoint Reference

The tool uses these Geezeo API endpoints:
- `/users/current` - User information
- `/users/{userId}/accounts/all` - All accounts
- `/users/{userId}/transactions/search` - Transaction history
- `/users/{userId}/budgets` - Budgets
- `/users/{userId}/savings_goals` - Savings goals
- `/users/{userId}/payoff_goals` - Payoff goals
- `/users/{userId}/alerts` - Alerts
- `/users/{userId}/tags` - Tags

### Test Data Generator

Generate realistic test data with Faker.js:

```bash
# Basic scenario (1 partner, 5 users, 3 accounts each)
npm run seed -- generate --scenario basic

# Realistic scenario (1 partner, 100 users, 4 accounts each)
npm run seed -- generate --scenario realistic

# Stress test scenario (5 partners, 1000 users each)
npm run seed -- generate --scenario stress

# Custom generation
npm run seed -- generate \
  --partners 2 \
  --users 50 \
  --accounts 4 \
  --transactions 200 \
  --clear
```

## API Endpoints

### Core Endpoints

| Domain | Endpoints | Authentication |
|--------|-----------|----------------|
| Users | `/users/current`, `/users/{userId}/*` | JWT Required |
| Partners | `/partners/current` | JWT Required |
| Accounts | `/users/{userId}/accounts/*` | JWT Required |
| Transactions | `/users/{userId}/transactions/*` | JWT Required |
| Budgets | `/users/{userId}/budgets/*` | JWT Required |
| Goals | `/users/{userId}/{type}_goals/*` | JWT Required |
| Alerts | `/users/{userId}/alerts/*` | JWT Required |
| Cashflow | `/users/{userId}/cashflow/*` | JWT Required |
| Tags | `/tags`, `/users/{userId}/tags` | JWT Required |

See [API Documentation](./docs/API.md) for complete endpoint list.

### Authentication

The API uses JWT Bearer tokens:

```bash
# Example request
curl -X GET http://localhost:3000/api/v2/users/123/accounts/all \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Development

### Project Structure

```
pfm-backend-simulator/
├── src/
│   ├── config/           # Configuration (DB, auth, logger)
│   ├── middleware/       # Express middleware
│   ├── routes/           # API route definitions
│   ├── controllers/      # Request handlers
│   ├── services/         # Business logic layer
│   ├── types/            # TypeScript types
│   ├── utils/            # Utility functions
│   └── index.ts          # Application entry point
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── migrations/       # Migration history
├── tools/
│   ├── migrate/          # MySQL → PostgreSQL migration
│   └── seed/             # Test data generation
├── tests/
│   ├── integration/      # API integration tests
│   └── unit/             # Unit tests
├── docker-compose.yml    # Docker Compose configuration
├── Dockerfile            # Production Docker image
└── package.json
```

### Scripts

```bash
# Development
npm run dev              # Start with hot reload
npm run build            # Build TypeScript
npm start                # Run built code

# Database
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio

# Data tools
npm run migrate          # MySQL → PostgreSQL migration
npm run seed             # Generate test data

# Testing
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report

# Code quality
npm run lint             # Run ESLint
npm run format           # Format with Prettier
```

### Testing

```bash
# Run integration tests
npm test

# Run specific test file
npm test -- accounts.test.ts

# Watch mode for TDD
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Docker Deployment

### Build and Run

```bash
# Build Docker image
docker build -t pfm-simulator:latest .

# Run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

### Production Deployment

```bash
# Build production image
docker build -t pfm-simulator:1.0.0 --target production .

# Run with production environment
docker run -d \
  --name pfm-simulator \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="..." \
  -e NODE_ENV="production" \
  pfm-simulator:1.0.0
```

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Test connection
docker-compose exec postgres psql -U pfm_user -d pfm_simulator

# View logs
docker-compose logs postgres
```

### Migration Issues

```bash
# Reset database (WARNING: destroys all data)
npx prisma migrate reset

# Check migration status
npx prisma migrate status

# Generate new migration
npx prisma migrate dev --name description
```

### Port Conflicts

```bash
# Change port in .env
PORT=3001

# Or use docker-compose port mapping
# Edit docker-compose.yml ports section
```

## Performance Considerations

- **Response Time Target**: <100ms for 95% of requests
- **Concurrent Users**: Tested up to 1000 concurrent users
- **Database Indexes**: Optimized for common queries
- **Connection Pooling**: Uses Prisma connection pooling
- **Caching**: Recommended to add Redis for production

## Security Notes

- Change `JWT_SECRET` in production
- Use strong passwords for database
- Enable HTTPS in production
- Review CORS origins configuration
- Implement rate limiting for production use

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/name`)
3. Commit changes (`git commit -am 'Add feature'`)
4. Push to branch (`git push origin feature/name`)
5. Create Pull Request

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
