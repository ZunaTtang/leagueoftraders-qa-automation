import { Browser, Page, test } from '@playwright/test';
import fs from 'fs';
import { setupMonitoring, ConsoleMessage, NetworkRequest, assertPageNotBlank, assertCoreNavigationWorks } from './assertions';
import { isInternalURL } from './crawlerDiscovery';

export interface ValidationOptions {
    maxConcurrency?: number;
    pageTimeout?: number;
    outputFile?: string;
    summaryFile?: string;
}

export interface ValidationResult {
    url: string;
    status: 'pass' | 'critical' | 'warning';
    severity: 'critical' | 'warning' | 'none';
    duration: number;
    failureReason?: string;
    is404FalsePositive: boolean;
    redirectedTo?: string;
    consoleErrors: ConsoleMessage[];
    failedRequests: NetworkRequest[];
    timestamp: string;
}

export interface ValidationSummary {
    totalPages: number;
    passed: number;
    critical: number;
    warning: number;
    averageDuration: number;
    slowestPage: { url: string; duration: number };
    falsePositives404: number;
    durationMs: number;
    failuresByCategory: Record<string, number>;
}

/**
 * Validate a single page with quality gates and failure classification
 */
export async function validatePage(
    page: Page,
    url: string,
    timeout: number
): Promise<ValidationResult> {
    const startTime = Date.now();
    const result: ValidationResult = {
        url,
        status: 'pass',
        severity: 'none',
        duration: 0,
        is404FalsePositive: false,
        consoleErrors: [],
        failedRequests: [],
        timestamp: new Date().toISOString()
    };

    try {
        // 1. Setup Monitoring
        const { consoleErrors, failedRequests } = await setupMonitoring(page);

        // 2. Visit Page
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
        const finalUrl = page.url();
        const duration = Date.now() - startTime;
        result.duration = duration;
        result.consoleErrors = consoleErrors;
        result.failedRequests = failedRequests;

        // 3. Smart 404 & Redirect Check
        if (response?.status() === 404) {
            // Check for SPA soft 404 (document is valid but content says 404)
            const bodyText = await page.textContent('body');
            const isSpa404 = bodyText?.includes('404') || bodyText?.includes('Page Not Found');

            // Check if it's actually an auth redirect
            if (finalUrl.includes('/login') || finalUrl.includes('signin')) {
                result.redirectedTo = finalUrl;
                result.is404FalsePositive = true;
                result.status = 'warning';
                result.severity = 'warning';
                result.failureReason = 'auth_redirect';
                return result;
            }

            // If real 404
            result.status = 'warning';
            result.severity = 'warning';
            result.failureReason = '404';
            return result;
        }

        // 4. Critical Checks (5xx, Crash, Blank)
        if (response && response.status() >= 500) {
            result.status = 'critical';
            result.severity = 'critical';
            result.failureReason = '5xx';
            return result;
        }

        try {
            await assertPageNotBlank(page);
        } catch (e) {
            result.status = 'critical';
            result.severity = 'critical';
            result.failureReason = 'blank_page';
            return result;
        }

        // 5. Warning Checks (Console, Network, Layout)
        // Console Errors
        const significantConsoleErrors = consoleErrors.filter(e =>
            !['favicon.ico', 'stripe', 'intercom'].some(ignore => e.text.includes(ignore))
        );
        if (significantConsoleErrors.length > 0) {
            result.status = 'warning';
            result.severity = 'warning';
            result.failureReason = 'console_error';
        }

        // Network Failures (4xx except 404)
        const badRequests = failedRequests.filter(r => r.status >= 400 && r.status !== 404 && isInternalURL(r.url, url));
        if (badRequests.length > 0) {
            if (result.status !== 'critical') {
                result.status = 'warning';
                result.severity = 'warning';
                result.failureReason = 'network_failure';
            }
        }

        return result;

    } catch (error: any) {
        result.duration = Date.now() - startTime;

        if (error.name === 'TimeoutError' || String(error).includes('Timeout')) {
            result.status = 'warning';
            result.severity = 'warning';
            result.failureReason = 'timeout';
        } else {
            result.status = 'critical';
            result.severity = 'critical';
            result.failureReason = 'crash';
            result.consoleErrors.push({ type: 'error', text: String(error) });
        }

        return result;
    }
}

/**
 * Run parallel validation on a list of URLs
 */
export async function validateURLsInParallel(
    browser: Browser,
    urls: string[],
    options: ValidationOptions = {}
): Promise<ValidationResult[]> {
    const {
        maxConcurrency = 5,
        pageTimeout = 30000,
        outputFile,
        summaryFile
    } = options;

    console.log(`\n🚦 Starting Validation for ${urls.length} URLs (Concurrency: ${maxConcurrency}, Timeout: ${pageTimeout}ms)`);

    const queue = [...urls];
    const results: ValidationResult[] = [];
    const startTime = Date.now();
    let completedCount = 0;

    const worker = async (id: number) => {
        // Create a new context/page per worker to ensure isolation
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            while (queue.length > 0) {
                const url = queue.shift();
                if (!url) break;

                // Log progress
                console.log(`[Worker ${id}] Validating (${completedCount + 1}/${urls.length}): ${url}`);

                const result = await validatePage(page, url, pageTimeout);
                results.push(result);
                completedCount++;

                const symbol = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
                console.log(`   ${symbol} ${result.status.toUpperCase()} (${result.failureReason || 'OK'}) - ${result.duration}ms`);
            }
        } finally {
            await context.close();
        }
    };

    // Start workers
    const workers = Array.from({ length: Math.min(maxConcurrency, urls.length) }, (_, i) => worker(i + 1));
    await Promise.all(workers);

    const durationMs = Date.now() - startTime;

    // Generate Summary
    const summary: ValidationSummary = {
        totalPages: results.length,
        passed: results.filter(r => r.status === 'pass').length,
        critical: results.filter(r => r.status === 'critical').length,
        warning: results.filter(r => r.status === 'warning').length,
        averageDuration: Math.round(results.reduce((acc, r) => acc + r.duration, 0) / results.length) || 0,
        slowestPage: results.reduce((max, r) => r.duration > max.duration ? { url: r.url, duration: r.duration } : max, { url: '', duration: 0 }),
        falsePositives404: results.filter(r => r.is404FalsePositive).length,
        durationMs,
        failuresByCategory: results.reduce((acc, r) => {
            if (r.failureReason) {
                acc[r.failureReason] = (acc[r.failureReason] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>)
    };

    // Save Output
    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
        console.log(`\n💾 Saved results to ${outputFile}`);
    }
    if (summaryFile) {
        fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
        console.log(`💾 Saved summary to ${summaryFile}`);
    }

    console.log(`\n🏁 Validation Complete in ${durationMs}ms`);
    console.log(`   Pass: ${summary.passed} | Critical: ${summary.critical} | Warning: ${summary.warning}`);

    return results;
}
