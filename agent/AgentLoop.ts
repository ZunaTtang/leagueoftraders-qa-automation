import { BrowserController } from './BrowserController';
import { ClaudeEvaluator } from './ClaudeEvaluator';
import { AgentSession, AgentOptions, UXFinding } from './types';
import { shouldExcludeFromCrawl } from '../config/keyPages';

export class AgentLoop {
  constructor(
    private browser: BrowserController,
    private evaluator: ClaudeEvaluator,
    private options: AgentOptions
  ) {}

  async run(session: AgentSession): Promise<AgentSession> {
    console.log(`\n[AGENT] Starting UX audit of ${session.targetUrl}`);
    console.log(`[AGENT] Max steps: ${session.maxSteps}\n`);

    // Initial observation at target URL
    let observation = await this.browser.observe(0, session.targetUrl);
    session.visitedUrls.push(observation.url);

    while (session.stepCount < session.maxSteps) {
      session.stepCount++;
      console.log(`\n[STEP ${session.stepCount}/${session.maxSteps}] ${observation.url}`);

      // Think: ask Claude to evaluate and decide
      const { action, findings } = await this.evaluator.think(observation, session);

      // Record findings (deduplicate by title + url)
      for (const finding of findings) {
        if (!this.isDuplicateFinding(finding, session.findings)) {
          session.findings.push(finding);
          console.log(`  + [${finding.severity.toUpperCase()}] ${finding.title}`);
        }
      }

      console.log(`  → Action: ${action.type}${action.target ? ` "${action.target}"` : ''}`);
      console.log(`    Reason: ${action.reasoning}`);

      // Stop conditions
      if (action.type === 'done') {
        console.log('\n[AGENT] Claude decided audit is complete.');
        break;
      }

      // Prevent re-visiting already seen URLs
      if (action.type === 'navigate' && action.target) {
        const normalized = this.normalizeUrl(action.target);
        if (session.visitedUrls.some(u => this.normalizeUrl(u) === normalized)) {
          console.log(`  [SKIP] Already visited: ${action.target}`);
          // Force done after too many skips to avoid spinning
          if (session.visitedUrls.length >= 3) {
            console.log('[AGENT] All nearby pages visited, ending audit.');
            break;
          }
          continue;
        }
        if (shouldExcludeFromCrawl(action.target)) {
          console.log(`  [SKIP] Excluded from crawl: ${action.target}`);
          continue;
        }
      }

      // Execute action
      await this.browser.execute(action);

      // Observe new state
      observation = await this.browser.observe(session.stepCount);
      const currentUrl = observation.url;

      // Track new URL if navigation happened
      if (!session.visitedUrls.some(u => this.normalizeUrl(u) === this.normalizeUrl(currentUrl))) {
        session.visitedUrls.push(currentUrl);
      }

      // Early stop: enough findings or pages
      if (session.findings.length >= 20 || session.visitedUrls.length >= 10) {
        console.log('\n[AGENT] Sufficient findings collected. Ending audit.');
        break;
      }
    }

    console.log(`\n[AGENT] Audit complete. ${session.findings.length} findings across ${session.visitedUrls.length} pages.`);
    return session;
  }

  private isDuplicateFinding(candidate: UXFinding, existing: UXFinding[]): boolean {
    return existing.some(
      f => f.url === candidate.url && f.title.toLowerCase() === candidate.title.toLowerCase()
    );
  }

  private normalizeUrl(url: string): string {
    try {
      const u = new URL(url);
      // Remove trailing slash and fragment
      return `${u.origin}${u.pathname.replace(/\/$/, '')}${u.search}`;
    } catch {
      return url;
    }
  }
}
