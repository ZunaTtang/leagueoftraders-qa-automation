import { chromium, Browser, BrowserContext, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { setupMonitoring } from '../utils/assertions';
import { isDangerousButton, shouldExcludeFromCrawl } from '../config/keyPages';
import {
  PageObservation,
  AgentAction,
  InteractiveElement,
  ConsoleMessage,
  NetworkRequest,
} from './types';

export class BrowserController {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private consoleErrors: ConsoleMessage[] = [];
  private networkFailures: NetworkRequest[] = [];
  private screenshotDir: string;

  constructor(screenshotDir = 'agent-reports/screenshots') {
    this.screenshotDir = screenshotDir;
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  async launch(options: { headless: boolean; width: number; height: number }): Promise<void> {
    this.browser = await chromium.launch({ headless: options.headless });
    this.context = await this.browser.newContext({
      viewport: { width: options.width, height: options.height },
    });
    this.page = await this.context.newPage();
    const monitoring = await setupMonitoring(this.page);
    this.consoleErrors = monitoring.consoleErrors;
    this.networkFailures = monitoring.failedRequests;
  }

  async observe(stepNumber: number, navigateTo?: string): Promise<PageObservation> {
    if (!this.page) throw new Error('Browser not launched');

    if (navigateTo) {
      await this.page.goto(navigateTo, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await this.page.waitForTimeout(800);
    }

    const url = this.page.url();
    const pageTitle = await this.page.title();
    const viewport = this.page.viewportSize() ?? { width: 1280, height: 720 };

    // Take screenshot at three scroll positions for tall pages
    const screenshotPath = path.join(
      this.screenshotDir,
      `step${String(stepNumber).padStart(3, '0')}_${this.slugify(url)}.png`
    );
    await this.page.screenshot({ path: screenshotPath, fullPage: false });
    const screenshotBuffer = fs.readFileSync(screenshotPath);
    const screenshotBase64 = screenshotBuffer.toString('base64');

    // Extract DOM snapshot
    const domSnapshot = await this.extractDomSnapshot();
    const interactiveElements = await this.extractInteractiveElements();

    // Snapshot and reset monitoring arrays (keep accumulating for now)
    const consoleErrors = [...this.consoleErrors];
    const networkFailures = [...this.networkFailures];

    return {
      url,
      pageTitle,
      screenshotBase64,
      screenshotPath,
      domSnapshot,
      consoleErrors,
      networkFailures,
      viewportSize: viewport,
      interactiveElements,
      stepNumber,
    };
  }

  async execute(action: AgentAction): Promise<void> {
    if (!this.page) throw new Error('Browser not launched');

    switch (action.type) {
      case 'navigate':
        if (!action.target) break;
        if (shouldExcludeFromCrawl(action.target)) {
          console.log(`  [SKIP] Excluded URL: ${action.target}`);
          break;
        }
        await this.page.goto(action.target, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await this.page.waitForTimeout(500);
        break;

      case 'click':
        if (!action.target) break;
        try {
          const el = this.page.locator(action.target).first();
          const text = (await el.textContent()) ?? '';
          const href = await el.getAttribute('href') ?? undefined;
          if (isDangerousButton(text, href)) {
            console.log(`  [SKIP] Dangerous button: "${text}"`);
            break;
          }
          await el.click({ timeout: 5000 });
          await this.page.waitForTimeout(500);
        } catch (err) {
          console.log(`  [WARN] Click failed on "${action.target}": ${(err as Error).message}`);
        }
        break;

      case 'scroll':
        await this.page.evaluate(() => window.scrollBy(0, 600));
        await this.page.waitForTimeout(300);
        break;

      case 'fill':
        if (!action.target || !action.value) break;
        try {
          await this.page.locator(action.target).first().fill(action.value, { timeout: 5000 });
        } catch (err) {
          console.log(`  [WARN] Fill failed on "${action.target}": ${(err as Error).message}`);
        }
        break;

      case 'annotate':
      case 'done':
        // No browser action needed
        break;
    }
  }

  async close(): Promise<void> {
    await this.browser?.close();
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  private async extractDomSnapshot(): Promise<string> {
    if (!this.page) return '';
    return this.page.evaluate(() => {
      const lines: string[] = [];

      // Headings
      document.querySelectorAll('h1, h2, h3').forEach(h => {
        const text = h.textContent?.trim();
        if (text) lines.push(`[${h.tagName}] ${text}`);
      });

      // Meta description
      const meta = document.querySelector('meta[name="description"]');
      if (meta) lines.push(`[META] ${meta.getAttribute('content')}`);

      // Form labels
      document.querySelectorAll('label').forEach(l => {
        const text = l.textContent?.trim();
        if (text) lines.push(`[LABEL] ${text}`);
      });

      // Placeholder text on inputs
      document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(el => {
        lines.push(`[INPUT] placeholder="${(el as HTMLInputElement).placeholder}"`);
      });

      // Main paragraph text (first 3)
      let pCount = 0;
      document.querySelectorAll('p').forEach(p => {
        if (pCount >= 3) return;
        const text = p.textContent?.trim().substring(0, 120);
        if (text && text.length > 20) {
          lines.push(`[P] ${text}`);
          pCount++;
        }
      });

      return lines.join('\n');
    });
  }

  private async extractInteractiveElements(): Promise<InteractiveElement[]> {
    if (!this.page) return [];
    return this.page.evaluate(() => {
      const results: Array<{
        tag: string;
        text: string;
        ariaLabel?: string;
        selector: string;
        href?: string;
      }> = [];
      const seen = new Set<string>();

      const getSelector = (el: Element): string => {
        if (el.id) return `#${el.id}`;
        if (el.getAttribute('data-testid')) return `[data-testid="${el.getAttribute('data-testid')}"]`;
        if (el.getAttribute('aria-label')) return `[aria-label="${el.getAttribute('aria-label')}"]`;
        const text = el.textContent?.trim().substring(0, 30);
        if (text) return `${el.tagName.toLowerCase()}:has-text("${text}")`;
        return el.tagName.toLowerCase();
      };

      document.querySelectorAll('button, a, [role="button"], input[type="submit"]').forEach(el => {
        const text = (el.textContent ?? '').trim().substring(0, 60);
        const ariaLabel = el.getAttribute('aria-label') ?? undefined;
        const key = `${el.tagName}:${text}:${ariaLabel}`;
        if (seen.has(key) || results.length >= 30) return;
        seen.add(key);

        results.push({
          tag: el.tagName.toLowerCase(),
          text: text || '(no text)',
          ariaLabel,
          selector: getSelector(el),
          href: (el as HTMLAnchorElement).href || undefined,
        });
      });

      return results;
    });
  }

  private slugify(url: string): string {
    return url
      .replace(/^https?:\/\//, '')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 60);
  }
}
