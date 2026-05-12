import { getListEnv, getLoginPath, shouldCheckLoginPage } from '../utils/env';

export interface PageDefinition {
    path: string;
    name: string;
    requiresAuth: boolean;
    priority: 'critical' | 'high' | 'medium';
}

export interface ButtonRules {
    dangerPatterns: string[];
    safePatterns: string[];
    dangerRoutes: string[];
}

const authPathPatterns = getListEnv('QA_AUTH_PATHS');

function normalizePath(path: string): string {
    if (!path) return '/';
    return path.startsWith('/') ? path : `/${path}`;
}

function titleFromPath(path: string): string {
    if (path === '/') return 'Home';
    return path
        .split('/')
        .filter(Boolean)
        .map(part => part.replace(/[-_]/g, ' '))
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' / ');
}

function isAuthRequired(path: string): boolean {
    return authPathPatterns.some(pattern => path.includes(pattern));
}

function createPageDefinitions(paths: string[], priority: PageDefinition['priority']): PageDefinition[] {
    return Array.from(new Set(paths.map(normalizePath))).map(path => ({
        path,
        name: titleFromPath(path),
        requiresAuth: isAuthRequired(path),
        priority,
    }));
}

const defaultCriticalPaths = [
    '/',
    ...(shouldCheckLoginPage() ? [getLoginPath()] : []),
];

const configuredCriticalPaths = getListEnv('QA_CRITICAL_PATHS');
const configuredRegressionPaths = getListEnv('QA_REGRESSION_PATHS');

export const criticalPages: PageDefinition[] = createPageDefinitions(
    configuredCriticalPaths.length > 0 ? configuredCriticalPaths : defaultCriticalPaths,
    'critical'
);

export const regressionPages: PageDefinition[] = createPageDefinitions(
    configuredRegressionPaths.length > 0 ? configuredRegressionPaths : criticalPages.map(page => page.path),
    'high'
);

export const buttonRules: ButtonRules = {
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
        'submit payment',
        'delete account',
    ],
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
    dangerRoutes: [
        '/logout',
        '/signout',
        '/delete',
        '/settings/delete-account',
        '/wallet/withdraw',
        '/trade/execute',
        '/checkout/confirm',
    ],
};

export const crawlExclusions: string[] = [
    ...buttonRules.dangerRoutes,
    ...getListEnv('QA_CRAWL_EXCLUSIONS'),
    '/admin',
    '/api/',
    '/_next/',
    '/static/',
    '/assets/',
];

export function isDangerousButton(text: string, href?: string): boolean {
    const lowerText = text.toLowerCase();

    if (buttonRules.dangerPatterns.some(pattern => lowerText.includes(pattern))) {
        return true;
    }

    if (href && buttonRules.dangerRoutes.some(route => href.includes(route))) {
        return true;
    }

    return false;
}

export function shouldExcludeFromCrawl(url: string): boolean {
    return crawlExclusions.some(pattern => url.includes(pattern));
}
