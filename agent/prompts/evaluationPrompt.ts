import { PageObservation, AgentSession } from '../types';

export function buildEvaluationPrompt(
  obs: PageObservation,
  session: AgentSession
): string {
  const visitedList = session.visitedUrls.length > 0
    ? session.visitedUrls.map(u => `  - ${u}`).join('\n')
    : '  (none yet)';

  const elementsText = obs.interactiveElements.length > 0
    ? obs.interactiveElements
        .slice(0, 30)
        .map((el, i) => `  ${i + 1}. [${el.tag.toUpperCase()}] "${el.text}"${el.ariaLabel ? ` (aria: "${el.ariaLabel}")` : ''}${el.href ? ` → ${el.href}` : ''} | selector: ${el.selector}`)
        .join('\n')
    : '  (none detected)';

  const consoleErrorsText = obs.consoleErrors.length > 0
    ? `${obs.consoleErrors.length} error(s) — first: "${obs.consoleErrors[0].text.substring(0, 100)}"`
    : 'none';

  const networkFailuresText = obs.networkFailures.length > 0
    ? `${obs.networkFailures.length} failure(s) — first: ${obs.networkFailures[0].method} ${obs.networkFailures[0].url.substring(0, 80)} → ${obs.networkFailures[0].status}`
    : 'none';

  const findingsSoFar = session.findings.length > 0
    ? `${session.findings.length} finding(s) across ${session.visitedUrls.length} page(s)`
    : 'none yet';

  return `CURRENT STATE — Step ${obs.stepNumber} of ${session.maxSteps}
URL: ${obs.url}
Page Title: "${obs.pageTitle}"
Viewport: ${obs.viewportSize.width}x${obs.viewportSize.height}

PAGES VISITED SO FAR:
${visitedList}

INTERACTIVE ELEMENTS VISIBLE (top 30):
${elementsText}

TECHNICAL SIGNALS:
- Console errors: ${consoleErrorsText}
- Network failures: ${networkFailuresText}

SESSION PROGRESS:
- Findings so far: ${findingsSoFar}
- Steps remaining: ${session.maxSteps - obs.stepNumber}

TASK:
Analyze the attached screenshot and DOM snapshot carefully. Look for UX issues according to Nielsen's heuristics and WCAG criteria. Consider:
- Visual hierarchy and CTA clarity
- Consistency with what you've seen on other pages
- Error prevention and feedback mechanisms
- Accessibility signals (contrast, labels, focus)
- Information architecture and navigation clarity

Then decide your next action. Remember: explore as a first-time user would, following the most natural next step.

DOM SNAPSHOT:
${obs.domSnapshot}`;
}
