import { RecipeWorkspace } from "@/components/RecipeWorkspace";
import { AuthProvider } from "@/context/AuthContext";
import { getCurrentUser } from "@/lib/auth";
import { getEmailVerified } from "@/lib/email-verification";
import { redirect } from "next/navigation";

export default async function AppPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  // Read separately from the session check: if this fails, the user stays
  // signed in and simply sees no verification notice.
  const emailVerified = await getEmailVerified(user.id);

  return (
    <AuthProvider initialUser={{ ...user, emailVerified }}>
      <RecipeWorkspace />
    </AuthProvider>
  );
}
