# PostgreSQL Tutorial for PFM Backend Simulator

Complete guide to using PostgreSQL with terminal tools and VS Code for the PFM Backend Simulator project.

## Table of Contents

- [Part 1: Terminal Tools (psql)](#part-1-terminal-tools-psql)
- [Part 2: VS Code Setup](#part-2-vs-code-setup-for-postgresql)
- [Part 3: Practical Workflows](#part-3-practical-workflows)
- [Part 4: Quick Reference](#part-4-quick-reference)

---

## Part 1: Terminal Tools (psql)

### 1.1 Installing PostgreSQL Client Tools

Check if psql is already installed:

```bash
which psql
# Output: /opt/homebrew/opt/postgresql@18/bin/psql
```

If not installed:

```bash
# macOS (Homebrew)
brew install postgresql@18

# Ensure psql is in your PATH
echo 'export PATH="/opt/homebrew/opt/postgresql@18/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Verify installation
psql --version
```

### 1.2 Essential PostgreSQL Terminal Tools

| Tool | Purpose | Example |
|------|---------|---------|
| `psql` | Interactive PostgreSQL terminal | `psql -U pfm_user -d pfm_simulator` |
| `pg_dump` | Backup database to SQL file | `pg_dump pfm_simulator > backup.sql` |
| `pg_restore` | Restore database from backup | `pg_restore -d pfm_simulator backup.dump` |
| `createdb` | Create a new database | `createdb my_database` |
| `dropdb` | Delete a database | `dropdb old_database` |
| `pg_isready` | Check if PostgreSQL server is ready | `pg_isready` |

### 1.3 Connecting to Your Database

**Your database credentials** (from `.env`):
```
Host: localhost
Port: 5432
User: pfm_user
Password: pfm_password
Database: pfm_simulator
```

**Connection Methods**:

```bash
# Method 1: Full connection string
psql "postgresql://pfm_user:pfm_password@localhost:5432/pfm_simulator"

# Method 2: Individual parameters
psql -h localhost -p 5432 -U pfm_user -d pfm_simulator
# Password: pfm_password (will prompt)

# Method 3: Minimal (if defaults match)
psql -U pfm_user pfm_simulator

# Method 4: Docker Compose (if using containerized PostgreSQL)
docker-compose exec postgres psql -U pfm_user -d pfm_simulator
```

**Environment Variables Method** (convenient for repeated use):

```bash
# Add to ~/.zshrc or ~/.bashrc
export PGHOST=localhost
export PGPORT=5432
export PGUSER=pfm_user
export PGPASSWORD=pfm_password
export PGDATABASE=pfm_simulator

# Reload shell configuration
source ~/.zshrc

# Now you can simply run:
psql
```

### 1.4 Essential psql Meta-Commands

Meta-commands (backslash commands) control psql itself, not SQL.

#### Help and Information

```sql
\?              -- Show all psql commands
\h              -- SQL command help (general)
\h SELECT       -- Help for specific SQL command (e.g., SELECT)
\h CREATE TABLE -- Help for CREATE TABLE
```

#### Database Operations

```sql
\l              -- List all databases
\l+             -- List databases with sizes and descriptions
\c dbname       -- Connect to different database
\c pfm_simulator -- Connect to your project database
\c postgres     -- Connect to default postgres database
```

#### Schema Exploration

```sql
\dt             -- List all tables
\dt+            -- List tables with sizes and descriptions
\d tablename    -- Describe table structure
\d users        -- Show users table structure
\d+ users       -- Detailed table info with indexes and constraints

-- Other object types
\dv             -- List views
\ds             -- List sequences
\di             -- List indexes
\df             -- List functions
\dn             -- List schemas
\dE             -- List foreign tables
```

#### Users and Permissions

```sql
\du             -- List database users/roles
\du+            -- List users with descriptions
\dp tablename   -- Show table permissions
\dp users       -- Show permissions on users table
```

#### Execution and Display

```sql
\x              -- Toggle expanded display (horizontal → vertical)
\x auto         -- Auto-expand when rows are too wide
\timing         -- Toggle query execution time display
\pset pager off -- Disable pager (useful for small results)
\pset pager on  -- Enable pager for large results
```

#### Output Control

```sql
\o filename     -- Send query output to file
\o output.txt   -- Redirect output to output.txt
\o              -- Stop sending output to file (back to screen)

-- Format options
\a              -- Toggle aligned/unaligned output
\H              -- Toggle HTML output
\t              -- Toggle tuples-only mode (no headers)
```

#### History and Editor

```sql
\s              -- Show command history
\s filename     -- Save command history to file
\e              -- Open last query in $EDITOR
\e filename     -- Edit file in $EDITOR
\ef function    -- Edit function definition in editor
```

#### Connection Info

```sql
\conninfo       -- Show current connection info
\password       -- Change your password
\encoding       -- Show client encoding
```

#### Exit

```sql
\q              -- Quit psql
-- Or: Ctrl+D
```

### 1.5 Practical Query Examples for Your Database

#### Exploring Your Schema

```sql
-- Connect to your database
\c pfm_simulator

-- List all tables
\dt

-- Expected output:
--              List of relations
--  Schema |      Name         | Type  |   Owner
-- --------+-------------------+-------+-----------
--  public | partners          | table | pfm_user
--  public | users             | table | pfm_user
--  public | accounts          | table | pfm_user
--  public | transactions      | table | pfm_user
--  public | budgets           | table | pfm_user
--  public | goals             | table | pfm_user
--  public | alerts            | table | pfm_user
--  public | notifications     | table | pfm_user
--  public | access_tokens     | table | pfm_user
--  public | oauth_clients     | table | pfm_user
--  public | tags              | table | pfm_user

-- Examine users table structure
\d users

-- Output shows:
--  Column         | Type      | Collation | Nullable | Default
-- ----------------+-----------+-----------+----------+---------
--  id             | bigint    |           | not null | nextval(...)
--  partner_id     | bigint    |           | not null |
--  email          | text      |           |          |
--  first_name     | text      |           |          |
--  last_name      | text      |           |          |
--  created_at     | timestamp |           | not null | now()
-- Indexes:
--  "users_pkey" PRIMARY KEY, btree (id)
--  "users_email_partner_id_key" UNIQUE CONSTRAINT, btree (email, partner_id)

-- View with expanded display (better for wide rows)
\x
SELECT * FROM users LIMIT 1;

-- Output in expanded format:
-- -[ RECORD 1 ]------+-------------------------
-- id                 | 1
-- partner_id         | 1
-- email              | user@example.com
-- first_name         | John
-- last_name          | Doe
-- created_at         | 2024-01-15 10:30:00

\x auto  -- Auto-expand when needed
```

#### Basic SELECT Queries

```sql
-- Count records in each table
SELECT COUNT(*) FROM partners;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM accounts;
SELECT COUNT(*) FROM transactions;

-- View all partners
SELECT id, name, domain, created_at
FROM partners
ORDER BY created_at DESC;

-- View users with their emails
SELECT id, email, first_name, last_name, created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- View active accounts
SELECT
    id,
    user_id,
    name,
    account_type,
    balance,
    state,
    created_at
FROM accounts
WHERE state = 'active'
ORDER BY balance DESC
LIMIT 20;

-- View recent transactions
SELECT
    id,
    account_id,
    description,
    amount,
    posted_at,
    transaction_type
FROM transactions
ORDER BY posted_at DESC
LIMIT 20;
```

#### Filtering with WHERE

```sql
-- Find users by email domain
SELECT id, email, first_name, last_name
FROM users
WHERE email LIKE '%@example.com';

-- Find accounts with low balance
SELECT name, account_type, balance
FROM accounts
WHERE balance < 100.00
  AND state = 'active';

-- Find large transactions
SELECT description, amount, posted_at
FROM transactions
WHERE ABS(amount) > 500.00
ORDER BY ABS(amount) DESC;

-- Find checking accounts
SELECT name, balance
FROM accounts
WHERE account_type = 'checking'
  AND state = 'active';

-- Date range filtering
SELECT description, amount, posted_at
FROM transactions
WHERE posted_at >= '2024-01-01'
  AND posted_at < '2024-02-01'
ORDER BY posted_at;
```

#### JOIN Queries

```sql
-- Users with their account count
SELECT
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    COUNT(a.id) as account_count
FROM users u
LEFT JOIN accounts a ON u.id = a.user_id
GROUP BY u.id, u.email, u.first_name, u.last_name
ORDER BY account_count DESC;

-- Accounts with user and partner information
SELECT
    a.id,
    a.name as account_name,
    a.account_type,
    a.balance,
    u.email,
    u.first_name || ' ' || u.last_name as user_name,
    p.name as partner_name
FROM accounts a
JOIN users u ON a.user_id = u.id
JOIN partners p ON a.partner_id = p.id
WHERE a.state = 'active'
ORDER BY a.balance DESC
LIMIT 10;

-- Transactions with account and user info
SELECT
    t.id,
    t.description,
    t.amount,
    t.posted_at,
    a.name as account_name,
    u.email as user_email
FROM transactions t
JOIN accounts a ON t.account_id = a.id
JOIN users u ON a.user_id = u.id
ORDER BY t.posted_at DESC
LIMIT 20;

-- Transaction summary by account
SELECT
    a.name as account_name,
    a.account_type,
    COUNT(t.id) as transaction_count,
    SUM(CASE WHEN t.amount < 0 THEN t.amount ELSE 0 END) as total_debits,
    SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END) as total_credits,
    SUM(t.amount) as net_change
FROM accounts a
LEFT JOIN transactions t ON a.id = t.account_id
GROUP BY a.id, a.name, a.account_type
ORDER BY transaction_count DESC;
```

#### Aggregate Functions

```sql
-- Account statistics by type
SELECT
    account_type,
    COUNT(*) as count,
    ROUND(AVG(balance), 2) as avg_balance,
    MIN(balance) as min_balance,
    MAX(balance) as max_balance,
    SUM(balance) as total_balance
FROM accounts
WHERE state = 'active'
GROUP BY account_type
ORDER BY total_balance DESC;

-- User statistics
SELECT
    COUNT(*) as total_users,
    COUNT(DISTINCT partner_id) as total_partners,
    COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as users_with_email
FROM users;

-- Monthly transaction volume
SELECT
    DATE_TRUNC('month', posted_at) as month,
    COUNT(*) as transaction_count,
    ROUND(SUM(amount), 2) as total_amount,
    ROUND(AVG(amount), 2) as avg_amount
FROM transactions
GROUP BY DATE_TRUNC('month', posted_at)
ORDER BY month DESC;

-- Account balance distribution
SELECT
    CASE
        WHEN balance < 0 THEN 'Negative'
        WHEN balance >= 0 AND balance < 1000 THEN '$0 - $1K'
        WHEN balance >= 1000 AND balance < 5000 THEN '$1K - $5K'
        WHEN balance >= 5000 AND balance < 10000 THEN '$5K - $10K'
        ELSE '$10K+'
    END as balance_range,
    COUNT(*) as account_count
FROM accounts
WHERE state = 'active'
GROUP BY balance_range
ORDER BY
    CASE
        WHEN balance < 0 THEN 1
        WHEN balance >= 0 AND balance < 1000 THEN 2
        WHEN balance >= 1000 AND balance < 5000 THEN 3
        WHEN balance >= 5000 AND balance < 10000 THEN 4
        ELSE 5
    END;
```

#### INSERT Examples

```sql
-- Insert a new partner
INSERT INTO partners (name, domain, created_at, updated_at)
VALUES ('Example Bank', 'example.bank.com', NOW(), NOW())
RETURNING id, name, domain;

-- Insert a new user
INSERT INTO users (
    partner_id,
    email,
    first_name,
    last_name,
    created_at,
    updated_at
)
VALUES (
    1,
    'john.doe@example.com',
    'John',
    'Doe',
    NOW(),
    NOW()
)
RETURNING id, email, first_name, last_name;

-- Insert multiple users
INSERT INTO users (partner_id, email, first_name, last_name, created_at, updated_at)
VALUES
    (1, 'alice@example.com', 'Alice', 'Smith', NOW(), NOW()),
    (1, 'bob@example.com', 'Bob', 'Johnson', NOW(), NOW()),
    (1, 'carol@example.com', 'Carol', 'Williams', NOW(), NOW())
RETURNING id, email;

-- Insert account for a user
INSERT INTO accounts (
    user_id,
    partner_id,
    name,
    account_type,
    balance,
    state,
    created_at,
    updated_at
)
VALUES (
    1,
    1,
    'Primary Checking',
    'checking',
    1500.00,
    'active',
    NOW(),
    NOW()
)
RETURNING id, name, balance;
```

#### UPDATE Examples

```sql
-- Update user information
UPDATE users
SET
    first_name = 'Jane',
    last_name = 'Smith',
    updated_at = NOW()
WHERE email = 'john.doe@example.com'
RETURNING id, email, first_name, last_name;

-- Archive an account (soft delete)
UPDATE accounts
SET
    archived_at = NOW(),
    updated_at = NOW()
WHERE id = 123
RETURNING id, name, archived_at;

-- Update account balance
UPDATE accounts
SET
    balance = balance + 100.00,
    updated_at = NOW()
WHERE id = 1
RETURNING id, name, balance;

-- Update all inactive accounts to archived
UPDATE accounts
SET
    archived_at = NOW(),
    updated_at = NOW()
WHERE state = 'inactive'
  AND archived_at IS NULL
RETURNING COUNT(*);

-- Update transaction description
UPDATE transactions
SET description = 'Grocery Store Purchase'
WHERE id = 456
RETURNING id, description, amount;
```

#### DELETE Examples

```sql
-- Soft delete a transaction
UPDATE transactions
SET deleted_at = NOW()
WHERE id = 456
RETURNING id, description;

-- Hard delete (use with caution!)
DELETE FROM transactions
WHERE id = 456
  AND deleted_at IS NOT NULL
RETURNING id;

-- Delete old archived accounts (be very careful!)
DELETE FROM accounts
WHERE archived_at < NOW() - INTERVAL '1 year'
  AND deleted_at IS NULL
RETURNING id, name;
```

### 1.6 Advanced psql Features

#### Using Variables

```sql
-- Set a variable
\set user_id 1

-- Use the variable in queries
SELECT * FROM users WHERE id = :user_id;

SELECT * FROM accounts WHERE user_id = :user_id;

-- Set date variable
\set start_date '2024-01-01'
\set end_date '2024-12-31'

SELECT * FROM transactions
WHERE posted_at >= :'start_date'::date
  AND posted_at <= :'end_date'::date;

-- Math with variables
\set limit 10
SELECT * FROM users LIMIT :limit;

-- String concatenation
\set email_domain '@example.com'
SELECT * FROM users WHERE email LIKE '%' || :'email_domain';
```

#### Formatting Output

```sql
-- Toggle aligned/unaligned output
\a

-- Set field separator for unaligned output (CSV)
\f ','
\a
SELECT id, email, first_name, last_name FROM users LIMIT 5;
-- Output: 1,john@example.com,John,Doe
\a
\f '|'  -- Reset to default

-- HTML output
\H
SELECT * FROM users LIMIT 3;
\H  -- Toggle off

-- Control column width
\pset columns 100

-- Border styles (0=none, 1=inside, 2=outside)
\pset border 2

-- Null display
\pset null '(null)'
SELECT email, phone FROM users LIMIT 5;

-- Numeric formatting
\pset numericlocale on
```

#### Executing SQL Files

**Creating a SQL file** (`queries/user_report.sql`):

```sql
-- user_report.sql
-- User account summary report

\echo 'User Account Summary Report'
\echo '=========================='

SELECT
    u.id,
    u.email,
    u.first_name || ' ' || u.last_name as full_name,
    COUNT(a.id) as account_count,
    COALESCE(SUM(a.balance), 0) as total_balance
FROM users u
LEFT JOIN accounts a ON u.id = a.user_id
GROUP BY u.id, u.email, u.first_name, u.last_name
ORDER BY total_balance DESC;
```

**Running SQL files**:

```bash
# From command line
psql -f queries/user_report.sql

# With specific database
psql -U pfm_user -d pfm_simulator -f queries/user_report.sql

# From within psql
\i queries/user_report.sql

# Run and redirect output to file
psql -f queries/user_report.sql -o reports/user_summary.txt

# Run with variables
psql -v user_id=1 -f queries/user_details.sql
```

#### Transaction Control

```sql
-- Start transaction
BEGIN;

-- Make changes
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;

-- Check changes
SELECT id, name, balance FROM accounts WHERE id IN (1, 2);

-- Commit if everything looks good
COMMIT;

-- Or rollback if something is wrong
ROLLBACK;

-- Savepoints for partial rollback
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
SAVEPOINT after_first_update;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
-- Oops, second update was wrong
ROLLBACK TO SAVEPOINT after_first_update;
-- First update still stands
COMMIT;
```

### 1.7 Backup and Restore

#### Backup Strategies

```bash
# Full database backup (custom format - recommended)
pg_dump -U pfm_user -d pfm_simulator -F c -f backups/pfm_simulator.dump

# Full database backup (SQL format - readable)
pg_dump -U pfm_user -d pfm_simulator > backups/pfm_simulator.sql

# Backup with compression
pg_dump -U pfm_user -d pfm_simulator -F c -Z 9 -f backups/pfm_simulator.dump.gz

# Backup specific table
pg_dump -U pfm_user -d pfm_simulator -t users > backups/users_backup.sql
pg_dump -U pfm_user -d pfm_simulator -t accounts > backups/accounts_backup.sql

# Backup multiple tables
pg_dump -U pfm_user -d pfm_simulator -t users -t accounts -t transactions > backups/core_tables.sql

# Backup schema only (no data)
pg_dump -U pfm_user -d pfm_simulator -s > backups/schema_only.sql

# Backup data only (no schema)
pg_dump -U pfm_user -d pfm_simulator -a > backups/data_only.sql

# Backup with timestamp
pg_dump -U pfm_user -d pfm_simulator > backups/pfm_simulator_$(date +%Y%m%d_%H%M%S).sql
```

#### Restore Strategies

```bash
# Restore from custom format
pg_restore -U pfm_user -d pfm_simulator backups/pfm_simulator.dump

# Restore from SQL file
psql -U pfm_user -d pfm_simulator < backups/pfm_simulator.sql

# Restore specific table
psql -U pfm_user -d pfm_simulator < backups/users_backup.sql

# Restore to new database
createdb pfm_simulator_restore
pg_restore -U pfm_user -d pfm_simulator_restore backups/pfm_simulator.dump

# Restore with clean (drop existing objects first)
pg_restore -U pfm_user -d pfm_simulator --clean backups/pfm_simulator.dump

# Restore with create (create database first)
pg_restore -U pfm_user -d postgres --create backups/pfm_simulator.dump
```

#### Export to CSV

```bash
# Export entire table to CSV
psql -U pfm_user -d pfm_simulator -c "COPY users TO STDOUT WITH CSV HEADER" > users.csv

# Export query results to CSV
psql -U pfm_user -d pfm_simulator -c "COPY (SELECT id, email, first_name, last_name FROM users) TO STDOUT WITH CSV HEADER" > users_export.csv

# Export with custom delimiter
psql -U pfm_user -d pfm_simulator -c "COPY users TO STDOUT WITH CSV HEADER DELIMITER ';'" > users.csv

# From within psql
\copy users TO 'users.csv' WITH CSV HEADER
\copy (SELECT * FROM users WHERE created_at >= '2024-01-01') TO 'users_2024.csv' WITH CSV HEADER
```

#### Import from CSV

```bash
# Import CSV to table (from command line)
psql -U pfm_user -d pfm_simulator -c "COPY users FROM '/path/to/users.csv' WITH CSV HEADER"

# From within psql
\copy users FROM 'users.csv' WITH CSV HEADER

# Import with column mapping
\copy users(id, email, first_name, last_name) FROM 'users.csv' WITH CSV HEADER
```

---

## Part 2: VS Code Setup for PostgreSQL

### 2.1 Essential Extensions

Install these extensions for optimal PostgreSQL development in VS Code:

#### 1. PostgreSQL (by Chris Kolkman)

**Extension ID**: `ckolkman.vscode-postgres`

**Features**:
- Database explorer in sidebar
- Execute queries directly from editor
- IntelliSense for SQL
- View query results in table format
- Schema browsing

**Installation**:
```
1. Press Cmd+Shift+X (Extensions view)
2. Search "PostgreSQL Chris Kolkman"
3. Click Install
```

#### 2. SQLTools + PostgreSQL Driver

**Extension IDs**:
- `mtxr.sqltools`
- `mtxr.sqltools-driver-pg`

**Features**:
- Multiple database connections
- Query history
- Bookmarked queries
- Auto-completion
- Query formatting
- Results export

**Installation**:
```
1. Install "SQLTools"
2. Install "SQLTools PostgreSQL/Redshift Driver"
```

#### 3. SQL Formatter (Optional)

**Extension ID**: `adpyke.vscode-sql-formatter`

**Features**:
- Auto-format SQL queries
- Customizable formatting rules
- Format on save option

### 2.2 Setting Up PostgreSQL Extension

**Step-by-Step Setup**:

1. **Open PostgreSQL Explorer**:
   - Click PostgreSQL icon in left sidebar
   - Or: View → PostgreSQL Explorer

2. **Add Connection**:
   - Click `+` button or "Add Connection"
   - Enter details:
     ```
     Host: localhost
     Port: 5432
     Username: pfm_user
     Password: pfm_password
     Database: pfm_simulator
     Connection Name: PFM Backend Simulator
     ```
   - Click "Connect"

3. **Browse Database**:
   - Expand connection tree
   - Browse: Schemas → public → Tables
   - Click table to see columns, indexes, constraints

4. **Execute Queries**:
   - Right-click table → "Select Top 1000"
   - Right-click table → "Show Table Info"
   - Create new SQL file → Write query → Right-click → "Run Query"

**Keyboard Shortcuts**:
- `Cmd+Shift+E` - Run selected query
- Right-click → Run Query

### 2.3 Setting Up SQLTools

**Method 1: UI Configuration**

1. Click SQLTools icon in sidebar
2. Click "Add New Connection"
3. Select "PostgreSQL"
4. Fill in details:
   ```
   Connection name: PFM Backend Simulator
   Server: localhost
   Port: 5432
   Database: pfm_simulator
   Username: pfm_user
   Password: pfm_password
   ```
5. Click "Test Connection"
6. Click "Save Connection"

**Method 2: JSON Configuration**

Create or edit `.vscode/settings.json`:

```json
{
  "sqltools.connections": [
    {
      "previewLimit": 50,
      "server": "localhost",
      "port": 5432,
      "driver": "PostgreSQL",
      "name": "PFM Backend Simulator",
      "database": "pfm_simulator",
      "username": "pfm_user",
      "password": "pfm_password",
      "connectionTimeout": 30
    }
  ],
  "sqltools.useNodeRuntime": true,
  "sqltools.results.location": "current",
  "sqltools.results.limit": 1000
}
```

**Using SQLTools**:

1. **Connect to Database**:
   - Click SQLTools icon
   - Click connection → Connect

2. **Browse Schema**:
   - Expand connection
   - Browse tables, views, functions

3. **Execute Queries**:
   - Create new SQL file (`.sql`)
   - Write query
   - Press `Cmd+E Cmd+E` to execute
   - Or: Right-click → "Run on Active Connection"

4. **View Results**:
   - Results appear in side panel
   - Export to CSV/JSON
   - Copy results

**SQLTools Keyboard Shortcuts**:
- `Cmd+E Cmd+E` - Execute query
- `Cmd+E Cmd+D` - Describe table
- `Cmd+E Cmd+S` - Show records (SELECT *)
- `Cmd+E Cmd+H` - Show history

### 2.4 Project Structure for SQL Files

Organize SQL files in your project:

```
pfm-backend-simulator/
├── sql/
│   ├── queries/              # Reusable queries
│   │   ├── users/
│   │   │   ├── get_users.sql
│   │   │   ├── user_stats.sql
│   │   │   └── user_accounts.sql
│   │   ├── accounts/
│   │   │   ├── account_summary.sql
│   │   │   └── balance_report.sql
│   │   └── transactions/
│   │       ├── recent_transactions.sql
│   │       └── transaction_summary.sql
│   │
│   ├── reports/              # Complex reporting queries
│   │   ├── monthly_summary.sql
│   │   ├── user_activity.sql
│   │   └── financial_overview.sql
│   │
│   ├── maintenance/          # Database maintenance
│   │   ├── vacuum.sql
│   │   ├── reindex.sql
│   │   └── check_sizes.sql
│   │
│   └── migrations/           # Manual migrations (if needed)
│       └── add_indexes.sql
│
└── .vscode/
    └── settings.json         # SQLTools configuration
```

**Example Query File** (`sql/queries/users/user_stats.sql`):

```sql
-- User Statistics Report
-- Shows user count, account count, and total balances
-- Usage: Execute with SQLTools (Cmd+E Cmd+E)

-- User count by partner
SELECT
    p.name as partner_name,
    COUNT(u.id) as user_count
FROM partners p
LEFT JOIN users u ON p.id = u.partner_id
GROUP BY p.id, p.name
ORDER BY user_count DESC;

-- Users with account statistics
SELECT
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    COUNT(a.id) as account_count,
    SUM(a.balance) as total_balance,
    u.created_at
FROM users u
LEFT JOIN accounts a ON u.id = a.user_id
GROUP BY u.id
ORDER BY total_balance DESC NULLS LAST
LIMIT 20;

-- Account type distribution per user
SELECT
    u.email,
    COUNT(CASE WHEN a.account_type = 'checking' THEN 1 END) as checking_count,
    COUNT(CASE WHEN a.account_type = 'savings' THEN 1 END) as savings_count,
    COUNT(CASE WHEN a.account_type = 'credit_card' THEN 1 END) as credit_cards,
    COUNT(a.id) as total_accounts
FROM users u
LEFT JOIN accounts a ON u.id = a.user_id
GROUP BY u.id, u.email
HAVING COUNT(a.id) > 0
ORDER BY total_accounts DESC;
```

### 2.5 Custom VS Code Tasks

Create `.vscode/tasks.json` for common database operations:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "PostgreSQL: Connect",
      "type": "shell",
      "command": "psql",
      "args": [
        "-h", "localhost",
        "-p", "5432",
        "-U", "pfm_user",
        "-d", "pfm_simulator"
      ],
      "problemMatcher": [],
      "presentation": {
        "echo": true,
        "reveal": "always",
        "panel": "new"
      }
    },
    {
      "label": "PostgreSQL: Backup Database",
      "type": "shell",
      "command": "pg_dump",
      "args": [
        "-U", "pfm_user",
        "-d", "pfm_simulator",
        "-f", "backups/pfm_simulator_${input:timestamp}.sql"
      ],
      "problemMatcher": []
    },
    {
      "label": "PostgreSQL: List Tables",
      "type": "shell",
      "command": "psql",
      "args": [
        "-U", "pfm_user",
        "-d", "pfm_simulator",
        "-c", "\\dt"
      ],
      "problemMatcher": []
    },
    {
      "label": "PostgreSQL: Check Database Size",
      "type": "shell",
      "command": "psql",
      "args": [
        "-U", "pfm_user",
        "-d", "pfm_simulator",
        "-c", "SELECT pg_size_pretty(pg_database_size('pfm_simulator'));"
      ],
      "problemMatcher": []
    }
  ],
  "inputs": [
    {
      "id": "timestamp",
      "type": "command",
      "command": "extension.commandvariable.transform",
      "args": {
        "text": "${command:extension.commandvariable.dateTime}",
        "pattern": ".*",
        "replace": "backup_${0}.sql"
      }
    }
  ]
}
```

**Running Tasks**:
- `Cmd+Shift+P` → "Tasks: Run Task"
- Select task from list

### 2.6 Recommended VS Code Settings

Add to `.vscode/settings.json`:

```json
{
  // SQL file associations
  "files.associations": {
    "*.sql": "sql",
    "*.pgsql": "sql"
  },

  // SQL formatting
  "editor.formatOnSave": true,
  "[sql]": {
    "editor.defaultFormatter": "adpyke.vscode-sql-formatter",
    "editor.formatOnSave": true,
    "editor.tabSize": 2,
    "editor.insertSpaces": true
  },

  // SQLTools configuration
  "sqltools.useNodeRuntime": true,
  "sqltools.results.location": "current",
  "sqltools.results.limit": 1000,
  "sqltools.autoOpenSessionFiles": false,
  "sqltools.format": {
    "language": "sql",
    "indent": "  ",
    "reservedWordCase": "upper",
    "linesBetweenQueries": 2
  },

  // PostgreSQL extension settings
  "pgsql.prettyPrintJSONfields": true,
  "pgsql.tableColumnSortOrder": "db-order",

  // Editor for SQL files
  "editor.suggest.showWords": true,
  "editor.quickSuggestions": {
    "other": true,
    "comments": false,
    "strings": false
  },

  // Minimap
  "[sql]": {
    "editor.minimap.enabled": false
  }
}
```

### 2.7 Snippets for Common Queries

Create `.vscode/sql.code-snippets`:

```json
{
  "Select All": {
    "prefix": "sel",
    "body": [
      "SELECT ${1:*}",
      "FROM ${2:table_name}",
      "WHERE ${3:condition}",
      "ORDER BY ${4:column}",
      "LIMIT ${5:10};"
    ],
    "description": "SELECT query template"
  },

  "Insert Into": {
    "prefix": "ins",
    "body": [
      "INSERT INTO ${1:table_name} (",
      "  ${2:column1},",
      "  ${3:column2}",
      ")",
      "VALUES (",
      "  ${4:value1},",
      "  ${5:value2}",
      ")",
      "RETURNING ${6:id};"
    ],
    "description": "INSERT query template"
  },

  "Update": {
    "prefix": "upd",
    "body": [
      "UPDATE ${1:table_name}",
      "SET ",
      "  ${2:column1} = ${3:value1},",
      "  ${4:updated_at} = NOW()",
      "WHERE ${5:id} = ${6:value}",
      "RETURNING ${7:*};"
    ],
    "description": "UPDATE query template"
  },

  "Join Query": {
    "prefix": "join",
    "body": [
      "SELECT ",
      "  ${1:t1}.${2:column1},",
      "  ${3:t2}.${4:column2}",
      "FROM ${5:table1} ${1:t1}",
      "JOIN ${6:table2} ${3:t2} ON ${1:t1}.${7:id} = ${3:t2}.${8:foreign_id}",
      "WHERE ${9:condition}",
      "ORDER BY ${10:column};"
    ],
    "description": "JOIN query template"
  }
}
```

**Using Snippets**:
- Type prefix (e.g., `sel`)
- Press Tab
- Fill in placeholders
- Press Tab to move between placeholders

---

## Part 3: Practical Workflows

### 3.1 Daily Development Workflow

#### Terminal Workflow

```bash
# 1. Start PostgreSQL (if using Docker)
docker-compose up -d postgres

# 2. Verify PostgreSQL is ready
pg_isready
# Output: localhost:5432 - accepting connections

# 3. Quick connection test
psql -c "SELECT version();"

# 4. Count records in main tables
psql -c "SELECT
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM accounts) as accounts,
  (SELECT COUNT(*) FROM transactions) as transactions;"

