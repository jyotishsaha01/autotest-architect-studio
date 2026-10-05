export type FrameworkType = 'playwright-ts' | 'playwright-js' | 'playwright-python' | 'selenium-java' | 'selenium-python';

export type ActionType = 
  | 'navigate'
  | 'click'
  | 'fill'
  | 'select'
  | 'check'
  | 'uncheck'
  | 'press'
  | 'hover'
  | 'wait_for'
  | 'assert_visible'
  | 'assert_text'
  | 'assert_url';

export interface LocatorCandidate {
  strategy: 'role' | 'testid' | 'label' | 'placeholder' | 'id' | 'css' | 'xpath';
  selector: string;
  confidence: number;
  description?: string;
}

export interface TestIRStep {
  id: string;
  stepNumber: number;
  action: ActionType;
  description: string;
  target?: {
    semantic: string; // e.g. "Username input field", "Sign In submit button"
    role?: string;
    locators?: LocatorCandidate[];
    recommendedLocator?: string;
  };
  value?: string;
  expectedResult?: string;
  screenshotRef?: string;
  timestamp?: string; // e.g. for video timestamps like "00:03.2"
}

export interface TestIR {
  id: string;
  testCaseId: string;
  title: string;
  description: string;
  feature: string;
  sprint: string;
  priority: 'P0' | 'P1' | 'P2';
  baseUrl: string;
  steps: TestIRStep[];
  preconditions?: string[];
  postconditions?: string[];
  tags?: string[];
}

export interface UIElementModel {
  semanticId: string; // e.g. "auth.login.submit_button"
  businessName: string;
  page: string;
  role: string;
  primaryLocator: string;
  fallbackLocators: string[];
  currentText?: string;
  attributes?: Record<string, string>;
  lastUpdatedSprint: string;
}

export interface SprintChangeDiff {
  elementSemanticId: string;
  elementName: string;
  changeType: 'MODIFIED' | 'ADDED' | 'REMOVED' | 'RENAMED';
  oldValue: string;
  newValue: string;
  impactedTests: string[];
  confidence: number;
  suggestedPatch: string;
  explanation: string;
}

export interface GeneratedCodeFile {
  filename: string;
  filepath: string;
  language: 'typescript' | 'javascript' | 'python' | 'java' | 'json' | 'text';
  framework: FrameworkType;
  code: string;
  description: string;
}

export interface ExecutionStepResult {
  stepNumber: number;
  action: string;
  target: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs: number;
  error?: string;
  screenshot?: string;
}

export interface ExecutionReport {
  id: string;
  testCaseId: string;
  timestamp: string;
  durationMs: number;
  status: 'passed' | 'failed' | 'healed';
  passedSteps: number;
  failedSteps: number;
  totalSteps: number;
  steps: ExecutionStepResult[];
  failureAnalysis?: {
    category: 'LOCATOR_CHANGED' | 'APP_BUG' | 'TIMING' | 'ASSERTION_FAIL';
    summary: string;
    oldLocator?: string;
    suggestedFix?: string;
    diffSnippet?: string;
  };
}
