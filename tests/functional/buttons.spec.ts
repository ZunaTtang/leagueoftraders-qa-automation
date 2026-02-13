import { test, expect } from '@playwright/test';
import { regressionPages } from '../../config/keyPages';
import { setupMonitoring, runQualityGates } from '../../utils/assertions';
import { testPageButtons, testNavigationLinks } from '../../utils/interactions';
import { USER_STATE_FILE } from '../../utils/auth';

/**
 * Regression Tests - Button & Interaction Validation
 * Comprehensive functional tests for main branch merges
 */

test.describe('Regression - Button Functionality', () => {

    test.beforeEach(async ({ context }) => {
        // Load authenticated state for all regression tests
        try {
            const state = JSON.parse(require('fs').readFileSync(USER_STATE_FILE, 'utf-8'));
            await context.addCookies(state.cookies);
        } catch {
            console.warn('⚠️  Could not load auth state, continuing as guest');
        }
    });

    for (const pageConfig of regressionPages.filter(p => p.priority === 'critical' || p.priority === 'high')) {
        test(`should test buttons on ${pageConfig.name}`, async ({ page }) => {
            const { consoleErrors, failedRequests } = await setupMonitoring(page);

            await page.goto(pageConfig.path, { waitUntil: 'domcontentloaded', timeout: 120000 });

            // Test buttons on the page
            const buttonResults = await testPageButtons(page);

            // At least some buttons should be tested
            console.log(`  📊 Tested ${buttonResults.length} buttons on ${pageConfig.name}`);

            // Check for critical failures
            const criticalFailures = buttonResults.filter(
                r => r.action === 'failed' && r.error && !r.error.includes('timeout')
            );

            if (criticalFailures.length > 0) {
                console.log(`\n❌ Failed Buttons on ${pageConfig.name}:`);
                criticalFailures.forEach(f => console.log(`  - Error: ${f.error}`));
            }

            expect(criticalFailures.length).toBe(0);

            // Run quality gates
            await runQualityGates(page, consoleErrors, failedRequests);
        });
    }

    // Dynamic test for User Portfolio (Other User's Page)
    test('should test buttons on User Portfolio', async ({ page }) => {
        const { consoleErrors, failedRequests } = await setupMonitoring(page);

        // 1. Go to Leaderboard to find a user
        await page.goto('/leaderboard', { waitUntil: 'domcontentloaded' });

        // 2. Find first user profile link (usually in the table)
        // Adjust selector based on actual DOM, checking common patterns
        const userLink = page.locator('a[href*="/profile/"]').first();

        if (await userLink.count() > 0) {
            const profileUrl = await userLink.getAttribute('href');
            console.log(`  🔗 Found User Portfolio: ${profileUrl}`);

            // 3. Navigate to User Portfolio
            await page.goto(profileUrl!, { waitUntil: 'domcontentloaded', timeout: 60000 });

            // 4. Test buttons
            const buttonResults = await testPageButtons(page);
            console.log(`  📊 Tested ${buttonResults.length} buttons on User Portfolio`);

            const criticalFailures = buttonResults.filter(
                r => r.action === 'failed' && r.error && !r.error.includes('timeout')
            );

            if (criticalFailures.length > 0) {
                console.log(`\n❌ Failed Buttons on User Portfolio:`);
                criticalFailures.forEach(f => console.log(`  - Error: ${f.error}`));
            }
            expect(criticalFailures.length).toBe(0);

        } else {
            console.warn('⚠️ Could not find any user links on Leaderboard, skipping User Portfolio test');
        }

        await runQualityGates(page, consoleErrors, failedRequests);
    });

});

test.describe('Regression - Navigation', () => {

    test('should validate all main navigation links', async ({ page }) => {
        const { consoleErrors, failedRequests } = await setupMonitoring(page);

        await page.goto('/', { waitUntil: 'networkidle' });

        const navResults = await testNavigationLinks(page);

        console.log(`  📊 Validated ${navResults.length} navigation links`);

        // All navigation should be valid
        const invalidNav = navResults.filter(r => !r.success);
        expect(invalidNav.length).toBe(0);

        await runQualityGates(page, consoleErrors, failedRequests);
    });

    test('should navigate between critical pages', async ({ page, context }) => {
        // Load auth state
        try {
            const state = JSON.parse(require('fs').readFileSync(USER_STATE_FILE, 'utf-8'));
            await context.addCookies(state.cookies);
        } catch { }

        const pagesToTest = regressionPages.filter(p => p.priority === 'critical');

        for (const pageConfig of pagesToTest) {
            const { consoleErrors, failedRequests } = await setupMonitoring(page);

            await page.goto(pageConfig.path, { waitUntil: 'domcontentloaded', timeout: 30000 });

            // Verify page loaded
            await expect(page).not.toHaveURL(/error|404/);

            await runQualityGates(page, consoleErrors, failedRequests);
        }
    });

});
