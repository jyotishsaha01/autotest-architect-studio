# AutoTest Architect User Manual

**Audience:** QA engineers, automation engineers, developers, and test leads
**Purpose:** Turn test requirements and UI evidence into a reviewable test model, generated automation code, and optional CI and notification configuration.

## 1. What the application does

AutoTest Architect converts a test case, screenshot, recorded walkthrough, or DOM/accessibility snippet into structured test steps. It can generate an automation suite in several frameworks, help extend an existing suite, prepare CI configuration, and summarize the active test case.

The application **generates and packages code**. It does not open a browser against your target application, execute the generated tests, or produce real pass/fail results by itself. Run the exported suite in your own project or CI system and review generated locators and assertions before relying on them.

## 2. Before you start

You need:

- Access to the AutoTest Architect workspace. In production, enter the workspace access token provided by your administrator when prompted. The token stays in page memory and is cleared when you reload or close the page.
- The target application's full base URL, for example `https://staging.example.com`.
- At least one source of test information: written steps, an Excel/CSV file, a screenshot/mockup, a video walkthrough, or HTML/accessibility DOM markup.
- For AI-powered screenshot and video analysis, a deployment administrator must configure `GEMINI_API_KEY` on the server. Video analysis requires this key. Written text and DOM inputs have a deterministic fallback when Gemini is not configured or is temporarily unavailable; screenshot interpretation needs the AI service.

For a local installation and deployment secrets, see the [README](README.md). Do not paste API keys, workspace tokens, real passwords, payment details, or customer data into test instructions or recordings.

## 3. Main screen and navigation

The navigation is organized around the test lifecycle:

1. **Create tests** — enter the target and provide test input.
2. **Generated code** — choose a framework, review files, copy code, or export the suite.
3. **Sprint updates** — propose and review changes to an existing test suite.
4. **Run instructions** — view setup and run commands for the selected framework.
5. **CI/CD pipelines** — create a starter pipeline for GitHub Actions, Jenkins, or GitLab CI.
6. **Test summary** — inspect the active test's step and locator coverage.
7. **Notifications** — configure optional Slack, Microsoft Teams, or custom HTTPS webhook destinations.
8. **Audit history** — review recent suite changes and generated-code activity in this browser.

The summary strip shows the current test case ID, title, number of steps, and target URL. After generating a suite, the target name, test case ID, and sprint fields in the header can be edited. These fields describe the active suite; the **Target Application Base URL** field in Create tests controls the application address used for generated steps and run commands.

Sections that need an existing suite are unavailable until one has been generated.

## 4. Create your first test suite

1. Open **Create tests**.
2. Enter **Feature / Scenario Domain**, such as `Authentication` or `Checkout`.
3. Enter the complete **Target Application Base URL**, including `https://` or `http://`. Use a safe test or staging environment where possible.
4. Select one input tab and provide its input (see the next section).
5. Review the input and optional guidance. Be specific about expected outcomes, test data, and which parts of the flow matter.
6. Select **Synthesize Test IR & Generate Code**.
7. When processing finishes, the application opens **Generated code**. Review the selected framework, files, steps, expected results, and locator suggestions.

The generated suite reflects the information it could infer from the supplied material. Correct any inaccurate steps or selectors before using the code against a real application.

## 5. Choose an input type

### Test Case Sheet / Steps

Use this for a written test specification or when you know the actions and expected results.

- Paste steps into the text area, or upload an Excel workbook (`.xlsx`, `.xls`, `.xlsm`, or `.xlsb`), `.csv`, `.txt`, or `.md` file.
- Excel workbook contents are parsed in the browser. Up to the first five worksheets and 1,000 rows per worksheet are imported from files smaller than 10 MB. Macro code is not run. Check the imported rows and steps before generating.
- The spreadsheet contents are included in the normal analysis request only when you select **Synthesize Test IR & Generate Code**. If Gemini is configured, the request may be processed by that service.
- Use one action per line where practical. Include the page, control label, input value, and expected outcome.
- You can use **Dictate with Voice** to speak steps into the text area if your browser supports speech recognition and you grant microphone access.
- **Read Aloud** uses your browser's speech synthesis to read the entered text. It does not analyze a recording.

