# Getting Started with PFM Backend Simulator

This guide will help you get the PFM Backend Simulator up and running quickly.

## Prerequisites Checklist

- [ ] Node.js 20+ installed (`node --version`)
- [ ] Docker and Docker Compose installed (optional but recommended)
- [ ] PostgreSQL 14+ (if not using Docker)
- [ ] Git (for cloning repository)

## Installation Steps

### Step 1: Install Dependencies

```bash
cd pfm-backend-simulator
npm install
```

This will install all required packages including:
- Express.js for the API server
- Prisma for database ORM
- TypeScript for type safety
- Faker.js for test data generation
- Jest for testing

### Step 2: Setup Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings
# Minimum required: DATABASE_URL and JWT_SECRET
```

### Step 3: Start Database

#### Option A: Docker Compose (Recommended)

```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Verify it's running
docker-compose ps
```

#### Option B: Local PostgreSQL

```bash
# Make sure PostgreSQL is running
# Update DATABASE_URL in .env to match your setup
```

### Step 4: Initialize Database

```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed with test data (optional but recommended)
npm run seed -- generate --scenario realistic
```

### Step 5: Start the API Server

```bash
# Development mode (with hot reload)
npm run dev

# You should see:
# PFM Backend Simulator listening on port 3000
# Environment: development
```

### Step 6: Verify Installation

```bash
# Health check
curl http://localhost:3000/health

# Should return: {"status":"ok","timestamp":"..."}
```

## Quick Test

### Generate JWT Token (for testing)

Create a test script `test-token.js`:

```javascript
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { userId: '1', partnerId: '1', email: 'test@example.com' },
  process.env.JWT_SECRET || 'dev-secret-key',
  { expiresIn: '24h' }
);

console.log('Test JWT Token:', token);
```

Run it:
```bash
node test-token.js
```

### Test API Endpoint

```bash
# Get all accounts for user 1
curl -X GET http://localhost:3000/api/v2/users/1/accounts/all \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Common Issues

### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### Port Already in Use

```bash
# Change port in .env
PORT=3001

# Or stop the service using port 3000
lsof -ti:3000 | xargs kill -9
```

### Prisma Client Not Generated

```bash
# Regenerate Prisma client
npm run prisma:generate

# Clear and rebuild
rm -rf node_modules/.prisma
npm run prisma:generate
```

### Missing Dependencies

```bash
# Reinstall all dependencies
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

1. **Explore the API**: Use Prisma Studio to view data
   ```bash
   npm run prisma:studio
   ```

2. **Run Tests**: Verify everything works
   ```bash
   npm test
   ```

3. **Generate More Data**: Add more test scenarios
   ```bash
   npm run seed -- generate --users 100 --accounts 5 --transactions 500
   ```

4. **Integration with Responsive Tiles**:
   - Point responsive-tiles to `http://localhost:3000/api/v2`
   - Use generated JWT tokens for authentication
   - Configure partner and user IDs to match seeded data

## Development Workflow

```bash
# Start development server
npm run dev

# In another terminal: Watch tests
npm run test:watch

# In another terminal: View database
npm run prisma:studio
```

## Production Deployment

```bash
# Build TypeScript
npm run build

# Start production server
NODE_ENV=production npm start
```

## Getting Help

- Check the [README.md](./README.md) for detailed documentation
- Review [API documentation](./docs/API.md) for endpoint details
- Open an issue on GitHub for bugs or questions

## Success Indicators

You'll know everything is working when:

- ✅ Health check returns `{"status":"ok"}`
- ✅ Database has seeded data (check with Prisma Studio)
- ✅ API returns account data with valid JWT token
- ✅ All tests pass: `npm test`
- ✅ Responsive-tiles can connect and fetch data

## Troubleshooting Checklist

If something isn't working:

1. [ ] Check `.env` file exists and has correct values
2. [ ] Verify PostgreSQL is running (`docker-compose ps`)
3. [ ] Confirm Prisma client is generated (`ls node_modules/.prisma`)
4. [ ] Check database has migrations (`npm run prisma:migrate status`)
5. [ ] Verify data exists (`npm run prisma:studio`)
6. [ ] Check server logs for errors
7. [ ] Ensure JWT_SECRET matches in .env and token generation

Still having issues? Open an issue with:
- Node.js version (`node --version`)
- Error messages from logs
- Steps to reproduce the problem
