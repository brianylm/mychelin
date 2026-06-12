export interface ChangelogEntry {
  date: string;
  title: string;
  items: string[];
}

export const changelogEntries: ChangelogEntry[] = [
  {
    date: "2026-06-12",
    title: "Pilot navigation polish",
    items: [
      "The mobile header menu now opens the recipe drawer from Fridge, Shopping, and Meal Plan views, not only from Recipes.",
      "Create recipe in the left panel now starts collapsed so the recipe library and books are easier to scan.",
      "Profile now labels the weekly rhythm as a dish goal and explains that it counts completed cook-with-me attempts, not days cooked.",
      "The Add to Home Screen prompt now waits longer and snoozes after dismissal so it appears less aggressively.",
    ],
  },
  {
    date: "2026-06-08",
    title: "Realtime recipe conversation capture",
    items: [
      "Conversation capture now tries a true OpenAI Realtime transcription stream first, so live transcript text can appear while the family cook is still speaking.",
      "If OpenAI Realtime cannot connect, Mychelin falls back to browser live captions first, then the existing chunked OpenAI/Gemini transcription path.",
      "Conversation gist, question prompts, and recipe extraction now use DeepSeek first when configured, reducing Gemini dependency for text reasoning.",
      "The live helper now shows whether captions are using Realtime, browser, or backup chunked mode, and marks partial text while it is still updating.",
    ],
  },
  {
    date: "2026-06-08",
    title: "Pilot readiness loop",
    items: [
      "Profile now includes a Pilot loop checklist for the first Mychelin run-through.",
      "Mychelin can collect privacy-safe pilot feedback after first recipe capture, first cook-with-me completion, and first attempt promotion.",
      "The Pilot loop checklist now shows clearer next-step guidance and can be refreshed from Profile.",
      "Pilot feedback is stored separately from recipes, transcripts, and family details.",
    ],
  },
  {
    date: "2026-06-08",
    title: "Google sign-in",
    items: [
      "Login and signup screens now include Continue with Google.",
      "Google accounts use the same Mychelin session cookie as email login, so recipes, meal plans, and profile settings continue to work normally.",
      "Existing email accounts can be linked to Google when the Google email is verified.",
    ],
  },
  {
    date: "2026-06-08",
    title: "Cooking rhythm and reminders",
    items: [
      "Onboarding home-cooking frequency now seeds a weekly cooking goal in Profile.",
      "Profile now shows this week's cooked, planned, and goal progress so users can keep a realistic cooking rhythm.",
      "Users can save reminder preferences for weekly rhythm nudges, planned meals, prep, post-cook reviews, and family recipe activity.",
      "Cook-with-me attempts now queue a privacy-safe post-cook review reminder when browser push is configured.",
    ],
  },
  {
    date: "2026-06-08",
    title: "Live recipe conversation helper",
    items: [
      "Live conversation capture now shows a translated gist, missing recipe cues, and questions to ask while family narrates.",
      "Conversation capture copy across the app now reflects live facilitation instead of passive recording only.",
      "Landing page and onboarding copy now explain that Mychelin helps users stay inside mixed-language family recipe conversations.",
    ],
  },
  {
    date: "2026-06-07",
    title: "Meal plan shopping lists",
    items: [
      "Meal plans now have a Generate shopping list action for the visible week or month.",
      "Shopping lists open with the same planner date range and show meal, recipe, and item counts.",
      "Ingredient quantities are aggregated and adjusted for matching inventory on hand.",
      "Approximate ingredients such as to taste or agak-agak now appear instead of being dropped.",
    ],
  },
  {
    date: "2026-06-07",
    title: "Recipe input polish",
    items: [
      "The default Untitled recipe title now behaves like a soft placeholder when users click into the recipe name field.",
      "Photo upload now handles failed uploads explicitly and refreshes the recipe photo strip and cover image after success.",
      "Pasted ingredient lists can be separated by commas or line breaks, and unfinished draft ingredients are saved when users tap Done.",
      "Ingredient and step delete controls are larger, and step reordering has a clearer drag handle with reduced text-selection issues.",
      "Cook-with-me timers now infer more useful defaults from step text, including ranges, per-side timing, and common cooking verbs.",
      "Attempts with next-time notes now surface a stronger CTA to promote those suggested changes into the next recipe version.",
    ],
  },
  {
    date: "2026-06-07",
    title: "Recipe creation paths",
    items: [
      "Onboarding goals can now be multi-selected so users can choose several cooking outcomes at once.",
      "The recipe sidebar now groups creation paths under Create recipe: URL or video import, pasted text, conversation capture, Ask Mychelin, and manual recipe entry.",
      "Recipes and Books now appear as peer sections in the sidebar for clearer navigation.",
      "Ask Mychelin can generate an editable first-draft recipe from a short cooking prompt, using DeepSeek when configured and Gemini as fallback.",
    ],
  },
  {
    date: "2026-06-06",
    title: "Onboarding and voice capture",
    items: [
      "Mobile landing hero crop and readability were tuned so the face stays visible and copy is easier to read.",
      "New users now get a short walkthrough to set their cooking goal, home-cooking frequency, and first recipe capture path.",
      "Conversation capture now tries OpenAI speech-to-text first and keeps Gemini as fallback.",
    ],
  },
  {
    date: "2026-06-05",
    title: "Cook flow polish",
    items: [
      "Attempts can be expanded, collapsed, edited, and deleted.",
      "Versions can be edited or deleted, with definitive versions protected.",
      "Cook-with-me now confirms before exiting an unsaved session.",
      "Multi-dish cooking starts from meal segments and shows live timer chips.",
    ],
  },
  {
    date: "2026-06-05",
    title: "Attempts and definitive versions",
    items: [
      "Cook sessions save as attempts instead of automatically creating versions.",
      "Attempts can be promoted to versions separately.",
      "Versions can be marked as the definitive recipe version.",
      "Meal planner last-cooked recency includes attempts.",
    ],
  },
  {
    date: "2026-06-05",
    title: "Planner and recipe search improvements",
    items: [
      "Meal planner recipe picker supports deeper search across ingredients, cuisine, title, and notes.",
      "Recipe rows show last-cooked context to avoid repeating dishes too often.",
      "Shared UI primitives now power planner and recipe search surfaces.",
    ],
  },
  {
    date: "2026-06-05",
    title: "Auth and readability fixes",
    items: [
      "Login/signup trimming and reset navigation were hardened.",
      "Button contrast was improved across the app.",
      "Cook-with-me can be started from recipe pages and planned meals.",
    ],
  },
];
