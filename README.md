# AutoTest Architect

AutoTest Architect turns QA specifications, screenshots, video frames, and DOM data into structured test cases and generated automation suites.

## Features

- Import test steps, CSV/text files, screenshots, raw video walkthroughs (including spoken instructions), and accessibility markup.
- Normalize input into a framework-independent Test IR.
- Generate Playwright JavaScript/TypeScript/Python and Selenium Java/Python suites.
- Create CI pipeline files and incremental sprint updates.
- Review run instructions, active-test analytics, and webhook configuration.
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

Webhook configuration is encrypted with AES-256-GCM and atomically persisted to `WEBHOOK_STORAGE_PATH` (default `data/webhooks.enc`). Keep that directory on a persistent, access-controlled volume. This file store supports a single server instance; multi-instance deployments need a shared transactional store before running replicas.

Production startup requires an API bearer token and a separate 256-bit encryption key. Generate them with:

```sh
openssl rand -hex 32 # APP_API_TOKEN
openssl rand -hex 32 # WEBHOOK_ENCRYPTION_KEY
```

Set both values in the deployment secret manager, and set `WEBHOOK_STORAGE_PATH` to the persistent volume. The application asks for the API token when opened and holds it in page memory until the page is closed or reloaded. The token protects all API endpoints; it is a shared workspace credential, not individual user identity or role-based access. For per-user access or SSO, put the app behind an identity-aware access proxy. Do not place either server secret in client build variables.

The webhook API supports Slack incoming webhooks, Microsoft Teams incoming webhooks, and custom HTTPS JSON endpoints. It rejects redirects and private network destinations for custom URLs to limit SSRF. CI systems can post real execution events (which respect the configured pass/failure/self-heal switches) to `POST /api/webhooks/dispatch` with `Authorization: Bearer $APP_API_TOKEN` and a JSON body such as:

```json
{"status":"failed","testCaseId":"TC_AUTH_001","feature":"Authentication","durationMs":4200,"details":"Expected sign-in confirmation was not visible."}
```

`POST /api/webhooks/test-dispatch` sends a configuration test. Provider delivery errors are returned as failures; notification URLs and payloads are never included in responses. The app generates automation and CI files; tests run in your configured local or CI environment rather than inside the web process.
