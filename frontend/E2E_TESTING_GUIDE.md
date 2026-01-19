# End-to-End Testing Guide

Complete guide for performing E2E testing using the UI.

## Overview

This guide covers end-to-end testing of the Voice-first AI Travel Planning Assistant using Playwright.

## Prerequisites

### 1. Install Dependencies

```bash
cd frontend
npm install
```

This will install:
- `@playwright/test` - E2E testing framework
- Playwright browsers (Chromium, Firefox, WebKit)

### 2. Install Playwright Browsers

```bash
npx playwright install
```

This installs browser binaries for testing.

---

## Step-by-Step E2E Testing Process

### Step 1: Start the Application

#### Terminal 1: Start Backend
```bash
cd backend
npm run dev
```

Backend should be running on `http://localhost:3000`

#### Terminal 2: Start Frontend
```bash
cd frontend
npm run dev
```

Frontend should be running on `http://localhost:5173`

#### Terminal 3: Start ChromaDB (if needed)
```bash
docker-compose up chromadb
```

ChromaDB should be running on `http://localhost:8000`

---

### Step 2: Run E2E Tests

#### Option A: Run All Tests (Headless)
```bash
cd frontend
npm run test:e2e
```

#### Option B: Run Tests with UI (Recommended for Development)
```bash
cd frontend
npm run test:e2e:ui
```

This opens Playwright's interactive UI where you can:
- See tests in real-time
- Debug tests step-by-step
- View screenshots and videos
- Inspect elements

#### Option C: Run Tests in Headed Mode (See Browser)
```bash
cd frontend
npm run test:e2e:headed
```

This runs tests with visible browser windows.

---

### Step 3: Run Specific Test Files

```bash
# Run voice interaction tests only
npx playwright test e2e/voice-interaction.spec.ts

# Run itinerary display tests only
npx playwright test e2e/itinerary-display.spec.ts

# Run complete flow tests only
npx playwright test e2e/complete-flow.spec.ts
```

---

### Step 4: Debug Tests

#### Using Playwright UI (Recommended)
```bash
npm run test:e2e:ui
```

Features:
- **Time Travel**: Step through test execution
- **Inspector**: Inspect elements and selectors
- **Screenshots**: View screenshots at each step
- **Videos**: Watch test execution videos
- **Console Logs**: See browser console output

#### Using VS Code Extension
1. Install "Playwright Test for VSCode" extension
2. Open test file
3. Click "Run Test" or "Debug Test" above test functions

#### Using Browser DevTools
```bash
# Run with debug mode
PWDEBUG=1 npx playwright test
```

This opens browser DevTools for debugging.

---

## Test Scenarios

### Scenario 1: Voice Interaction Flow

**Steps**:
1. ✅ Page loads successfully
2. ✅ Mic button is visible
3. ✅ Click mic button
4. ✅ Recording state changes
5. ✅ Transcript area appears
6. ✅ Live transcript updates (if SSE connected)

**Test File**: `e2e/voice-interaction.spec.ts`

**Manual Steps**:
1. Open `http://localhost:5173`
2. Verify mic button is visible
3. Click mic button
4. Speak into microphone
5. Verify transcript appears
6. Verify transcript updates in real-time

---

### Scenario 2: Itinerary Display Flow

**Steps**:
1. ✅ Page loads
2. ✅ Empty state shown (if no itinerary)
3. ✅ Itinerary displays when available
4. ✅ Day blocks visible (morning/afternoon/evening)
5. ✅ Activities displayed with details
6. ✅ Sources section visible (if citations exist)

**Test File**: `e2e/itinerary-display.spec.ts`

**Manual Steps**:
1. Open `http://localhost:5173`
2. If no itinerary: Verify empty state message
3. If itinerary exists:
   - Verify city name displayed
   - Verify day numbers (Day 1, Day 2, etc.)
   - Verify time blocks (Morning, Afternoon, Evening)
   - Verify activity details
   - Verify sources section

---

### Scenario 3: Complete User Journey

**Steps**:
1. ✅ Page loads
2. ✅ UI elements visible
3. ✅ Mic button functional
4. ✅ Itinerary area ready
5. ✅ Responsive layout works
6. ✅ Error handling works

**Test File**: `e2e/complete-flow.spec.ts`

**Manual Steps**:
1. Open application
2. Verify all UI elements load
3. Test on different screen sizes:
   - Mobile (375x667)
   - Tablet (768x1024)
   - Desktop (1920x1080)
4. Test error scenarios:
   - Disconnect backend
   - Verify graceful error handling

---

## Manual Testing Checklist

### Voice Interaction

- [ ] Mic button appears on page load
- [ ] Clicking mic button starts recording
- [ ] Recording indicator shows (button changes color/state)
- [ ] Transcript area appears when recording
- [ ] Live transcript updates appear (SSE)
- [ ] Pause/resume functionality works
- [ ] Stop recording works
- [ ] Connection status indicator shows correct state

### Itinerary Display

