# Code Style and Conventions - PFM Backend Simulator

## TypeScript Configuration

### Compiler Options
- **Target**: ES2022
- **Module**: CommonJS (Node.js standard)
- **Strict Mode**: Enabled (all strict checks on)
- **Source Maps**: Enabled for debugging
- **Declaration Files**: Generated (.d.ts + .d.ts.map)

### Type Safety
- Full type coverage required
- No implicit `any` (warns on usage)
- Strict null checks enabled
- Unused variables cause errors (except `_` prefixed args)

## Code Formatting (Prettier)

### Rules
```json
{
  "semi": true,              // Always use semicolons
  "trailingComma": "es5",    // Trailing commas where valid in ES5
  "singleQuote": true,       // Use single quotes for strings
  "printWidth": 100,         // Max line length: 100 characters
  "tabWidth": 2,             // 2 spaces for indentation
  "useTabs": false,          // Spaces, not tabs
  "arrowParens": "always"    // Always wrap arrow function params
}
```

### Examples
```typescript
// Good
const user = {
  name: 'John',
  email: 'john@example.com',
};

// Bad (missing trailing comma, double quotes)
const user = {
  name: "John",
  email: "john@example.com"
}
```

## ESLint Configuration

### Key Rules
- **Base**: `eslint:recommended` + `@typescript-eslint/recommended`
- **No explicit any**: Warn (not error)
- **Unused vars**: Error, except args starting with `_`
- **Console**: Allowed (for server logging, but prefer logger)

### Parser
- `@typescript-eslint/parser`
- ECMAVersion: 2022
- Source type: module

## Naming Conventions

### Files
- **TypeScript files**: `camelCase.ts` (e.g., `userService.ts`)
- **Routes**: `index.ts` or feature name (e.g., `accounts.ts`)
- **Controllers**: `<feature>Controller.ts` (e.g., `accountsController.ts`)
- **Services**: `<feature>Service.ts` (e.g., `authService.ts`)
- **Types**: `<feature>.types.ts` or `index.ts` in types directory

### Variables & Functions
- **Variables**: `camelCase`
- **Functions**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE` (for true constants)
- **Private fields**: Prefix with `_` (underscore)

```typescript
// Good
const userId = 123;
const MAX_RETRIES = 3;

function getUserById(id: number) { }

// Bad
const UserId = 123;
const max_retries = 3;
function GetUserById(id: number) { }
```

### Classes & Interfaces
- **Classes**: `PascalCase`
- **Interfaces**: `PascalCase` (no `I` prefix)
- **Types**: `PascalCase`
- **Enums**: `PascalCase` (enum name), `snake_case` (values)

```typescript
// Good
class UserService { }
interface UserResponse { }
type UserId = number;

enum AccountType {
  checking = 'checking',
  savings = 'savings',
}

// Bad
class userService { }
interface IUserResponse { }
enum accountType { }
```

## Database Naming (Prisma)

### Models
- **Model names**: `PascalCase` (e.g., `User`, `Account`)
- **Table names**: `snake_case` via `@@map` (e.g., `users`, `accounts`)
- **Field names**: `camelCase` in model
- **Column names**: `snake_case` via `@map`

```prisma
model User {
  id        BigInt   @id @default(autoincrement())
  firstName String?  @map("first_name")
  createdAt DateTime @default(now()) @map("created_at")

  @@map("users")
}
```

## Documentation

### Function Comments
Use JSDoc for public APIs and complex functions:

```typescript
/**
 * Retrieves a user by ID from the database
 * @param id - User's unique identifier
 * @returns User object or null if not found
 * @throws DatabaseError if query fails
 */
async function getUserById(id: number): Promise<User | null> {
  // Implementation
}
```

### Inline Comments
- Use `//` for single-line comments
- Explain **why**, not **what** (code should be self-documenting)
- Add comments for complex logic, workarounds, or TODOs

```typescript
// Good
// Disable ETag to prevent 304 responses during development
app.set('etag', false);

// Bad
// Set etag to false
app.set('etag', false);
```

## Error Handling

### Patterns
```typescript
// Use try-catch for async operations
try {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return user;
} catch (error) {
  logger.error({ error, userId: id }, 'Failed to fetch user');
  throw error;
}
```

### Custom Errors
- Create custom error classes in `src/utils/errors.ts`
- Use meaningful error names: `NotFoundError`, `ValidationError`, `AuthenticationError`

## Logging

### Use Pino Logger
```typescript
import { logger } from './config/logger';

// Good - structured logging
logger.info({ userId, action: 'login' }, 'User logged in');
logger.error({ error, context }, 'Operation failed');

// Bad - console.log
console.log('User logged in:', userId);
```

### Log Levels
- **error**: Application errors, exceptions
- **warn**: Warnings, deprecated usage
- **info**: General information (requests, operations)
- **debug**: Detailed debugging information

## Import Organization

### Order
1. External modules (Node.js built-ins, npm packages)
2. Internal modules (relative imports from src/)
3. Type imports (if separate)

```typescript
// Good
import express from 'express';
import cors from 'cors';
import { prisma } from './config/database';
import { logger } from './config/logger';
import type { User } from './types';

// Bad - mixed order
import { logger } from './config/logger';
import express from 'express';
import type { User } from './types';
import cors from 'cors';
```

## Design Patterns

### Controller-Service Pattern
- **Controllers**: Handle HTTP requests/responses, validation
- **Services**: Business logic, database operations
- **Middleware**: Authentication, logging, error handling

```typescript
// Controller
export const getUser = async (req: Request, res: Response) => {
  const user = await userService.findById(req.params.id);
  res.json(user);
};

// Service
export const findById = async (id: number): Promise<User> => {
  return await prisma.user.findUniqueOrThrow({ where: { id } });
};
```

### Validation with Zod
```typescript
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().optional(),
});

type CreateUserInput = z.infer<typeof createUserSchema>;
```

## Testing Conventions

### File Naming
- Test files: `<filename>.test.ts` or `<filename>.spec.ts`
- Place tests in `tests/` directory or colocated with source

### Structure
```typescript
describe('UserService', () => {
  describe('findById', () => {
    it('should return user when found', async () => {
      // Arrange
      const userId = 1;
      // Act
      const user = await userService.findById(userId);
      // Assert
      expect(user).toBeDefined();
      expect(user.id).toBe(userId);
    });

    it('should throw error when user not found', async () => {
      await expect(userService.findById(999)).rejects.toThrow();
    });
  });
});
```
