"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/Toast";

interface ConversationMessage {
  id: string;
  speaker: "giver" | "recipient";
  text: string;
  timestamp: Date;
}

interface ParsedRecipe {
  title?: string;
  description?: string;
  ingredients: Array<{ name: string; amount?: string; unit?: string; notes?: string }>;
  instructions: Array<{ step: number; text: string }>;
  cuisine?: string;
  category?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  difficulty?: "easy" | "medium" | "hard";
  story?: string;
  familyMember?: string;
  origin?: string;
  missingInfo: string[];
  clarifyingQuestions: string[];
  confidence: "low" | "medium" | "high";
}

export default function RecipeCapturePage() {
  const router = useRouter();
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [parsedRecipe, setParsedRecipe] = useState<ParsedRecipe | null>(null);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false,
    message: "",
    type: "success",
  });

  const hideToast = useCallback(() => setToast((t) => ({ ...t, show: false })), []);

  const processRecipe = async () => {
    if (!currentInput.trim()) return;

    // Add to conversation
    const newMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      speaker: "giver",
      text: currentInput.trim(),
      timestamp: new Date(),
    };

    const updatedConversation = [...conversation, newMessage];
    setConversation(updatedConversation);
    setCurrentInput("");
    setProcessing(true);

    try {
      const response = await fetch("/api/ai-recipe-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeText: currentInput.trim(),
          conversationHistory: updatedConversation.map((msg) => ({
            speaker: msg.speaker,
            text: msg.text,
          })),
        }),
      });

      if (response.ok) {
        const result: ParsedRecipe = await response.json();
        setParsedRecipe(result);
      } else {
        setToast({ show: true, message: "Failed to process recipe. Please try again.", type: "error" });
      }
    } catch (error) {
      setToast({ show: true, message: "Failed to process recipe. Please try again.", type: "error" });
    } finally {
      setProcessing(false);
    }
  };

  const askQuestion = (question: string) => {
    setCurrentInput(question);
  };

  const saveRecipe = async () => {
    if (!parsedRecipe) return;

    setSaving(true);
    try {
      const recipeData = {
        title: parsedRecipe.title || "Untitled Family Recipe",
        description: parsedRecipe.description || "",
        story: parsedRecipe.story || "",
        origin: parsedRecipe.origin || "",
        familyMember: parsedRecipe.familyMember || "",
        cuisine: parsedRecipe.cuisine || "",
        category: parsedRecipe.category || "",
        prepTime: parsedRecipe.prepTime || null,
        cookTime: parsedRecipe.cookTime || null,
        servings: parsedRecipe.servings || null,
        difficulty: parsedRecipe.difficulty || null,
        ingredients: parsedRecipe.ingredients.filter((i) => i.name.trim()),
        instructions: parsedRecipe.instructions.filter((i) => i.text.trim()),
      };

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
    } finally {
      setSaving(false);
    }
  };

  const confidenceColor = {
    low: "bg-red-100 text-red-700 border-red-200",
    medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
    high: "bg-green-100 text-green-700 border-green-200",
  };

  const confidenceIcon = {
    low: "⚠️",
    medium: "🟡",
    high: "✅",
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Toast message={toast.message} type={toast.type} show={toast.show} onClose={hideToast} />
      
      <h1 className="text-3xl font-bold text-amber-900 mb-2">🤖 AI Recipe Capture</h1>
      <p className="text-amber-600 mb-8 text-lg">
        Turn family recipe conversations into structured recipes with AI assistance
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-6">
          {/* Conversation History */}
          {conversation.length > 0 && (
            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-amber-200">
              <h3 className="text-lg font-semibold text-amber-900 mb-4">👥 Recipe Conversation</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {conversation.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-xl ${
                      msg.speaker === "giver"
                        ? "bg-blue-50 border-l-4 border-blue-400"
                        : "bg-green-50 border-l-4 border-green-400"
                    }`}
                  >
                    <div className="text-xs text-gray-500 mb-1">
                      {msg.speaker === "giver" ? "👵 Recipe Giver" : "👨‍🍳 You"}
                    </div>
                    <div className="text-gray-800">{msg.text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input Form */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-amber-200">
            <h3 className="text-lg font-semibold text-amber-900 mb-4">
              {conversation.length === 0 ? "📝 Start the Recipe Conversation" : "💬 Continue the Conversation"}
            </h3>
            
            {conversation.length === 0 && (
              <div className="mb-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <h4 className="font-semibold text-amber-800 mb-2">💡 How to use:</h4>
                <ul className="text-sm text-amber-600 space-y-1">
                  <li>• Paste or type what your family member told you about the recipe</li>
                  <li>• The AI will extract ingredients and steps, then suggest clarifying questions</li>
                  <li>• Ask those questions to get more details</li>
                  <li>• Keep adding information until the recipe is complete</li>
                </ul>
              </div>
            )}

            <div className="space-y-3">
              <label className="block text-sm font-medium text-amber-800">
                What did {conversation.length === 0 ? "they say about the recipe" : "they tell you"}?
              </label>
              <textarea
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                placeholder={
                  conversation.length === 0
                    ? 'e.g., "Ah Ma says first you fry the onions until they smell good, then add some soy sauce - not too much! Then put in the chicken..."'
                    : "Add more details from the conversation..."
                }
                rows={4}
                className="w-full px-4 py-3 text-lg border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
              />
              <button
                onClick={processRecipe}
                disabled={!currentInput.trim() || processing}
                className="w-full bg-amber-600 text-white py-3 rounded-xl text-lg font-semibold hover:bg-amber-700 disabled:bg-amber-400 transition-colors"
              >
                {processing ? "🧠 AI is thinking..." : conversation.length === 0 ? "🤖 Capture Recipe" : "🔄 Update Recipe"}
              </button>
            </div>
          </div>
        </div>

        {/* AI Analysis Section */}
        <div className="space-y-6">
          {parsedRecipe && (
            <>
              {/* Confidence & Status */}
              <div className={`rounded-2xl p-4 border ${confidenceColor[parsedRecipe.confidence]}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{confidenceIcon[parsedRecipe.confidence]}</span>
                  <h3 className="font-semibold">
                    Recipe Confidence: {parsedRecipe.confidence.charAt(0).toUpperCase() + parsedRecipe.confidence.slice(1)}
                  </h3>
                </div>
                {parsedRecipe.missingInfo.length > 0 && (
                  <div className="text-sm">
                    <strong>Missing:</strong> {parsedRecipe.missingInfo.join(", ")}
                  </div>
                )}
              </div>

              {/* Clarifying Questions */}
              {parsedRecipe.clarifyingQuestions.length > 0 && (
                <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-amber-200">
                  <h3 className="text-lg font-semibold text-amber-900 mb-4">❓ Suggested Questions to Ask</h3>
                  <div className="space-y-2">
                    {parsedRecipe.clarifyingQuestions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => askQuestion(question)}
                        className="w-full text-left p-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors"
                      >
                        <span className="text-purple-700 font-medium">{question}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Parsed Recipe Preview */}
              <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-amber-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-amber-900">📖 Recipe Preview</h3>
                  <button
                    onClick={saveRecipe}
                    disabled={saving || parsedRecipe.confidence === "low"}
                    className="px-4 py-2 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                  >
                    {saving ? "Saving..." : "💾 Save Recipe"}
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-xl text-amber-900">{parsedRecipe.title || "Untitled Recipe"}</h4>
                    {parsedRecipe.description && <p className="text-amber-600 mt-1">{parsedRecipe.description}</p>}
                  </div>

                  {parsedRecipe.familyMember && (
                    <div className="text-sm text-amber-600">
                      👨👩👧 From: {parsedRecipe.familyMember}
                    </div>
                  )}

                  {parsedRecipe.ingredients.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-amber-800 mb-2">🥬 Ingredients:</h4>
                      <ul className="space-y-1">
                        {parsedRecipe.ingredients.map((ing, i) => (
                          <li key={i} className="text-sm">
                            <span className={ing.amount ? "text-amber-900" : "text-red-500"}>
                              {ing.amount || "???"} {ing.unit || ""} {ing.name}
                            </span>
                            {ing.notes && <span className="text-amber-500 ml-2">({ing.notes})</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {parsedRecipe.instructions.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-amber-800 mb-2">📋 Instructions:</h4>
                      <ol className="space-y-2">
                        {parsedRecipe.instructions.map((step) => (
                          <li key={step.step} className="text-sm flex gap-2">
                            <span className="font-bold text-amber-600 flex-shrink-0">{step.step}.</span>
                            <span>{step.text}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {!parsedRecipe && !processing && (
            <div className="bg-amber-50 rounded-2xl p-8 border border-amber-200 text-center">
              <div className="text-5xl mb-4">🤖</div>
              <h3 className="text-xl font-bold text-amber-800 mb-2">AI Recipe Assistant Ready</h3>
              <p className="text-amber-600">
                Enter the recipe conversation on the left, and I'll help structure it into a proper recipe format.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}