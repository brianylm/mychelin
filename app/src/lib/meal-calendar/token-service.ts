import type { MealCalendarConfig } from "./config";
import {
  decryptCalendarSecret,
  encryptCalendarSecret,
} from "./crypto";
import {
  GoogleCalendarClient,
  GoogleCalendarTokenInvalidError,
} from "./google-client";
import type { CalendarConnection } from "./store";
import {
  markCalendarConnectionNeedsReauth,
  updateCalendarAccessToken,
} from "./store";

export function calendarCredentialContext(
  input: Pick<CalendarConnection, "userId" | "householdId">,
  kind: "access" | "refresh"
): string {
  const scope = input.householdId ? `household:${input.householdId}` : `solo:${input.userId}`;
  return `mychelin:meal-calendar:${scope}:${kind}:v1`;
}

export async function encryptCalendarCredentials(input: {
  accessToken: string;
  refreshToken: string;
  encryptionKey: string;
  userId: number;
  householdId: number | null;
}): Promise<{
  accessTokenCiphertext: string;
  accessTokenIv: string;
  refreshTokenCiphertext: string;
  refreshTokenIv: string;
}> {
  const identity = { userId: input.userId, householdId: input.householdId };
  const [access, refresh] = await Promise.all([
    encryptCalendarSecret(
      input.accessToken,
      input.encryptionKey,
      calendarCredentialContext(identity, "access")
    ),
    encryptCalendarSecret(
      input.refreshToken,
      input.encryptionKey,
      calendarCredentialContext(identity, "refresh")
    ),
  ]);
  return {
    accessTokenCiphertext: access.ciphertext,
    accessTokenIv: access.iv,
    refreshTokenCiphertext: refresh.ciphertext,
    refreshTokenIv: refresh.iv,
  };
}

export interface CalendarTokenPersistence {
  updateAccessToken(input: {
    connectionId: number;
    accessTokenCiphertext: string;
    accessTokenIv: string;
    accessTokenExpiresAt: string;
  }): Promise<void>;
  markNeedsReauth(connectionId: number, message: string): Promise<void>;
}

const databaseTokenPersistence: CalendarTokenPersistence = {
  updateAccessToken: updateCalendarAccessToken,
  markNeedsReauth: markCalendarConnectionNeedsReauth,
};

export async function getCalendarAccessToken(input: {
  connection: CalendarConnection;
  config: MealCalendarConfig;
  client?: GoogleCalendarClient;
  persistence?: CalendarTokenPersistence;
  now?: number;
}): Promise<string> {
  const { connection, config } = input;
  const now = input.now ?? Date.now();
  const persistence = input.persistence || databaseTokenPersistence;
  const accessExpiresAt = connection.accessTokenExpiresAt
    ? new Date(connection.accessTokenExpiresAt).getTime()
    : 0;
  if (
    connection.accessTokenCiphertext &&
    connection.accessTokenIv &&
    accessExpiresAt > now + 2 * 60_000
  ) {
    return decryptCalendarSecret(
      {
        ciphertext: connection.accessTokenCiphertext,
        iv: connection.accessTokenIv,
      },
      config.encryptionKey,
      calendarCredentialContext(connection, "access")
    );
  }

  try {
    const refreshToken = await decryptCalendarSecret(
      {
        ciphertext: connection.refreshTokenCiphertext,
        iv: connection.refreshTokenIv,
      },
      config.encryptionKey,
      calendarCredentialContext(connection, "refresh")
    );
    const tokenSet = await (input.client || new GoogleCalendarClient()).refreshAccessToken({
      refreshToken,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
    });
    const encrypted = await encryptCalendarSecret(
      tokenSet.accessToken,
      config.encryptionKey,
      calendarCredentialContext(connection, "access")
    );
    await persistence.updateAccessToken({
      connectionId: connection.id,
      accessTokenCiphertext: encrypted.ciphertext,
      accessTokenIv: encrypted.iv,
      accessTokenExpiresAt: tokenSet.expiresAt,
    });
    return tokenSet.accessToken;
  } catch (error) {
    if (error instanceof GoogleCalendarTokenInvalidError) {
      await persistence.markNeedsReauth(
        connection.id,
        "Google Calendar access expired. Reconnect Calendar to resume sync."
      );
    }
    throw error;
  }
}
