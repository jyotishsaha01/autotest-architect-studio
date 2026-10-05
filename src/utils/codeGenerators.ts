import { TestIR, TestIRStep, FrameworkType, GeneratedCodeFile } from '../types/testAutomation';

export function generateAutomationSuite(ir: TestIR, framework: FrameworkType): GeneratedCodeFile[] {
  switch (framework) {
    case 'playwright-ts':
      return generatePlaywrightTS(ir);
    case 'playwright-js':
      return generatePlaywrightJS(ir);
    case 'playwright-python':
      return generatePlaywrightPython(ir);
    case 'selenium-java':
      return generateSeleniumJava(ir);
    case 'selenium-python':
      return generateSeleniumPython(ir);
    default:
      return generatePlaywrightTS(ir);
  }
}

// Playwright JavaScript generator (ES modules, no TypeScript annotations).
function generatePlaywrightJS(ir: TestIR): GeneratedCodeFile[] {
  const pageClassName = `${toPascalCase(ir.feature || 'App')}Page`;
  const specFileName = `${toFileSlug(ir.testCaseId)}_${toCamelCase(ir.title)}.spec.js`;
  const targets = new Map<string, { semantic: string; locator: string }>();

  ir.steps.forEach((step) => {
    if (step.target?.semantic && step.target.recommendedLocator) {
      const key = jsTargetName(step.target.semantic);
      if (!targets.has(key)) targets.set(key, { semantic: step.target.semantic, locator: step.target.recommendedLocator });
    }
  });

  const pageMethods = [...targets].map(([key, target]) => `\n  /** ${safeComment(target.semantic)} */\n  get ${key}() {\n    return ${playwrightJsLocator('this.page', target.locator)};\n  }`).join('\n');
  const pageObject = `/** Page object for ${safeComment(ir.feature)} (${safeComment(ir.testCaseId)}). */\nexport class ${pageClassName} {\n  constructor(page) {\n    this.page = page;\n  }\n\n  async goto(url = ${JSON.stringify(ir.baseUrl || '/')}) {\n    await this.page.goto(url);\n  }${pageMethods}\n}\n`;

  const steps = ir.steps.map((step) => {
    const target = step.target?.semantic ? `appPage.${jsTargetName(step.target.semantic)}` : null;
    let action = `// Action not generated: ${step.action}`;
    if (step.action === 'navigate') action = `await appPage.goto(${JSON.stringify(step.value || ir.baseUrl || '/')});`;
    else if (step.action === 'fill' && target) action = `await ${target}.fill(${JSON.stringify(step.value || '')});`;
    else if (step.action === 'click' && target) action = `await ${target}.click();`;
    else if (step.action === 'select' && target) action = `await ${target}.selectOption(${JSON.stringify(step.value || '')});`;
    else if (step.action === 'check' && target) action = `await ${target}.check();`;
    else if (step.action === 'uncheck' && target) action = `await ${target}.uncheck();`;
    else if (step.action === 'hover' && target) action = `await ${target}.hover();`;
    else if (step.action === 'press' && target) action = `await ${target}.press(${JSON.stringify(step.value || 'Enter')});`;
    else if (step.action === 'wait_for' && target) action = `await ${target}.waitFor();`;
    else if (step.action === 'assert_visible' && target) action = `await expect(${target}).toBeVisible();`;
    else if (step.action === 'assert_text' && target) action = `await expect(${target}).toContainText(${JSON.stringify(step.expectedResult || step.value || '')});`;
    else if (step.action === 'assert_url') action = `await expect(page).toHaveURL(new RegExp(${JSON.stringify(step.value || '')}));`;
    return `    // Step ${step.stepNumber}: ${safeComment(step.description)}\n    ${action}`;
  }).join('\n\n');

  const spec = `import { test, expect } from '@playwright/test';\nimport { ${pageClassName} } from '../pages/${pageClassName}.js';\n\ntest.describe(${JSON.stringify(`${ir.feature}: ${ir.title}`)}, () => {\n  test(${JSON.stringify(`${ir.testCaseId} - ${ir.title}`)}, async ({ page }) => {\n    const appPage = new ${pageClassName}(page);\n${steps}\n  });\n});\n`;
  const config = `import { defineConfig, devices } from '@playwright/test';\n\nexport default defineConfig({\n  testDir: './tests',\n  fullyParallel: true,\n  forbidOnly: Boolean(process.env.CI),\n  retries: process.env.CI ? 2 : 0,\n  reporter: [['html'], ['list']],\n  use: {\n    baseURL: process.env.BASE_URL || ${JSON.stringify(ir.baseUrl || 'http://localhost:3000')},\n    trace: 'on-first-retry',\n    screenshot: 'only-on-failure',\n    video: 'retain-on-failure',\n  },\n  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],\n});\n`;
  const packageJson = JSON.stringify({
    name: `${(ir.feature || 'app').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-playwright-tests`,
    private: true,
    type: 'module',
    scripts: { test: 'playwright test', 'test:headed': 'playwright test --headed', 'test:ui': 'playwright test --ui', report: 'playwright show-report' },
    devDependencies: { '@playwright/test': '^1.63.0' }
  }, null, 2);
  return [
    { filename: specFileName, filepath: `tests/${specFileName}`, language: 'javascript', framework: 'playwright-js', code: spec, description: 'Playwright JavaScript test' },
    { filename: `${pageClassName}.js`, filepath: `pages/${pageClassName}.js`, language: 'javascript', framework: 'playwright-js', code: pageObject, description: 'Page object' },
    { filename: 'playwright.config.js', filepath: 'playwright.config.js', language: 'javascript', framework: 'playwright-js', code: config, description: 'Playwright configuration' },
    { filename: 'package.json', filepath: 'package.json', language: 'javascript', framework: 'playwright-js', code: packageJson, description: 'Node.js dependencies and test commands' },
  ];
}

