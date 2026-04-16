import { AgentSession } from '../types';

export function buildReportPrompt(session: AgentSession): string {
  const duration = Math.round((Date.now() - session.startTime) / 1000);
  const criticalCount = session.findings.filter(f => f.severity === 'critical').length;
  const majorCount = session.findings.filter(f => f.severity === 'major').length;
  const minorCount = session.findings.filter(f => f.severity === 'minor').length;
  const suggestionCount = session.findings.filter(f => f.severity === 'suggestion').length;

  const findingsSummary = session.findings.map((f, i) =>
    `${i + 1}. [${f.severity.toUpperCase()}] ${f.title} (${f.heuristic}) — ${f.description}`
  ).join('\n');

  return `You have completed a UX audit of ${session.targetUrl}.

AUDIT STATS:
- Pages visited: ${session.visitedUrls.length}
- Total steps: ${session.stepCount}
- Duration: ${duration}s
- Findings: ${session.findings.length} total (${criticalCount} critical, ${majorCount} major, ${minorCount} minor, ${suggestionCount} suggestions)

PAGES VISITED:
${session.visitedUrls.map(u => `  - ${u}`).join('\n')}

ALL FINDINGS:
${findingsSummary}

Write a concise executive summary (3-5 sentences) for a product team. Focus on:
1. The most important UX problems discovered
2. Which part of the user journey is most affected
3. The top 2-3 priorities for improvement

Write plain prose only — no JSON, no bullet points, no markdown headers. Just paragraphs.`;
}
