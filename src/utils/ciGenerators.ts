import { FrameworkType, TestIR } from '../types/testAutomation';

export type CiToolType = 'github-actions' | 'jenkins' | 'gitlab-ci';

export interface CiPipelineConfig {
  tool: CiToolType;
  filename: string;
  filepath: string;
  code: string;
  description: string;
}

const yamlString = (value: string) => `'${String(value).replace(/'/g, "''")}'`;
const groovyString = (value: string) => `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

export function generateCiPipeline(tool: CiToolType, framework: FrameworkType, ir: TestIR): CiPipelineConfig {
  switch (tool) {
    case 'github-actions':
      return generateGitHubActions(framework, ir);
    case 'jenkins':
      return generateJenkinsfile(framework, ir);
    case 'gitlab-ci':
      return generateGitLabCi(framework, ir);
    default:
      return generateGitHubActions(framework, ir);
  }
}

function generateGitHubActions(framework: FrameworkType, ir: TestIR): CiPipelineConfig {
  const isPlaywrightTS = framework === 'playwright-ts';
  const isPlaywrightJS = framework === 'playwright-js';
  const isPlaywrightPython = framework === 'playwright-python';
  const isSeleniumJava = framework === 'selenium-java';
  const isSeleniumPython = framework === 'selenium-python';

  let steps = '';

  if (isPlaywrightTS || isPlaywrightJS) {
    steps = `    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Setup Node.js 20
      uses: actions/setup-node@v4
      with:
        node-version: 20

    - name: Install dependencies
      run: npm install

    - name: Install Playwright Browsers & OS deps
      run: npx playwright install --with-deps ${isPlaywrightJS ? 'chromium' : 'chromium firefox'}

    - name: Execute Playwright Automated Tests
      run: npx playwright test
      env:
        CI: true
        BASE_URL: \${{ secrets.APP_BASE_URL || ${yamlString(ir.baseUrl || 'https://app.example.com')} }}

    - name: Upload Playwright Test Report Artifact
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 30`;
  } else if (isPlaywrightPython) {
    steps = `    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Setup Python 3.11
      uses: actions/setup-python@v5
      with:
        python-version: '3.11'
        cache: 'pip'

    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt

    - name: Install Playwright Browsers
      run: playwright install --with-deps chromium

    - name: Run PyTest Playwright Suite
      run: mkdir -p results && pytest --junitxml=results/junit.xml tests/
      env:
        BASE_URL: ${yamlString(ir.baseUrl || 'https://app.example.com')}

    - name: Upload Test Results
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: pytest-results
        path: results/`;
  } else if (isSeleniumJava) {
    steps = `    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Setup Java JDK 17
      uses: actions/setup-java@v4
      with:
        java-version: '17'
        distribution: 'temurin'
        cache: 'maven'

    - name: Setup Headless Chrome
      uses: browser-actions/setup-chrome@v1

    - name: Run Maven TestNG Automation Suite
      run: mvn clean test
      env:
        APP_URL: ${yamlString(ir.baseUrl || 'https://app.example.com')}

    - name: Publish TestNG Surefire Report
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: surefire-reports
        path: target/surefire-reports/`;
  } else {
    // Selenium Python
    steps = `    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Setup Python 3.11
      uses: actions/setup-python@v5
      with:
        python-version: '3.11'

    - name: Setup Headless Chrome
      uses: browser-actions/setup-chrome@v1

    - name: Install Python dependencies
      run: |
        pip install --upgrade pip
        pip install selenium pytest webdriver-manager

    - name: Execute Selenium PyTest Suite
      run: mkdir -p results && pytest tests/ --junitxml=results/selenium-junit.xml
      env:
        APP_URL: ${yamlString(ir.baseUrl || 'https://app.example.com')}

    - name: Upload Test Artifacts
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: test-artifacts
        path: results/`;
  }

  const yaml = `name: AutoTest CI - ${ir.feature} Automation Suite

on:
  push:
    branches: [ main, master, 'release/**' ]
  pull_request:
    branches: [ main, master ]
  workflow_dispatch:
    inputs:
      sprintTag:
        description: 'Target Sprint execution tag'
        required: false
        default: ${yamlString(ir.sprint || 'Sprint 24')}

jobs:
  test-automation:
    name: Run Automated E2E Regression (${framework})
    runs-on: ubuntu-latest
    timeout-minutes: 25

    steps:
