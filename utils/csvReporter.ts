import * as fs from 'fs';
import * as path from 'path';

/**
 * CSV Reporter Utility
 * Exports test results to CSV format for easy review by developers and operators
 */

export interface TestResult {
    timestamp: string;
    pageUrl: string;
    pageName: string;
    testType: 'page-load' | 'api-call' | 'link-test' | 'action-test' | 'quality-gate';
    testName: string;
    status: 'PASS' | 'FAIL' | 'WARNING';
    duration: number;
    errorMessage?: string;
    details?: string;
}

export interface ApiTestResult {
    timestamp: string;
    pageUrl: string;
    apiUrl: string;
    method: string;
    status: number;
    duration: number;
    issueType?: 'duplicate' | 'missing' | 'error' | 'warning';
    issueSeverity?: 'critical' | 'warning' | 'info';
    issueDescription?: string;
}

export interface LinkTestResult {
    timestamp: string;
    sourcePageUrl: string;
    linkText: string;
    linkUrl: string;
    status: 'PASS' | 'FAIL';
    httpStatus?: number;
    errorMessage?: string;
}

/**
 * CSV Reporter Class
 */
export class CsvReporter {
    private outputDir: string;
    private testResults: TestResult[] = [];
    private apiResults: ApiTestResult[] = [];
    private linkResults: LinkTestResult[] = [];

    constructor(outputDir: string = 'test-results/reports') {
        this.outputDir = outputDir;
        this.ensureOutputDir();
    }

