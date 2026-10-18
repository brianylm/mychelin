import { LandingPage } from "@/components/LandingPage";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/app");
  }

  return <LandingPage />;
}