# 5. Interactive session for exploration
psql

# Inside psql:
\dt                                    # List tables
\d users                               # Examine structure
SELECT COUNT(*) FROM users;            # Quick count
SELECT * FROM users LIMIT 5;           # View sample data
\q                                     # Exit
```

#### VS Code Workflow

```
1. Open VS Code in project directory
2. Click SQLTools icon in sidebar
3. Connect to "PFM Backend Simulator"
4. Browse schema to find tables of interest
5. Create new .sql file or open existing
6. Write query
7. Execute with Cmd+E Cmd+E
8. View results in panel
9. Export or copy results if needed
```

**Example Session**:

```sql
-- File: sql/queries/daily_check.sql

-- Daily database health check
-- Execute: Cmd+E Cmd+E

-- 1. Record counts
SELECT
    'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'accounts', COUNT(*) FROM accounts
UNION ALL
SELECT 'transactions', COUNT(*) FROM transactions;

-- 2. Recent activity
SELECT
    'New users (last 24h)' as metric,
    COUNT(*)::text as value
FROM users
WHERE created_at >= NOW() - INTERVAL '24 hours'
UNION ALL
SELECT
    'New transactions (last 24h)',
    COUNT(*)::text
FROM transactions
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- 3. Account balance summary
SELECT
    account_type,
    COUNT(*) as count,
    ROUND(SUM(balance), 2) as total_balance
