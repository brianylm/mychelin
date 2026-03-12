"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/Toast";

interface LiveTranscription {
  id: string;
  speaker: "giver" | "recipient" | "unknown";
  original: string;
  translated?: string;
  timestamp: number;
  confidence: number;
  processing?: boolean;
}

interface RecipeContext {
  dishName?: string;
  ingredients: string[];
  steps: string[];
  missingInfo: string[];
}

interface SpeakerProfile {
  id: string;
  name: string;
  language: string;
  voiceCharacteristics?: {
    pitch: number;
    rate: number;
    timbre: string;
  };
}

export default function LiveRecipeConversationPage() {
  const router = useRouter();
  const [isLive, setIsLive] = useState(false);
  const [transcriptions, setTranscriptions] = useState<LiveTranscription[]>([]);
  const [currentTranscription, setCurrentTranscription] = useState<string>("");
  const [currentSpeaker, setCurrentSpeaker] = useState<"giver" | "recipient" | "unknown">("unknown");
  const [recipeContext, setRecipeContext] = useState<RecipeContext>({
    ingredients: [],
    steps: [],
    missingInfo: [],
  });
  
  const [participants, setParticipants] = useState<{
    giver: SpeakerProfile;
    recipient: SpeakerProfile;
  }>({
    giver: { id: "giver", name: "Family Member", language: "Dialect" },
    recipient: { id: "recipient", name: "You", language: "English" },
  });
  
  const [detectedDialect, setDetectedDialect] = useState<string>("");
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [silenceTimer, setSilenceTimer] = useState<number>(0);
  
  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false,
    message: "",
    type: "success",
  });

  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const processingQueueRef = useRef<string[]>([]);
  const isProcessingRef = useRef<boolean>(false);

  const hideToast = useCallback(() => setToast((t) => ({ ...t, show: false })), []);

  // Initialize continuous speech recognition
  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "auto"; // Auto-detect language
      recognition.maxAlternatives = 1;
      
      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        let interimTranscript = "";
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Update current transcription
        setCurrentTranscription(interimTranscript);
        
        // Process final transcript
        if (finalTranscript) {
          processFinalTranscript(finalTranscript, event.results[event.resultIndex][0].confidence);
          setCurrentTranscription(""); // Clear interim
          resetSilenceTimer();
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "no-speech") {
          startSilenceTimer();
        }
      };

      recognition.onend = () => {
        if (isLive) {
          // Restart recognition if we're still live
          setTimeout(() => {
            if (recognitionRef.current && isLive) {
              recognitionRef.current.start();
            }
          }, 100);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [isLive]);

  // Speaker identification (simplified - could use voice biometrics)
  const identifySpeaker = (text: string, confidence: number): "giver" | "recipient" | "unknown" => {
    // Simple heuristic - could be enhanced with actual voice recognition
    const dialectWords = ["lah", "lor", "meh", "sia", "炒", "煮", "切"];
    const englishIndicators = ["please", "how much", "what", "when", "why"];
    
    const hasDialect = dialectWords.some(word => text.toLowerCase().includes(word));
    const hasEnglish = englishIndicators.some(word => text.toLowerCase().includes(word));
    
    if (hasDialect && !hasEnglish) return "giver";
    if (hasEnglish && !hasDialect) return "recipient";
    if (confidence > 0.8 && text.length > 10) {
      // Use previous speaker pattern or default to giver for longer utterances
      return transcriptions.length > 0 ? transcriptions[transcriptions.length - 1].speaker : "giver";
    }
    return "unknown";
  };

  const processFinalTranscript = async (text: string, confidence: number) => {
    if (text.trim().length < 3) return; // Ignore very short utterances
    
    const speaker = identifySpeaker(text, confidence);
    setCurrentSpeaker(speaker);
    
    const transcription: LiveTranscription = {
      id: crypto.randomUUID(),
      speaker,
      original: text.trim(),
      timestamp: Date.now(),
      confidence,
      processing: true,
    };
    
    setTranscriptions(prev => [...prev, transcription]);
    
    // Add to processing queue
    processingQueueRef.current.push(transcription.id);
    processTranslationQueue();
  };

  const processTranslationQueue = async () => {
    if (isProcessingRef.current || processingQueueRef.current.length === 0) return;
    
    isProcessingRef.current = true;
    const transcriptionId = processingQueueRef.current.shift()!;
    
    const transcription = transcriptions.find(t => t.id === transcriptionId);
    if (!transcription) {
      isProcessingRef.current = false;
      return;
    }
    
    try {
      // Detect dialect on first few utterances
      if (transcriptions.filter(t => t.speaker === "giver").length <= 3) {
        await detectDialect(transcription.original);
      }
      
      const response = await fetch("/api/conversation-translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: transcription.original,
          speaker: transcription.speaker,
          context: {
            participants,
            topic: "Family recipe sharing",
            conversationHistory: transcriptions.slice(-10), // Last 10 for context
            detectedDialect,
            recipeContext,
          },
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update transcription with translation
        setTranscriptions(prev =>
          prev.map(t =>
            t.id === transcriptionId
              ? { ...t, translated: result.translation, processing: false }
              : t
          )
        );

        // Update recipe context
        if (result.contextUpdate) {
          setRecipeContext(prev => ({
            dishName: result.contextUpdate.dishName || prev.dishName,
            ingredients: [...new Set([...prev.ingredients, ...(result.contextUpdate.newIngredients || [])])],
            steps: [...prev.steps, ...(result.contextUpdate.newSteps || [])],
            missingInfo: result.contextUpdate.missingInfo || prev.missingInfo,
          }));
        }
      } else {
        // Mark as failed
        setTranscriptions(prev =>
          prev.map(t =>
            t.id === transcriptionId ? { ...t, processing: false } : t
          )
        );
      }
    } catch (error) {
      console.error("Translation error:", error);
      setTranscriptions(prev =>
        prev.map(t =>
          t.id === transcriptionId ? { ...t, processing: false } : t
        )
      );
    } finally {
      isProcessingRef.current = false;
      // Process next in queue
      setTimeout(processTranslationQueue, 100);
    }
  };

  const detectDialect = async (text: string) => {
    try {
      const response = await fetch("/api/conversation-translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "detect-dialect",
          text,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.dialect && result.confidence !== "low") {
          setDetectedDialect(result.dialect);
        }
      }
    } catch (error) {
      console.error("Dialect detection failed:", error);
    }
  };

  const startSilenceTimer = () => {
    setSilenceTimer(0);
    if (silenceTimeoutRef.current) {
      clearInterval(silenceTimeoutRef.current);
    }
    
    silenceTimeoutRef.current = setInterval(() => {
      setSilenceTimer(prev => {
        const newTimer = prev + 1;
        
        // Show prompts after 3 seconds of silence
        if (newTimer === 3) {
          getSuggestedPrompts();
        }
        
        return newTimer;
      });
    }, 1000);
  };

  const resetSilenceTimer = () => {
    setSilenceTimer(0);
    setSuggestedPrompts([]);
    if (silenceTimeoutRef.current) {
      clearInterval(silenceTimeoutRef.current);
    }
  };

  const getSuggestedPrompts = async () => {
    try {
      const response = await fetch("/api/conversation-translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "suggest-prompts",
          context: {
            participants,
            conversationHistory: transcriptions,
            recipeContext,
            detectedDialect,
          },
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSuggestedPrompts(result.prompts?.map((p: any) => p.text) || []);
      }
    } catch (error) {
      console.error("Failed to get prompts:", error);
    }
  };

  const startLiveConversation = () => {
    if (!recognitionRef.current) {
      setToast({ 
        show: true, 
        message: "Speech recognition not supported in this browser.", 
        type: "error" 
      });
      return;
    }
    
    setIsLive(true);
    setTranscriptions([]);
    setRecipeContext({ ingredients: [], steps: [], missingInfo: [] });
    recognitionRef.current.start();
    setToast({ 
      show: true, 
      message: "🎙️ Live conversation started! Start talking...", 
      type: "success" 
    });
  };

  const stopLiveConversation = () => {
    setIsLive(false);
    resetSilenceTimer();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setToast({ 
      show: true, 
      message: "📴 Live conversation stopped.", 
      type: "success" 
    });
  };

  const saveRecipe = async () => {
    if (recipeContext.ingredients.length === 0 && recipeContext.steps.length === 0) {
      setToast({ show: true, message: "Need more recipe information before saving.", type: "error" });
      return;
    }

    const recipeData = {
      title: recipeContext.dishName || "Live Conversation Recipe",
      description: `Captured through live conversation between ${participants.giver.name} and ${participants.recipient.name}`,
      story: `This recipe was captured during a live conversation on ${new Date().toLocaleDateString()}. Language: ${detectedDialect || participants.giver.language}`,
      familyMember: participants.giver.name,
      origin: `Live AI-facilitated conversation`,
      ingredients: recipeContext.ingredients.map((name, i) => ({
        name,
        amount: "",
        unit: "",
        notes: "Amount from conversation - may need clarification",
      })),
      instructions: recipeContext.steps.map((text, i) => ({
        step: i + 1,
        text,
      })),
    };

    try {
      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recipeData),
      });

      if (response.ok) {
        const result = await response.json();
        setToast({ show: true, message: "Recipe captured from live conversation! 🎉", type: "success" });
        setTimeout(() => router.push(`/recipes/${result.id}`), 1500);
      }
    } catch (error) {
      setToast({ show: true, message: "Failed to save recipe. Please try again.", type: "error" });
    }
  };

  const hasWebSpeech = typeof window !== "undefined" && "webkitSpeechRecognition" in window;

  return (
    <div className="max-w-6xl mx-auto">
      <Toast message={toast.message} type={toast.type} show={toast.show} onClose={hideToast} />
      
      <h1 className="text-3xl font-bold text-amber-900 mb-2">🎙️ Live Recipe Conversation</h1>
      <p className="text-amber-600 mb-6 text-lg">
        Real-time AI conversation with automatic speaker detection and live translation
      </p>

      {/* Participant Setup */}
      {!isLive && transcriptions.length === 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-amber-200 mb-6">
          <h3 className="text-lg font-semibold text-amber-900 mb-4">👥 Conversation Participants</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-amber-800 mb-2">Recipe Giver</label>
              <input
                type="text"
                value={participants.giver.name}
                onChange={(e) => setParticipants(p => ({ ...p, giver: { ...p.giver, name: e.target.value } }))}
                placeholder="e.g., Grandma, Ah Ma, Mom"
                className="w-full px-4 py-3 border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500"
              />
              <input
                type="text"
                value={participants.giver.language}
                onChange={(e) => setParticipants(p => ({ ...p, giver: { ...p.giver, language: e.target.value } }))}
                placeholder="e.g., Hokkien, Cantonese, Bahasa"
                className="w-full mt-2 px-4 py-3 border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-amber-800 mb-2">Recipe Learner</label>
              <input
                type="text"
                value={participants.recipient.name}
                onChange={(e) => setParticipants(p => ({ ...p, recipient: { ...p.recipient, name: e.target.value } }))}
                placeholder="e.g., You, Family member name"
                className="w-full px-4 py-3 border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500"
              />
              <input
                type="text"
                value={participants.recipient.language}
                onChange={(e) => setParticipants(p => ({ ...p, recipient: { ...p.recipient, language: e.target.value } }))}
                placeholder="e.g., English, Mandarin"
                className="w-full mt-2 px-4 py-3 border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
          
          <div className="text-center">
            {hasWebSpeech ? (
              <button
                onClick={startLiveConversation}
                className="px-8 py-4 bg-red-600 text-white rounded-2xl text-2xl font-bold hover:bg-red-700 transition-all transform hover:scale-105"
              >
                🎙️ START LIVE CONVERSATION
              </button>
            ) : (
              <div className="text-red-600 text-lg">
                ⚠️ Speech recognition not supported in this browser
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Conversation Display */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live Status */}
          {isLive && (
            <div className="bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
                  <div>
                    <h3 className="text-2xl font-bold">🔴 LIVE</h3>
                    <p className="text-red-100">AI is listening and translating in real-time</p>
                  </div>
                </div>
                <button
                  onClick={stopLiveConversation}
                  className="px-6 py-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-xl font-semibold transition-colors"
                >
                  📴 Stop
                </button>
              </div>
              
              {detectedDialect && (
                <div className="mt-4 p-3 bg-white bg-opacity-20 rounded-xl">
                  <span className="font-medium">🌐 Detected Language: {detectedDialect}</span>
                </div>
              )}
              
              {currentTranscription && (
                <div className="mt-4 p-3 bg-white bg-opacity-20 rounded-xl">
                  <span className="text-red-100">Currently hearing: </span>
                  <span className="font-medium">{currentTranscription}</span>
                </div>
              )}
              
              {currentSpeaker !== "unknown" && (
                <div className="mt-2 text-red-100">
                  🗣️ {currentSpeaker === "giver" ? participants.giver.name : participants.recipient.name} is speaking
                </div>
              )}
            </div>
          )}

          {/* Silence Prompts */}
          {silenceTimer > 2 && suggestedPrompts.length > 0 && (
            <div className="bg-purple-50 rounded-2xl p-6 border border-purple-200 animate-fade-in">
              <h4 className="font-semibold text-purple-800 mb-3">
                💡 {silenceTimer}s of silence... You could ask:
              </h4>
              <div className="space-y-2">
                {suggestedPrompts.slice(0, 3).map((prompt, index) => (
                  <div key={index} className="p-3 bg-white border border-purple-200 rounded-xl text-purple-700">
                    "{prompt}"
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live Transcription Feed */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-amber-200">
            <h3 className="text-lg font-semibold text-amber-900 mb-4">💬 Live Conversation Feed</h3>
            
            {transcriptions.length === 0 && !isLive ? (
              <div className="text-center py-8 text-amber-600">
                <div className="text-4xl mb-3">🎙️</div>
                <p>Start the live conversation to see real-time transcription and translation</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {transcriptions.slice(-10).map((transcription) => (
                  <div
                    key={transcription.id}
                    className={`p-4 rounded-xl ${
                      transcription.speaker === "giver"
                        ? "bg-blue-50 border-l-4 border-blue-400"
                        : transcription.speaker === "recipient"
                        ? "bg-green-50 border-l-4 border-green-400"
                        : "bg-gray-50 border-l-4 border-gray-400"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                      <span>
                        {transcription.speaker === "giver" ? `👵 ${participants.giver.name}` : 
                         transcription.speaker === "recipient" ? `👨‍🍳 ${participants.recipient.name}` : 
                         "🤷 Unknown Speaker"}
                      </span>
                      <span>
                        {new Date(transcription.timestamp).toLocaleTimeString()} 
                        {transcription.confidence && ` • ${Math.round(transcription.confidence * 100)}%`}
                      </span>
                    </div>
                    <div className="font-medium text-gray-800 mb-1">{transcription.original}</div>
                    {transcription.processing ? (
                      <div className="text-purple-600 italic">🤖 AI translating...</div>
                    ) : transcription.translated ? (
                      <div className="text-gray-600 italic border-t border-gray-200 pt-2 mt-2">
                        → {transcription.translated}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recipe Building Panel */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-amber-200">
            <h3 className="text-lg font-semibold text-amber-900 mb-4">📖 Recipe Building Live</h3>
            
            {recipeContext.dishName && (
              <div className="mb-4">
                <h4 className="font-bold text-xl text-amber-900">{recipeContext.dishName}</h4>
              </div>
            )}

            {recipeContext.ingredients.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-amber-800 mb-2">🥬 Ingredients:</h4>
                <ul className="space-y-1">
                  {recipeContext.ingredients.map((ingredient, i) => (
                    <li key={i} className="text-sm text-amber-900">• {ingredient}</li>
                  ))}
                </ul>
              </div>
            )}

            {recipeContext.steps.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-amber-800 mb-2">📋 Steps:</h4>
                <ol className="space-y-1">
                  {recipeContext.steps.map((step, i) => (
                    <li key={i} className="text-sm text-amber-900">{i + 1}. {step}</li>
                  ))}
                </ol>
              </div>
            )}

            {recipeContext.missingInfo.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-red-700 mb-2">❓ Still Need:</h4>
                <ul className="space-y-1">
                  {recipeContext.missingInfo.map((info, i) => (
                    <li key={i} className="text-sm text-red-600">• {info}</li>
                  ))}
                </ul>
              </div>
            )}

            {(recipeContext.ingredients.length > 0 || recipeContext.steps.length > 0) && (
              <button
                onClick={saveRecipe}
                className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors"
              >
                💾 Save Recipe from Live Conversation
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}