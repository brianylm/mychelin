"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/Toast";
import { Sparkles, Mic, MicOff, ArrowLeft, X, ChefHat } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
}

type PageState = "start" | "live" | "saving";

export default function LiveRecipeConversationPage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>("start");
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [showSaveNameForm, setShowSaveNameForm] = useState(false);
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
    giver: { id: "giver", name: "" },
    recipient: { id: "recipient", name: "" },
  });

  const [detectedDialect, setDetectedDialect] = useState<string>("");
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [silenceTimer, setSilenceTimer] = useState<number>(0);
  const [showRecipeSidebar, setShowRecipeSidebar] = useState(false);

  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false,
    message: "",
    type: "success",
  });

  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const processingQueueRef = useRef<string[]>([]);
  const isProcessingRef = useRef<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isLiveRef = useRef<boolean>(false);

  const hideToast = useCallback(() => setToast((t) => ({ ...t, show: false })), []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [transcriptions, currentTranscription]);

  // Speech recognition setup
  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "auto";
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

        setCurrentTranscription(interimTranscript);

        if (finalTranscript) {
          processFinalTranscript(finalTranscript, event.results[event.resultIndex][0].confidence);
          setCurrentTranscription("");
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
        if (isLiveRef.current) {
          setTimeout(() => {
            if (recognitionRef.current && isLiveRef.current) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                // Already started
              }
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
  }, []);

  const giverName = participants.giver.name || "Recipe Giver";
  const learnerName = participants.recipient.name || "You";

  const identifySpeaker = (text: string, confidence: number): "giver" | "recipient" | "unknown" => {
    const dialectWords = ["lah", "lor", "meh", "sia", "炒", "煮", "切"];
    const englishIndicators = ["please", "how much", "what", "when", "why"];

    const hasDialect = dialectWords.some(word => text.toLowerCase().includes(word));
    const hasEnglish = englishIndicators.some(word => text.toLowerCase().includes(word));

    if (hasDialect && !hasEnglish) return "giver";
    if (hasEnglish && !hasDialect) return "recipient";
    if (confidence > 0.8 && text.length > 10) {
      return transcriptions.length > 0 ? transcriptions[transcriptions.length - 1].speaker : "giver";
    }
    return "unknown";
  };

  const processFinalTranscript = async (text: string, confidence: number) => {
    if (text.trim().length < 3) return;

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
            participants: {
              giver: { ...participants.giver, language: detectedDialect || "auto" },
              recipient: { ...participants.recipient, language: "English" },
            },
            topic: "Family recipe sharing",
            conversationHistory: transcriptions.slice(-10),
            detectedDialect,
            recipeContext,
          },
        }),
      });

      if (response.ok) {
        const result = await response.json();

        setTranscriptions(prev =>
          prev.map(t =>
            t.id === transcriptionId
              ? { ...t, translated: result.translation, processing: false }
              : t
          )
        );

        if (result.contextUpdate) {
          setRecipeContext(prev => ({
            dishName: result.contextUpdate.dishName || prev.dishName,
            ingredients: [...new Set([...prev.ingredients, ...(result.contextUpdate.newIngredients || [])])],
            steps: [...prev.steps, ...(result.contextUpdate.newSteps || [])],
            missingInfo: result.contextUpdate.missingInfo || prev.missingInfo,
          }));
        }
      } else {
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

  const handleStartClick = () => {
    if (typeof window !== "undefined" && !("webkitSpeechRecognition" in window)) {
      setToast({
        show: true,
        message: "Speech recognition not supported in this browser. Please use Chrome.",
        type: "error",
      });
      return;
    }
    setShowParticipantModal(true);
  };

  const startConversation = () => {
    if (!recognitionRef.current) return;

    setShowParticipantModal(false);
    setPageState("live");
    isLiveRef.current = true;
    setTranscriptions([]);
    setRecipeContext({ ingredients: [], steps: [], missingInfo: [] });
    recognitionRef.current.start();
    setToast({
      show: true,
      message: "Live conversation started! Start talking...",
      type: "success",
    });
  };

  const stopConversation = () => {
    isLiveRef.current = false;
    setPageState("saving");
    resetSilenceTimer();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (!participants.giver.name && !participants.recipient.name) {
      setShowSaveNameForm(true);
    }
  };

  const saveRecipe = async () => {
    if (recipeContext.ingredients.length === 0 && recipeContext.steps.length === 0) {
      setToast({ show: true, message: "Need more recipe information before saving.", type: "error" });
      return;
    }

    const recipeData = {
      title: recipeContext.dishName || "Live Conversation Recipe",
      description: `Captured through live conversation between ${giverName} and ${learnerName}`,
      story: `This recipe was captured during a live conversation on ${new Date().toLocaleDateString()}.${detectedDialect ? ` Language: ${detectedDialect}` : ""}`,
      familyMember: giverName,
      origin: "Live AI-facilitated conversation",
      ingredients: recipeContext.ingredients.map((name) => ({
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
        setToast({ show: true, message: "Recipe captured from live conversation!", type: "success" });
        setTimeout(() => router.push(`/recipes/${result.id}`), 1500);
      }
    } catch {
      setToast({ show: true, message: "Failed to save recipe. Please try again.", type: "error" });
    }
  };

  // ─── START SCREEN ───
  if (pageState === "start") {
    return (
      <div className="max-w-2xl mx-auto">
        <Toast message={toast.message} type={toast.type} show={toast.show} onClose={hideToast} />

        {/* Participant Modal */}
        <AnimatePresence>
          {showParticipantModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
              onClick={() => setShowParticipantModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-3xl p-8 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-stone-800 font-heading">Who&apos;s sharing the recipe?</h3>
                  <button onClick={() => setShowParticipantModal(false)} className="text-stone-400 hover:text-stone-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-5 mb-8">
                  <div>
                    <label className="block text-sm font-medium text-stone-600 mb-2">Recipe Giver</label>
                    <input
                      type="text"
                      value={participants.giver.name}
                      onChange={(e) => setParticipants(p => ({ ...p, giver: { ...p.giver, name: e.target.value } }))}
                      placeholder='e.g., "Grandma", "Ah Ma", "Mom"'
                      className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta text-stone-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-600 mb-2">Recipe Learner</label>
                    <input
                      type="text"
                      value={participants.recipient.name}
                      onChange={(e) => setParticipants(p => ({ ...p, recipient: { ...p.recipient, name: e.target.value } }))}
                      placeholder='e.g., "You", "Your name"'
                      className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta text-stone-800"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={startConversation}
                    className="w-full py-3.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Mic className="w-5 h-5" /> Start Conversation
                  </button>
                  <button
                    onClick={() => {
                      setParticipants({
                        giver: { id: "giver", name: "" },
                        recipient: { id: "recipient", name: "" },
                      });
                      startConversation();
                    }}
                    className="w-full py-3.5 bg-stone-100 text-stone-600 rounded-xl font-medium hover:bg-stone-200 transition-colors"
                  >
                    Skip — I&apos;ll add this later
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-3 mb-10">
          <button onClick={() => router.push("/recipes")} className="text-stone-400 hover:text-stone-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-3xl font-bold text-stone-900 font-heading">AI Capture</h1>
          <span className="text-[10px] font-bold bg-terracotta text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Beta</span>
        </div>

        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center mb-10">
            <Mic className="w-12 h-12 text-white" />
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-stone-800 font-heading mb-4">
            Capture a Family Recipe
          </h2>
          <p className="text-stone-500 text-lg max-w-md mb-12 leading-relaxed">
            Record a live conversation while cooking together. AI will listen, translate, and extract the recipe in real-time.
          </p>

          <button
            onClick={handleStartClick}
            className="inline-flex items-center gap-3 px-10 py-5 bg-red-600 text-white rounded-2xl text-xl font-bold hover:bg-red-700 transition-colors"
          >
            <Mic className="w-7 h-7" />
            Start Live Conversation
          </button>

          <p className="text-stone-400 text-sm mt-8">
            Works best in Chrome · Language detected automatically
          </p>
        </div>
      </div>
    );
  }

  // ─── LIVE / SAVING SCREEN ───
  return (
    <div className="max-w-6xl mx-auto">
      <Toast message={toast.message} type={toast.type} show={toast.show} onClose={hideToast} />

      {/* Save Name Form Modal */}
      <AnimatePresence>
        {showSaveNameForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md"
            >
              <h3 className="text-xl font-bold text-stone-800 mb-2 font-heading">Who was in the conversation?</h3>
              <p className="text-stone-500 text-sm mb-6">Add names before saving (optional)</p>

              <div className="space-y-5 mb-8">
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-2">Recipe Giver</label>
                  <input
                    type="text"
                    value={participants.giver.name}
                    onChange={(e) => setParticipants(p => ({ ...p, giver: { ...p.giver, name: e.target.value } }))}
                    placeholder='e.g., "Grandma"'
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta text-stone-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-2">Recipe Learner</label>
                  <input
                    type="text"
                    value={participants.recipient.name}
                    onChange={(e) => setParticipants(p => ({ ...p, recipient: { ...p.recipient, name: e.target.value } }))}
                    placeholder='e.g., "You"'
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta text-stone-800"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowSaveNameForm(false)}
                  className="flex-1 py-3.5 bg-stone-100 text-stone-600 rounded-xl font-medium hover:bg-stone-200 transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={() => setShowSaveNameForm(false)}
                  className="flex-1 py-3.5 bg-terracotta text-white rounded-xl font-semibold hover:bg-terracotta-600 transition-colors"
                >
                  Save Names
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chat Area */}
        <div className="lg:col-span-2 flex flex-col h-[calc(100vh-180px)] md:h-[calc(100vh-140px)]">
          {/* Live Banner */}
          {pageState === "live" && (
            <div className="bg-red-600 rounded-t-2xl px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                <span className="text-lg font-bold">LIVE</span>
                {detectedDialect && (
                  <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                    Detected: {detectedDialect}
                  </span>
                )}
              </div>
              <button
                onClick={stopConversation}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl font-semibold text-sm transition-colors"
              >
                <MicOff className="w-4 h-4" /> Stop
              </button>
            </div>
          )}

          {/* Stopped Banner */}
          {pageState === "saving" && (
            <div className="bg-stone-700 rounded-t-2xl px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <MicOff className="w-4 h-4" />
                <span className="text-lg font-bold">Conversation Ended</span>
              </div>
              <button
                onClick={() => {
                  setPageState("live");
                  isLiveRef.current = true;
                  if (recognitionRef.current) recognitionRef.current.start();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl font-semibold text-sm transition-colors"
              >
                <Mic className="w-4 h-4" /> Resume
              </button>
            </div>
          )}

          {/* Chat Messages */}
          <div
            ref={chatContainerRef}
            className={`flex-1 overflow-y-auto bg-stone-100 px-5 py-5 space-y-4 ${
              pageState === "live" ? "" : "rounded-t-2xl"
            }`}
          >
            {transcriptions.length === 0 && (
              <div className="flex items-center justify-center h-full text-stone-400">
                <div className="text-center">
                  <Mic className="w-10 h-10 mx-auto mb-4 text-stone-300" />
                  <p className="text-lg">Listening...</p>
                  <p className="text-sm mt-1">Start talking and messages will appear here</p>
                </div>
              </div>
            )}

            {transcriptions.map((t) => {
              const isGiver = t.speaker === "giver";
              const isRecipient = t.speaker === "recipient";
              return (
                <div
                  key={t.id}
                  className={`flex ${isRecipient ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-5 py-4 ${
                      isGiver
                        ? "bg-blue-500 text-white rounded-tl-sm"
                        : isRecipient
                        ? "bg-emerald-500 text-white rounded-tr-sm"
                        : "bg-white text-stone-800 rounded-tl-sm border border-stone-200"
                    }`}
                  >
                    {/* Speaker label */}
                    <div className={`text-xs font-semibold mb-1.5 ${
                      isGiver || isRecipient ? "text-white/70" : "text-stone-400"
                    }`}>
                      {isGiver ? giverName : isRecipient ? learnerName : "Unknown"}
                    </div>

                    {/* Original text */}
                    <div className="text-[15px] leading-relaxed">{t.original}</div>

                    {/* Translation */}
                    {t.processing ? (
                      <div className={`mt-2.5 pt-2.5 border-t text-sm italic flex items-center gap-1.5 ${
                        isGiver || isRecipient ? "border-white/20 text-white/60" : "border-stone-200 text-stone-400"
                      }`}>
                        <TypingDots /> Translating...
                      </div>
                    ) : t.translated ? (
                      <div className={`mt-2.5 pt-2.5 border-t text-sm italic ${
                        isGiver || isRecipient ? "border-white/20 text-white/70" : "border-stone-200 text-stone-500"
                      }`}>
                        → {t.translated}
                      </div>
                    ) : null}

                    {/* Timestamp */}
                    <div className={`text-[10px] mt-2 text-right ${
                      isGiver || isRecipient ? "text-white/50" : "text-stone-300"
                    }`}>
                      {new Date(t.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Interim/ghost bubble */}
            {currentTranscription && pageState === "live" && (
              <div className="flex justify-start">
                <div className="max-w-[80%] sm:max-w-[70%] rounded-2xl rounded-tl-sm px-5 py-4 bg-white/60 border border-stone-200/50 text-stone-500 italic">
                  <div className="text-xs font-semibold mb-1.5 text-stone-300">
                    {currentSpeaker === "giver" ? giverName : currentSpeaker === "recipient" ? learnerName : "Listening..."}
                  </div>
                  <div className="text-[15px] leading-relaxed">{currentTranscription}</div>
                </div>
              </div>
            )}

            {/* Typing indicator when processing */}
            {pageState === "live" && !currentTranscription && transcriptions.length > 0 && transcriptions[transcriptions.length - 1]?.processing && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl rounded-tl-sm px-5 py-4 border border-stone-200">
                  <TypingDots />
                </div>
              </div>
            )}
          </div>

          {/* Silence Prompts */}
          {silenceTimer > 2 && suggestedPrompts.length > 0 && (
            <div className="bg-stone-50 px-5 py-4 border-t border-stone-200">
              <p className="text-xs font-semibold text-stone-600 mb-2">You could ask:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedPrompts.slice(0, 3).map((prompt, i) => (
                  <span key={i} className="text-xs bg-white border border-stone-200 text-stone-600 px-3 py-1.5 rounded-full">
                    &ldquo;{prompt}&rdquo;
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Actions */}
          {pageState === "saving" && (
            <div className="bg-white rounded-b-2xl border-t border-stone-200 px-6 py-5 flex items-center gap-3 shrink-0">
              <button
                onClick={() => router.push("/recipes")}
                className="px-6 py-3 border border-stone-200 text-stone-600 rounded-xl font-medium hover:bg-stone-50 transition-colors"
              >
                Discard
              </button>
              <button
                onClick={saveRecipe}
                disabled={recipeContext.ingredients.length === 0 && recipeContext.steps.length === 0}
                className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <ChefHat className="w-5 h-5" /> Save Recipe
              </button>
            </div>
          )}

          {pageState === "live" && (
            <div className="bg-white rounded-b-2xl border-t border-stone-200 px-6 py-4 flex items-center justify-between shrink-0">
              <div className="text-sm text-stone-400">
                {transcriptions.length} message{transcriptions.length !== 1 ? "s" : ""} captured
              </div>
              <button
                onClick={() => setShowRecipeSidebar(true)}
                className="lg:hidden text-sm text-terracotta font-medium"
              >
                View Recipe →
              </button>
            </div>
          )}
        </div>

        {/* Recipe Sidebar */}
        <div className={`${pageState === "live" && !showRecipeSidebar ? "hidden lg:block" : ""}`}>
          <div className="bg-white rounded-3xl p-6 border border-stone-200 sticky top-20">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-stone-800 font-heading">Live Recipe</h3>
              <button
                onClick={() => setShowRecipeSidebar(false)}
                className="lg:hidden text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {recipeContext.dishName && (
              <div className="mb-5">
                <h4 className="font-bold text-xl text-stone-800 font-heading">{recipeContext.dishName}</h4>
              </div>
            )}

            {recipeContext.ingredients.length > 0 ? (
              <div className="mb-5">
                <h4 className="font-semibold text-stone-700 mb-3">Ingredients</h4>
                <ul className="space-y-2">
                  {recipeContext.ingredients.map((ingredient, i) => (
                    <li key={i} className="text-sm text-stone-700 flex items-start gap-2 leading-relaxed">
                      <span className="text-stone-300 mt-1">•</span> {ingredient}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-sm text-stone-400 mb-5 italic leading-relaxed">
                Ingredients will appear as the conversation progresses...
              </div>
            )}

            {recipeContext.steps.length > 0 ? (
              <div className="mb-5">
                <h4 className="font-semibold text-stone-700 mb-3">Steps</h4>
                <ol className="space-y-2">
                  {recipeContext.steps.map((step, i) => (
                    <li key={i} className="text-sm text-stone-700 leading-relaxed">
                      <span className="text-stone-400 font-medium">{i + 1}.</span> {step}
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <div className="text-sm text-stone-400 italic leading-relaxed">
                Steps will be extracted automatically...
              </div>
            )}

            {recipeContext.missingInfo.length > 0 && (
              <div className="mb-5">
                <h4 className="font-semibold text-red-700 mb-3">Still Need</h4>
                <ul className="space-y-2">
                  {recipeContext.missingInfo.map((info, i) => (
                    <li key={i} className="text-sm text-red-600 flex items-start gap-2 leading-relaxed">
                      <span>•</span> {info}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {pageState === "saving" && (recipeContext.ingredients.length > 0 || recipeContext.steps.length > 0) && (
              <button
                onClick={saveRecipe}
                className="w-full mt-4 bg-green-600 text-white py-3.5 rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <ChefHat className="w-5 h-5" /> Save Recipe
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Typing Dots Animation ───
function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
      <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
      <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
    </span>
  );
}
