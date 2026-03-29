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
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ─── Recipes ───────────────────────────────────────────────
export const recipes = sqliteTable("recipes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
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
  bookId: integer("book_id").references(() => books.id, { onDelete: "set null" }),
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
  notes: text("notes"), // e.g. "finely chopped"
  sortOrder: integer("sort_order").default(0),
});

// ─── Meal Plans ────────────────────────────────────────────
export const mealPlans = sqliteTable("meal_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // "YYYY-MM-DD"
  mealType: text("meal_type").notNull(), // "breakfast" | "lunch" | "dinner" | "snack"
  recipeId: integer("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  servings: real("servings").notNull().default(1), // multiplier against recipe's base yield
  notes: text("notes"), // optional
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ─── Inventory ─────────────────────────────────────────────
export const inventory = sqliteTable("inventory", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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

// ─── Relations ─────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  recipes: many(recipes),
  createdBooks: many(books),
  bookMemberships: many(bookMembers),
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
  ingredients: many(ingredients),
  instructions: many(instructions),
  mealPlans: many(mealPlans),
  voiceRecordings: many(voiceRecordings),
  photos: many(recipePhotos),
  bookRecipes: many(bookRecipes),
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
  recipe: one(recipes, {
    fields: [mealPlans.recipeId],
    references: [recipes.id],
  }),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
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