${steps}
`;

  return {
    tool: 'github-actions',
    filename: 'test-automation.yml',
    filepath: '.github/workflows/test-automation.yml',
    code: yaml,
    description: 'GitHub Actions workflow pipeline for continuous regression testing'
  };
}

function generateJenkinsfile(framework: FrameworkType, ir: TestIR): CiPipelineConfig {
  const isPlaywrightTS = framework === 'playwright-ts';
  const isPlaywrightPython = framework === 'playwright-python';
  const isSeleniumJava = framework === 'selenium-java';

  let testStageCommand = 'BASE_URL="$TARGET_URL" npx playwright test';
  let prepCommands = `sh 'npm install'\n                sh 'npx playwright install --with-deps'`;
  let postAction = `archiveArtifacts artifacts: 'playwright-report/**, test-results/**', allowEmptyArchive: true`;

  if (isPlaywrightPython) {
    prepCommands = `sh 'python3 -m venv venv'\n                sh '. venv/bin/activate && pip install -r requirements.txt && playwright install --with-deps'`;
    testStageCommand = '. venv/bin/activate && mkdir -p reports && BASE_URL="$TARGET_URL" pytest --junitxml=reports/test-results.xml tests/';
    postAction = `junit 'reports/test-results.xml'`;
  } else if (isSeleniumJava) {
    prepCommands = `sh 'apt-get update && apt-get install -y chromium chromium-driver'
                sh 'mvn -q -DskipTests compile'`;
    testStageCommand = 'mvn clean test -Dapp.url="$TARGET_URL"';
    postAction = `junit 'target/surefire-reports/*.xml'`;
  } else if (framework === 'selenium-python') {
    prepCommands = `sh 'apt-get update && apt-get install -y chromium chromium-driver'
                sh 'python3 -m venv venv'
                sh '. venv/bin/activate && pip install -r requirements.txt'`;
    testStageCommand = '. venv/bin/activate && mkdir -p reports && APP_URL="$TARGET_URL" pytest --junitxml=reports/test-results.xml tests/';
    postAction = `junit 'reports/test-results.xml'`;
  }

  const jenkinsfile = `pipeline {
    agent {
        docker {
            image '${framework === 'selenium-java' ? 'maven:3.9.9-eclipse-temurin-17' : framework === 'playwright-python' ? 'mcr.microsoft.com/playwright/python:v1.63.0-noble' : framework === 'selenium-python' ? 'python:3.11-bookworm' : 'mcr.microsoft.com/playwright:v1.63.0-noble'}'
            args '-u root:root --ipc=host'
        }
    }

    environment {
        CI = 'true'
        TARGET_URL = ${groovyString(ir.baseUrl || 'https://app.example.com')}
        SPRINT_VERSION = ${groovyString(ir.sprint || 'Sprint 24')}
        CHROME_BIN = '/usr/bin/chromium'
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    stages {
        stage('Checkout & Environment') {
            steps {
                echo ${groovyString(`Running AutoTest suite for ${ir.testCaseId} on branch:`)}
                echo "Branch: \${env.BRANCH_NAME}"
                checkout scm
            }
        }

        stage('Install Dependencies & Drivers') {
            steps {
                ${prepCommands}
            }
        }

        stage('Execute Automated Regression') {
            steps {
                echo "Executing ${framework} automated test suite..."
                sh '${testStageCommand}'
            }
        }
    }

    post {
        always {
            ${postAction}
            archiveArtifacts artifacts: '**/*.png, **/*.mp4, **/*.log', allowEmptyArchive: true
        }
        failure {
            echo "Test suite failed. Review the test output and saved artifacts."
        }
    }
}
`;

  return {
    tool: 'jenkins',
    filename: 'Jenkinsfile',
    filepath: 'Jenkinsfile',
    code: jenkinsfile,
    description: 'Declarative Jenkinsfile pipeline with Dockerized browser agents and HTML reporting'
  };
}

function generateGitLabCi(framework: FrameworkType, ir: TestIR): CiPipelineConfig {
  let script = 'npx playwright test';
  let beforeScript = `  - npm install\n  - npx playwright install --with-deps`;

  if (framework === 'playwright-python') {
    beforeScript = `  - pip install -r requirements.txt\n  - playwright install --with-deps`;
    script = 'mkdir -p results && BASE_URL="$BASE_URL" pytest --junitxml=results/report.xml tests/';
  } else if (framework === 'selenium-java') {
    beforeScript = `  - apt-get update && apt-get install -y chromium chromium-driver`;
    script = 'mvn clean test';
  } else if (framework === 'playwright-js') {
    beforeScript = `  - npm install\n  - npx playwright install --with-deps chromium`;
  } else if (framework === 'selenium-python') {
    beforeScript = `  - apt-get update && apt-get install -y chromium chromium-driver\n  - pip install -r requirements.txt`;
    script = 'mkdir -p results && APP_URL="$APP_URL" pytest tests/ --junitxml=results/selenium-junit.xml';
  }

  const ciImage = framework === 'playwright-python'
    ? 'mcr.microsoft.com/playwright/python:v1.63.0-noble'
    : framework === 'selenium-java'
      ? 'maven:3.9.9-eclipse-temurin-17'
      : framework === 'selenium-python'
        ? 'python:3.11-bookworm'
        : 'node:20-bullseye';
  const gitlabYaml = `image: ${ciImage}

stages:
  - test

variables:
  CI: "true"
  BASE_URL: ${yamlString(ir.baseUrl || 'https://app.example.com')}
  APP_URL: ${yamlString(ir.baseUrl || 'https://app.example.com')}
  TEST_SPRINT: ${yamlString(ir.sprint || 'Sprint 24')}
  CHROME_BIN: /usr/bin/chromium

run_e2e_tests:
  stage: test
  before_script:
${beforeScript}
  script:
    - ${script}
  artifacts:
    when: always
    paths:
      - playwright-report/
      - test-results/
      - target/surefire-reports/
    reports:
      junit: "**/*.xml"
    expire_in: 30 days
  only:
    - main
    - merge_requests
`;

  return {
    tool: 'gitlab-ci',
    filename: '.gitlab-ci.yml',
    filepath: '.gitlab-ci.yml',
    code: gitlabYaml,
    description: 'GitLab CI pipeline definition with artifacts and JUnit reporting'
  };
}
