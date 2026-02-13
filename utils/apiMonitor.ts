import { Page, Request, Response } from '@playwright/test';
import { isInternalRequest } from '../config/networkRules';

/**
 * API Monitoring Utility
 * Tracks all API calls, detects duplicates and missing values
 */

export interface ApiCallRecord {
    url: string;
    method: string;
    status: number;
    requestBody?: any;
    responseBody?: any;
    timestamp: number;
    pageUrl: string;
    duration: number;
}

export interface ValidationIssue {
    type: 'duplicate' | 'missing' | 'error' | 'warning';
    severity: 'critical' | 'warning' | 'info';
    apiUrl: string;
    description: string;
    details: any;
}

export interface ApiMonitoringResult {
    apiCalls: ApiCallRecord[];
    issues: ValidationIssue[];
    stats: {
        totalCalls: number;
        uniqueApis: number;
        duplicateCalls: number;
        failedCalls: number;
        missingValueIssues: number;
    };
}

/**
 * Setup API monitoring for a page
 */
export async function setupApiMonitoring(page: Page): Promise<{
    getResults: () => ApiMonitoringResult;
    stop: () => void;
}> {
    const apiCalls: ApiCallRecord[] = [];
    const requestTimestamps = new Map<string, number>();

    const requestHandler = async (request: Request) => {
        const url = request.url();

        // Only track API calls (internal domains)
        if (!isInternalRequest(url)) return;

        // Track request start time
        requestTimestamps.set(request.url(), Date.now());
    };

    const responseHandler = async (response: Response) => {
        const url = response.url();

        // Only track API calls (internal domains)
        if (!isInternalRequest(url)) return;

        const startTime = requestTimestamps.get(url) || Date.now();
        const duration = Date.now() - startTime;

        try {
            let responseBody: any = null;
            let requestBody: any = null;

            // Try to get request body
            try {
                const postData = response.request().postData();
                if (postData) {
                    requestBody = JSON.parse(postData);
                }
            } catch (e) {
                // Not JSON or no body
            }

            // Try to get response body for JSON responses
            const contentType = response.headers()['content-type'] || '';
            if (contentType.includes('application/json')) {
                try {
                    responseBody = await response.json();
                } catch (e) {
                    // Failed to parse JSON
                }
            }

            apiCalls.push({
                url,
                method: response.request().method(),
                status: response.status(),
                requestBody,
                responseBody,
                timestamp: Date.now(),
                pageUrl: page.url(),
                duration,
            });
        } catch (error) {
            // Ignore errors in tracking
        }

        requestTimestamps.delete(url);
    };

    page.on('request', requestHandler);
    page.on('response', responseHandler);

    return {
        getResults: () => analyzeApiCalls(apiCalls, page.url()),
        stop: () => {
            page.off('request', requestHandler);
            page.off('response', responseHandler);
        },
    };
}

/**
 * Analyze API calls for issues
 */
function analyzeApiCalls(apiCalls: ApiCallRecord[], pageUrl: string): ApiMonitoringResult {
    const issues: ValidationIssue[] = [];

    // Detect duplicate calls
    const callCounts = new Map<string, number>();
    apiCalls.forEach(call => {
        const key = `${call.method} ${call.url}`;
        callCounts.set(key, (callCounts.get(key) || 0) + 1);
    });

    let duplicateCount = 0;
    callCounts.forEach((count, key) => {
        if (count > 1) {
            duplicateCount++;
            issues.push({
                type: 'duplicate',
                severity: count > 3 ? 'warning' : 'info',
                apiUrl: key,
                description: `API called ${count} times on same page`,
                details: { count, pageUrl },
            });
        }
    });

    // Detect missing values in responses
    let missingValueCount = 0;
    apiCalls.forEach(call => {
        if (call.responseBody && call.status >= 200 && call.status < 300) {
            const missing = findMissingValues(call.responseBody, call.url);
            if (missing.length > 0) {
                missingValueCount += missing.length;
                missing.forEach(issue => issues.push(issue));
            }
        }
    });

    // Detect failed calls
    const failedCalls = apiCalls.filter(call => call.status >= 400);
    failedCalls.forEach(call => {
        issues.push({
            type: 'error',
            severity: call.status >= 500 ? 'critical' : 'warning',
            apiUrl: call.url,
            description: `API call failed with status ${call.status}`,
            details: { status: call.status, method: call.method, pageUrl },
        });
    });

    return {
        apiCalls,
        issues,
        stats: {
            totalCalls: apiCalls.length,
            uniqueApis: callCounts.size,
            duplicateCalls: duplicateCount,
            failedCalls: failedCalls.length,
            missingValueIssues: missingValueCount,
        },
    };
}

/**
 * Find missing or null values in response data
 */
function findMissingValues(data: any, apiUrl: string, path: string = ''): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (data === null || data === undefined) {
        issues.push({
            type: 'missing',
            severity: 'warning',
            apiUrl,
            description: `Null/undefined value at path: ${path || 'root'}`,
            details: { path },
        });
        return issues;
    }

    if (typeof data === 'object') {
        if (Array.isArray(data)) {
            // Check for empty arrays in important fields
            if (data.length === 0 && isImportantField(path)) {
                issues.push({
                    type: 'missing',
                    severity: 'info',
                    apiUrl,
                    description: `Empty array at path: ${path}`,
                    details: { path },
                });
            }

            // Check for duplicates in arrays
            const duplicates = findDuplicatesInArray(data);
            if (duplicates.length > 0) {
                issues.push({
                    type: 'duplicate',
                    severity: 'info',
                    apiUrl,
                    description: `Duplicate items in array at path: ${path}`,
                    details: { path, duplicates },
                });
            }
        } else {
            // Check object properties
            Object.keys(data).forEach(key => {
                const newPath = path ? `${path}.${key}` : key;
                const value = data[key];

                // Check for null/undefined in important fields
                if ((value === null || value === undefined) && isImportantField(key)) {
                    issues.push({
                        type: 'missing',
                        severity: 'warning',
                        apiUrl,
                        description: `Missing value for field: ${newPath}`,
                        details: { path: newPath, field: key },
                    });
                }

                // Check for empty strings in important fields
                if (value === '' && isImportantField(key)) {
                    issues.push({
                        type: 'missing',
                        severity: 'info',
                        apiUrl,
                        description: `Empty string for field: ${newPath}`,
                        details: { path: newPath, field: key },
                    });
                }

                // Recursively check nested objects (limit depth to avoid infinite recursion)
                if (typeof value === 'object' && path.split('.').length < 5) {
                    issues.push(...findMissingValues(value, apiUrl, newPath));
                }
            });
        }
    }

    return issues;
}

/**
 * Check if a field name suggests it's important
 */
function isImportantField(fieldName: string): boolean {
    const importantPatterns = [
        'id', 'name', 'title', 'email', 'user', 'price', 'amount',
        'status', 'type', 'data', 'content', 'message', 'result',
        'value', 'key', 'url', 'link', 'timestamp', 'date'
    ];

    const lowerField = fieldName.toLowerCase();
    return importantPatterns.some(pattern => lowerField.includes(pattern));
}

/**
 * Find duplicate items in an array
 */
function findDuplicatesInArray(arr: any[]): any[] {
    const seen = new Set();
    const duplicates: any[] = [];

    arr.forEach(item => {
        const str = JSON.stringify(item);
        if (seen.has(str) && !duplicates.includes(str)) {
            duplicates.push(item);
        }
        seen.add(str);
    });

    return duplicates;
}
