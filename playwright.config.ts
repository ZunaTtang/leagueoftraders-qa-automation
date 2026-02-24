import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Production-Grade Playwright Configuration
 * Supports multiple test tiers: Smoke, Regression, Nightly
 */
export default defineConfig({
    testDir: './tests',

    /* Global timeout for each test */
    timeout: 60 * 1000,

    /* Expect timeout */
    expect: {
        timeout: 10000
    },

    /* Run tests in files in parallel */
    fullyParallel: true,

    /* Fail the build on CI if you accidentally left test.only in the source code */
    forbidOnly: !!process.env.CI,

    /* Retry on CI only - minimize flake, don't hide problems */
    retries: process.env.CI ? 1 : 0,

    /* Opt out of parallel tests on CI */
    workers: process.env.CI ? 2 : undefined,

    /* Reporter configuration */
    reporter: [
        ['html', { open: 'never' }],
        ['list'],
        ['json', { outputFile: 'test-results/results.json' }],
        ['./utils/SmartReporter.ts'] // Add custom reporter
    ],

    /* Shared settings for all the projects below */
    use: {
        /* Base URL from environment */
        baseURL: process.env.LOT_BASE_URL || 'https://leagueoftraders.io',

        /* Collect trace on first retry */
        trace: 'retain-on-failure',

        /* Screenshot on failure */
        screenshot: 'only-on-failure',

        /* Video for all tests */
        video: 'on',

        /* Headless mode */
        headless: process.env.HEADLESS !== 'false',

        /* Viewport */
        viewport: { width: 1920, height: 1080 },
    },

    /* Configure projects for major browsers and test tiers */
    projects: [
        {
            name: 'setup',
            testMatch: /global\.setup\.ts/,
        },

        {
            name: 'smoke',
            testDir: './tests/smoke',
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
            timeout: 30 * 1000,
        },

        {
            name: 'regression',
            testDir: './tests/functional',
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
            timeout: 180 * 1000,
        },

        {
            name: 'crawler',
            testMatch: '**/crawler/full_scan.spec.ts',
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
            timeout: 120 * 1000,
            retries: 0,
        },

        {
            name: 'crawler-discover',
            testMatch: '**/crawler/discover.spec.ts',
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
            timeout: 90 * 1000, // 1.5 minutes (allow fallback)
            retries: 0,
        },

        {
            name: 'crawler-validate',
            testMatch: '**/crawler/validate.spec.ts',
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
            timeout: 600 * 1000, // 10 minutes
            retries: 0,
            workers: 1, // Parallelization controlled internally
        },

        {
            name: 'nightly',
            testDir: './tests/nightly',
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
            timeout: 90 * 1000,
        },

        {
            name: 'integration',
            testDir: './tests/integration',
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
            timeout: 300 * 1000, // 5 minutes for comprehensive tests
            retries: 0, // Don't retry integration tests
        },
    ],
});
