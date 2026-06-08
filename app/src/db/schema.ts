import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// ─── Users ─────────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  avatarUrl: text("avatar_url"),
  // Profile fields
  cookingSkillLevel: text("cooking_skill_level"), // "beginner" | "intermediate" | "advanced"
  householdSize: integer("household_size"),
  favoriteCuisines: text("favorite_cuisines"), // JSON stringified array
  dietaryRestrictions: text("dietary_restrictions"), // JSON stringified array
  onboardingCompleted: integer("onboarding_completed", { mode: "boolean" }).notNull().default(false),
  cookingGoal: text("cooking_goal"),
  cookingFrequency: text("cooking_frequency"),
  firstCaptureMode: text("first_capture_mode"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ─── Password Reset Tokens ─────────────────────────────────
export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: text("expires_at").notNull(), // ISO string
  usedAt: text("used_at"), // ISO string, null until consumed
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ─── Auth Rate Limits ──────────────────────────────────────
// Fixed-window rate limiter for auth endpoints. One row per rate-limit key
// (e.g. "login:1.2.3.4"). On each check, we either start a new window or
// increment the count within the existing window.
export const authRateLimits = sqliteTable("auth_rate_limits", {
  key: text("key").primaryKey(), // e.g. "login:1.2.3.4" or "forgot:bob@example.com"
  count: integer("count").notNull().default(0),
  windowStart: text("window_start").notNull(), // ISO string — start of current window
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ─── Usage Events ──────────────────────────────────────────
// Internal, privacy-safe product analytics. Store event names and
// sanitized metadata only — never recipe text, prompts, transcripts,
// photos, family stories, or raw ingredient/step content.
export const usageEvents = sqliteTable("usage_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  eventName: text("event_name").notNull(),
  source: text("source"),
  recipeId: integer("recipe_id").references(() => recipes.id, { onDelete: "set null" }),
  bookId: integer("book_id").references(() => books.id, { onDelete: "set null" }),
  mealPlanId: integer("meal_plan_id").references(() => mealPlans.id, { onDelete: "set null" }),
  properties: text("properties"), // JSON stringified sanitized event metadata
  path: text("path"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ─── Notification Preferences ──────────────────────────────
export const notificationPreferences = sqliteTable("notification_preferences", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  weeklyCookingGoal: integer("weekly_cooking_goal").notNull().default(2),
  rhythmReminders: integer("rhythm_reminders", { mode: "boolean" }).notNull().default(true),
  mealReminders: integer("meal_reminders", { mode: "boolean" }).notNull().default(true),
  prepReminders: integer("prep_reminders", { mode: "boolean" }).notNull().default(true),
  reviewReminders: integer("review_reminders", { mode: "boolean" }).notNull().default(true),
  familyActivity: integer("family_activity", { mode: "boolean" }).notNull().default(true),
  reminderTime: text("reminder_time").notNull().default("18:00"),
  timezone: text("timezone").notNull().default("Asia/Singapore"),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ─── Web Push Subscriptions ────────────────────────────────
export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  disabledAt: text("disabled_at"),
  lastSuccessAt: text("last_success_at"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ─── Notification Jobs ─────────────────────────────────────
export const notificationJobs = sqliteTable("notification_jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  url: text("url").notNull().default("/app"),
  dueAt: text("due_at").notNull(),
  sentAt: text("sent_at"),
  canceledAt: text("canceled_at"),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ─── Recipes ───────────────────────────────────────────────
export const recipes = sqliteTable("recipes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  // Draft vs active state for progressive capture. Drafts are tucked into a
  // separate sidebar section so quick-capture leftovers don't pollute the
  // main recipe list. Auto-promoted to "active" when the recipe has a title
  // and at least one ingredient or instruction.
  status: text("status").notNull().default("active"),
  description: text("description"),
  cuisine: text("cuisine"),
  yield: text("yield"), // e.g. "4 servings"
  prepTime: integer("prep_time"), // minutes
  cookTime: integer("cook_time"), // minutes
  story: text("story"), // family story / cultural context
  imageUrl: text("image_url"),
  isPublic: integer("is_public", { mode: "boolean" }).default(false),
  // Heritage / cultural context
  origin: text("origin"),              // e.g. "Clarke Quay", "Penang"
  dialect: text("dialect"),            // e.g. "Hokkien", "Teochew"
  occasion: text("occasion"),          // e.g. "Chinese New Year", "Everyday"
  familyMember: text("family_member"), // e.g. "Ah Ma", "Grandma Lim"
  generation: text("generation"),      // e.g. "Grandparent", "Great-grandparent"
  // Ratings
  authenticityRating: integer("authenticity_rating"), // 1-5 stars, nullable
  tasteRating: integer("taste_rating"),               // 1-5 stars, nullable
  nostalgiaRating: integer("nostalgia_rating"),       // 1-5 stars, nullable
  activeVersionId: integer("active_version_id"), // pointer to current best version
  forkedFrom: text("forked_from"),
  bookId: integer("book_id").references(() => books.id, { onDelete: "set null" }),
  // URL the recipe was imported from (F5). Shown as an attribution link on
  // the recipe view and public share page. Null for recipes typed from scratch.
  sourceUrl: text("source_url"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ─── Voice Recordings ──────────────────────────────────────
export const voiceRecordings = sqliteTable("voice_recordings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  recipeId: integer("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  blobUrl: text("blob_url").notNull(),
  duration: integer("duration").notNull(), // seconds
  label: text("label"),
  sortOrder: integer("sort_order").default(0),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ─── Recipe Photos ─────────────────────────────────────────
export const recipePhotos = sqliteTable("recipe_photos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  recipeId: integer("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  blobUrl: text("blob_url").notNull(),
  sortOrder: integer("sort_order").default(0),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ─── Ingredient Catalog ─────────────────────────────────────
export const ingredientCatalog = sqliteTable("ingredient_catalog", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(), // canonical name like "chicken breast"
  category: text("category"), // "protein", "produce", "dairy", "spice", "grain", "condiment"
  defaultUnit: text("default_unit"), // "g", "ml", "pcs"
});

// ─── Ingredients ───────────────────────────────────────────
export const ingredients = sqliteTable("ingredients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  recipeId: integer("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  catalogIngredientId: integer("catalog_ingredient_id")
    .references(() => ingredientCatalog.id), // nullable FK to catalog
  name: text("name").notNull(), // free text for backward compat
  quantity: real("quantity"),
  unit: text("unit"), // e.g. "tbsp", "cup", "g"
  // When approximate=true, the structured quantity/unit fields are
  // replaced by quantityText (e.g. "a handful", "agak-agak", "to taste")
  // for traditional Singapore cooking that doesn't fit gram-precise
  // measurements. Both representations persist independently so toggling
  // back and forth doesn't destroy data.
  approximate: integer("approximate", { mode: "boolean" })
    .notNull()
    .default(false),
  quantityText: text("quantity_text"),
  notes: text("notes"), // e.g. "finely chopped"
  sortOrder: integer("sort_order").default(0),
});

// ─── Meal Plans ────────────────────────────────────────────
export const mealPlans = sqliteTable("meal_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // "YYYY-MM-DD"
  mealType: text("meal_type").notNull(), // "breakfast" | "lunch" | "dinner" | "snack"
  recipeId: integer("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  servings: real("servings").notNull().default(1), // multiplier against recipe's base yield
  notes: text("notes"), // optional
  cookedAt: text("cooked_at"), // ISO string, null until cooked
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ─── Inventory ─────────────────────────────────────────────
export const inventory = sqliteTable("inventory", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  catalogIngredientId: integer("catalog_ingredient_id")
    .references(() => ingredientCatalog.id), // nullable FK to catalog
  name: text("name").notNull(), // display name (denormalized for items without catalog entry)
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull(),
  location: text("location"), // "pantry" | "fridge" | "freezer"
  expiryDate: text("expiry_date"), // "YYYY-MM-DD", nullable
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ─── Instructions ──────────────────────────────────────────
export const instructions = sqliteTable("instructions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  recipeId: integer("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  stepNumber: integer("step_number").notNull(),
  content: text("content").notNull(),
  tip: text("tip"), // optional "words of wisdom" or cooking tip
  imageUrl: text("image_url"),
});

// ─── Recipe Versions ───────────────────────────────────────
export const recipeVersions = sqliteTable("recipe_versions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  recipeId: integer("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  versionLabel: text("version_label"), // human label e.g. "1", "1.1", "1.1.2"
  sourceVersionId: integer("source_version_id"), // which version this was forked from
  captureMethod: text("capture_method").default("manual"), // "manual" | "ai_capture" | "cook_along" | "refinement"
  ingredients: text("ingredients"), // JSON stringified array
  instructions: text("instructions"), // JSON stringified array
  notes: text("notes"),
  changedBy: integer("changed_by").references(() => users.id),
  changeNote: text("change_note"),
  closenessRating: integer("closeness_rating"), // 1-5
  closenessNotes: text("closeness_notes"),
  cookingSessionDate: integer("cooking_session_date"), // unix timestamp
  photos: text("photos"), // JSON stringified array of URLs
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ─── Recipe Attempts ───────────────────────────────────────
export const recipeAttempts = sqliteTable("recipe_attempts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  recipeId: integer("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  versionId: integer("version_id").references(() => recipeVersions.id, {
    onDelete: "set null",
  }),
  mealPlanId: integer("meal_plan_id").references(() => mealPlans.id, {
    onDelete: "set null",
  }),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  cookedAt: text("cooked_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  rating: real("rating"), // 0.5-5, nullable until the user rates the dish
  notes: text("notes"),
  changeNotes: text("change_notes"), // JSON stringified cook-session changes
  whatWorked: text("what_worked"),
  nextTime: text("next_time"),
  ingredientsSnapshot: text("ingredients_snapshot"),
  instructionsSnapshot: text("instructions_snapshot"),
  promotedVersionId: integer("promoted_version_id").references(
    () => recipeVersions.id,
    { onDelete: "set null" }
  ),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ─── Book Tips (Cooking Principles) ───────────────────────
export const bookTips = sqliteTable("book_tips", {
  id: text("id").primaryKey(),
  bookId: text("book_id").notNull(),
  content: text("content").notNull(),
  addedBy: text("added_by").notNull(),
  createdAt: integer("created_at").notNull(),
});

// ─── Books ─────────────────────────────────────────────────
export const books = sqliteTable("books", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  coverEmoji: text("cover_emoji").default("📚"),
  coverColor: text("cover_color").default("amber"), // amber/rose/emerald/sky/violet/slate
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  isPublic: integer("is_public", { mode: "boolean" }).default(false),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ─── Book Members ──────────────────────────────────────────
export const bookMembers = sqliteTable("book_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bookId: integer("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // "owner" | "editor" | "viewer"
  joinedAt: text("joined_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ─── Book Recipes ──────────────────────────────────────────
export const bookRecipes = sqliteTable("book_recipes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bookId: integer("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  recipeId: integer("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  addedBy: integer("added_by")
    .notNull()
    .references(() => users.id),
  sortOrder: integer("sort_order").default(0),
  addedAt: text("added_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ─── Book Activity Log ─────────────────────────────────────
export const bookActivityLog = sqliteTable("book_activity_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bookId: integer("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // "created_book" | "added_recipe" | "removed_recipe" | "invited_member" | "removed_member" | "updated_book" | "joined_book"
  targetName: text("target_name"), // recipe title, member name, etc.
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ─── Share Links ───────────────────────────────────────────
export const shareLinks = sqliteTable("share_links", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  token: text("token").notNull().unique(),
  resourceType: text("resource_type").notNull(), // "recipe" | "book"
  resourceId: integer("resource_id").notNull(),
  permission: text("permission").notNull(), // "view" | "edit"
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ─── Relations ─────────────────────────────────────────────
export const usersRelations = relations(users, ({ one, many }) => ({
  recipes: many(recipes),
  mealPlans: many(mealPlans),
  inventoryItems: many(inventory),
  createdBooks: many(books),
  bookMemberships: many(bookMembers),
  usageEvents: many(usageEvents),
  notificationPreference: one(notificationPreferences, {
    fields: [users.id],
    references: [notificationPreferences.userId],
  }),
  pushSubscriptions: many(pushSubscriptions),
  notificationJobs: many(notificationJobs),
}));

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  user: one(users, {
    fields: [recipes.userId],
    references: [users.id],
  }),
  book: one(books, {
    fields: [recipes.bookId],
    references: [books.id],
  }),
  activeVersion: one(recipeVersions, {
    fields: [recipes.activeVersionId],
    references: [recipeVersions.id],
    relationName: "activeVersion",
  }),
  ingredients: many(ingredients),
  instructions: many(instructions),
  mealPlans: many(mealPlans),
  voiceRecordings: many(voiceRecordings),
  photos: many(recipePhotos),
  bookRecipes: many(bookRecipes),
  versions: many(recipeVersions, { relationName: "recipeVersions" }),
  attempts: many(recipeAttempts),
}));

export const recipeVersionsRelations = relations(recipeVersions, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeVersions.recipeId],
    references: [recipes.id],
    relationName: "recipeVersions",
  }),
  changedByUser: one(users, {
    fields: [recipeVersions.changedBy],
    references: [users.id],
  }),
  sourceVersion: one(recipeVersions, {
    fields: [recipeVersions.sourceVersionId],
    references: [recipeVersions.id],
  }),
}));

export const recipeAttemptsRelations = relations(recipeAttempts, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeAttempts.recipeId],
    references: [recipes.id],
  }),
  version: one(recipeVersions, {
    fields: [recipeAttempts.versionId],
    references: [recipeVersions.id],
  }),
  promotedVersion: one(recipeVersions, {
    fields: [recipeAttempts.promotedVersionId],
    references: [recipeVersions.id],
  }),
  mealPlan: one(mealPlans, {
    fields: [recipeAttempts.mealPlanId],
    references: [mealPlans.id],
  }),
  user: one(users, {
    fields: [recipeAttempts.userId],
    references: [users.id],
  }),
}));

export const voiceRecordingsRelations = relations(voiceRecordings, ({ one }) => ({
  recipe: one(recipes, {
    fields: [voiceRecordings.recipeId],
    references: [recipes.id],
  }),
}));

export const recipePhotosRelations = relations(recipePhotos, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipePhotos.recipeId],
    references: [recipes.id],
  }),
}));

export const ingredientCatalogRelations = relations(ingredientCatalog, ({ many }) => ({
  ingredients: many(ingredients),
  inventoryItems: many(inventory),
}));

export const ingredientsRelations = relations(ingredients, ({ one }) => ({
  recipe: one(recipes, {
    fields: [ingredients.recipeId],
    references: [recipes.id],
  }),
  catalogIngredient: one(ingredientCatalog, {
    fields: [ingredients.catalogIngredientId],
    references: [ingredientCatalog.id],
  }),
}));

export const mealPlansRelations = relations(mealPlans, ({ one }) => ({
  user: one(users, {
    fields: [mealPlans.userId],
    references: [users.id],
  }),
  recipe: one(recipes, {
    fields: [mealPlans.recipeId],
    references: [recipes.id],
  }),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  user: one(users, {
    fields: [inventory.userId],
    references: [users.id],
  }),
  catalogIngredient: one(ingredientCatalog, {
    fields: [inventory.catalogIngredientId],
    references: [ingredientCatalog.id],
  }),
}));

export const instructionsRelations = relations(instructions, ({ one }) => ({
  recipe: one(recipes, {
    fields: [instructions.recipeId],
    references: [recipes.id],
  }),
}));

export const booksRelations = relations(books, ({ one, many }) => ({
  creator: one(users, {
    fields: [books.createdBy],
    references: [users.id],
  }),
  members: many(bookMembers),
  recipes: many(bookRecipes),
  activityLog: many(bookActivityLog),
  tips: many(bookTips),
}));

export const bookMembersRelations = relations(bookMembers, ({ one }) => ({
  book: one(books, {
    fields: [bookMembers.bookId],
    references: [books.id],
  }),
  user: one(users, {
    fields: [bookMembers.userId],
    references: [users.id],
  }),
}));

export const bookRecipesRelations = relations(bookRecipes, ({ one }) => ({
  book: one(books, {
    fields: [bookRecipes.bookId],
    references: [books.id],
  }),
  recipe: one(recipes, {
    fields: [bookRecipes.recipeId],
    references: [recipes.id],
  }),
  addedByUser: one(users, {
    fields: [bookRecipes.addedBy],
    references: [users.id],
  }),
}));

export const bookActivityLogRelations = relations(bookActivityLog, ({ one }) => ({
  book: one(books, {
    fields: [bookActivityLog.bookId],
    references: [books.id],
  }),
  user: one(users, {
    fields: [bookActivityLog.userId],
    references: [users.id],
  }),
}));

export const usageEventsRelations = relations(usageEvents, ({ one }) => ({
  user: one(users, {
    fields: [usageEvents.userId],
    references: [users.id],
  }),
  recipe: one(recipes, {
    fields: [usageEvents.recipeId],
    references: [recipes.id],
  }),
  book: one(books, {
    fields: [usageEvents.bookId],
    references: [books.id],
  }),
  mealPlan: one(mealPlans, {
    fields: [usageEvents.mealPlanId],
    references: [mealPlans.id],
  }),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [notificationPreferences.userId],
    references: [users.id],
  }),
}));

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [pushSubscriptions.userId],
    references: [users.id],
  }),
}));

