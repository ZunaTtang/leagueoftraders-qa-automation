import { chromium, FullConfig, BrowserContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { getAuthCredentials, getBaseURL, getLoginPath, shouldCheckLoginPage } from './env';

export const AUTH_DIR = path.join(process.cwd(), '.auth');
export const GUEST_STATE_FILE = path.join(AUTH_DIR, 'guest.json');
export const USER_STATE_FILE = path.join(AUTH_DIR, 'user.json');

export interface AuthCredentials {
    email: string;
    password: string;
}

export function ensureAuthDir(): void {
    if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
    }
}

function ensureTestResultsDir(): void {
    const dir = path.join(process.cwd(), 'test-results');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function buildAbsoluteURL(baseURL: string, routePath: string): string {
    return new URL(routePath, `${baseURL}/`).toString();
}

async function saveUnauthenticatedStates(context: BrowserContext): Promise<void> {
    await context.storageState({ path: GUEST_STATE_FILE });
    await context.storageState({ path: USER_STATE_FILE });
}

/**
 * Performs optional login and saves reusable browser storage states.
 *
 * If QA_CHECK_LOGIN=false or credentials are missing, this does not fail the run.
 * Instead, it saves guest state to both guest and user files so public QA checks can run.
 */
export async function setupAuthenticatedUser(_config: FullConfig): Promise<void> {
    ensureAuthDir();
    ensureTestResultsDir();

    const baseURL = getBaseURL();
    const loginURL = buildAbsoluteURL(baseURL, getLoginPath());
    const { email, password } = getAuthCredentials();
    const shouldLogin = shouldCheckLoginPage() && Boolean(email && password);

    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        if (!shouldLogin) {
            console.log('Skipping authenticated setup. Saving guest storage state.');
            await saveUnauthenticatedStates(context);
            return;
        }

        console.log(`Setting up authenticated browser state via ${loginURL}`);
        await page.goto(loginURL, { waitUntil: 'networkidle' });

        const continueWithEmail = page.locator('text="Continue with your email"');
        if (await continueWithEmail.isVisible({ timeout: 5000 }).catch(() => false)) {
            await continueWithEmail.click();
        }

        const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
        const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
        const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();

        const emailVisible = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);
        if (!emailVisible) {
            console.warn('Login form was not found. Saving guest state instead.');
            await saveUnauthenticatedStates(context);
            return;
        }

        await emailInput.fill(email!);
        await passwordInput.fill(password!);
        await page.screenshot({ path: 'test-results/login-attempt.png', fullPage: true });
        await submitButton.click();

        await page.waitForURL(url => !url.toString().includes(getLoginPath()), { timeout: 15000 })
            .catch(async () => {
                await page.screenshot({ path: 'test-results/login-failed.png', fullPage: true });
                throw new Error('Login failed: the page did not navigate away from the login route.');
            });

        await context.storageState({ path: USER_STATE_FILE });

        const guestContext = await browser.newContext();
        await guestContext.storageState({ path: GUEST_STATE_FILE });
        await guestContext.close();

        console.log(`Saved authenticated state to ${USER_STATE_FILE}`);
        console.log(`Saved guest state to ${GUEST_STATE_FILE}`);
    } catch (error) {
        await page.screenshot({ path: 'test-results/auth-error.png', fullPage: true }).catch(() => undefined);
        throw new Error(`Authentication setup failed. Check test-results/auth-error.png. Original error: ${error}`);
    } finally {
        await browser.close();
    }
}

export function hasAuthState(): boolean {
    return fs.existsSync(USER_STATE_FILE) && fs.existsSync(GUEST_STATE_FILE);
}
