import { expect, test, type Page, type Route } from "@playwright/test";
import { SignJWT } from "jose";

const recipes = [
  {
    id: 101,
    userId: 7,
    title: "Claypot Rice",
    status: "active",
    cuisine: "Chinese",
    description: null,
    imageUrl: null,
    prepTime: 15,
    cookTime: 40,
    bookId: 1,
    recipeFlags: [],
  },
  {
    id: 102,
    userId: 7,
    title: "Steamed Fish",
    status: "active",
    cuisine: "Cantonese",
    description: null,
    imageUrl: null,
    prepTime: 10,
    cookTime: 15,
    bookId: null,
    recipeFlags: [],
  },
  {
    id: 103,
    userId: 7,
    title: "Plain Congee",
    status: "active",
    cuisine: null,
    description: null,
    imageUrl: null,
    prepTime: null,
    cookTime: null,
    bookId: null,
    recipeFlags: [],
  },
  {
    id: 104,
    userId: 7,
    title: "Draft Dumplings",
    status: "draft",
    cuisine: null,
    description: null,
    imageUrl: null,
    prepTime: null,
    cookTime: null,
    bookId: 1,
    recipeFlags: [],
  },
];

const books = [
  {
    id: 1,
    title: "Family favourites",
    description: null,
    coverEmoji: "📚",
    coverColor: "amber",
    recipeCount: 3,
    recipeIds: [101, 102, 104],
    memberCount: 1,
    userRole: "owner",
    isOwner: true,
  },
  {
    id: 2,
    title: "Weeknight suppers",
    description: null,
    coverEmoji: "🍲",
    coverColor: "rose",
    recipeCount: 1,
    recipeIds: [102],
    memberCount: 1,
    userRole: "owner",
    isOwner: true,
  },
];

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function installApiMocks(page: Page) {
  let bookContentsRequests = 0;

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === "/api/auth/me") {
      return json(route, {
        user: { id: 7, name: "Mock Cook", email: "mock@example.com" },
      });
    }
    if (url.pathname === "/api/user/preferences") {
      return json(route, {
        onboardingCompleted: true,
        createdAt: "2026-01-01T00:00:00.000Z",
      });
    }
    if (url.pathname === "/api/notifications/rhythm") {
      return json(route, { hasAttemptedAny: true });
    }
    if (url.pathname === "/api/recipes" && request.method() === "GET") {
      return json(route, recipes);
    }
    if (url.pathname === "/api/books" && request.method() === "GET") {
      return json(route, books);
    }
    if (/^\/api\/books\/\d+\/recipes$/.test(url.pathname)) {
      bookContentsRequests += 1;
      const bookId = Number(url.pathname.split("/")[3]);
      const recipeIds = books.find((book) => book.id === bookId)?.recipeIds ?? [];
      return json(route, recipes.filter((recipe) => recipeIds.includes(recipe.id)));
    }

    return json(route, {});
  });

  return { getBookContentsRequests: () => bookContentsRequests };
}

async function installSignedSession(page: Page) {
  const token = await new SignJWT({
    id: 7,
    name: "Mock Cook",
    email: "mock@example.com",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode("playwright-test-secret"));

  await page.context().addCookies([
    {
      name: "mychelin_token",
      value: token,
      url: "http://localhost:3100",
    },
  ]);
}

test("shows visible book subtitles and initial counts without eager book-content requests", async ({ page }) => {
  await installSignedSession(page);
  const requests = await installApiMocks(page);
  await page.goto("/app");

  await expect(page.getByRole("heading", { name: "Your Recipes" })).toBeVisible();

  const allRecipes = page.locator("section").filter({
    has: page.getByRole("heading", { name: "All recipes" }),
  });
  await expect(allRecipes.getByRole("button", { name: "Open Claypot Rice" }))
    .toContainText("In Family favourites");
  await expect(allRecipes.getByRole("button", { name: "Open Steamed Fish" }))
    .toContainText("In Family favourites · Weeknight suppers");
  await expect(allRecipes.getByRole("button", { name: "Open Draft Dumplings" }))
    .toContainText("In Family favourites");
  await expect(allRecipes.getByRole("button", { name: "Open Plain Congee" }))
    .not.toContainText("In ");

  await expect(
    page.getByRole("button", { name: /Family favourites/ }).filter({ hasText: "3 recipes" })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Weeknight suppers/ }).filter({ hasText: "1 recipe" })
  ).toBeVisible();

  const openLibrary = page.getByRole("button", { name: "Open library panel" });
  if (await openLibrary.isVisible()) await openLibrary.click();

  const sidebar = page.getByRole("complementary", { name: "Recipe library" });
  await expect(sidebar).toBeVisible();
  await expect(sidebar.locator("li").filter({ hasText: "Steamed Fish" }).first())
    .toContainText("In Family favourites · Weeknight suppers");
  await expect(sidebar.locator("li").filter({ hasText: "Draft Dumplings" }).first())
    .toContainText("In Family favourites");
  await expect(sidebar.locator("li").filter({ hasText: "Plain Congee" }).first())
    .not.toContainText("In ");

  expect(requests.getBookContentsRequests()).toBe(0);
});
