# AutoTest Architect — AI Multi-Modal Test Automation Studio

AutoTest Architect is a production-grade test automation engineering platform that ingests multi-modal QA inputs (test specifications, Excel/CSV sheets, UI mockups/screenshots, video timeline logs, or live DOM accessibility trees) and synthesizes clean Page Object Models (POM), typed test specifications, and CI/CD pipelines.

---

## 🚀 Key Features

- **Multi-Modal Test Ingestion**: Ingests test steps, preconditions, assertions, video keyframes, or live DOM structures.
- **Canonical Test Intermediate Representation (Test IR)**: Framework-agnostic schema with multi-tier locator rankings (Role > testid > Label > CSS > XPath).
- **Multi-Framework Code Generation**:
  - Playwright (TypeScript & Python)
  - Selenium 4 (Java TestNG & Python PyTest)
- **Sprint-to-Sprint Incremental Change Engine**: Input only what changed in the current sprint to surgically update affected Page Objects and locators.
- **Autonomous Self-Healing Runtime**: Evaluates failed element interactions against live DOM and automatically suggests and applies repaired locators.
- **UI Semantic Entity Graph**: Maps business identities (e.g. `auth.login.submit`) across releases to prevent locator drift.
- **CI/CD Pipeline Generator**: Generates GitHub Actions workflows, Jenkinsfiles, and GitLab CI configurations.
- **Analytics & ROI Dashboard**: Recharts-powered metrics for sprint pass/fail rates, flakiness risk matrices, and engineering hours saved.
- **Webhooks & Alerts**: Push test run completions, failure traces, and self-heal patches directly to Slack or Microsoft Teams.

---

## 🛠️ Local Development & Setup

### 1. Prerequisites
- Node.js 20.19+ or 22.12+
- npm or yarn

### 2. Installation
\`\`\`bash
# Clone or extract this repository
git clone https://github.com/jyotishsaha01/autotest-architect-studio.git
cd autotest-architect-studio

# Install dependencies
npm install
\`\`\`

### 3. Environment Variables
Create a \`.env\` file in the root directory (refer to \`.env.example\`):
\`\`\`bash
cp .env.example .env
\`\`\`

Add your Google Gemini API key:
\`\`\`env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
\`\`\`

### 4. Running the Development Server
\`\`\`bash
npm run dev
\`\`\`
Visit \`http://localhost:3000\` in your browser.

### 5. Building for Production
\`\`\`bash
npm run build
npm start
\`\`\`

---

## 📦 How to Push to Your GitHub Profile

If pushing to \`https://github.com/jyotishsaha01\`:

\`\`\`bash
# 1. Initialize git (if not already initialized)
git init
git add .
git commit -m "feat: Initial commit for AutoTest Architect Studio"

# 2. Set default branch to main
git branch -M main

# 3. Add your remote repository:
git remote add origin https://github.com/jyotishsaha01/autotest-architect-studio.git

# 4. Push using your GitHub credentials (or personal access token / SSH key):
git push -u origin main
\`\`\`

---

## 📄 License
MIT License