FROM accounts
WHERE state = 'active'
GROUP BY account_type
ORDER BY total_balance DESC;
```

### 3.2 Debugging Queries

#### In Terminal (psql)

```sql
-- Enable timing to see query execution time
\timing

-- Run query
SELECT COUNT(*) FROM transactions;
-- Output: Time: 45.234 ms

-- Enable verbose errors
\set VERBOSITY verbose

-- Explain query plan
EXPLAIN
SELECT * FROM users
JOIN accounts ON users.id = accounts.user_id
WHERE users.email LIKE '%example.com';

-- Output shows:
-- Hash Join  (cost=x..y rows=z)
--   Hash Cond: (accounts.user_id = users.id)
--   -> Seq Scan on accounts  (cost=x..y rows=z)
--   -> Hash  (cost=x..y rows=z)
--     -> Seq Scan on users  (cost=x..y rows=z)
--          Filter: (email ~~ '%example.com'::text)

-- Explain with actual execution
EXPLAIN ANALYZE
SELECT * FROM users
JOIN accounts ON users.id = accounts.user_id
WHERE users.email LIKE '%example.com';

-- Shows actual execution time and row counts

-- Explain with buffer usage (shows cache hits)
EXPLAIN (ANALYZE, BUFFERS)
SELECT COUNT(*) FROM transactions
WHERE posted_at >= NOW() - INTERVAL '30 days';

