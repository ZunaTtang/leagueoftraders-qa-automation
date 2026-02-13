import { test as setup } from '@playwright/test';
import { setupAuthenticatedUser } from '../utils/auth';

/**
 * Global Setup - Authentication
 * Runs before all tests to establish user sessions
 */

setup('authenticate user', async ({ }, testInfo) => {
    console.log('\n🚀 Running Global Setup...\n');

    try {
        await setupAuthenticatedUser(testInfo.config);
        console.log('\n✅ Global Setup Complete\n');
    } catch (error) {
        console.error('\n❌ Global Setup Failed\n');
        throw error;
    }
});
