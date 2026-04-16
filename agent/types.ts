import Anthropic from '@anthropic-ai/sdk';
import { ConsoleMessage, NetworkRequest } from '../utils/assertions';

export type { ConsoleMessage, NetworkRequest };

export type NielsenHeuristic =
  | 'visibility-of-system-status'
  | 'match-system-real-world'
  | 'user-control-freedom'
  | 'consistency-standards'
  | 'error-prevention'
  | 'recognition-recall'
  | 'flexibility-efficiency'
  | 'aesthetic-minimalist'
  | 'help-diagnose-errors'
  | 'help-documentation';

export type WCAGCriterion =
  | 'wcag-contrast'
  | 'wcag-keyboard-navigation'
  | 'wcag-alt-text'
  | 'wcag-focus-visible'
  | 'wcag-labels';

export type FindingSeverity = 'critical' | 'major' | 'minor' | 'suggestion';

export type ActionType = 'navigate' | 'click' | 'scroll' | 'fill' | 'annotate' | 'done';

export interface InteractiveElement {
  tag: string;
  text: string;
  ariaLabel?: string;
  selector: string;
  href?: string;
}

export interface PageObservation {
  url: string;
  pageTitle: string;
  screenshotBase64: string;
  screenshotPath: string;
  domSnapshot: string;
  consoleErrors: ConsoleMessage[];
  networkFailures: NetworkRequest[];
  viewportSize: { width: number; height: number };
  interactiveElements: InteractiveElement[];
  stepNumber: number;
}

export interface AgentAction {
  type: ActionType;
  target?: string;
  value?: string;
  reasoning: string;
}

export interface UXFinding {
  id: string;
  url: string;
  screenshotPath: string;
  heuristic: NielsenHeuristic | WCAGCriterion | string;
  severity: FindingSeverity;
  title: string;
  description: string;
  recommendation: string;
  affectedElement?: string;
}

export interface AgentSession {
  targetUrl: string;
  visitedUrls: string[];
  findings: UXFinding[];
  stepCount: number;
  maxSteps: number;
  startTime: number;
  conversationHistory: Anthropic.Messages.MessageParam[];
}

export interface AgentOptions {
  maxSteps: number;
  headless: boolean;
  viewportWidth: number;
  viewportHeight: number;
}

export interface ClaudeResponse {
  action: AgentAction;
  findings: UXFinding[];
  sessionNotes?: string;
}
