/**
 * Network Rules Configuration
 * Defines which network requests should be blocked, ignored, or validated
 */

export interface NetworkRules {
    /** Domains to block entirely (improves test speed) */
    blockedDomains: string[];

    /** Domains to ignore for error checking (third-party services) */
    ignoredDomains: string[];

    /** Internal domains that must pass quality gates */
    internalDomains: string[];

    /** Resource types to block */
    blockedResourceTypes: string[];
}

export const networkRules: NetworkRules = {
    // Block ads, trackers, and unnecessary resources
    blockedDomains: [
        'googletagmanager.com',
        'google-analytics.com',
        'doubleclick.net',
        'facebook.com',
        'facebook.net',
        'hotjar.com',
        'segment.io',
        'analytics.google.com',
    ],

    // Ignore third-party failures (not our responsibility)
    ignoredDomains: [
        'sentry.io',
        'cdn.jsdelivr.net',
        'unpkg.com',
        'cdnjs.cloudflare.com',
        'fonts.googleapis.com',
        'fonts.gstatic.com',
        'gravatar.com',
        'intercom.io',
        'crisp.chat',
    ],

    // Only these domains must pass quality gates
    internalDomains: [
        'leagueoftraders.io',
        'api.leagueoftraders.io',
    ],

    // Block resource types that slow down tests
    blockedResourceTypes: [
        // Uncomment if you want to block images/fonts for speed
        // 'image',
        // 'font',
    ],
};

/**
 * Check if a URL should be blocked
 */
export function shouldBlockRequest(url: string): boolean {
    return networkRules.blockedDomains.some(domain => url.includes(domain));
}

/**
 * Check if errors from this URL should be ignored
 */
export function shouldIgnoreErrors(url: string): boolean {
    return networkRules.ignoredDomains.some(domain => url.includes(domain));
}

/**
 * Check if this is an internal request that must pass quality gates
 */
export function isInternalRequest(url: string): boolean {
    return networkRules.internalDomains.some(domain => url.includes(domain));
}
