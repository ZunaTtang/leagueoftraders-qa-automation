import { test, expect, BrowserContext } from '@playwright/test';
import fs from 'fs';
import { regressionPages } from '../../config/keyPages';
import { setupMonitoring, runQualityGates } from '../../utils/assertions';
import { testPageButtons, testNavigationLinks } from '../../utils/interactions';
import { USER_STATE_FILE } from '../../utils/auth';

async function loadCookiesIfAvailable(context: BrowserContext): Promise<void> {
    if (!fs.existsSync(USER_STATE_FILE)) return;

    const state = JSON.parse(fs.readFileSync(USER_STATE_FILE, 'utf-8'));
    if (Array.isArray(state.cookies) && state.cookies.length > 0) {
        await context.addCookies(state.cookies);
    }
}

test.describe('Regression - Safe Button Interactions', () => {
    test.beforeEach(async ({ context }) => {
        await loadCookiesIfAvailable(context);
    });

    for (const pageConfig of regressionPages.filter(page => page.priority === 'critical' || page.priority === 'high')) {
        test(`should safely test buttons on ${pageConfig.name}`, async ({ page }) => {
            const { consoleErrors, failedRequests } = await setupMonitoring(page);
            await page.goto(pageConfig.path, { waitUntil: 'domcontentloaded', timeout: 120000 });

            const buttonResults = await testPageButtons(page);
            console.log(`Tested ${buttonResults.length} buttons on ${pageConfig.name}`);

            const criticalFailures = buttonResults.filter(
                result => result.action === 'failed' && result.error && !result.error.includes('timeout')
            );

            if (criticalFailures.length > 0) {
                console.log(`Failed buttons on ${pageConfig.name}:`);
                criticalFailures.forEach(failure => console.log(`- ${failure.error}`));
            }

            expect(criticalFailures.length).toBe(0);
            await runQualityGates(page, consoleErrors, failedRequests);
        });
    }
});

test.describe('Regression - Navigation', () => {
    test('should validate main navigation links', async ({ page }) => {
        const { consoleErrors, failedRequests } = await setupMonitoring(page);
        await page.goto('/', { waitUntil: 'networkidle' });

        const navResults = await testNavigationLinks(page);
        console.log(`Validated ${navResults.length} navigation links`);

        const invalidNav = navResults.filter(result => !result.success && result.action !== 'skipped');
        expect(invalidNav.length).toBe(0);

        await runQualityGates(page, consoleErrors, failedRequests);
    });

    test('should navigate between configured regression pages', async ({ page, context }) => {
        await loadCookiesIfAvailable(context);

        for (const pageConfig of regressionPages) {
            const { consoleErrors, failedRequests } = await setupMonitoring(page);
            await page.goto(pageConfig.path, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await expect(page).not.toHaveURL(/(404|not-found|error)/i);
            await runQualityGates(page, consoleErrors, failedRequests);
        }
    });
});
