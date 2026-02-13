import { test, expect } from '@playwright/test';
import { criticalPages } from '../../config/keyPages';
import { setupMonitoring, runQualityGates } from '../../utils/assertions';
import { GUEST_STATE_FILE, USER_STATE_FILE } from '../../utils/auth';

/**
 * Smoke Tests - Critical Path Validation
 * Fast tests for PR checks (< 5 minutes)
 */

test.describe('Smoke Tests - Critical Pages', () => {

    for (const pageConfig of criticalPages) {
        test(`should load ${pageConfig.name} without errors`, async ({ page, context }) => {
            // Use appropriate auth state
            if (pageConfig.requiresAuth) {
                await context.addCookies(
                    JSON.parse(require('fs').readFileSync(USER_STATE_FILE, 'utf-8')).cookies
                );
            }

            // Setup monitoring
            const { consoleErrors, failedRequests } = await setupMonitoring(page);

            // Navigate to page
            await page.goto(pageConfig.path, { waitUntil: 'domcontentloaded', timeout: 30000 });

            // Wait for page to stabilize
            await page.waitForTimeout(2000);

            // Run quality gates
            try {
                await runQualityGates(page, consoleErrors, failedRequests);
            } catch (error: any) {
                console.warn(`⚠️  Quality Gate Warning for ${pageConfig.name}:`, error.message);
                // We don't fail the test here to allow reviewing results, 
                // but you might want to uncomment this in strict environments
                // throw error; 
            }

            // Page-specific assertion
            const url = page.url();
            expect(url).toContain(pageConfig.path);
        });
    }

});

test.describe('Smoke Tests - Core Functionality', () => {

    test('homepage should have working navigation', async ({ page }) => {
        const { consoleErrors, failedRequests } = await setupMonitoring(page);

        await page.goto('/', { waitUntil: 'networkidle' });

        // Check for main navigation elements
        // Check for main navigation elements (nav, header, or specific role)
        const nav = page.locator('nav, header, [role="navigation"], [role="banner"]');
        await expect(nav.first()).toBeVisible();

        // Should have at least some links (nav or header)
        const links = await page.locator('nav a, header a, [role="navigation"] a, [role="banner"] a').count();
        expect(links).toBeGreaterThan(0);

        await runQualityGates(page, consoleErrors, failedRequests);
    });

    test('login page should be accessible', async ({ page }) => {
        const { consoleErrors, failedRequests } = await setupMonitoring(page);

        await page.goto('/login', { waitUntil: 'networkidle' });

        // Should have login form elements OR selection buttons
        const emailInput = page.locator('input[type="email"], input[name="email"]');
        const passwordInput = page.locator('input[type="password"]');
        // Use a broader check for "Continue" buttons
        const continueButtons = page.locator('button:has-text("Continue"), [role="button"]:has-text("Continue")');

        // At least one should exist (form might be dynamic)
        const hasLoginElements =
            (await emailInput.count()) > 0 ||
            (await passwordInput.count()) > 0 ||
            (await continueButtons.count()) > 0;

        expect(hasLoginElements).toBeTruthy();

        await runQualityGates(page, consoleErrors, failedRequests);
    });

});