/**
 * Clean sanitization for identifier names
 */
function toPascalCase(str: string): string {
  const identifier = str
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
  return !identifier ? 'Generated' : /^[0-9]/.test(identifier) ? `Generated${identifier}` : identifier;
}

function toCamelCase(str: string): string {
  const p = toPascalCase(str);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

function toFileSlug(value: string) {
  return String(value || 'test').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'test';
}

const pythonKeywords = new Set([
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del',
  'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal',
  'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield'
]);

function toPythonIdentifier(value: string, fallback = 'element'): string {
  let identifier = value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || fallback;
  if (/^[0-9]/.test(identifier)) identifier = `item_${identifier}`;
  if (pythonKeywords.has(identifier)) identifier = `${identifier}_element`;
  return identifier;
}

function jsTargetName(semantic: string) { return `element${toPascalCase(semantic)}`; }
function pythonTargetName(semantic: string) { return `element_${toPythonIdentifier(semantic)}`; }

function safeComment(value: string) {
  return String(value || '').replace(/[\r\n]+/g, ' ').replace(/\*\//g, '* /');
}

function javaString(value: string) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\t/g, '\\t')}"`;
}

function seleniumKey(value: string, language: 'java' | 'python') {
  const keyNames: Record<string, string> = {
    Enter: 'ENTER', Return: 'ENTER', Tab: 'TAB', Escape: 'ESCAPE', Esc: 'ESCAPE', Backspace: 'BACKSPACE',
    Delete: 'DELETE', Space: 'SPACE', ' ': 'SPACE', ArrowUp: 'ARROW_UP', ArrowDown: 'ARROW_DOWN',
    ArrowLeft: 'ARROW_LEFT', ArrowRight: 'ARROW_RIGHT', Home: 'HOME', End: 'END'
  };
  const key = keyNames[value] || keyNames[value[0]?.toUpperCase() + value.slice(1)];
  return key ? `${language === 'java' ? 'Keys' : 'Keys'}.${key}` : JSON.stringify(value);
}

