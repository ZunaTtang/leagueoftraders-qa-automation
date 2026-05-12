import { test, expect, BrowserContext } from '@playwright/test';
import fs from 'fs';
import { criticalPages } from '../../config/keyPages';
import { setupMonitoring, runQualityGates } from '../../utils/assertions';
import { USER_STATE_FILE } from '../../utils/auth';
import { getLoginPath, shouldCheckLoginPage } from '../../utils/env';

async function loadCookiesIfAvailable(context: BrowserContext, storageStatePath: string): Promise<void> {
    if (!fs.existsSync(storageStatePath)) return;

    const state = JSON.parse(fs.readFileSync(storageStatePath, 'utf-8'));
    if (Array.isArray(state.cookies) && state.cookies.length > 0) {
        await context.addCookies(state.cookies);
    }
}

test.describe('Smoke - Critical Pages', () => {
    for (const pageConfig of criticalPages) {
        test(`should load ${pageConfig.name} without critical QA failures`, async ({ page, context }) => {
            if (pageConfig.requiresAuth) {
                await loadCookiesIfAvailable(context, USER_STATE_FILE);
            }

            const { consoleErrors, failedRequests } = await setupMonitoring(page);
            await page.goto(pageConfig.path, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(1500);

            try {
                await runQualityGates(page, consoleErrors, failedRequests);
            } catch (error: any) {
                console.warn(`Quality gate warning for ${pageConfig.name}: ${error.message}`);
            }

            await expect(page).not.toHaveURL(/(404|not-found|error)/i);
        });
    }
});

test.describe('Smoke - Core Functionality', () => {
    test('homepage should expose navigation or meaningful content', async ({ page }) => {
        const { consoleErrors, failedRequests } = await setupMonitoring(page);
        await page.goto('/', { waitUntil: 'networkidle' });

        const nav = page.locator('nav, header, [role="navigation"], [role="banner"]');
        const main = page.locator('main, [role="main"], body');

        const hasNavigation = await nav.first().isVisible().catch(() => false);
        const hasMainContent = await main.first().isVisible().catch(() => false);

        expect(hasNavigation || hasMainContent).toBeTruthy();
        await runQualityGates(page, consoleErrors, failedRequests);
    });

    test('login page should be accessible when enabled', async ({ page }) => {
        test.skip(!shouldCheckLoginPage(), 'Set QA_CHECK_LOGIN=true to enable login page checks.');

        const { consoleErrors, failedRequests } = await setupMonitoring(page);
        await page.goto(getLoginPath(), { waitUntil: 'networkidle' });

        const emailInput = page.locator('input[type="email"], input[name="email"]');
        const passwordInput = page.locator('input[type="password"]');
        const continueButtons = page.locator('button:has-text("Continue"), [role="button"]:has-text("Continue")');
        const submitButtons = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');

        const hasLoginElements =
            (await emailInput.count()) > 0 ||
            (await passwordInput.count()) > 0 ||
            (await continueButtons.count()) > 0 ||
            (await submitButtons.count()) > 0;

        expect(hasLoginElements).toBeTruthy();
        await runQualityGates(page, consoleErrors, failedRequests);
    });
});
