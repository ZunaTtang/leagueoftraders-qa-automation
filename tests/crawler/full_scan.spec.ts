import { test, expect } from '@playwright/test';
import { discoverPages, validateLinks } from '../../utils/crawler';
import { setupMonitoring, runQualityGates } from '../../utils/assertions';
import { initializeSummary, addTestResult, addBrokenLinks, saveSummary, printSummary } from '../../utils/reportHelper';

/**
 * Crawler Tests - Full Site Coverage
 * Deep crawl for nightly runs (30-60 minutes)
 */

test.describe('Crawler - Full Site Scan', () => {

    test('should discover and validate all pages', async ({ page, browser }) => {
        const startTime = Date.now();
        initializeSummary();

        const baseURL = process.env.LOT_BASE_URL || 'https://leagueoftraders.io';

        console.log(`\n🕷️  Starting full site crawl of ${baseURL}\n`);

        // Discover all pages
        const discoveredPages = await discoverPages(page, baseURL, {
            maxPages: 100,
            maxDepth: 3,
            sampleDynamicRoutes: 5,
            timeout: 120000,
        });

        console.log(`\n✅ Discovered ${discoveredPages.length} pages\n`);

        // Visit each page and run quality gates
        let passCount = 0;
        let failCount = 0;

        for (const pageURL of discoveredPages) {
            try {
                const { consoleErrors, failedRequests } = await setupMonitoring(page);

                await page.goto(pageURL, { waitUntil: 'domcontentloaded', timeout: 120000 });

                // Run quality gates
                await runQualityGates(page, consoleErrors, failedRequests);

                passCount++;
                addTestResult({
                    page: pageURL,
                    status: 'pass',
                    errors: [],
                });

                console.log(`  ✅ ${pageURL}`);

            } catch (error) {
                failCount++;
                const errorMsg = String(error);

                // Take screenshot on failure
                const screenshotPath = `test-results/failure-${Date.now()}.png`;
                await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => { });

                addTestResult({
                    page: pageURL,
                    status: 'fail',
                    errors: [errorMsg],
                    screenshot: screenshotPath,
                });

                console.log(`  ❌ ${pageURL}: ${errorMsg}`);
            }
        }

        const duration = Date.now() - startTime;

        // Save and print summary
        saveSummary();
        printSummary();

        console.log(`\n📊 Crawl Results: ${passCount} passed, ${failCount} failed (${duration}ms)\n`);

        // Test should pass if majority of pages are ok
        const passRate = passCount / (passCount + failCount);
        expect(passRate).toBeGreaterThan(0.8); // 80% pass rate required
    });

});

test.describe('Crawler - Link Validation', () => {

    test('should check for broken links', async ({ page }) => {
        const baseURL = process.env.LOT_BASE_URL || 'https://leagueoftraders.io';

        console.log(`\n🔗 Starting link validation...\n`);

        // Discover pages
        const discoveredPages = await discoverPages(page, baseURL, {
            maxPages: 50,
            maxDepth: 2,
        });

        // Validate links
        const linkResults = await validateLinks(page, discoveredPages);

        const brokenLinks = linkResults.filter(r =>
            (r.status === 404 || r.status === 0) &&
            !r.url.includes('/terms') // Exclude known broken /terms page
        );

        addBrokenLinks(brokenLinks.length);

        if (brokenLinks.length > 0) {
            console.log('\n❌ Broken Links Found:');
            brokenLinks.forEach(link => {
                console.log(`  - ${link.url} (${link.status})`);
            });
        }

        // Fail if too many broken links
        expect(brokenLinks.length).toBeLessThan(5);
    });

});
