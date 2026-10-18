import { REQUIRED_GOOGLE_SCOPES } from "./types";

export interface MealCalendarConfig {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  encryptionKey: string;
  webhookUrl: string;
  syncSecret: string;
  scopes: readonly string[];
}

const REQUIRED_ENV = [
  "GOOGLE_CALENDAR_CLIENT_ID",
  "GOOGLE_CALENDAR_CLIENT_SECRET",
  "GOOGLE_CALENDAR_REDIRECT_URI",
  "MEAL_CALENDAR_ENCRYPTION_KEY",
  "GOOGLE_CALENDAR_WEBHOOK_URL",
  "MEAL_CALENDAR_SYNC_SECRET",
] as const;

export function mealCalendarSetup(env: NodeJS.ProcessEnv = process.env): {
  configured: boolean;
  enabled: boolean;
  missing: string[];
} {
  const enabled = env.MEAL_CALENDAR_ENABLED === "true";
  const missing = REQUIRED_ENV.filter((name) => !env[name]?.trim());
  return { configured: enabled && missing.length === 0, enabled, missing };
}

export function getMealCalendarConfig(
  env: NodeJS.ProcessEnv = process.env
): MealCalendarConfig {
  const setup = mealCalendarSetup(env);
  if (!setup.enabled) {
    throw new Error("Meal calendar integration is disabled");
  }
  if (setup.missing.length) {
    throw new Error(
      `Meal calendar integration is missing configuration: ${setup.missing.join(", ")}`
    );
  }

  const redirectUri = env.GOOGLE_CALENDAR_REDIRECT_URI!.trim();
  const webhookUrl = env.GOOGLE_CALENDAR_WEBHOOK_URL!.trim();
  if (!redirectUri.startsWith("https://") && !redirectUri.startsWith("http://localhost")) {
    throw new Error("GOOGLE_CALENDAR_REDIRECT_URI must be HTTPS");
  }
  if (!webhookUrl.startsWith("https://")) {
    throw new Error("GOOGLE_CALENDAR_WEBHOOK_URL must be HTTPS");
  }

  return {
    enabled: true,
    clientId: env.GOOGLE_CALENDAR_CLIENT_ID!.trim(),
    clientSecret: env.GOOGLE_CALENDAR_CLIENT_SECRET!.trim(),
    redirectUri,
    encryptionKey: env.MEAL_CALENDAR_ENCRYPTION_KEY!.trim(),
    webhookUrl,
    syncSecret: env.MEAL_CALENDAR_SYNC_SECRET!.trim(),
    scopes: REQUIRED_GOOGLE_SCOPES,
  };
}