-- Check for slow queries
SELECT
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

#### In VS Code

```sql
-- Add EXPLAIN ANALYZE to debug slow queries
EXPLAIN ANALYZE
SELECT
    u.email,
    COUNT(t.id) as transaction_count
FROM users u
JOIN accounts a ON u.id = a.user_id
JOIN transactions t ON a.id = t.account_id
WHERE t.posted_at >= NOW() - INTERVAL '90 days'
GROUP BY u.id, u.email
ORDER BY transaction_count DESC;

-- Review execution plan in output panel
-- Look for:
-- - Seq Scan (might need index)
-- - High cost values
-- - Row estimate vs actual mismatch
```

**Optimization Tips**:

```sql
-- Create index if Seq Scan is slow
CREATE INDEX idx_transactions_posted_at
ON transactions(posted_at);

-- Create composite index for common joins
CREATE INDEX idx_accounts_user_id_state
ON accounts(user_id, state);

-- Analyze table statistics
ANALYZE transactions;
ANALYZE accounts;

-- Vacuum to clean up dead rows
VACUUM ANALYZE transactions;
```

### 3.3 Database Maintenance

```sql
-- Check database size
SELECT
    pg_database.datname as database_name,
    pg_size_pretty(pg_database_size(pg_database.datname)) as size
FROM pg_database
WHERE datname = 'pfm_simulator';

-- Check table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as external_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index sizes
SELECT
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_indexes
JOIN pg_class ON pg_indexes.indexname = pg_class.relname
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Vacuum to reclaim space and update statistics
VACUUM ANALYZE;

-- Vacuum specific table
VACUUM ANALYZE transactions;

-- Full vacuum (locks table, use during maintenance window)
VACUUM FULL transactions;

-- Reindex database
REINDEX DATABASE pfm_simulator;

-- Reindex specific table
REINDEX TABLE users;

-- Check for bloat (unused space)
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    ROUND(100 * pg_relation_size(schemaname||'.'||tablename) /
          NULLIF(pg_total_relation_size(schemaname||'.'||tablename), 0), 2) as percent_table
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check connection count
SELECT
    count(*) as connection_count,
    datname
FROM pg_stat_activity
GROUP BY datname;

-- Check active queries
SELECT
    pid,
    usename,
    application_name,
    state,
    query,
    query_start
FROM pg_stat_activity
WHERE state = 'active'
  AND datname = 'pfm_simulator';

-- Kill long-running query (use with caution)
SELECT pg_cancel_backend(pid)
FROM pg_stat_activity
WHERE state = 'active'
  AND query_start < NOW() - INTERVAL '5 minutes'
  AND datname = 'pfm_simulator';
```

