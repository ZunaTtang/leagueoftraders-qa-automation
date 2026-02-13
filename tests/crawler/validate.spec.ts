import { test, expect } from '@playwright/test';
import { validateURLsInParallel } from '../../utils/crawlerValidation';
import fs from 'fs';
import path from 'path';

test.describe('Crawler Stage 2 - Validation', () => {

    test('should validate all discovered URLs without critical failures', async ({ browser }) => {
        const inputPath = 'crawl-urls.json';
        const outputFile = 'crawl-results.json';
        const summaryFile = 'crawl-validation-summary.json';

        // Check prerequisites
        if (!fs.existsSync(inputPath)) {
            console.warn(`⚠️ ${inputPath} not found. Skipping validation test.`);
            console.warn('   Run "npm run crawl:discover" to generate the URL list.');
            test.skip();
            return;
        }

        // Read input
        const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
        const urls = data.urls as string[]; // Metadata is available in data.metadata

        console.log(`\n🚀 Starting Validation Stage for ${urls.length} URLs...`);
        if (data.metadata) {
            console.log(`   Source: Discovery run at ${data.metadata.generatedAt}`);
        }

        // Run Validation
        const results = await validateURLsInParallel(browser, urls, {
            maxConcurrency: Number(process.env.CRAWLER_WORKERS) || 5, // Use env or default
            pageTimeout: Number(process.env.PAGE_TIMEOUT) || 30000,
            outputFile,
            summaryFile
        });

        // Verify Output Files
        expect(fs.existsSync(outputFile)).toBeTruthy();
        expect(fs.existsSync(summaryFile)).toBeTruthy();

        // Check Critical Failures (Fail Build)
        const criticalFailures = results.filter(r => r.status === 'critical');
        if (criticalFailures.length > 0) {
            console.error('\n❌ Critical Failures Detected (Build Failed):');
            criticalFailures.forEach(f => {
                console.error(`   - ${f.url}: ${f.failureReason}`);
            });
        }

        // Check Warnings (Report Only)
        const warnings = results.filter(r => r.status === 'warning');
        if (warnings.length > 0) {
            console.warn('\n⚠️  Validation Warnings (Check Report):');
            warnings.forEach(w => {
                console.warn(`   - ${w.url}: ${w.failureReason} ${w.is404FalsePositive ? '(False Positive 404)' : ''}`);
            });
        }

        // Assertions
        expect(criticalFailures.length, `Found ${criticalFailures.length} critical failures`).toBe(0);

        // Verify Summary consistency
        const summary = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));
        expect(summary.totalPages).toBe(results.length);
        expect(summary.critical).toBe(criticalFailures.length);
        expect(summary.warning).toBe(warnings.length);
    });

});
