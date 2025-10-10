# Interactive CLI for PFM Backend Simulator

An educational command-line interface to explore and learn the PFM Backend API.

## Quick Start

### 1. Make sure the server is running

In one terminal:
```bash
npm run dev
```

### 2. Seed test data (if not already done)

In another terminal:
```bash
npm run seed
```

### 3. Run the CLI

```bash
npm run cli
```

## Features

### 🔐 Authentication
- Login with pre-configured test users
- Login with custom credentials
- Use existing JWT tokens
- View current user context

### 💳 Account Operations
- List all accounts
- Get specific account details
- Create new accounts (checking, savings, credit card, etc.)

### 💰 Budget Management
- List all budgets
- Get budget details
- Create new budgets with monthly/yearly periods
- Update existing budgets
- Delete budgets

### 📝 Transaction Management
- List recent transactions
- Filter transactions by date range
- Create new transactions

### 🌟 Other Features
- Goals management
- Alerts and notifications
- Cashflow (bills, income, events)
- Expense analytics

### ⚙️ Settings
- Toggle request/response logging (learn HTTP details)
- View user context
- **Generate RT Startup command** - Generate fresh shared secret and complete startup command for responsive-tiles frontend
- Logout

## Learning Mode

The CLI is designed to be educational:

- **HTTP Request Logging**: Every API call shows the actual HTTP request being made
- **Response Display**: See the full JSON responses from the server
- **Step-by-Step Workflow**: Follow guided menus to learn API usage
- **Real Data**: Work with actual database records, not mocks

## Example Session

1. Start the CLI: `npm run cli`
2. Choose **Authentication** → **Login with test user**
3. Select a test user (e.g., User 1 - Partner 1)
4. Choose **Budgets** → **List all budgets**
5. Observe the HTTP request/response shown in the terminal
6. Try creating a new budget to see POST requests
7. Explore other features!

## Responsive Tiles Integration

To start the responsive-tiles frontend with this backend:

1. Run the CLI: `npm run cli`
2. Login with a test user
3. Go to **Settings** → **Generate RT Startup command**
4. CLI generates a new shared secret and displays:
   - Responsive-tiles startup command with API_KEY
   - Backend JWT_SECRET to update in .env
5. Update backend `.env` with the generated JWT_SECRET
6. Copy the startup command
7. Open a new terminal and navigate to `~/code/banno/responsive-tiles`
8. Paste and run the command
9. Access the frontend at `http://localhost:8080`

The CLI automatically generates:
- `API_KEY` - Cryptographically secure shared secret (128-char hex)
- `PARTNER_DOMAIN` - Set to localhost
- `PCID` - User ID from your login
- `ENV` - Set to development

**Important**: The API_KEY and JWT_SECRET must match for authentication to work!

## Test Users (from seed data)

After running `npm run seed`, these users are available:

- `user1@partner1.com` / `password123`
- `user2@partner1.com` / `password123`
- `user1@partner2.com` / `password123`

## Tips

- **Turn on logging** (default): See HTTP requests/responses to understand API
- **Turn off logging**: Focus on data without verbose output
- **Press Ctrl+C** anytime to exit
- **Explore freely**: All operations use real database, changes persist

## Troubleshooting

### "Login failed" error
- Ensure server is running (`npm run dev`)
- Ensure database is seeded (`npm run seed`)
- Check credentials match seed data

### "Operation failed" error
- Make sure you're logged in first
- Check server logs for detailed error messages
- Verify the server port (default 3000) matches API client

### TypeScript errors
- Run `npm install` to ensure dependencies are installed
- Check Node version (requires 20+)

## Architecture

The CLI uses:
- **axios** - HTTP client for API calls
- **inquirer** - Interactive prompts
- **chalk** - Colored terminal output
- **jsonwebtoken** - JWT token parsing

All API calls go through the same REST endpoints that the responsive-tiles frontend uses.