function parsePlaywrightLocator(source: string) {
  const locator = source.trim().replace(/^page\./, '');
  const named = locator.match(/^getBy(Role|Text|Label|Placeholder|TestId)\(\s*(['"])(.*?)\2(?:\s*,\s*\{\s*name:\s*(['"])(.*?)\4\s*\})?\s*\)$/);
  if (named) return { method: `getBy${named[1]}`, first: named[3], second: named[5] };
  const text = locator.match(/^text=(.*)$/s);
  if (text) {
    let value = text[1].trim();
    try { value = JSON.parse(value); } catch { value = value.replace(/^['"]|['"]$/g, ''); }
    return { method: 'getByText', first: value };
  }
  return null;
}

function playwrightJsLocator(pageExpression: string, selector: string) {
  const parsed = parsePlaywrightLocator(selector);
  if (!parsed) return `${pageExpression}.locator(${JSON.stringify(selector)})`;
  if (parsed.method === 'getByRole' && parsed.second !== undefined) {
    return `${pageExpression}.getByRole(${JSON.stringify(parsed.first)}, { name: ${JSON.stringify(parsed.second)} })`;
  }
  return `${pageExpression}.${parsed.method}(${JSON.stringify(parsed.first)})`;
}

function playwrightPythonLocator(pageExpression: string, selector: string) {
  const parsed = parsePlaywrightLocator(selector);
  if (!parsed) return `${pageExpression}.locator(${JSON.stringify(selector)})`;
  const method = parsed.method.replace(/^getBy/, 'get_by').replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
  if (parsed.method === 'getByRole' && parsed.second !== undefined) {
    return `${pageExpression}.get_by_role(${JSON.stringify(parsed.first)}, name=${JSON.stringify(parsed.second)})`;
  }
  return `${pageExpression}.${method}(${JSON.stringify(parsed.first)})`;
}

function xpathLiteral(value: string) {
  if (!value.includes("'")) return `'${value}'`;
  if (!value.includes('"')) return `"${value}"`;
  return `concat(${value.split("'").map(part => `'${part}'`).join(`, \"'\", `)})`;
}

function seleniumBy(selector: string, role?: string) {
  const parsed = parsePlaywrightLocator(selector);
  if (parsed?.method === 'getByTestId') return { type: 'css', selector: `[data-testid=${JSON.stringify(parsed.first)}]` };
  if (parsed?.method === 'getByRole' && parsed.second !== undefined) {
    const roleTags: Record<string, string> = { textbox: 'input|textarea', combobox: 'select|input', checkbox: 'input', radio: 'input', link: 'a' };
    const tag = roleTags[parsed.first] || parsed.first;
    const tagPredicate = tag.split('|').map((name: string) => `self::${name}`).join(' or ');
    const name = xpathLiteral(parsed.second);
    if (parsed.first === 'checkbox' || parsed.first === 'radio') {
      const inputType = xpathLiteral(parsed.first);
      return { type: 'xpath', selector: `//input[@type=${inputType}][@aria-label=${name} or @value=${name} or @id=//label[normalize-space(.)=${name}]/@for] | //label[normalize-space(.)=${name}]//input[@type=${inputType}]` };
    }
    return { type: 'xpath', selector: `//*[${tagPredicate}][normalize-space(.)=${name} or @aria-label=${name} or @placeholder=${name} or @name=${name} or @value=${name} or @id=//label[normalize-space(.)=${name}]/@for] | //label[normalize-space(.)=${name}]//*[${tagPredicate}]` };
  }
  if (parsed?.method === 'getByRole') {
    const roleSelectors: Record<string, string> = {
      button: '//*[@role="button" or self::button or self::input[@type="button" or @type="submit"]]',
      link: '//*[@role="link" or self::a]',
      textbox: '//*[@role="textbox" or self::input or self::textarea]',
      checkbox: '//input[@type="checkbox"] | //*[@role="checkbox"]',
      radio: '//input[@type="radio"] | //*[@role="radio"]',
      combobox: '//*[@role="combobox" or self::select]',
      heading: '//*[@role="heading" or self::h1 or self::h2 or self::h3 or self::h4 or self::h5 or self::h6]'
    };
    return { type: 'xpath', selector: roleSelectors[parsed.first] || `//*[@role=${xpathLiteral(parsed.first)}]` };
  }
  if (parsed?.method === 'getByText') return { type: 'xpath', selector: `//*[normalize-space(.)=${xpathLiteral(parsed.first)}]` };
  if ((parsed?.method === 'getByLabel' || parsed?.method === 'getByPlaceholder') && parsed.first) {
    const name = xpathLiteral(parsed.first);
    const locator = parsed.method === 'getByPlaceholder'
      ? `//*[@placeholder=${name}]`
      : `//*[@aria-label=${name} or @placeholder=${name} or @id=//label[normalize-space(.)=${name}]/@for]`;
    return { type: 'xpath', selector: locator };
  }
  const text = selector.match(/^text=(.*)$/s);
  if (text) return { type: 'xpath', selector: `//*[normalize-space(.)=${xpathLiteral(String(parsePlaywrightLocator(selector)?.first || text[1]))}]` };
  const hasText = selector.match(/^([a-zA-Z][\w-]*):has-text\((['"])(.*?)\2\)$/);
  if (hasText) return { type: 'xpath', selector: `//${hasText[1]}[contains(normalize-space(.), ${xpathLiteral(hasText[3])})]` };
  if (selector.startsWith('//') || selector.startsWith('(')) return { type: 'xpath', selector };
  return { type: 'css', selector };
}

// -------------------------------------------------------------
// Playwright TypeScript Generator (Page Object Model Pattern)
// -------------------------------------------------------------
function generatePlaywrightTS(ir: TestIR): GeneratedCodeFile[] {
  const pageClassName = `${toPascalCase(ir.feature || 'App')}Page`;
  const specFileName = `${toFileSlug(ir.testCaseId)}_${toCamelCase(ir.title)}.spec.ts`;

  // Page Object Class
  let pageObjectMethods = '';
  const distinctTargets = new Map<string, { semantic: string; locator: string }>();

  ir.steps.forEach((step: TestIRStep) => {
    if (step.target?.semantic && step.target.recommendedLocator) {
      const key = jsTargetName(step.target.semantic);
      if (!distinctTargets.has(key)) {
        distinctTargets.set(key, {
          semantic: step.target.semantic,
          locator: step.target.recommendedLocator
        });
      }
    }
  });

  distinctTargets.forEach((target, key) => {
  pageObjectMethods += `
  /** ${safeComment(target.semantic)} */
  get ${key}() {
    return ${playwrightJsLocator('this.page', target.locator)};
  }
`;
  });

  const pageObjectCode = `import { Page, expect } from '@playwright/test';

/**
 * Page Object Model for ${ir.feature}
 * Auto-generated by AutoTest Architect from Test IR: ${ir.testCaseId}
 */
export class ${pageClassName} {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(url = ${JSON.stringify(ir.baseUrl || '/')}) {
    await this.page.goto(url);
  }
${pageObjectMethods}
}
`;

  // Spec file
  let testStepsCode = '';
  ir.steps.forEach((step: TestIRStep) => {
    testStepsCode += `    // Step ${step.stepNumber}: ${safeComment(step.description)}\n`;
    if (step.action === 'navigate') {
      testStepsCode += `    await appPage.goto(${JSON.stringify(step.value || ir.baseUrl || '/')});\n`;
    } else if (step.action === 'fill' && step.target) {
      const targetName = jsTargetName(step.target.semantic);
      testStepsCode += `    await appPage.${targetName}.fill(${JSON.stringify(step.value || '')});\n`;
    } else if (step.action === 'click' && step.target) {
      const targetName = jsTargetName(step.target.semantic);
      testStepsCode += `    await appPage.${targetName}.click();\n`;
    } else if (step.action === 'assert_visible' && step.target) {
      const targetName = jsTargetName(step.target.semantic);
      testStepsCode += `    await expect(appPage.${targetName}).toBeVisible();\n`;
    } else if (step.action === 'assert_text' && step.target) {
      const targetName = jsTargetName(step.target.semantic);
      testStepsCode += `    await expect(appPage.${targetName}).toContainText(${JSON.stringify(step.expectedResult || step.value || '')});\n`;
    } else if (step.action === 'assert_url') {
      testStepsCode += `    await expect(page).toHaveURL(new RegExp(${JSON.stringify(step.value || '')}));\n`;
    } else if (step.action === 'select' && step.target) {
      const targetName = jsTargetName(step.target.semantic);
      testStepsCode += `    await appPage.${targetName}.selectOption(${JSON.stringify(step.value || '')});\n`;
    } else if (step.action === 'check' && step.target) {
      const targetName = jsTargetName(step.target.semantic);
      testStepsCode += `    await appPage.${targetName}.check();\n`;
    } else if (step.action === 'uncheck' && step.target) {
      const targetName = jsTargetName(step.target.semantic);
      testStepsCode += `    await appPage.${targetName}.uncheck();\n`;
    } else if (step.action === 'hover' && step.target) {
      const targetName = jsTargetName(step.target.semantic);
      testStepsCode += `    await appPage.${targetName}.hover();\n`;
    } else if (step.action === 'press' && step.target) {
      const targetName = jsTargetName(step.target.semantic);
      testStepsCode += `    await appPage.${targetName}.press(${JSON.stringify(step.value || 'Enter')});\n`;
    } else if (step.action === 'wait_for' && step.target) {
      const targetName = jsTargetName(step.target.semantic);
      testStepsCode += `    await appPage.${targetName}.waitFor({ state: 'visible' });\n`;
    } else {
      testStepsCode += `    // Custom action: ${step.action}\n`;
    }
    testStepsCode += `\n`;
  });

  const specCode = `import { test, expect } from '@playwright/test';
import { ${pageClassName} } from '../pages/${pageClassName}';

test.describe(${JSON.stringify(`${ir.feature}: ${ir.title}`)}, () => {
  let appPage: ${pageClassName};

  test.beforeEach(async ({ page }) => {
    appPage = new ${pageClassName}(page);
  });

  test(${JSON.stringify(`${ir.testCaseId} - ${ir.title}`)}, async ({ page }) => {
${testStepsCode}  });
});
`;

  const configCode = `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['json', { outputFile: 'test-results.json' }]],
  use: {
    baseURL: process.env.BASE_URL || ${JSON.stringify(ir.baseUrl || 'http://localhost:3000')},
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
});
`;

  return [
    {
      filename: specFileName,
      filepath: `tests/${specFileName}`,
      language: 'typescript',
      framework: 'playwright-ts',
      code: specCode,
      description: 'Playwright E2E Test Specification'
    },
    {
      filename: `${pageClassName}.ts`,
      filepath: `pages/${pageClassName}.ts`,
      language: 'typescript',
      framework: 'playwright-ts',
      code: pageObjectCode,
      description: 'Page Object Model element mappings and actions'
    },
    {
      filename: 'playwright.config.ts',
      filepath: 'playwright.config.ts',
      language: 'typescript',
      framework: 'playwright-ts',
      code: configCode,
      description: 'Playwright runner configuration & test harness'
    },
    {
      filename: 'package.json',
      filepath: 'package.json',
      language: 'json',
      framework: 'playwright-ts',
      code: JSON.stringify({
        name: `${(ir.feature || 'app').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-playwright-tests`,
        private: true,
        scripts: { test: 'playwright test', 'test:headed': 'playwright test --headed', report: 'playwright show-report' },
        devDependencies: { '@playwright/test': '^1.63.0', typescript: '^5.8.0' }
      }, null, 2),
      description: 'Node.js dependencies and test commands'
    }
  ];
}

// -------------------------------------------------------------
// Playwright Python Generator (Pytest + Playwright)
// -------------------------------------------------------------
function generatePlaywrightPython(ir: TestIR): GeneratedCodeFile[] {
  const pageClassName = `${toPascalCase(ir.feature || 'App')}Page`;
  const snakeFeature = toPythonIdentifier(ir.feature || 'app');
  const safeCaseId = toPythonIdentifier(ir.testCaseId || 'test');
  const testFileName = `test_${safeCaseId}_${snakeFeature}.py`;

  let pageMethods = '';
  const pythonTargets = new Map<string, string>();
  ir.steps.forEach((step: TestIRStep) => {
    if (step.target?.semantic && step.target.recommendedLocator) {
      const funcName = pythonTargetName(step.target.semantic);
      if (!pythonTargets.has(funcName)) pythonTargets.set(funcName, step.target.recommendedLocator);
    }
  });
  pythonTargets.forEach((locator, funcName) => {
      pageMethods += `
    @property
    def ${funcName}(self):
        return ${playwrightPythonLocator('self.page', locator)}
`;
  });

  const pageObjectCode = `import os
from urllib.parse import urljoin
from playwright.sync_api import Page, expect

class ${pageClassName}:
    def __init__(self, page: Page):
        self.page = page
        self.base_url = os.environ.get('BASE_URL', ${JSON.stringify(ir.baseUrl || '/')})

    def navigate(self, url=None):
        self.page.goto(urljoin(self.base_url.rstrip('/') + '/', url or ''))
${pageMethods}
`;

  let testSteps = '';
  ir.steps.forEach((step: TestIRStep) => {
    testSteps += `    # Step ${step.stepNumber}: ${safeComment(step.description)}\n`;
    if (step.action === 'navigate') {
      testSteps += `    app_page.navigate(${JSON.stringify(step.value || ir.baseUrl || '/')})\n`;
    } else if (step.action === 'fill' && step.target) {
      const targetName = pythonTargetName(step.target.semantic);
      testSteps += `    app_page.${targetName}.fill(${JSON.stringify(step.value || '')})\n`;
    } else if (step.action === 'click' && step.target) {
      const targetName = pythonTargetName(step.target.semantic);
      testSteps += `    app_page.${targetName}.click()\n`;
    } else if (step.action === 'assert_visible' && step.target) {
      const targetName = pythonTargetName(step.target.semantic);
      testSteps += `    expect(app_page.${targetName}).to_be_visible()\n`;
    } else if (step.action === 'assert_text' && step.target) {
      const targetName = pythonTargetName(step.target.semantic);
      testSteps += `    expect(app_page.${targetName}).to_contain_text(${JSON.stringify(step.expectedResult || step.value || '')})\n`;
    } else if (step.action === 'select' && step.target) {
      testSteps += `    app_page.${pythonTargetName(step.target.semantic)}.select_option(${JSON.stringify(step.value || '')})\n`;
    } else if (step.action === 'check' && step.target) {
      testSteps += `    app_page.${pythonTargetName(step.target.semantic)}.check()\n`;
    } else if (step.action === 'uncheck' && step.target) {
      testSteps += `    app_page.${pythonTargetName(step.target.semantic)}.uncheck()\n`;
    } else if (step.action === 'hover' && step.target) {
      testSteps += `    app_page.${pythonTargetName(step.target.semantic)}.hover()\n`;
    } else if (step.action === 'press' && step.target) {
      testSteps += `    app_page.${pythonTargetName(step.target.semantic)}.press(${JSON.stringify(step.value || 'Enter')})\n`;
    } else if (step.action === 'wait_for' && step.target) {
      testSteps += `    app_page.${pythonTargetName(step.target.semantic)}.wait_for(state='visible')\n`;
    } else if (step.action === 'assert_url') {
      testSteps += `    expect(page).to_have_url(re.compile(${JSON.stringify(step.value || '')}))\n`;
    }
    testSteps += `\n`;
  });

  const testFileCode = `import pytest
import re
from playwright.sync_api import Page, expect
from pages.${pageClassName.toLowerCase()} import ${pageClassName}

def test_${safeCaseId}_${toPythonIdentifier(ir.title)}(page: Page):
    """Generated test case ${JSON.stringify(ir.testCaseId || 'test')}."""
    app_page = ${pageClassName}(page)

${testSteps}
`;

  return [
    {
      filename: testFileName,
      filepath: `tests/${testFileName}`,
      language: 'python',
      framework: 'playwright-python',
      code: testFileCode,
      description: 'PyTest Playwright automated test specification'
    },
    {
      filename: `${pageClassName.toLowerCase()}.py`,
      filepath: `pages/${pageClassName.toLowerCase()}.py`,
      language: 'python',
      framework: 'playwright-python',
      code: pageObjectCode,
      description: 'Python Page Object Class with unified selectors'
    },
    {
      filename: 'requirements.txt',
      filepath: 'requirements.txt',
      language: 'text',
      framework: 'playwright-python',
      code: 'pytest>=8,<9\npytest-playwright>=0.5,<1\nplaywright>=1.44,<2\n',
      description: 'Python dependencies for the Playwright test suite'
    }
  ];
}

// -------------------------------------------------------------
// Selenium Java Generator (Selenium 4 + TestNG)
// -------------------------------------------------------------
function generateSeleniumJava(ir: TestIR): GeneratedCodeFile[] {
  const pageClassName = `${toPascalCase(ir.feature || 'App')}Page`;
  const testClassName = `${toPascalCase(ir.testCaseId)}Test`;

  let webElements = '';
  const javaTargets = new Map<string, string>();
  ir.steps.forEach((step: TestIRStep) => {
    if (step.target?.semantic && step.target.recommendedLocator) {
      const method = `find${toPascalCase(step.target.semantic)}`;
      if (!javaTargets.has(method)) javaTargets.set(method, step.target.recommendedLocator);
    }
  });
  javaTargets.forEach((selector, method) => {
      const locator = seleniumBy(selector);
      const byClause = `By.${locator.type === 'xpath' ? 'xpath' : 'cssSelector'}(${javaString(locator.selector)})`;
      webElements += `
    public WebElement ${method}() {
        return driver.findElement(${byClause});
    }
`;
  });

  const pageCode = `package com.autotest.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import java.time.Duration;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.openqa.selenium.support.ui.ExpectedConditions;

public class ${pageClassName} {
    private final WebDriver driver;
    private final String baseUrl = System.getProperty("app.url", System.getenv().getOrDefault("APP_URL", ${javaString(ir.baseUrl || 'https://app.example.com')}));

    public ${pageClassName}(WebDriver driver) {
        this.driver = driver;
    }

    public void navigateTo(String url) {
        String targetUrl = url == null || url.isBlank() ? baseUrl : url;
        if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
            targetUrl = baseUrl.replaceAll("/+$", "") + (targetUrl.startsWith("/") ? targetUrl : "/" + targetUrl);
        }
        driver.get(targetUrl);
    }
${webElements}
}
`;

  let testSteps = '';
  ir.steps.forEach((step: TestIRStep) => {
    testSteps += `        // Step ${step.stepNumber}: ${safeComment(step.description)}\n`;
    if (step.action === 'navigate') {
      testSteps += `        page.navigateTo(${javaString(step.value || ir.baseUrl || '/')});\n`;
    } else if (step.action === 'fill' && step.target) {
      testSteps += `        page.${`find${toPascalCase(step.target.semantic)}`}().clear();\n        page.${`find${toPascalCase(step.target.semantic)}`}().sendKeys(${javaString(step.value || '')});\n`;
    } else if (step.action === 'click' && step.target) {
      testSteps += `        page.find${toPascalCase(step.target.semantic)}().click();\n`;
    } else if (step.action === 'select' && step.target) {
      testSteps += `        new org.openqa.selenium.support.ui.Select(page.find${toPascalCase(step.target.semantic)}()).selectByVisibleText(${javaString(step.value || '')});\n`;
    } else if (step.action === 'check' && step.target) {
      testSteps += `        if (!page.find${toPascalCase(step.target.semantic)}().isSelected()) page.find${toPascalCase(step.target.semantic)}().click();\n`;
    } else if (step.action === 'uncheck' && step.target) {
      testSteps += `        if (page.find${toPascalCase(step.target.semantic)}().isSelected()) page.find${toPascalCase(step.target.semantic)}().click();\n`;
    } else if (step.action === 'hover' && step.target) {
      testSteps += `        new org.openqa.selenium.interactions.Actions(driver).moveToElement(page.find${toPascalCase(step.target.semantic)}()).perform();\n`;
    } else if (step.action === 'press' && step.target) {
      testSteps += `        page.find${toPascalCase(step.target.semantic)}().sendKeys(${seleniumKey(step.value || 'Enter', 'java')});\n`;
    } else if (step.action === 'wait_for' && step.target) {
      testSteps += `        new WebDriverWait(driver, Duration.ofSeconds(10)).until(ExpectedConditions.visibilityOf(page.find${toPascalCase(step.target.semantic)}()));\n`;
    } else if (step.action === 'assert_visible' && step.target) {
      testSteps += `        Assert.assertTrue(page.find${toPascalCase(step.target.semantic)}().isDisplayed(), "Element should be visible");\n`;
    } else if (step.action === 'assert_text' && step.target) {
      testSteps += `        Assert.assertTrue(page.find${toPascalCase(step.target.semantic)}().getText().contains(${javaString(step.expectedResult || step.value || '')}));\n`;
    } else if (step.action === 'assert_url') {
      testSteps += `        Assert.assertTrue(driver.getCurrentUrl().contains(${javaString(step.value || '')}), "URL should contain expected value");\n`;
    }
    testSteps += `\n`;
  });

  const testCode = `package com.autotest.tests;

import com.autotest.pages.${pageClassName};
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.Keys;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.openqa.selenium.support.ui.ExpectedConditions;
import java.time.Duration;
import org.testng.Assert;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

public class ${testClassName} {
    private WebDriver driver;
    private ${pageClassName} page;

    @BeforeMethod
    public void setUp() {
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--headless=new", "--no-sandbox", "--disable-dev-shm-usage");
        String chromeBinary = System.getenv("CHROME_BIN");
        if (chromeBinary != null && !chromeBinary.isBlank()) options.setBinary(chromeBinary);
        driver = new ChromeDriver(options);
        driver.manage().window().maximize();
        page = new ${pageClassName}(driver);
    }

    @Test(description = ${javaString(`${ir.testCaseId}: ${ir.title}`)})
    public void testExecution() {
${testSteps}    }

    @AfterMethod
    public void tearDown() {
        if (driver != null) {
            driver.quit();
        }
    }
}
`;

  return [
    {
      filename: `${testClassName}.java`,
      filepath: `src/test/java/com/autotest/tests/${testClassName}.java`,
      language: 'java',
      framework: 'selenium-java',
      code: testCode,
      description: 'Selenium 4 TestNG test suite'
    },
    {
      filename: `${pageClassName}.java`,
      filepath: `src/main/java/com/autotest/pages/${pageClassName}.java`,
      language: 'java',
      framework: 'selenium-java',
      code: pageCode,
      description: 'Selenium Page Object class'
    },
    {
      filename: 'pom.xml',
      filepath: 'pom.xml',
      language: 'java',
      framework: 'selenium-java',
      description: 'Maven dependencies and TestNG runner configuration',
      code: `<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.autotest</groupId><artifactId>generated-tests</artifactId><version>1.0.0</version>
  <properties><maven.compiler.release>17</maven.compiler.release><project.build.sourceEncoding>UTF-8</project.build.sourceEncoding></properties>
  <dependencies>
    <dependency><groupId>org.seleniumhq.selenium</groupId><artifactId>selenium-java</artifactId><version>4.20.0</version></dependency>
    <dependency><groupId>org.testng</groupId><artifactId>testng</artifactId><version>7.10.2</version><scope>test</scope></dependency>
  </dependencies>
  <build><plugins><plugin><groupId>org.apache.maven.plugins</groupId><artifactId>maven-surefire-plugin</artifactId><version>3.2.5</version><configuration><includes><include>**/*Test.java</include></includes></configuration></plugin></plugins></build>
</project>`
    }
  ];
}

// -------------------------------------------------------------
// Selenium Python Generator
// -------------------------------------------------------------
function generateSeleniumPython(ir: TestIR): GeneratedCodeFile[] {
  const pageClassName = `${toPascalCase(ir.feature || 'App')}Page`;
  const safeCaseId = toPythonIdentifier(ir.testCaseId || 'test');
  const testFileName = `test_selenium_${safeCaseId}.py`;

  let elementMethods = '';
  const seleniumTargets = new Map<string, string>();
  ir.steps.forEach((step: TestIRStep) => {
    if (step.target?.semantic && step.target.recommendedLocator) {
      const funcName = toPythonIdentifier(step.target.semantic);
      if (!seleniumTargets.has(funcName)) seleniumTargets.set(funcName, step.target.recommendedLocator);
    }
  });
  seleniumTargets.forEach((selector, funcName) => {
      const locator = seleniumBy(selector);
      const byClause = `By.${locator.type === 'xpath' ? 'XPATH' : 'CSS_SELECTOR'}, ${JSON.stringify(locator.selector)}`;
      elementMethods += `
    def get_${funcName}(self):
        return self.wait.until(EC.presence_of_element_located((${byClause})))
`;
  });

  const pageCode = `import os
from urllib.parse import urljoin
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class ${pageClassName}:
    def __init__(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, 10)
        self.url = os.environ.get('APP_URL', ${JSON.stringify(ir.baseUrl || 'https://app.example.com')})

    def open(self, url=None):
        self.driver.get(urljoin(self.url.rstrip('/') + '/', url or ''))
${elementMethods}
`;

  let testSteps = '';
  ir.steps.forEach((step: TestIRStep) => {
    testSteps += `    # Step ${step.stepNumber}: ${safeComment(step.description)}\n`;
    if (step.action === 'navigate') {
      testSteps += `    page.open(${JSON.stringify(step.value || ir.baseUrl || '/')})\n`;
    } else if (step.action === 'fill' && step.target) {
      const funcName = toPythonIdentifier(step.target.semantic);
      testSteps += `    page.get_${funcName}().clear()\n`;
      testSteps += `    page.get_${funcName}().send_keys(${JSON.stringify(step.value || '')})\n`;
    } else if (step.action === 'click' && step.target) {
      const funcName = toPythonIdentifier(step.target.semantic);
      testSteps += `    page.get_${funcName}().click()\n`;
    } else if (step.action === 'select' && step.target) {
      testSteps += `    Select(page.get_${toPythonIdentifier(step.target.semantic)}()).select_by_visible_text(${JSON.stringify(step.value || '')})\n`;
    } else if (step.action === 'check' && step.target) {
      testSteps += `    element = page.get_${toPythonIdentifier(step.target.semantic)}()\n    if not element.is_selected(): element.click()\n`;
    } else if (step.action === 'uncheck' && step.target) {
      testSteps += `    element = page.get_${toPythonIdentifier(step.target.semantic)}()\n    if element.is_selected(): element.click()\n`;
    } else if (step.action === 'hover' && step.target) {
      testSteps += `    ActionChains(driver).move_to_element(page.get_${toPythonIdentifier(step.target.semantic)}()).perform()\n`;
    } else if (step.action === 'press' && step.target) {
      testSteps += `    page.get_${toPythonIdentifier(step.target.semantic)}().send_keys(${seleniumKey(step.value || 'Enter', 'python')})\n`;
    } else if (step.action === 'wait_for' && step.target) {
      testSteps += `    WebDriverWait(driver, 10).until(EC.visibility_of(page.get_${toPythonIdentifier(step.target.semantic)}()))\n`;
    } else if (step.action === 'assert_visible' && step.target) {
      const funcName = toPythonIdentifier(step.target.semantic);
      testSteps += `    assert page.get_${funcName}().is_displayed()\n`;
    } else if (step.action === 'assert_text' && step.target) {
      testSteps += `    assert ${JSON.stringify(step.expectedResult || step.value || '')} in page.get_${toPythonIdentifier(step.target.semantic)}().text\n`;
    } else if (step.action === 'assert_url') {
      testSteps += `    assert ${JSON.stringify(step.value || '')} in driver.current_url\n`;
    }
    testSteps += `\n`;
  });

  const testCode = `import os
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import Select, WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from pages.${pageClassName.toLowerCase()} import ${pageClassName}

@pytest.fixture
def driver():
    chrome_options = webdriver.ChromeOptions()
    chrome_options.add_argument("--headless=new")
    chrome_bin = os.environ.get("CHROME_BIN")
    if chrome_bin: chrome_options.binary_location = chrome_bin
    d = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
    yield d
    d.quit()

def test_${safeCaseId}(driver):
    """Generated test case ${JSON.stringify(ir.testCaseId || 'test')}."""
    page = ${pageClassName}(driver)
${testSteps}
`;

  return [
    {
      filename: testFileName,
      filepath: `tests/${testFileName}`,
      language: 'python',
      framework: 'selenium-python',
      code: testCode,
      description: 'Selenium Python Pytest script'
    },
    {
      filename: `${pageClassName.toLowerCase()}.py`,
      filepath: `pages/${pageClassName.toLowerCase()}.py`,
      language: 'python',
      framework: 'selenium-python',
      code: pageCode,
      description: 'Selenium Page Object class'
    },
    {
      filename: 'requirements.txt',
      filepath: 'requirements.txt',
      language: 'text',
      framework: 'selenium-python',
      code: 'pytest>=8,<9\nselenium>=4.20,<5\nwebdriver-manager>=4,<5\n',
      description: 'Python dependencies for the Selenium test suite'
    }
  ];
}
