import Anthropic from '@anthropic-ai/sdk';
import { systemPrompt } from './prompts/systemPrompt';
import { buildEvaluationPrompt } from './prompts/evaluationPrompt';
import { buildReportPrompt } from './prompts/reportPrompt';
import {
  PageObservation,
  AgentSession,
  AgentAction,
  UXFinding,
  ClaudeResponse,
  FindingSeverity,
} from './types';

export class ClaudeEvaluator {
  private client: Anthropic;
  private model = 'claude-sonnet-4-6';

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY environment variable is required');
    this.client = new Anthropic({ apiKey });
  }

  async think(
    observation: PageObservation,
    session: AgentSession
  ): Promise<{ action: AgentAction; findings: UXFinding[] }> {
    const userText = buildEvaluationPrompt(observation, session);

    const userMessage: Anthropic.Messages.MessageParam = {
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: observation.screenshotBase64,
          },
        },
        {
          type: 'text',
          text: userText,
        },
      ],
    };

    session.conversationHistory.push(userMessage);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      temperature: 0,
      system: systemPrompt,
      messages: session.conversationHistory,
    });

    const rawText = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as Anthropic.Messages.TextBlock).text)
      .join('');

    // Append assistant response to history
    session.conversationHistory.push({
      role: 'assistant',
      content: rawText,
    });

    const parsed = this.parseResponse(rawText, observation);
    return { action: parsed.action, findings: parsed.findings };
  }

  async generateExecutiveSummary(session: AgentSession): Promise<string> {
    const prompt = buildReportPrompt(session);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 512,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    });

    return response.content
      .filter(b => b.type === 'text')
      .map(b => (b as Anthropic.Messages.TextBlock).text)
      .join('');
  }

  private parseResponse(raw: string, observation: PageObservation): ClaudeResponse {
    const fallback: ClaudeResponse = {
      action: { type: 'annotate', reasoning: 'Response parse failed — continuing' },
      findings: [],
    };

    try {
      // Strip markdown fences if present
      const cleaned = raw
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      const parsed = JSON.parse(cleaned) as ClaudeResponse;

      // Validate action
      if (!parsed.action?.type) return fallback;

      // Validate and enrich findings
      const findings: UXFinding[] = (parsed.findings ?? []).map((f, i) => ({
        id: `${observation.stepNumber}-${i}`,
        url: observation.url,
        screenshotPath: observation.screenshotPath,
        heuristic: f.heuristic ?? 'unknown',
        severity: this.validateSeverity(f.severity),
        title: f.title ?? 'Untitled finding',
        description: f.description ?? '',
        recommendation: f.recommendation ?? '',
        affectedElement: f.affectedElement,
      }));

      return { action: parsed.action, findings, sessionNotes: parsed.sessionNotes };
    } catch (err) {
      console.warn(`  [WARN] Failed to parse Claude response: ${(err as Error).message}`);
      console.warn(`  Raw response (first 200 chars): ${raw.substring(0, 200)}`);
      return fallback;
    }
  }

  private validateSeverity(value: unknown): FindingSeverity {
    const valid: FindingSeverity[] = ['critical', 'major', 'minor', 'suggestion'];
    return valid.includes(value as FindingSeverity) ? (value as FindingSeverity) : 'minor';
  }
}
