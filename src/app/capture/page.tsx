"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/Toast";

interface ConversationMessage {
  id: string;
  speaker: "giver" | "recipient";
  original: string;
  translated?: string;
  timestamp: number;
  processing?: boolean;
}

interface RecipeContext {
  dishName?: string;
  ingredients: string[];
  steps: string[];
  missingInfo: string[];
}

interface ConversationPrompt {
  type: "clarifying" | "encouraging" | "cultural" | "fallback";
  text: string;
}

export default function LiveRecipeCapturePage() {
  const router = useRouter();
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [recipeContext, setRecipeContext] = useState<RecipeContext>({
    ingredients: [],
    steps: [],
    missingInfo: [],
  });
  const [currentSpeaker, setCurrentSpeaker] = useState<"giver" | "recipient">("giver");
  const [isListening, setIsListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [currentInput, setCurrentInput] = useState("");
  const [detectedDialect, setDetectedDialect] = useState<string>("");
  const [conversationPrompts, setConversationPrompts] = useState<ConversationPrompt[]>([]);
  const [showPrompts, setShowPrompts] = useState(false);
  const [participants, setParticipants] = useState({
    giver: { name: "Family Member", language: "Dialect" },
    recipient: { name: "You", language: "English" },
  });
  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false,
    message: "",
    type: "success",
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const promptTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const hideToast = useCallback(() => setToast((t) => ({ ...t, show: false })), []);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = currentSpeaker === "giver" ? "zh-CN" : "en-US"; // Default languages
      
      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setCurrentInput(text);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
        setToast({ show: true, message: "Speech recognition failed. Try typing instead.", type: "error" });
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [currentSpeaker]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      setCurrentInput("");
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Show prompts during processing delays
  useEffect(() => {
    if (processing) {
      setShowPrompts(false);
      promptTimeoutRef.current = setTimeout(async () => {
        try {
          const response = await fetch("/api/conversation-translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "suggest-prompts",
              context: {
                participants,
                conversationHistory: conversation,
                recipeContext,
                detectedDialect,
              },
            }),
          });

          if (response.ok) {
            const result = await response.json();
            setConversationPrompts(result.prompts || []);
            setShowPrompts(true);
          }
        } catch (error) {
          console.error("Failed to get prompts:", error);
        }
      }, 2000); // Show prompts after 2 seconds of processing

      return () => {
        if (promptTimeoutRef.current) {
          clearTimeout(promptTimeoutRef.current);
        }
      };
    } else {
      setShowPrompts(false);
      if (promptTimeoutRef.current) {
        clearTimeout(promptTimeoutRef.current);
      }
    }
  }, [processing, conversation, recipeContext, detectedDialect, participants]);

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

  const addMessage = async () => {
    if (!currentInput.trim()) return;

    const newMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      speaker: currentSpeaker,
      original: currentInput.trim(),
      timestamp: Date.now(),
      processing: true,
    };

    setConversation((prev) => [...prev, newMessage]);
    setCurrentInput("");
    setProcessing(true);

    // Detect dialect for first few messages from giver
    if (currentSpeaker === "giver" && conversation.filter(m => m.speaker === "giver").length < 3) {
      await detectDialect(currentInput.trim());
    }

    try {
      const response = await fetch("/api/conversation-translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: currentInput.trim(),
          speaker: currentSpeaker,
          context: {
            participants,
            topic: "Family recipe sharing",
            conversationHistory: conversation,
            detectedDialect,
            recipeContext,
          },
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update message with translation
        setConversation((prev) =>
          prev.map((msg) =>
            msg.id === newMessage.id
              ? { ...msg, translated: result.translation, processing: false }
              : msg
          )
        );

        // Update recipe context
        if (result.contextUpdate) {
          setRecipeContext((prev) => ({
            dishName: result.contextUpdate.dishName || prev.dishName,
            ingredients: [...new Set([...prev.ingredients, ...(result.contextUpdate.newIngredients || [])])],
            steps: [...prev.steps, ...(result.contextUpdate.newSteps || [])],
            missingInfo: result.contextUpdate.missingInfo || prev.missingInfo,
          }));
        }
      } else {
        // Remove processing message if failed
        setConversation((prev) => prev.filter((msg) => msg.id !== newMessage.id));
        setToast({ show: true, message: "Translation failed. Please try again.", type: "error" });
      }
    } catch (error) {
      setConversation((prev) => prev.filter((msg) => msg.id !== newMessage.id));
      setToast({ show: true, message: "Translation failed. Please try again.", type: "error" });
    } finally {
      setProcessing(false);
    }
  };

  const usePrompt = (prompt: ConversationPrompt) => {
    setCurrentInput(prompt.text);
    setShowPrompts(false);
  };

  const switchSpeaker = () => {
    setCurrentSpeaker(current => current === "giver" ? "recipient" : "giver");
    setCurrentInput("");
  };

  const saveRecipe = async () => {
    if (recipeContext.ingredients.length === 0 && recipeContext.steps.length === 0) {
      setToast({ show: true, message: "Need more recipe information before saving.", type: "error" });
      return;
    }

    const recipeData = {
      title: recipeContext.dishName || "Family Recipe from Conversation",
      description: `Captured through live conversation with ${participants.giver.name}`,
      story: `This recipe was shared during a live conversation on ${new Date().toLocaleDateString()}. Original language: ${detectedDialect || participants.giver.language}`,
      familyMember: participants.giver.name,
      origin: `Live conversation capture`,
      ingredients: recipeContext.ingredients.map((name, i) => ({
        name,
        amount: "",
        unit: "",
        notes: "Amount needs clarification",
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
        setToast({ show: true, message: "Recipe captured successfully! 🎉", type: "success" });
        setTimeout(() => router.push(`/recipes/${result.id}`), 1500);
      } else {
        setToast({ show: true, message: "Failed to save recipe. Please try again.", type: "error" });
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
        AI-assisted live conversation between recipe giver and learner with real-time translation
      </p>

      {/* Participant Setup */}
      {conversation.length === 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-amber-200 mb-6">
          <h3 className="text-lg font-semibold text-amber-900 mb-4">👥 Conversation Participants</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Conversation */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Speaker & Input */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-amber-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-amber-900">
                🎤 {currentSpeaker === "giver" ? participants.giver.name : participants.recipient.name} is speaking...
              </h3>
              <button
                onClick={switchSpeaker}
                className="px-4 py-2 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700"
              >
                Switch to {currentSpeaker === "giver" ? participants.recipient.name : participants.giver.name}
              </button>
            </div>

            {detectedDialect && (
              <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-200">
                <span className="text-blue-700 font-medium">🌐 Detected: {detectedDialect}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex gap-3">
                <textarea
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  placeholder={`What is ${currentSpeaker === "giver" ? participants.giver.name : participants.recipient.name} saying?`}
                  rows={3}
                  className="flex-1 px-4 py-3 border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 resize-none"
                />
                {hasWebSpeech && (
                  <button
                    onClick={isListening ? stopListening : startListening}
                    disabled={processing}
                    className={`px-4 py-3 rounded-xl font-semibold ${
                      isListening 
                        ? "bg-red-600 text-white hover:bg-red-700" 
                        : "bg-green-600 text-white hover:bg-green-700"
                    } disabled:bg-gray-400`}
                  >
                    {isListening ? "🔴 Stop" : "🎤 Voice"}
                  </button>
                )}
              </div>
              
              <button
                onClick={addMessage}
                disabled={!currentInput.trim() || processing}
                className="w-full bg-amber-600 text-white py-3 rounded-xl text-lg font-semibold hover:bg-amber-700 disabled:bg-amber-400"
              >
                {processing ? "🤖 Translating..." : "💬 Add to Conversation"}
              </button>
            </div>
          </div>

          {/* Conversation Prompts (during delays) */}
          {showPrompts && conversationPrompts.length > 0 && (
            <div className="bg-purple-50 rounded-2xl p-6 border border-purple-200">
              <h4 className="font-semibold text-purple-800 mb-3">💡 While waiting, you could say:</h4>
              <div className="space-y-2">
                {conversationPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => usePrompt(prompt)}
                    className="w-full text-left p-3 bg-white hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors"
                  >
                    <span className="text-xs text-purple-500 uppercase font-medium">{prompt.type}</span>
                    <div className="text-purple-700">{prompt.text}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversation History */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-amber-200">
            <h3 className="text-lg font-semibold text-amber-900 mb-4">💬 Live Conversation</h3>
            
            {conversation.length === 0 ? (
              <div className="text-center py-8 text-amber-600">
                <div className="text-4xl mb-3">🎙️</div>
                <p>Start the conversation above to see live translation</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {conversation.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-xl ${
                      msg.speaker === "giver"
                        ? "bg-blue-50 border-l-4 border-blue-400"
                        : "bg-green-50 border-l-4 border-green-400"
                    }`}
                  >
                    <div className="text-xs text-gray-500 mb-2">
                      {msg.speaker === "giver" ? `👵 ${participants.giver.name}` : `👨‍🍳 ${participants.recipient.name}`}
                    </div>
                    <div className="font-medium text-gray-800 mb-1">{msg.original}</div>
                    {msg.processing ? (
                      <div className="text-purple-600 italic">🤖 AI is translating...</div>
                    ) : msg.translated ? (
                      <div className="text-gray-600 italic border-t border-gray-200 pt-2 mt-2">
                        → {msg.translated}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recipe Context */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-amber-200">
            <h3 className="text-lg font-semibold text-amber-900 mb-4">📖 Recipe Building</h3>
            
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

            <button
              onClick={saveRecipe}
              disabled={recipeContext.ingredients.length === 0 && recipeContext.steps.length === 0}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 disabled:bg-gray-400 transition-colors"
            >
              💾 Save Recipe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}