export const notificationJobsRelations = relations(notificationJobs, ({ one }) => ({
  user: one(users, {
    fields: [notificationJobs.userId],
    references: [users.id],
  }),
}));

// ─── Types ─────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;
export type IngredientCatalog = typeof ingredientCatalog.$inferSelect;
export type NewIngredientCatalog = typeof ingredientCatalog.$inferInsert;
export type Ingredient = typeof ingredients.$inferSelect;
export type NewIngredient = typeof ingredients.$inferInsert;
export type MealPlan = typeof mealPlans.$inferSelect;
export type NewMealPlan = typeof mealPlans.$inferInsert;
export type Inventory = typeof inventory.$inferSelect;
export type NewInventory = typeof inventory.$inferInsert;
export type Instruction = typeof instructions.$inferSelect;
export type NewInstruction = typeof instructions.$inferInsert;
export type VoiceRecording = typeof voiceRecordings.$inferSelect;
export type NewVoiceRecording = typeof voiceRecordings.$inferInsert;
export type RecipePhoto = typeof recipePhotos.$inferSelect;
export type NewRecipePhoto = typeof recipePhotos.$inferInsert;
export type Book = typeof books.$inferSelect;
export type NewBook = typeof books.$inferInsert;
export type BookMember = typeof bookMembers.$inferSelect;
export type NewBookMember = typeof bookMembers.$inferInsert;
export type BookRecipe = typeof bookRecipes.$inferSelect;
export type NewBookRecipe = typeof bookRecipes.$inferInsert;
export type BookActivityLog = typeof bookActivityLog.$inferSelect;
export type NewBookActivityLog = typeof bookActivityLog.$inferInsert;
export type RecipeVersion = typeof recipeVersions.$inferSelect;
export type NewRecipeVersion = typeof recipeVersions.$inferInsert;
export type RecipeAttempt = typeof recipeAttempts.$inferSelect;
export type NewRecipeAttempt = typeof recipeAttempts.$inferInsert;
export type BookTip = typeof bookTips.$inferSelect;
export type NewBookTip = typeof bookTips.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;
export type AuthRateLimit = typeof authRateLimits.$inferSelect;
export type NewAuthRateLimit = typeof authRateLimits.$inferInsert;
export type UsageEvent = typeof usageEvents.$inferSelect;
export type NewUsageEvent = typeof usageEvents.$inferInsert;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference = typeof notificationPreferences.$inferInsert;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert;
export type NotificationJob = typeof notificationJobs.$inferSelect;
export type NewNotificationJob = typeof notificationJobs.$inferInsert;
