import { TestIR, TestIRStep } from '../types/testAutomation';

const isNavigationInstruction = (text: string) =>
  /^(?:navigate\b|go to\b|launch\b)|^open\b.*(?:https?:\/\/|\/[a-zA-Z0-9_\-/]*|\b(?:page|site|website|application|app)\b)/i.test(text);

export function buildFallbackIR(
  featureName: string,
  baseUrl: string,
  textContent: string,
  domSnippet?: string
): TestIR {
  const steps: TestIRStep[] = [];
  const lines = textContent
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  // If specific lines like "Step 1: Open store catalog page at /products"
  let stepIndex = 1;

  // Initial navigation step if not first
  const hasNav = lines.some((line) => {
    const instruction = line.replace(/^(step\s*\d+[:.-]?|\d+[:.)-]?|[-*])\s*/i, '').trim();
    return isNavigationInstruction(instruction);
  });
  if (!hasNav) {
    steps.push({
      id: `step-${stepIndex}`,
      stepNumber: stepIndex++,
      action: 'navigate',
      description: `Open application target at ${baseUrl || '/'}`,
      value: baseUrl || '/'
    });
  }

  for (const rawLine of lines) {
    // Strip leading "Step X:", "1.", "- ", etc.
    const clean = rawLine.replace(/^(step\s*\d+[:.-]?|\d+[:.)-]?|[-*])\s*/i, '').trim();
    if (!clean || /^test\s*case/i.test(clean)) continue;

    const lower = clean.toLowerCase();

    if (isNavigationInstruction(clean)) {
      const matchUrl = clean.match(/https?:\/\/[^\s]+|\/[a-zA-Z0-9_\-\/]*/);
      const url = matchUrl ? matchUrl[0] : (baseUrl || '/');
      steps.push({
        id: `step-${stepIndex}`,
        stepNumber: stepIndex++,
        action: 'navigate',
        description: clean,
        value: url
      });
    } else if (/fill|enter|type|input/i.test(lower)) {
      // e.g. "Fill Shipping Address: '100 Market St, San Francisco, CA'"
      // or "Enter username"
      const valMatch = clean.match(/["']([^"']+)["']/);
      const val = valMatch ? valMatch[1] : 'sample_input';
      
      let semantic = 'Input field';
      let locator = "input[type='text']";

      if (/user|email/i.test(lower)) {
        semantic = 'Username or Email field';
        locator = "input[name='username'], input[data-testid='username-input']";
      } else if (/pass/i.test(lower)) {
        semantic = 'Password secret field';
        locator = "input[type='password'], input[data-testid='password-input']";
      } else if (/address/i.test(lower)) {
        semantic = 'Shipping Address input';
        locator = "input[data-testid='address-input'], input[name='address']";
      } else if (/card|cc/i.test(lower)) {
        semantic = 'Card Number input';
        locator = "input[data-testid='cc-input'], input[name='card_number']";
      } else {
        const words = clean.split(/\s+/).slice(1, 4).join(' ');
        semantic = `${words || 'Form'} input`;
        locator = `input[name='${words.toLowerCase().replace(/[^a-z0-9]/g, '_')}']`;
      }

      steps.push({
        id: `step-${stepIndex}`,
        stepNumber: stepIndex++,
        action: 'fill',
        description: clean,
        value: val,
        target: {
          semantic,
          role: 'textbox',
          recommendedLocator: locator,
          locators: [
            { strategy: 'testid', selector: locator, confidence: 0.95 },
            { strategy: 'role', selector: `getByRole('textbox', { name: '${semantic}' })`, confidence: 0.90 }
          ]
        }
      });
    } else if (/click|press|select|tap/i.test(lower)) {
      // e.g. Click "Add to Cart" button (data-testid: add-to-cart)
      const testidMatch = clean.match(/data-testid[:=]\s*["']?([a-zA-Z0-9_\-]+)["']?/i);
      const quoted = clean.match(/["']([^"']+)["']/);
      const btnName = quoted ? quoted[1] : clean.replace(/click\s*(on)?/i, '').replace(/button/i, '').trim();

      const recLocator = testidMatch 
        ? `[data-testid='${testidMatch[1]}']`
        : `button:has-text('${btnName}')`;

      steps.push({
        id: `step-${stepIndex}`,
        stepNumber: stepIndex++,
        action: 'click',
        description: clean,
        target: {
          semantic: `${btnName} action button`,
          role: 'button',
          recommendedLocator: recLocator,
          locators: [
            { strategy: 'role', selector: `getByRole('button', { name: '${btnName}' })`, confidence: 0.96 },
            { strategy: 'css', selector: recLocator, confidence: 0.92 }
          ]
        }
      });
    } else if (/verify|assert|check|confirm|ensure/i.test(lower)) {
      const quoted = clean.match(/["']([^"']+)["']/);
      const expectedText = quoted ? quoted[1] : 'confirmed';

      steps.push({
        id: `step-${stepIndex}`,
        stepNumber: stepIndex++,
        action: 'assert_visible',
        description: clean,
        expectedResult: expectedText,
        target: {
          semantic: 'Confirmation / Status banner',
          role: 'status',
          recommendedLocator: `text="${expectedText}"`,
          locators: [
            { strategy: 'role', selector: `getByText('${expectedText}')`, confidence: 0.97 },
            { strategy: 'css', selector: `[data-testid*='confirm'], [data-testid*='status']`, confidence: 0.88 }
          ]
        }
      });
    } else {
      // General step
      steps.push({
        id: `step-${stepIndex}`,
        stepNumber: stepIndex++,
        action: 'click',
        description: clean,
        target: {
          semantic: clean.slice(0, 30),
          recommendedLocator: `text="${clean.slice(0, 20)}"`
        }
      });
    }
  }

  // If no steps generated, provide sensible defaults
  if (steps.length === 0) {
    steps.push({
      id: 'step-1',
      stepNumber: 1,
      action: 'navigate',
      description: 'Navigate to target application',
      value: baseUrl || '/'
    });
  }

  return {
    id: `ir-fallback-${Date.now()}`,
    testCaseId: `TC_${(featureName || 'FLOW').toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 10)}_001`,
    title: `${featureName || 'Application'} End-to-End Test Scenario`,
    description: `Synthesized robust automation flow for ${featureName || 'Target App'} with fallback resilience.`,
    feature: featureName || 'Application Feature',
    sprint: 'Sprint 24',
    priority: 'P0',
    baseUrl: baseUrl || 'https://demo-shop.autotest.io',
    preconditions: ['Target environment is online', 'Browser is initialized in headless mode'],
    postconditions: ['Session completed cleanly', 'Assertions evaluated successfully'],
    steps
  };
}
