# AutoTest Architect

AutoTest Architect turns QA specifications, screenshots, video frames, and DOM data into structured test cases and generated automation suites.

## Features

- Import test steps, CSV/text files, screenshots, video frames, and accessibility markup.
- Normalize input into a framework-independent Test IR.
- Generate Playwright TypeScript/Python and Selenium Java/Python suites.
- Create CI pipeline files and incremental sprint updates.
- Inspect a semantic UI graph, execution flow, analytics, and webhook settings.
- Export generated test suites. The full application source ZIP action and endpoint have been removed.

## Run locally

Requirements: Node.js 20.19+ (or 22.12+) and npm.

```sh
npm ci
cp .env.example .env
```

Add `GEMINI_API_KEY` to `.env` to enable Gemini-powered synthesis. Without it, the app can still use its deterministic fallback parser; provider-specific AI features need their corresponding server-side credentials.

Start the development server:

```sh
npm run dev
```

Open <http://localhost:3000>.

Build and run the production server:

```sh
npm run build
npm start
```

## Source and secrets

The repository is private. The app does not provide a downloadable archive of its full source. Browser-delivered UI code can still be inspected by visitors, so keep API keys and other secrets on the server and out of client code.
