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
import { PRESET_TEST_SHEETS } from '../data/sampleData';

interface InputStudioProps {
  onIRGenerated: (ir: TestIR) => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
}

export const InputStudio: React.FC<InputStudioProps> = ({ onIRGenerated, isLoading, setIsLoading }) => {
  const [activeTab, setActiveTab] = useState<'sheet' | 'screenshot' | 'video' | 'dom'>('sheet');
  const [testCaseText, setTestCaseText] = useState(PRESET_TEST_SHEETS[0].stepsText);
  const [featureName, setFeatureName] = useState(PRESET_TEST_SHEETS[0].feature);
  const [baseUrl, setBaseUrl] = useState(PRESET_TEST_SHEETS[0].baseUrl);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [domSnippet, setDomSnippet] = useState(
`<form id="checkout-form" class="space-y-4">
  <div class="field-wrap">
    <label for="shipping-address">Shipping Address</label>
    <input id="shipping-address" name="address" data-testid="address-input" placeholder="Street Address" />
  </div>
  <div class="field-wrap">
    <label for="cc-num">Card Number</label>
    <input id="cc-num" name="card_number" data-testid="cc-input" placeholder="XXXX XXXX XXXX XXXX" />
  </div>
  <button type="submit" data-testid="submit-order-btn" class="btn btn-primary">
    Place Order
  </button>
</form>`
  );

  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState<string>('');
  const [videoNotes, setVideoNotes] = useState(
`Walkthrough recorded at 60fps (checkout_flow_v1.mp4):
00:00.0 - Browser opens to /products
00:02.1 - User clicks first item card 'Wireless Headphones'
00:04.5 - User clicks 'Add to Cart' button
00:06.8 - Cart drawer slides in from right; user clicks 'Proceed to Checkout'
00:10.2 - User inputs street address
00:13.4 - User enters payment info and clicks 'Place Order'
00:16.0 - Confirmation toast shows 'Order # confirmed!'`
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const handlePresetSelect = (preset: typeof PRESET_TEST_SHEETS[0]) => {
    setTestCaseText(preset.stepsText);
    setFeatureName(preset.feature);
    setBaseUrl(preset.baseUrl);
  };

  const handleGenerateIR = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      let textContent = '';
      if (activeTab === 'sheet') textContent = testCaseText;
      else if (activeTab === 'video') textContent = videoNotes;
      else if (activeTab === 'dom') textContent = `Synthesize test case from DOM structure:\n${domSnippet}`;
      else textContent = testCaseText || 'Synthesize test from uploaded UI mockup';

      const response = await fetch('/api/analyze-input', {
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

      onIRGenerated(data.testIR);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'An unexpected error occurred while analyzing the input.');
    } finally {
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

        {/* Preset Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-lg">
          <span className="text-2xs text-slate-500 font-semibold px-2 uppercase tracking-wider">Presets:</span>
          {PRESET_TEST_SHEETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => handlePresetSelect(preset)}
              className="text-xs px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-800 rounded-md transition-all shadow-2xs font-medium border border-slate-200/60"
            >
              {preset.name.split(':')[0]}
            </button>
          ))}
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
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700">
                Keyframe / Timeline Action Log (OCR & Interaction Sequence)
              </label>
              <span className="text-2xs text-slate-400">Time-indexed step breakdown</span>
            </div>
            <textarea
              rows={8}
              value={videoNotes}
              onChange={(e) => setVideoNotes(e.target.value)}
              className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
            />
            <p className="text-2xs text-slate-500">
              The AI parses timestamp intervals, detected gestures, click actions, and on-screen transitions into canonical Test IR steps.
            </p>
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
