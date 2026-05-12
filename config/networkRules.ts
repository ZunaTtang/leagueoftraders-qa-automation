import { getInternalDomains, getListEnv } from '../utils/env';

export interface NetworkRules {
    blockedDomains: string[];
    ignoredDomains: string[];
    internalDomains: string[];
    blockedResourceTypes: string[];
}

export const networkRules: NetworkRules = {
    blockedDomains: [
        'googletagmanager.com',
        'google-analytics.com',
        'doubleclick.net',
        'facebook.com',
        'facebook.net',
        'hotjar.com',
        'segment.io',
        'analytics.google.com',
        ...getListEnv('QA_BLOCKED_DOMAINS'),
    ],
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
        ...getListEnv('QA_IGNORED_DOMAINS'),
    ],
    internalDomains: getInternalDomains(),
    blockedResourceTypes: getListEnv('QA_BLOCKED_RESOURCE_TYPES'),
};

export function shouldBlockRequest(url: string): boolean {
    return networkRules.blockedDomains.some(domain => url.includes(domain));
}

export function shouldIgnoreErrors(url: string): boolean {
    return networkRules.ignoredDomains.some(domain => url.includes(domain));
}

export function isInternalRequest(url: string): boolean {
    return networkRules.internalDomains.some(domain => url.includes(domain));
}
