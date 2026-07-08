export interface ChangelogEntry {
  date: string;
  title: string;
  items: string[];
}

export const changelogEntries: ChangelogEntry[] = [
  {
    date: "2026-07-08",
    title: "Private next tries and safer sharing",
    items: [
      "Attempts can now be saved as a private next try before changing the recipe version history.",
      "A next try can be promoted to a version, or promoted and set as the definitive recipe when it is ready.",
      "Shared recipe links now expose the definitive recipe snapshot only; attempts, next tries, private ratings, meal plans, and owner metadata are not included.",
    ],
  },
  {
    date: "2026-07-07",
    title: "Recipe editing polish",
    items: [
      "Log version now uses the same half-star rating control as dish ratings.",
      "Version closeness labels now align to the star control instead of stretching across the modal.",
      "Ingredient rows stack more cleanly on mobile so long ingredient names are easier to read and edit.",
    ],
  },
  {
    date: "2026-07-07",
    title: "Profile page cleanup",
    items: [
      "Profile now shows only the latest three changelog updates by default, with older entries behind View more.",
      "Cooking rhythm and Pilot loop now start collapsed so Profile is easier to scan.",
      "Unused preference fields such as favorite cuisines, dietary restrictions, skill level, and household size are hidden for now.",
    ],
  },
  {
    date: "2026-06-22",
    title: "Quick capture modal polish",
    items: [
      "Quick capture now clips its rounded desktop modal shell cleanly at the top and bottom.",
      "The recipe review screen now keeps Save reviewed recipe visible at the bottom of the modal after parsing.",
    ],
  },
  {
    date: "2026-06-20",
    title: "Conversation transcription reliability",
    items: [
      "Conversation recording now skips silent audio chunks before sending them to AI transcription.",
      "OpenAI transcription now treats empty or invalid audio chunks as no transcript instead of failing the whole recording path.",
      "The backup chunk recorder continues listening for actual speech while realtime setup is unavailable.",
    ],
  },
  {
    date: "2026-06-18",
    title: "Dialect transcription fallback hotfix",
    items: [
      "Conversation capture now keeps AI chunk transcription running even when rough browser captions appear, so dialect speech is less likely to be dropped.",
      "Hokkien/Minnan is now prioritized for the dialect-aware chunk fallback path.",
      "OpenAI batch transcription now defaults to the standard gpt-4o-transcribe model with a Singapore family-recipe dialect prompt.",
    ],
  },
  {
    date: "2026-06-18",
    title: "Capture review before saving",
    items: [
      "Pasted-text recipe extraction now opens a review screen before updating the recipe.",
      "URL imports now show extracted title, metadata, ingredients, and steps for review before saving.",
      "Conversation capture now extracts to a review screen with the transcript context, instead of immediately overwriting recipe fields.",
    ],
  },
  {
    date: "2026-06-18",
    title: "Manual recipe scratchpad",
    items: [
      "Manual recipe creation now opens a scratchpad-first flow instead of a blank long-form editor.",
      "The scratchpad parses common ingredient quantities, steps, heat cues, and timer text into a review screen before saving.",
      "Manual recipes now require a title and at least one step; ingredients are encouraged but can be completed later.",
    ],
  },
  {
    date: "2026-06-18",
    title: "Recipe form copy cleanup",
    items: [
      "The old Details section is now Library info, clarifying that it is for recipe-card summary, dish style, timing, yield, and book placement.",
      "Description is now Quick summary with helper copy that sends family memories and provenance to Heritage instead.",
      "Heritage fields now use clearer labels for family story, source, and spoken language so they do not feel like duplicates of recipe metadata.",
    ],
  },
  {
    date: "2026-06-18",
    title: "Rating and prompt polish",
    items: [
      "Pasted ingredient parsing now handles quantity-first clove wording such as 3 garlic cloves and previews parsed quantity/unit/name before saving.",
      "First-capture feedback is delayed longer so users can read the created recipe before being asked for comments.",
      "The automatic Add to Home Screen popup has been removed from the main app shell.",
      "Dish ratings now use half-star controls and can be updated from both Activity and the recipe attempt history.",
    ],
  },
  {
    date: "2026-06-17",
    title: "Ingredient paste and details saving fixes",
    items: [
      "Ingredient paste now understands trailing amounts such as potato 1kg, potato 1 kg, and garlic 3 cloves.",
      "Cuisine selection now saves the chosen value immediately instead of using the previous selection.",
      "Save now now flushes all dirty title and detail fields instead of only blurring the active input.",
    ],
  },
  {
    date: "2026-06-17",
    title: "Starter recipes and cooking activity",
    items: [
      "Onboarding can now start a new user with editable sample recipes for tau yu bak, garlicky xiao bai cai, and onion omelette.",
      "Heat labels now render as readable heat chips in step editing and cook-with-me instead of exposing raw heat tags.",
      "Cook-with-me now asks for cooking-session ease at completion; dish ratings are handled later from Activity after eating.",
      "The new Activity tab groups completed cook attempts by day and meal so users can rate dishes and review next-time notes.",
    ],
  },
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
