import * as fs from 'fs';
import * as path from 'path';
import { AgentSession, UXFinding, FindingSeverity, NielsenHeuristic } from './types';

const NIELSEN_NAMES: Record<string, string> = {
  'visibility-of-system-status': 'Visibility of System Status',
  'match-system-real-world': 'Match Between System and Real World',
  'user-control-freedom': 'User Control and Freedom',
  'consistency-standards': 'Consistency and Standards',
  'error-prevention': 'Error Prevention',
  'recognition-recall': 'Recognition Rather Than Recall',
  'flexibility-efficiency': 'Flexibility and Efficiency of Use',
  'aesthetic-minimalist': 'Aesthetic and Minimalist Design',
  'help-diagnose-errors': 'Help Users Recognize, Diagnose, and Recover From Errors',
  'help-documentation': 'Help and Documentation',
  'wcag-contrast': 'WCAG: Color Contrast',
  'wcag-keyboard-navigation': 'WCAG: Keyboard Navigation',
  'wcag-alt-text': 'WCAG: Alt Text',
  'wcag-focus-visible': 'WCAG: Focus Visible',
  'wcag-labels': 'WCAG: Form Labels',
};

const SEVERITY_ORDER: FindingSeverity[] = ['critical', 'major', 'minor', 'suggestion'];

export class ReportWriter {
  private outputDir: string;

  constructor(outputDir = 'agent-reports') {
    this.outputDir = outputDir;
    fs.mkdirSync(outputDir, { recursive: true });
  }

  async write(session: AgentSession, executiveSummary: string): Promise<void> {
    const markdown = this.buildMarkdown(session, executiveSummary);
    const mdPath = path.join(this.outputDir, 'ux-report.md');
    const jsonPath = path.join(this.outputDir, 'ux-report.json');

    fs.writeFileSync(mdPath, markdown, 'utf-8');
    fs.writeFileSync(
      jsonPath,
      JSON.stringify(
        {
          targetUrl: session.targetUrl,
          generatedAt: new Date().toISOString(),
          durationSeconds: Math.round((Date.now() - session.startTime) / 1000),
          pagesVisited: session.visitedUrls,
          totalFindings: session.findings.length,
          findings: session.findings,
          executiveSummary,
        },
        null,
        2
      ),
      'utf-8'
    );

    console.log(`\n[REPORT] Saved to ${mdPath}`);
    console.log(`[REPORT] JSON saved to ${jsonPath}`);
  }

  private buildMarkdown(session: AgentSession, executiveSummary: string): string {
    const date = new Date().toISOString().split('T')[0];
    const duration = Math.round((Date.now() - session.startTime) / 1000);
    const sorted = [...session.findings].sort(
      (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
    );

    const criticalCount = sorted.filter(f => f.severity === 'critical').length;
    const majorCount = sorted.filter(f => f.severity === 'major').length;
    const minorCount = sorted.filter(f => f.severity === 'minor').length;
    const suggestionCount = sorted.filter(f => f.severity === 'suggestion').length;

    const lines: string[] = [];

    // Header
    lines.push(`# UX Audit Report: ${session.targetUrl}`);
    lines.push('');
    lines.push(
      `**Generated:** ${date} | **Duration:** ${duration}s | **Pages Visited:** ${session.visitedUrls.length} | **Total Findings:** ${session.findings.length}`
    );
    lines.push('');

    // Score overview
    lines.push('## Severity Overview');
    lines.push('');
    lines.push('| Severity | Count |');
    lines.push('|----------|-------|');
    lines.push(`| 🔴 Critical | ${criticalCount} |`);
    lines.push(`| 🟠 Major | ${majorCount} |`);
    lines.push(`| 🟡 Minor | ${minorCount} |`);
    lines.push(`| 💡 Suggestion | ${suggestionCount} |`);
    lines.push('');

    // Heuristic breakdown
    const byHeuristic = this.groupByHeuristic(sorted);
    if (Object.keys(byHeuristic).length > 0) {
      lines.push('## Issues by Heuristic');
      lines.push('');
      lines.push('| Heuristic | Issues | Worst Severity |');
      lines.push('|-----------|--------|----------------|');
      for (const [heuristic, findings] of Object.entries(byHeuristic)) {
        const worstIdx = Math.min(...findings.map(f => SEVERITY_ORDER.indexOf(f.severity)));
        const worst = SEVERITY_ORDER[worstIdx];
        const label = NIELSEN_NAMES[heuristic] ?? heuristic;
        lines.push(`| ${label} | ${findings.length} | ${worst} |`);
      }
      lines.push('');
    }

    // Executive Summary
    lines.push('## Executive Summary');
    lines.push('');
    lines.push(executiveSummary);
    lines.push('');

    // Findings
    lines.push('## Findings');
    lines.push('');

    for (const finding of sorted) {
      const severityIcon = { critical: '🔴', major: '🟠', minor: '🟡', suggestion: '💡' }[finding.severity];
      const heuristicLabel = NIELSEN_NAMES[finding.heuristic] ?? finding.heuristic;
      lines.push(`### ${severityIcon} [${finding.severity.toUpperCase()}] ${finding.title}`);
      lines.push('');
      lines.push(`**Page:** \`${finding.url}\``);
      lines.push(`**Heuristic:** ${heuristicLabel}`);
      if (finding.affectedElement) {
        lines.push(`**Element:** \`${finding.affectedElement}\``);
      }
      lines.push('');
      lines.push(`**Observed:** ${finding.description}`);
      lines.push('');
      lines.push(`**Recommendation:** ${finding.recommendation}`);
      lines.push('');
      if (finding.screenshotPath && fs.existsSync(finding.screenshotPath)) {
        const relPath = path.relative(this.outputDir, finding.screenshotPath).replace(/\\/g, '/');
        lines.push(`![Screenshot](${relPath})`);
        lines.push('');
      }
      lines.push('---');
      lines.push('');
    }

    // Pages visited
    lines.push('## Pages Visited');
    lines.push('');
    for (const url of session.visitedUrls) {
      lines.push(`- ${url}`);
    }
    lines.push('');

    return lines.join('\n');
  }

  private groupByHeuristic(findings: UXFinding[]): Record<string, UXFinding[]> {
    const groups: Record<string, UXFinding[]> = {};
    for (const f of findings) {
      if (!groups[f.heuristic]) groups[f.heuristic] = [];
      groups[f.heuristic].push(f);
    }
    return groups;
  }
}
