# QA Automation Framework - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     LEAGUE OF TRADERS QA FRAMEWORK              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        TEST EXECUTION LAYERS                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PR Trigger          Main Push          Nightly Schedule        │
│      ↓                   ↓                     ↓                 │
│  ┌────────┐        ┌──────────┐         ┌──────────┐            │
│  │ SMOKE  │        │REGRESSION│         │ CRAWLER  │            │
│  │ Tests  │        │  Tests   │         │  Tests   │            │
│  │ < 5min │        │ ~15 min  │         │ ~60 min  │            │
│  └────────┘        └──────────┘         └──────────┘            │
│       │                  │                    │                  │
│       └──────────────────┴────────────────────┘                  │
│                          │                                       │
└──────────────────────────┼───────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                      CORE ENGINE LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │     Auth     │  │   Crawler    │  │  Assertions  │          │
│  │   Manager    │  │   Engine     │  │    Engine    │          │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤          │
│  │ · Login      │  │ · Discovery  │  │ · Console    │          │
│  │ · Session    │  │ · Validation │  │ · Network    │          │
│  │ · Storage    │  │ · Normalization│  │ · Layout     │          │
│  │ · Retry      │  │ · Parallelism│  │ · Severity   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Interaction  │  │   Network    │  │   Report     │          │
│  │   Engine     │  │    Rules     │  │   Helper     │          │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤          │
│  │ · Safe Click │  │ · Allowlist  │  │ · JSON       │          │
│  │ · Danger     │  │ · Blocklist  │  │ · Console    │          │
│  │ · Validate   │  │ · Internal   │  │ · Summary    │          │
│  │ · Rollback   │  │ · Ignore     │  │ · Artifacts  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                    CONFIGURATION LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────┐        ┌─────────────────────┐        │
│  │   Key Pages Config  │        │  Network Rules      │        │
│  ├─────────────────────┤        ├─────────────────────┤        │
│  │ · Critical Pages    │        │ · Blocked Domains   │        │
│  │ · Regression Pages  │        │ · Ignored Domains   │        │
│  │ · Button Rules      │        │ · Internal Domains  │        │
│  │ · Crawl Exclusions  │        │ · Resource Types    │        │
│  └─────────────────────┘        └─────────────────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                      TARGET WEBSITE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│              https://leagueoftraders.io                         │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Homepage │  │  Login   │  │Dashboard │  │  Markets │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

```

## Data Flow

```
┌─────────────┐
│  npm run    │
│ test:smoke  │
└──────┬──────┘
       │
       ↓
┌─────────────────┐
│ Playwright      │
│ Config          │
│ · Load Projects │
│ · Set Timeouts  │
└────────┬────────┘
         │
         ↓
┌────────────────────┐
│ Global Setup       │
│ · auth.ts          │
│ · Login            │
│ · Save .auth/      │
└────────┬───────────┘
         │
         ↓
┌────────────────────────────────────┐
│ Test Execution                     │
│                                    │
│  For each page:                    │
│  1. Load auth state                │
│  2. Setup monitoring               │
│  3. Visit page                     │
│  4. Run quality gates              │
│  5. Collect results                │
│                                    │
└────────┬───────────────────────────┘
         │
         ↓
