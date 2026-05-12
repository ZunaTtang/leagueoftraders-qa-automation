import { test, expect } from '@playwright/test';
import { discoverPages, validateLinks } from '../../utils/crawler';
import { setupMonitoring, runQualityGates } from '../../utils/assertions';
import { initializeSummary, addTestResult, addBrokenLinks, saveSummary, printSummary } from '../../utils/reportHelper';
import { getBaseURL, getIgnoredBrokenLinkPatterns } from '../../utils/env';

test.describe('Crawler - Full Site Scan', () => {
    test('should discover and validate pages', async ({ page }) => {
        const startTime = Date.now();
        initializeSummary();

        const baseURL = getBaseURL();
        console.log(`Starting full site crawl of ${baseURL}`);

        const discoveredPages = await discoverPages(page, baseURL, {
            maxPages: 100,
            maxDepth: 3,
            sampleDynamicRoutes: 5,
            timeout: 120000,
        });

        console.log(`Discovered ${discoveredPages.length} pages`);

        let passCount = 0;
        let failCount = 0;

        for (const pageURL of discoveredPages) {
            try {
                const { consoleErrors, failedRequests } = await setupMonitoring(page);
                await page.goto(pageURL, { waitUntil: 'domcontentloaded', timeout: 120000 });
                await runQualityGates(page, consoleErrors, failedRequests);

                passCount++;
                addTestResult({
                    page: pageURL,
                    status: 'pass',
                    errors: [],
                });

                console.log(`PASS ${pageURL}`);
            } catch (error) {
                failCount++;
                const errorMsg = String(error);
                const screenshotPath = `test-results/failure-${Date.now()}.png`;
                await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);

                addTestResult({
                    page: pageURL,
                    status: 'fail',
                    errors: [errorMsg],
                    screenshot: screenshotPath,
                });

                console.log(`FAIL ${pageURL}: ${errorMsg}`);
            }
        }

        const duration = Date.now() - startTime;
        saveSummary();
        printSummary();

        console.log(`Crawl results: ${passCount} passed, ${failCount} failed (${duration}ms)`);

        const total = passCount + failCount;
        const passRate = total > 0 ? passCount / total : 0;
        expect(passRate).toBeGreaterThan(0.8);
    });
});

test.describe('Crawler - Link Validation', () => {
    test('should check for broken links', async ({ page }) => {
        const baseURL = getBaseURL();
        const ignoredPatterns = getIgnoredBrokenLinkPatterns();

        console.log('Starting link validation');

        const discoveredPages = await discoverPages(page, baseURL, {
            maxPages: 50,
            maxDepth: 2,
        });

        const linkResults = await validateLinks(page, discoveredPages);

        const brokenLinks = linkResults.filter(result => {
            const isBroken = result.status === 404 || result.status === 0;
            const isIgnored = ignoredPatterns.some(pattern => result.url.includes(pattern));
            return isBroken && !isIgnored;
        });

        addBrokenLinks(brokenLinks.length);

        if (brokenLinks.length > 0) {
            console.log('Broken links found:');
            brokenLinks.forEach(link => console.log(`- ${link.url} (${link.status})`));
        }

        expect(brokenLinks.length).toBeLessThan(5);
    });
});
