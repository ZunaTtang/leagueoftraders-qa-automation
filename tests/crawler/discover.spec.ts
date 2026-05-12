import { test, expect } from '@playwright/test';
import { discoverURLs, isInternalURL } from '../../utils/crawlerDiscovery';
import { getBaseURL } from '../../utils/env';
import fs from 'fs';

test.describe('Crawler Stage 1 - Discovery', () => {
    test('should discover URLs from sitemap and crawling', async ({ page }) => {
        const baseURL = getBaseURL();
        const outputFile = 'crawl-urls.json';
        const summaryFile = 'crawl-discovery-summary.json';

        if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
        if (fs.existsSync(summaryFile)) fs.unlinkSync(summaryFile);

        console.log(`Starting discovery stage for ${baseURL}`);

        const urls = await discoverURLs(page, baseURL, {
            maxPages: 100,
            maxDepth: 3,
            timeout: 60000,
            sampleDynamicRoutes: 5,
            outputFile,
            summaryFile
        });

        expect(fs.existsSync(outputFile), 'crawl-urls.json should be created').toBeTruthy();
        expect(fs.existsSync(summaryFile), 'crawl-discovery-summary.json should be created').toBeTruthy();

        const data = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
        expect(data).toHaveProperty('metadata');
        expect(data).toHaveProperty('urls');
        expect(data.metadata.baseUrl).toBe(baseURL);
        expect(data.metadata).toHaveProperty('generatedAt');
        expect(data.metadata).toHaveProperty('limits');

        const allUrls = data.urls as string[];
        expect(allUrls.length).toBeGreaterThan(0);

        const uniqueUrls = new Set(allUrls);
        expect(uniqueUrls.size).toBe(allUrls.length);

        const externalUrls = allUrls.filter(url => !isInternalURL(url, baseURL));
        if (externalUrls.length > 0) {
            console.warn('Found external URLs:', externalUrls);
        }
        expect(externalUrls.length).toBe(0);

        const summary = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));
        expect(summary.totalFound).toBe(allUrls.length);
        expect(summary.durationMs).toBeGreaterThan(0);

        if (summary.durationMs > 60000) {
            console.warn(`Discovery took ${summary.durationMs}ms. Target: <60000ms.`);
            if (summary.fallbackTriggered) {
                expect(data.metadata).toHaveProperty('adjustedLimits');
            }
        }
    });

    test('should apply crawl exclusion rules', async ({ page }) => {
        const baseURL = getBaseURL();
        const urls = await discoverURLs(page, baseURL, {
            maxPages: 20,
            maxDepth: 2,
            timeout: 30000
        });

        const dangerousPatterns = ['logout', 'delete', 'signout', 'admin'];
        const unsafeUrls = urls.filter(url => dangerousPatterns.some(pattern => url.includes(pattern)));

        if (unsafeUrls.length > 0) {
            console.error('Found unsafe URLs:', unsafeUrls);
        }

        expect(unsafeUrls.length).toBe(0);
    });
});
