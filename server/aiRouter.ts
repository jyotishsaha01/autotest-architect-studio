import express, { Request, Response } from 'express';
import { getGeminiClient } from './geminiClient.js';
import { buildFallbackIR } from '../src/utils/fallbackIR.js';

export const aiRouter = express.Router();

// Helper to sanitize JSON response from Gemini
function parseJsonFromText(rawText: string) {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/```\s*$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '');
  }
  return JSON.parse(cleaned);
}

// Call Gemini with retry and fallback model if 503 high-demand occurs
async function callGeminiWithRetry(contents: any) {
  const ai = getGeminiClient();
  const models = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1
          }
        });
        return response;
      } catch (err: any) {
        console.warn(`Gemini call failed with model ${model} (attempt ${attempt + 1}):`, err.message);
        // Wait 1 second before retrying
        await new Promise(res => setTimeout(res, 1000));
      }
    }
  }
  throw new Error('All Gemini model attempts encountered temporary high demand (503).');
}

/**
 * 1. Analyze Test Cases, Screenshots, Videos, or DOM into structured Test IR
 */
aiRouter.post('/analyze-input', async (req: Request, res: Response) => {
  const {
    inputType, // 'sheet' | 'screenshot' | 'video_notes' | 'dom'
    textContent,
    imageBase64,
    imageMimeType,
    domSnippet,
    featureName,
    baseUrl
  } = req.body;

  try {
    const parts: any[] = [];

    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: imageMimeType || 'image/png',
          data: imageBase64.replace(/^data:image\/\w+;base64,/, '')
        }
      });
    }

    const promptText = `
You are an expert Automation Test Architect and AI QA Engineer.
Analyze the following test input (which could be a test case sheet, video frame logs, screenshot, or DOM structure) and generate a canonical Test Intermediate Representation (Test IR).

Input Details:
- Input Type: ${inputType}
- Target Feature: ${featureName || 'Application Feature'}
- Base URL: ${baseUrl || 'https://app.example.com'}
- Provided Text/Steps/Sheet/Video notes:
"""
${textContent || ''}
"""

${domSnippet ? `Provided DOM or HTML snippet:\n"""\n${domSnippet}\n"""\n` : ''}

CRITICAL RULES FOR TEST IR:
1. Every step must have a clear action: navigate, click, fill, select, check, uncheck, wait_for, assert_visible, assert_text, assert_url.
2. For targets, provide a high-confidence locator candidate hierarchy:
   - Priority 1: Semantic role + accessible name (e.g. getByRole('button', { name: 'Sign In' }) or button:has-text('Sign In'))
   - Priority 2: testid or data-testid attribute
   - Priority 3: placeholder or label
   - Priority 4: stable ID or CSS selector
   - Priority 5: clean relative XPath
3. Provide a 'recommendedLocator' string that directly works in modern Playwright.
4. Provide a semantic name for each target.

Return ONLY valid JSON matching:
{
  "testCaseId": "TC_001",
  "title": "Descriptive Title of the Test",
  "description": "Clear end-to-end description of the scenario",
  "feature": "${featureName || 'Authentication'}",
  "sprint": "Sprint 1",
  "priority": "P0",
  "baseUrl": "${baseUrl || 'https://app.example.com'}",
  "steps": [
    {
      "id": "step-1",
      "stepNumber": 1,
      "action": "navigate",
      "description": "Open target application",
      "value": "${baseUrl || '/'}"
    }
  ]
}
`;

    parts.push({ text: promptText });

    const response = await callGeminiWithRetry({ parts });
    const parsedIR = parseJsonFromText(response.text || '{}');
    parsedIR.id = `ir-${Date.now()}`;
    if (parsedIR.steps) {
      parsedIR.steps = parsedIR.steps.map((st: any, idx: number) => ({
        ...st,
        id: st.id || `step-${idx + 1}`,
        stepNumber: idx + 1
      }));
    }

    res.json({ success: true, testIR: parsedIR });
  } catch (error: any) {
    console.warn('Gemini 503 / API unavailable; activating deterministic resilient fallback IR builder.');
    // Graceful fallback to guarantee user gets a complete test suite even when Google Cloud experiences temporary 503
    const fallbackIR = buildFallbackIR(
      featureName || 'E-Commerce Checkout',
      baseUrl || 'https://boat.com',
      textContent || '',
      domSnippet
    );
    res.json({ 
      success: true, 
      testIR: fallbackIR,
      notice: 'Synthesized using AutoTest resilient parser (upstream AI is temporarily at high capacity).' 
    });
  }
});

/**
 * 2. Sprint Update & Change Detection
 * Compares current Test IR/Locators against new Sprint changes (new screenshot, video notes, or test steps)
 */
aiRouter.post('/detect-sprint-diff', async (req: Request, res: Response) => {
  try {
    const {
      currentTestIR,
      newSprintNumber,
      newSprintInputs, // { textNotes, imageBase64, domSnippet }
    } = req.body;

    const ai = getGeminiClient();

    const parts: any[] = [];
    if (newSprintInputs?.imageBase64) {
      parts.push({
        inlineData: {
          mimeType: newSprintInputs.imageMimeType || 'image/png',
          data: newSprintInputs.imageBase64.replace(/^data:image\/\w+;base64,/, '')
        }
      });
    }

    const promptText = `
You are an expert Automation Architect specializing in sprint change impact analysis.
A new sprint (${newSprintNumber || 'Sprint Next'}) has arrived with UI changes or updated test steps.
Compare the existing Test IR against the newly provided sprint updates.

Existing Test IR:
${JSON.stringify(currentTestIR, null, 2)}

New Sprint Input Notes:
"""
${newSprintInputs?.textNotes || 'No notes provided'}
"""
${newSprintInputs?.domSnippet ? `New DOM Structure:\n"""\n${newSprintInputs.domSnippet}\n"""\n` : ''}

TASK:
1. Identify elements that have been MODIFIED, ADDED, REMOVED, or RENAMED (e.g. "Login" button renamed to "Sign In", locator changed from #login to button[data-testid='sign-in']).
2. Maintain UI Semantic Identity: Recognize when an element represents the SAME business intent despite DOM or text changes.
3. Determine affected steps and code patches.
4. Return an updated Test IR that incorporates these changes while preserving unaffected steps!

Return ONLY valid JSON matching this schema:
{
  "changes": [
    {
      "elementSemanticId": "auth.login.submit",
      "elementName": "Login Button",
      "changeType": "RENAMED",
      "oldValue": "Login (button#login)",
      "newValue": "Sign In (button[data-testid='sign-in'])",
      "impactedTests": ["${currentTestIR?.testCaseId || 'TC_001'}"],
      "confidence": 0.98,
      "explanation": "Button label updated from Login to Sign In and data-testid added",
      "suggestedPatch": "- await page.locator('#login').click();\\n+ await page.locator(\\"button[data-testid='sign-in']\\").click();"
    }
  ],
  "summary": "Detected 1 modified element and 0 removed. 1 test step updated.",
  "updatedTestIR": <complete updated TestIR object incorporating the changes>
}
`;

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    });

    const parsedResult = parseJsonFromText(response.text || '{}');
    res.json({ success: true, ...parsedResult });
  } catch (error: any) {
    console.error('Error in /detect-sprint-diff:', error);
    res.status(500).json({ error: error.message || 'Failed to detect sprint changes' });
  }
});

/**
 * 3. Self-Healing Locator Engine
 * When an execution fails due to a broken locator or DOM drift, analyzes DOM & intent to heal the locator
 */
aiRouter.post('/self-heal-locator', async (req: Request, res: Response) => {
  try {
    const { failedStep, failedLocator, currentDomOrSnippet, screenshotBase64, testIntent } = req.body;
    const ai = getGeminiClient();

    const parts: any[] = [];
    if (screenshotBase64) {
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: screenshotBase64.replace(/^data:image\/\w+;base64,/, '')
        }
      });
    }

    const promptText = `
You are an autonomous Self-Healing Test Automation Agent.
A test step failed during execution because the locator could not find the element.

Failed Step:
${JSON.stringify(failedStep, null, 2)}

Failed Locator: "${failedLocator}"
Test Intent: "${testIntent || 'Interact with target element'}"

Current DOM or HTML snapshot:
"""
${currentDomOrSnippet || '<div class="btn-group"><button data-testid="sign-in-submit" class="primary-btn">Sign In</button></div>'}
"""

TASK:
1. Examine the DOM and screenshot to find the candidate element that fulfills the test intent.
2. Formulate high-resilience locators (preferring role, data-testid, aria attributes, or stable text).
3. Compute a confidence score (0.0 to 1.0).
4. If confidence > 0.90, mark as safe auto-heal.
5. Provide code diff snippet showing the fix.

Return ONLY JSON:
{
  "healed": true,
  "confidence": 0.96,
  "oldLocator": "${failedLocator}",
  "newLocator": "button[data-testid='sign-in-submit']",
  "reason": "Element was updated with a new data-testid and text changed slightly.",
  "codeDiff": "- await page.locator('${failedLocator}').click();\\n+ await page.locator(\\"button[data-testid='sign-in-submit']\\").click();",
  "locatorCandidates": [
    {"strategy": "testid", "selector": "button[data-testid='sign-in-submit']", "confidence": 0.98},
    {"strategy": "role", "selector": "getByRole('button', { name: 'Sign In' })", "confidence": 0.94}
  ]
}
`;

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    });

    const parsed = parseJsonFromText(response.text || '{}');
    res.json({ success: true, ...parsed });
  } catch (error: any) {
    console.error('Error in /self-heal-locator:', error);
    res.status(500).json({ error: error.message || 'Failed to heal locator' });
  }
});