    private ensureOutputDir() {
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    /**
     * Add test result
     */
    addTestResult(result: TestResult) {
        this.testResults.push(result);
    }

    /**
     * Add API test result
     */
    addApiResult(result: ApiTestResult) {
        this.apiResults.push(result);
    }

    /**
     * Add link test result
     */
    addLinkResult(result: LinkTestResult) {
        this.linkResults.push(result);
    }

    /**
     * Generate all CSV reports
     */
    generateReports(runTimestamp?: string): {
        testReportPath: string;
        apiReportPath: string;
        linkReportPath: string;
        errorReportPath: string;
        summaryReportPath: string;
    } {
        const timestamp = runTimestamp || new Date().toISOString().replace(/[:.]/g, '-');

        const testReportPath = this.generateTestReport(timestamp);
        const apiReportPath = this.generateApiReport(timestamp);
        const linkReportPath = this.generateLinkReport(timestamp);
        const errorReportPath = this.generateErrorReport(timestamp);
        const summaryReportPath = this.generateSummaryReport(timestamp);

        console.log('\n📊 CSV Reports Generated:');
        console.log(`  - Test Report: ${testReportPath}`);
        console.log(`  - API Report: ${apiReportPath}`);
        console.log(`  - Link Report: ${linkReportPath}`);
        console.log(`  - Error Report: ${errorReportPath}`);
        console.log(`  - Summary Report: ${summaryReportPath}`);

        return {
            testReportPath,
            apiReportPath,
            linkReportPath,
            errorReportPath,
            summaryReportPath,
        };
    }

    /**
     * Generate main test report CSV
     */
    private generateTestReport(timestamp: string): string {
        const filename = `test-report-${timestamp}.csv`;
        const filepath = path.join(this.outputDir, filename);

        const headers = [
            'Timestamp',
            'Page URL',
            'Page Name',
            'Test Type',
            'Test Name',
            'Status',
            'Duration (ms)',
            'Error Message',
            'Details'
        ];

        const rows = this.testResults.map(r => [
            r.timestamp,
            r.pageUrl,
            r.pageName,
            r.testType,
            r.testName,
            r.status,
            r.duration.toString(),
            r.errorMessage || '',
            r.details || ''
        ]);

        this.writeCsv(filepath, headers, rows);
        return filepath;
    }

    /**
     * Generate API test report CSV
     */
    private generateApiReport(timestamp: string): string {
        const filename = `api-report-${timestamp}.csv`;
        const filepath = path.join(this.outputDir, filename);

        const headers = [
            'Timestamp',
            'Page URL',
            'API URL',
            'Method',
            'HTTP Status',
            'Duration (ms)',
            'Issue Type',
            'Issue Severity',
            'Issue Description'
        ];

        const rows = this.apiResults.map(r => [
            r.timestamp,
            r.pageUrl,
            r.apiUrl,
            r.method,
            r.status.toString(),
            r.duration.toString(),
            r.issueType || '',
            r.issueSeverity || '',
            r.issueDescription || ''
        ]);

        this.writeCsv(filepath, headers, rows);
        return filepath;
    }

    /**
     * Generate link test report CSV
     */
    private generateLinkReport(timestamp: string): string {
        const filename = `link-report-${timestamp}.csv`;
        const filepath = path.join(this.outputDir, filename);

        const headers = [
            'Timestamp',
            'Source Page URL',
            'Link Text',
            'Link URL',
            'Status',
            'HTTP Status',
            'Error Message'
        ];

        const rows = this.linkResults.map(r => [
            r.timestamp,
            r.sourcePageUrl,
            r.linkText,
            r.linkUrl,
            r.status,
            r.httpStatus?.toString() || '',
            r.errorMessage || ''
        ]);

        this.writeCsv(filepath, headers, rows);
        return filepath;
    }

    /**
     * Generate error-only report CSV
     */
    private generateErrorReport(timestamp: string): string {
        const filename = `error-report-${timestamp}.csv`;
        const filepath = path.join(this.outputDir, filename);

        const headers = [
            'Timestamp',
            'Error Type',
            'Page URL',
            'Test Name',
            'Status',
            'Error Message',
            'Details'
        ];

        // Collect all errors
        const errors: any[] = [];

        // Test errors
        this.testResults
            .filter(r => r.status === 'FAIL' || r.status === 'WARNING')
            .forEach(r => {
                errors.push([
                    r.timestamp,
                    'Test Error',
                    r.pageUrl,
                    r.testName,
                    r.status,
                    r.errorMessage || '',
                    r.details || ''
                ]);
            });

        // API errors
        this.apiResults
            .filter(r => r.issueType === 'error' || r.issueSeverity === 'critical')
            .forEach(r => {
                errors.push([
                    r.timestamp,
                    'API Error',
                    r.pageUrl,
                    r.apiUrl,
                    r.issueSeverity?.toUpperCase() || 'ERROR',
                    r.issueDescription || '',
                    `${r.method} ${r.status}`
                ]);
            });

        // Link errors
        this.linkResults
            .filter(r => r.status === 'FAIL')
            .forEach(r => {
                errors.push([
                    r.timestamp,
                    'Link Error',
                    r.sourcePageUrl,
                    r.linkText,
                    'FAIL',
                    r.errorMessage || '',
                    `Link: ${r.linkUrl}`
                ]);
            });

        this.writeCsv(filepath, headers, errors);
        return filepath;
    }

    /**
     * Generate summary report CSV
     */
    private generateSummaryReport(timestamp: string): string {
        const filename = `summary-report-${timestamp}.csv`;
        const filepath = path.join(this.outputDir, filename);

        const stats = this.calculateStats();

        const headers = ['Metric', 'Value'];
        const rows = [
            ['Test Run Timestamp', timestamp],
            ['Total Tests', stats.totalTests.toString()],
            ['Passed Tests', stats.passedTests.toString()],
            ['Failed Tests', stats.failedTests.toString()],
            ['Warning Tests', stats.warningTests.toString()],
            ['Pass Rate', `${stats.passRate.toFixed(2)}%`],
            ['Total API Calls', stats.totalApiCalls.toString()],
            ['Failed API Calls', stats.failedApiCalls.toString()],
            ['API Issues Found', stats.apiIssues.toString()],
            ['Total Links Tested', stats.totalLinks.toString()],
            ['Broken Links', stats.brokenLinks.toString()],
            ['Total Pages Tested', stats.totalPages.toString()],
            ['Total Duration (ms)', stats.totalDuration.toString()],
        ];

        this.writeCsv(filepath, headers, rows);
        return filepath;
    }

    /**
     * Calculate statistics
     */
    private calculateStats() {
        const passedTests = this.testResults.filter(r => r.status === 'PASS').length;
        const failedTests = this.testResults.filter(r => r.status === 'FAIL').length;
        const warningTests = this.testResults.filter(r => r.status === 'WARNING').length;
        const totalTests = this.testResults.length;
        const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

        const totalApiCalls = this.apiResults.length;
        const failedApiCalls = this.apiResults.filter(r => r.status >= 400).length;
        const apiIssues = this.apiResults.filter(r => r.issueType).length;

        const totalLinks = this.linkResults.length;
        const brokenLinks = this.linkResults.filter(r => r.status === 'FAIL').length;

        const uniquePages = new Set(this.testResults.map(r => r.pageUrl)).size;
        const totalDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0);

        return {
            totalTests,
            passedTests,
            failedTests,
            warningTests,
            passRate,
            totalApiCalls,
            failedApiCalls,
            apiIssues,
            totalLinks,
            brokenLinks,
            totalPages: uniquePages,
            totalDuration,
        };
    }

    /**
     * Write CSV file
     */
    private writeCsv(filepath: string, headers: string[], rows: string[][]) {
        const csvContent = [
            headers.map(h => this.escapeCsvValue(h)).join(','),
            ...rows.map(row => row.map(v => this.escapeCsvValue(v)).join(','))
        ].join('\n');

        fs.writeFileSync(filepath, '\uFEFF' + csvContent, 'utf8'); // Add BOM for Excel
    }

    /**
     * Escape CSV value
     */
    private escapeCsvValue(value: string): string {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    }

    /**
     * Clear all results
     */
    clear() {
        this.testResults = [];
        this.apiResults = [];
        this.linkResults = [];
    }
}

/**
 * Global CSV reporter instance
 */
let globalReporter: CsvReporter | null = null;

export function getGlobalCsvReporter(): CsvReporter {
    if (!globalReporter) {
        globalReporter = new CsvReporter();
    }
    return globalReporter;
}

export function resetGlobalCsvReporter() {
    globalReporter = new CsvReporter();
}
