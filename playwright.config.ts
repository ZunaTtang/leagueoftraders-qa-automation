import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import { getBaseURL, getBooleanEnv } from './utils/env';

dotenv.config();

const videoMode = (process.env.VIDEO || 'on-first-retry') as 'off' | 'on' | 'retain-on-failure' | 'on-first-retry';

export default defineConfig({
    testDir: './tests',
    timeout: 60 * 1000,

    expect: {
        timeout: 10000
    },

    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 1 : 0,
    workers: process.env.CI ? 2 : undefined,

    reporter: [
        ['html', { open: 'never' }],
        ['list'],
        ['json', { outputFile: 'test-results/results.json' }],
        ['./utils/SmartReporter.ts']
    ],

    use: {
        baseURL: getBaseURL(),
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: videoMode,
        headless: getBooleanEnv('HEADLESS', true),
        viewport: { width: 1920, height: 1080 },
    },

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
            timeout: 90 * 1000,
            retries: 0,
        },
        {
            name: 'crawler-validate',
            testMatch: '**/crawler/validate.spec.ts',
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
            timeout: 600 * 1000,
            retries: 0,
            workers: 1,
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
            timeout: 300 * 1000,
            retries: 0,
        },
    ],
});
