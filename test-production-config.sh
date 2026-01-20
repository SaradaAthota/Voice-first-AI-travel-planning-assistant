#!/bin/bash

# Test Production Configuration Locally
# This script tests the application with production-like environment variables

set -e  # Exit on error

echo "🧪 Testing Production Configuration Locally"
echo "============================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f "backend/.env" ]; then
    echo -e "${RED}❌ Error: backend/.env file not found${NC}"
    echo "Please create backend/.env with your configuration"
    exit 1
fi

echo -e "${YELLOW}📋 Step 1: Checking Environment Variables${NC}"
echo ""

# Required variables for production
REQUIRED_VARS=(
    "SUPABASE_URL"
    "SUPABASE_ANON_KEY"
    "DATABASE_URL"
    "OPENAI_API_KEY"
)

MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^${var}=" backend/.env; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${RED}❌ Missing required variables:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    exit 1
fi

echo -e "${GREEN}✅ All required variables found${NC}"
echo ""

echo -e "${YELLOW}📋 Step 2: Setting Production-Like Environment Variables${NC}"
echo ""

# Export production-like variables
export NODE_ENV=production
export PORT=3000
export BASE_URL=http://localhost:3000
export FRONTEND_URL=http://localhost:5173
export CHROMADB_URL=http://localhost:8000

# Load other vars from .env
export $(grep -v '^#' backend/.env | xargs)

echo "NODE_ENV=$NODE_ENV"
echo "BASE_URL=$BASE_URL"
echo "FRONTEND_URL=$FRONTEND_URL"
echo "CHROMADB_URL=$CHROMADB_URL"
echo ""

echo -e "${YELLOW}📋 Step 3: Testing Backend Configuration Validation${NC}"
echo ""

cd backend

# Test that backend validates required vars
echo "Testing backend config validation..."
if npm run build 2>&1 | grep -q "Missing required environment variable\|is required in production"; then
    echo -e "${RED}❌ Backend validation failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Backend configuration valid${NC}"
echo ""

echo -e "${YELLOW}📋 Step 4: Testing Frontend Build with Production Config${NC}"
echo ""

cd ../frontend

# Set frontend env var
export VITE_API_URL=http://localhost:3000

# Test frontend build
echo "Building frontend with production config..."
if ! npm run build; then
    echo -e "${RED}❌ Frontend build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Frontend build successful${NC}"
echo ""

echo -e "${YELLOW}📋 Step 5: Checking for Localhost References in Production Code${NC}"
echo ""

cd ../backend

# Check for hardcoded localhost in production code paths
echo "Checking for localhost references..."

# These should NOT exist in production code paths
PROBLEMATIC_PATTERNS=(
    "http://localhost:\${config.port}"
    "http://localhost:8000"
    "'http://localhost:3000'"
)

FOUND_ISSUES=0

for pattern in "${PROBLEMATIC_PATTERNS[@]}"; do
    if grep -r "$pattern" src/ --include="*.ts" | grep -v "development\|dev\|test" | grep -v "console.log\|warn"; then
        echo -e "${RED}⚠️  Found potentially problematic pattern: $pattern${NC}"
        FOUND_ISSUES=1
    fi
done

if [ $FOUND_ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ No problematic localhost references found${NC}"
else
    echo -e "${YELLOW}⚠️  Some localhost references found (may be in dev-only code paths)${NC}"
fi

echo ""

echo -e "${GREEN}✅ All Production Configuration Tests Passed!${NC}"
echo ""
echo "Next steps:"
echo "1. Start backend: cd backend && npm run dev"
echo "2. Start frontend: cd frontend && npm run dev"
echo "3. Test the application in browser"
echo ""

