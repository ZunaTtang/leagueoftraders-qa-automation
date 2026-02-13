import { Page } from '@playwright/test';
import { shouldExcludeFromCrawl } from '../config/keyPages';
import fs from 'fs';
import path from 'path';

export interface CrawlDiscoveryOptions {
    maxPages?: number;
    maxDepth?: number;
    timeout?: number;
    sampleDynamicRoutes?: number;
    outputFile?: string;
    summaryFile?: string;
}

export interface DiscoveryMetadata {
    baseUrl: string;
    generatedAt: string;
    limits: {
        maxPages: number;
        maxDepth: number;
        sampleDynamicRoutes: number;
    };
    adjustedLimits?: {
        maxPages: number;
        reason: string;
    };
}

export interface DiscoveryOutput {
    metadata: DiscoveryMetadata;
    urls: string[];
}

export interface DiscoverySummary {
    totalFound: number;
    totalAfterExclusions: number;
    totalAfterSampling: number;
    durationMs: number;
    sitemapCount: number;
    crawlCount: number;
    patternsDetected: Record<string, number>;
    fallbackTriggered: boolean;
}

/**
 * Normalize URL for deduplication
 */
export function normalizeURL(url: string, baseURL: string): string {
    try {
        const parsed = new URL(url, baseURL);

        // Remove hash
        parsed.hash = '';

        // Remove trailing slash (unless it's just the origin)
        if (parsed.pathname !== '/' && parsed.pathname.endsWith('/')) {
            parsed.pathname = parsed.pathname.slice(0, -1);
        }

        // Remove common tracking parameters
        const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'source'];
        trackingParams.forEach(param => parsed.searchParams.delete(param));

        return parsed.href;
    } catch {
        return url;
    }
}

/**
 * Check if URL is internal
 */
export function isInternalURL(url: string, baseURL: string): boolean {
    try {
        const parsed = new URL(url, baseURL);
        const base = new URL(baseURL);
        return parsed.origin === base.origin;
    } catch {
        return false;
    }
}

/**
 * Extract path pattern (for dynamic route detection)
 */
export function getPathPattern(url: string): string {
    try {
        const parsed = new URL(url);
        const segments = parsed.pathname.split('/').filter(Boolean);

        // Replace segments that look like IDs/slugs with :param
        return segments.map(segment => {
            // If segment is numeric or looks like a UUID/hash
            if (/^[0-9]+$/.test(segment) || /^[a-f0-9-]{20,}$/i.test(segment)) {
                return ':id';
            }
            // If segment is ALL_CAPS or camelCase (likely a slug)
            if (/^[A-Z]+$/.test(segment) || /^[a-z]+[A-Z]/.test(segment)) {
                return ':slug';
            }
            return segment;
        }).join('/');
    } catch {
        return url;
    }
}

/**
 * Fetch and parse sitemap.xml
 */
export async function fetchSitemap(page: Page, url: string): Promise<string[]> {
    try {
        const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });

        if (!response || response.status() !== 200) {
            console.log(`ℹ️  Sitemap not found at ${url}`);
            return [];
        }

        const content = await page.content();

        // Extract URLs from sitemap (basic regex approach)
        const urlMatches = content.match(/<loc>(.*?)<\/loc>/g) || [];
        const urls = urlMatches.map(match => match.replace(/<\/?loc>/g, ''));

        console.log(`✅ Found ${urls.length} URLs in ${url}`);

        return urls;
    } catch (error) {
        console.log(`ℹ️  Could not fetch sitemap at ${url}`);
        return [];
    }
}

/**
 * Discover URLs with robust filtering and fallback policies
 */
