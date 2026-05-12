# Web QA Automation Tool

> A reusable Playwright + TypeScript QA toolkit for website health checks, smoke tests, regression checks, crawler-based validation, and operational QA reporting.

## Overview

This repository is a general-purpose QA automation tool for web products. It is designed for product, growth, and operations teams that need repeatable quality checks without relying only on manual QA.

The tool validates critical pages, authenticated sessions, console errors, network failures, broken links, layout rendering, safe UI interactions, crawler coverage, and accessibility issues.

## What It Checks

- Critical page rendering
- Authenticated and guest sessions
- Browser console errors
- Internal network failures
- Broken links and invalid routes
- Safe button and navigation interactions
- Blank pages and broken layouts
- Sitemap and internal-link crawl coverage
- Accessibility checks on selected pages
- Playwright HTML, JSON, screenshot, video, and trace outputs

## Test Tiers

| Tier | Typical Use | Scope |
|---|---|---|
| Smoke | Pull request or quick release check | Critical paths only |
| Regression | Main branch or pre-release check | Functional flows and key interactions |
| Crawler | Scheduled scan or broad coverage check | URL discovery + page validation |
| Accessibility | Nightly or periodic check | WCAG-oriented checks on key pages |
| Integration | Deeper validation | Combined end-to-end flows |

## Tech Stack

- Playwright
- TypeScript
- Node.js
- dotenv
- axe-core/playwright
- Custom QA reporters
- GitHub Actions-ready project structure

## Quick Start

```bash
git clone <repository-url>
cd <repository-folder>
npm install
npx playwright install chromium
cp .env.example .env
```

Configure the target website:

```env
QA_BASE_URL=https://example.com
QA_CHECK_LOGIN=false
HEADLESS=true
```

For authenticated checks:

```env
QA_CHECK_LOGIN=true
QA_LOGIN_PATH=/login
QA_EMAIL=your-test-account@example.com
QA_PASSWORD=your-test-password
```

Then run:

```bash
npm run test:smoke
```

## Commands

```bash
# Fast critical-path check
npm run test:smoke

# Functional regression checks
npm run test:regression

# Crawler discovery + validation
npm run crawl:full

# Accessibility/nightly checks
npm run test:nightly

# All core suites
npm run test:all

# Interactive Playwright UI
npm run ui

# Debug mode
npm run test:debug

# Open latest HTML report
npm run report
```

## Project Structure

```txt
├── .auth/                      # Generated session state files
├── config/                     # Page, crawl, and network rules
│   ├── keyPages.ts             # Critical pages and button safety rules
│   └── networkRules.ts         # Network allow/block/ignore rules
├── tests/                      # Playwright suites
│   ├── global.setup.ts         # Authentication setup
│   ├── smoke/                  # Critical-path checks
│   ├── functional/             # Regression checks
│   ├── crawler/                # URL discovery and page validation
│   ├── integration/            # Deeper end-to-end checks
│   └── nightly/                # Accessibility and scheduled checks
├── utils/                      # Shared QA utilities
│   ├── assertions.ts           # Quality gate assertions
│   ├── auth.ts                 # Login/session state management
│   ├── crawlerDiscovery.ts     # URL discovery engine
│   ├── crawlerValidation.ts    # Parallel validation engine
│   ├── env.ts                  # Environment variable helpers
│   ├── interactions.ts         # Safe UI interaction helpers
│   └── reportHelper.ts         # Summary/report helpers
├── CRAWLER_ARCHITECTURE.md     # Crawler architecture notes
├── playwright.config.ts        # Playwright configuration
└── package.json                # Scripts and dependencies
```

## Configuration

| Variable | Required | Description | Default |
|---|---:|---|---|
| `QA_BASE_URL` | Yes | Target website URL | `http://localhost:3000` |
| `QA_CHECK_LOGIN` | No | Whether to run login/auth checks | `false` |
| `QA_LOGIN_PATH` | No | Login route used for auth setup | `/login` |
| `QA_EMAIL` | For auth suites | Test account email | - |
| `QA_PASSWORD` | For auth suites | Test account password | - |
| `QA_CRITICAL_PATHS` | No | Comma-separated paths for smoke tests | `/` |
| `QA_REGRESSION_PATHS` | No | Comma-separated paths for regression tests | Same as smoke paths |
| `QA_AUTH_PATHS` | No | Comma-separated paths requiring auth | - |
| `QA_INTERNAL_DOMAINS` | No | Comma-separated internal domains | Base URL hostname |
| `QA_IGNORED_BROKEN_LINK_PATTERNS` | No | Comma-separated URL patterns to ignore in link checks | - |
| `HEADLESS` | No | Run browser in headless mode | `true` |
| `VIDEO` | No | Playwright video mode | `on-first-retry` |
| `CRAWLER_WORKERS` | No | Parallel crawler validation workers | `5` |
| `PAGE_TIMEOUT` | No | Page load timeout in ms | `30000` |

Legacy `LOT_*` variables are still supported for backward compatibility, but new setups should use `QA_*`.

## Quality Gates

Each validated page is checked for:

- No unexpected console errors
- No critical internal network failures
- Non-empty page body
- Core layout or content presence
- Valid navigation behavior
- No excessive broken links

## Safety Rules

The interaction engine avoids destructive actions by default, including:

- Logout / sign out
- Delete / remove
- Withdraw / transfer
- Place order / buy / sell
- Payment confirmation
- Account deletion routes

Customize these rules in `config/keyPages.ts`.

## Crawler Workflow

The crawler has two stages:

1. **Discovery**: finds internal URLs from sitemap and internal links
2. **Validation**: opens discovered pages and applies QA quality gates

Generated outputs can include:

- `crawl-urls.json`
- `crawl-results.json`
- `crawl-discovery-summary.json`
- `crawl-validation-summary.json`
- Playwright HTML reports
- Failure screenshots and traces

## Use Cases

- Release smoke testing
- Regression monitoring
- Broken link detection
- Authenticated page validation
- Product surface crawling
- Lightweight accessibility checks
- Operational QA reporting
- Non-engineer-friendly QA workflows

## For Non-Engineers

Run the core QA check:

```bash
npm run test:smoke
```

Escalate to engineering when:

- Critical pages fail to render
- Login fails unexpectedly
- Pass rate drops sharply
- Broken links are found
- Multiple internal network requests fail
- Console errors appear on important pages

## Roadmap Ideas

- Multi-site target profiles
- Slack/Discord QA report notifications
- GitHub Actions scheduled scans
- AI-assisted failure summaries
- Visual regression snapshots
- Per-page quality scoring
- CSV/Notion/Sheet export for QA operations

## License

ISC

---

Built as a lightweight QA automation system for product, growth, and operations teams that need reliable visibility into web product health.
