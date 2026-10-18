import { RecipeWorkspace } from "@/components/RecipeWorkspace";
import { AuthProvider } from "@/context/AuthContext";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AppPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <AuthProvider initialUser={user}>
      <RecipeWorkspace />
    </AuthProvider>
  );
}
