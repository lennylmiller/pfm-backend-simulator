#!/bin/bash

# PFM Backend Simulator - Setup Verification Script

echo "🔍 PFM Backend Simulator - Setup Verification"
echo "================================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo -n "Checking Node.js version... "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} $NODE_VERSION"
else
    echo -e "${RED}✗${NC} Node.js not found"
    exit 1
fi

# Check npm
echo -n "Checking npm... "
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓${NC} v$NPM_VERSION"
else
    echo -e "${RED}✗${NC} npm not found"
    exit 1
fi

# Check Docker
echo -n "Checking Docker... "
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | cut -d ' ' -f3 | tr -d ',')
    echo -e "${GREEN}✓${NC} $DOCKER_VERSION"
else
    echo -e "${YELLOW}⚠${NC} Docker not found (optional)"
fi

# Check Docker Compose
echo -n "Checking Docker Compose... "
if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version | cut -d ' ' -f4 | tr -d ',')
    echo -e "${GREEN}✓${NC} $COMPOSE_VERSION"
else
    echo -e "${YELLOW}⚠${NC} Docker Compose not found (optional)"
fi

# Check .env file
echo -n "Checking .env file... "
if [ -f .env ]; then
    echo -e "${GREEN}✓${NC} Found"
else
    echo -e "${YELLOW}⚠${NC} Not found (copy from .env.example)"
fi

# Check node_modules
echo -n "Checking dependencies... "
if [ -d node_modules ]; then
    echo -e "${GREEN}✓${NC} Installed"
else
    echo -e "${RED}✗${NC} Run 'npm install'"
fi

# Check Prisma client
echo -n "Checking Prisma client... "
if [ -d node_modules/.prisma ]; then
    echo -e "${GREEN}✓${NC} Generated"
else
    echo -e "${RED}✗${NC} Run 'npm run prisma:generate'"
fi

# Check PostgreSQL
echo -n "Checking PostgreSQL... "
if docker-compose ps postgres 2>/dev/null | grep -q "Up"; then
    echo -e "${GREEN}✓${NC} Running (Docker)"
elif pg_isready &> /dev/null; then
    echo -e "${GREEN}✓${NC} Running (Local)"
else
    echo -e "${RED}✗${NC} Not running"
fi

echo ""
echo "================================================"
echo "Next steps:"
echo ""

if [ ! -f .env ]; then
    echo "1. ${YELLOW}cp .env.example .env${NC}"
fi

if [ ! -d node_modules ]; then
    echo "2. ${YELLOW}npm install${NC}"
fi

if [ ! -d node_modules/.prisma ]; then
    echo "3. ${YELLOW}npm run prisma:generate${NC}"
fi

if ! docker-compose ps postgres 2>/dev/null | grep -q "Up"; then
    echo "4. ${YELLOW}docker-compose up -d postgres${NC}"
fi

echo "5. ${YELLOW}npm run prisma:migrate${NC}"
echo "6. ${YELLOW}npm run seed -- generate --scenario realistic${NC}"
echo "7. ${YELLOW}npm run dev${NC}"
echo ""
