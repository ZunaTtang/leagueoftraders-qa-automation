/**
 * Key Pages Configuration
 * Defines critical pages, button rules, and danger zones
 */

export interface PageDefinition {
    path: string;
    name: string;
    requiresAuth: boolean;
    priority: 'critical' | 'high' | 'medium';
}

export interface ButtonRules {
    /** Selectors or text patterns for dangerous buttons (never click) */
    dangerPatterns: string[];

    /** Selectors or text patterns for safe buttons (ok to click) */
    safePatterns: string[];

    /** Routes that should never be clicked */
    dangerRoutes: string[];
}

/**
 * Critical pages to test in Smoke suite
 */
export const criticalPages: PageDefinition[] = [
    { path: '/', name: 'Homepage', requiresAuth: false, priority: 'critical' },
    { path: '/login', name: 'Login Page', requiresAuth: false, priority: 'critical' },
    { path: '/dashboard', name: 'Dashboard', requiresAuth: true, priority: 'critical' },
    { path: '/markets', name: 'Markets', requiresAuth: false, priority: 'critical' },
    { path: '/leaderboard', name: 'Leaderboard', requiresAuth: false, priority: 'high' },
];

/**
 * Additional pages for Regression suite
 */
export const regressionPages: PageDefinition[] = [
    ...criticalPages,
    { path: '/about', name: 'About', requiresAuth: false, priority: 'medium' },
    { path: '/pricing', name: 'Pricing', requiresAuth: false, priority: 'high' },
    { path: '/profile', name: 'My Profile', requiresAuth: true, priority: 'high' },
    { path: '/settings', name: 'Settings', requiresAuth: true, priority: 'medium' },
];

/**
 * Button interaction rules
 */
export const buttonRules: ButtonRules = {
    // Never click these (destructive actions)
    dangerPatterns: [
        'logout',
        'log out',
        'sign out',
        'delete',
        'remove',
        'withdraw',
        'transfer',
        'confirm payment',
        'place order',
        'buy now',
        'sell now',
    ],

    // Safe to click (read-only or navigation)
    safePatterns: [
        'learn more',
        'view details',
        'see more',
        'explore',
        'read more',
        'close',
        'cancel',
        'back',
        'menu',
        'filter',
        'sort',
    ],

    // Routes to avoid
    dangerRoutes: [
        '/logout',
        '/signout',
        '/delete',
        '/settings/delete-account',
        '/wallet/withdraw',
        '/trade/execute',
    ],
};

/**
 * Routes to exclude from crawling (dangerous or out of scope)
 */
export const crawlExclusions: string[] = [
    ...buttonRules.dangerRoutes,
    '/admin',
    '/api/',
    '/_next/',
    '/static/',
    '/assets/',
];

/**
 * Check if a button should be avoided
 */
export function isDangerousButton(text: string, href?: string): boolean {
    const lowerText = text.toLowerCase();

    // Check danger patterns
    if (buttonRules.dangerPatterns.some(pattern => lowerText.includes(pattern))) {
        return true;
    }

    // Check danger routes
    if (href && buttonRules.dangerRoutes.some(route => href.includes(route))) {
        return true;
    }

    return false;
}

/**
 * Check if a URL should be excluded from crawling
 */
export function shouldExcludeFromCrawl(url: string): boolean {
    return crawlExclusions.some(pattern => url.includes(pattern));
}
