import express, { Request, Response } from 'express';
import multer from 'multer';
import type { File as GeminiFile } from '@google/genai';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { getGeminiClient } from './geminiClient.js';
import { buildFallbackIR } from '../src/utils/fallbackIR.js';

export const aiRouter = express.Router();

const supportedVideoMimeTypes = new Set([
  'video/mp4', 'video/mpeg', 'video/mov', 'video/avi', 'video/x-flv',
  'video/mpg', 'video/webm', 'video/wmv', 'video/3gpp'
]);
const videoMimeByExtension: Record<string, string> = {
  '.mp4': 'video/mp4', '.mpeg': 'video/mpeg', '.mov': 'video/mov',
  '.avi': 'video/avi', '.flv': 'video/x-flv', '.mpg': 'video/mpg',
  '.webm': 'video/webm', '.wmv': 'video/wmv', '.3gp': 'video/3gpp'
};
// Gemini Files API currently supports video files up to 2 GiB per file.
export const MAX_VIDEO_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;
const videoUpload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (_req, _file, callback) => callback(null, `autotest-video-${randomUUID()}`)
  }),
  limits: { fileSize: MAX_VIDEO_UPLOAD_BYTES, files: 1, fields: 6, fieldSize: 512 * 1024 }
});

function receiveVideo(req: Request, res: Response, next: express.NextFunction) {
  videoUpload.single('video')(req, res, error => {
    if (!error) return next();
    const tooLarge = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE';
    res.status(tooLarge ? 413 : 400).json({ error: tooLarge ? 'Video exceeds the 2 GB upload limit.' : 'Could not read the uploaded video. Choose a supported video file and try again.' });
  });
}

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

  if (!process.env.GEMINI_API_KEY) {
    if (imageBase64) {
      return res.status(503).json({
        success: false,
        error: 'Screenshot analysis needs the configured AI service. Ask your administrator to check GEMINI_API_KEY and try again.'
      });
    }
    const fallbackIR = buildFallbackIR(
      featureName || 'E-Commerce Checkout',
      baseUrl || 'https://boat.com',
      textContent || '',
      domSnippet
    );
    return res.json({
      success: true,
      testIR: fallbackIR,
      notice: 'Generated with the built-in parser. Configure GEMINI_API_KEY for AI-assisted analysis.'
    });
  }

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
    if (imageBase64) {
      console.warn('Screenshot analysis is unavailable; returning an actionable error instead of silently ignoring the image.');
      return res.status(503).json({
        success: false,
        error: 'Screenshot analysis needs the configured AI service. Ask your administrator to check GEMINI_API_KEY and try again.'
      });
    }
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

