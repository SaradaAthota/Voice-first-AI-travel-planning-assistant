# E2E Tests

End-to-end tests for the Voice-first AI Travel Planning Assistant.

## Quick Start

### 1. Install Dependencies
```bash
npm install
npx playwright install
```

### 2. Start Services
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

### 3. Run Tests
```bash
# Interactive UI (Recommended)
npm run test:e2e:ui

# Headless
npm run test:e2e

# Headed (See browser)
npm run test:e2e:headed
```

## Test Files

- `voice-interaction.spec.ts` - Voice recording and transcription
- `itinerary-display.spec.ts` - Itinerary rendering
- `complete-flow.spec.ts` - Complete user journey

## Test Scenarios

See `E2E_TESTING_GUIDE.md` for detailed scenarios and manual testing steps.

