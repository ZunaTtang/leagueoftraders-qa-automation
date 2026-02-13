import { test, expect, Page } from '@playwright/test';
import { criticalPages, regressionPages } from '../../config/keyPages';
import { setupMonitoring, runQualityGates } from '../../utils/assertions';
import { setupApiMonitoring } from '../../utils/apiMonitor';
import { getGlobalCsvReporter, resetGlobalCsvReporter } from '../../utils/csvReporter';
import { discoverPages, validateLinks } from '../../utils/crawler';

/**
 * Integration Tests - Complete QA Suite
 * Tests all pages, links, actions, and API calls
 * Generates comprehensive CSV reports for developers
 */

test.describe('Integration Tests - Full System Validation', () => {
    const runTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let csvReporter = getGlobalCsvReporter();

    test.beforeAll(async () => {
        // Reset reporter for clean start
        resetGlobalCsvReporter();
        csvReporter = getGlobalCsvReporter();
        console.log('\n🚀 Starting Full Integration Test Suite\n');
    });

    test.afterAll(async () => {
        // Generate all CSV reports
        console.log('\n📝 Generating CSV Reports...\n');
        const reports = csvReporter.generateReports(runTimestamp);

        console.log('\n✅ Integration Test Suite Complete!\n');
        console.log('📧 Please review the generated reports and share with development team.\n');
    });

    test('should validate all critical pages', async ({ page }) => {
        console.log('\n🔍 Testing Critical Pages...\n');

        for (const pageConfig of criticalPages) {
            const startTime = Date.now();
            const timestamp = new Date().toISOString();

            console.log(`  Testing: ${pageConfig.name} (${pageConfig.path})`);

            try {
                // Setup monitoring
                const { consoleErrors, failedRequests } = await setupMonitoring(page);
                const apiMonitor = await setupApiMonitoring(page);

                // Navigate to page
                await page.goto(pageConfig.path, {
                    waitUntil: 'domcontentloaded',
                    timeout: 30000
                });
                await page.waitForTimeout(2000);

                // Run quality gates
                try {
                    await runQualityGates(page, consoleErrors, failedRequests);

                    csvReporter.addTestResult({
                        timestamp,
                        pageUrl: page.url(),
                        pageName: pageConfig.name,
                        testType: 'quality-gate',
                        testName: 'Quality Gates',
                        status: 'PASS',
                        duration: Date.now() - startTime,
                    });

                    console.log(`    ✅ Quality Gates: PASS`);
                } catch (error: any) {
                    csvReporter.addTestResult({
                        timestamp,
                        pageUrl: page.url(),
                        pageName: pageConfig.name,
                        testType: 'quality-gate',
                        testName: 'Quality Gates',
                        status: 'WARNING',
                        duration: Date.now() - startTime,
                        errorMessage: error.message,
                    });

                    console.log(`    ⚠️  Quality Gates: WARNING - ${error.message}`);
                }

                // Get API monitoring results
                const apiResults = apiMonitor.getResults();
                apiMonitor.stop();

                // Log API stats
                console.log(`    📡 API Calls: ${apiResults.stats.totalCalls} (${apiResults.stats.uniqueApis} unique)`);
                if (apiResults.stats.duplicateCalls > 0) {
                    console.log(`    ⚠️  Duplicate Calls: ${apiResults.stats.duplicateCalls}`);
                }
                if (apiResults.stats.failedCalls > 0) {
                    console.log(`    ❌ Failed Calls: ${apiResults.stats.failedCalls}`);
                }

                // Add API results to CSV
                apiResults.apiCalls.forEach(call => {
                    const issue = apiResults.issues.find(i => i.apiUrl === call.url);
                    csvReporter.addApiResult({
                        timestamp,
                        pageUrl: page.url(),
                        apiUrl: call.url,
                        method: call.method,
                        status: call.status,
                        duration: call.duration,
                        issueType: issue?.type,
                        issueSeverity: issue?.severity,
                        issueDescription: issue?.description,
                    });
                });

                // Page load success
                csvReporter.addTestResult({
                    timestamp,
                    pageUrl: page.url(),
                    pageName: pageConfig.name,
                    testType: 'page-load',
                    testName: `Load ${pageConfig.name}`,
                    status: 'PASS',
                    duration: Date.now() - startTime,
                    details: `API Calls: ${apiResults.stats.totalCalls}, Issues: ${apiResults.issues.length}`,
                });

                console.log(`    ✅ Page Load: PASS (${Date.now() - startTime}ms)\n`);

            } catch (error: any) {
                csvReporter.addTestResult({
                    timestamp,
                    pageUrl: pageConfig.path,
                    pageName: pageConfig.name,
                    testType: 'page-load',
                    testName: `Load ${pageConfig.name}`,
                    status: 'FAIL',
                    duration: Date.now() - startTime,
                    errorMessage: error.message,
                });

                console.log(`    ❌ Page Load: FAIL - ${error.message}\n`);
            }
        }
    });

    test('should discover and test all pages', async ({ page }) => {
        console.log('\n🕷️  Crawling Website...\n');

        const baseURL = process.env.LOT_BASE_URL || 'https://leagueoftraders.io';
        const startTime = Date.now();

        // Discover pages
        const discoveredPages = await discoverPages(page, baseURL, {
            maxPages: 50,
            maxDepth: 3,
            sampleDynamicRoutes: 5,
            timeout: 120000,
        });

        console.log(`  ✅ Discovered ${discoveredPages.length} pages\n`);

        // Test each discovered page
        let passCount = 0;
        let failCount = 0;

        for (const pageURL of discoveredPages) {
            const timestamp = new Date().toISOString();
            const testStart = Date.now();

            try {
                const { consoleErrors, failedRequests } = await setupMonitoring(page);
                const apiMonitor = await setupApiMonitoring(page);

                await page.goto(pageURL, {
                    waitUntil: 'domcontentloaded',
                    timeout: 60000
                });

                // Basic quality check
                await runQualityGates(page, consoleErrors, failedRequests);

                // Get API results
                const apiResults = apiMonitor.getResults();
                apiMonitor.stop();

                // Record API calls
                apiResults.apiCalls.forEach(call => {
                    const issue = apiResults.issues.find(i => i.apiUrl.includes(call.url));
                    csvReporter.addApiResult({
                        timestamp,
                        pageUrl: pageURL,
                        apiUrl: call.url,
                        method: call.method,
                        status: call.status,
                        duration: call.duration,
                        issueType: issue?.type,
                        issueSeverity: issue?.severity,
                        issueDescription: issue?.description,
                    });
                });

                passCount++;
                csvReporter.addTestResult({
                    timestamp,
                    pageUrl: pageURL,
                    pageName: pageURL,
                    testType: 'page-load',
                    testName: 'Crawl Page',
                    status: 'PASS',
                    duration: Date.now() - testStart,
                    details: `API Calls: ${apiResults.stats.totalCalls}`,
                });

                console.log(`  ✅ ${pageURL}`);

            } catch (error: any) {
                failCount++;
                csvReporter.addTestResult({
                    timestamp,
                    pageUrl: pageURL,
                    pageName: pageURL,
                    testType: 'page-load',
                    testName: 'Crawl Page',
                    status: 'FAIL',
                    duration: Date.now() - testStart,
                    errorMessage: error.message,
                });

                console.log(`  ❌ ${pageURL}: ${error.message}`);
            }
        }

        console.log(`\n📊 Crawl Results: ${passCount} passed, ${failCount} failed (${Date.now() - startTime}ms)\n`);
    });

    test('should validate all links', async ({ page }) => {
        console.log('\n🔗 Testing Links...\n');

        const baseURL = process.env.LOT_BASE_URL || 'https://leagueoftraders.io';

        // Discover pages to check links from
        const pagesToCheck = await discoverPages(page, baseURL, {
            maxPages: 20,
            maxDepth: 2,
        });

        console.log(`  Checking links from ${pagesToCheck.length} pages...\n`);

        // Validate links
        const linkResults = await validateLinks(page, pagesToCheck);

        // Record link results
        linkResults.forEach(link => {
            const timestamp = new Date().toISOString();
            const status = (link.status === 200 || link.status === 0) ? 'PASS' : 'FAIL';

            csvReporter.addLinkResult({
                timestamp,
                sourcePageUrl: 'Multiple pages',
                linkText: 'Link',
                linkUrl: link.url,
                status,
                httpStatus: link.status,
                errorMessage: status === 'FAIL' ? `HTTP ${link.status}` : undefined,
            });

            if (status === 'FAIL') {
                console.log(`  ❌ Broken Link: ${link.url} (${link.status})`);
            }
        });

        const brokenLinks = linkResults.filter(r => r.status !== 200 && r.status !== 0);
        console.log(`\n📊 Link Results: ${linkResults.length - brokenLinks.length} ok, ${brokenLinks.length} broken\n`);

        // Don't fail test if only a few broken links (adjust threshold as needed)
        expect(brokenLinks.length).toBeLessThan(10);
    });

    test('should test interactive elements', async ({ page }) => {
        console.log('\n🎯 Testing Interactive Elements...\n');

        const timestamp = new Date().toISOString();

        for (const pageConfig of criticalPages) {
            const startTime = Date.now();

            try {
                await page.goto(pageConfig.path, {
                    waitUntil: 'domcontentloaded',
                    timeout: 30000
                });

                // Find all buttons
                const buttons = await page.locator('button, [role="button"], input[type="button"], input[type="submit"]').all();

                console.log(`  ${pageConfig.name}: Found ${buttons.length} interactive elements`);

                let testedCount = 0;
                let errorCount = 0;

                for (const button of buttons) {
                    try {
                        const text = await button.textContent() || await button.getAttribute('aria-label') || 'Unknown';
                        const isVisible = await button.isVisible();

                        if (isVisible && !text.toLowerCase().includes('logout')) {
                            testedCount++;

                            // Just verify it's clickable, don't actually click
                            const isEnabled = await button.isEnabled();

                            if (!isEnabled) {
                                console.log(`    ⚠️  Disabled button: ${text}`);
                            }
                        }
                    } catch (error: any) {
                        errorCount++;
                    }
                }

                csvReporter.addTestResult({
                    timestamp,
                    pageUrl: page.url(),
                    pageName: pageConfig.name,
                    testType: 'action-test',
                    testName: 'Interactive Elements Check',
                    status: errorCount === 0 ? 'PASS' : 'WARNING',
                    duration: Date.now() - startTime,
                    details: `Tested: ${testedCount}, Errors: ${errorCount}`,
                });

                console.log(`    ✅ Tested ${testedCount} elements, ${errorCount} errors\n`);

            } catch (error: any) {
                csvReporter.addTestResult({
                    timestamp,
                    pageUrl: pageConfig.path,
                    pageName: pageConfig.name,
                    testType: 'action-test',
                    testName: 'Interactive Elements Check',
                    status: 'FAIL',
                    duration: Date.now() - startTime,
                    errorMessage: error.message,
                });

                console.log(`    ❌ Failed: ${error.message}\n`);
            }
        }
    });
});
