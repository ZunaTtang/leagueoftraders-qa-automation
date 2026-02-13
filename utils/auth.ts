import { Page } from '@playwright/test';
import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * Authentication Manager
 * Handles login and session state persistence
 */

export const AUTH_DIR = path.join(process.cwd(), '.auth');
export const GUEST_STATE_FILE = path.join(AUTH_DIR, 'guest.json');
export const USER_STATE_FILE = path.join(AUTH_DIR, 'user.json');

export interface AuthCredentials {
    email: string;
    password: string;
}

/**
 * Ensure .auth directory exists
 */
export function ensureAuthDir(): void {
    if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
    }
}

/**
 * Perform login and save authenticated state
 */
export async function setupAuthenticatedUser(config: FullConfig): Promise<void> {
    ensureAuthDir();

    const baseURL = process.env.LOT_BASE_URL || 'https://leagueoftraders.io';
    const email = process.env.LOT_EMAIL;
    const password = process.env.LOT_PASSWORD;

    if (!email || !password) {
        throw new Error(
            '❌ Missing credentials: LOT_EMAIL and LOT_PASSWORD must be set in .env file'
        );
    }

    console.log('🔐 Setting up authenticated user session...');

    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        // Navigate to login page
        await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' });

        // Handle "Continue with your email" selection screen if present
        const continueWithEmail = page.locator('text="Continue with your email"');
        if (await continueWithEmail.isVisible({ timeout: 5000 })) {
            console.log('📧 Clicking "Continue with your email"...');
            await continueWithEmail.click();
        }

        // Attempt to find and fill login form
        // NOTE: These selectors may need adjustment based on actual site structure
        const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
        const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
        const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();

        // Check if login form exists
        const emailVisible = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);

        if (!emailVisible) {
            console.warn('⚠️  Login form not found. Possible reasons:');
            console.warn('   - Site requires CAPTCHA or bot detection');
            console.warn('   - Site structure has changed');
            console.warn('   - Already logged in (check cookies)');
            console.warn('Saving guest state instead...');

            await context.storageState({ path: GUEST_STATE_FILE });
            await browser.close();
            return;
        }

        await emailInput.fill(email);
        await passwordInput.fill(password);

        // Take screenshot before login attempt
        await page.screenshot({ path: 'test-results/login-attempt.png', fullPage: true });

        await submitButton.click();

        // Wait for navigation (indicates successful login)
        await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 })
            .catch(async () => {
                // Login might have failed - take screenshot
                await page.screenshot({ path: 'test-results/login-failed.png', fullPage: true });
                throw new Error('❌ Login failed: Did not navigate away from login page. Check test-results/login-failed.png');
            });

        console.log('✅ Login successful!');

        // Save authenticated state
        await context.storageState({ path: USER_STATE_FILE });
        console.log(`✅ Saved authenticated state to ${USER_STATE_FILE}`);

        // Also save guest state (for tests that don't need auth)
        const guestContext = await browser.newContext();
        await guestContext.storageState({ path: GUEST_STATE_FILE });
        await guestContext.close();
        console.log(`✅ Saved guest state to ${GUEST_STATE_FILE}`);

    } catch (error) {
        console.error('❌ Authentication setup failed:', error);

        // Take final screenshot
        await page.screenshot({ path: 'test-results/auth-error.png', fullPage: true });

        throw new Error(
            `Authentication failed. Check test-results/auth-error.png for details.\n` +
            `Original error: ${error}`
        );
    } finally {
        await browser.close();
    }
}

/**
 * Check if auth state files exist
 */
export function hasAuthState(): boolean {
    return fs.existsSync(USER_STATE_FILE) && fs.existsSync(GUEST_STATE_FILE);
}
