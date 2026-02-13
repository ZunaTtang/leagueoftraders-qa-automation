# League of Traders - QA Automation Framework

> Production-grade automated QA system for continuous quality validation

## 🎯 Overview

This is a comprehensive QA automation framework built with Playwright and TypeScript for testing [leagueoftraders.io](https://leagueoftraders.io). The system provides:

- **Full Site Coverage**: Automated discovery and validation of all pages
- **Login Automation**: Session state management with role-based testing
- **Smart Quality Gates**: Console error detection, network failure monitoring, layout validation
- **Safe Interaction Testing**: Button and link functionality checks with danger detection
- **Broken Link Detection**: Comprehensive link scanning and validation
- **Accessibility Checks**: WCAG compliance validation on key pages
- **CI/CD Ready**: GitHub Actions integration with PR checks and nightly scans

## 📊 Test Tiers

| Tier | Trigger | Duration | Scope |
|------|---------|----------|-------|
| **Smoke** | Pull Request | ~2-5 min | Critical paths only (Homepage, Login, Key Dashboards) |
| **Regression** | Main Branch | ~10-15 min | Full functional flows (Buttons, Navigation, Core Actions) |
| **Crawler** | Nightly | ~40-60 sec | 2-Stage Crawl: Automated Discovery + Parallel Validation |
| **Accessibility** | Nightly | ~5-10 min | WCAG compliance on critical pages |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd inner-halo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Playwright browsers**
   ```bash
   npx playwright install chromium
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   
   Then edit `.env` and set:
   ```env
   LOT_BASE_URL=https://leagueoftraders.io
   LOT_EMAIL=your-test-account@example.com
   LOT_PASSWORD=your-password
   ```

### Running Tests

```bash
# Run smoke tests (fast, PR-safe)
npm run test:smoke

# Run regression tests (full functional)
npm run test:regression

# Run crawler (2-stage scan: discover + validate)
npm run crawl:full

# Run accessibility tests
npm run test:nightly

# Run all tests
npm run test:all

# Debug mode
npm run test:debug

# UI mode (interactive)
npm run ui

# View last report
npm run report
```

## 📁 Project Structure

```
├── .auth/                      # Session state files (generated, gitignored)
├── .github/workflows/          # CI/CD pipelines
│   └── qa.yml                  # Main workflow
├── config/                     # Configuration modules
│   ├── keyPages.ts             # Page definitions & button rules
│   └── networkRules.ts         # Network allow/block lists
├── tests/                      # Test specifications
│   ├── global.setup.ts         # Authentication setup
│   ├── smoke/                  # PR smoke tests
│   │   └── critical.spec.ts
│   ├── functional/             # Regression tests
│   │   └── buttons.spec.ts
│   ├── crawler/                # Full site crawl
│   │   └── full_scan.spec.ts
│   └── nightly/                # Optional heavy tests
│       └── accessibility.spec.ts
├── utils/                      # Shared utilities
│   ├── assertions.ts           # Quality gates
│   ├── auth.ts                 # Login & session management
│   ├── crawlerDiscovery.ts     # ⭐ Stage 1: URL discovery engine
│   ├── crawlerValidation.ts    # ⭐ Stage 2: Parallel validation engine
│   ├── crawler.ts              # (Legacy) Page discovery engine
│   ├── apiMonitor.ts           # API monitoring & validation
│   ├── csvReporter.ts          # CSV report generation
│   ├── interactions.ts         # Safe button testing
│   └── reportHelper.ts         # Summary generation
├── CRAWLER_ARCHITECTURE.md     # ⭐ Crawler architecture details
├── playwright.config.ts        # Playwright configuration
└── package.json                # Scripts & dependencies
```

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `LOT_BASE_URL` | Yes | Target website URL | `https://leagueoftraders.io` |
| `LOT_EMAIL` | Yes | Test account email | - |
| `LOT_PASSWORD` | Yes | Test account password | - |
| `HEADLESS` | No | Run in headless mode | `true` |

### Key Pages Configuration

Edit `config/keyPages.ts` to:
- Define critical pages for smoke tests
- Add pages for regression testing
- Configure button safety rules
- Set crawl exclusions

### Network Rules

Edit `config/networkRules.ts` to:
- Block third-party trackers (speed boost)
- Ignore known noisy services
- Define internal domains for quality validation

## 📈 Understanding Results

### Console Output

After each test run, you'll see a summary table:

```
============================================================
📊 QA AUTOMATION SUMMARY
============================================================
🕒 Timestamp:           2026-02-04T13:55:01.000Z
⏱️  Duration:            45.3s
📄 Total Pages:         25
✅ Passed:              23 (92.0%)
❌ Failed:              2
🔗 Broken Links:        0
🖥️  Console Errors:      1 pages
🌐 Network Failures:    1 pages
============================================================
```

### HTML Report

Open the interactive HTML report:
```bash
npm run report
```

Features:
- Test results with screenshots
- Trace viewer for debugging
- Filterable results
- Detailed error messages

### Crawler Outputs

The 2-stage crawler generates specific JSON reports:
- `crawl-urls.json`: Metadata and list of discovered URLs
- `crawl-results.json`: Detailed validation results for each URL
- `crawl-validation-summary.json`: Pass/Fail/Warning statistics

### JSON Summary

Machine-readable summary is saved to `qa-summary.json`:
```json
{
  "timestamp": "2026-02-04T13:55:01.000Z",
  "totalPages": 25,
  "passedPages": 23,
  "failedPages": 2,
  "brokenLinks": 0,
  "details": [...]
}
```

## 🔍 Quality Gates

Every page is automatically validated for:

✅ **No Console Errors** - Error-level console messages (excluding third-party noise)  
✅ **No Network Failures** - 4xx/5xx on internal requests  
✅ **Page Not Blank** - Body contains meaningful content  
✅ **Core Layout Rendered** - Navigation and main content areas exist  

## 🛡️ Safety Features

### Danger Detection

The framework never executes destructive actions:
- ❌ Logout buttons
- ❌ Delete account
- ❌ Withdraw funds
- ❌ Place orders
- ❌ Payment confirmations

### Smart Crawling

- **2-Stage Architecture**: Separates URL discovery from page validation for stability
- **Recursive Sitemap**: Handles sitemap indices and multi-level XMLs
- **URL Normalization**: Deduplicates similar URLs (removes utm, ref, hashes)
- **Parallel Validation**: Uses multiple workers for high-speed page checks
- **Dynamic Route Sampling**: Limits validation of `/token/:id` patterns
- **Exclusions**: Skips admin, API, and dangerous routes from `config/keyPages.ts`

### Session Management

- **State Reuse**: Login once, use across all tests
- **Hard Failure**: Abort with screenshot if login fails
- **Role-Based States**: Separate guest and authenticated states

## 🤖 CI/CD Integration

### GitHub Actions

Automatically runs:
- **PR Check**: Smoke tests on pull requests
- **Main Push**: Regression tests on main branch
- **Nightly**: Full crawl + accessibility at midnight UTC

### Setting Up Secrets

Add these secrets to your GitHub repository:
```
Settings → Secrets → Actions → New repository secret
```

Required secrets:
- `LOT_EMAIL`
- `LOT_PASSWORD`
- `LOT_BASE_URL` (optional)

### Artifacts

On failure, uploads:
- HTML report
- Screenshots
- Trace files
- `qa-summary.json`

Retention: 7 days (smoke), 14 days (regression), 30 days (nightly)

## 🐛 Troubleshooting

### Login Fails

**Error**: `❌ Login failed: Did not navigate away from login page`

**Solutions**:
1. Check credentials in `.env`
2. Verify site is accessible
3. Check `test-results/login-failed.png` screenshot
4. Site may have CAPTCHA/bot detection (see Cloudflare section)

### Cloudflare / CAPTCHA Issues

If the site blocks automation:

1. **Use Staging Environment** (if available)
   ```env
   LOT_BASE_URL=https://staging.leagueoftraders.io
   ```

2. **Whitelist CI IPs** (contact site admins)

3. **Manual State Generation**:
   - Login manually in browser
   - Export cookies to `.auth/user.json`
   - Use saved state for tests

### Flaky Tests

If tests fail intermittently:
1. Increase timeouts in `playwright.config.ts`
2. Check network stability
3. Review trace files for timing issues
4. Add explicit waits if needed

### No Pages Discovered

**Error**: `Crawl complete: 0 pages discovered`

**Solutions**:
1. Verify `LOT_BASE_URL` is correct
2. Check network connectivity
3. Review crawl exclusions in `config/keyPages.ts`

## 📚 Advanced Usage

### Custom Page Definitions

Add pages to test in `config/keyPages.ts`:

```typescript
export const criticalPages: PageDefinition[] = [
  { path: '/my-page', name: 'My Page', requiresAuth: false, priority: 'critical' },
];
```

### Adjusting Crawler Limits

In tests, modify crawler options:

```typescript
await discoverPages(page, baseURL, {
  maxPages: 200,        // Increase page limit
  maxDepth: 4,          // Crawl deeper
  sampleDynamicRoutes: 10, // More dynamic route samples
});
```

### Adding Custom Assertions

Extend `utils/assertions.ts`:

```typescript
export async function assertCustomCheck(page: Page): Promise<void> {
  // Your custom validation
}
```

## 🎓 For Non-Engineers

### Running Your First Test

1. Open terminal in project folder
2. Type: `npm run test:smoke`
3. Wait 2-5 minutes
4. Check the summary table

### Reading Results

- ✅ **Green checks** = Pages working correctly
- ❌ **Red X's** = Problems found
- 📸 **Screenshot paths** = Visual proof of issues

### When to Escalate

Report to engineering if:
- Pass rate < 80%
- Broken links found
- Login failures
- Multiple console errors

## 📝 License

ISC

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Run smoke tests: `npm run test:smoke`
4. Submit PR
5. Wait for CI checks

---

**Questions?** Open an issue or contact the QA team.

**Built with** ❤️ using [Playwright](https://playwright.dev/)
