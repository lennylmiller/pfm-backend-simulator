# Documentation Index

Comprehensive documentation for PFM Backend Simulator.

## Quick Links

| Document | Purpose | Audience |
|----------|---------|----------|
| [README.md](../README.md) | Project overview and quick start | All users |
| [CLAUDE.md](../CLAUDE.md) | Claude Code development guide | AI assistants |
| [API.md](./API.md) | Complete API reference | Frontend developers |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design and patterns | Backend developers |
| [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) | Development workflows | Contributors |
| [MIGRATION_TOOL.md](./MIGRATION_TOOL.md) | Data migration guide | DevOps, QA |

## Documentation Overview

### Getting Started

1. **New to the project?**
   - Start with [README.md](../README.md) for quick start
   - Review [GETTING_STARTED.md](./GETTING_STARTED.md) for detailed setup
   - Check [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) for development workflow

2. **Setting up data?**
   - Use [MIGRATION_TOOL.md](./MIGRATION_TOOL.md) to import from Geezeo API
   - Or generate test data: `npm run seed -- generate --scenario realistic`

3. **Developing features?**
   - Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand system design
   - Follow patterns in [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)
   - Reference [API.md](./API.md) for endpoint specifications

### By Role

#### Frontend Developers

**Primary docs**:
- [API.md](./API.md) - All endpoints, request/response formats
- [README.md](../README.md) - Quick start and setup

**Key sections**:
- Authentication (JWT Bearer tokens)
- Response formats and error codes
- Data types (BigInt, Decimal, Date handling)

#### Backend Developers

**Primary docs**:
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design and patterns
- [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) - Development workflows
- [CLAUDE.md](../CLAUDE.md) - Quick reference for common tasks

**Key sections**:
- Layered architecture (Routes → Controllers → Services → Prisma)
- Database patterns (BigInt, soft deletes, cascading)
- Testing strategies

#### DevOps / QA

**Primary docs**:
- [MIGRATION_TOOL.md](./MIGRATION_TOOL.md) - Importing production data
- [README.md](../README.md) - Docker deployment
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Deployment architecture

**Key sections**:
- Environment configuration
- Docker Compose setup
- Migration workflows

#### AI Assistants (Claude Code)

**Primary doc**:
- [CLAUDE.md](../CLAUDE.md) - Optimized development guide

**Key sections**:
- Essential commands
- Architecture patterns
- Common development tasks
- Database schema philosophy

## Document Descriptions

### README.md
**Location**: `/README.md`
**Length**: ~400 lines
**Purpose**: Project overview, quick start, and feature highlights

**Contents**:
- Project overview and features
- Prerequisites and installation
- Database setup (Docker Compose or local)
- Configuration (environment variables)
- Data management (migration tool and seed data)
- API endpoint overview
- Docker deployment
- Troubleshooting

**When to use**: First stop for any new user

---

### CLAUDE.md
**Location**: `/CLAUDE.md`
**Length**: ~350 lines
**Purpose**: Optimized guide for Claude Code AI assistant

**Contents**:
- Essential commands (dev, test, build, database)
- Layered architecture overview
- Directory structure and organization
- Migration tool architecture
- Testing patterns
- Common development patterns
- Environment configuration
- Database schema philosophy
- Performance considerations

**When to use**: AI-assisted development, quick reference

---

### API.md
**Location**: `/docs/API.md`
**Length**: ~650 lines
**Purpose**: Complete API endpoint reference

**Contents**:
- Base URL and authentication
- Response formats and status codes
- Partner endpoints
- User endpoints
- Account endpoints (implemented)
- Transaction endpoints (planned)
- Budget, Goal, Alert, Tag endpoints (planned)
- Migration endpoints
- Error handling patterns
- Data type reference (BigInt, Decimal, Date)

**When to use**: Frontend integration, API contract reference

---

### ARCHITECTURE.md
**Location**: `/docs/ARCHITECTURE.md`
**Length**: ~850 lines
**Purpose**: System design and architectural patterns