---

## Part 4: Quick Reference

### 4.1 Terminal Command Cheat Sheet

```bash
# Connection
psql -U pfm_user -d pfm_simulator           # Connect to database
psql "postgresql://pfm_user:pfm_password@localhost:5432/pfm_simulator"  # Connection string

# Quick queries
psql -c "SELECT COUNT(*) FROM users"        # Single query
psql -c "\\dt"                              # List tables

# Run SQL file
psql -f script.sql                          # Execute SQL file
psql -f script.sql -o output.txt            # With output redirect

# Backup
pg_dump -d pfm_simulator > backup.sql       # SQL format
pg_dump -d pfm_simulator -F c -f backup.dump # Custom format
pg_dump -t users > users.sql                # Single table

# Restore
psql -d pfm_simulator < backup.sql          # From SQL
pg_restore -d pfm_simulator backup.dump     # From dump

# Utilities
pg_isready                                  # Check if server ready
createdb new_database                       # Create database
dropdb old_database                         # Delete database
```

### 4.2 psql Command Cheat Sheet

```sql
-- Help
\?              -- psql commands help
\h              -- SQL help
\h SELECT       -- Help for specific command

-- Connection
\c dbname       -- Connect to database
\conninfo       -- Show connection info
\password       -- Change password
\q              -- Quit

-- Schema
\l              -- List databases
\dt             -- List tables
\dv             -- List views
\di             -- List indexes
\ds             -- List sequences
\df             -- List functions
\d table        -- Describe table
\d+ table       -- Detailed table info
\du             -- List users/roles

-- Execution
\x              -- Toggle expanded display
\x auto         -- Auto-expand
\timing         -- Show query time
\e              -- Edit in $EDITOR
\i file.sql     -- Execute file

-- Output
\o file.txt     -- Output to file
\o              -- Output to screen
\a              -- Toggle aligned
\H              -- HTML output
\t              -- Tuples only

-- Variables
\set var value  -- Set variable
\echo :var      -- Show variable
```

