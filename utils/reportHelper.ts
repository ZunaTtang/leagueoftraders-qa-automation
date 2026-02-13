import fs from 'fs';
import path from 'path';

/**
 * Report Helper - Generate comprehensive test summaries
 */

export interface TestSummary {
    timestamp: string;
    totalPages: number;
    passedPages: number;
    failedPages: number;
    brokenLinks: number;
    consoleErrorPages: number;
    networkFailurePages: number;
    duration: number;
    details: TestDetail[];
}

export interface TestDetail {
    page: string;
    status: 'pass' | 'fail';
    errors: string[];
    screenshot?: string;
    trace?: string;
}

let testSummary: TestSummary = {
    timestamp: new Date().toISOString(),
    totalPages: 0,
    passedPages: 0,
    failedPages: 0,
    brokenLinks: 0,
    consoleErrorPages: 0,
    networkFailurePages: 0,
    duration: 0,
    details: [],
};

/**
 * Initialize summary
 */
export function initializeSummary(): void {
    testSummary = {
        timestamp: new Date().toISOString(),
        totalPages: 0,
        passedPages: 0,
        failedPages: 0,
        brokenLinks: 0,
        consoleErrorPages: 0,
        networkFailurePages: 0,
        duration: 0,
        details: [],
    };
}

/**
 * Add test result to summary
 */
export function addTestResult(detail: TestDetail): void {
    testSummary.totalPages++;
    testSummary.details.push(detail);

    if (detail.status === 'pass') {
        testSummary.passedPages++;
    } else {
        testSummary.failedPages++;

        // Count specific error types
        detail.errors.forEach(error => {
            if (error.includes('Console errors')) {
                testSummary.consoleErrorPages++;
            }
            if (error.includes('network failures')) {
                testSummary.networkFailurePages++;
            }
        });
    }
}

/**
 * Add broken link count
 */
export function addBrokenLinks(count: number): void {
    testSummary.brokenLinks += count;
}

/**
 * Set test duration
 */
export function setDuration(ms: number): void {
    testSummary.duration = ms;
}

/**
 * Save summary to JSON file
 */
export function saveSummary(outputPath: string = 'qa-summary.json'): void {
    const fullPath = path.join(process.cwd(), outputPath);
    fs.writeFileSync(fullPath, JSON.stringify(testSummary, null, 2));
    console.log(`\n📊 Summary saved to: ${fullPath}`);
}

/**
 * Print console summary table
 */
export function printSummary(): void {
    const passRate = testSummary.totalPages > 0
        ? ((testSummary.passedPages / testSummary.totalPages) * 100).toFixed(1)
        : '0.0';

    console.log('\n' + '='.repeat(60));
    console.log('📊 QA AUTOMATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`🕒 Timestamp:           ${testSummary.timestamp}`);
    console.log(`⏱️  Duration:            ${(testSummary.duration / 1000).toFixed(1)}s`);
    console.log(`📄 Total Pages:         ${testSummary.totalPages}`);
    console.log(`✅ Passed:              ${testSummary.passedPages} (${passRate}%)`);
    console.log(`❌ Failed:              ${testSummary.failedPages}`);
    console.log(`🔗 Broken Links:        ${testSummary.brokenLinks}`);
    console.log(`🖥️  Console Errors:      ${testSummary.consoleErrorPages} pages`);
    console.log(`🌐 Network Failures:    ${testSummary.networkFailurePages} pages`);
    console.log('='.repeat(60));

    if (testSummary.failedPages > 0) {
        console.log('\n❌ FAILED PAGES:');
        testSummary.details
            .filter(d => d.status === 'fail')
            .forEach(detail => {
                console.log(`\n  📄 ${detail.page}`);
                detail.errors.forEach(err => console.log(`     ⚠️  ${err}`));
                if (detail.screenshot) {
                    console.log(`     📸 Screenshot: ${detail.screenshot}`);
                }
                if (detail.trace) {
                    console.log(`     🔍 Trace: ${detail.trace}`);
                }
            });
    }

    console.log('\n' + '='.repeat(60) + '\n');
}

/**
 * Get current summary
 */
export function getSummary(): TestSummary {
    return testSummary;
}
