import React, { useState, useEffect, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Image as ImageIcon, 
  Video, 
  Code2, 
  Sparkles, 
  Upload, 
  Layers, 
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Mic,
  MicOff,
  Volume2,
  VolumeX
} from 'lucide-react';
import { TestIR } from '../types/testAutomation';

interface InputStudioProps {
  onIRGenerated: (ir: TestIR, appendToExisting: boolean, explicitNavigation: boolean) => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
  currentTestIR: TestIR;
  canAppendToExisting: boolean;
  apiFetch: typeof fetch;
}

export const InputStudio: React.FC<InputStudioProps> = ({ onIRGenerated, isLoading, setIsLoading, currentTestIR, canAppendToExisting, apiFetch }) => {
  const [activeTab, setActiveTab] = useState<'sheet' | 'screenshot' | 'video' | 'dom'>('sheet');
  const [testCaseText, setTestCaseText] = useState('');
  const [featureName, setFeatureName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [appendToExisting, setAppendToExisting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [domSnippet, setDomSnippet] = useState('');

  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState<string>('');
  const [videoNotes, setVideoNotes] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('');
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [videoProgress, setVideoProgress] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (canAppendToExisting) {
      setAppendToExisting(true);
      setTestCaseText('');
    }
  }, [canAppendToExisting]);

  useEffect(() => {
    if (!videoFile) { setVideoPreviewUrl(''); return; }
    const url = URL.createObjectURL(videoFile);
    setVideoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  // Initialize Speech Recognition & Synthesis APIs
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              const phrase = event.results[i][0].transcript.trim();
              if (phrase) {
                setTestCaseText((prev) => {
                  const cleaned = prev ? prev.trimEnd() : '';
                  // If last char is not a newline, add a newline or step index
                  return cleaned ? `${cleaned}\n• ${phrase}` : `• ${phrase}`;
                });
              }
            } else {
              currentTranscript += event.results[i][0].transcript;
            }
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          setIsListening(false);
          if (event.error === 'not-allowed') {
            setErrorMessage('Microphone access was denied. Please allow microphone permissions in your browser.');
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }

      if ('speechSynthesis' in window) {
        setTtsSupported(true);
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleDictation = () => {
    if (!speechSupported) {
      setErrorMessage('Speech recognition is not supported in this browser. Try Google Chrome or Microsoft Edge.');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (_) {}
      setIsListening(false);
    } else {
      setErrorMessage(null);
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err: any) {
        console.warn('Failed to start speech recognition', err);
        setIsListening(false);
      }
    }
  };

  const toggleReadAloud = () => {
    if (!ttsSupported) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      if (!testCaseText.trim()) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(testCaseText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setScreenshotData(event.target?.result as string);
        setScreenshotName(file.name);
      };
      reader.readAsDataURL(file);
    } else {
      // CSV or Text file
      const reader = new FileReader();
      reader.onload = (event) => {
        setTestCaseText(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleVideoSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024 * 1024) {
      setErrorMessage('Choose a video no larger than 2 GB.');
      event.target.value = '';
      return;
    }
    setErrorMessage(null);
    setVideoFile(file);
  };

  const handleGenerateIR = async () => {
    if (!baseUrl.trim()) {
      setErrorMessage('Enter the target application base URL before generating tests.');
      return;
    }
    try {
      const target = new URL(baseUrl.trim());
      if (!['http:', 'https:'].includes(target.protocol)) throw new Error();
    } catch {
      setErrorMessage('Enter a valid target URL beginning with https:// or http://.');
      return;
    }
    const hasActiveInput = activeTab === 'sheet' ? !!testCaseText.trim()
      : activeTab === 'screenshot' ? !!screenshotData
      : activeTab === 'video' ? !!videoFile
      : !!domSnippet.trim();
    if (!hasActiveInput) {
      setErrorMessage(activeTab === 'screenshot' ? 'Upload a screenshot to continue.' : 'Add input details to continue.');
      return;
    }
    if (appendToExisting && activeTab === 'sheet' && !testCaseText.trim()) {
      setErrorMessage('Enter the new test steps you want to add to the existing suite.');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (activeTab === 'video') {
        const form = new FormData();
        form.set('video', videoFile!);
        form.set('featureName', featureName.trim());
        form.set('baseUrl', baseUrl.trim());
        form.set('instructions', videoNotes.trim());
        form.set('appendToExisting', String(appendToExisting));
        if (appendToExisting) form.set('currentTestIR', JSON.stringify(currentTestIR));
        setVideoProgress('Uploading video and analyzing its frames and audio…');
        const response = await apiFetch('/api/analyze-video', { method: 'POST', body: form });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'Could not analyze the video.');
        onIRGenerated({ ...data.testIR, baseUrl: baseUrl.trim(), feature: featureName.trim() || data.testIR.feature }, appendToExisting, false);
        setVideoFile(null);
        setVideoNotes('');
        if (videoInputRef.current) videoInputRef.current.value = '';
        return;
      }
      let textContent = '';
      if (activeTab === 'sheet') textContent = testCaseText;
      else if (activeTab === 'dom') textContent = `Synthesize test case from DOM structure:\n${domSnippet}`;
      else textContent = testCaseText || 'Synthesize test from uploaded UI mockup';

      const response = await apiFetch('/api/analyze-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputType: activeTab,
          textContent,
          imageBase64: screenshotData,
          imageMimeType: 'image/png',
          domSnippet: activeTab === 'dom' ? domSnippet : (domSnippet || undefined),
          featureName,
          baseUrl
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to process input into Test IR');
      }

      const explicitNavigation = /(?:^|\n)\s*(?:step\s*\d*[:.)-]?\s*)?(?:navigate|go to|open|visit|launch)\b/im.test(textContent);
      onIRGenerated({ ...data.testIR, baseUrl: baseUrl.trim(), feature: featureName.trim() || data.testIR.feature }, appendToExisting, explicitNavigation);
      setTestCaseText('');
      setAppendToExisting(true);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'An unexpected error occurred while analyzing the input.');
    } finally {
      setVideoProgress('');
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      {/* Header bar */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            Multi-Modal Input Ingestion
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Provide manual test sheets, screen captures, video logs, or raw DOM elements to construct the canonical Test IR.
          </p>
        </div>

      </div>

      {/* Target configuration strip */}
      <div className="px-6 py-3 bg-slate-50/70 border-b border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Feature / Scenario Domain</label>
          <input
            type="text"
            value={featureName}
            onChange={(e) => setFeatureName(e.target.value)}
            placeholder="e.g. Checkout Flow, User Auth, CRM Leads"
            className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Target Application Base URL</label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://app.yourdomain.com"
            className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Input Modality Tabs */}
      <div className="flex border-b border-slate-200 px-6 bg-slate-50/30">
        <button
          onClick={() => setActiveTab('sheet')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'sheet'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Test Case Sheet / Steps
        </button>

        <button
          onClick={() => setActiveTab('screenshot')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'screenshot'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          UI Screenshot / Mockup
        </button>

        <button
          onClick={() => setActiveTab('video')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'video'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Video className="w-4 h-4" />
          Video Walkthrough / Frames
        </button>

        <button
          onClick={() => setActiveTab('dom')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'dom'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Code2 className="w-4 h-4" />
          Live DOM / Accessibility HTML
        </button>
      </div>

      {/* Tab Panels */}
      <div className="p-6">
        {canAppendToExisting && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-indigo-100 bg-indigo-50/60 px-4 py-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <input type="checkbox" checked={appendToExisting} onChange={event => {
                setAppendToExisting(event.target.checked);
                setTestCaseText('');
              }} className="rounded text-indigo-600 focus:ring-indigo-500" />
              Add steps to the existing test suite
            </label>
            <span className="text-xs text-slate-600">
              {appendToExisting ? `${currentTestIR.steps.length} steps already in suite · enter only the new steps` : 'Off · replace the current suite with a new test case'}
            </span>
          </div>
        )}
        {activeTab === 'sheet' && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <label className="text-xs font-medium text-slate-700">
                Manual Test Specification / Excel Steps (CSV, Markdown, or text list)
              </label>

              <div className="flex items-center gap-3">
                {/* Voice Dictation Button */}
                <button
                  type="button"
                  onClick={toggleDictation}
                  title={isListening ? 'Click to stop dictation' : 'Click to dictate test steps using microphone'}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    isListening
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-3.5 h-3.5 text-rose-600" />
                      <span className="font-semibold">Listening... (Speak now)</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Dictate with Voice</span>
                    </>
                  )}
                </button>

                {/* Text-to-Speech Read Aloud */}
                {ttsSupported && (
                  <button
                    type="button"
                    onClick={toggleReadAloud}
                    title={isSpeaking ? 'Stop speaking' : 'Read test requirements aloud'}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                      isSpeaking
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {isSpeaking ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5 text-amber-700" />
                        <span>Stop Voice</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-slate-600" />
                        <span>Read Aloud</span>
                      </>
                    )}
                  </button>
                )}

                <label className="cursor-pointer text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" />
                  Upload .csv / .txt
                  <input type="file" accept=".txt,.csv,.md" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>

            {isListening && (
              <div className="mb-2 px-3 py-1.5 bg-rose-50/80 border border-rose-100 rounded-md text-2xs text-rose-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                <span>Microphone active — say your steps (e.g., <em>"User navigates to products, adds item to cart, clicks checkout"</em>)</span>
              </div>
            )}

            <textarea
              rows={9}
              value={testCaseText}
              onChange={(e) => setTestCaseText(e.target.value)}
              placeholder="Paste test steps here or click 'Dictate with Voice' to speak..."
              className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
            />
          </div>
        )}

        {activeTab === 'screenshot' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-indigo-300 transition-colors bg-slate-50/50">
              {screenshotData ? (
                <div className="space-y-3">
                  <div className="max-h-56 overflow-hidden rounded-lg border border-slate-200 inline-block shadow-xs">
                    <img src={screenshotData} alt="Uploaded Mockup" className="max-h-56 object-contain" />
                  </div>
                  <div className="text-xs text-slate-600">
                    Loaded: <span className="font-medium text-slate-800">{screenshotName}</span>
                  </div>
                  <button
                    onClick={() => { setScreenshotData(null); setScreenshotName(''); }}
                    className="text-xs text-rose-600 hover:underline font-medium"
                  >
                    Remove image
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center justify-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-medium text-slate-700">Click to upload UI Screenshot or wireframe</div>
                  <div className="text-2xs text-slate-400">PNG, JPG, WebP up to 10MB</div>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Accompanying Test Instructions (Optional)
              </label>
              <textarea
                rows={3}
                value={testCaseText}
                onChange={(e) => setTestCaseText(e.target.value)}
                placeholder="Describe what flow the screenshot depicts (e.g. User fills billing form and clicks place order)..."
                className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {activeTab === 'video' && (
          <div className="space-y-3">
            <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-6 text-center">
              {videoFile ? (
                <div className="space-y-3">
                  {videoPreviewUrl && <video className="mx-auto max-h-64 max-w-full rounded-lg bg-black" controls src={videoPreviewUrl} />}
                  <div className="text-sm font-medium text-slate-800">{videoFile.name}</div>
                  <div className="text-xs text-slate-500">{(videoFile.size / (1024 * 1024)).toFixed(1)} MB · video and spoken audio will be analyzed</div>
                  <button type="button" onClick={() => { setVideoFile(null); if (videoInputRef.current) videoInputRef.current.value = ''; }} className="text-xs font-medium text-rose-700 hover:underline">Remove video</button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Video className="mx-auto h-10 w-10 text-indigo-600" />
                  <div><p className="text-sm font-semibold text-slate-800">Upload a test walkthrough</p><p className="mt-1 text-xs text-slate-500">The AI reads visible interactions and listens for spoken test instructions.</p></div>
                  <button type="button" onClick={() => videoInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"><Upload className="h-4 w-4" />Choose video</button>
                  <input ref={videoInputRef} type="file" accept="video/mp4,video/mpeg,video/mov,video/avi,video/x-flv,video/mpg,video/webm,video/wmv,video/3gpp,.mp4,.mpeg,.mov,.avi,.flv,.mpg,.webm,.wmv,.3gp" onChange={handleVideoSelected} className="hidden" />
                  <p className="text-2xs text-slate-400">MP4, MOV, WebM, AVI, MPEG, WMV or 3GP · maximum 2 GB. Hosting upload limits may be lower.</p>
                </div>
              )}
            </div>
            <label htmlFor="video-instructions" className="block text-xs font-medium text-slate-700">Additional instructions (optional)</label>
            <textarea
              id="video-instructions"
              rows={8}
              value={videoNotes}
              onChange={(e) => setVideoNotes(e.target.value)}
              placeholder="Optional: tell the analyzer what scenario to focus on or clarify any actions spoken in the recording."
              className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
            />
            <p className="text-2xs text-slate-500">The recording is sent to Gemini for analysis. Avoid recordings containing real passwords, payment details, or private customer data.</p>
            {videoProgress && <p role="status" aria-live="polite" className="text-sm font-medium text-indigo-700">{videoProgress}</p>}
          </div>
        )}

        {activeTab === 'dom' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700">
                Application HTML / Accessibility DOM Snapshot
              </label>
              <span className="text-2xs text-slate-400">Inspected DOM snippet with attributes</span>
            </div>
            <textarea
              rows={8}
              value={domSnippet}
              onChange={(e) => setDomSnippet(e.target.value)}
              placeholder="<form>...</form>"
              className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
            />
            <p className="text-2xs text-slate-500">
              Extracts data-testids, roles, labels, and hierarchical XPath candidates directly from the application markup.
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold">Processing Error: </span>
              {errorMessage}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Normalized into Canonical Test IR with fallback locator engine
          </div>

          <button
            onClick={handleGenerateIR}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg text-xs font-medium transition-all shadow-xs"
          >
            {isLoading ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                Analyzing Multi-Modal Input...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Synthesize Test IR & Generate Code
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
