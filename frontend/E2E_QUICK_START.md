# E2E Testing Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Install Dependencies
```bash
cd frontend
npm install
npx playwright install
```

### Step 2: Start Services
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend  
cd frontend && npm run dev
```

### Step 3: Run Tests
```bash
# Interactive UI (Recommended)
cd frontend
npm run test:e2e:ui
```

---

## 📋 Step-by-Step Testing Process

### Phase 1: Setup (2 minutes)

1. **Install Playwright**
   ```bash
   cd frontend
   npm install
   npx playwright install chromium
   ```

2. **Verify Services Running**
   - Backend: `http://localhost:3000/health`
   - Frontend: `http://localhost:5173`

### Phase 2: Run Tests (3 minutes)

#### Option A: Interactive UI (Best for First Time)
```bash
npm run test:e2e:ui
```

**What you'll see:**
- Test list on the left
- Browser preview on the right
- Step-by-step execution
- Screenshots and videos

#### Option B: Headless (Fast)
```bash
npm run test:e2e
```

#### Option C: Headed (See Browser)
```bash
npm run test:e2e:headed
```

### Phase 3: View Results

After tests complete:
```bash
npx playwright show-report
```

---

## 🧪 Manual Testing Checklist

### Voice Interaction
- [ ] Open `http://localhost:5173`
- [ ] Mic button visible
- [ ] Click mic button
- [ ] Recording starts (button turns red)
- [ ] Transcript area appears
- [ ] Speak into microphone
- [ ] Transcript updates in real-time

### Itinerary Display
- [ ] Page loads without errors
- [ ] Empty state shows (if no itinerary)
- [ ] Itinerary displays (if available)
- [ ] Day blocks visible
- [ ] Activities show details
- [ ] Sources section visible

### Responsive Design
- [ ] Mobile view (375px)
- [ ] Tablet view (768px)
- [ ] Desktop view (1920px)

---

## 🐛 Troubleshooting

**Tests fail to start?**
- Check backend: `curl http://localhost:3000/health`
- Check frontend: Open `http://localhost:5173`

**Browser not found?**
```bash
npx playwright install
```

**Tests timeout?**
- Increase timeout in test file
- Check network connectivity

---

## 📚 Next Steps

1. Read `E2E_TESTING_GUIDE.md` for detailed scenarios
2. Add more test cases
3. Integrate with CI/CD

---

**Ready to test?** Run `npm run test:e2e:ui` and explore!

