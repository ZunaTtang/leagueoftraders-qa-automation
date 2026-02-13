import { Page } from '@playwright/test';
import { shouldExcludeFromCrawl } from '../config/keyPages';

/**
 * Smart Crawler - Robust page discovery with safety controls
 */

export interface CrawlOptions {
    maxPages?: number;
    maxDepth?: number;
    timeout?: number;
    sampleDynamicRoutes?: number;
}

export interface DiscoveredPage {
    url: string;
    depth: number;
    source: 'sitemap' | 'crawl';
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
export async function fetchSitemap(page: Page, baseURL: string): Promise<string[]> {
    const sitemapURL = `${baseURL}/sitemap.xml`;

    try {
        const response = await page.goto(sitemapURL, { waitUntil: 'networkidle', timeout: 10000 });

        if (!response || response.status() !== 200) {
            console.log('ℹ️  No sitemap.xml found, will use crawling only');
            return [];
        }

        const content = await page.content();

        // Extract URLs from sitemap (basic regex approach)
        const urlMatches = content.match(/<loc>(.*?)<\/loc>/g) || [];
        const urls = urlMatches.map(match => match.replace(/<\/?loc>/g, ''));

        console.log(`✅ Found ${urls.length} URLs in sitemap.xml`);

        return urls;
    } catch (error) {
        console.log('ℹ️  Could not fetch sitemap.xml, using crawling only');
        return [];
    }
}

/**
 * Crawl pages by following internal links
 */
export async function crawlPages(
    page: Page,
    baseURL: string,
    options: CrawlOptions = {}
): Promise<DiscoveredPage[]> {
    const {
        maxPages = 100,
        maxDepth = 3,
        timeout = 30000,
        sampleDynamicRoutes = 5,
    } = options;

    const discovered = new Map<string, DiscoveredPage>();
    const queue: DiscoveredPage[] = [{ url: baseURL, depth: 0, source: 'crawl' }];
    const visited = new Set<string>();
    const patternCounts = new Map<string, number>();

    console.log(`🕷️  Starting crawl (max: ${maxPages} pages, depth: ${maxDepth})...`);

    while (queue.length > 0 && discovered.size < maxPages) {
        const current = queue.shift()!;
        const normalizedURL = normalizeURL(current.url, baseURL);

        // Skip if already visited
        if (visited.has(normalizedURL)) continue;

        // Skip if excluded
        if (shouldExcludeFromCrawl(normalizedURL)) {
            console.log(`⏭️  Skipping excluded: ${normalizedURL}`);
            continue;
        }

        // Check dynamic route sampling
        const pattern = getPathPattern(normalizedURL);
        const patternCount = patternCounts.get(pattern) || 0;

        if (patternCount >= sampleDynamicRoutes && pattern.includes(':')) {
            console.log(`⏭️  Skipping (pattern limit): ${normalizedURL}`);
            continue;
        }

        visited.add(normalizedURL);
        discovered.set(normalizedURL, current);
        patternCounts.set(pattern, patternCount + 1);

        // Don't crawl deeper if at max depth
        if (current.depth >= maxDepth) continue;

        try {
            // Visit page
            await page.goto(normalizedURL, { waitUntil: 'domcontentloaded', timeout });

            // Extract links
            const links = await page.locator('a[href]').evaluateAll((anchors) =>
                anchors.map((a) => (a as unknown as { href: string }).href)
            );

            // Add new links to queue
            for (const link of links) {
                const normalizedLink = normalizeURL(link, baseURL);

                if (
                    !visited.has(normalizedLink) &&
                    isInternalURL(normalizedLink, baseURL) &&
                    !shouldExcludeFromCrawl(normalizedLink)
                ) {
                    queue.push({
                        url: normalizedLink,
                        depth: current.depth + 1,
                        source: 'crawl',
                    });
                }
            }

            console.log(`✅ Crawled: ${normalizedURL} (depth: ${current.depth}, found: ${links.length} links)`);

        } catch (error) {
            console.warn(`⚠️  Failed to crawl ${normalizedURL}:`, error);
        }
    }

    console.log(`✅ Crawl complete: ${discovered.size} pages discovered`);

    return Array.from(discovered.values());
}

/**
 * @deprecated Use discoverURLs() from crawlerDiscovery.ts instead
 * Discover all pages using hybrid approach (sitemap + crawl)
 */
export async function discoverPages(
    page: Page,
    baseURL: string,
    options: CrawlOptions = {}
): Promise<string[]> {
    console.warn('⚠️  DEPRECATED: discoverPages() is deprecated. Please migrate to discoverURLs().');
    const discovered = new Set<string>();

    // 1. Try sitemap first
    const sitemapURLs = await fetchSitemap(page, baseURL);
    sitemapURLs.forEach(url => discovered.add(normalizeURL(url, baseURL)));

    // 2. Crawl to find more pages
    const crawledPages = await crawlPages(page, baseURL, options);
    crawledPages.forEach(p => discovered.add(normalizeURL(p.url, baseURL)));

    const allPages = Array.from(discovered);
    console.log(`\n📊 Total unique pages discovered: ${allPages.length}`);

    return allPages;
}

/**
 * @deprecated Use validateURLsInParallel() from crawlerValidation.ts instead
 * Validate links (check for broken links)
 */
export async function validateLinks(
    page: Page,
    urls: string[]
): Promise<{ url: string; status: number }[]> {
    console.warn('⚠️  DEPRECATED: validateLinks() is deprecated. Please migrate to validateURLsInParallel().');
    const results: { url: string; status: number }[] = [];

    console.log(`🔗 Validating ${urls.length} links...`);

    for (const url of urls) {
        try {
            const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
            results.push({
                url,
                status: response?.status() || 0,
            });
        } catch {
            results.push({ url, status: 0 });
        }
    }

    const broken = results.filter(r => r.status === 404 || r.status === 0);
    if (broken.length > 0) {
        console.log(`❌ Found ${broken.length} broken links`);
    } else {
        console.log(`✅ All links valid`);
    }

    return results;
}
