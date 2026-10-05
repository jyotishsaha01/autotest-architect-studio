import { FrameworkType, GeneratedCodeFile, TestIR } from '../types/testAutomation';
import { CiPipelineConfig } from './ciGenerators';

export interface ValidationFinding {
  status: 'pass' | 'warning' | 'error';
  title: string;
  message: string;
}

const suiteFiles: Record<FrameworkType, { required: string[]; testPattern: RegExp; command: string }> = {
  'playwright-ts': { required: ['package.json', 'playwright.config.ts'], testPattern: /^tests\/.*\.spec\.ts$/, command: 'playwright test' },
  'playwright-js': { required: ['package.json', 'playwright.config.js'], testPattern: /^tests\/.*\.spec\.js$/, command: 'playwright test' },
  'playwright-python': { required: ['requirements.txt'], testPattern: /^tests\/.*\.py$/, command: 'pytest' },
  'selenium-java': { required: ['pom.xml'], testPattern: /^src\/test\/java\/.*Test\.java$/, command: 'mvn test' },
  'selenium-python': { required: ['requirements.txt'], testPattern: /^tests\/.*\.py$/, command: 'pytest' }
};

export function validateSuiteForExport(
  ir: TestIR,
  framework: FrameworkType,
  files: GeneratedCodeFile[],
  pipeline: CiPipelineConfig
): ValidationFinding[] {
  const findings: ValidationFinding[] = [];

  try {
    const url = new URL(ir.baseUrl);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error();
    const host = url.hostname.toLowerCase();
    const localOnly = host === 'localhost' || host.startsWith('127.') || host === '::1' || host === '[::1]' || host.endsWith('.local');
    const placeholder = host.endsWith('.test') || host === 'example.com' || host.endsWith('.example.com') || host.includes('yourdomain');
    const urlWarning = localOnly
      ? 'This is a local-only address; hosted CI runners usually cannot reach it.'
      : placeholder
        ? 'This looks like a sample or placeholder domain; replace it with your real test environment URL.'
        : 'Confirm the URL is reachable from the CI runner and does not require an unavailable VPN.';
    findings.push({ status: localOnly || placeholder ? 'warning' : 'pass', title: 'Target URL', message: `Valid ${url.protocol.slice(0, -1).toUpperCase()} URL. ${urlWarning}` });
  } catch {
    findings.push({ status: 'error', title: 'Target URL', message: 'Enter a valid HTTP or HTTPS target URL before exporting.' });
  }

  if (!ir.steps.length) {
    findings.push({ status: 'error', title: 'Test steps', message: 'Add at least one test step before exporting a suite.' });
  } else {
    const actionable = ir.steps.filter(step => ['click', 'fill', 'select', 'check', 'uncheck', 'hover', 'assert_visible', 'assert_text'].includes(step.action));
    const missingLocators = actionable.filter(step => !step.target?.recommendedLocator);
    findings.push({
      status: missingLocators.length ? 'warning' : 'pass',
      title: 'Test steps and locators',
      message: missingLocators.length
        ? `${ir.steps.length} steps found. ${missingLocators.length} action${missingLocators.length === 1 ? '' : 's'} need a locator review in the generated code.`
        : `${ir.steps.length} steps found with locator information for UI actions.`
    });
  }

  const setup = suiteFiles[framework];
  const paths = files.map(file => file.filepath.replace(/\\/g, '/'));
  const unsafePaths = paths.filter(file => file.startsWith('/') || file.split('/').includes('..') || file.includes('\0'));
  const duplicatePaths = paths.filter((file, index) => paths.indexOf(file) !== index);
  const emptyFiles = files.filter(file => !file.code.trim());
  const wrongFrameworkFiles = files.filter(file => file.framework !== framework);
  const generatedTestSources = files.filter(file => setup.testPattern.test(file.filepath.replace(/\\/g, '/')));
  const incompleteSources = generatedTestSources.filter(file => file.code.includes('Action not generated:'));
  const fileIssues = [
    unsafePaths.length ? `${unsafePaths.length} unsafe file path(s)` : '',
    duplicatePaths.length ? `${duplicatePaths.length} duplicate path(s)` : '',
    emptyFiles.length ? `${emptyFiles.length} empty file(s)` : '',
    wrongFrameworkFiles.length ? `${wrongFrameworkFiles.length} file(s) have a different framework label` : ''
  ].filter(Boolean);
  findings.push(fileIssues.length
    ? { status: 'error', title: 'Generated files', message: `${fileIssues.join('; ')}. Regenerate the suite before exporting.` }
    : incompleteSources.length
      ? { status: 'warning', title: 'Generated files', message: `${files.length} files were checked. ${incompleteSources.length} test file${incompleteSources.length === 1 ? ' contains' : 's contain'} an action placeholder; review it before running.` }
      : { status: 'pass', title: 'Generated files', message: `${files.length} files have unique safe paths and non-empty code.` });
  const missingSetup = setup.required.filter(required => !paths.some(file => file === required || file.endsWith(`/${required}`)));
  const testFiles = paths.filter(file => setup.testPattern.test(file));
  if (missingSetup.length || testFiles.length === 0) {
    const missing = [...missingSetup, ...(testFiles.length === 0 ? ['generated test file'] : [])];
    findings.push({ status: 'error', title: 'Framework setup', message: `Missing ${missing.join(', ')} for ${framework}. Regenerate the suite and check the selected framework.` });
  } else {
    const fileContents = new Map(files.map(file => [file.filepath.replace(/\\/g, '/'), file.code]));
    const packageJson = fileContents.get('package.json');
    const requirements = fileContents.get('requirements.txt') || '';
    const pom = fileContents.get('pom.xml') || '';
    let setupProblem = '';
    if (framework === 'playwright-ts' || framework === 'playwright-js') {
      try {
        const manifest = JSON.parse(packageJson || '{}');
        if (!manifest.devDependencies?.['@playwright/test'] || !String(manifest.scripts?.test || '').includes('playwright test')) setupProblem = 'package.json is missing the Playwright test dependency or test script.';
      } catch { setupProblem = 'package.json is not valid JSON.'; }
    } else if (framework === 'playwright-python' && (!requirements.includes('playwright') || !requirements.includes('pytest'))) {
      setupProblem = 'requirements.txt must include Playwright and pytest.';
    } else if (framework === 'selenium-python' && (!requirements.includes('selenium') || !requirements.includes('pytest'))) {
      setupProblem = 'requirements.txt must include Selenium and pytest.';
    } else if (framework === 'selenium-java' && (!pom.includes('<artifactId>selenium-java</artifactId>') || !pom.includes('<artifactId>testng</artifactId>'))) {
      setupProblem = 'pom.xml must declare Selenium and TestNG dependencies.';
    }
    findings.push(setupProblem
      ? { status: 'error', title: 'Framework setup', message: setupProblem }
      : { status: 'pass', title: 'Framework setup', message: `Found ${setup.required.join(', ')} and ${testFiles.length} generated test file${testFiles.length === 1 ? '' : 's'} with the required framework dependencies.` });
  }

  if (!pipeline.filepath || !pipeline.code.trim()) {
    findings.push({ status: 'error', title: 'CI configuration', message: 'The CI configuration is empty. Choose a CI provider and regenerate it.' });
  } else if (!(framework === 'selenium-java'
    ? /\bmvn\b[^\n]*\btest\b/i.test(pipeline.code)
    : pipeline.code.toLowerCase().includes(setup.command.toLowerCase()))) {
    findings.push({ status: 'error', title: 'CI configuration', message: `The CI file does not contain the expected ${setup.command} command for ${framework}.` });
  } else {
    findings.push({ status: 'pass', title: 'CI configuration', message: `${pipeline.filepath} includes the expected ${setup.command} command.` });
  }

  return findings;
}