Example:

```text
1. Open the sign-in page.
2. Enter the test user's email address.
3. Enter the test password.
4. Select Sign in.
5. Verify the account dashboard is visible.
```

Use test credentials only. Prefer placeholders such as `<TEST_EMAIL>` and `<TEST_PASSWORD>`.

### UI Screenshot / Mockup

Use this to provide a visual reference for the interface or a wireframe.

1. Upload a PNG, JPG, or WebP image (up to 10 MB).
2. Optionally describe the flow in **Accompanying Test Instructions**. A screenshot shows a state, so your description helps explain what should happen before and after it.
3. Generate the suite and inspect the steps carefully. A static image cannot prove behavior that is not visible in the image.

AI-powered interpretation requires the server's Gemini configuration. Do not upload screenshots containing real customer data, secrets, or sensitive account details.

### Video Walkthrough / Frames

Use this when you want the application to infer the flow from a screen recording, including spoken instructions in its audio track.

1. Record the relevant UI flow in chronological order. Keep the cursor, labels, and important outcomes visible. Narration can clarify intent and expected results.
2. In the video tab, select **Choose video** and preview the selected recording.
3. Optionally enter **Additional instructions** to specify the scenario, clarify narration, or focus the analysis.
4. Select **Synthesize Test IR & Generate Code** and wait while the file uploads and Gemini analyzes its frames and audio.
5. Review the resulting timestamped steps against the recording. Correct any mistaken action or locator before exporting.

Supported formats include MP4, MOV, WebM, AVI, MPEG, WMV, FLV, and 3GP. The application accepts files up to 2 GB, but a hosting provider, reverse proxy, available temporary disk space, network connection, or Gemini quota may impose a lower practical limit. Large uploads can take a long time. Video analysis requires the administrator to configure `GEMINI_API_KEY`; the video is sent to Gemini for processing. Never record real passwords, access tokens, payment data, or private customer data. The analyzer is instructed to redact secrets it detects, but avoid recording them in the first place.

### Live DOM / Accessibility HTML

Use this when you can provide markup from the target page and want stronger locator candidates.

1. Copy a relevant HTML fragment or accessibility DOM snapshot from the target application.
2. Paste it into the markup area. Include the controls involved and attributes such as accessible roles, labels, placeholders, or `data-testid` values.
3. Avoid pasting unrelated page content, scripts, secrets, or hidden personal data.
4. Generate the suite, then confirm that the suggested locators actually match the target application's current markup.

The application does not connect to or crawl the target URL to retrieve its DOM; you provide the markup.

## 6. Add steps to an existing suite

After a suite exists, return to **Create tests**. **Add steps to the existing test suite** is enabled by default.

1. Keep append mode enabled.
2. Enter **only the new steps** in the selected input type. For example, upload a new recording of the additional checkout steps, or enter only the new written actions.
3. Keep the same target base URL unless the new steps intentionally target another environment.
4. Generate and review the result. New steps are appended to the current suite and renumbered; the existing steps are preserved. Duplicate initial navigation can be omitted when it merely repeats the current base URL.
5. Review the entire suite in Generated code and export it again.

To start a different test case instead, turn off **Add steps to the existing test suite** before generating. This replaces the active suite in the current page session. There is no automatic project history or version recovery in the application, so export a copy before replacing work you need to keep.

## 7. Review and export generated code

In **Generated code**:

1. Select a framework from the **Framework** menu:
   - Playwright · TypeScript
   - Playwright · JavaScript
   - Playwright · Python
   - Selenium · Java
   - Selenium · Python
2. Review each file in the project tree. Switching framework regenerates the suite for that framework; it does not change the test steps.
3. Use **Copy Code** to copy the selected file or **Download File** to save that file. The app first validates the target URL, steps/locators, generated project files, and CI configuration.
4. Use **Export Suite (.zip)** to review the same validation report before downloading the generated project files together. Fix blocking issues first; warnings can be reviewed and accepted.
5. Use **GitHub setup** for the repository integration instructions shown by the app.