### 4.3 Common SQL Patterns

```sql
-- Basic SELECT
SELECT column1, column2
FROM table_name
WHERE condition
ORDER BY column1
LIMIT 10;

-- COUNT
SELECT COUNT(*) FROM table_name;
SELECT COUNT(DISTINCT column) FROM table_name;

-- JOIN
SELECT t1.*, t2.column
FROM table1 t1
JOIN table2 t2 ON t1.id = t2.foreign_id;

-- LEFT JOIN
SELECT t1.*, t2.column
FROM table1 t1
LEFT JOIN table2 t2 ON t1.id = t2.foreign_id;

-- GROUP BY
SELECT column, COUNT(*)
FROM table_name
GROUP BY column
HAVING COUNT(*) > 5
ORDER BY COUNT(*) DESC;

-- AGGREGATE
SELECT
    AVG(column),
    MIN(column),
    MAX(column),
    SUM(column)
FROM table_name;

-- CASE
SELECT
    column,
    CASE
        WHEN condition1 THEN 'value1'
        WHEN condition2 THEN 'value2'
        ELSE 'default'
    END as new_column
FROM table_name;

-- SUBQUERY
SELECT *
FROM table1
WHERE id IN (
    SELECT foreign_id
    FROM table2
    WHERE condition
);

-- INSERT
INSERT INTO table_name (col1, col2)
VALUES (val1, val2)
RETURNING id;

-- UPDATE
UPDATE table_name
SET col1 = val1, col2 = val2
WHERE condition
RETURNING *;

-- DELETE
DELETE FROM table_name
WHERE condition
RETURNING id;

-- UPSERT (ON CONFLICT)
INSERT INTO table_name (id, col1)
VALUES (1, 'value')
ON CONFLICT (id)
DO UPDATE SET col1 = EXCLUDED.col1;
```

