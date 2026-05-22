import { LandingPage } from "@/components/LandingPage";
import { RecipeWorkspace } from "@/components/RecipeWorkspace";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/app");
  }
  return <LandingPage />;
}
