import { Reporter, TestCase, TestResult, FullResult, FullConfig } from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Smart Reporter
 * Generates a human-readable analysis of the test run, including time, errors, and actionable fixes.
 */
class SmartReporter implements Reporter {
    private logs: string[] = [];
    private failures: { title: string; error: string; duration: number; file: string; logs: string }[] = [];
    private passed: { title: string; duration: number }[] = [];
    private startTime: number = 0;

    onBegin(config: FullConfig, suite: any) {
        this.startTime = Date.now();
        console.log('📝 Smart Reporter: Starting test run analysis...');
    }

    onTestEnd(test: TestCase, result: TestResult) {
        if (result.status === 'passed') {
            this.passed.push({
                title: test.title,
                duration: result.duration
            });
        } else if (result.status === 'failed' || result.status === 'timedOut') {
            // Clean up error message
            const rawError = result.error?.message || result.error?.stack || 'Unknown error';
            const cleanError = rawError.replace(/\u001b\[.*?m/g, ''); // Remove ANSI colors

            // Capture stdout/console logs
            // result.stdout is Array<string | Buffer>
            const logs = result.stdout.map(l => l.toString()).join('\n');

            this.failures.push({
                title: test.title,
                error: cleanError,
                duration: result.duration,
                file: test.location.file,
                logs: logs
            });
        }
    }

    async onEnd(result: FullResult) {
        const duration = (Date.now() - this.startTime) / 1000;
        const totalTests = this.passed.length + this.failures.length; // Approximate
        const timestamp = new Date().toLocaleString();

        let report = `# 📊 Test Execution Report\n`;
        report += `**Generated:** ${timestamp}\n\n`;

        report += `## ⏱️ Execution Summary\n`;
        report += `- **Total Duration:** ${duration.toFixed(2)}s\n`;
        report += `- **Total Tests Executed:** ${totalTests}\n`;
        report += `- **Passed:** ✅ ${this.passed.length}\n`;
        report += `- **Failed:** ❌ ${this.failures.length}\n`;
        report += `\n---\n`;

        if (this.failures.length > 0) {
            report += `## ❌ Failure Analysis & Action Plan\n\n`;

            this.failures.forEach((fail, index) => {
                const analysis = this.analyzeError(fail.error, fail.title, fail.file);

                report += `### ${index + 1}. ${fail.title}\n`;
                report += `- **File:** \`${fail.file}\`\n`;
                report += `- **Duration:** ${(fail.duration / 1000).toFixed(2)}s\n`;
                report += `- **Error:**\n\`\`\`\n${fail.error.split('\n').slice(0, 5).join('\n')}...\n\`\`\`\n`; // Truncate long errors

                if (fail.logs && fail.logs.length > 0) {
                    // Show last 1000 chars of logs to capture relevant context
                    report += `- **📜 Console Logs (Snippet):**\n\`\`\`\n${fail.logs.slice(-1000)}\n\`\`\`\n`;
                }

                report += `- **💡 Suggested Fix:** ${analysis.fix}\n`;
                report += `- **🔍 Target Area:** ${analysis.area}\n`;
                report += `\n`;
            });
        } else {
            report += `## 🎉 Success! \n`;
            report += `All tests passed. No actions required.\n`;
        }

        report += `\n---\n`;
        report += `## ✅ Passed Tests (Overview)\n`;
        this.passed.slice(0, 10).forEach(p => {
            report += `- ${p.title} (${(p.duration / 1000).toFixed(2)}s)\n`;
        });
        if (this.passed.length > 10) report += `- ...and ${this.passed.length - 10} more passed tests.\n`;

        // Save to file
        const reportPath = path.join(process.cwd(), 'test-report.md');
        fs.writeFileSync(reportPath, report);

        console.log(`\n📄 Smart Report generated: ${reportPath}`);
    }

    /**
     * AI-lite heuristics to suggest fixes based on error patterns
     */
    private analyzeError(error: string, testTitle: string, file: string): { fix: string; area: string } {
        const err = error.toLowerCase();
        const title = testTitle.toLowerCase();

        // 1. Timeouts
        if (err.includes('timeout') || err.includes('exceeded')) {
            if (title.includes('login')) {
                return {
                    fix: 'Increase timeout in login test or check if login button/input is obscured by a popup.',
                    area: 'Login Page / Auth Flow'
                };
            }
            if (err.includes('locator.click')) {
                return {
                    fix: 'Element might be covered. Try using { force: true } or wait for overlays to disappear.',
                    area: 'UI Interaction / Overlays'
                };
            }
            return {
                fix: 'Test took too long. Optimize efficiency or increase page.goto timeout.',
                area: 'Performance / Network'
            };
        }

        // 2. Element Not Found / Visible
        if (err.includes('visible') || err.includes('attached') || err.includes('waiting for locator')) {
            return {
                fix: 'Selector is incorrect or element is dynamic. Update selector in page object/test file.',
                area: 'Selectors / DOM Structure'
            };
        }

        // 3. Network / 500 Errors
        if (err.includes('502') || err.includes('504') || err.includes('500') || err.includes('network')) {
            return {
                fix: 'Server-side error detected. Check backend logs or add this pattern to allowed errors in assertions.ts if benign.',
                area: 'Backend / Infrastructure'
            };
        }

        // 4. Expectation Failures
        if (err.includes('received') && err.includes('expected')) {
            return {
                fix: 'Logic error. The actual value differed from expected. Check the test logic or data state.',
                area: 'Test Logic / Assertions'
            };
        }

        // 5. Console/CSP Errors
        if (err.includes('console error') || err.includes('security policy')) {
            return {
                fix: 'Add error pattern to `allowedPatterns` in assertions.ts to ignore non-critical console errors.',
                area: 'Quality Gate / Exception Handling'
            };
        }

        // Default
        return {
            fix: 'Unclassified error. Review screenshot and trace for details.',
            area: 'General Debugging'
        };
    }
}

export default SmartReporter;