### 4.4 Date/Time Functions

```sql
-- Current timestamp
SELECT NOW();
SELECT CURRENT_TIMESTAMP;
SELECT CURRENT_DATE;
SELECT CURRENT_TIME;

-- Date arithmetic
SELECT NOW() - INTERVAL '1 day';
SELECT NOW() + INTERVAL '1 week';
SELECT NOW() - INTERVAL '30 days';

-- Date parts
SELECT EXTRACT(YEAR FROM NOW());
SELECT EXTRACT(MONTH FROM NOW());
SELECT EXTRACT(DAY FROM NOW());
SELECT DATE_TRUNC('month', NOW());
SELECT DATE_TRUNC('day', posted_at);

-- Age
SELECT AGE(NOW(), created_at);
SELECT DATE_PART('day', AGE(NOW(), created_at));
```

### 4.5 String Functions

```sql
-- Concatenation
SELECT first_name || ' ' || last_name;
SELECT CONCAT(first_name, ' ', last_name);

-- Case
SELECT UPPER(email);
SELECT LOWER(email);
SELECT INITCAP(name);

-- Substring
SELECT SUBSTRING(email FROM 1 FOR 10);
SELECT LEFT(email, 10);
SELECT RIGHT(email, 10);

-- Pattern matching
SELECT * FROM users WHERE email LIKE '%@example.com';
SELECT * FROM users WHERE email ILIKE '%EXAMPLE%';  -- case insensitive
SELECT * FROM users WHERE email ~ '^[a-z]+@';  -- regex
```

