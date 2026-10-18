import { redirect } from "next/navigation";
import { LoginPageClient } from "@/components/auth/LoginPageClient";
import { getAuthenticatedEntryPath } from "@/lib/auth-entry";
import { getCurrentUser } from "@/lib/auth";

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  const destination = getAuthenticatedEntryPath(firstValue(params.returnTo));

  if (user) {
    redirect(destination);
  }

  const mode = firstValue(params.mode) === "signup" ? "signup" : "login";
  return (
    <LoginPageClient
      authenticatedDestination={destination}
      defaultMode={mode}
    />
  );
}
