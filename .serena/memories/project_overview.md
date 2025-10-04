# PFM Backend Simulator - Project Overview

## Purpose
Lightweight Express.js backend simulator for responsive-tiles frontend development. Provides a complete PostgreSQL-based API implementation of the Geezeo PFM (Personal Financial Management) API v2 specification, enabling frontend development and testing without dependency on production backend services.

## Key Features
- RESTful API endpoints matching Geezeo API v2 specification
- PostgreSQL database with Prisma ORM
- JWT-based authentication
- Data migration tools from MySQL to PostgreSQL
- Seed data generation with Faker.js
- Migration UI for data import
- CORS support for local development
- Request logging with Pino

## Tech Stack

### Runtime & Framework
- **Node.js**: >=20.0.0
- **TypeScript**: ^5.6.2
- **Express.js**: ^4.19.2 (web framework)

### Database & ORM
- **PostgreSQL**: Primary database
- **Prisma**: ^5.20.0 (ORM and migrations)
- **MySQL2**: ^3.11.3 (for migration tool source)

### Authentication & Security
- **JWT**: jsonwebtoken ^9.0.2
- **bcrypt**: ^5.1.1 (password hashing)
- **CORS**: ^2.8.5

### Validation & Logging
- **Zod**: ^3.23.8 (schema validation)
- **Pino**: ^9.4.0 (structured logging)
- **pino-http**: ^10.3.0 (request logging)
- **pino-pretty**: ^11.2.2 (development logging)

### Testing
- **Jest**: ^29.7.0 (test framework)
- **ts-jest**: ^29.2.5 (TypeScript support)
- **Supertest**: ^7.0.0 (HTTP testing)

### Development Tools
- **nodemon**: ^3.1.7 (auto-reload)
- **ESLint**: ^8.57.1 + @typescript-eslint
- **Prettier**: ^3.3.3 (code formatting)
- **ts-node**: ^10.9.2 (TypeScript execution)

## Project Structure

```
pfm-backend-simulator/
├── src/
│   ├── config/          # Database, logger configuration
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Auth, logging, error handling
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Helper functions
│   └── index.ts         # Application entry point
├── prisma/
│   ├── schema.prisma    # Database schema (PostgreSQL)
│   └── migrations/      # Database migrations
├── tools/
│   ├── migrate/         # MySQL → PostgreSQL migration tool
│   ├── migrate-ui/      # Web UI for migration
│   └── seed/            # Database seeding with Faker
├── tests/               # Jest test files
└── dist/                # Compiled JavaScript output
```

## API Structure
- **Base Path**: `/api/v2`
- **Authentication**: JWT Bearer tokens
- **Content-Type**: `application/json`
- **CORS**: Configurable origins (default: localhost:3001, localhost:8080)

## Development Philosophy
- **Type Safety**: Full TypeScript with strict mode
- **Schema Validation**: Zod for runtime validation
- **Database First**: Prisma schema drives application models
- **Structured Logging**: Pino for production-ready logs
- **Test Coverage**: Jest for unit and integration tests
