import { Page, expect } from '@playwright/test';
import { isInternalRequest, shouldIgnoreErrors } from '../config/networkRules';

/**
 * Quality Gates - Global assertions for every page visit
 */

export interface ConsoleMessage {
    type: string;
    text: string;
}

export interface NetworkRequest {
    url: string;
    status: number;
    method: string;
}

export interface QualityGateResults {
    consoleErrors: ConsoleMessage[];
    networkFailures: NetworkRequest[];
    isPageBlank: boolean;
    hasCoreLayout: boolean;
}

/**
 * Assert no console errors (excluding allowlisted patterns)
 */
export async function assertNoConsoleErrors(
    page: Page,
    collectedErrors: ConsoleMessage[]
): Promise<void> {
    const allowedPatterns = [
        'favicon.ico', // Common benign error
        'Could not load', // Sometimes innocuous
        'Failed to load resource', // Ignore 404s in console
        'WebSocket connection', // Ignore socket failures
        'frame-ancestors', // Ignore Google iframe CSP errors
        'Content Security Policy', // Ignore CSP reports
        // Add more patterns as needed
    ];

    const significantErrors = collectedErrors.filter(error => {
        // Ignore third-party errors
        const isThirdParty = shouldIgnoreErrors(error.text);
        if (isThirdParty) return false;

        // Ignore allowed patterns
        const isAllowed = allowedPatterns.some(pattern =>
            error.text.includes(pattern)
        );

        return !isAllowed;
    });

    if (significantErrors.length > 0) {
        const errorMessages = significantErrors.map(e => `  - ${e.text}`).join('\n');
        throw new Error(
            `❌ Console errors detected:\n${errorMessages}`
        );
    }
}

/**
 * Assert no critical network failures (4xx/5xx on internal requests)
 */
export async function assertNoBadNetworkResponses(
    failedRequests: NetworkRequest[]
): Promise<void> {
    const criticalFailures = failedRequests.filter(req => {
        // Only care about internal requests
        if (!isInternalRequest(req.url)) return false;

        // Ignore expected failures
        if (shouldIgnoreErrors(req.url)) return false;

        // Critical failures: 5xx or 4xx (except 404 which might be expected)
        return req.status >= 500 || (req.status >= 400 && req.status !== 404);
    });

    if (criticalFailures.length > 0) {
        const failures = criticalFailures.map(r =>
            `  - ${r.method} ${r.url} → ${r.status}`
        ).join('\n');

        throw new Error(
            `❌ Critical network failures detected:\n${failures}`
        );
    }
}

/**
 * Assert page is not blank
 */
export async function assertPageNotBlank(page: Page): Promise<void> {
    const bodyText = await page.locator('body').textContent();

    if (!bodyText || bodyText.trim().length < 50) {
        throw new Error('❌ Page appears to be blank (body text < 50 characters)');
    }
}

/**
 * Assert core navigation/layout is present
 */
export async function assertCoreNavigationWorks(page: Page): Promise<void> {
    // Look for common layout elements (adjust based on actual site)
    const hasNav = await page.locator('nav, [role="navigation"], header').count() > 0;
    const hasContent = await page.locator('main, [role="main"], .content, #content').count() > 0;

    if (!hasNav && !hasContent) {
        throw new Error(
            '❌ Page layout broken: No navigation or main content area detected'
        );
    }
}

/**
 * Run all quality gates on a page
 */
export async function runQualityGates(
    page: Page,
    consoleErrors: ConsoleMessage[],
    failedRequests: NetworkRequest[]
): Promise<void> {
    // Run all assertions
    await assertNoConsoleErrors(page, consoleErrors);
    await assertNoBadNetworkResponses(failedRequests);
    await assertPageNotBlank(page);
    await assertCoreNavigationWorks(page);
}

/**
 * Setup console and network monitoring for a page
 */
export async function setupMonitoring(page: Page): Promise<{
    consoleErrors: ConsoleMessage[];
    failedRequests: NetworkRequest[];
}> {
    const consoleErrors: ConsoleMessage[] = [];
    const failedRequests: NetworkRequest[] = [];

    // Monitor console
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push({
                type: msg.type(),
                text: msg.text(),
            });
        }
    });

    // Monitor network failures
    page.on('response', response => {
        if (response.status() >= 400) {
            failedRequests.push({
                url: response.url(),
                status: response.status(),
                method: response.request().method(),
            });
        }
    });

    return { consoleErrors, failedRequests };
}