The validation checks configuration and generated-file structure locally. It does not execute tests or verify that the target URL is reachable from your CI runner. Review any locator warnings and confirm your runner can reach the target environment.

The archive is for the generated **test suite**, not the AutoTest Architect application source. Generated code is a starting point: inspect dependencies, test data, selectors, assertions, and target environment configuration before committing it to a product repository.

## 8. Update tests for a new sprint

Use **Sprint updates** when existing behavior or markup has changed.

1. Enter the target sprint identifier.
2. Describe the new sprint's changes in **New Sprint Feature Changes / Release Notes**.
3. If the relevant page markup changed, provide the new snippet in **Updated Sprint DOM or Component Template**.
4. Select **Detect Changes** (the exact action label may vary by version) to compare the new information with the active suite and produce a proposed patch.
5. Review each detected change, its explanation, confidence, and impacted steps.
6. Select **Accept & Apply Patch** only after reviewing. The application updates the active Test IR and generated code; it does not edit or commit files in your separate test repository.

If there are no detected changes or the proposal is inaccurate, refine the release notes or DOM snippet and analyze again. Verify generated code after applying a patch.

## 9. Run the generated suite

Open **Run instructions** for framework-specific setup commands. Copy the commands and run them in the generated suite's project directory after extracting the ZIP or copying its files into your repository.

For Playwright, the page shows install and browser setup commands and a command using the active base URL. For Selenium, use the generated project's language-specific dependencies and test runner (for example Maven for Java). Follow the generated project files and the instructions shown for the selected framework.

The app itself does not execute tests. You are responsible for configuring valid test credentials, environment variables, browser dependencies, network access, and any application-specific setup. Run against a non-production environment unless your test is explicitly safe for production.

## 10. Generate CI/CD configuration

Open **CI/CD pipelines**, choose **GitHub Actions**, **Jenkins**, or **GitLab CI**, and review the generated pipeline for the selected framework. Use **Copy File** or **Download** to save it into the appropriate path in your test repository.

Before enabling the pipeline:

- Configure the target base URL and credentials as CI variables/secrets.
- Check the generated runtime versions, browser installation, test command, and artifact paths against your repository.
- Confirm that the CI runner can reach the target environment.
- Review permissions and secret handling in the generated configuration.

Pipeline configuration is a starter file. It does not install itself into your repository or run until you commit it to a supported CI project and enable that workflow.

## 11. Understand Test summary

**Test summary** is calculated from the active test case. It reports:

- The number of test steps.
- The number of distinct action types represented (for example, navigate, fill, or assert).
- How many steps have a recommended locator.
- Charts showing action counts and locator candidate strategies.

These are structural coverage summaries, not execution history, pass rates, time saved, financial ROI, or production quality measurements. The charts update when the active test suite changes.

## 12. Review Audit history

Open **Audit history** to review suite creation, appended steps, applied sprint changes, suite metadata edits, generated code, and copied/downloaded exports. Entries include the test case, framework or file details, and a timestamp. The timeline keeps up to 200 events in this browser's local storage. It does not store generated source code, restore earlier suite versions, or sync to other users/devices; treat it as a convenience history, not a centralized compliance audit log.

## 13. Configure Notifications (optional)

Notifications are optional. You can ignore this section if you do not use Slack, Microsoft Teams, or an HTTPS notification endpoint.

### Set up a destination

1. Create an incoming webhook in the destination channel in Slack or Teams, or prepare an appropriate custom HTTPS endpoint.
2. Open **Notifications** and select **Add destination**.
3. Give the destination a recognizable name and choose its platform.
4. Paste the incoming webhook URL. It is treated as a secret and displayed masked.
5. Select **Enabled** and choose which events should notify: test passes, test failures, and/or a test that recovers after a locator repair.
6. Select **Save changes**.
7. After saving, select **Send test notification** and confirm a sample appears in the destination channel.

