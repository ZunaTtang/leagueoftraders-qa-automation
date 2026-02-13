import { test, expect } from '@playwright/test';
import { discoverURLs, isInternalURL } from '../../utils/crawlerDiscovery';
import fs from 'fs';
import path from 'path';

test.describe('Crawler Stage 1 - Discovery', () => {

    test('should discover URLs from sitemap and crawling', async ({ page }) => {
        const baseURL = process.env.LOT_BASE_URL || 'https://leagueoftraders.io';
        const outputFile = 'crawl-urls.json';
        const summaryFile = 'crawl-discovery-summary.json';

        // Clean up previous runs
        if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
        if (fs.existsSync(summaryFile)) fs.unlinkSync(summaryFile);

        console.log(`\n🚀 Starting Discovery Stage for ${baseURL}...`);

        const urls = await discoverURLs(page, baseURL, {
            maxPages: 100,
            maxDepth: 3,
            timeout: 60000, // 60s target
            sampleDynamicRoutes: 5,
            outputFile,
            summaryFile
        });

        console.log(`\n✅ Discovery Stage Complete. Found ${urls.length} URLs.`);

        // 1. Verify Output Files Exist
        expect(fs.existsSync(outputFile), 'crawl-urls.json should be created').toBeTruthy();
        expect(fs.existsSync(summaryFile), 'crawl-discovery-summary.json should be created').toBeTruthy();

        // 2. Verify JSON Structure & Metadata
        const data = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
        expect(data).toHaveProperty('metadata');
        expect(data).toHaveProperty('urls');
        expect(data.metadata.baseUrl).toBe(baseURL);
        expect(data.metadata).toHaveProperty('generatedAt');
        expect(data.metadata).toHaveProperty('limits');

        // 3. Verify URL Logic
        const allUrls = data.urls as string[];
        expect(allUrls.length).toBeGreaterThan(0);

        // Check for duplicates
        const uniqueUrls = new Set(allUrls);
        expect(uniqueUrls.size).toBe(allUrls.length);

        // Check internal only
        const externalUrls = allUrls.filter(u => !isInternalURL(u, baseURL));
        if (externalUrls.length > 0) {
            console.warn('⚠️ Found external URLs:', externalUrls);
        }
        expect(externalUrls.length).toBe(0);

        // 4. Verify Summary Logic
        const summary = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));
        expect(summary.totalFound).toBe(allUrls.length);
        expect(summary.durationMs).toBeGreaterThan(0);

        // Check performance target (soft assertion)
        if (summary.durationMs > 60000) {
            console.warn(`⚠️ Performance Warning: Discovery took ${summary.durationMs}ms (Target: <60000ms)`);
            // Check if fallback was triggered
            if (summary.fallbackTriggered) {
                console.log('ℹ️ Fallback policy was successfully triggered.');
                expect(data.metadata).toHaveProperty('adjustedLimits');
            }
        }
    });

    test('should apply exclusion rules correctly', async ({ page }) => {
        const baseURL = process.env.LOT_BASE_URL || 'https://leagueoftraders.io';
        // We can't easily mock page content in a full integration test, 
        // but we can check if known excluded patterns are absent from a short crawl

        const urls = await discoverURLs(page, baseURL, {
            maxPages: 20,
            maxDepth: 2,
            timeout: 30000
        });

        const dangerousPatterns = ['logout', 'delete', 'signout', 'admin'];
        const unsafeUrls = urls.filter(u => dangerousPatterns.some(p => u.includes(p)));

        if (unsafeUrls.length > 0) {
            console.error('❌ Found unsafe URLs:', unsafeUrls);
        }
        expect(unsafeUrls.length).toBe(0);
    });

});