export async function discoverURLs(
    page: Page,
    baseURL: string,
    options: CrawlDiscoveryOptions = {}
): Promise<string[]> {
    const startTime = Date.now();
    let {
        maxPages = 100,
        maxDepth = 3,
        timeout = 60000,
        sampleDynamicRoutes = 5,
    } = options;

    const discovered = new Map<string, { url: string; depth: number; source: 'sitemap' | 'crawl' }>();
    const visited = new Set<string>();
    const patternCounts = new Map<string, number>();
    const queue: { url: string; depth: number; source: 'crawl' }[] = [];

    let fallbackTriggered = false;
    let fallbackReason = '';

    console.log(`\n🕵️ Starting URL Discovery for ${baseURL}`);
    console.log(`   Limits: Max Pages=${maxPages}, Max Depth=${maxDepth}, Timeout=${timeout}ms`);

    // 1. Fetch Sitemaps Recursively
    const sitemapQueue = [`${baseURL}/sitemap.xml`];
    const visitedSitemaps = new Set<string>();
    let sitemapCount = 0;

    console.log('📄 Processing sitemaps...');

    // Add base URL to crawl queue as a fallback entry point
    queue.push({ url: baseURL, depth: 0, source: 'crawl' });

    while (sitemapQueue.length > 0 && discovered.size < maxPages) {
        const currentXml = sitemapQueue.shift()!;
        if (visitedSitemaps.has(currentXml)) continue;
        visitedSitemaps.add(currentXml);

        const urls = await fetchSitemap(page, currentXml);

        for (const url of urls) {
            const normalized = normalizeURL(url, baseURL);

            // If it looks like another sitemap, add to sitemap queue
            // Generally sitemaps end in .xml or contain 'sitemap'
            if (url.includes('sitemap') && url.endsWith('.xml')) {
                if (!visitedSitemaps.has(url)) {
                    sitemapQueue.push(url);
                }
                continue;
            }

            // Normal page
            if (isInternalURL(normalized, baseURL) && !shouldExcludeFromCrawl(normalized)) {
                if (!discovered.has(normalized)) {
                    discovered.set(normalized, { url: normalized, depth: 0, source: 'sitemap' });
                    // Also add to crawl queue to find deeper links if depth allows
                    if (maxDepth > 0) {
                        queue.push({ url: normalized, depth: 0, source: 'crawl' });
                    }
                    sitemapCount++;
                }
            }
        }
    }

    console.log(`✅ Sitemap processing complete. Found ${sitemapCount} initial pages.`);

    // 2. Crawl
    let crawlCount = 0;

    while (queue.length > 0 && discovered.size < maxPages) {
        // Check timeout and apply fallback if needed
        const elapsed = Date.now() - startTime;
        if (elapsed > timeout && !fallbackTriggered) {
            console.warn(`\n⚠️  Discovery timeout exceeded (${elapsed}ms > ${timeout}ms). Applying fallback policy.`);

            // Fallback: Reduce limits
            const originalMaxPages = maxPages;
            maxPages = Math.floor(maxPages * 0.75); // Reduce by 25%
            maxDepth = Math.max(1, maxDepth - 1); // Reduce depth

            fallbackTriggered = true;
            fallbackReason = `Timeout exceeded. Limits reduced: Pages ${originalMaxPages}->${maxPages}, Depth -> ${maxDepth}`;

            // Trim queue if it's too long
            if (discovered.size >= maxPages) break;
        }

        const current = queue.shift()!;
        const normalizedURL = normalizeURL(current.url, baseURL);

        if (visited.has(normalizedURL)) continue;

        // Pattern Check
        const pattern = getPathPattern(normalizedURL);
        const patternCount = patternCounts.get(pattern) || 0;

        if (patternCount >= sampleDynamicRoutes && pattern.includes(':')) {
            // Already have enough samples of this dynamic route
            continue;
        }

        visited.add(normalizedURL);
        patternCounts.set(pattern, patternCount + 1);

        // If not already discovered (e.g. from sitemap), add it
        if (!discovered.has(normalizedURL)) {
            discovered.set(normalizedURL, { url: normalizedURL, depth: current.depth, source: 'crawl' });
            crawlCount++;
        }

        // Don't crawl deeper if max depth reached
        if (current.depth >= maxDepth) continue;

        try {
            await page.goto(normalizedURL, { waitUntil: 'domcontentloaded', timeout: 15000 });

            const links = await page.locator('a[href]').evaluateAll((anchors) =>
                anchors.map((a) => (a as unknown as { href: string }).href)
            );

            for (const link of links) {
                const normalizedLink = normalizeURL(link, baseURL);

                if (
                    isInternalURL(normalizedLink, baseURL) &&
                    !shouldExcludeFromCrawl(normalizedLink) &&
                    !visited.has(normalizedLink)
                ) {
                    queue.push({
                        url: normalizedLink,
                        depth: current.depth + 1,
                        source: 'crawl'
                    });
                }
            }

        } catch (error) {
            // Ignore navigation errors during dicovery
        }
    }

    const durationMs = Date.now() - startTime;
    const allUrls = Array.from(discovered.values()).map(d => d.url);

    // Save Output
    const output: DiscoveryOutput = {
        metadata: {
            baseUrl: baseURL,
            generatedAt: new Date().toISOString(),
            limits: {
                maxPages: options.maxPages || 100,
                maxDepth: options.maxDepth || 3,
                sampleDynamicRoutes
            },
            ...(fallbackTriggered ? { adjustedLimits: { maxPages, reason: fallbackReason } } : {})
        },
        urls: allUrls
    };

    const summary: DiscoverySummary = {
        totalFound: allUrls.length,
        totalAfterExclusions: allUrls.length, // Already applied during crawl
        totalAfterSampling: allUrls.length, // Already applied during crawl
        durationMs,
        sitemapCount,
        crawlCount,
        patternsDetected: Object.fromEntries(patternCounts),
        fallbackTriggered
    };

    if (options.outputFile) {
        fs.writeFileSync(options.outputFile, JSON.stringify(output, null, 2));
        console.log(`\n💾 Saved URLs to ${options.outputFile}`);
    }

    if (options.summaryFile) {
        fs.writeFileSync(options.summaryFile, JSON.stringify(summary, null, 2));
        console.log(`💾 Saved summary to ${options.summaryFile}`);
    }

    console.log(`\n✅ Discovery Complete: ${allUrls.length} URLs found in ${durationMs}ms`);
    return allUrls;
}