### 4.6 Useful Queries for Your Database

```sql
-- User with most accounts
SELECT
    u.email,
    COUNT(a.id) as account_count
FROM users u
LEFT JOIN accounts a ON u.id = a.user_id
GROUP BY u.id, u.email
ORDER BY account_count DESC
LIMIT 1;

-- Account with most transactions
SELECT
    a.name,
    COUNT(t.id) as transaction_count
FROM accounts a
LEFT JOIN transactions t ON a.id = t.account_id
GROUP BY a.id, a.name
ORDER BY transaction_count DESC
LIMIT 1;

-- Recent user signups
SELECT
    email,
    first_name,
    last_name,
    created_at
FROM users
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- Accounts with negative balance
SELECT
    name,
    account_type,
    balance,
    user_id
FROM accounts
WHERE balance < 0
ORDER BY balance;

-- Transaction volume by day
SELECT
    DATE(posted_at) as date,
    COUNT(*) as count,
    SUM(amount) as total
FROM transactions
WHERE posted_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(posted_at)
ORDER BY date DESC;
```

---

## Additional Resources

### Official Documentation
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [psql Documentation](https://www.postgresql.org/docs/current/app-psql.html)
- [Prisma PostgreSQL Guide](https://www.prisma.io/docs/concepts/database-connectors/postgresql)

### VS Code Extensions
- [PostgreSQL Extension](https://marketplace.visualstudio.com/items?itemName=ckolkman.vscode-postgres)
- [SQLTools](https://marketplace.visualstudio.com/items?itemName=mtxr.sqltools)
- [SQLTools PostgreSQL Driver](https://marketplace.visualstudio.com/items?itemName=mtxr.sqltools-driver-pg)

### Learning Resources
- [PostgreSQL Tutorial](https://www.postgresqltutorial.com/)
- [SQL Fiddle](http://sqlfiddle.com/) - Practice SQL online
- [PostgreSQL Exercises](https://pgexercises.com/) - Interactive tutorials

### Tools
- [pgAdmin](https://www.pgadmin.org/) - GUI administration tool
- [DBeaver](https://dbeaver.io/) - Universal database tool
- [Postico](https://eggerapps.at/postico/) - macOS PostgreSQL client

---

## Troubleshooting

### Common Issues

**"psql: command not found"**
```bash
# Add PostgreSQL to PATH
echo 'export PATH="/opt/homebrew/opt/postgresql@18/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**"Connection refused"**
```bash
# Check if PostgreSQL is running
pg_isready

# If using Docker:
docker-compose ps
docker-compose up -d postgres
```

**"Password authentication failed"**
```bash
# Verify credentials in .env file
# Try connecting with explicit password:
PGPASSWORD=pfm_password psql -U pfm_user -d pfm_simulator
```

**"Database does not exist"**
```bash
# List available databases
psql -l

# Run Prisma migrations
npm run prisma:migrate
```

**"Too many connections"**
```sql
-- Check current connections
SELECT count(*) FROM pg_stat_activity;

-- Kill idle connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND state_change < NOW() - INTERVAL '1 hour';
```

---

## Next Steps

1. **Practice Basic Queries**: Start with simple SELECT statements
2. **Explore Your Schema**: Use `\d` commands to understand table structures
3. **Set Up VS Code**: Install extensions and configure connections
4. **Create Query Library**: Save common queries in `sql/` directory
5. **Learn EXPLAIN**: Understand query performance
6. **Set Up Backups**: Create backup routine
7. **Explore Advanced Features**: Window functions, CTEs, JSON operations

Happy querying! 🐘