- [ ] Empty state shows when no itinerary
- [ ] Itinerary header displays city name
- [ ] Day numbers display correctly (Day 1, Day 2, etc.)
- [ ] Dates display for each day
- [ ] Day summary shows (duration, travel time, activities)
- [ ] Morning block displays with activities
- [ ] Afternoon block displays with activities
- [ ] Evening block displays with activities
- [ ] Activity details show (time, POI name, category)
- [ ] Travel time between activities shows
- [ ] OSM links work (open in new tab)
- [ ] Sources section displays citations
- [ ] Citation links work

### Responsive Design

- [ ] Mobile layout (375px width)
- [ ] Tablet layout (768px width)
- [ ] Desktop layout (1920px width)
- [ ] Elements stack correctly on mobile
- [ ] Text is readable on all sizes
- [ ] Buttons are clickable on all sizes

### Error Handling

- [ ] Backend connection error handled
- [ ] API errors display gracefully
- [ ] Network errors don't crash UI
- [ ] Loading states show appropriately
- [ ] Error messages are user-friendly

---

## Test Data Setup

### Option 1: Use Existing Data

If you have existing trip data:
1. Note the `tripId` from database
2. Update test to use that `tripId`
3. Run tests against real data

### Option 2: Create Test Data

1. Use API to create a test trip:
```bash
curl -X POST http://localhost:3000/api/trips \
  -H "Content-Type: application/json" \
  -d '{
    "city": "Jaipur",
    "duration": 3,
    "startDate": "2024-01-15"
  }'
```

2. Note the returned `tripId`
3. Use in tests

### Option 3: Mock Data

Tests can use mocked API responses (see test files).

---

## Running Tests in Different Modes

### Development Mode
```bash
npm run test:e2e:ui
```
- Interactive UI
- See tests in real-time
- Debug easily
- Best for development

### CI/CD Mode
```bash
npm run test:e2e
```
- Headless execution
- Fast execution
- Suitable for automation

### Debug Mode
```bash
PWDEBUG=1 npm run test:e2e
```
- Opens browser DevTools
- Step through execution
- Inspect elements
- Best for debugging failures

---

## Viewing Test Results

### HTML Report
After tests complete:
```bash
npx playwright show-report
```

This opens an HTML report with:
- Test results
- Screenshots
- Videos
- Execution timeline
- Error details

### JSON Report
Results are saved to:
- `test-results/results.json`

### Screenshots
Screenshots on failure saved to:
- `test-results/`

### Videos
Videos on failure saved to:
- `test-results/`

---

## Common Test Scenarios

### 1. Happy Path: Complete Trip Planning

**Steps**:
1. Open application
2. Click mic button
3. Say: "I want to plan a trip to Jaipur for 3 days"
4. Wait for response
5. Continue conversation to provide preferences
6. Verify itinerary appears
7. Verify all days display
8. Verify activities show
9. Verify sources display

### 2. Error Handling: Backend Down

**Steps**:
1. Stop backend server
2. Open application
3. Verify page still loads
4. Try to interact
5. Verify error message appears
6. Verify no crashes

### 3. Responsive Design: Mobile View

**Steps**:
1. Open application on mobile device (or resize browser)
2. Verify layout adapts
3. Verify all elements accessible
4. Verify text readable
5. Verify buttons clickable

### 4. Voice Interaction: Recording Flow

**Steps**:
1. Click mic button
2. Verify recording starts
3. Speak into microphone
4. Verify transcript appears
5. Click pause
6. Verify pause works
7. Click resume
8. Verify resume works
9. Click stop
10. Verify recording stops

---

## Troubleshooting

### Tests Fail to Start

**Issue**: Backend not running
**Solution**: Start backend with `cd backend && npm run dev`

**Issue**: Frontend not running
**Solution**: Start frontend with `cd frontend && npm run dev`

### Tests Timeout

**Issue**: Slow API responses
**Solution**: Increase timeout in test:
```typescript
test.setTimeout(60000); // 60 seconds
```

### Browser Not Found

**Issue**: Playwright browsers not installed
**Solution**: Run `npx playwright install`

### Tests Pass Locally but Fail in CI

**Issue**: Environment differences
**Solution**: 
- Check environment variables
- Verify API URLs
- Check network connectivity

---

## Best Practices

1. **Use Data Test IDs**
   - Add `data-testid` attributes to UI elements
   - Makes tests more reliable

2. **Wait for Elements**
   - Use `await expect(element).toBeVisible()`
   - Don't use fixed timeouts

3. **Isolate Tests**
   - Each test should be independent
   - Don't rely on test execution order

4. **Clean Up**
   - Reset state between tests
   - Clean up test data

5. **Use Page Object Model**
   - Create page objects for reusable selectors
   - Makes tests more maintainable

---

## Next Steps

1. ✅ Set up E2E testing framework
2. ⏳ Add more test scenarios
3. ⏳ Add visual regression tests
4. ⏳ Add performance tests
5. ⏳ Integrate with CI/CD

---

## Test Files

- `e2e/voice-interaction.spec.ts` - Voice interaction tests
- `e2e/itinerary-display.spec.ts` - Itinerary display tests
- `e2e/complete-flow.spec.ts` - Complete flow tests
- `e2e/setup.ts` - Test setup

---

**Last Updated**: 2024-01-15

