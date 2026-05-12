export function getEnv(...keys: string[]): string | undefined {
    for (const key of keys) {
        const value = process.env[key];
        if (value && value.trim().length > 0) {
            return value.trim();
        }
    }
    return undefined;
}

export function getListEnv(key: string): string[] {
    const value = getEnv(key);
    if (!value) return [];

    return value
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
}

export function getBooleanEnv(key: string, fallback: boolean): boolean {
    const value = getEnv(key);
    if (!value) return fallback;

    return ['1', 'true', 'yes', 'y', 'on'].includes(value.toLowerCase());
}

export function getNumberEnv(key: string, fallback: number): number {
    const value = getEnv(key);
    if (!value) return fallback;

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export function getBaseURL(): string {
    const baseURL = getEnv('QA_BASE_URL', 'LOT_BASE_URL') || 'http://localhost:3000';
    return baseURL.replace(/\/$/, '');
}

export function getLoginPath(): string {
    const loginPath = getEnv('QA_LOGIN_PATH') || '/login';
    return loginPath.startsWith('/') ? loginPath : `/${loginPath}`;
}

export function shouldCheckLoginPage(): boolean {
    return getBooleanEnv('QA_CHECK_LOGIN', false);
}

export function getAuthCredentials(): { email?: string; password?: string } {
    return {
        email: getEnv('QA_EMAIL', 'LOT_EMAIL'),
        password: getEnv('QA_PASSWORD', 'LOT_PASSWORD'),
    };
}

export function hasAuthCredentials(): boolean {
    const { email, password } = getAuthCredentials();
    return Boolean(email && password);
}

export function getInternalDomains(): string[] {
    const configuredDomains = getListEnv('QA_INTERNAL_DOMAINS');
    if (configuredDomains.length > 0) return configuredDomains;

    try {
        return [new URL(getBaseURL()).hostname];
    } catch {
        return ['localhost'];
    }
}

export function getIgnoredBrokenLinkPatterns(): string[] {
    return getListEnv('QA_IGNORED_BROKEN_LINK_PATTERNS');
}
