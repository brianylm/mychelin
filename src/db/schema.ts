import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// ============ USERS ============
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  avatarUrl: text("avatar_url"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// ============ RECIPE BOOKS (Collaborative) ============
export const recipeBooks = sqliteTable("recipe_books", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  coverImageUrl: text("cover_image_url"),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Book members (collaborative access)
export const bookMembers = sqliteTable("book_members", {
  id: text("id").primaryKey(),
  bookId: text("book_id").notNull().references(() => recipeBooks.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").$type<"owner" | "editor" | "viewer">().notNull().default("viewer"),
  joinedAt: integer("joined_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  bookIdx: index("book_members_book_idx").on(table.bookId),
  userIdx: index("book_members_user_idx").on(table.userId),
}));

// ============ RECIPES ============
export const recipes = sqliteTable("recipes", {
  id: text("id").primaryKey(),
  bookId: text("book_id").references(() => recipeBooks.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  // Cultural storytelling fields
  story: text("story"), // The history/memory behind the dish
  origin: text("origin"), // e.g., "Grandma's kitchen in Geylang, 1960s"
  familyMember: text("family_member"), // Who passed down this recipe
  // Cuisine categorization (AI-assisted)
  cuisine: text("cuisine"), // e.g., "Peranakan", "Teochew", "Hokkien"
  category: text("category"), // e.g., "Main", "Dessert", "Soup"
  tags: text("tags", { mode: "json" }).$type<string[]>(),
  // Cooking info
  prepTime: integer("prep_time"), // minutes
  cookTime: integer("cook_time"), // minutes
  servings: integer("servings"),
  difficulty: text("difficulty").$type<"easy" | "medium" | "hard">(),
  // Metadata
  createdBy: text("created_by").notNull().references(() => users.id),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  forkedFrom: text("forked_from").references((): any => recipes.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  bookIdx: index("recipes_book_idx").on(table.bookId),
  cuisineIdx: index("recipes_cuisine_idx").on(table.cuisine),
}));

// Recipe versions (tracking changes over time)
export const recipeVersions = sqliteTable("recipe_versions", {
  id: text("id").primaryKey(),
  recipeId: text("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  ingredients: text("ingredients", { mode: "json" }).$type<Array<{ name: string; amount: string; unit: string; notes?: string }>>(),
  instructions: text("instructions", { mode: "json" }).$type<Array<{ step: number; text: string }>>(),
  notes: text("notes"),
  changedBy: text("changed_by").references(() => users.id),
  changeNote: text("change_note"), // e.g., "Reduced sugar for healthier version"
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  recipeIdx: index("versions_recipe_idx").on(table.recipeId),
}));

// ============ FRIDGE INVENTORY ============
export const fridgeItems = sqliteTable("fridge_items", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  quantity: real("quantity"),
  unit: text("unit"),
  category: text("category"), // e.g., "Vegetables", "Meat", "Dairy"
  expiryDate: integer("expiry_date", { mode: "timestamp" }),
  addedAt: integer("added_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  userIdx: index("fridge_user_idx").on(table.userId),
}));

// ============ MEAL PLANNER ============
export const mealPlans = sqliteTable("meal_plans", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recipeId: text("recipe_id").references(() => recipes.id, { onDelete: "set null" }),
  date: integer("date", { mode: "timestamp" }).notNull(),
  mealType: text("meal_type").$type<"breakfast" | "lunch" | "dinner" | "snack">().notNull(),
  notes: text("notes"),
  completed: integer("completed", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  userDateIdx: index("meal_plans_user_date_idx").on(table.userId, table.date),
}));

// ============ SHOPPING LIST ============
export const shoppingItems = sqliteTable("shopping_items", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  quantity: real("quantity"),
  unit: text("unit"),
  category: text("category"),
  checked: integer("checked", { mode: "boolean" }).default(false),
  fromMealPlan: text("from_meal_plan").references(() => mealPlans.id, { onDelete: "set null" }),
  addedAt: integer("added_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  userIdx: index("shopping_user_idx").on(table.userId),
}));

// ============ BOOK TIPS / PRINCIPLES ============
export const bookTips = sqliteTable("book_tips", {
  id: text("id").primaryKey(),
  bookId: text("book_id").notNull().references(() => recipeBooks.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  addedBy: text("added_by").notNull().references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  bookIdx: index("book_tips_book_idx").on(table.bookId),
  addedByIdx: index("book_tips_added_by_idx").on(table.addedBy),
}));

// ============ USER PREFERENCES (for AI recommendations) ============
export const userPreferences = sqliteTable("user_preferences", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  favoriteCuisines: text("favorite_cuisines", { mode: "json" }).$type<string[]>(),
  dietaryRestrictions: text("dietary_restrictions", { mode: "json" }).$type<string[]>(),
  cookingSkillLevel: text("cooking_skill_level").$type<"beginner" | "intermediate" | "advanced">(),
  householdSize: integer("household_size"),
});

// ============ RELATIONS ============
export const usersRelations = relations(users, ({ many, one }) => ({
  createdBooks: many(recipeBooks, { relationName: "createdBooks" }),
  bookMemberships: many(bookMembers),
  recipes: many(recipes),
  fridgeItems: many(fridgeItems),
  mealPlans: many(mealPlans),
  shoppingItems: many(shoppingItems),
  preferences: one(userPreferences),
  bookTips: many(bookTips),
}));

export const recipeBooksRelations = relations(recipeBooks, ({ one, many }) => ({
  creator: one(users, { fields: [recipeBooks.createdBy], references: [users.id], relationName: "createdBooks" }),
  members: many(bookMembers),
  recipes: many(recipes),
  tips: many(bookTips),
}));

export const bookTipsRelations = relations(bookTips, ({ one }) => ({
  book: one(recipeBooks, { fields: [bookTips.bookId], references: [recipeBooks.id] }),
  author: one(users, { fields: [bookTips.addedBy], references: [users.id] }),
}));

export const bookMembersRelations = relations(bookMembers, ({ one }) => ({
  book: one(recipeBooks, { fields: [bookMembers.bookId], references: [recipeBooks.id] }),
  user: one(users, { fields: [bookMembers.userId], references: [users.id] }),
}));

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  book: one(recipeBooks, { fields: [recipes.bookId], references: [recipeBooks.id] }),
  creator: one(users, { fields: [recipes.createdBy], references: [users.id] }),
  versions: many(recipeVersions),
  mealPlans: many(mealPlans),
}));

export const recipeVersionsRelations = relations(recipeVersions, ({ one }) => ({
  recipe: one(recipes, { fields: [recipeVersions.recipeId], references: [recipes.id] }),
  changedByUser: one(users, { fields: [recipeVersions.changedBy], references: [users.id] }),
}));

export const fridgeItemsRelations = relations(fridgeItems, ({ one }) => ({
  user: one(users, { fields: [fridgeItems.userId], references: [users.id] }),
}));

export const mealPlansRelations = relations(mealPlans, ({ one }) => ({
  user: one(users, { fields: [mealPlans.userId], references: [users.id] }),
  recipe: one(recipes, { fields: [mealPlans.recipeId], references: [recipes.id] }),
}));

export const shoppingItemsRelations = relations(shoppingItems, ({ one }) => ({
  user: one(users, { fields: [shoppingItems.userId], references: [users.id] }),
  mealPlan: one(mealPlans, { fields: [shoppingItems.fromMealPlan], references: [mealPlans.id] }),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, { fields: [userPreferences.userId], references: [users.id] }),
}));