The test notification verifies delivery only; it is not a test execution. The application does not run tests, so real pass/fail messages require an external CI integration to submit execution results to the app's webhook dispatch API. The self-heal event also depends on an external integration reporting that event. A custom endpoint must be publicly reachable over HTTPS; private network destinations and redirects are rejected for security.

Webhook settings are stored server-side, encrypted at rest in production, and depend on the administrator's persistent storage configuration. If saving or testing fails, check the displayed error, app access token, webhook URL, network policy, and server logs without exposing the URL in tickets or chat.

## 14. Access, data, and privacy

- In a production deployment, the workspace may ask for a shared access token. Ask your administrator for it; it is separate from the Gemini API key.
- Administrators configure `APP_API_TOKEN`, `WEBHOOK_ENCRYPTION_KEY`, `WEBHOOK_STORAGE_PATH`, and `GEMINI_API_KEY` on the server. Users should not put these secrets in frontend build settings or test-case content.
- The shared access token protects app API calls; it is not an individual user account or role system. Follow your organization's identity and access policies.
- Written input and uploaded evidence may contain sensitive information. Use synthetic test data and remove secrets before submission. Video is sent to Gemini for analysis when this feature is used.
- The active test suite lives in the current browser page session. Export generated code to preserve it. Reloading or closing the page can discard unsaved test-suite work. Webhook configuration is stored separately on the server.
- Audit history is stored locally in the browser and can be removed by clearing this site's browser storage. It is not an authoritative server-side audit log.

## 15. Troubleshooting

| Problem | What to check |
| --- | --- |
| Workspace token is rejected | Confirm you copied the production `APP_API_TOKEN` from the administrator's approved secret channel. Check for extra spaces and ask the administrator to confirm the server configuration. |
| Text or spreadsheet analysis returns generic or incomplete steps | Add one action per line, include descriptive column headers, name controls by their visible label, include the expected result, and confirm the base URL. Try again when the AI provider is available. |
| Excel workbook does not upload | Use `.xlsx`, `.xls`, `.xlsm`, or `.xlsb`, keep the file under 10 MB, and confirm the first five worksheets contain data. Password-protected or damaged workbooks may not parse. |
| Screenshot is not interpreted | Confirm Gemini is configured on the server, use a clear supported image under 10 MB, and add accompanying instructions. |
| Video analysis says Gemini is not configured | Ask the administrator to set `GEMINI_API_KEY` on the server and restart/redeploy the service. |
| Video upload fails or takes too long | Check format and size (maximum 2 GB in the app), network stability, hosting/proxy body-size and timeout settings, temporary disk space, and Gemini quota. Large uploads require the host to support them. |
| Generated locator does not find an element | Inspect the target page's current DOM, supply an updated accessibility/DOM snippet, and correct the locator in your generated test project. Screenshot/video-derived locators are suggestions, not guaranteed selectors. |
| Run command fails | Run it from the generated suite directory, install the required language/browser dependencies, and set the target URL and test credentials for your environment. |
| Pre-export validation warns about the target URL | Replace sample domains with your real test environment URL. A localhost URL is normally unreachable from a hosted CI runner. |
| Pre-export validation reports missing files or commands | Re-select the framework to regenerate its project files, then confirm the matching CI provider and framework are selected. |
| CI job cannot reach the target | Check runner network access, target URL, CI secrets, and any VPN or allowlist requirements. |
| Notification test fails | Save the configuration first, ensure the destination is enabled, confirm the URL is current, and check outbound HTTPS access and provider status. |
| Notification test works but no test alerts arrive | Configure your external CI system to post real execution events to the app; sending a test notification alone does not connect a test runner. |

## 16. Administrator reference

For deployment, environment variables, authentication, persistent webhook storage, and the webhook dispatch payload, see [README.md](README.md). Production requires a strong `APP_API_TOKEN` and a 256-bit `WEBHOOK_ENCRYPTION_KEY`. Keep the `WEBHOOK_STORAGE_PATH` volume persistent and access-controlled. The included encrypted file store is for a single server instance; a multi-instance deployment needs shared transactional storage.
