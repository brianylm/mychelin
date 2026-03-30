"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@radix-ui/themes";
import { StopIcon, MagicWandIcon } from "@radix-ui/react-icons";
import { SpeakerSetup } from "./SpeakerSetup";
import { ChatBubble } from "./ChatBubble";
import { RecipeReview } from "./RecipeReview";
import { cn } from "@/lib/utils";

interface ConversationMessage {
  id: string;
  speaker: string;
  text: string;
  language: string;
  timestamp: string;
}

interface ExtractedRecipe {
  title: string;
  description: string;
  ingredients: Array<{
    name: string;
    quantity?: number | null;
    unit?: string | null;
    notes?: string;
  }>;
  instructions: Array<{
    stepNumber: number;
    content: string;
    tip?: string;
  }>;
  yield?: string;
  prepTime?: string;
  cookTime?: string;
  cuisine?: string;
  origin?: string;
  dialect?: string;
  occasion?: string;
  familyMember?: string;
  story?: string;
}

type CaptureState = "setup" | "recording" | "review";

// Web Speech API types
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export function ConversationCapture() {
  const [state, setState] = useState<CaptureState>("setup");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [speakers, setSpeakers] = useState<{speaker1: string; speaker2: string}>({
    speaker1: "",
    speaker2: ""
  });
  const [selectedLanguage, setSelectedLanguage] = useState("auto");
  const [isRecording, setIsRecording] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [extractedRecipe, setExtractedRecipe] = useState<ExtractedRecipe | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check for speech recognition support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognition);
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, interimTranscript]);

  const initializeSpeechRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = selectedLanguage === "auto" ? "en-US" : selectedLanguage;

    let finalTranscript = "";

    recognition.onresult = (event: any) => {
      let interim = "";
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      setInterimTranscript(interim);

      // If we have final results and a current speaker, add to messages
      if (finalTranscript && currentSpeaker) {
        const newMessage: ConversationMessage = {
          id: Date.now().toString(),
          speaker: currentSpeaker,
          text: finalTranscript.trim(),
          language: event.results[event.resultIndex]?.language || 
                   (selectedLanguage === "auto" ? "EN" : selectedLanguage.toUpperCase()),
          timestamp: new Date().toISOString(),
        };

        if (newMessage.text) {
          setMessages(prev => [...prev, newMessage]);
        }
        
        finalTranscript = "";
        setInterimTranscript("");
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
      setCurrentSpeaker(null);
      setInterimTranscript("");
    };

    recognition.onend = () => {
      // If we were recording, restart (unless explicitly stopped)
      if (isRecording && currentSpeaker) {
        setTimeout(() => {
          if (recognitionRef.current && isRecording) {
            recognitionRef.current.start();
          }
        }, 100);
      }
    };

    return recognition;
  }, [selectedLanguage, currentSpeaker, isRecording]);

  const startRecording = (speaker: string) => {
    if (!speechSupported) {
      alert("Speech recognition is not supported in your browser. Please use Chrome or a compatible browser.");
      return;
    }

    setCurrentSpeaker(speaker);
    setIsRecording(true);
    setInterimTranscript("");

    recognitionRef.current = initializeSpeechRecognition();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error("Failed to start speech recognition:", error);
        setIsRecording(false);
        setCurrentSpeaker(null);
      }
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    setCurrentSpeaker(null);
    setInterimTranscript("");
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  const handleSetupComplete = (speaker1: string, speaker2: string, language: string) => {
    setSpeakers({ speaker1, speaker2 });
    setSelectedLanguage(language);
    setState("recording");
  };

  const extractRecipe = async () => {
    if (messages.length === 0) return;

    setIsExtracting(true);
    try {
      const response = await fetch("/api/capture/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation: messages }),
      });

      if (!response.ok) {
        throw new Error("Failed to extract recipe");
      }

      const data = await response.json();
      setExtractedRecipe(data.recipe);
      setState("review");
    } catch (error) {
      console.error("Recipe extraction failed:", error);
      alert("Failed to extract recipe. Please try again.");
    } finally {
      setIsExtracting(false);
    }
  };

  const saveRecipe = async (recipe: ExtractedRecipe) => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: recipe.title,
          description: recipe.description,
          cuisine: recipe.cuisine,
          yield: recipe.yield,
          prepTime: recipe.prepTime,
          cookTime: recipe.cookTime,
          story: recipe.story,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save recipe");
      }

      // Reset to start fresh
      setState("setup");
      setMessages([]);
      setExtractedRecipe(null);
      
      alert("Recipe saved successfully! 🎉");
    } catch (error) {
      console.error("Save recipe failed:", error);
      alert("Failed to save recipe. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const backToChat = () => {
    setState("recording");
    setExtractedRecipe(null);
  };

  if (state === "setup") {
    return <SpeakerSetup onStart={handleSetupComplete} />;
  }

  if (state === "review" && extractedRecipe) {
    return (
      <RecipeReview
        recipe={extractedRecipe}
        onSave={saveRecipe}
        onBack={backToChat}
        isSaving={isSaving}
      />
    );
  }

  // Recording state
  return (
    <div className="h-full flex flex-col bg-neutral-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-neutral-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <span className="font-medium text-neutral-900">
              {speakers.speaker1} & {speakers.speaker2}
            </span>
            <div className="text-xs text-neutral-500">
              {messages.length} messages recorded
            </div>
          </div>
          <Button
            onClick={extractRecipe}
            disabled={messages.length === 0 || isExtracting}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isExtracting ? "Extracting..." : (
              <>
                <MagicWandIcon />
                Extract Recipe
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl mb-4">👥</div>
              <p className="text-neutral-600">
                Tap a speaker below to start recording their voice
              </p>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <ChatBubble
            key={message.id}
            speaker={message.speaker}
            text={message.text}
            language={message.language}
            timestamp={message.timestamp}
            isRight={message.speaker === speakers.speaker2}
          />
        ))}

        {/* Interim result while recording */}
        {interimTranscript && currentSpeaker && (
          <div className={cn(
            "flex w-full mb-4",
            currentSpeaker === speakers.speaker2 ? "justify-end" : "justify-start"
          )}>
            <div className={cn(
              "max-w-[80%] rounded-2xl px-4 py-3 border-2 border-dashed animate-pulse",
              currentSpeaker === speakers.speaker2 
                ? "border-amber-300 bg-amber-50" 
                : "border-neutral-300 bg-neutral-50"
            )}>
              <div className="text-xs font-medium text-neutral-600 mb-1">
                {currentSpeaker} (speaking...)
              </div>
              <p className="text-sm text-neutral-700 italic">{interimTranscript}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Recording Controls */}
      <div className="flex-shrink-0 bg-white border-t border-neutral-200 px-4 py-4 safe-bottom">
        <div className="flex items-center justify-center gap-6">
          {/* Speaker 1 Button */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => 
                isRecording && currentSpeaker === speakers.speaker1 
                  ? stopRecording() 
                  : startRecording(speakers.speaker1)
              }
              disabled={isRecording && currentSpeaker !== speakers.speaker1}
              className={cn(
                "w-16 h-16 rounded-full text-2xl font-bold transition-all duration-200 shadow-lg",
                isRecording && currentSpeaker === speakers.speaker1
                  ? "bg-red-500 text-white animate-pulse scale-110"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 active:scale-95",
                isRecording && currentSpeaker !== speakers.speaker1 && "opacity-50"
              )}
            >
              {isRecording && currentSpeaker === speakers.speaker1 ? <StopIcon /> : "👤"}
            </button>
            <span className="text-xs font-medium text-neutral-600 mt-2">
              {speakers.speaker1}
            </span>
          </div>

          {/* Recording indicator */}
          <div className="flex flex-col items-center">
            {isRecording && (
              <div className="flex items-center gap-2 text-red-500 animate-pulse">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-xs font-medium">Recording</span>
              </div>
            )}
            {!speechSupported && (
              <div className="text-xs text-red-500 max-w-32 text-center">
                Speech recognition not supported
              </div>
            )}
          </div>

          {/* Speaker 2 Button */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => 
                isRecording && currentSpeaker === speakers.speaker2 
                  ? stopRecording() 
                  : startRecording(speakers.speaker2)
              }
              disabled={isRecording && currentSpeaker !== speakers.speaker2}
              className={cn(
                "w-16 h-16 rounded-full text-2xl font-bold transition-all duration-200 shadow-lg",
                isRecording && currentSpeaker === speakers.speaker2
                  ? "bg-red-500 text-white animate-pulse scale-110"
                  : "bg-amber-100 text-amber-700 hover:bg-amber-200 active:scale-95",
                isRecording && currentSpeaker !== speakers.speaker2 && "opacity-50"
              )}
            >
              {isRecording && currentSpeaker === speakers.speaker2 ? <StopIcon /> : "👵"}
            </button>
            <span className="text-xs font-medium text-neutral-600 mt-2">
              {speakers.speaker2}
            </span>
          </div>
        </div>

        <div className="mt-4 text-xs text-center text-neutral-500">
          Tap a person to start recording their voice. Tap again to stop.
        </div>
      </div>
    </div>
  );
}