**Contents**:
- Design principles (layered architecture, type safety, DI)
- Directory structure and responsibilities
- Core components (entry point, routes, controllers, services)
- Authentication and authorization flow
- Data model architecture (multi-tenancy, relationships, BigInt)
- Database layer (Prisma patterns and philosophy)
- Logging architecture (structured logging with Pino)
- Error handling patterns
- Testing architecture
- Migration tool architecture
- Performance considerations
- Security best practices
- Deployment architecture
- Scalability patterns
- Future enhancements

**When to use**: Understanding system design, architectural decisions, scaling

---

### DEVELOPMENT_GUIDE.md
**Location**: `/docs/DEVELOPMENT_GUIDE.md`
**Length**: ~900 lines
**Purpose**: Practical development workflows and patterns

**Contents**:
- Getting started (setup, prerequisites)
- Daily development workflow
- Adding new features (endpoints, fields, models)
- Common development patterns (BigInt, Decimal, dates, errors, logging)
- Testing strategies (unit, integration, test helpers)
- Database management (viewing data, migrations, troubleshooting)
- Environment configuration (dev, test, production)
- Debugging (VS Code, Prisma query logs, request logging)
- Code style and conventions
- Performance tips
- Troubleshooting common issues

**When to use**: Active development, adding features, debugging

---

### MIGRATION_TOOL.md
**Location**: `/docs/MIGRATION_TOOL.md`
**Length**: ~750 lines
**Purpose**: Data migration from Geezeo API to PostgreSQL

**Contents**:
- Overview and components
- Usage guide (step-by-step with screenshots)
- Technical details (JWT generation, data transformation)
- Server-Sent Events (SSE) implementation
- Geezeo API endpoint reference
- Entity mapping (types, states, enums)
- Error handling and troubleshooting
- Performance considerations (batching, pagination)
- Security considerations (API key handling, CORS)
- Best practices
- Future enhancements

**When to use**: Importing production data, setting up realistic test environments

---

### GETTING_STARTED.md
**Location**: `/docs/GETTING_STARTED.md`
**Length**: ~200 lines (existing)
**Purpose**: Detailed setup instructions

**Contents**:
- Step-by-step setup guide
- Database initialization
- Environment configuration
- Verification steps

**When to use**: First-time setup, onboarding

---

### IMPLEMENTATION_SUMMARY.md
**Location**: `/docs/IMPLEMENTATION_SUMMARY.md`
**Length**: ~150 lines (existing)
**Purpose**: Implementation status and progress

**Contents**:
- Completed features
- Implementation decisions
- Next steps

**When to use**: Project status review

## Navigation Patterns

### By Task

**"I need to..."**

