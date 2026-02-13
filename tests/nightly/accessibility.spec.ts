import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { criticalPages } from '../../config/keyPages';

/**
 * Accessibility Tests - Nightly Only
 * Runs axe-core validation on key pages
 */

test.describe('Accessibility - Key Pages', () => {

    test.slow(); // Mark as slow test

    for (const pageConfig of criticalPages) {
        test(`should have no critical a11y violations on ${pageConfig.name}`, async ({ page }) => {
            await page.goto(pageConfig.path, { waitUntil: 'networkidle' });

            // Run axe accessibility scan
            const accessibilityScanResults = await new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa'])
                .analyze();

            // Get critical violations
            const criticalViolations = accessibilityScanResults.violations.filter(
                v => v.impact === 'critical' || v.impact === 'serious'
            );

            if (criticalViolations.length > 0) {
                console.log(`\n⚠️  Accessibility violations on ${pageConfig.name}:`);
                criticalViolations.forEach(violation => {
                    console.log(`  - ${violation.id}: ${violation.description}`);
                    console.log(`    Impact: ${violation.impact}`);
                    console.log(`    Affected elements: ${violation.nodes.length}`);
                });
            }

            // Only fail on critical violations
            const critical = criticalViolations.filter(v => v.impact === 'critical');
            expect(critical.length).toBe(0);
        });
    }

});