/** Analyze an uploaded walkthrough, including its visual actions and spoken instructions. */
aiRouter.post('/analyze-video', receiveVideo, async (req: Request, res: Response) => {
  const video = req.file;
  if (!video) return res.status(400).json({ error: 'Choose a video file to analyze.' });

  let uploadedFile: GeminiFile | undefined;
  try {
    const extension = path.extname(video.originalname).toLowerCase();
    const mimeType = videoMimeByExtension[extension] || (video.mimetype === 'video/quicktime' ? 'video/mov' : video.mimetype);
    if (!supportedVideoMimeTypes.has(mimeType)) {
      return res.status(415).json({ error: 'Unsupported video format. Use MP4, MOV, WebM, AVI, MPEG, WMV, FLV, or 3GP.' });
    }
    const baseUrl = String(req.body.baseUrl || '').trim();
    try {
      const parsedUrl = new URL(baseUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error();
    } catch {
      return res.status(400).json({ error: 'Enter a valid target application URL beginning with https:// or http://.' });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'Video analysis requires GEMINI_API_KEY. Add it to the server environment and restart the app.' });
    }
    const featureName = String(req.body.featureName || '').trim().slice(0, 120) || 'Application workflow';
    const instructions = String(req.body.instructions || '').trim().slice(0, 4000);
    const append = req.body.appendToExisting === 'true';
    let existingContext = '';
    if (append && req.body.currentTestIR) {
      if (String(req.body.currentTestIR).length > 300_000) return res.status(400).json({ error: 'Existing test suite is too large to include with this video.' });
      try {
        const current = JSON.parse(req.body.currentTestIR);
        const steps = Array.isArray(current.steps) ? current.steps.slice(0, 100) : [];
        existingContext = `Existing suite context (preserve it; return only actions newly shown in this clip):\n${JSON.stringify({ title: current.title, testCaseId: current.testCaseId, steps }, null, 2)}`;
      } catch {
        return res.status(400).json({ error: 'Could not read the existing test suite context.' });
      }
    }

    const ai = getGeminiClient();
    uploadedFile = await ai.files.upload({
      file: video.path,
      config: { mimeType, displayName: video.originalname.slice(0, 255) }
    });
    if (!uploadedFile.name || !uploadedFile.uri || !uploadedFile.mimeType) throw new Error('The video upload did not return a usable file reference.');

    let fileState = uploadedFile;
    for (let attempt = 0; fileState.state === 'PROCESSING' && attempt < 60; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      fileState = await ai.files.get({ name: uploadedFile!.name! });
    }
    if (fileState.state === 'FAILED') throw new Error('Gemini could not process this video. Try exporting it as MP4 or using a shorter clip.');
    if (fileState.state !== 'ACTIVE') throw new Error('Video processing took too long. Try a shorter clip.');

    const prompt = `You analyze recorded software UI walkthroughs to create runnable UI automation test steps.
Analyze BOTH the video frames and its audio track. Listen for spoken test instructions, expected outcomes, labels, and navigation guidance. Align what is said with the visible interactions and include the complete chronological flow.

Target feature: ${featureName}
Target application base URL: ${baseUrl}
${instructions ? `Additional user guidance:\n${instructions}\n` : ''}
${existingContext}

Return a canonical Test IR as valid JSON only, with fields: testCaseId, title, description, feature, sprint, priority, baseUrl, steps. Each step must contain id, stepNumber, action, description, optional target {semantic, role, recommendedLocator, locators}, optional value, expectedResult, and timestamp (MM:SS or HH:MM:SS from the clip).
Use only supported actions: navigate, click, fill, select, check, uncheck, press, hover, wait_for, assert_visible, assert_text, assert_url. Use visible labels and accessible roles for locator suggestions. The video does not reveal the page DOM, so do not invent data-testid values or claim locator certainty. Use an observed URL when visible, otherwise use the supplied target base URL. Do not guess outcomes that are not visible or spoken. Replace any password, access token, card number, or other secret spoken or shown in the recording with a safe placeholder such as <TEST_PASSWORD>; never reproduce the actual secret. If extending an existing suite, return only the new actions from this clip and do not repeat existing steps. Include an initial navigation step only for a new suite when the clip clearly shows one.

Use testCaseId from the existing suite when extending it, otherwise make a concise ID. Set baseUrl exactly to the supplied URL. Provide a concise description of the recorded scenario. Return no markdown fences or commentary.`;
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts: [
        { fileData: { fileUri: uploadedFile.uri, mimeType: uploadedFile.mimeType } },
        { text: prompt }
      ] },
      config: { responseMimeType: 'application/json', temperature: 0.1 }
    });
    const testIR = parseJsonFromText(response.text || '{}');
    if (!Array.isArray(testIR.steps) || testIR.steps.length === 0) {
      return res.status(422).json({ error: 'No test actions could be identified. Try a clearer recording with visible interactions or spoken instructions.' });
    }
    if (testIR.steps.length > 100) testIR.steps = testIR.steps.slice(0, 100);
    testIR.id = `ir-${Date.now()}`;
    testIR.baseUrl = baseUrl;
    testIR.feature = featureName;
    testIR.steps = testIR.steps.map((step: any, index: number) => ({
      ...step,
      id: typeof step.id === 'string' ? step.id : `video-step-${index + 1}`,
      stepNumber: index + 1
    }));
    return res.json({ success: true, testIR, source: 'video-and-audio' });
  } catch (error: any) {
    console.error('Video analysis failed:', error?.message || 'Unknown video analysis error');
    return res.status(502).json({ error: error instanceof Error ? error.message : 'Could not analyze the uploaded video.' });
  } finally {
    if (video.path) await unlink(video.path).catch(() => undefined);
    if (uploadedFile?.name) {
      const ai = getGeminiClient();
      await ai.files.delete({ name: uploadedFile.name }).catch(error => console.warn('Could not remove temporary Gemini video file:', error?.message || 'unknown error'));
    }
  }
});

/**
 * 2. Sprint Update & Change Detection
 * Compares current Test IR/Locators against new Sprint changes (new screenshot, video notes, or test steps)
 */
aiRouter.post('/detect-sprint-diff', async (req: Request, res: Response) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: 'Sprint change analysis needs the configured AI service. Ask your administrator to check GEMINI_API_KEY.' });
  }
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
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: 'Locator repair suggestions need the configured AI service. Ask your administrator to check GEMINI_API_KEY.' });
  }
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