- **Set up the project** → [README.md](../README.md) → [GETTING_STARTED.md](./GETTING_STARTED.md)
- **Import real data** → [MIGRATION_TOOL.md](./MIGRATION_TOOL.md)
- **Add a new endpoint** → [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md#adding-new-features)
- **Understand the architecture** → [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Integrate with the API** → [API.md](./API.md)
- **Fix a bug** → [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md#debugging)
- **Deploy to production** → [ARCHITECTURE.md](./ARCHITECTURE.md#deployment-architecture)
- **Write tests** → [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md#testing-strategies)

### By Learning Path

**Path 1: Quick Start (30 minutes)**
1. [README.md](../README.md) - Overview and quick start
2. Run `npm run dev` and test `/health` endpoint
3. Import sample data with migration tool

**Path 2: Frontend Integration (1 hour)**
1. [README.md](../README.md) - Setup
2. [API.md](./API.md) - Endpoint reference
3. Test endpoints with Postman/curl

**Path 3: Backend Development (3 hours)**
1. [README.md](../README.md) - Setup
2. [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
3. [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) - Development workflows
4. [CLAUDE.md](../CLAUDE.md) - Quick reference
5. Add a test endpoint following patterns

**Path 4: Production Deployment (2 hours)**
1. [ARCHITECTURE.md](./ARCHITECTURE.md#deployment-architecture)
2. [README.md](../README.md#docker-deployment)
3. Environment configuration
4. Monitoring setup

## Cross-References

### Architecture Topics

| Topic | Primary Doc | Related Docs |
|-------|-------------|--------------|
| Layered Architecture | [ARCHITECTURE.md](./ARCHITECTURE.md#layered-architecture) | [CLAUDE.md](../CLAUDE.md#architecture), [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md#adding-new-features) |
| Authentication Flow | [ARCHITECTURE.md](./ARCHITECTURE.md#authentication--authorization) | [API.md](./API.md#authentication) |
| Database Patterns | [ARCHITECTURE.md](./ARCHITECTURE.md#database-layer-prisma) | [CLAUDE.md](../CLAUDE.md#database-schema-philosophy), [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md#database-management) |
| Migration Tool | [MIGRATION_TOOL.md](./MIGRATION_TOOL.md) | [ARCHITECTURE.md](./ARCHITECTURE.md#migration-tool-architecture) |

### Development Patterns

| Pattern | Primary Doc | Related Docs |
|---------|-------------|--------------|
| Adding Endpoints | [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md#adding-a-new-endpoint) | [ARCHITECTURE.md](./ARCHITECTURE.md#controller-pattern), [API.md](./API.md) |
| BigInt Handling | [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md#bigint-handling) | [ARCHITECTURE.md](./ARCHITECTURE.md#bigint-id-strategy), [API.md](./API.md#data-types) |
| Error Handling | [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md#error-handling-pattern) | [ARCHITECTURE.md](./ARCHITECTURE.md#error-handling), [API.md](./API.md#error-handling) |
| Testing | [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md#testing-strategies) | [ARCHITECTURE.md](./ARCHITECTURE.md#testing-architecture) |

### Data Management

| Topic | Primary Doc | Related Docs |
|-------|-------------|--------------|
| Schema Changes | [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md#adding-a-database-field) | [ARCHITECTURE.md](./ARCHITECTURE.md#migration-strategy) |
| Seed Data | [README.md](../README.md#test-data-generator) | [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md#test-data-helpers) |
| Import from Geezeo | [MIGRATION_TOOL.md](./MIGRATION_TOOL.md) | [README.md](../README.md#migration-tool) |

## Maintenance

### Updating Documentation

**When to update**:
- [ ] New features added → Update [API.md](./API.md) and [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)
- [ ] Architecture changes → Update [ARCHITECTURE.md](./ARCHITECTURE.md)
- [ ] New commands → Update [CLAUDE.md](../CLAUDE.md) and [README.md](../README.md)
- [ ] Migration tool changes → Update [MIGRATION_TOOL.md](./MIGRATION_TOOL.md)

**Review schedule**:
- Monthly: Check for outdated information
- Per release: Update version-specific info
- Per major feature: Add documentation

### Documentation Standards

**Formatting**:
- Use Markdown formatting
- Include code examples with syntax highlighting
- Add command examples in code blocks
- Use tables for reference material

**Structure**:
- Start with overview/purpose
- Provide practical examples
- Include troubleshooting section
- Link to related documentation

**Tone**:
- Clear and concise
- Action-oriented (how-to)
- Include rationale for decisions
- Avoid assumptions about reader knowledge

## Contributing to Documentation

1. Identify documentation gap
2. Choose appropriate document or create new one
3. Follow existing structure and style
4. Add cross-references to related docs
5. Update this INDEX.md with new content
6. Test all code examples
7. Submit pull request

## Version History

- **v1.0** (2024-10-01): Initial comprehensive documentation
  - API.md - Complete endpoint reference
  - ARCHITECTURE.md - System design documentation
  - DEVELOPMENT_GUIDE.md - Development workflows
  - MIGRATION_TOOL.md - Data migration guide
  - INDEX.md - Documentation index (this file)

## Feedback

Found an issue or have suggestions?
- Open an issue on GitHub
- Submit a pull request with improvements
- Contact the development team
