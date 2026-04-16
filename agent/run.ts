import * as dotenv from 'dotenv';
dotenv.config();

import { BrowserController } from './BrowserController';
import { ClaudeEvaluator } from './ClaudeEvaluator';
import { AgentLoop } from './AgentLoop';
import { ReportWriter } from './ReportWriter';
import { AgentSession, AgentOptions } from './types';

async function main(): Promise<void> {
  const targetUrl = process.argv[2] ?? process.env.BASE_URL ?? 'https://leagueoftraders.io';
  const maxSteps = parseInt(process.argv[3] ?? '30', 10);
  const headless = process.env.HEADLESS !== 'false';

  const options: AgentOptions = {
    maxSteps,
    headless,
    viewportWidth: 1280,
    viewportHeight: 720,
  };

  console.log('='.repeat(60));
  console.log('  AI UX Audit Agent');
  console.log('='.repeat(60));
  console.log(`  Target  : ${targetUrl}`);
  console.log(`  Steps   : ${maxSteps}`);
  console.log(`  Headless: ${headless}`);
  console.log('='.repeat(60));

  const browser = new BrowserController('agent-reports/screenshots');
  const evaluator = new ClaudeEvaluator();
  const loop = new AgentLoop(browser, evaluator, options);
  const writer = new ReportWriter('agent-reports');

  const session: AgentSession = {
    targetUrl,
    visitedUrls: [],
    findings: [],
    stepCount: 0,
    maxSteps,
    startTime: Date.now(),
    conversationHistory: [],
  };

  try {
    await browser.launch({ headless, width: options.viewportWidth, height: options.viewportHeight });

    const completedSession = await loop.run(session);

    console.log('\n[REPORT] Generating executive summary...');
    const summary = await evaluator.generateExecutiveSummary(completedSession);

    await writer.write(completedSession, summary);

    console.log('\n' + '='.repeat(60));
    console.log('  Audit Complete');
    console.log('='.repeat(60));
    console.log(`  Findings : ${completedSession.findings.length}`);
    console.log(`  Critical : ${completedSession.findings.filter(f => f.severity === 'critical').length}`);
    console.log(`  Major    : ${completedSession.findings.filter(f => f.severity === 'major').length}`);
    console.log(`  Pages    : ${completedSession.visitedUrls.length}`);
    console.log('  Report   : agent-reports/ux-report.md');
    console.log('='.repeat(60));
  } catch (err) {
    console.error('\n[ERROR]', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
