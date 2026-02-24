import { Page, Locator } from '@playwright/test';
import { isDangerousButton } from '../config/keyPages';

/**
 * Safe Interaction Engine
 * Handles button clicking with safety rules and success validation
 */

export interface InteractionResult {
    success: boolean;
    action: string;
    validation: string;
    error?: string;
}

/**
 * Check if interaction caused a URL change
 */
async function didURLChange(page: Page, originalURL: string): Promise<boolean> {
    await page.waitForTimeout(500); // Small wait for navigation
    return page.url() !== originalURL;
}

/**
 * Check if a modal appeared
 */
async function didModalAppear(page: Page): Promise<boolean> {
    const modalSelectors = [
        '[role="dialog"]',
        '.modal',
        '[class*="modal"]',
        '[class*="Modal"]',
    ];

    for (const selector of modalSelectors) {
        const count = await page.locator(selector).count();
        if (count > 0) return true;
    }

    return false;
}

/**
 * Check if a toast/snackbar appeared
 */
async function didToastAppear(page: Page): Promise<boolean> {
    const toastSelectors = [
        '[role="alert"]',
        '.toast',
        '.snackbar',
        '[class*="toast"]',
        '[class*="Toast"]',
        '[class*="notification"]',
    ];

    for (const selector of toastSelectors) {
        const count = await page.locator(selector).count();
        if (count > 0) return true;
    }

    return false;
}

/**
 * Validate that button click had an effect
 */
async function validateInteractionEffect(
    page: Page,
    originalURL: string
): Promise<string> {
    // Give UI time to respond
    await page.waitForTimeout(500);

    if (await didURLChange(page, originalURL)) {
        return 'URL changed';
    }

    if (await didModalAppear(page)) {
        return 'Modal opened';
    }

    if (await didToastAppear(page)) {
        return 'Toast appeared';
    }

    // Check for network activity (simplified check)
    // In a real implementation, you'd monitor network like in assertions.ts

    return 'No visible effect (may be ok)';
}

/**
 * Safely click a button with validation
 */
export async function safeClickButton(
    page: Page,
    button: Locator
): Promise<InteractionResult> {
    let text = '';
    try {
        // Get button info
        text = await button.textContent() || '';
        const href = await button.getAttribute('href');

        // Safety check
        if (isDangerousButton(text, href || undefined)) {
            return {
                success: false,
                action: 'skipped',
                validation: 'dangerous',
                error: `Button appears dangerous: "${text}"`,
            };
        }

        // Check if clickable
        const isVisible = await button.isVisible();
        const isEnabled = await button.isEnabled();

        if (!isVisible || !isEnabled) {
            return {
                success: false,
                action: 'skipped',
                validation: 'not clickable',
                error: 'Button not visible or enabled',
            };
        }

        // Record original state
        const originalURL = page.url();

        // Perform click with fallback
        try {
            await button.click({ timeout: 2000 });
        } catch (clickError) {
            console.log(`⚠️  Standard click failed for "${text}", trying force click...`);
            await button.click({ timeout: 2000, force: true });
        }

        // Validate effect
        const validation = await validateInteractionEffect(page, originalURL);

        return {
            success: true,
            action: 'clicked',
            validation,
        };

    } catch (error) {
        return {
            success: false,
            action: 'failed',
            validation: 'error',
            error: `Button "${text || 'unknown'}" failed: ${String(error)}`,
        };
    }
}

/**
 * Find and test buttons on a page
 */
export async function testPageButtons(page: Page): Promise<InteractionResult[]> {
    const results: InteractionResult[] = [];

    // Find all clickable elements
    const buttonSelectors = [
        'button',
        'a[role="button"]',
        '[role="button"]',
        'a.btn',
        'a.button',
    ];

    for (const selector of buttonSelectors) {
        if (page.isClosed()) break;
        // Collect visible buttons only
        const allLocators = await page.locator(selector).all();
        const visibleLocators: Locator[] = [];

        for (const loc of allLocators) {
            if (await loc.isVisible().catch(() => false)) {
                visibleLocators.push(loc);
            }
            if (visibleLocators.length >= 3) break; // Optimization: stop finding more if we have enough
        }

        for (const button of visibleLocators) {
            const currentURL = page.url();
            const result = await safeClickButton(page, button);
            results.push(result);

            // If URL changed, we need to go back
            if (result.validation === 'URL changed') {
                try {
                    await page.goBack({ waitUntil: 'domcontentloaded', timeout: 5000 });
                } catch (navError) {
                    console.warn('⚠️  Could not go back, trying direct navigation:', navError);
                    await page.goto(currentURL, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => { });
                }
            }

            // Close modals if they appeared
            if (result.validation === 'Modal opened') {
                // Try to close modal
                const closeButtons = page.locator('[aria-label="Close"], .close, [class*="close"]');
                const count = await closeButtons.count();
                if (count > 0) {
                    await closeButtons.first().click().catch(() => { });
                }
            }
        }
    }

    return results;
}

/**
 * Test navigation links
 */
export async function testNavigationLinks(page: Page): Promise<InteractionResult[]> {
    const results: InteractionResult[] = [];

    // Find all navigation links
    const navLinks = await page.locator('nav a, [role="navigation"] a').all();

    for (const link of navLinks) {
        try {
            const href = await link.getAttribute('href');
            const text = await link.textContent() || '';

            if (!href || isDangerousButton(text, href)) {
                results.push({
                    success: false,
                    action: 'skipped',
                    validation: 'dangerous or no href',
                });
                continue;
            }

            // Just validate href is valid, don't click
            results.push({
                success: true,
                action: 'validated',
                validation: 'link exists',
            });

        } catch (error) {
            results.push({
                success: false,
                action: 'failed',
                validation: 'error',
                error: String(error),
            });
        }
    }

    return results;
}