┌────────────────────────────────────┐
│ Report Generation                  │
│                                    │
│  · HTML report                     │
│  · JSON summary                    │
│  · Console table                   │
│  · Screenshots (failures)          │
│  · Traces (failures)               │
│                                    │
└────────────────────────────────────┘
```

## Test Tier Breakdown

```
┌──────────────────────────────────────────────────────────┐
│                      SMOKE TESTS                         │
├──────────────────────────────────────────────────────────┤
│ Duration: ~2-5 minutes                                   │
│ Pages: 5 critical paths                                 │
│ Trigger: Pull Requests                                  │
│                                                          │
│ Coverage:                                                │
│  ✓ Homepage                                              │
│  ✓ Login Page                                            │
│  ✓ Dashboard                                             │
│  ✓ Markets                                               │
│  ✓ Leaderboard                                           │
│                                                          │
│ Validations:                                             │
│  ✓ Page loads without errors                            │
│  ✓ No console errors                                     │
│  ✓ No network failures                                   │
│  ✓ Basic navigation works                                │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                   REGRESSION TESTS                       │
├──────────────────────────────────────────────────────────┤
│ Duration: ~10-15 minutes                                 │
│ Pages: 10+ high-priority pages                          │
│ Trigger: Main branch push                               │
│                                                          │
│ Coverage:                                                │
│  ✓ All smoke tests                                       │
│  ✓ Button functionality                                  │
│  ✓ Navigation flows                                      │
│  ✓ Form interactions                                     │
│  ✓ User profile                                          │
│  ✓ Settings                                              │
│                                                          │
│ Validations:                                             │
│  ✓ All smoke validations                                 │
│  ✓ Buttons clickable & working                           │
│  ✓ Links navigate correctly                              │
│  ✓ Modals/toasts appear                                  │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                    CRAWLER TESTS                         │
├──────────────────────────────────────────────────────────┤
│ Duration: ~1-5 minutes (highly parallel)                 │
│ Pages: 100+ discovered pages                            │
│ Trigger: Nightly (00:00 UTC)                            │
│                                                          │
│ Stage 1: Discovery                                       │
│  ✓ Recursive Sitemap.xml (Indices + Child XMLs)          │
│  ✓ Internal link crawling                                │
│  ✓ URL Normalization (Dedupe params/hashes)              │
│  ✓ Dynamic route sampling                                │
│                                                          │
│ Stage 2: Validation                                      │
│  ✓ Parallel page visiting (5+ workers)                   │
│  ✓ Critical/Warning failure classification               │
│  ✓ Smart 404 & Auth redirect detection                   │
│  ✓ Non-HTML content handling                             │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                 ACCESSIBILITY TESTS                      │
├──────────────────────────────────────────────────────────┤
│ Duration: ~5-10 minutes                                  │
│ Pages: 5 critical pages                                 │
│ Trigger: Nightly (00:00 UTC)                            │
│                                                          │
│ Coverage:                                                │
│  ✓ WCAG 2.0 Level A                                      │
│  ✓ WCAG 2.0 Level AA                                     │
│  ✓ Critical violations only                              │
│                                                          │
│ Validations:                                             │
│  ✓ No critical a11y issues                               │
│  ✓ Proper ARIA labels                                    │
│  ✓ Keyboard navigation                                   │
│  ✓ Color contrast                                        │
└──────────────────────────────────────────────────────────┘
```

## Safety Mechanisms

```
┌─────────────────────────────────────────────────────────┐
│                  DANGER DETECTION                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Button Text Patterns (Never Click):                   │
│    × logout, log out, sign out                         │
│    × delete, remove                                     │
│    × withdraw, transfer                                 │
│    × confirm payment, place order                       │
│    × buy now, sell now                                  │
│                                                         │
│  Route Patterns (Never Visit):                         │
│    × /logout, /signout                                  │
│    × /delete, /settings/delete-account                  │
│    × /wallet/withdraw, /trade/execute                   │
│    × /admin, /api/                                      │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                 CRAWLER LIMITS                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Discovery:                                             │
│    · Max Pages: 100                                     │
│    · Max Depth: 3 levels                                │
│    · Timeout: 60 seconds (Auto-Fallback)                │
│                                                         │
│  Validation:                                            │
│    · Workers: 5 (configurable)                          │
│    · Timeout per Page: 30 seconds                       │
│    · Concurrency: Internal Job Queue                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

**Legend:**
- `→` Data flow
- `✓` Enabled/Validated
- `×` Blocked/Skipped
- `┌─┐` Component boundary
