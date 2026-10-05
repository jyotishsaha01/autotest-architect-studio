import { TestIR, GeneratedCodeFile, FrameworkType } from '../types/testAutomation';
import { SAMPLE_TEST_IR } from '../data/sampleData';
import { generateAutomationSuite } from './codeGenerators';
import { generateCiPipeline } from './ciGenerators';

export function buildRepositoryFiles(
  testIR: TestIR = SAMPLE_TEST_IR,
  framework: FrameworkType = 'playwright-ts'
): GeneratedCodeFile[] {
  const generatedCode = generateAutomationSuite(testIR, framework);
  const ciWorkflow = generateCiPipeline('github-actions', framework, testIR);

  const lang: 'typescript' | 'python' | 'java' = framework.includes('python')
    ? 'python'
    : framework.includes('java')
    ? 'java'
    : 'typescript';

  const files: GeneratedCodeFile[] = [
    ...generatedCode,
    {
      filepath: ciWorkflow.filepath,
      filename: ciWorkflow.filename,
      framework,
      language: lang,
      description: ciWorkflow.description,
      code: ciWorkflow.code
    },
    {
      filepath: 'package.json',
      filename: 'package.json',
      framework,
      language: 'typescript',
      description: 'Project manifest and script configuration',
      code: JSON.stringify(
        {
          name: 'autotest-architect-suite',
          version: '1.0.0',
          private: true,
          type: 'module',
          scripts: {
            test: 'playwright test',
            'test:headed': 'playwright test --headed',
            'test:ui': 'playwright test --ui',
            report: 'playwright show-report'
          },
          devDependencies: {
            '@playwright/test': '^1.44.0',
            '@types/node': '^20.0.0',
            typescript: '^5.4.0'
          }
        },
        null,
        2
      )
    },
    {
      filepath: 'README.md',
      filename: 'README.md',
      framework,
      language: 'typescript',
      description: 'Project documentation and execution guide',
      code: `# AutoTest Architect - Automated Test Suite
**Feature:** ${testIR.feature}
**Test Case ID:** ${testIR.testCaseId}
**Framework:** ${framework}
**Sprint:** ${testIR.sprint}

## Running Tests
\`\`\`bash
npm install
npx playwright install --with-deps
npx playwright test
\`\`\`
`
    }
  ];

  return files;
}
